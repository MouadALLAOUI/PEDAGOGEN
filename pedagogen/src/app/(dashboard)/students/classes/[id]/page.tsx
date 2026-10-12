'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Users,
  Calendar,
  Award,
  ArrowLeft,
  Plus,
  Search,
  X,
  Loader2,
  Save,
  Clock,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import toast from 'react-hot-toast';
import type {
  CollegeClass,
  Student,
  StudentGrade,
  StudentObservation,
  SessionFeedback,
  TarlStatus,
  ComprehensionDimension,
  ParticipationDimension,
  ComportementApprentissage,
  DifficultesRencontrees,
  ActionPedagogique,
  CausePedagogique,
  ProchaineSeanceAction,
  EvaluationType,
} from '@/types/student';
import {
  COMPREHENSION_CONFIG,
  PARTICIPATION_CONFIG,
  COMPORTEMENT_CONFIG,
  DIFFICULTE_CONFIG,
  ACTION_PEDAGOGIQUE_CONFIG,
  CAUSE_PEDAGOGIQUE_CONFIG,
  PROCHAINE_SEANCE_CONFIG,
  TARL_STATUS_CONFIG,
} from '@/types/student';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ClassDetailPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const classId = resolvedParams.id;

  const [cls, setCls] = useState<CollegeClass | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [observations, setObservations] = useState<StudentObservation[]>([]);
  const [sessionFeedbacks, setSessionFeedbacks] = useState<SessionFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Active Tab: 'roster' | 'attendance' | 'grades' | 'observations' | 'feedbacks'
  const [activeTab, setActiveTab] = useState<'roster' | 'attendance' | 'grades' | 'observations' | 'feedbacks'>('roster');

  // Modals
  const [mounted, setMounted] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showAddGradeModal, setShowAddGradeModal] = useState(false);
  const [showAddObsModal, setShowAddObsModal] = useState(false);
  const [showSessionFeedbackModal, setShowSessionFeedbackModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAnyModalOpen = showAddStudentModal || showAddGradeModal || showAddObsModal || showSessionFeedbackModal;

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddStudentModal(false);
        setShowAddGradeModal(false);
        setShowAddObsModal(false);
        setShowSessionFeedbackModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAnyModalOpen]);

  // Quick 1-tap active notion
  const [activeSessionNotion, setActiveSessionNotion] = useState('Les conditions (Si... Alors)');

  // Add Student Form State
  const [newStudentFirst, setNewStudentFirst] = useState('');
  const [newStudentLast, setNewStudentLast] = useState('');
  const [newStudentCne, setNewStudentCne] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'M' | 'F'>('M');
  const [newStudentTarl, setNewStudentTarl] = useState<TarlStatus>('standard');
  const [newStudentNeeds, setNewStudentNeeds] = useState('');
  const [newStudentGuardianPhone, setNewStudentGuardianPhone] = useState('');

  // Attendance Form State
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0] || ''
  );
  const [attendanceSessionTitle, setAttendanceSessionTitle] = useState('');
  const [attendanceState, setAttendanceState] = useState<
    Record<string, { type: 'presence' | 'absence' | 'retard'; is_justified: boolean; notes: string }>
  >({});

  // Add Grade Form State
  const [gradeTitle, setGradeTitle] = useState('');
  const [gradeEvalType, setGradeEvalType] = useState<EvaluationType>('controle');
  const gradeMaxScore = 20;
  const gradeCoeff = 1;
  const [gradeDate, setGradeDate] = useState<string>(
    new Date().toISOString().split('T')[0] || ''
  );
  const [studentGradeInputs, setStudentGradeInputs] = useState<Record<string, string>>({});

  // Pedagogical Observation Form State
  const [obsType, setObsType] = useState<'individuelle' | 'collective'>('individuelle');
  const [obsStudentId, setObsStudentId] = useState<string>('');
  const [obsDate, setObsDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [obsParticipation, setObsParticipation] = useState<ParticipationDimension>('active');
  const [obsComprehension, setObsComprehension] = useState<ComprehensionDimension>('maitrise');
  const [obsComportements, setObsComportements] = useState<ComportementApprentissage[]>(['concentre']);
  const [obsDifficulte, setObsDifficulte] = useState<DifficultesRencontrees>('aucune');
  const [obsAction, setObsAction] = useState<ActionPedagogique>('aucune');
  const [obsNotion, setObsNotion] = useState('');
  const [obsCause, setObsCause] = useState<CausePedagogique>('a_determiner');
  const [obsProchaine, setObsProchaine] = useState<ProchaineSeanceAction[]>([]);
  const [obsText, setObsText] = useState('');

  // 30-60s Session Feedback State
  const [feedbackDate, setFeedbackDate] = useState(new Date().toISOString().split('T')[0] || '');
  const [feedbackLecon, setFeedbackLecon] = useState('');
  const [feedbackObjectif, setFeedbackObjectif] = useState<'oui' | 'partiellement' | 'non'>('oui');
  const [feedbackPart, setFeedbackPart] = useState<'bonne' | 'moyenne' | 'faible'>('bonne');
  const [feedbackComp, setFeedbackComp] = useState<'bonne' | 'heterogene' | 'faible'>('bonne');
  const [feedbackDiff, setFeedbackDiff] = useState('Compréhension de la consigne');
  const [feedbackElevesRevoir, setFeedbackElevesRevoir] = useState<string[]>([]);
  const [feedbackReprendre, setFeedbackReprendre] = useState('');
  const [feedbackNote, setFeedbackNote] = useState('');

  // Roster Search & Filter
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterTarlFilter, setRosterTarlFilter] = useState<string>('ALL');

  // Load Class Data
  const loadClassData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/classes/${classId}`);
      if (!res.ok) throw new Error('Classe non trouvée');
      const data = await res.json();
      setCls(data.class);
      setStudents(data.students || []);
      setGrades(data.grades || []);
      setObservations(data.observations || []);

      // Fetch session feedbacks
      try {
        const sfRes = await fetch(`/api/students/session-feedback?classId=${classId}`);
        if (sfRes.ok) {
          const sfData = await sfRes.json();
          setSessionFeedbacks(sfData.feedbacks || []);
        }
      } catch {
        // non-blocking
      }

      // Initialize default attendance state (presence for all)
      const initialAtt: Record<string, { type: 'presence' | 'absence' | 'retard'; is_justified: boolean; notes: string }> = {};
      for (const s of data.students || []) {
        initialAtt[s.id] = { type: 'presence', is_justified: false, notes: '' };
      }
      setAttendanceState(initialAtt);
    } catch (err: any) {
      toast.error(err.message || 'Erreur chargement classe');
      router.push('/students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClassData();
  }, [classId]);

  // Handle Add Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cls) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: cls.id,
          season_id: cls.season_id,
          first_name: newStudentFirst.trim(),
          last_name: newStudentLast.trim(),
          cne_massar: newStudentCne.trim(),
          gender: newStudentGender,
          tarl_status: newStudentTarl,
          special_needs: newStudentNeeds.trim(),
          guardian_phone: newStudentGuardianPhone.trim(),
        }),
      });

      if (!res.ok) throw new Error('Échec création élève');
      toast.success('Élève ajouté avec succès');
      setShowAddStudentModal(false);
      setNewStudentFirst('');
      setNewStudentLast('');
      setNewStudentCne('');
      setNewStudentNeeds('');
      setNewStudentGuardianPhone('');
      await loadClassData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 1-Tap Quick Observation
  const handleQuickObservation = async (
    studentId: string,
    studentName: string,
    comp: ComprehensionDimension,
    diff?: DifficultesRencontrees
  ) => {
    try {
      const res = await fetch(`/api/students/${studentId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          date: new Date().toISOString().split('T')[0] || '',
          observation_type: 'individuelle',
          comprehension: comp,
          difficulte: diff || (comp === 'maitrise' ? 'aucune' : 'consigne'),
          action_pedagogique: comp === 'difficulte_importante' ? 'aide_individuelle' : 'aucune',
          notion: activeSessionNotion.trim() || undefined,
          matiere: cls?.matiere,
          niveau: cls?.niveau,
          participation: comp === 'maitrise' ? 'active' : 'moyenne',
          comportements: comp === 'maitrise' ? ['concentre'] : ['en_retrait'],
          needs_help: comp === 'difficulte_importante',
          help_topic: comp === 'difficulte_importante' ? activeSessionNotion : undefined,
          help_urgency: comp === 'difficulte_importante' ? 'moyen' : undefined,
        }),
      });
      if (!res.ok) throw new Error('Échec enregistrement');
      const data = await res.json();
      toast.success(`${studentName} : ${COMPREHENSION_CONFIG[comp].label}`, { icon: COMPREHENSION_CONFIG[comp].emoji });
      setObservations(prev => [data.observation, ...prev]);
    } catch (err: any) {
      toast.error(err.message || 'Erreur enregistrement');
    }
  };

  // Submit Detailed Observation Modal
  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (obsType === 'individuelle' && !obsStudentId) {
      toast.error('Veuillez sélectionner un élève ou basculer en observation collective');
      return;
    }
    setSubmitting(true);
    try {
      const targetId = obsType === 'collective' ? 'collective' : obsStudentId;
      const res = await fetch(`/api/students/${targetId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          date: obsDate,
          observation_type: obsType,
          participation: obsParticipation,
          comprehension: obsComprehension,
          comportements: obsComportements,
          difficulte: obsDifficulte,
          action_pedagogique: obsAction,
          notion: obsNotion.trim() || activeSessionNotion,
          matiere: cls?.matiere,
          niveau: cls?.niveau,
          cause_possible: obsCause,
          prochaine_seance: obsProchaine,
          observation_text: obsText.trim(),
          needs_help: obsComprehension === 'difficulte_importante',
          help_topic: obsComprehension === 'difficulte_importante' ? (obsNotion.trim() || activeSessionNotion) : undefined,
          help_urgency: 'moyen',
        }),
      });

      if (!res.ok) throw new Error('Échec enregistrement observation');
      const data = await res.json();
      toast.success('Observation pédagogique consignée avec succès !');
      setShowAddObsModal(false);
      setObsText('');
      setObsNotion('');
      setObservations(prev => [data.observation, ...prev]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit 30-60s Quick Session Feedback
  const handleSaveSessionFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/students/session-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: classId,
          date: feedbackDate,
          matiere: cls?.matiere || '',
          niveau: cls?.niveau || '',
          lecon: feedbackLecon.trim() || activeSessionNotion,
          objectif_atteint: feedbackObjectif,
          participation_globale: feedbackPart,
          comprehension_globale: feedbackComp,
          difficulte_principale: feedbackDiff.trim(),
          eleves_a_revoir: feedbackElevesRevoir,
          a_reprendre: feedbackReprendre.trim(),
          note_libre: feedbackNote.trim(),
        }),
      });

      if (!res.ok) throw new Error('Échec enregistrement du bilan');
      const data = await res.json();
      toast.success('Bilan de séance enregistré en 45 secondes !');
      setShowSessionFeedbackModal(false);
      setSessionFeedbacks(prev => [data.feedback, ...prev]);
      setFeedbackDiff('');
      setFeedbackReprendre('');
      setFeedbackNote('');
      setFeedbackElevesRevoir([]);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Save Attendance
  const handleSaveAttendance = async () => {
    if (!attendanceDate) {
      toast.error('Veuillez sélectionner une date');
      return;
    }
    setSubmitting(true);
    try {
      const records = Object.entries(attendanceState).map(([student_id, att]) => ({
        class_id: classId,
        student_id,
        date: attendanceDate,
        session_title: attendanceSessionTitle.trim() || undefined,
        type: att.type,
        is_justified: att.is_justified,
        notes: att.notes,
      }));

      const res = await fetch(`/api/students/${students[0]?.id || 'batch'}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      });

      if (!res.ok) throw new Error('Échec enregistrement présences');
      toast.success("Feuille d'appel enregistrée avec succès");
      await loadClassData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Batch Save Grades
  const handleSaveGradesBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradeTitle.trim()) {
      toast.error("Veuillez saisir l'intitulé de l'évaluation");
      return;
    }

    setSubmitting(true);
    try {
      const entries = Object.entries(studentGradeInputs).filter(([_, val]) => val !== '' && !isNaN(Number(val)));
      if (entries.length === 0) {
        toast.error('Veuillez saisir au moins une note');
        setSubmitting(false);
        return;
      }

      let count = 0;
      for (const [student_id, scoreStr] of entries) {
        await fetch(`/api/students/${student_id}/grades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            class_id: classId,
            title: gradeTitle.trim(),
            eval_type: gradeEvalType,
            score: Number(scoreStr),
            max_score: gradeMaxScore,
            coeff: gradeCoeff,
            date: gradeDate,
          }),
        });
        count++;
      }

      toast.success(`${count} note(s) enregistrée(s) avec succès`);
      setShowAddGradeModal(false);
      setGradeTitle('');
      setStudentGradeInputs({});
      await loadClassData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Students in Roster
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
      const nameMatch = `${s.first_name} ${s.last_name}`.toLowerCase().includes(rosterSearch.toLowerCase()) ||
        s.cne_massar.toLowerCase().includes(rosterSearch.toLowerCase());
      const tarlMatch = rosterTarlFilter === 'ALL' || s.tarl_status === rosterTarlFilter;
      return nameMatch && tarlMatch;
    });
  }, [students, rosterSearch, rosterTarlFilter]);

  // Class Average
  const classAvg = useMemo(() => {
    const studentsWithGrades = students.filter(s => s.average_grade != null);
    if (studentsWithGrades.length === 0) return null;
    const sum = studentsWithGrades.reduce((acc, s) => acc + (s.average_grade || 0), 0);
    return (sum / studentsWithGrades.length).toFixed(1);
  }, [students]);

  // Priority help count
  const priorityHelpCount = useMemo(() => {
    return students.filter(s => s.tarl_status === 'soutien_prioritaire' || (s.needs_help_count || 0) > 0).length;
  }, [students]);

  // Notion Mastery Statistics
  const notionsMastery = useMemo(() => {
    const map: Record<string, { maitrise: number; avecAide: number; difficulte: number; total: number }> = {};
    for (const o of observations) {
      const notionKey = o.notion?.trim();
      if (!notionKey) continue;
      if (!map[notionKey]) {
        map[notionKey] = { maitrise: 0, avecAide: 0, difficulte: 0, total: 0 };
      }
      map[notionKey].total++;
      if (o.comprehension === 'maitrise') map[notionKey].maitrise++;
      else if (o.comprehension === 'comprend_avec_aide') map[notionKey].avecAide++;
      else map[notionKey].difficulte++;
    }
    return map;
  }, [observations]);

  if (loading || !cls) {
    return (
      <div className="p-16 text-center text-muted flex flex-col items-center justify-center gap-2">
        <Loader2 size={28} className="animate-spin text-teal" />
        <span className="text-xs">Chargement de la classe...</span>
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="space-y-6 pb-12">
        {/* Header Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link
            href="/students"
            className="p-2 rounded-xl bg-white border border-border text-slate-600 hover:text-navy hover:border-teal transition-all shadow-xs"
            title="Retour aux classes"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold text-navy">
                {cls.niveau} &mdash; {cls.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-teal/10 text-teal-dark border border-teal/20">
                {cls.niveau}
              </span>
              {cls.room && (
                <span className="text-xs text-muted font-mono bg-slate-100 px-2 py-0.5 rounded">
                  {cls.room}
                </span>
              )}
              <span className="text-xs font-mono text-slate-400">
                &middot; {cls.matiere} &middot; Année {cls.season_code}
              </span>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 pt-1">
              <span><strong>{students.length}</strong> élève(s)</span>
              <span>&middot;</span>
              <span>Moyenne de classe : <strong className="text-navy">{classAvg ? `${classAvg} / 20` : 'En attente'}</strong></span>
              <span>&middot;</span>
              <span>Élèves à soutenir (TaRL) : <strong className={priorityHelpCount > 0 ? 'text-rose-600' : 'text-emerald-600'}>{priorityHelpCount}</strong></span>
            </div>
          </div>

          {/* Top Actions */}
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowSessionFeedbackModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm"
              title="Formulaire rapide 30-60 secondes post-cours"
            >
              <Clock size={14} className="mr-1.5" />
              ⏱️ Bilan Rapide (30s)
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddObsModal(true)}
              variant="secondary"
              className="text-xs border-teal/30 hover:bg-teal/5 text-teal-dark font-semibold"
            >
              <Plus size={14} className="mr-1.5 text-teal" />
              + Observation Pédagogique
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddStudentModal(true)}
              className="bg-teal hover:bg-teal-dark text-white text-xs font-bold shadow-sm"
            >
              <Plus size={15} className="mr-1" />
              Ajouter Élève
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-white rounded-xl p-1 shadow-sm gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('roster')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'roster'
                ? 'bg-navy text-parchment shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Users size={14} />
            <span>Trombinoscope & Saisie Rapide ({students.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('attendance')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'bg-navy text-parchment shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar size={14} />
            <span>Feuille d&apos;Appel / Présences</span>
          </button>
          <button
            onClick={() => setActiveTab('grades')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'grades'
                ? 'bg-navy text-parchment shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Award size={14} />
            <span>Carnet de Notes ({grades.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('observations')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'observations'
                ? 'bg-navy text-parchment shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BookOpen size={14} />
            <span>Observations Pédagogiques ({observations.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('feedbacks')}
            className={`px-4 py-2.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'feedbacks'
                ? 'bg-navy text-parchment shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock size={14} />
            <span>Bilans de Séances ({sessionFeedbacks.length})</span>
          </button>
        </div>

        {/* ─── TAB 1 : ROSTER & 1-TAP QUICK OBSERVATIONS ─── */}
        {activeTab === 'roster' && (
          <div className="space-y-4">
            {/* Quick Notion Context Bar */}
            <div className="bg-gradient-to-r from-teal-50/70 via-white to-parchment/40 p-3.5 rounded-xl border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-teal shrink-0" />
                <span className="text-xs font-bold text-navy">Notion travaillée lors de cette séance :</span>
                <input
                  type="text"
                  value={activeSessionNotion}
                  onChange={(e) => setActiveSessionNotion(e.target.value)}
                  placeholder="Ex: Les boucles for, Les conditions, Tableaux..."
                  className="px-2.5 py-1 rounded-lg border border-teal/30 text-xs font-medium text-navy bg-white focus:outline-teal w-64"
                />
              </div>
              <p className="text-[11px] text-muted">
                ⚡ <strong>1 clic par élève :</strong> pointez immédiatement la compréhension sans interrompre votre cours !
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-border">
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
                {(['ALL', 'standard', 'soutien_prioritaire', 'consolidation', 'depassement'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setRosterTarlFilter(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors ${
                      rosterTarlFilter === st
                        ? 'bg-teal text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'ALL' ? 'Tous les statuts' : TARL_STATUS_CONFIG[st as TarlStatus]?.label || st}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-60">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  placeholder="Nom ou Code Massar..."
                  className="pl-8 text-xs h-8"
                />
              </div>
            </div>

            {/* Students Grid with 1-Tap Quick Action */}
            {filteredStudents.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-border space-y-3">
                <Users size={28} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-500">Aucun élève trouvé.</p>
                <Button size="sm" onClick={() => setShowAddStudentModal(true)} className="bg-teal text-white text-xs">
                  Ajouter un premier élève
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredStudents.map((s: Student) => {
                  const tarlConfig = TARL_STATUS_CONFIG[s.tarl_status] || TARL_STATUS_CONFIG.standard;
                  const lastCompConfig = s.last_comprehension ? COMPREHENSION_CONFIG[s.last_comprehension] : null;

                  return (
                    <div
                      key={s.id}
                      className="bg-white rounded-xl border border-border p-4 hover:border-teal/40 hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <Link href={`/students/${s.id}`} className="flex items-center gap-2.5 hover:opacity-80">
                            <div className="w-10 h-10 rounded-full bg-navy text-parchment font-bold text-xs flex items-center justify-center font-mono shrink-0 group-hover:bg-teal transition-colors">
                              {s.first_name.charAt(0) || 'E'}
                              {s.last_name.charAt(0) || 'L'}
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-navy group-hover:text-teal transition-colors leading-tight">
                                {s.last_name} {s.first_name}
                              </h4>
                              <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                                {s.cne_massar || 'N° ' + (s.student_number || '—')}
                              </p>
                            </div>
                          </Link>

                          {s.average_grade != null && (
                            <span className={`text-xs font-black font-mono px-2 py-0.5 rounded-lg ${
                              s.average_grade >= 14 ? 'bg-emerald-50 text-emerald-700' :
                              s.average_grade >= 10 ? 'bg-blue-50 text-blue-700' :
                              'bg-rose-50 text-rose-700'
                            }`}>
                              {s.average_grade.toFixed(1)}/20
                            </span>
                          )}
                        </div>

                        {/* Badges TaRL & Last Comprehension */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${tarlConfig.badgeClass}`}>
                            {tarlConfig.label}
                          </span>
                          {lastCompConfig && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border flex items-center gap-1 ${lastCompConfig.badgeClass}`}>
                              <span>{lastCompConfig.emoji}</span>
                              <span>{lastCompConfig.label}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* 1-Tap Quick Action Row */}
                      <div className="mt-3.5 pt-3 border-t border-border/60">
                        <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
                          <span className="font-semibold text-slate-700">Pointage rapide :</span>
                          <Link href={`/students/${s.id}`} className="text-teal hover:underline text-[10px] font-medium">
                            Dossier 360° &rarr;
                          </Link>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickObservation(s.id, `${s.first_name} ${s.last_name}`, 'maitrise')}
                            className="px-1.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold transition-all text-center truncate"
                            title="Maîtrise validée"
                          >
                            🟢 Maîtrise
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickObservation(s.id, `${s.first_name} ${s.last_name}`, 'comprend_avec_aide')}
                            className="px-1.5 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold transition-all text-center truncate"
                            title="Comprend avec aide / étayage"
                          >
                            🟡 Avec aide
                          </button>
                          <button
                            type="button"
                            onClick={() => handleQuickObservation(s.id, `${s.first_name} ${s.last_name}`, 'difficulte_importante', 'consigne')}
                            className="px-1.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-[10px] font-bold transition-all text-center truncate"
                            title="Difficulté importante"
                          >
                            🔴 Difficulté
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2 : OBSERVATIONS PÉDAGOGIQUES & NOTIONS ─── */}
        {activeTab === 'observations' && (
          <div className="space-y-6">
            {/* Notion Mastery Widget */}
            {Object.keys(notionsMastery).length > 0 && (
              <div className="bg-white p-4 rounded-xl border border-border shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen size={15} className="text-teal" />
                    Bilan d&apos;Appropriation par Notion Didactique
                  </h3>
                  <span className="text-[11px] text-muted">{Object.keys(notionsMastery).length} notion(s) suivie(s)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(notionsMastery).map(([notion, stats]) => (
                    <div key={notion} className="p-3 rounded-xl border border-border bg-slate-50/50 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-xs font-bold text-navy truncate" title={notion}>
                          📚 {notion}
                        </span>
                        <span className="text-[10px] font-mono text-muted bg-white px-1.5 py-0.5 rounded border">
                          {stats.total} obs.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                          🟢 {stats.maitrise}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                          🟡 {stats.avecAide}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold">
                          🔴 {stats.difficulte}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top Toolbar */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy">Registre des Observations de Classe (5 Dimensions APC)</h3>
                <p className="text-xs text-slate-500">Participation, Compréhension, Difficulté didactique et Action d&apos;étayage réalisée.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddObsModal(true)}
                className="bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-sm"
              >
                <Plus size={14} className="mr-1" />
                Nouvelle Observation
              </Button>
            </div>

            {/* Observations List */}
            {observations.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-border space-y-3">
                <BookOpen size={28} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-500">Aucune observation pédagogique enregistrée pour cette classe.</p>
                <Button size="sm" onClick={() => setShowAddObsModal(true)} className="bg-teal text-white text-xs">
                  Noter la première observation
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {observations.map((o) => {
                  const compConfig = o.comprehension ? COMPREHENSION_CONFIG[o.comprehension] : null;
                  const diffConfig = o.difficulte && o.difficulte !== 'aucune' ? DIFFICULTE_CONFIG[o.difficulte] : null;
                  const actionConfig = o.action_pedagogique && o.action_pedagogique !== 'aucune' ? ACTION_PEDAGOGIQUE_CONFIG[o.action_pedagogique] : null;
                  const partConfig = o.participation ? PARTICIPATION_CONFIG[o.participation] : null;
                  const isCollective = o.observation_type === 'collective' || !o.student_id;

                  return (
                    <div key={o.id} className={`bg-white p-4 rounded-xl border shadow-xs transition-all ${
                      isCollective ? 'border-indigo-200 bg-indigo-50/10' : 'border-border'
                    }`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-2 mb-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`font-bold text-xs ${isCollective ? 'text-indigo-900' : 'text-navy'}`}>
                            {isCollective ? '👥 Classe Entière (Collective)' : o.student_name}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">&middot; {o.date}</span>
                          {o.notion && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-dark border border-teal-200">
                              📚 {o.notion}
                            </span>
                          )}
                          {compConfig && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${compConfig.badgeClass}`}>
                              {compConfig.emoji} {compConfig.label}
                            </span>
                          )}
                        </div>

                        {o.student_id && (
                          <Link
                            href={`/students/${o.student_id}`}
                            className="text-xs text-teal hover:underline font-semibold"
                          >
                            Dossier 360° &rarr;
                          </Link>
                        )}
                      </div>

                      {/* 5 Dimensions Details */}
                      <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
                        {partConfig && (
                          <span className="text-[11px] text-slate-600">
                            Participation : <strong className="text-navy">{partConfig.label.split('(')[0]}</strong>
                          </span>
                        )}
                        {diffConfig && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${diffConfig.badgeClass}`}>
                            Obstacle : {diffConfig.label}
                          </span>
                        )}
                        {actionConfig && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${actionConfig.badgeClass}`}>
                            Action : {actionConfig.label}
                          </span>
                        )}
                      </div>

                      {/* Free observation text */}
                      {o.observation_text && (
                        <p className="text-xs text-slate-700 bg-slate-50/70 p-2.5 rounded-lg border border-border/40 leading-relaxed">
                          {o.observation_text}
                        </p>
                      )}

                      {/* Cause & Next steps */}
                      {(o.cause_possible && o.cause_possible !== 'a_determiner') && (
                        <div className="mt-2 text-[11px] text-slate-600">
                          <strong>Cause didactique identifiée :</strong> {CAUSE_PEDAGOGIQUE_CONFIG[o.cause_possible]?.label}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3 : BILANS RAPIDES DE SÉANCES (30-60s) ─── */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy">Historique des Bilans de Séance (30-60s)</h3>
                <p className="text-xs text-slate-500">Synthèses rapides après chaque cours pour adapter la prochaine séance.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowSessionFeedbackModal(true)}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm"
              >
                <Plus size={14} className="mr-1" />
                Nouveau Bilan Post-Séance
              </Button>
            </div>

            {sessionFeedbacks.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-border space-y-3">
                <Clock size={28} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-500">Aucun bilan de séance enregistré.</p>
                <Button size="sm" onClick={() => setShowSessionFeedbackModal(true)} className="bg-amber-600 text-white text-xs">
                  Remplir mon premier bilan en 45 secondes
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {sessionFeedbacks.map((f) => (
                  <div key={f.id} className="bg-white p-4 rounded-xl border border-border shadow-xs space-y-2.5">
                    <div className="flex items-center justify-between border-b border-border pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-navy">
                          Séance : {f.lecon || 'Notion générale'}
                        </span>
                        <span className="text-[11px] font-mono text-muted">&middot; {f.date}</span>
                      </div>
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        f.objectif_atteint === 'oui' ? 'bg-emerald-100 text-emerald-800' :
                        f.objectif_atteint === 'partiellement' ? 'bg-amber-100 text-amber-800' :
                        'bg-rose-100 text-rose-800'
                      }`}>
                        Objectif : {f.objectif_atteint}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 rounded-lg bg-slate-50 border border-border">
                        <span className="text-[10px] text-muted block">Participation</span>
                        <strong className="text-navy capitalize">{f.participation_globale}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-border">
                        <span className="text-[10px] text-muted block">Compréhension</span>
                        <strong className="text-navy capitalize">{f.comprehension_globale}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border border-border sm:col-span-2">
                        <span className="text-[10px] text-muted block">Difficulté principale</span>
                        <strong className="text-rose-700">{f.difficulte_principale || 'Aucune'}</strong>
                      </div>
                    </div>

                    {f.a_reprendre && (
                      <div className="text-xs text-slate-700">
                        🔄 <strong>À reprendre à la prochaine séance :</strong> {f.a_reprendre}
                      </div>
                    )}

                    {f.note_libre && (
                      <p className="text-xs text-slate-600 italic bg-parchment/30 p-2 rounded-lg border border-parchment-dark">
                        « {f.note_libre} »
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 4 : ATTENDANCE SHEET ─── */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-border flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div>
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Date de la séance</label>
                  <input
                    type="date"
                    value={attendanceDate}
                    onChange={(e) => setAttendanceDate(e.target.value)}
                    className="h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs font-mono"
                  />
                </div>
                <div className="flex-1 sm:w-64">
                  <label className="text-[11px] font-bold text-slate-500 block mb-1">Titre de séance (optionnel)</label>
                  <Input
                    value={attendanceSessionTitle}
                    onChange={(e) => setAttendanceSessionTitle(e.target.value)}
                    placeholder="Ex: TP Scratch 1..."
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  size="sm"
                  onClick={handleSaveAttendance}
                  disabled={submitting}
                  className="bg-teal hover:bg-teal-dark text-white text-xs font-bold shadow-sm"
                >
                  <Save size={14} className="mr-1" />
                  {submitting ? 'Enregistrement...' : "Valider l'appel"}
                </Button>
              </div>
            </div>

            {/* Attendance Table */}
            <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-border text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Élève</th>
                    <th className="p-3 text-center">Présence</th>
                    <th className="p-3 text-center">Absence</th>
                    <th className="p-3 text-center">Retard</th>
                    <th className="p-3 text-center">Justifié</th>
                    <th className="p-3">Remarques</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {students.map((s) => {
                    const current = attendanceState[s.id] || { type: 'presence', is_justified: false, notes: '' };
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 font-semibold text-navy">
                          {s.last_name} {s.first_name}
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="radio"
                            name={`att_${s.id}`}
                            checked={current.type === 'presence'}
                            onChange={() => setAttendanceState(prev => ({
                              ...prev,
                              [s.id]: { ...current, type: 'presence' }
                            }))}
                            className="text-teal focus:ring-teal"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="radio"
                            name={`att_${s.id}`}
                            checked={current.type === 'absence'}
                            onChange={() => setAttendanceState(prev => ({
                              ...prev,
                              [s.id]: { ...current, type: 'absence' }
                            }))}
                            className="text-rose-600 focus:ring-rose-500"
                          />
                        </td>
                        <td className="p-3 text-center">
                          <input
                            type="radio"
                            name={`att_${s.id}`}
                            checked={current.type === 'retard'}
                            onChange={() => setAttendanceState(prev => ({
                              ...prev,
                              [s.id]: { ...current, type: 'retard' }
                            }))}
                            className="text-amber-500 focus:ring-amber-400"
                          />
                        </td>
                        <td className="p-3 text-center">
                          {current.type !== 'presence' && (
                            <input
                              type="checkbox"
                              checked={current.is_justified}
                              onChange={(e) => setAttendanceState(prev => ({
                                ...prev,
                                [s.id]: { ...current, is_justified: e.target.checked }
                              }))}
                              className="rounded text-teal focus:ring-teal"
                            />
                          )}
                        </td>
                        <td className="p-3">
                          <input
                            type="text"
                            value={current.notes}
                            onChange={(e) => setAttendanceState(prev => ({
                              ...prev,
                              [s.id]: { ...current, notes: e.target.value }
                            }))}
                            placeholder="Motif..."
                            className="w-full h-7 px-2 border border-border rounded bg-transparent text-xs"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 5 : GRADEBOOK ─── */}
        {activeTab === 'grades' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-navy">Carnet d&apos;Évaluations (Barème MEN / 20)</h3>
                <p className="text-xs text-slate-500">Saisie collective par contrôle continu, devoir ou travaux pratiques.</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowAddGradeModal(true)}
                className="bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-sm"
              >
                <Plus size={14} className="mr-1" />
                Saisir une Évaluation pour la Classe
              </Button>
            </div>

            {grades.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-border space-y-3">
                <Award size={28} className="mx-auto text-slate-400" />
                <p className="text-xs text-slate-500">Aucune note enregistrée pour cette classe.</p>
                <Button size="sm" onClick={() => setShowAddGradeModal(true)} className="bg-teal text-white text-xs">
                  Saisir le premier contrôle
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-border overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-border text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="p-3">Date</th>
                      <th className="p-3">Élève</th>
                      <th className="p-3">Évaluation</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {grades.map((g) => (
                      <tr key={g.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-mono text-slate-400">{g.date}</td>
                        <td className="p-3 font-semibold text-navy">{g.student_name}</td>
                        <td className="p-3 font-medium">{g.title}</td>
                        <td className="p-3">
                          <span className="capitalize px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {g.eval_type}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="font-bold text-sm text-navy">{g.score}</span>
                          <span className="text-[10px] text-muted"> / {g.max_score}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ─── MODAL : 30-60s QUICK SESSION FEEDBACK ─── */}
        {mounted && showSessionFeedbackModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowSessionFeedbackModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="bg-amber-600 text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-800 shrink-0">
                <div>
                  <h3 className="font-bold text-sm flex items-center gap-1.5">
                    <Clock size={16} />
                    Bilan Rapide de Séance (45 secondes)
                  </h3>
                  <p className="text-[11px] text-amber-100 mt-0.5">
                    Capture l&apos;essentiel pour adapter votre prochaine préparation de cours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSessionFeedbackModal(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-amber-700/50 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveSessionFeedback} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Date</label>
                      <input
                        type="date"
                        value={feedbackDate}
                        onChange={(e) => setFeedbackDate(e.target.value)}
                        required
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Leçon enseignée</label>
                      <input
                        type="text"
                        value={feedbackLecon}
                        onChange={(e) => setFeedbackLecon(e.target.value)}
                        placeholder="Ex: Les conditions"
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs"
                      />
                    </div>
                  </div>

                  {/* 3 Quick Radios */}
                  <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 rounded-xl border border-border">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">🎯 Objectif ?</label>
                      <select
                        value={feedbackObjectif}
                        onChange={(e) => setFeedbackObjectif(e.target.value as any)}
                        className="w-full h-8 border rounded-lg px-1 text-xs bg-white"
                      >
                        <option value="oui">Oui ✓</option>
                        <option value="partiellement">Partiel ~</option>
                        <option value="non">Non ✗</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">👥 Participation</label>
                      <select
                        value={feedbackPart}
                        onChange={(e) => setFeedbackPart(e.target.value as any)}
                        className="w-full h-8 border rounded-lg px-1 text-xs bg-white"
                      >
                        <option value="bonne">Bonne</option>
                        <option value="moyenne">Moyenne</option>
                        <option value="faible">Faible</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">📚 Compréhension</label>
                      <select
                        value={feedbackComp}
                        onChange={(e) => setFeedbackComp(e.target.value as any)}
                        className="w-full h-8 border rounded-lg px-1 text-xs bg-white"
                      >
                        <option value="bonne">Bonne</option>
                        <option value="heterogene">Hétérogène</option>
                        <option value="faible">Faible</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">⚠️ Difficulté principale constatée</label>
                    <input
                      type="text"
                      value={feedbackDiff}
                      onChange={(e) => setFeedbackDiff(e.target.value)}
                      placeholder="Ex: Compréhension de la consigne, Abstraction..."
                      className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">🔄 À reprendre impérativement à la séance suivante</label>
                    <input
                      type="text"
                      value={feedbackReprendre}
                      onChange={(e) => setFeedbackReprendre(e.target.value)}
                      placeholder="Ex: Exemple concret avec bloc Si... Sinon"
                      className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">📝 Note réflexive libre</label>
                    <textarea
                      value={feedbackNote}
                      onChange={(e) => setFeedbackNote(e.target.value)}
                      rows={2}
                      placeholder="Ce qui a bien fonctionné, ajustement du timing..."
                      className="w-full border border-border rounded-lg p-2 bg-slate-50 text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-slate-50/50 shrink-0">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowSessionFeedbackModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting} className="bg-amber-600 hover:bg-amber-700 text-white font-bold">
                    {submitting ? 'Enregistrement...' : 'Enregistrer le Bilan'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ─── MODAL : OBSERVATION PÉDAGOGIQUE COMPLÈTE (5 DIMENSIONS) ─── */}
        {mounted && showAddObsModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddObsModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="bg-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-teal shrink-0">
                <div>
                  <h3 className="font-bold text-sm">Observation Didactique en Situation d&apos;Apprentissage</h3>
                  <p className="text-[11px] text-teal-light mt-0.5">Faits observables en classe (Observation ≠ Diagnostic psychologique)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddObsModal(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddObservation} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  {/* Switcher : Individuel vs Collectif */}
                  <div className="flex rounded-xl bg-slate-100 p-1 border border-border">
                    <button
                      type="button"
                      onClick={() => setObsType('individuelle')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        obsType === 'individuelle' ? 'bg-white text-navy shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      👤 Observation Individuelle
                    </button>
                    <button
                      type="button"
                      onClick={() => setObsType('collective')}
                      className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all ${
                        obsType === 'collective' ? 'bg-white text-indigo-900 shadow-xs' : 'text-slate-500'
                      }`}
                    >
                      👥 Observation Collective (Classe entière)
                    </button>
                  </div>

                  {obsType === 'individuelle' && (
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Élève concerné</label>
                      <select
                        value={obsStudentId}
                        onChange={(e) => setObsStudentId(e.target.value)}
                        required
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs font-medium"
                      >
                        <option value="">-- Choisir un élève --</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.last_name} {s.first_name} ({s.cne_massar || 'N° ' + s.student_number})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Date</label>
                      <input
                        type="date"
                        value={obsDate}
                        onChange={(e) => setObsDate(e.target.value)}
                        required
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Notion didactique observée</label>
                      <input
                        type="text"
                        value={obsNotion}
                        onChange={(e) => setObsNotion(e.target.value)}
                        placeholder="Ex: Boucle for, Variable..."
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs"
                      />
                    </div>
                  </div>

                  {/* Dimension B : Compréhension */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">B. Compréhension de la notion</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                      {(Object.entries(COMPREHENSION_CONFIG) as [ComprehensionDimension, any][]).map(([key, info]) => (
                        <button
                          type="button"
                          key={key}
                          onClick={() => setObsComprehension(key)}
                          className={`p-2 rounded-lg border text-left flex items-center gap-1.5 transition-all text-[11px] ${
                            obsComprehension === key
                              ? 'border-teal bg-teal/10 font-bold text-teal-dark shadow-xs'
                              : 'border-border bg-slate-50 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          <span>{info.emoji}</span>
                          <span className="truncate">{info.label.split('/')[0]}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dimension A : Participation */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">A. Niveau de Participation</label>
                    <div className="grid grid-cols-5 gap-1.5">
                      {(Object.keys(PARTICIPATION_CONFIG) as ParticipationDimension[]).map(p => (
                        <button
                          type="button"
                          key={p}
                          onClick={() => setObsParticipation(p)}
                          className={`p-1.5 rounded-lg border text-center text-[10px] font-bold capitalize transition-all ${
                            obsParticipation === p ? 'bg-navy text-white' : 'bg-slate-50 text-slate-600'
                          }`}
                        >
                          {p.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dimension D & E : Difficulté & Action */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">D. Difficulté rencontrée</label>
                      <select
                        value={obsDifficulte}
                        onChange={(e) => setObsDifficulte(e.target.value as any)}
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs"
                      >
                        {(Object.entries(DIFFICULTE_CONFIG) as [DifficultesRencontrees, any][]).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">E. Action pédagogique immédiate</label>
                      <select
                        value={obsAction}
                        onChange={(e) => setObsAction(e.target.value as any)}
                        className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs"
                      >
                        {(Object.entries(ACTION_PEDAGOGIQUE_CONFIG) as [ActionPedagogique, any][]).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Dimension C : Comportements en situation d'apprentissage */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">C. Comportement en situation d&apos;apprentissage</label>
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(COMPORTEMENT_CONFIG) as [ComportementApprentissage, any][]).map(([k, v]) => {
                        const isSel = obsComportements.includes(k);
                        return (
                          <button
                            type="button"
                            key={k}
                            onClick={() => {
                              setObsComportements(prev => 
                                isSel ? prev.filter(x => x !== k) : [...prev, k]
                              );
                            }}
                            className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${
                              isSel ? 'bg-teal text-white border-teal' : 'bg-slate-100 text-slate-600 border-border hover:bg-slate-200'
                            }`}
                          >
                            {v.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Hypothèse didactique & À faire prochaine séance */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-lg bg-slate-50 border border-border">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Cause pédagogique probable</label>
                      <select
                        value={obsCause}
                        onChange={(e) => setObsCause(e.target.value as CausePedagogique)}
                        className="w-full h-8 border border-border rounded-lg px-2 bg-white text-xs"
                      >
                        {Object.entries(CAUSE_PEDAGOGIQUE_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>{cfg.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">À faire prochaine séance</label>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(PROCHAINE_SEANCE_CONFIG).map(([k, cfg]) => {
                          const key = k as ProchaineSeanceAction;
                          const isSel = obsProchaine.includes(key);
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => {
                                setObsProchaine(prev =>
                                  isSel ? prev.filter(x => x !== key) : [...prev, key]
                                );
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] border transition-all ${
                                isSel ? 'bg-teal text-white border-teal font-medium' : 'bg-white text-slate-700 border-border'
                              }`}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Free Text */}
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Observation qualitative libre (faits observables)</label>
                    <textarea
                      value={obsText}
                      onChange={(e) => setObsText(e.target.value)}
                      rows={2}
                      placeholder="Ex: Reste silencieux lors de l'énoncé, mais réussit l'algorithme une fois la consigne reformulée en binôme..."
                      className="w-full border border-border rounded-lg p-2.5 bg-slate-50 text-xs focus:bg-white"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-slate-50/50 shrink-0">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddObsModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting} className="bg-teal hover:bg-teal-dark text-white font-bold">
                    {submitting ? 'Enregistrement...' : 'Consigner Observation'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ─── MODAL : ADD STUDENT ─── */}
        {mounted && showAddStudentModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddStudentModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="bg-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-teal shrink-0">
                <h3 className="font-bold text-sm">Ajouter un Élève dans {cls?.name || 'la classe'}</h3>
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleAddStudent} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-3.5 text-xs overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Prénom *</label>
                      <Input value={newStudentFirst} onChange={(e) => setNewStudentFirst(e.target.value)} required className="h-8 text-xs" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Nom *</label>
                      <Input value={newStudentLast} onChange={(e) => setNewStudentLast(e.target.value)} required className="h-8 text-xs" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Code Massar (CNE)</label>
                      <Input value={newStudentCne} onChange={(e) => setNewStudentCne(e.target.value)} placeholder="Ex: G1300..." className="h-8 text-xs font-mono" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Genre</label>
                      <select value={newStudentGender} onChange={(e) => setNewStudentGender(e.target.value as 'M' | 'F')} className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs">
                        <option value="M">Garçon (M)</option>
                        <option value="F">Fille (F)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Statut Initial TaRL</label>
                    <select value={newStudentTarl} onChange={(e) => setNewStudentTarl(e.target.value as TarlStatus)} className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs">
                      <option value="standard">Standard (Attendus du cycle)</option>
                      <option value="soutien_prioritaire">Soutien Prioritaire (TaRL A)</option>
                      <option value="consolidation">Consolidation (TaRL B)</option>
                      <option value="depassement">Défi / Avancé (TaRL C)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-slate-50/50 shrink-0">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddStudentModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting} className="bg-teal hover:bg-teal-dark text-white font-bold">
                    {submitting ? 'Création...' : 'Ajouter'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* ─── MODAL : BATCH GRADE ENTRY ─── */}
        {mounted && showAddGradeModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAddGradeModal(false); }}
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="bg-navy text-white px-6 py-4 flex items-center justify-between border-b-2 border-teal shrink-0">
                <h3 className="font-bold text-sm">Saisie des Notes pour la Classe</h3>
                <button
                  type="button"
                  onClick={() => setShowAddGradeModal(false)}
                  className="text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveGradesBatch} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Intitulé de l&apos;Évaluation</label>
                    <Input value={gradeTitle} onChange={(e) => setGradeTitle(e.target.value)} placeholder="Ex: Contrôle Continu N°1, TP Tableur..." required className="h-8 text-xs" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Type</label>
                      <select value={gradeEvalType} onChange={(e) => setGradeEvalType(e.target.value as any)} className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs">
                        <option value="controle">Contrôle Continu</option>
                        <option value="devoir">Devoir Maison</option>
                        <option value="activite_pratique">TP / Activité Pratique</option>
                        <option value="oral">Oral / Participation</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-bold text-slate-700 block mb-1">Date</label>
                      <input type="date" value={gradeDate} onChange={(e) => setGradeDate(e.target.value)} className="w-full h-8 border border-border rounded-lg px-2 bg-slate-50 text-xs font-mono" />
                    </div>
                  </div>

                  {/* Score inputs per student */}
                  <div className="border border-border rounded-xl overflow-hidden mt-3 max-h-60 overflow-y-auto divide-y divide-border">
                    <div className="bg-slate-100 p-2 font-bold text-slate-700 text-[11px] flex justify-between">
                      <span>Élève</span>
                      <span>Note / 20</span>
                    </div>
                    {students.map((s) => (
                      <div key={s.id} className="p-2 flex items-center justify-between hover:bg-slate-50">
                        <span className="font-semibold text-navy">{s.last_name} {s.first_name}</span>
                        <input
                          type="number"
                          step="0.25"
                          min="0"
                          max="20"
                          value={studentGradeInputs[s.id] || ''}
                          onChange={(e) => setStudentGradeInputs(prev => ({ ...prev, [s.id]: e.target.value }))}
                          placeholder="-- / 20"
                          className="w-20 text-center font-mono font-bold border border-border rounded p-1 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-slate-50/50 shrink-0">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowAddGradeModal(false)}>
                    Annuler
                  </Button>
                  <Button type="submit" size="sm" disabled={submitting} className="bg-teal hover:bg-teal-dark text-white font-bold">
                    {submitting ? 'Enregistrement...' : 'Enregistrer les Notes'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      </div>
    </PageTransition>
  );
}
