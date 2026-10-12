import { getDb } from '@/lib/db';
import { saveReferenceFile, deleteReferenceFile } from '@/lib/utils/fileStorage';
import { indexReferenceFile } from '@/lib/search/vectorStore';

/**
 * RAG du carnet de bord : synchronise les entrées du carnet dans les références
 * (catégorie 'notebook') pour qu'elles participent à la recherche vectorielle et
 * au contexte de génération. Idempotent : une entrée = une référence.
 */
export async function syncNotebookToReferences(_userId: string = 'default'): Promise<{ indexed: number; removed: number }> {
  const db = getDb();
  const entries = db.prepare(`
    SELECT e.id, e.titre, e.resume, e.date, e.heure_debut, e.heure_fin, c.name as classe_name
    FROM notebook_entries e
    JOIN classes c ON e.classe_id = c.id
    WHERE e.resume != ''
  `).all() as any[];

  // Références carnet existantes, par nom (format stable "Carnet · {classe} · {date} · {titre}")
  const existing = db.prepare("SELECT id, name FROM reference_files WHERE category = 'notebook'").all() as { id: string; name: string }[];
  const existingByName = new Map(existing.map((r) => [r.name, r.id]));

  let indexed = 0;
  const keepNames = new Set<string>();

  for (const e of entries) {
    const name = `Carnet · ${e.classe_name} · ${e.date} · ${e.titre}`.slice(0, 120);
    keepNames.add(name);
    const horaire = e.heure_debut ? ` (${e.heure_debut}${e.heure_fin ? ` → ${e.heure_fin}` : ''})` : '';
    const content = `# ${e.titre}\nClasse : ${e.classe_name}\nDate : ${e.date}${horaire}\n\n${e.resume}`;

    let refId = existingByName.get(name);
    if (!refId) {
      const created = await saveReferenceFile(name, 'notebook', Buffer.from(content, 'utf-8'));
      refId = created.id;
    }
    // Indexation (non bloquante — échecs loggés par vectorStore)
    indexReferenceFile(refId).catch(() => {});
    indexed++;
  }

  // Supprimer les références carnet dont l'entrée a disparu
  let removed = 0;
  for (const [name, refId] of existingByName) {
    if (!keepNames.has(name)) {
      if (await deleteReferenceFile(refId)) removed++;
    }
  }

  return { indexed, removed };
}
