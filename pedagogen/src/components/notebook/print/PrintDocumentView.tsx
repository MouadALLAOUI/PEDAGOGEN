'use client';

import type { PrintNotebookData, PrintParams } from '@/lib/notebook/notebookPrintService';
import {
  groupSessions,
  groupByMonth,
} from '@/lib/notebook/notebookPrintUtils';
import { PrintHeader } from './PrintHeader';
import { MonthSeparator } from './MonthSeparator';
import { MonthlyRecap } from './MonthlyRecap';
import { SignatureBlock } from './SignatureBlock';

interface PrintDocumentViewProps {
  data: PrintNotebookData;
  params: PrintParams;
}

export function PrintDocumentView({ data, params }: PrintDocumentViewProps) {
  const layout = params.layout || 'class';
  const detail = params.detail || 'compact';
  const includeHeader = params.header !== false;
  const includeRecap = params.recap !== false;
  const includeSignatures = params.signatures !== false;

  const teacherName = params.teacherName || data.user?.full_name || '';
  const school = params.school || data.user?.etablissement || '';
  const subject = params.subject || data.user?.matiere || '';
  const academicYear = params.academicYear || data.meta.academicYear || '';
  const aref = data.user?.aref || '';
  const direction = data.user?.direction_provinciale || '';

  // Render when empty
  if (data.entries.length === 0) {
    return (
      <div className="max-w-[210mm] mx-auto bg-white p-12 text-center border border-black/20 my-8 shadow-sm print:shadow-none print:border-none">
        <h2 className="text-base font-bold text-black mb-2">
          Aucune séance pour ces critères
        </h2>
        <p className="text-xs text-black/70 mb-4">
          Modifiez vos filtres de dates, statuts ou classes pour afficher les entrées correspondantes.
        </p>
      </div>
    );
  }

  return (
    <div className="print-container text-black font-sans bg-transparent">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 15mm;
          @bottom-right {
            content: "Page " counter(page) " / " counter(pages);
            font-size: 8pt;
            color: #444;
          }
        }
        @media print {
          html, body {
            background-color: #fff !important;
            color: #000 !important;
            font-size: 10pt;
            line-height: 1.3;
          }
          .print-paper {
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            border: none !important;
            background: #fff !important;
          }
          .break-before-page {
            break-before: page;
            page-break-before: always;
          }
          .avoid-break {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          tr {
            break-inside: avoid;
            page-break-inside: avoid;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

      {layout === 'class' ? (
        /* ================= PAR CLASSE LAYOUT ================= */
        <div className="space-y-12 print:space-y-0">
          {data.classes.map((cls, classIdx) => {
            const classEntries = data.entries.filter((e) => e.classe_id === cls.id);
            if (classEntries.length === 0) return null;

            const groupedSessions = groupSessions(classEntries, 'class');
            const monthGroups = groupByMonth(groupedSessions, data.examAverages);

            return (
              <section
                key={cls.id}
                className={`print-paper bg-white mx-auto max-w-[210mm] p-8 sm:p-12 shadow-lg print:shadow-none print:p-0 border border-black/15 print:border-none ${
                  classIdx > 0 ? 'break-before-page' : ''
                }`}
              >
                {/* Official Header for this class */}
                {includeHeader && (
                  <PrintHeader
                    teacherName={teacherName}
                    school={school}
                    subject={subject}
                    academicYear={academicYear}
                    aref={aref}
                    direction={direction}
                    className={cls.name}
                    level={cls.niveau}
                  />
                )}

                {/* Table containing all months for this class */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-black text-black">
                    <thead className="table-header-group bg-black/10 text-black border-b-2 border-black">
                      <tr>
                        <th className="border border-black px-2.5 py-2 font-bold w-[80px] text-center text-[11px] uppercase">
                          Date
                        </th>
                        <th className="border border-black px-2.5 py-2 font-bold w-[80px] text-center text-[11px] uppercase">
                          Horaire
                        </th>
                        <th className="border border-black px-2.5 py-2 font-bold w-[200px] text-[11px] uppercase">
                          Titre de la Séance / Événement
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
                      {monthGroups.map((month) => (
                        <MonthGroupRows
                          key={month.monthKey}
                          month={month}
                          layout="class"
                          detail={detail}
                          includeRecap={includeRecap}
                          colSpan={5}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Signature block for this class */}
                {includeSignatures && (
                  <SignatureBlock teacherName={teacherName} className={cls.name} />
                )}
              </section>
            );
          })}

          {/* Section for General Meetings and Publications (without assigned class) */}
          {(() => {
            const generalEntries = data.entries.filter((e) => !e.classe_id);
            if (generalEntries.length === 0) return null;

            const generalGrouped = groupSessions(generalEntries, 'chrono');
            const generalMonths = groupByMonth(generalGrouped, data.examAverages);

            return (
              <section className="print-paper bg-white mx-auto max-w-[210mm] p-8 sm:p-12 shadow-lg print:shadow-none print:p-0 border border-black/15 print:border-none break-before-page">
                {includeHeader && (
                  <PrintHeader
                    teacherName={teacherName}
                    school={school}
                    subject={subject}
                    academicYear={academicYear}
                    aref={aref}
                    direction={direction}
                    className="Réunions & Publications générales"
                    level="Général"
                  />
                )}

                <div className="border-b-2 border-black pb-2 mb-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-black">
                    ◆ Réunions et publications générales (Sans classe assignée)
                  </h2>
                  <p className="text-[11px] text-black/70">
                    Événements institutionnels, réunions pédagogiques et circulaires administratives.
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse border border-black text-black">
                    <thead className="table-header-group bg-black/10 text-black border-b-2 border-black">
                      <tr>
                        <th className="border border-black px-2.5 py-2 font-bold w-[80px] text-center text-[11px] uppercase">
                          Date
                        </th>
                        <th className="border border-black px-2.5 py-2 font-bold w-[80px] text-center text-[11px] uppercase">
                          Horaire
                        </th>
                        <th className="border border-black px-2.5 py-2 font-bold w-[200px] text-[11px] uppercase">
                          Titre / Nature de l&apos;entrée
                        </th>
                        <th className="border border-black px-2.5 py-2 font-bold text-[11px] uppercase">
                          Contenu / Décisions / Actions
                        </th>
                        <th className="border border-black px-2.5 py-2 font-bold w-[120px] text-center text-[11px] uppercase">
                          Observations
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {generalMonths.map((month) => (
                        <MonthGroupRows
                          key={month.monthKey}
                          month={month}
                          layout="class"
                          detail={detail}
                          includeRecap={includeRecap}
                          colSpan={5}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                {includeSignatures && (
                  <SignatureBlock teacherName={teacherName} className="Général" />
                )}
              </section>
            );
          })()}
        </div>
      ) : (
        /* ================= CHRONOLOGIQUE LAYOUT ================= */
        <section className="print-paper bg-white mx-auto max-w-[210mm] p-8 sm:p-12 shadow-lg print:shadow-none print:p-0 border border-black/15 print:border-none">
          {includeHeader && (
            <PrintHeader
              teacherName={teacherName}
              school={school}
              subject={subject}
              academicYear={academicYear}
              aref={aref}
              direction={direction}
            />
          )}

          {(() => {
            const chronoSessions = groupSessions(data.entries, 'chrono');
            const monthGroups = groupByMonth(chronoSessions, data.examAverages);

            return (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse border border-black text-black">
                  <thead className="table-header-group bg-black/10 text-black border-b-2 border-black">
                    <tr>
                      <th className="border border-black px-2.5 py-2 font-bold w-[75px] text-center text-[11px] uppercase">
                        Date
                      </th>
                      <th className="border border-black px-2.5 py-2 font-bold w-[75px] text-center text-[11px] uppercase">
                        Horaire
                      </th>
                      <th className="border border-black px-2.5 py-2 font-bold w-[140px] text-[11px] uppercase">
                        Classe(s) / Portée
                      </th>
                      <th className="border border-black px-2.5 py-2 font-bold w-[170px] text-[11px] uppercase">
                        Titre / Nature
                      </th>
                      <th className="border border-black px-2.5 py-2 font-bold text-[11px] uppercase">
                        Contenu / Activités / Objectifs
                      </th>
                      <th className="border border-black px-2.5 py-2 font-bold w-[110px] text-center text-[11px] uppercase">
                        Observations
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthGroups.map((month) => (
                      <MonthGroupRows
                        key={month.monthKey}
                        month={month}
                        layout="chrono"
                        detail={detail}
                        includeRecap={includeRecap}
                        colSpan={6}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}

          {includeSignatures && <SignatureBlock teacherName={teacherName} />}
        </section>
      )}
    </div>
  );
}

/** Helper component rendering month separator + session rows + monthly recap inside tbody */
function MonthGroupRows({
  month,
  layout,
  detail,
  includeRecap,
  colSpan,
}: {
  month: {
    monthKey: string;
    monthLabel: string;
    sessions: any[];
    recapsByClass: any;
  };
  layout: 'class' | 'chrono';
  detail: 'compact' | 'detailed';
  includeRecap: boolean;
  colSpan: number;
}) {
  return (
    <>
      {/* Month separator row */}
      <MonthSeparator label={month.monthLabel} colSpan={colSpan} />

      {/* Sessions in this month */}
      {month.sessions.map((s) => {
        const isMeeting = s.entry_type === 'MEETING';
        const isPublication = s.entry_type === 'PUBLICATION';
        const isAbsence = s.statut === 'absence';
        const isReportee = s.statut === 'reportee' || s.statut === 'reportee';
        const isAnnulee = s.statut === 'annulee';
        const isExam = Boolean(s.exam_id);
        const meta = s.meta || {};

        const allSameDate = s.slots.every((sl: any) => sl.date === s.slots[0]?.date);
        const allSameTime = s.slots.every(
          (sl: any) =>
            (sl.heure_debut || '') === (s.slots[0]?.heure_debut || '') &&
            (sl.heure_fin || '') === (s.slots[0]?.heure_fin || '')
        );

        const primarySlot = s.slots[0];
        const displayDate = allSameDate && primarySlot
          ? formatFrenchDate(primarySlot.date)
          : formatFrenchDate(s.earliestDate);
        
        // Publications don't have time slot; meetings and sessions do
        const displayTime = isPublication
          ? '—'
          : allSameTime && primarySlot
            ? formatTime(primarySlot.heure_debut, primarySlot.heure_fin)
            : formatTime(primarySlot?.heure_debut, primarySlot?.heure_fin);

        return (
          <tr
            key={s.id}
            className={`border-b border-black/80 avoid-break ${
              isAbsence || isAnnulee ? 'bg-black/[0.04]' : 'bg-white'
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

            {/* Classe (in chrono layout only) */}
            {layout === 'chrono' && (
              <td className="border border-black px-2.5 py-2 align-top text-[11px]">
                {isMeeting ? (
                  <div>
                    <strong className="block">
                      {s.slots[0]?.classe_nom || 'Toutes classes / Général'}
                    </strong>
                    {meta.location && (
                      <span className="text-[10px] text-black/70 block">
                        Lieu : {meta.location}
                      </span>
                    )}
                  </div>
                ) : isPublication ? (
                  <div>
                    <strong className="block">
                      {s.slots[0]?.classe_nom || meta.targetAudience || 'Toutes classes'}
                    </strong>
                    {meta.issuer && (
                      <span className="text-[10px] text-black/70 block">
                        Émetteur : {meta.issuer}
                      </span>
                    )}
                  </div>
                ) : s.slots.length === 1 ? (
                  <div>
                    <strong className="block">{s.slots[0]?.classe_nom}</strong>
                    <span className="text-[10px] text-black/70 block">
                      {formatFrenchDate(s.slots[0]?.date || '')}{' '}
                      {formatTime(s.slots[0]?.heure_debut, s.slots[0]?.heure_fin)}
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {s.slots.map((sl: any, idx: number) => (
                      <div
                        key={idx}
                        className="text-[10px] leading-tight border-b border-black/10 last:border-b-0 pb-0.5"
                      >
                        <strong>{sl.classe_nom}</strong>
                        <div className="text-black/70">
                          {formatFrenchDate(sl.date)}{' '}
                          {formatTime(sl.heure_debut, sl.heure_fin)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </td>
            )}

            {/* Titre & Nature */}
            <td className="border border-black px-2.5 py-2 align-top text-xs" dir="auto">
              <div className="font-bold text-black flex items-start gap-1 flex-wrap">
                {isMeeting && (
                  <span className="font-bold uppercase tracking-wider text-black shrink-0">
                    ◆ [Réunion{meta.meetingKind ? ` : ${meta.meetingKind}` : ''}]
                  </span>
                )}
                {isPublication && (
                  <span className="font-bold uppercase tracking-wider text-black shrink-0">
                    ✉ [Publication{meta.publicationKind ? ` : ${meta.publicationKind}` : ''}]
                  </span>
                )}
                {isAbsence && (
                  <span className="font-bold italic text-black shrink-0">
                    ✗ [Absence]
                  </span>
                )}
                {isAnnulee && (
                  <span className="font-bold italic text-black shrink-0">
                    ✗ [Annulée]
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

              {isPublication && meta.referenceNumber && (
                <div className="text-[10px] font-semibold text-black/85 mt-0.5">
                  N° Réf : {meta.referenceNumber}
                </div>
              )}

              {isMeeting && meta.participants && (
                <div className="text-[10px] text-black/75 mt-0.5 italic">
                  Participants : {meta.participants}
                </div>
              )}

              {isExam && s.exam_titre && (
                <div className="text-[10px] font-semibold text-black/85 mt-0.5">
                  Évaluation : {s.exam_titre}
                </div>
              )}

              {detail === 'detailed' && s.tags && s.tags.length > 0 && (
                <div className="text-[10px] text-black/60 mt-1 italic">
                  Tags : {s.tags.join(', ')}
                </div>
              )}
            </td>

            {/* Contenu / Activités / Ordre du jour */}
            <td className="border border-black px-2.5 py-2 align-top text-xs" dir="auto">
              {isMeeting ? (
                <div className="space-y-1 text-[11px] leading-relaxed text-black">
                  {meta.agenda && (
                    <div>
                      <strong className="text-[10px] uppercase font-bold text-black">Ordre du jour : </strong>
                      <span className="whitespace-pre-line">{meta.agenda}</span>
                    </div>
                  )}
                  {meta.decisions && (
                    <div className="pt-0.5 border-t border-black/10">
                      <strong className="text-[10px] uppercase font-bold text-black">Décisions / PV : </strong>
                      <span className="whitespace-pre-line">{meta.decisions}</span>
                    </div>
                  )}
                  {!meta.agenda && !meta.decisions && (
                    <p className="text-black/80">{s.resume || '—'}</p>
                  )}
                </div>
              ) : isPublication ? (
                <div className="space-y-1.5 text-[11px] leading-relaxed text-black">
                  <p className="whitespace-pre-line">{s.resume || '—'}</p>
                  {meta.actionRequired && (
                    <div className="mt-1 p-1 bg-black/5 border border-black font-semibold text-[10px] flex items-center gap-1.5">
                      <span>⚠ ACTION REQUISE</span>
                      {meta.actionDeadline && (
                        <span>— Avant le {formatFrenchDate(meta.actionDeadline)}</span>
                      )}
                    </div>
                  )}
                </div>
              ) : isAbsence ? (
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

                      {s.attachments && s.attachments.length > 0 && (
                        <div className="pt-1 border-t border-black/15 text-[10px] text-black/80">
                          <strong>Fichiers joints : </strong>
                          <span>{s.attachments.map((a: any) => a.name).join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </td>

            {/* Observations (lined space for handwriting) */}
            <td className="border border-black px-2 py-2 align-top text-[10px]" dir="auto">
              <div className="min-h-[38px] flex flex-col justify-end space-y-2">
                <div className="w-full border-b border-black/30 border-dotted h-2" />
                <div className="w-full border-b border-black/30 border-dotted h-2" />
              </div>
            </td>
          </tr>
        );
      })}

      {/* Optional End-of-month recap */}
      {includeRecap && (
        <MonthlyRecap
          monthLabel={month.monthLabel}
          recapsByClass={month.recapsByClass}
          colSpan={colSpan}
        />
      )}
    </>
  );
}

function formatFrenchDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
}

function formatTime(start?: string, end?: string): string {
  if (start && end) return `${start}–${end}`;
  if (start) return start;
  if (end) return `Fin: ${end}`;
  return '';
}
