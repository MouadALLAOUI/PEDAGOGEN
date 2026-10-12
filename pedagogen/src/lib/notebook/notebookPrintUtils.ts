import type { NotebookEntry, Statut, NotebookAttachment, EntryType, EntryMeta } from '@/types/notebook';

export interface ClassSlot {
  classe_id?: string | null;
  classe_nom: string;
  classe_niveau?: string;
  date: string;
  heure_debut?: string;
  heure_fin?: string;
}

export interface GroupedNotebookSession {
  id: string;
  group_id?: string | null;
  entry_type: EntryType;
  earliestDate: string;
  slots: ClassSlot[];
  titre: string;
  resume: string;
  statut: Statut;
  tags: string[];
  exam_id?: string | null;
  exam_titre?: string | null;
  meta?: EntryMeta;
  attachments: NotebookAttachment[];
  rawEntries: NotebookEntry[];
}

export interface ClassMonthlyRecap {
  classe_id: string;
  classe_nom: string;
  totalSessions: number;
  totalMeetings: number;
  totalPublications: number;
  statutCounts: {
    planifiee: number;
    realisee: number;
    absence: number;
    reportee: number;
    tenue: number;
    annulee: number;
  };
  chaptersCovered: string[];
  exams: Array<{
    id: string;
    titre: string;
    average: number | null; // null if no grades
  }>;
}

export interface MonthGroup {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Septembre 2026"
  sessions: GroupedNotebookSession[];
  recapsByClass: Record<string, ClassMonthlyRecap>;
}

const FRENCH_MONTHS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Normalizes text for reliable grouping comparison (lowercased, trimmed, collapsed whitespace).
 */
export function normalizeText(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Returns a human-friendly French month label from a date or YYYY-MM key.
 */
export function formatMonthYear(dateOrKey: string): string {
  if (!dateOrKey) return '';
  const parts = dateOrKey.split('-');
  if (parts.length < 2 || !parts[1]) return dateOrKey;
  const year = parts[0] || '';
  const monthIdx = parseInt(parts[1], 10) - 1;
  const monthName = FRENCH_MONTHS[monthIdx] || parts[1];
  return `${monthName} ${year}`;
}

/**
 * Formats a date string YYYY-MM-DD into French DD/MM/YYYY.
 */
export function formatDateFrench(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Formats time range e.g. "08:30–10:00" or single time or empty string.
 */
export function formatTimeRange(start?: string, end?: string): string {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return `Fin: ${end}`;
  return '';
}

/**
 * Computes grouping key: prefers entry.group_id if present;
 * otherwise fallback on normalized title + normalized resume + status.
 */
export function getSessionGroupingKey(entry: NotebookEntry): string {
  // Meetings and publications are NEVER merged with sessions
  if (entry.entry_type !== 'SESSION') {
    return `item_${entry.id}`;
  }
  if (entry.group_id && entry.group_id.trim().length > 0) {
    return `gid_${entry.group_id.trim()}`;
  }
  const normTitle = normalizeText(entry.titre);
  const normResume = normalizeText(entry.resume);
  const status = entry.statut || 'planifiee';
  return `fallback_${normTitle}__${normResume}__${status}`;
}

/**
 * Groups sessions according to layout:
 * - 'chrono': Identical sessions across classes are merged into a single GroupedNotebookSession.
 *             Sorted chronologically by earliest date.
 * - 'class': No merging; each entry stays distinct with its own slot.
 */
export function groupSessions(
  entries: NotebookEntry[],
  layout: 'chrono' | 'class' = 'chrono'
): GroupedNotebookSession[] {
  if (layout === 'class') {
    // Par classe: each entry is its own individual session
    return entries.map((entry) => ({
      id: entry.id,
      group_id: entry.group_id,
      entry_type: entry.entry_type,
      earliestDate: entry.date,
      slots: [
        {
          classe_id: entry.classe_id || null,
          classe_nom: entry.classe_nom || (entry.entry_type === 'SESSION' ? 'Classe' : '—'),
          classe_niveau: entry.classe_niveau,
          date: entry.date,
          heure_debut: entry.heure_debut,
          heure_fin: entry.heure_fin,
        },
      ],
      titre: entry.titre,
      resume: entry.resume || '',
      statut: entry.statut,
      tags: entry.tags || [],
      exam_id: entry.exam_id,
      exam_titre: entry.exam_titre,
      meta: entry.meta,
      attachments: entry.attachments || [],
      rawEntries: [entry],
    }));
  }

  // 'chrono' layout: group identical sessions
  const groupMap = new Map<string, GroupedNotebookSession>();

  for (const entry of entries) {
    const key = getSessionGroupingKey(entry);
    const existing = groupMap.get(key);

    const slot: ClassSlot = {
      classe_id: entry.classe_id || null,
      classe_nom: entry.classe_nom || (entry.entry_type === 'SESSION' ? 'Classe' : '—'),
      classe_niveau: entry.classe_niveau,
      date: entry.date,
      heure_debut: entry.heure_debut,
      heure_fin: entry.heure_fin,
    };

    if (!existing) {
      groupMap.set(key, {
        id: entry.group_id || entry.id,
        group_id: entry.group_id,
        entry_type: entry.entry_type,
        earliestDate: entry.date,
        slots: [slot],
        titre: entry.titre,
        resume: entry.resume || '',
        statut: entry.statut,
        tags: [...(entry.tags || [])],
        exam_id: entry.exam_id,
        exam_titre: entry.exam_titre,
        meta: entry.meta,
        attachments: [...(entry.attachments || [])],
        rawEntries: [entry],
      });
    } else {
      existing.slots.push(slot);
      existing.rawEntries.push(entry);

      // Keep earliest date for chronological sorting
      if (entry.date < existing.earliestDate) {
        existing.earliestDate = entry.date;
      }

      // Merge tags uniquely
      if (entry.tags) {
        for (const t of entry.tags) {
          if (!existing.tags.includes(t)) {
            existing.tags.push(t);
          }
        }
      }

      // Merge attachments uniquely
      if (entry.attachments) {
        for (const att of entry.attachments) {
          if (!existing.attachments.some((a) => a.id === att.id)) {
            existing.attachments.push(att);
          }
        }
      }

      if (!existing.exam_id && entry.exam_id) {
        existing.exam_id = entry.exam_id;
        existing.exam_titre = entry.exam_titre;
      }
    }
  }

  const grouped = Array.from(groupMap.values());

  // Sort slots inside each group by date & class name
  for (const g of grouped) {
    g.slots.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      if (a.heure_debut !== b.heure_debut) return (a.heure_debut || '').localeCompare(b.heure_debut || '');
      return (a.classe_nom || '').localeCompare(b.classe_nom || '');
    });
  }

  // Sort groups chronologically ascending (earliest first for journal de bord)
  grouped.sort((a, b) => {
    if (a.earliestDate !== b.earliestDate) {
      return a.earliestDate.localeCompare(b.earliestDate);
    }
    const aTime = a.slots[0]?.heure_debut || '';
    const bTime = b.slots[0]?.heure_debut || '';
    return aTime.localeCompare(bTime);
  });

  return grouped;
}

/**
 * Builds monthly recaps per class from sessions in a given month.
 */
export function buildMonthlyRecap(
  sessions: GroupedNotebookSession[],
  examAveragesMap: Map<string, number | null> = new Map()
): Record<string, ClassMonthlyRecap> {
  const recaps: Record<string, ClassMonthlyRecap> = {};

  for (const session of sessions) {
    for (const entry of session.rawEntries) {
      const classId = entry.classe_id || '__general__';
      const classNom = entry.classe_nom || 'Événements & Publications générales';

      if (!recaps[classId]) {
        recaps[classId] = {
          classe_id: classId,
          classe_nom: classNom,
          totalSessions: 0,
          totalMeetings: 0,
          totalPublications: 0,
          statutCounts: {
            planifiee: 0,
            realisee: 0,
            absence: 0,
            reportee: 0,
            tenue: 0,
            annulee: 0,
          },
          chaptersCovered: [],
          exams: [],
        };
      }

      const recap = recaps[classId]!;
      if (entry.entry_type === 'MEETING') {
        recap.totalMeetings += 1;
      } else if (entry.entry_type === 'PUBLICATION') {
        recap.totalPublications += 1;
      } else {
        recap.totalSessions += 1;
      }

      const st = entry.statut as Statut;
      if (st && recap.statutCounts[st] !== undefined) {
        recap.statutCounts[st] += 1;
      }

      // Title/Chapter covered
      if (entry.entry_type === 'SESSION') {
        const trimmedTitle = entry.titre.trim();
        if (trimmedTitle && !recap.chaptersCovered.includes(trimmedTitle)) {
          recap.chaptersCovered.push(trimmedTitle);
        }
      }

      // Linked Exam
      if (entry.exam_id) {
        if (!recap.exams.some((ex) => ex.id === entry.exam_id)) {
          const avgKey = `${classId}:${entry.exam_id}`;
          const fallbackAvgKey = entry.exam_id;
          const avg = examAveragesMap.has(avgKey)
            ? examAveragesMap.get(avgKey)!
            : (examAveragesMap.get(fallbackAvgKey) ?? null);

          recap.exams.push({
            id: entry.exam_id,
            titre: entry.exam_titre || 'Évaluation',
            average: avg,
          });
        }
      }
    }
  }

  return recaps;
}

/**
 * Groups sessions into monthly chunks with their French header and class recaps.
 */
export function groupByMonth(
  sessions: GroupedNotebookSession[],
  examAveragesMap: Map<string, number | null> = new Map()
): MonthGroup[] {
  const monthMap = new Map<string, GroupedNotebookSession[]>();

  for (const session of sessions) {
    const monthKey = session.earliestDate.slice(0, 7); // YYYY-MM
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, []);
    }
    monthMap.get(monthKey)!.push(session);
  }

  // Sort months chronologically
  const sortedMonthKeys = Array.from(monthMap.keys()).sort();

  return sortedMonthKeys.map((monthKey) => {
    const monthSessions = monthMap.get(monthKey)!;
    const recapsByClass = buildMonthlyRecap(monthSessions, examAveragesMap);
    return {
      monthKey,
      monthLabel: formatMonthYear(monthKey),
      sessions: monthSessions,
      recapsByClass,
    };
  });
}
