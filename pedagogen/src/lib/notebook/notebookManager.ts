import { getDb } from '@/lib/db';
import { join } from 'path';
import { existsSync, unlinkSync } from 'fs';

export * from '@/types/notebook';
import type {
  NotebookEntry,
  EntryType,
  EntryMeta,
  NotebookAttachment,
  Statut,
} from '@/types/notebook';

function rowToEntry(r: any): NotebookEntry {
  let tags: string[] = [];
  try { tags = JSON.parse(r.tags || '[]'); } catch { /* keep [] */ }
  let meta: EntryMeta = {};
  try {
    meta = typeof r.meta === 'string' ? JSON.parse(r.meta || '{}') : (r.meta || {});
  } catch {
    meta = {};
  }
  const entry: NotebookEntry = {
    id: r.id,
    user_id: r.user_id,
    entry_type: (r.entry_type as EntryType) || 'SESSION',
    classe_id: r.classe_id || null,
    date: r.date,
    heure_debut: r.heure_debut || '',
    heure_fin: r.heure_fin || '',
    titre: r.titre,
    resume: r.resume || '',
    statut: r.statut,
    tags,
    exam_id: r.exam_id || null,
    group_id: r.group_id || null,
    meta,
    created_at: r.created_at,
    updated_at: r.updated_at,
    classe_nom: r.classe_nom || undefined,
    classe_niveau: r.classe_niveau || undefined,
    exam_titre: r.exam_titre || null,
    documents: [],
    attachments: [],
  };
  return entry;
}

const BASE_SELECT = `
  SELECT e.*, c.name as classe_nom, c.niveau as classe_niveau, x.titre as exam_titre
  FROM notebook_entries e
  LEFT JOIN classes c ON e.classe_id = c.id
  LEFT JOIN exams x ON e.exam_id = x.id
`;

export interface NotebookFilters {
  classeId?: string;
  statut?: string;
  tag?: string;
  q?: string;
  entryType?: string;
  from?: string;
  to?: string;
  userId?: string;
}

export function listEntries(filters: NotebookFilters = {}): NotebookEntry[] {
  const db = getDb();
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.entryType && filters.entryType !== 'ALL') {
    where.push('e.entry_type = ?');
    params.push(filters.entryType);
  }
  if (filters.classeId) {
    where.push('(e.classe_id = ? OR e.meta LIKE ?)');
    params.push(filters.classeId, `%"${filters.classeId}"%`);
  }
  if (filters.statut) { where.push('e.statut = ?'); params.push(filters.statut); }
  if (filters.from) { where.push('e.date >= ?'); params.push(filters.from); }
  if (filters.to) { where.push('e.date <= ?'); params.push(filters.to); }
  if (filters.tag) { where.push('e.tags LIKE ?'); params.push(`%"${filters.tag}"%`); }
  if (filters.q) {
    where.push('(e.titre LIKE ? OR e.resume LIKE ?)');
    const like = `%${filters.q}%`;
    params.push(like, like);
  }

  const sql = `${BASE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY e.date DESC, (CASE WHEN e.heure_debut = '' OR e.heure_debut IS NULL THEN 1 ELSE 0 END) ASC, e.heure_debut DESC, e.created_at DESC`;
  const rows = db.prepare(sql).all(...params) as any[];
  if (rows.length === 0) return [];

  const entryIds = rows.map((r) => r.id);
  const placeholders = entryIds.map(() => '?').join(',');

  const docMap = new Map<string, string[]>();
  const docRows = db.prepare(`SELECT entry_id, document_id FROM notebook_entry_documents WHERE entry_id IN (${placeholders})`).all(...entryIds) as any[];
  for (const d of docRows) {
    if (!docMap.has(d.entry_id)) docMap.set(d.entry_id, []);
    docMap.get(d.entry_id)!.push(d.document_id);
  }

  const attMap = new Map<string, NotebookAttachment[]>();
  const attRows = db.prepare(`
    SELECT ea.entry_id, a.id, a.original_name as name, a.size, a.mime_type, a.created_at
    FROM notebook_attachments a
    JOIN notebook_entry_attachments ea ON a.id = ea.attachment_id
    WHERE ea.entry_id IN (${placeholders})
    ORDER BY a.created_at ASC
  `).all(...entryIds) as any[];
  for (const a of attRows) {
    if (!attMap.has(a.entry_id)) attMap.set(a.entry_id, []);
    attMap.get(a.entry_id)!.push({
      id: a.id,
      name: a.name,
      size: a.size,
      mime_type: a.mime_type,
      url: `/api/notebook/attachments/${a.id}`,
      created_at: a.created_at,
    });
  }

  return rows.map((r) => {
    const entry = rowToEntry(r);
    entry.documents = docMap.get(r.id) || [];
    entry.attachments = attMap.get(r.id) || [];
    return entry;
  });
}

export function getEntry(id: string): NotebookEntry | null {
  const db = getDb();
  const row = db.prepare(`${BASE_SELECT} WHERE e.id = ?`).get(id) as any;
  if (!row) return null;
  const entry = rowToEntry(row);
  const docRows = db.prepare('SELECT document_id FROM notebook_entry_documents WHERE entry_id = ?').all(id) as { document_id: string }[];
  entry.documents = docRows.map((d) => d.document_id);

  const attRows = db.prepare(`
    SELECT a.id, a.original_name as name, a.size, a.mime_type, a.created_at
    FROM notebook_attachments a
    JOIN notebook_entry_attachments ea ON a.id = ea.attachment_id
    WHERE ea.entry_id = ?
    ORDER BY a.created_at ASC
  `).all(id) as any[];
  entry.attachments = attRows.map((a) => ({
    id: a.id,
    name: a.name,
    size: a.size,
    mime_type: a.mime_type,
    url: `/api/notebook/attachments/${a.id}`,
    created_at: a.created_at,
  }));

  return entry;
}

export function createEntry(
  data: {
    entry_type?: EntryType;
    classe_id?: string | null;
    date: string;
    heure_debut?: string;
    heure_fin?: string;
    titre: string;
    resume?: string;
    statut?: Statut;
    tags?: string[];
    exam_id?: string | null;
    group_id?: string | null;
    meta?: EntryMeta;
    document_ids?: string[];
    attachment_ids?: string[];
  },
  userId: string = 'default'
): NotebookEntry {
  const db = getDb();
  const id = `entry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const run = db.transaction(() => {
    db.prepare(`
      INSERT INTO notebook_entries (
        id, user_id, entry_type, classe_id, date, heure_debut, heure_fin,
        titre, resume, statut, tags, exam_id, group_id, meta
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.entry_type || 'SESSION',
      data.classe_id || null,
      data.date,
      data.heure_debut || '',
      data.heure_fin || '',
      data.titre.trim(),
      data.resume || '',
      data.statut || 'planifiee',
      JSON.stringify(data.tags || []),
      data.exam_id || null,
      data.group_id || null,
      JSON.stringify(data.meta || {})
    );
    for (const docId of data.document_ids || []) {
      db.prepare('INSERT OR IGNORE INTO notebook_entry_documents (entry_id, document_id) VALUES (?, ?)').run(id, docId);
    }
    for (const attId of data.attachment_ids || []) {
      db.prepare('INSERT OR IGNORE INTO notebook_entry_attachments (entry_id, attachment_id) VALUES (?, ?)').run(id, attId);
    }
  });
  run();
  return getEntry(id)!;
}

export function createMultipleEntries(
  items: Array<{
    entry_type?: EntryType;
    classe_id?: string | null;
    date: string;
    heure_debut?: string;
    heure_fin?: string;
    titre: string;
    resume?: string;
    statut?: Statut;
    tags?: string[];
    exam_id?: string | null;
    group_id?: string | null;
    meta?: EntryMeta;
    document_ids?: string[];
    attachment_ids?: string[];
  }>,
  userId: string = 'default'
): NotebookEntry[] {
  const db = getDb();
  const createdIds: string[] = [];
  const sharedGroupId = `grp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const run = db.transaction(() => {
    const insertEntry = db.prepare(`
      INSERT INTO notebook_entries (
        id, user_id, entry_type, classe_id, date, heure_debut, heure_fin,
        titre, resume, statut, tags, exam_id, group_id, meta
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertDoc = db.prepare('INSERT OR IGNORE INTO notebook_entry_documents (entry_id, document_id) VALUES (?, ?)');
    const insertAtt = db.prepare('INSERT OR IGNORE INTO notebook_entry_attachments (entry_id, attachment_id) VALUES (?, ?)');

    for (let i = 0; i < items.length; i++) {
      const data = items[i]!;
      const id = `entry_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 8)}`;
      insertEntry.run(
        id,
        userId,
        data.entry_type || 'SESSION',
        data.classe_id || null,
        data.date,
        data.heure_debut || '',
        data.heure_fin || '',
        data.titre.trim(),
        data.resume || '',
        data.statut || 'planifiee',
        JSON.stringify(data.tags || []),
        data.exam_id || null,
        data.group_id || sharedGroupId,
        JSON.stringify(data.meta || {})
      );
      for (const docId of data.document_ids || []) {
        insertDoc.run(id, docId);
      }
      for (const attId of data.attachment_ids || []) {
        insertAtt.run(id, attId);
      }
      createdIds.push(id);
    }
  });
  run();
  return createdIds.map((id) => getEntry(id)!).filter(Boolean);
}

export function updateEntry(
  id: string,
  data: Partial<{
    entry_type: EntryType;
    classe_id: string | null;
    date: string;
    heure_debut: string;
    heure_fin: string;
    titre: string;
    resume: string;
    statut: Statut;
    tags: string[];
    exam_id: string | null;
    group_id: string | null;
    meta: EntryMeta;
    document_ids: string[];
    attachment_ids: string[];
  }>
): NotebookEntry | null {
  const db = getDb();
  const run = db.transaction(() => {
    const fields: string[] = [];
    const values: unknown[] = [];
    if (data.entry_type !== undefined) { fields.push('entry_type = ?'); values.push(data.entry_type); }
    if (data.classe_id !== undefined) { fields.push('classe_id = ?'); values.push(data.classe_id || null); }
    if (data.date !== undefined) { fields.push('date = ?'); values.push(data.date); }
    if (data.heure_debut !== undefined) { fields.push('heure_debut = ?'); values.push(data.heure_debut); }
    if (data.heure_fin !== undefined) { fields.push('heure_fin = ?'); values.push(data.heure_fin); }
    if (data.titre !== undefined) { fields.push('titre = ?'); values.push(data.titre.trim()); }
    if (data.resume !== undefined) { fields.push('resume = ?'); values.push(data.resume); }
    if (data.statut !== undefined) { fields.push('statut = ?'); values.push(data.statut); }
    if (data.tags !== undefined) { fields.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.exam_id !== undefined) { fields.push('exam_id = ?'); values.push(data.exam_id || null); }
    if (data.group_id !== undefined) { fields.push('group_id = ?'); values.push(data.group_id || null); }
    if (data.meta !== undefined) { fields.push('meta = ?'); values.push(JSON.stringify(data.meta)); }
    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(id);
      db.prepare(`UPDATE notebook_entries SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    }
    if (data.document_ids !== undefined) {
      db.prepare('DELETE FROM notebook_entry_documents WHERE entry_id = ?').run(id);
      for (const docId of data.document_ids) {
        db.prepare('INSERT OR IGNORE INTO notebook_entry_documents (entry_id, document_id) VALUES (?, ?)').run(id, docId);
      }
    }
    if (data.attachment_ids !== undefined) {
      db.prepare('DELETE FROM notebook_entry_attachments WHERE entry_id = ?').run(id);
      for (const attId of data.attachment_ids) {
        db.prepare('INSERT OR IGNORE INTO notebook_entry_attachments (entry_id, attachment_id) VALUES (?, ?)').run(id, attId);
      }
    }
  });
  run();
  return getEntry(id);
}

export function bulkUpdateEntries(
  ids: string[],
  updates: { statut?: Statut; date?: string },
  userId?: string
): { updatedCount: number } {
  const db = getDb();
  if (ids.length === 0) return { updatedCount: 0 };
  const placeholders = ids.map(() => '?').join(',');
  const fields: string[] = [];
  const values: unknown[] = [];

  if (updates.statut !== undefined) {
    fields.push('statut = ?');
    values.push(updates.statut);
  }
  if (updates.date !== undefined) {
    fields.push('date = ?');
    values.push(updates.date);
  }
  if (fields.length === 0) return { updatedCount: 0 };

  fields.push("updated_at = datetime('now')");

  let sql = `UPDATE notebook_entries SET ${fields.join(', ')} WHERE id IN (${placeholders})`;
  const params: unknown[] = [...values, ...ids];
  if (userId) {
    sql += ' AND (user_id = ? OR user_id = "default")';
    params.push(userId);
  }

  const res = db.prepare(sql).run(...params);
  return { updatedCount: res.changes };
}

export function bulkDeleteEntries(
  ids: string[],
  userId?: string
): { deletedCount: number } {
  const db = getDb();
  if (ids.length === 0) return { deletedCount: 0 };
  const placeholders = ids.map(() => '?').join(',');
  let sql = `DELETE FROM notebook_entries WHERE id IN (${placeholders})`;
  const params: unknown[] = [...ids];
  if (userId) {
    sql += ' AND (user_id = ? OR user_id = "default")';
    params.push(userId);
  }
  const res = db.prepare(sql).run(...params);
  return { deletedCount: res.changes };
}

export function duplicateEntry(
  id: string,
  newDate: string,
  newClasseId?: string | null,
  userId: string = 'default'
): NotebookEntry | null {
  const source = getEntry(id);
  if (!source) return null;

  const targetClasseId = newClasseId !== undefined ? newClasseId : source.classe_id;
  const newEntry = createEntry(
    {
      entry_type: source.entry_type,
      classe_id: targetClasseId,
      date: newDate,
      heure_debut: source.heure_debut,
      heure_fin: source.heure_fin,
      titre: source.titre,
      resume: source.resume,
      statut: 'planifiee',
      tags: source.tags,
      exam_id: source.exam_id,
      meta: source.meta,
      document_ids: source.documents,
      attachment_ids: (source.attachments || []).map((a) => a.id),
    },
    userId
  );
  return newEntry;
}

export function deleteEntry(id: string, userId?: string): boolean {
  const db = getDb();
  let sql = 'DELETE FROM notebook_entries WHERE id = ?';
  const params: unknown[] = [id];
  if (userId) {
    sql += ' AND (user_id = ? OR user_id = "default")';
    params.push(userId);
  }
  const res = db.prepare(sql).run(...params);
  return res.changes > 0;
}

export function createAttachment(file: {
  original_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
  user_id?: string;
}): NotebookAttachment {
  const db = getDb();
  const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  db.prepare(`
    INSERT INTO notebook_attachments (id, user_id, filename, original_name, mime_type, size, storage_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    id,
    file.user_id || 'default',
    file.storage_path,
    file.original_name,
    file.mime_type,
    file.size,
    file.storage_path
  );
  return {
    id,
    name: file.original_name,
    size: file.size,
    mime_type: file.mime_type,
    url: `/api/notebook/attachments/${id}`,
    created_at: new Date().toISOString(),
  };
}

export function getAttachment(id: string): {
  id: string;
  original_name: string;
  mime_type: string;
  size: number;
  storage_path: string;
} | null {
  const db = getDb();
  return (db.prepare('SELECT id, original_name, mime_type, size, storage_path FROM notebook_attachments WHERE id = ?').get(id) as any) || null;
}

export function deleteAttachment(id: string): boolean {
  const db = getDb();
  const att = getAttachment(id);
  if (!att) return false;
  db.transaction(() => {
    db.prepare('DELETE FROM notebook_entry_attachments WHERE attachment_id = ?').run(id);
    db.prepare('DELETE FROM notebook_attachments WHERE id = ?').run(id);
  })();
  try {
    const filePath = join(process.cwd(), 'data', 'attachments', att.storage_path);
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  } catch (err) {
    console.error('Failed to unlink attachment file:', err);
  }
  return true;
}

export function linkAttachmentToEntry(entryId: string, attachmentId: string) {
  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO notebook_entry_attachments (entry_id, attachment_id) VALUES (?, ?)').run(entryId, attachmentId);
}

export function unlinkAttachmentFromEntry(entryId: string, attachmentId: string) {
  const db = getDb();
  db.prepare('DELETE FROM notebook_entry_attachments WHERE entry_id = ? AND attachment_id = ?').run(entryId, attachmentId);
}

/** All distinct tags across entries, for the filter UI. */
export function getAllTags(userId: string = 'default'): string[] {
  const db = getDb();
  const rows = db.prepare('SELECT tags FROM notebook_entries WHERE user_id = ?').all(userId) as { tags: string }[];
  const tags = new Set<string>();
  for (const r of rows) {
    try { for (const t of JSON.parse(r.tags || '[]')) tags.add(t); } catch { /* skip */ }
  }
  return [...tags].sort((a, b) => a.localeCompare(b, 'fr'));
}

/** Entry count + last date per class, for overview cards. */
export function getClasseStats(): Map<string, { entries: number; lastDate: string | null }> {
  const db = getDb();
  const rows = db.prepare(`
    SELECT classe_id, COUNT(*) as entries, MAX(date) as last_date
    FROM notebook_entries GROUP BY classe_id
  `).all() as any[];
  const map = new Map<string, { entries: number; lastDate: string | null }>();
  for (const r of rows) map.set(r.classe_id, { entries: r.entries, lastDate: r.last_date });
  return map;
}
