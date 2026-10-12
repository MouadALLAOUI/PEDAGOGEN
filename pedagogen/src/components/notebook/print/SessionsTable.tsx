import type { GroupedNotebookSession } from '@/lib/notebook/notebookPrintUtils';
import { formatDateFrench, formatTimeRange } from '@/lib/notebook/notebookPrintUtils';

interface SessionsTableProps {
  sessions: GroupedNotebookSession[];
  layout: 'class' | 'chrono';
  detail: 'compact' | 'detailed';
}

export function SessionsTable({
  sessions,
  layout,
  detail,
}: SessionsTableProps) {
  const isChrono = layout === 'chrono';

  return (
    <table className="w-full text-left text-xs border-collapse border border-black text-black">
      <thead className="table-header-group bg-black/10 text-black border-b-2 border-black">
        <tr>
          <th className="border border-black px-2.5 py-2 font-bold w-[75px] text-center text-[11px] uppercase">
            Date
          </th>
          <th className="border border-black px-2.5 py-2 font-bold w-[75px] text-center text-[11px] uppercase">
            Horaire
          </th>
          {isChrono && (
            <th className="border border-black px-2.5 py-2 font-bold w-[140px] text-[11px] uppercase">
              Classe(s) & Créneaux
            </th>
          )}
          <th className="border border-black px-2.5 py-2 font-bold w-[180px] text-[11px] uppercase">
            Titre de la Séance
          </th>
          <th className="border border-black px-2.5 py-2 font-bold text-[11px] uppercase">
            Contenu / Activités / Objectifs
          </th>
          <th className="border border-black px-2.5 py-2 font-bold w-[120px] text-center text-[11px] uppercase">
            Observations
          </th>
        </tr>
      </thead>
      <tbody>
        {sessions.map((s) => {
          const isAbsence = s.statut === 'absence';
          const isReportee = s.statut === 'reportee';
          const isExam = Boolean(s.exam_id);

          // Check if all slots have identical date & time
          const allSameDate = s.slots.every((sl) => sl.date === s.slots[0]?.date);
          const allSameTime = s.slots.every(
            (sl) =>
              (sl.heure_debut || '') === (s.slots[0]?.heure_debut || '') &&
              (sl.heure_fin || '') === (s.slots[0]?.heure_fin || '')
          );

          // Primary date/time display
          const primarySlot = s.slots[0];
          const displayDate = allSameDate && primarySlot
            ? formatDateFrench(primarySlot.date)
            : formatDateFrench(s.earliestDate);
          const displayTime = allSameTime && primarySlot
            ? formatTimeRange(primarySlot.heure_debut, primarySlot.heure_fin)
            : formatTimeRange(primarySlot?.heure_debut, primarySlot?.heure_fin);

          return (
            <tr
              key={s.id}
              className={`border-b border-black/80 avoid-break ${
                isAbsence ? 'bg-black/[0.04]' : 'bg-white'
              }`}
            >
              {/* Date */}
              <td className="border border-black px-2 py-2 text-center font-medium align-top whitespace-nowrap text-[11px]">
                {displayDate}
                {!allSameDate && s.slots.length > 1 && (
                  <span className="block text-[9px] text-black/60 italic">(1ère séance)</span>
                )}
              </td>

              {/* Horaire */}
              <td className="border border-black px-2 py-2 text-center text-[10px] align-top whitespace-nowrap">
                {displayTime || '—'}
              </td>

              {/* Classe (in chrono layout) */}
              {isChrono && (
                <td className="border border-black px-2.5 py-2 align-top text-[11px]">
                  {s.slots.length === 1 ? (
                    <div>
                      <strong className="block">{s.slots[0]?.classe_nom}</strong>
                      <span className="text-[10px] text-black/70 block">
                        {formatDateFrench(s.slots[0]?.date || '')}{' '}
                        {formatTimeRange(s.slots[0]?.heure_debut, s.slots[0]?.heure_fin)}
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {s.slots.map((sl, idx) => (
                        <div key={idx} className="text-[10px] leading-tight border-b border-black/10 last:border-b-0 pb-0.5">
                          <strong>{sl.classe_nom}</strong>
                          <div className="text-black/70">
                            {formatDateFrench(sl.date)}{' '}
                            {formatTimeRange(sl.heure_debut, sl.heure_fin)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </td>
              )}

              {/* Titre */}
              <td className="border border-black px-2.5 py-2 align-top text-xs" dir="auto">
                <div className="font-bold text-black flex items-start gap-1">
                  {/* Status indicators per spec */}
                  {isAbsence && (
                    <span className="font-bold italic text-black shrink-0">
                      ✗ [Absence]
                    </span>
                  )}
                  {isReportee && (
                    <span className="font-bold text-black shrink-0">
                      ↻ [Reportée]
                    </span>
                  )}
                  {isExam && (
                    <span className="font-bold text-black shrink-0">
                      ★ [Examen]
                    </span>
                  )}
                  <span>{s.titre}</span>
                </div>

                {isExam && s.exam_titre && (
                  <div className="text-[10px] font-semibold text-black/85 mt-0.5">
                    Évaluation : {s.exam_titre}
                  </div>
                )}

                {/* Plain text tags (only if not compact, or plain text) */}
                {detail === 'detailed' && s.tags && s.tags.length > 0 && (
                  <div className="text-[10px] text-black/60 mt-1 italic">
                    Tags : {s.tags.join(', ')}
                  </div>
                )}
              </td>

              {/* Contenu / Activités */}
              <td className="border border-black px-2.5 py-2 align-top text-xs" dir="auto">
                {isAbsence ? (
                  <div className="italic text-black/70 text-[11px]">
                    Séance annulée / non assurée.{' '}
                    {s.resume && <span className="not-italic block mt-0.5 font-sans">{s.resume}</span>}
                  </div>
                ) : (
                  <div>
                    {detail === 'compact' ? (
                      <p className="line-clamp-2 text-black/90 text-[11px] leading-snug">
                        {s.resume || '—'}
                      </p>
                    ) : (
                      <div className="space-y-1.5 text-[11px] leading-relaxed text-black">
                        <p className="whitespace-pre-line">{s.resume || '—'}</p>

                        {/* Attached documents */}
                        {s.attachments && s.attachments.length > 0 && (
                          <div className="pt-1 border-t border-black/15 text-[10px] text-black/80">
                            <strong>Fichiers joints : </strong>
                            <span>{s.attachments.map((a) => a.name).join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </td>

              {/* Observations: lined space for handwriting */}
              <td className="border border-black px-2 py-2 align-top text-[10px]" dir="auto">
                <div className="min-h-[38px] flex flex-col justify-end space-y-2">
                  <div className="w-full border-b border-black/30 border-dotted h-2" />
                  <div className="w-full border-b border-black/30 border-dotted h-2" />
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
