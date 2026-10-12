import * as XLSX from 'xlsx';

export const NIVEAUX = ['1AC', '2AC', '3AC'] as const;
export type Niveau = (typeof NIVEAUX)[number];

export interface ImportRow {
  ligne: number;
  nom: string;
  prenom: string;
  cne: string;
  classe: string;
  niveau: string;
  genre: string;
}

export interface ImportError {
  ligne: number;
  type: 'champ_manquant' | 'niveau_invalide' | 'doublon_fichier' | 'doublon_base' | 'genre_invalide';
  champ?: string;
  valeur?: string;
  message: string;
}

export interface ImportPreview {
  rows: ImportRow[];
  errors: ImportError[];
  validRows: ImportRow[];
  classesManquantes: string[];
  total: number;
}

/** Decode raw file bytes: UTF-8 first, Windows-1256 as Arabic fallback (or forced). */
export function decodeCsvBuffer(buffer: Buffer, encoding: 'auto' | 'utf-8' | 'windows-1256' = 'auto'): string {
  if (encoding === 'windows-1256') {
    return new TextDecoder('windows-1256').decode(buffer);
  }
  if (encoding === 'utf-8') {
    return buffer.toString('utf-8').replace(/^\uFEFF/, '');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '');
  } catch {
    return new TextDecoder('windows-1256').decode(buffer);
  }
}

/** RFC-style CSV parser: handles quoted fields, escaped quotes, ; or , separator (auto-detected). */
export function parseCsv(text: string): string[][] {
  const sep = detectSeparator(text);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

function detectSeparator(text: string): string {
  const firstLine = text.split(/\r?\n/).find((l) => l.trim() !== '') || '';
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  return semi > comma ? ';' : ',';
}

/** Parse XLSX via SheetJS — first sheet by default. */
export function parseXlsx(buffer: Buffer): string[][] {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const ws = wb.Sheets[sheetName];
  if (!ws) return [];
  const json = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: false, defval: '' });
  return json.map((r) => (r as unknown[]).map((c) => String(c ?? '').trim()));
}

const HEADER_ALIASES: Record<string, string> = {
  nom: 'nom', 'nom famille': 'nom', 'nom de famille': 'nom', lastname: 'nom',
  prenom: 'prenom', 'prénom': 'prenom', firstname: 'prenom',
  cne: 'cne', 'cne massar': 'cne', 'code massar': 'cne', massar: 'cne',
  classe: 'classe', 'classe nom': 'classe', 'nom classe': 'classe',
  niveau: 'niveau',
  genre: 'genre', sexe: 'genre',
};

export function normalizeNiveau(raw: string): string {
  const v = raw.trim().toLowerCase().replace(/[\s._-]/g, '');
  if (v === '1ac' || v === '1ereac' || v === '1erac' || v === '1ereanneecollege') return '1AC';
  if (v === '2ac' || v === '2emeac' || v === '2anneecollege') return '2AC';
  if (v === '3ac' || v === '3emeac' || v === '3anneecollege') return '3AC';
  return raw.trim().toUpperCase();
}

export function normalizeGenre(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (['m', 'masculin', 'garcon', 'garçon', 'male', 'h'].includes(v)) return 'M';
  if (['f', 'feminin', 'féminin', 'fille', 'female'].includes(v)) return 'F';
  return raw.trim().toUpperCase();
}

/**
 * Map raw matrix (from CSV/XLSX) to validated ImportRows.
 * `fixedClasse`/`fixedNiveau` are used when the import targets one class and
 * the file has no classe/niveau columns (they override per-row values).
 * `existingCnes` flags doublons against the database.
 */
export function buildImportPreview(
  matrix: string[][],
  options: {
    fixedClasse?: string;
    fixedNiveau?: string;
    existingCnes?: Set<string>;
  } = {},
): ImportPreview {
  const { fixedClasse, fixedNiveau, existingCnes = new Set() } = options;
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  const seenCnes = new Map<string, number>();
  const classesInFile = new Set<string>();

  if (matrix.length === 0) {
    return { rows, errors: [{ ligne: 0, type: 'champ_manquant', message: 'Fichier vide' }], validRows: [], classesManquantes: [], total: 0 };
  }

  // Header row → column mapping by alias
  const header = matrix[0]!.map((h) => HEADER_ALIASES[h.trim().toLowerCase()] || h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  const iNom = col('nom');
  const iPrenom = col('prenom');
  const iCne = col('cne');
  const iClasse = col('classe');
  const iNiveau = col('niveau');
  const iGenre = col('genre');

  const missingCols: string[] = [];
  if (iNom === -1) missingCols.push('nom');
  if (iPrenom === -1) missingCols.push('prenom');
  if (iCne === -1) missingCols.push('CNE');
  if (iClasse === -1 && !fixedClasse) missingCols.push('classe');
  if (iNiveau === -1 && !fixedNiveau) missingCols.push('niveau');
  if (missingCols.length > 0) {
    return {
      rows, validRows: [], classesManquantes: [], total: matrix.length - 1,
      errors: [{ ligne: 1, type: 'champ_manquant', champ: missingCols.join(', '), message: `Colonnes requises manquantes : ${missingCols.join(', ')}` }],
    };
  }

  for (let r = 1; r < matrix.length; r++) {
    const raw = matrix[r]!;
    const ligne = r + 1;
    const nom = iNom >= 0 ? (raw[iNom] || '').trim() : '';
    const prenom = iPrenom >= 0 ? (raw[iPrenom] || '').trim() : '';
    const cne = iCne >= 0 ? (raw[iCne] || '').trim() : '';
    const classe = fixedClasse || (iClasse >= 0 ? (raw[iClasse] || '').trim() : '');
    const niveauRaw = fixedNiveau || (iNiveau >= 0 ? (raw[iNiveau] || '').trim() : '');
    const genreRaw = iGenre >= 0 ? (raw[iGenre] || '').trim() : '';

    if (!nom && !prenom && !cne) continue; // empty line

    const row: ImportRow = { ligne, nom, prenom, cne, classe, niveau: normalizeNiveau(niveauRaw), genre: genreRaw ? normalizeGenre(genreRaw) : '' };
    rows.push(row);
    if (classe) classesInFile.add(classe);

    if (!nom) errors.push({ ligne, type: 'champ_manquant', champ: 'nom', message: `Ligne ${ligne} : nom manquant` });
    if (!prenom) errors.push({ ligne, type: 'champ_manquant', champ: 'prenom', message: `Ligne ${ligne} : prénom manquant` });
    if (!cne) errors.push({ ligne, type: 'champ_manquant', champ: 'CNE', message: `Ligne ${ligne} : CNE manquant` });
    if (!NIVEAUX.includes(row.niveau as Niveau)) {
      errors.push({ ligne, type: 'niveau_invalide', champ: 'niveau', valeur: niveauRaw, message: `Ligne ${ligne} : niveau invalide "${niveauRaw}" (attendu : 1AC, 2AC ou 3AC)` });
    }
    if (genreRaw && !['M', 'F'].includes(row.genre)) {
      errors.push({ ligne, type: 'genre_invalide', champ: 'genre', valeur: genreRaw, message: `Ligne ${ligne} : genre invalide "${genreRaw}" (attendu : M ou F)` });
    }
    if (cne) {
      const firstAt = seenCnes.get(cne);
      if (firstAt !== undefined) {
        errors.push({ ligne, type: 'doublon_fichier', champ: 'CNE', valeur: cne, message: `Ligne ${ligne} : CNE ${cne} déjà présent ligne ${firstAt}` });
      } else {
        seenCnes.set(cne, ligne);
      }
      if (existingCnes.has(cne)) {
        errors.push({ ligne, type: 'doublon_base', champ: 'CNE', valeur: cne, message: `Ligne ${ligne} : CNE ${cne} existe déjà dans la base` });
      }
    }
  }

  const errorLines = new Set(errors.map((e) => e.ligne));
  const validRows = rows.filter((r) => !errorLines.has(r.ligne));

  return { rows, errors, validRows, classesManquantes: [...classesInFile], total: rows.length };
}
