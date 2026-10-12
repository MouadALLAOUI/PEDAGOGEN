'use client';

import { useState, useEffect } from 'react';
import {
  Printer, Loader2, CheckCircle2, Clock
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import type { CollegeClass } from '@/types/student';

interface SequenceReportModalProps {
  open: boolean;
  onClose: () => void;
  classes: CollegeClass[];
  initialClasseId?: string;
}

export function SequenceReportModal({
  open,
  onClose,
  classes,
  initialClasseId,
}: SequenceReportModalProps) {
  const [selectedClasseId, setSelectedClasseId] = useState(initialClasseId || classes[0]?.id || '');
  const [sequenceQuery, setSequenceQuery] = useState('');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<any>(null);

  useEffect(() => {
    if (initialClasseId) {
      setSelectedClasseId(initialClasseId);
    } else if (classes[0]?.id && !selectedClasseId) {
      setSelectedClasseId(classes[0].id);
    }
  }, [initialClasseId, classes]);

  useEffect(() => {
    if (!open || !selectedClasseId) return;
    setLoading(true);
    const params = new URLSearchParams({ classeId: selectedClasseId });
    if (sequenceQuery) params.set('query', sequenceQuery);
    if (dateDebut) params.set('dateDebut', dateDebut);
    if (dateFin) params.set('dateFin', dateFin);

    fetch(`/api/notebook/sequence-report?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setReportData(data);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [open, selectedClasseId, sequenceQuery, dateDebut, dateFin]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal open={open} onClose={onClose} title="Bilan & Rapport de Fin de Séquence Didactique">
      <div className="space-y-5 max-w-4xl max-h-[82vh] overflow-y-auto pr-1">
        
        {/* Controls Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3.5 rounded-xl bg-parchment-dark/40 border border-border print:hidden">
          <div>
            <label htmlFor="seq-class-select" className="text-xs font-bold text-navy block mb-1">Classe :</label>
            <select
              id="seq-class-select"
              aria-label="Sélectionner la classe pour le bilan"
              value={selectedClasseId}
              onChange={(e) => setSelectedClasseId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs font-medium text-navy"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.niveau})</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="seq-theme-input" className="text-xs font-bold text-navy block mb-1">Mot-clé / Séquence :</label>
            <input
              id="seq-theme-input"
              value={sequenceQuery}
              onChange={(e) => setSequenceQuery(e.target.value)}
              placeholder="Ex : Réseaux, Algorithme, Unité 1"
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs text-navy placeholder:text-muted"
            />
          </div>

          <div>
            <label htmlFor="seq-date-debut" className="text-xs font-bold text-navy block mb-1">Du :</label>
            <input
              id="seq-date-debut"
              type="date"
              value={dateDebut}
              onChange={(e) => setDateDebut(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs text-navy"
            />
          </div>

          <div>
            <label htmlFor="seq-date-fin" className="text-xs font-bold text-navy block mb-1">Au :</label>
            <input
              id="seq-date-fin"
              type="date"
              value={dateFin}
              onChange={(e) => setDateFin(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-white text-xs text-navy"
            />
          </div>
        </div>

        {/* Action Header in modal */}
        <div className="flex items-center justify-between print:hidden">
          <p className="text-xs text-muted">
            Document officiel prêt à soumettre à l&apos;administration / Chef d&apos;établissement.
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={handlePrint}>
              <Printer size={14} className="mr-1.5" />
              Imprimer / Exporter PDF
            </Button>
          </div>
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-teal" />
          </div>
        ) : !reportData ? (
          <div className="p-8 text-center text-xs text-muted">Aucune donnée disponible pour cette classe.</div>
        ) : (
          /* Report Paper Document */
          <div className="bg-white p-6 sm:p-8 rounded-xl border border-border shadow-xs text-navy space-y-6">
            
            {/* Ministerial Official Header */}
            <div className="border-b-2 border-teal pb-4 flex flex-col sm:flex-row justify-between items-start gap-4 text-xs">
              <div>
                <strong className="text-sm text-navy block font-bold">Royaume du Maroc</strong>
                <span className="text-muted block">Ministère de l&apos;Éducation Nationale</span>
                <strong className="text-teal block font-semibold">{reportData.enseignant.aref}</strong>
                <span className="text-muted block">{reportData.enseignant.direction}</span>
              </div>
              <div className="text-center sm:text-center">
                <strong className="text-sm font-bold text-navy block">{reportData.enseignant.etablissement}</strong>
                <span className="text-muted block">Cycle d&apos;Enseignement Collégial</span>
                <span className="text-amber-800 font-bold block">Année : {reportData.enseignant.anneeScolaire}</span>
              </div>
              <div className="text-left sm:text-right">
                <strong className="text-xs text-navy block">Professeur : {reportData.enseignant.nom}</strong>
                <strong className="text-teal block">Matière : {reportData.enseignant.matiere}</strong>
                <span className="text-muted block">
                  Classe : {reportData.classe.nom} ({reportData.classe.niveau})
                </span>
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2">
              <h2 className="font-display text-xl font-bold tracking-tight text-navy uppercase">
                BILAN PÉDAGOGIQUE DE FIN DE SÉQUENCE
              </h2>
              <p className="text-xs text-muted mt-1 font-medium">
                {sequenceQuery ? `Séquence : « ${sequenceQuery} »` : 'Ensemble des séances enregistrées de la période'}
              </p>
            </div>

            {/* Synthesis Table KPIs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-parchment/30 p-4 rounded-xl border border-border/80">
              <div className="text-center">
                <span className="text-[11px] text-muted block">Séances Réalisées</span>
                <strong className="text-xl font-bold text-navy">
                  {reportData.stats.completedSessions} / {reportData.stats.totalSessions}
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">
                  ({reportData.stats.plannedSessions} planifiées)
                </span>
              </div>

              <div className="text-center border-l border-border/60">
                <span className="text-[11px] text-muted block">Volume Horaire</span>
                <strong className="text-xl font-bold text-teal">
                  {reportData.stats.totalHours} heures
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">effectuées</span>
              </div>

              <div className="text-center border-l border-border/60">
                <span className="text-[11px] text-muted block">Couverture Didactique</span>
                <strong className="text-xl font-bold text-green-700">
                  {reportData.stats.coverageRate}%
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">du programme</span>
              </div>

              <div className="text-center border-l border-border/60">
                <span className="text-[11px] text-muted block">Évaluations Liées</span>
                <strong className="text-xl font-bold text-navy">
                  {reportData.exams.length}
                </strong>
                <span className="text-[10px] text-muted block mt-0.5">contrôle(s)</span>
              </div>
            </div>

            {/* Exams Performance Section */}
            {reportData.exams.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-teal" />
                  Résultats des Évaluations Sommatiques & Formatives
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-parchment/80 border-b border-border text-muted font-medium">
                      <tr>
                        <th className="py-2 px-3 text-left">Intitulé du Contrôle</th>
                        <th className="py-2 px-3 text-left">Date</th>
                        <th className="py-2 px-3 text-center">Élèves Notés</th>
                        <th className="py-2 px-3 text-center">Moyenne Classe</th>
                        <th className="py-2 px-3 text-center">Taux Réussite (&ge; 10/20)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {reportData.exams.map((ex: any) => (
                        <tr key={ex.id}>
                          <td className="py-2.5 px-3 font-semibold text-navy">{ex.titre}</td>
                          <td className="py-2.5 px-3 text-muted">{ex.date || '—'}</td>
                          <td className="py-2.5 px-3 text-center font-medium">{ex.gradedCount}</td>
                          <td className="py-2.5 px-3 text-center font-bold text-teal">
                            {ex.classAverage !== null ? `${ex.classAverage} / 20` : '—'}
                          </td>
                          <td className="py-2.5 px-3 text-center font-semibold text-green-700">
                            {ex.successRate !== null ? `${ex.successRate}%` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Chronological Sequence Content List */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-1.5">
                <Clock size={14} className="text-teal" />
                Déroulement Didactique des Séances Consignées
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-parchment/80 border-b border-border text-muted font-medium">
                    <tr>
                      <th className="py-2 px-3 text-left w-24">Date & Horaire</th>
                      <th className="py-2 px-3 text-left">Séance / Contenu Abordé</th>
                      <th className="py-2 px-3 text-center w-24">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {reportData.sessions.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-muted">
                          Aucune séance enregistrée pour cette sélection.
                        </td>
                      </tr>
                    ) : (
                      reportData.sessions.map((s: any) => (
                        <tr key={s.id} className="hover:bg-parchment/20">
                          <td className="py-2.5 px-3 font-mono text-[11px] text-muted">
                            {s.date}
                            {s.heure_debut && <div className="text-teal font-medium">{s.heure_debut}-{s.heure_fin}</div>}
                          </td>
                          <td className="py-2.5 px-3">
                            <strong className="text-navy font-semibold block">{s.titre}</strong>
                            {s.resume && (
                              <p className="text-muted text-[11px] line-clamp-1 mt-0.5">
                                {s.resume.replace(/[#*`>\-\[\]]/g, '')}
                              </p>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                              s.statut === 'realisee'
                                ? 'bg-green-100 text-green-800'
                                : s.statut === 'planifiee'
                                ? 'bg-teal-50 text-teal'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {s.statut}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Official Observations & Remédiation Box */}
            <div className="p-3.5 rounded-lg border border-border/80 bg-parchment/20 space-y-1.5 text-xs">
              <strong className="text-navy font-bold block">Observations & Dispositif de Remédiation Pédagogique :</strong>
              <p className="text-muted leading-relaxed">
                Les acquis de la séquence ont été vérifiés par des activités d&apos;application et des contrôles continus.
                Des séances de consolidation ciblées sont programmées pour les apprenants nécessitant un soutien méthodologique.
              </p>
            </div>

            {/* Official Signature and Stamp Box */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border text-xs">
              {/* Teacher side */}
              <div className="p-4 rounded-lg border border-border bg-parchment/20 text-center space-y-6">
                <div>
                  <strong className="font-bold text-navy block">L&apos;Enseignant(e) Titulaire</strong>
                  <span className="text-[11px] text-muted">{reportData.enseignant.nom}</span>
                </div>
                <div className="p-2 border border-dashed border-teal/40 rounded bg-white/80">
                  <span className="text-[10px] text-teal font-semibold block">★ VALIDATION ÉLECTRONIQUE ★</span>
                  <span className="text-[9px] text-muted block">Émargé conforme au cahier de textes</span>
                </div>
                <p className="text-[10px] text-muted">Fait le {new Date().toLocaleDateString('fr-FR')}</p>
              </div>

              {/* Head of School / Inspector side */}
              <div className="p-4 rounded-lg border border-border bg-white text-center space-y-6">
                <div>
                  <strong className="font-bold text-navy block">Visa du Chef d&apos;Établissement / Inspecteur</strong>
                  <span className="text-[11px] text-muted">Mention : [  ] Vu et approuvé   [  ] À réajuster</span>
                </div>
                <div className="h-10 flex items-center justify-center text-muted/30 text-[10px]">
                  (Signature & Cachet de l&apos;Établissement)
                </div>
                <p className="text-[10px] text-muted">Le ...... / ...... / 202...</p>
              </div>
            </div>

          </div>
        )}

      </div>
    </Modal>
  );
}
