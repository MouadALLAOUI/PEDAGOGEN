import type { ClassMonthlyRecap } from '@/lib/notebook/notebookPrintUtils';

interface MonthlyRecapProps {
  monthLabel: string;
  recapsByClass: Record<string, ClassMonthlyRecap>;
  colSpan?: number;
}

export function MonthlyRecap({
  monthLabel,
  recapsByClass,
  colSpan = 6,
}: MonthlyRecapProps) {
  const recapList = Object.values(recapsByClass);
  if (recapList.length === 0) return null;

  return (
    <tr className="avoid-break border-b-2 border-black">
      <td colSpan={colSpan} className="p-3 bg-white">
        <div className="border border-black p-3 text-xs text-black">
          <div className="font-bold uppercase tracking-wider text-[11px] mb-2 pb-1 border-b border-black/40 flex items-center justify-between">
            <span>Bilan Mensuel : {monthLabel}</span>
            <span className="text-[10px] font-normal text-black/70">
              Récapitulatif pédagogique
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recapList.map((recap) => (
              <div
                key={recap.classe_id}
                className="border border-black/30 p-2.5 rounded-xs space-y-1.5 bg-black/[0.02]"
              >
                <div className="flex items-center justify-between font-bold text-xs border-b border-black/20 pb-1">
                  <span>Classe : {recap.classe_nom}</span>
                  <div className="flex items-center gap-2 text-[11px] font-medium text-black/80">
                    <span>Séances : {recap.totalSessions}</span>
                    {recap.totalMeetings > 0 && <span>• Réunions : {recap.totalMeetings}</span>}
                    {recap.totalPublications > 0 && <span>• Publications : {recap.totalPublications}</span>}
                  </div>
                </div>

                {/* Statuses count */}
                <div className="grid grid-cols-4 gap-1 text-[11px] py-1 border-b border-black/10">
                  <div>
                    <span className="text-[10px] text-black/70 block">Réalisées / Tenues</span>
                    <strong className="text-black">{recap.statutCounts.realisee + (recap.statutCounts.tenue || 0)}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-black/70 block">Planifiées</span>
                    <strong className="text-black">{recap.statutCounts.planifiee}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-black/70 block">Absences</span>
                    <strong className="text-black">{recap.statutCounts.absence}</strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-black/70 block">Reportées / Annulées</span>
                    <strong className="text-black">{recap.statutCounts.reportee + (recap.statutCounts.annulee || 0)}</strong>
                  </div>
                </div>

                {/* Chapters / Topics covered */}
                <div className="text-[11px] pt-0.5">
                  <span className="font-semibold block text-[10px] uppercase text-black/70">
                    Notions & chapitres abordés ({recap.chaptersCovered.length}) :
                  </span>
                  {recap.chaptersCovered.length > 0 ? (
                    <p className="line-clamp-2 text-black/90 italic" dir="auto">
                      {recap.chaptersCovered.join(' • ')}
                    </p>
                  ) : (
                    <span className="text-black/50 italic">—</span>
                  )}
                </div>

                {/* Exams / Evaluations */}
                <div className="text-[11px] pt-1 border-t border-black/10">
                  <span className="font-semibold block text-[10px] uppercase text-black/70">
                    Évaluations & Contrôles :
                  </span>
                  {recap.exams.length > 0 ? (
                    <ul className="space-y-0.5 mt-0.5">
                      {recap.exams.map((ex) => (
                        <li key={ex.id} className="flex items-center justify-between">
                          <span className="truncate font-medium" dir="auto">
                            ★ {ex.titre}
                          </span>
                          <span className="shrink-0 font-bold ml-2">
                            Moyenne :{' '}
                            {ex.average !== null && ex.average !== undefined
                              ? `${ex.average}/20`
                              : '—'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-black/50 italic">Aucun examen programmé ce mois.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </td>
    </tr>
  );
}
