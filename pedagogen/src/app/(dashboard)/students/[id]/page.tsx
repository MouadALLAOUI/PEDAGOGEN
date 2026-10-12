'use client';

import { useState, useEffect, use } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  Clock,
  Award,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HeartHandshake,
  Phone,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  RefreshCw,
  X,
  Smile,
  ShieldAlert,
  Lightbulb,
  BookOpen,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageTransition } from '@/components/layout/PageTransition';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { StudentEvolutionChart } from '@/components/students/StudentEvolutionChart';
import { cn } from '@/lib/utils/cn';
import toast from 'react-hot-toast';
import type {
  StudentProfile360,
  TarlStatus,
  EvaluationType,
  HelpUrgency,
  HelpStatus,
  ComprehensionDimension,
  ParticipationDimension,
  ComportementApprentissage,
  DifficultesRencontrees,
  ActionPedagogique,
  CausePedagogique,
  ProchaineSeanceAction,
} from '@/types/student';
import {
  MENTAL_STATE_CONFIG,
  TARL_STATUS_CONFIG,
  COMPREHENSION_CONFIG,
  PARTICIPATION_CONFIG,
  COMPORTEMENT_CONFIG,
  DIFFICULTE_CONFIG,
  ACTION_PEDAGOGIQUE_CONFIG,
  CAUSE_PEDAGOGIQUE_CONFIG,
  PROCHAINE_SEANCE_CONFIG,
} from '@/types/student';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function StudentProfilePage({ params }: PageProps) {
  const resolvedParams = use(params);
  const studentId = resolvedParams.id;

  const [profile, setProfile] = useState<StudentProfile360 | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzingAi, setAnalyzingAi] = useState(false);

  // Active Tab: 'ai' | 'observations' | 'grades' | 'attendance' | 'info'
  const [activeTab, setActiveTab] = useState<'ai' | 'observations' | 'grades' | 'attendance' | 'info'>('ai');
  const [expandedQuizId, setExpandedQuizId] = useState<string | null>(null);

  // Modals
  const [mounted, setMounted] = useState(false);
  const [showObsModal, setShowObsModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAnyModalOpen = showObsModal || showGradeModal || showEditModal;

  useEffect(() => {
    if (!isAnyModalOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowObsModal(false);
        setShowGradeModal(false);
        setShowEditModal(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAnyModalOpen]);

  // Add Observation Form
  const [obsDate, setObsDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [obsNotion, setObsNotion] = useState('');
  const [obsComprehension, setObsComprehension] = useState<ComprehensionDimension>('comprend_avec_aide');
  const [obsParticipation, setObsParticipation] = useState<ParticipationDimension>('moyenne');
  const [obsComportements, setObsComportements] = useState<ComportementApprentissage[]>(['concentre']);
  const [obsDifficulte, setObsDifficulte] = useState<DifficultesRencontrees>('aucune');
  const [obsAction, setObsAction] = useState<ActionPedagogique>('aucune');
  const [obsCause, setObsCause] = useState<CausePedagogique>('prerequis_non_maitrise');
  const [obsProchaine, setObsProchaine] = useState<ProchaineSeanceAction[]>(['reprendre_notion']);
  const [obsText, setObsText] = useState('');
  const [obsNeedsHelp, setObsNeedsHelp] = useState(false);
  const [obsTopic, setObsTopic] = useState('');
  const [obsUrgency, setObsUrgency] = useState<HelpUrgency>('moyen');

  // Add Grade Form
  const [gradeTitle, setGradeTitle] = useState('');
  const [gradeType, setGradeType] = useState<EvaluationType>('controle');
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeMaxScore, setGradeMaxScore] = useState<string>('20');
  const [gradeCoeff, setGradeCoeff] = useState<string>('1');
  const [gradeDate, setGradeDate] = useState<string>(new Date().toISOString().split('T')[0] || '');
  const [gradeComment, setGradeComment] = useState('');

  // Edit Student Form
  const [editFirst, setEditFirst] = useState('');
  const [editLast, setEditLast] = useState('');
  const [editCne, setEditCne] = useState('');
  const [editGender, setEditGender] = useState<'M' | 'F'>('M');
  const [editTarl, setEditTarl] = useState<TarlStatus>('standard');
  const [editGuardianName, setEditGuardianName] = useState('');
  const [editGuardianPhone, setEditGuardianPhone] = useState('');
  const [editSpecialNeeds, setEditSpecialNeeds] = useState('');

  // Load Profile
  const loadProfile = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/students/${studentId}`);
      if (!res.ok) throw new Error('Élève non trouvé');
      const data = await res.json();
      setProfile(data.profile);

      // Pre-fill edit modal form
      if (data.profile?.student) {
        const s = data.profile.student;
        setEditFirst(s.first_name);
        setEditLast(s.last_name);
        setEditCne(s.cne_massar || '');
        setEditGender(s.gender || 'M');
        setEditTarl(s.tarl_status || 'standard');
        setEditGuardianName(s.guardian_name || '');
        setEditGuardianPhone(s.guardian_phone || '');
        setEditSpecialNeeds(s.special_needs || '');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du chargement du profil');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [studentId]);

  // Trigger AI Psycho-Pedagogical Analysis
  const handleRunAiAnalysis = async () => {
    try {
      setAnalyzingAi(true);
      toast("Analyse IA psycho-pédagogique en cours...", { icon: '🤖' });
      const res = await fetch('/api/students/ai-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Échec de l'analyse");

      toast.success("Diagnostic didactique IA généré avec succès !");
      await loadProfile();
      setActiveTab('ai');
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse IA");
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Submit Observation
  const handleAddObservation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.student.class_id) {
      toast.error("L'élève n'est rattaché à aucune classe");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch(`/api/students/${studentId}/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: profile.student.class_id,
          date: obsDate,
          observation_type: 'individuelle',
          notion: obsNotion.trim() || undefined,
          comprehension: obsComprehension,
          participation: obsParticipation,
          comportements: obsComportements,
          difficulte: obsDifficulte,
          action_pedagogique: obsAction,
          cause_possible: obsCause,
          prochaine_seance: obsProchaine,
          observation_text: obsText.trim() || undefined,
          needs_help: obsNeedsHelp,
          help_topic: obsNeedsHelp ? (obsTopic.trim() || obsNotion.trim() || undefined) : undefined,
          help_urgency: obsNeedsHelp ? obsUrgency : undefined,
          help_status: obsNeedsHelp ? 'en_cours' : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur enregistrement');

      toast.success('Observation didactique enregistrée avec succès');
      setShowObsModal(false);
      setObsText('');
      setObsNotion('');
      setObsNeedsHelp(false);
      setObsTopic('');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Grade
  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.student.class_id) {
      toast.error("L'élève n'est rattaché à aucune classe");
      return;
    }
    const numScore = parseFloat(gradeScore);
    if (isNaN(numScore)) {
      toast.error('Veuillez saisir une note numérique valide');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch(`/api/students/${studentId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: profile.student.class_id,
          title: gradeTitle,
          eval_type: gradeType,
          score: numScore,
          max_score: parseFloat(gradeMaxScore) || 20,
          coeff: parseFloat(gradeCoeff) || 1,
          date: gradeDate,
          comment: gradeComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur enregistrement');

      toast.success('Évaluation enregistrée');
      setShowGradeModal(false);
      setGradeTitle('');
      setGradeScore('');
      setGradeComment('');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle/Update Help Status
  const handleUpdateHelpStatus = async (obsId: string, newStatus: HelpStatus) => {
    try {
      const res = await fetch(`/api/students/${studentId}/observations`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          observationId: obsId,
          help_status: newStatus,
        }),
      });
      if (!res.ok) throw new Error('Échec mise à jour');
      toast.success('Statut de soutien mis à jour');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Delete Grade
  const handleDeleteGrade = async (gradeId: string) => {
    if (!confirm('Supprimer définitivement cette note ?')) return;
    try {
      const res = await fetch(`/api/students/${studentId}/grades?gradeId=${gradeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Échec de suppression');
      toast.success('Note supprimée');
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Submit Edit Student
  const handleEditStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`/api/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: editFirst.trim(),
          last_name: editLast.trim(),
          cne_massar: editCne.trim(),
          gender: editGender,
          tarl_status: editTarl,
          guardian_name: editGuardianName.trim() || undefined,
          guardian_phone: editGuardianPhone.trim() || undefined,
          special_needs: editSpecialNeeds.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur mise à jour');

      toast.success('Dossier élève mis à jour');
      setShowEditModal(false);
      await loadProfile();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-teal" />
        <p className="text-sm font-medium text-muted">Chargement du dossier 360° de l'élève...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto h-12 w-12 text-amber-500 mb-3" />
        <h2 className="text-xl font-serif text-navy font-bold">Dossier élève introuvable</h2>
        <p className="text-muted mt-1 mb-6">Cet élève n'existe pas ou a été archivé.</p>
        <Link href="/students">
          <Button variant="secondary">
            <ArrowLeft className="h-4 w-4 mr-2" /> Retour à la gestion des élèves
          </Button>
        </Link>
      </div>
    );
  }

  const {
    student,
    class_info,
    season,
    stats,
    insights,
    observations,
    grades,
    attendance,
    pedagogicalPatterns,
    quizResults,
  } = profile;
  const tarlConfig = TARL_STATUS_CONFIG[student.tarl_status] || TARL_STATUS_CONFIG.standard;
  const predominantMoodConfig = stats.predominantMood ? MENTAL_STATE_CONFIG[stats.predominantMood] : null;
  const compConfig = stats.predominantComprehension ? COMPREHENSION_CONFIG[stats.predominantComprehension] : null;
  const latestInsight = insights && insights.length > 0 ? insights[0] : null;

  return (
    <PageTransition>
      <div className="space-y-6 pb-12">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted">
            <Link href="/students" className="hover:text-navy transition-colors">
              Suivi Élèves
            </Link>
            <span>/</span>
            {class_info ? (
              <Link
                href={`/students/classes/${class_info.id}`}
                className="hover:text-navy transition-colors font-medium text-navy"
              >
                {class_info.niveau} - {class_info.name}
              </Link>
            ) : (
              <span>Sans classe</span>
            )}
            <span>/</span>
            <span className="font-semibold text-teal">
              {student.first_name} {student.last_name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEditModal(true)}
              className="text-xs font-medium"
            >
              <Edit2 className="h-3.5 w-3.5 mr-1.5" /> Modifier Fiche
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunAiAnalysis}
              disabled={analyzingAi}
              className="bg-teal hover:bg-teal-dark text-white text-xs font-semibold shadow-sm"
            >
              {analyzingAi ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> Analyse IA en cours...
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-200" /> Diagnostic IA 360°
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Hero Profile Header Card */}
        <Card className="border-parchment-dark bg-white shadow-sm overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-16 h-16 rounded-2xl flex items-center justify-center font-serif text-2xl font-bold text-white shadow-inner ${
                    student.gender === 'F' ? 'bg-rose-500' : 'bg-navy'
                  }`}
                >
                  {student.first_name.charAt(0)}
                  {student.last_name.charAt(0)}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-serif font-bold text-navy">
                      {student.first_name} {student.last_name}
                    </h1>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-parchment-dark text-navy font-mono font-semibold border border-parchment-dark">
                      Massar: {student.cne_massar || 'N/A'}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${tarlConfig.badgeClass}`}
                      title={tarlConfig.description}
                    >
                      {tarlConfig.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted mt-2">
                    {class_info && (
                      <span className="flex items-center gap-1 font-medium text-navy">
                        <GraduationCap className="h-3.5 w-3.5 text-teal" />
                        {class_info.niveau} - {class_info.name} ({class_info.matiere})
                      </span>
                    )}
                    {season && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-muted" />
                        {season.code}
                      </span>
                    )}
                    {student.guardian_phone && (
                      <a
                        href={`tel:${student.guardian_phone}`}
                        className="flex items-center gap-1 text-teal hover:underline font-medium"
                      >
                        <Phone className="h-3.5 w-3.5" />
                        {student.guardian_phone} ({student.guardian_name || 'Tuteur'})
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowObsModal(true)}
                  className="flex-1 md:flex-none border-parchment-dark hover:bg-parchment/40 text-navy text-xs"
                >
                  <Smile className="h-3.5 w-3.5 mr-1.5 text-amber-600" />
                  + Observation
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowGradeModal(true)}
                  className="flex-1 md:flex-none border-parchment-dark hover:bg-parchment/40 text-navy text-xs"
                >
                  <Award className="h-3.5 w-3.5 mr-1.5 text-teal" />
                  + Note / Éval
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 4 KPI Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-parchment-dark bg-white shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted text-xs mb-1">
                <span>Moyenne Générale</span>
                <Award className="h-4 w-4 text-teal" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-serif font-bold ${
                    stats.averageGrade >= 14
                      ? 'text-teal'
                      : stats.averageGrade >= 10
                      ? 'text-navy'
                      : stats.averageGrade > 0
                      ? 'text-rose-600'
                      : 'text-muted'
                  }`}
                >
                  {stats.averageGrade > 0 ? stats.averageGrade.toFixed(2) : '--'}
                </span>
                <span className="text-xs text-muted">/ 20</span>
              </div>
              <p className="text-[11px] text-muted mt-1 font-medium">
                {stats.totalEvaluations} note(s) enregistrée(s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-parchment-dark bg-white shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted text-xs mb-1">
                <span>Assiduité & Ponctualité</span>
                <Clock className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-serif font-bold ${
                    stats.totalAbsences > 3 ? 'text-rose-600' : 'text-navy'
                  }`}
                >
                  {stats.totalAbsences}
                </span>
                <span className="text-xs text-muted">abs. ({stats.totalRetards} ret.)</span>
              </div>
              <p className="text-[11px] text-muted mt-1 font-medium">
                {stats.unjustifiedAbsences > 0 ? (
                  <span className="text-rose-600 font-semibold">
                    {stats.unjustifiedAbsences} non justifiée(s)
                  </span>
                ) : (
                  'Aucune absence injustifiée'
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border-parchment-dark bg-white shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted text-xs mb-1">
                <span>Compréhension & Participation</span>
                <GraduationCap className="h-4 w-4 text-teal" />
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xl">{compConfig?.emoji || (predominantMoodConfig?.emoji || '🟢')}</span>
                <div className="truncate">
                  <p className="text-xs font-semibold text-navy truncate">
                    {compConfig?.label?.split('/')[0] || (predominantMoodConfig?.label || 'Compréhension standard')}
                  </p>
                  <p className="text-[10px] text-muted truncate">
                    Engagement : {pedagogicalPatterns?.participationScore ?? 75}% • {observations.length} obs.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-parchment-dark bg-white shadow-xs">
            <CardContent className="p-4">
              <div className="flex items-center justify-between text-muted text-xs mb-1">
                <span>Besoins de Soutien</span>
                <HeartHandshake className="h-4 w-4 text-rose-500" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-2xl font-serif font-bold ${
                    stats.activeHelpRequests > 0 ? 'text-rose-600' : 'text-teal'
                  }`}
                >
                  {stats.activeHelpRequests}
                </span>
                <span className="text-xs text-muted">demande(s) active(s)</span>
              </div>
              <p className="text-[11px] text-muted mt-1 font-medium">
                {stats.activeHelpRequests > 0 ? (
                  <span className="text-rose-600 font-semibold">Remédiation requise</span>
                ) : (
                  <span className="text-teal">Progression fluide</span>
                )}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-parchment-dark overflow-x-auto gap-2">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'ai'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            <Sparkles className="h-4 w-4 text-amber-500" />
            Conseiller Didactique &amp; APC (IA)
            {latestInsight && (
              <span className="w-2 h-2 rounded-full bg-teal animate-pulse" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('observations')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'observations'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            <BookOpen className="h-4 w-4 text-teal" />
            Observations Pédagogiques ({observations.length})
            {stats.activeHelpRequests > 0 && (
              <span className="px-1.5 py-0.2 text-[10px] rounded-full bg-rose-100 text-rose-700 font-bold">
                {stats.activeHelpRequests}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('grades')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'grades'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            <Award className="h-4 w-4" />
            Relevé de Notes ({grades.length})
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            <Clock className="h-4 w-4" />
            Assiduité & Registre ({attendance.length})
          </button>

          <button
            onClick={() => setActiveTab('info')}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-teal text-teal'
                : 'border-transparent text-muted hover:text-navy'
            }`}
          >
            <User className="h-4 w-4" />
            Informations & Tuteur
          </button>
        </div>

        {/* TAB 1: AI PSYCHO-PEDAGOGICAL ADVISOR */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            {/* Pedagogical Patterns Summary Widget */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ce qui fonctionne pour cet élève */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Ce qui fonctionne pour cet élève (Leviers didactiques)
                  </h4>
                </div>
                {pedagogicalPatterns?.effectiveActions && pedagogicalPatterns.effectiveActions.length > 0 ? (
                  <div className="space-y-1.5">
                    {pedagogicalPatterns.effectiveActions.map((act, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/85 px-3 py-1.5 rounded-lg border border-emerald-200">
                        <span className="font-medium text-emerald-950">✓ {act.label}</span>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          {act.count} séance(s)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">
                    Aucune action efficace spécifique enregistrée pour le moment.
                  </p>
                )}
              </div>

              {/* Points de vigilance & Difficultés récurrentes */}
              <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-2xs">
                <div className="flex items-center gap-2 mb-2.5">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Points de vigilance &amp; Obstacles fréquents
                  </h4>
                </div>
                {pedagogicalPatterns?.frequentDifficulties && pedagogicalPatterns.frequentDifficulties.length > 0 ? (
                  <div className="space-y-1.5">
                    {pedagogicalPatterns.frequentDifficulties.map((diff, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-white/85 px-3 py-1.5 rounded-lg border border-amber-200">
                        <span className="font-medium text-amber-950">⚠ {diff.label}</span>
                        <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                          {diff.count} occurrence(s)
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted italic">
                    Aucune difficulté récurrente persistante identifiée.
                  </p>
                )}
              </div>
            </div>

            {/* Notions observées */}
            {pedagogicalPatterns?.notionsObserved && pedagogicalPatterns.notionsObserved.length > 0 && (
              <div className="rounded-xl border border-parchment-dark bg-white p-4 shadow-2xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-navy mb-3 flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-teal" />
                  Maîtrise observée par Notions du Programme
                </h4>
                <div className="flex flex-wrap gap-2">
                  {pedagogicalPatterns.notionsObserved.map((notionItem, idx) => {
                    const cConfig = COMPREHENSION_CONFIG[notionItem.comprehension] || COMPREHENSION_CONFIG.non_observee;
                    return (
                      <div key={idx} className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs bg-parchment/30 border-parchment-dark">
                        <span className="font-semibold text-navy">{notionItem.notion}</span>
                        <span className="text-muted text-[11px]">({notionItem.count} obs.)</span>
                        <span className={`px-2 py-0.5 text-[10px] rounded-full border ${cConfig.badgeClass}`}>
                          {cConfig.emoji} {cConfig.label.split('/')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <Card className="border-teal/30 bg-gradient-to-br from-white via-teal-50/20 to-parchment/30 shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-parchment-dark pb-4 mb-6">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-teal text-white shadow-xs">
                        <Sparkles className="h-5 w-5" />
                      </div>
                      <h2 className="text-xl font-serif font-bold text-navy">
                        Diagnostic Didactique &amp; Différenciation APC
                      </h2>
                    </div>
                    <p className="text-xs text-muted mt-1">
                      Analyse didactique croisée (maîtrise des notions, régularité, leviers efficaces et préconisations TaRL).
                    </p>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleRunAiAnalysis}
                    disabled={analyzingAi}
                    className="bg-teal hover:bg-teal-dark text-white font-semibold text-xs shadow-xs"
                  >
                    {analyzingAi ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Analyse en cours...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-1.5" /> Re-calculer l'Analyse IA
                      </>
                    )}
                  </Button>
                </div>

                {latestInsight ? (
                  <div className="space-y-6">
                    {/* Summary */}
                    <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-4">
                      <h3 className="text-xs font-bold text-teal-dark uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <Lightbulb className="h-4 w-4 text-teal" />
                        Synthèse Globale de l'Apprenant
                      </h3>
                      <p className="text-sm font-medium text-navy leading-relaxed">
                        {latestInsight.summary}
                      </p>
                      {latestInsight.created_at && (
                        <p className="text-[10px] text-muted mt-2 font-mono">
                          Diagnostic établi le : {new Date(latestInsight.created_at).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>

                    {/* Strengths & Weaknesses 2-Column Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Forces */}
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
                        <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          Forces & Acquis Didactiques
                        </h4>
                        {latestInsight.strengths && latestInsight.strengths.length > 0 ? (
                          <ul className="space-y-2">
                            {latestInsight.strengths.map((s, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                                <span className="text-emerald-600 font-bold mt-0.5">•</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted italic">Données en cours de consolidation.</p>
                        )}
                      </div>

                      {/* Faiblesses / Freins */}
                      <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                        <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          Points de Vigilance & Obstacles
                        </h4>
                        {latestInsight.weaknesses && latestInsight.weaknesses.length > 0 ? (
                          <ul className="space-y-2">
                            {latestInsight.weaknesses.map((w, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-slate-800">
                                <span className="text-amber-600 font-bold mt-0.5">•</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted italic">Aucun point critique majeur identifié.</p>
                        )}
                      </div>
                    </div>

                    {/* Recommandations Pédagogiques & APC */}
                    <div className="rounded-xl border border-navy/10 bg-white p-5 shadow-xs">
                      <h4 className="text-sm font-serif font-bold text-navy mb-3 flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-teal" />
                        Plan d'Action Pédagogique Différencié (Recommandations MEN / APC)
                      </h4>
                      {latestInsight.recommendations && latestInsight.recommendations.length > 0 ? (
                        <div className="space-y-2.5">
                          {latestInsight.recommendations.map((rec, idx) => (
                            <div
                              key={idx}
                              className="flex items-start gap-3 p-3 rounded-lg bg-parchment/40 border border-parchment-dark text-xs text-slate-800"
                            >
                              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal text-white flex items-center justify-center font-bold text-[10px]">
                                {idx + 1}
                              </span>
                              <span className="mt-0.5 leading-relaxed font-medium">{rec}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted italic">Aucune recommandation disponible.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Sparkles className="mx-auto h-12 w-12 text-teal/40 mb-3" />
                    <h3 className="text-base font-serif font-bold text-navy">
                      Aucun diagnostic IA généré pour l'instant
                    </h3>
                    <p className="text-xs text-muted max-w-md mx-auto mt-1 mb-5">
                      Cliquez sur le bouton ci-dessous pour déclencher l'analyse croisée didactique et psycho-comportementale de cet élève.
                    </p>
                    <Button
                      variant="primary"
                      onClick={handleRunAiAnalysis}
                      disabled={analyzingAi}
                      className="bg-teal hover:bg-teal-dark text-white font-semibold"
                    >
                      {analyzingAi ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Analyse en cours...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2 text-amber-200" /> Lancer le premier diagnostic IA
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* TAB 2: OBSERVATIONS & CLIMAT */}
        {activeTab === 'observations' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-navy">
                  Observations Didactiques &amp; Suivi en Classe
                </h3>
                <p className="text-xs text-muted">
                  Événements factuels observés : compréhension, engagement, obstacles didactiques et actions immédiates.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowObsModal(true)}
                className="bg-teal hover:bg-teal-dark text-white text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Nouvelle Observation
              </Button>
            </div>

            {observations.length === 0 ? (
              <Card className="border-parchment-dark bg-white">
                <CardContent className="p-8 text-center text-muted">
                  <BookOpen className="mx-auto h-10 w-10 text-muted/40 mb-2" />
                  <p className="text-sm font-medium">Aucune observation enregistrée pour le moment.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowObsModal(true)}
                    className="mt-3 text-xs"
                  >
                    Noter la première observation didactique
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {observations.map((obs) => {
                  const comp = obs.comprehension ? COMPREHENSION_CONFIG[obs.comprehension] : null;
                  const part = obs.participation ? PARTICIPATION_CONFIG[obs.participation] : null;
                  const diff = obs.difficulte && obs.difficulte !== 'aucune' ? DIFFICULTE_CONFIG[obs.difficulte] : null;
                  const act = obs.action_pedagogique && obs.action_pedagogique !== 'aucune' ? ACTION_PEDAGOGIQUE_CONFIG[obs.action_pedagogique] : null;
                  const cause = obs.cause_possible ? CAUSE_PEDAGOGIQUE_CONFIG[obs.cause_possible] : null;
                  const mental = MENTAL_STATE_CONFIG[obs.mental_state || 'calme'];
                  const isNeedsHelp = Boolean(obs.needs_help);

                  return (
                    <Card
                      key={obs.id}
                      className={`border bg-white shadow-xs transition-shadow hover:shadow-sm ${
                        isNeedsHelp && obs.help_status === 'en_cours'
                          ? 'border-rose-300 bg-rose-50/10'
                          : 'border-parchment-dark'
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-parchment-dark pb-2 mb-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {comp ? (
                              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-bold ${comp.badgeClass}`}>
                                {comp.emoji} {comp.label.split('/')[0]}
                              </span>
                            ) : (
                              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-semibold ${mental.badgeClass}`}>
                                {mental.emoji} {mental.label}
                              </span>
                            )}

                            {part && (
                              <span className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${part.badgeClass}`}>
                                Participation : {part.label.split('(')[0]}
                              </span>
                            )}

                            {obs.notion && (
                              <span className="text-xs px-2 py-0.5 rounded-md bg-navy text-white font-medium">
                                Notion : {obs.notion}
                              </span>
                            )}
                          </div>

                          <span className="text-xs font-mono text-muted flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {obs.date}
                          </span>
                        </div>

                        {/* Comportements en situation d'apprentissage */}
                        {obs.comportements && obs.comportements.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mb-2.5">
                            <span className="text-[10px] uppercase font-bold text-muted tracking-wider">
                              Comportement :
                            </span>
                            {obs.comportements.map((c) => {
                              const cfg = COMPORTEMENT_CONFIG[c];
                              if (!cfg) return null;
                              return (
                                <span
                                  key={c}
                                  className={`text-[11px] px-2 py-0.2 rounded-md border font-medium ${cfg.badgeClass}`}
                                >
                                  {cfg.label}
                                </span>
                              );
                            })}
                          </div>
                        )}

                        {/* Difficulté & Action Pédagogique */}
                        {(diff || act) && (
                          <div className="flex flex-wrap items-center gap-2 mb-2.5">
                            {diff && (
                              <span className={`text-xs px-2.5 py-0.5 rounded-md border font-medium ${diff.badgeClass}`}>
                                Obstacle : {diff.label}
                              </span>
                            )}
                            {act && (
                              <span className={`text-xs px-2.5 py-0.5 rounded-md border font-medium ${act.badgeClass}`}>
                                Action immédiate : {act.label}
                              </span>
                            )}
                          </div>
                        )}

                        {obs.observation_text && (
                          <p className="text-xs text-slate-700 leading-relaxed mb-3">
                            {obs.observation_text}
                          </p>
                        )}

                        {/* Cause & Prochaine séance */}
                        {(cause || (obs.prochaine_seance && obs.prochaine_seance.length > 0)) && (
                          <div className="rounded-lg bg-parchment/40 border border-parchment-dark p-2.5 mb-3 text-xs space-y-1.5">
                            {cause && (
                              <p className="text-navy/80">
                                <strong className="text-navy font-semibold">Hypothèse didactique :</strong> {cause.label}
                              </p>
                            )}
                            {obs.prochaine_seance && obs.prochaine_seance.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                <span className="font-semibold text-navy">À faire prochaine séance :</span>
                                {obs.prochaine_seance.map((p) => {
                                  const pCfg = PROCHAINE_SEANCE_CONFIG[p];
                                  return (
                                    <span key={p} className="px-1.5 py-0.5 rounded bg-white text-navy border border-border text-[11px]">
                                      {pCfg?.label || p}
                                    </span>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Help Request Banner if any */}
                        {isNeedsHelp && (
                          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex items-start gap-2">
                              <HeartHandshake className="h-4 w-4 text-rose-600 mt-0.5" />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-rose-800">
                                    Besoin d'aide : {obs.help_topic || 'Non spécifié'}
                                  </span>
                                  {obs.help_urgency && (
                                    <span
                                      className={`text-[10px] px-2 py-0.2 rounded-full font-bold uppercase ${
                                        obs.help_urgency === 'urgent'
                                          ? 'bg-rose-600 text-white'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}
                                    >
                                      Urgence: {obs.help_urgency}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-muted">
                                  Statut actuel :{' '}
                                  <strong className="text-rose-700">
                                    {obs.help_status === 'resolu'
                                      ? 'Résolu ✓'
                                      : obs.help_status === 'a_renforcer'
                                      ? 'À renforcer'
                                      : 'En cours'}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-auto">
                              {obs.help_status !== 'resolu' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateHelpStatus(obs.id, 'resolu')}
                                  className="text-[11px] px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                                >
                                  ✓ Marquer résolu
                                </button>
                              )}
                              {obs.help_status !== 'a_renforcer' && (
                                <button
                                  type="button"
                                  onClick={() => handleUpdateHelpStatus(obs.id, 'a_renforcer')}
                                  className="text-[11px] px-2.5 py-1 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-medium transition-colors"
                                >
                                  À renforcer
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: RELEVÉ DE NOTES & ÉVALUATIONS */}
        {activeTab === 'grades' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-serif font-bold text-navy">
                  Relevé des Évaluations Sommatives & Formatives
                </h3>
                <p className="text-xs text-muted">
                  Barème MEN sur 20 avec pondération par coefficients.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setShowGradeModal(true)}
                className="bg-teal hover:bg-teal-dark text-white text-xs font-semibold"
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" /> Ajouter une Note
              </Button>
            </div>

            {/* Longitudinal Evolution Graph */}
            <StudentEvolutionChart
              grades={profile?.grades || []}
              quizResults={profile?.quizResults || []}
              studentName={profile ? `${profile.student.first_name} ${profile.student.last_name}` : undefined}
            />

            {grades.length === 0 ? (
              <Card className="border-parchment-dark bg-white">
                <CardContent className="p-8 text-center text-muted">
                  <Award className="mx-auto h-10 w-10 text-muted/40 mb-2" />
                  <p className="text-sm font-medium">Aucune note enregistrée pour cet élève.</p>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowGradeModal(true)}
                    className="mt-3 text-xs"
                  >
                    Ajouter le premier contrôle
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-parchment-dark bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-parchment/60 text-navy font-semibold uppercase tracking-wider border-b border-parchment-dark">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Évaluation</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-center">Coeff</th>
                        <th className="px-4 py-3 text-right">Note</th>
                        <th className="px-4 py-3">Appréciation</th>
                        <th className="px-4 py-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-parchment-dark">
                      {grades.map((g) => {
                        const normalizedGrade = (g.score / g.max_score) * 20;
                        const scoreColor =
                          normalizedGrade >= 14
                            ? 'text-teal font-bold'
                            : normalizedGrade >= 10
                            ? 'text-navy font-bold'
                            : 'text-rose-600 font-bold';

                        return (
                          <tr key={g.id} className="hover:bg-parchment/20 transition-colors">
                            <td className="px-4 py-3 font-mono text-muted">{g.date}</td>
                            <td className="px-4 py-3 font-medium text-navy">{g.title}</td>
                            <td className="px-4 py-3">
                              <span className="capitalize px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                                {g.eval_type.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-muted">x{g.coeff}</td>
                            <td className="px-4 py-3 text-right">
                              <span className={`text-sm ${scoreColor}`}>
                                {g.score}
                              </span>
                              <span className="text-[10px] text-muted"> / {g.max_score}</span>
                            </td>
                            <td className="px-4 py-3 text-muted max-w-xs truncate">
                              {g.comment || '--'}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteGrade(g.id)}
                                className="p-1 rounded text-muted hover:text-rose-600 transition-colors"
                                title="Supprimer la note"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* Détail des réponses aux Quiz & Évaluations */}
            {quizResults && quizResults.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-parchment-dark">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-teal" />
                      Détail des Réponses aux Quiz &amp; Évaluations
                    </h4>
                    <p className="text-xs text-muted">
                      Choix sélectionnés par l&apos;élève et corrections didactiques associées.
                    </p>
                  </div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-50 text-teal border border-teal/20">
                    {quizResults.length} quiz passé(s)
                  </span>
                </div>

                <div className="space-y-3">
                  {quizResults.map((qr) => {
                    const isExpanded = expandedQuizId === qr.exam_id;
                    const correctCount = qr.answers.filter((a) => a.is_correct).length;
                    const norm20 = qr.total_points > 0 ? (qr.total_score / qr.total_points) * 20 : 0;

                    return (
                      <Card key={qr.exam_id} className="border border-parchment-dark bg-white overflow-hidden shadow-2xs">
                        <div
                          onClick={() => setExpandedQuizId(isExpanded ? null : qr.exam_id)}
                          className="p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer hover:bg-parchment-dark/15 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal/10 text-teal flex items-center justify-center font-bold font-serif shrink-0">
                              QZ
                            </div>
                            <div>
                              <h5 className="font-semibold text-sm text-navy">{qr.exam_titre}</h5>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted mt-0.5">
                                <span>{qr.exam_date || 'Date non précisée'}</span>
                                <span>•</span>
                                <span className="font-medium text-navy">
                                  {correctCount}/{qr.answers.length} question(s) réussie(s)
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <span className="text-base font-bold text-navy">
                                {qr.total_score}
                                <span className="text-xs font-normal text-muted">/{qr.total_points}</span>
                              </span>
                              <span className="block text-[11px] font-semibold text-teal">
                                {Math.round(norm20 * 100) / 100} / 20
                              </span>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-parchment-dark/60 bg-parchment-dark/10 p-4 space-y-3">
                            <h6 className="text-xs font-bold uppercase tracking-wider text-muted">
                              Questions &amp; Réponses de l&apos;élève :
                            </h6>
                            <div className="grid grid-cols-1 gap-2.5">
                              {qr.answers.map((a, aIdx) => (
                                <div
                                  key={a.question_numero}
                                  className={cn(
                                    'p-3 rounded-xl border text-xs bg-white transition-all',
                                    a.is_correct ? 'border-emerald-200' : 'border-rose-200'
                                  )}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono font-bold text-navy bg-parchment-dark px-1.5 py-0.5 rounded text-[11px]">
                                        Q{aIdx + 1}
                                      </span>
                                      <span className="text-muted text-[11px] uppercase tracking-wider">
                                        {a.question_type}
                                      </span>
                                    </div>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full font-bold text-[11px]',
                                        a.is_correct
                                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                                      )}
                                    >
                                      {a.is_correct ? `✓ Correct (+${a.note} pt)` : `✗ Faux (0/${a.bareme} pt)`}
                                    </span>
                                  </div>

                                  <p className="text-navy font-medium mb-2">{a.enonce}</p>

                                  <div className="space-y-1 pt-1.5 border-t border-border/50 text-[11px]">
                                    <div className="flex items-start gap-1.5">
                                      <span className="font-semibold text-muted shrink-0">Réponse de l&apos;élève :</span>
                                      <span
                                        className={cn(
                                          'font-semibold',
                                          a.is_correct ? 'text-emerald-700' : 'text-rose-700'
                                        )}
                                      >
                                        {a.choice_key ? `${a.choice_key}. ` : ''}
                                        {a.choice_text || 'Non répondu'}
                                      </span>
                                    </div>

                                    {!a.is_correct && a.expected_answer && (
                                      <div className="flex items-start gap-1.5 text-muted">
                                        <span className="font-semibold text-emerald-800 shrink-0">Réponse attendue :</span>
                                        <span className="text-emerald-800 font-medium">{a.expected_answer}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ASSIDUITÉ & REGISTRE D'APPEL */}
        {activeTab === 'attendance' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-serif font-bold text-navy">
                Registre d'Assiduité & Ponctualité
              </h3>
              <p className="text-xs text-muted">
                Historique des séances manquées ou retards signalés en classe.
              </p>
            </div>

            {attendance.length === 0 ? (
              <Card className="border-parchment-dark bg-white">
                <CardContent className="p-8 text-center text-muted">
                  <CheckCircle2 className="mx-auto h-10 w-10 text-teal mb-2" />
                  <p className="text-sm font-medium text-navy">
                    Assiduité exemplaire !
                  </p>
                  <p className="text-xs text-muted mt-1">
                    Aucune absence ni retard enregistré pour le moment.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-parchment-dark bg-white shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-parchment/60 text-navy font-semibold uppercase tracking-wider border-b border-parchment-dark">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Statut</th>
                        <th className="px-4 py-3">Séance</th>
                        <th className="px-4 py-3">Justification</th>
                        <th className="px-4 py-3">Notes & Observations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-parchment-dark">
                      {attendance.map((att) => {
                        const isJustified = Boolean(att.is_justified);
                        return (
                          <tr key={att.id} className="hover:bg-parchment/20 transition-colors">
                            <td className="px-4 py-3 font-mono text-muted">{att.date}</td>
                            <td className="px-4 py-3">
                              {att.type === 'absence' ? (
                                <span className="inline-flex items-center gap-1 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full font-bold">
                                  <XCircle className="h-3 w-3" /> Absence
                                </span>
                              ) : att.type === 'retard' ? (
                                <span className="inline-flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-bold">
                                  <Clock className="h-3 w-3" /> Retard
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-teal bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-full font-medium">
                                  <CheckCircle2 className="h-3 w-3" /> Présence
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-navy font-medium">
                              {att.session_title || 'Séance standard'}
                            </td>
                            <td className="px-4 py-3">
                              {att.type === 'presence' ? (
                                '--'
                              ) : isJustified ? (
                                <span className="text-emerald-700 font-semibold">
                                  Justifié
                                </span>
                              ) : (
                                <span className="text-rose-600 font-bold">
                                  Non justifié
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted">{att.notes || '--'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        )}

        {/* TAB 5: INFORMATIONS PERSONNELLES & TUTEUR */}
        {activeTab === 'info' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-parchment-dark bg-white shadow-xs">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-base font-serif font-bold text-navy border-b border-parchment-dark pb-2 flex items-center gap-2">
                  <User className="h-4 w-4 text-teal" />
                  État Civil & Scolarité
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Nom complet :</span>
                    <span className="font-semibold text-navy">
                      {student.first_name} {student.last_name}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Code CNE / Massar :</span>
                    <span className="font-mono font-bold text-navy">
                      {student.cne_massar || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Genre :</span>
                    <span className="font-medium text-navy">
                      {student.gender === 'F' ? 'Féminin' : 'Masculin'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Classe rattachée :</span>
                    <span className="font-semibold text-teal">
                      {class_info ? `${class_info.niveau} - ${class_info.name}` : 'Aucune'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Statut TaRL :</span>
                    <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${tarlConfig.badgeClass}`}>
                      {tarlConfig.label}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-parchment-dark bg-white shadow-xs">
              <CardContent className="p-6 space-y-4">
                <h3 className="text-base font-serif font-bold text-navy border-b border-parchment-dark pb-2 flex items-center gap-2">
                  <Phone className="h-4 w-4 text-teal" />
                  Contact Tuteur & Besoins Particuliers
                </h3>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Nom du tuteur :</span>
                    <span className="font-semibold text-navy">
                      {student.guardian_name || 'Non renseigné'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-parchment-dark/50">
                    <span className="text-muted">Téléphone tuteur :</span>
                    {student.guardian_phone ? (
                      <a
                        href={`tel:${student.guardian_phone}`}
                        className="font-mono font-bold text-teal hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        {student.guardian_phone}
                      </a>
                    ) : (
                      <span className="text-muted italic">Non renseigné</span>
                    )}
                  </div>
                  <div className="py-2">
                    <span className="text-muted block mb-1">
                      Besoins Éducatifs Particuliers / PAI / Remarques :
                    </span>
                    <div className="rounded-lg bg-parchment/40 border border-parchment-dark p-3 text-slate-700 leading-relaxed min-h-[60px]">
                      {student.special_needs || 'Aucun besoin particulier ou PAI signalé.'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* MODAL 1: ADD OBSERVATION */}
        {mounted && showObsModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowObsModal(false); }}
          >
            <div className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-parchment-dark max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-parchment-dark px-6 py-4 bg-slate-50 shrink-0">
                <div>
                  <h3 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-teal" />
                    Observation Didactique : {student.first_name} {student.last_name}
                  </h3>
                  <p className="text-[11px] text-muted mt-0.5">
                    Enregistrement structuré des faits de classe et diagnostic didactique.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowObsModal(false)}
                  className="rounded p-1.5 text-muted hover:bg-parchment hover:text-navy transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddObservation} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  {/* Date & Notion */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-navy font-semibold mb-1">Date de la séance</label>
                      <Input
                        type="date"
                        value={obsDate}
                        onChange={(e) => setObsDate(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-navy font-semibold mb-1">
                        Notion / Concept visé
                      </label>
                      <Input
                        type="text"
                        value={obsNotion}
                        onChange={(e) => setObsNotion(e.target.value)}
                        placeholder="Ex: Les conditions (si...alors), Fractions..."
                        className="text-xs"
                      />
                    </div>
                  </div>

                  {/* 1. Compréhension */}
                  <div>
                    <label className="block text-navy font-semibold mb-1.5">
                      1. Degré de Compréhension
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(['maitrise', 'comprend_avec_aide', 'comprehension_partielle', 'difficulte_importante'] as ComprehensionDimension[]).map((c) => {
                        const cfg = COMPREHENSION_CONFIG[c];
                        const isSel = obsComprehension === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setObsComprehension(c)}
                            className={`p-2 rounded-xl border text-left transition-all ${
                              isSel
                                ? `${cfg.badgeClass} ring-2 ring-teal shadow-xs font-bold`
                                : 'bg-white border-border text-navy hover:bg-parchment/40'
                            }`}
                          >
                            <div className="text-sm mb-0.5">{cfg.emoji}</div>
                            <div className="text-[11px] leading-tight font-medium">{cfg.label.split('/')[0]}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 2. Participation */}
                  <div>
                    <label className="block text-navy font-semibold mb-1.5">
                      2. Niveau de Participation
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                      {(['tres_active', 'active', 'moyenne', 'faible', 'aucune'] as ParticipationDimension[]).map((p) => {
                        const cfg = PARTICIPATION_CONFIG[p];
                        const isSel = obsParticipation === p;
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setObsParticipation(p)}
                            className={`px-2 py-1.5 rounded-lg border text-center text-[11px] transition-all capitalize font-medium ${
                              isSel
                                ? `${cfg.badgeClass} ring-1 ring-teal font-bold shadow-xs`
                                : 'bg-white border-border text-navy hover:bg-parchment/30'
                            }`}
                          >
                            {p.replace('_', ' ')}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Comportement en situation d'apprentissage */}
                  <div>
                    <label className="block text-navy font-semibold mb-1.5">
                      3. Comportement observé
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {(['concentre', 'distrait', 'agite', 'en_retrait', 'interrompt', 'coopere', 'aide_camarades'] as ComportementApprentissage[]).map((comp) => {
                        const cfg = COMPORTEMENT_CONFIG[comp];
                        const isSel = obsComportements.includes(comp);
                        return (
                          <button
                            key={comp}
                            type="button"
                            onClick={() => {
                              setObsComportements((prev) =>
                                isSel ? prev.filter((x) => x !== comp) : [...prev, comp]
                              );
                            }}
                            className={`px-2.5 py-1 rounded-full text-[11px] border transition-all ${
                              isSel
                                ? `${cfg.badgeClass} ring-1 ring-teal font-bold`
                                : 'bg-white border-border text-muted hover:bg-parchment/30'
                            }`}
                          >
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 4. Difficulté & Action Immédiate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-navy font-semibold mb-1">
                        4. Obstacle / Difficulté
                      </label>
                      <select
                        value={obsDifficulte}
                        onChange={(e) => setObsDifficulte(e.target.value as DifficultesRencontrees)}
                        className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-navy focus:outline-teal"
                      >
                        {Object.entries(DIFFICULTE_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-navy font-semibold mb-1">
                        5. Action Pédagogique Immédiate
                      </label>
                      <select
                        value={obsAction}
                        onChange={(e) => setObsAction(e.target.value as ActionPedagogique)}
                        className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-navy focus:outline-teal"
                      >
                        {Object.entries(ACTION_PEDAGOGIQUE_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Cause Didactique & À Faire Prochaine Séance */}
                  <div className="rounded-xl border border-parchment-dark bg-parchment/20 p-3 space-y-3">
                    <div>
                      <label className="block text-navy font-semibold mb-1">
                        Hypothèse Didactique (Cause possible)
                      </label>
                      <select
                        value={obsCause}
                        onChange={(e) => setObsCause(e.target.value as CausePedagogique)}
                        className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs text-navy focus:outline-teal"
                      >
                        {Object.entries(CAUSE_PEDAGOGIQUE_CONFIG).map(([k, cfg]) => (
                          <option key={k} value={k}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-navy font-semibold mb-1">
                        À faire lors de la prochaine séance
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(PROCHAINE_SEANCE_CONFIG).map(([k, cfg]) => {
                          const key = k as ProchaineSeanceAction;
                          const isSel = obsProchaine.includes(key);
                          return (
                            <button
                              key={k}
                              type="button"
                              onClick={() => {
                                setObsProchaine((prev) =>
                                  isSel ? prev.filter((x) => x !== key) : [...prev, key]
                                );
                              }}
                              className={`px-2 py-0.5 rounded text-[11px] border transition-all ${
                                isSel
                                  ? 'bg-teal text-white border-teal font-medium'
                                  : 'bg-white text-navy/80 border-border hover:bg-parchment/40'
                              }`}
                            >
                              {cfg.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Note libre */}
                  <div>
                    <label className="block text-navy font-semibold mb-1">
                      Remarques qualitatives / Faits observés
                    </label>
                    <textarea
                      value={obsText}
                      onChange={(e) => setObsText(e.target.value)}
                      rows={2}
                      placeholder="Ex: A bien démarré la manipulation mais a hésité lors de la synthèse écrite..."
                      className="w-full rounded-lg border border-border bg-white p-2.5 text-xs text-navy focus:outline-teal"
                    />
                  </div>

                  {/* Signalement besoin de soutien */}
                  <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={obsNeedsHelp}
                        onChange={(e) => setObsNeedsHelp(e.target.checked)}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="font-semibold text-rose-900">
                        Signaler un besoin d'aide ou de remédiation urgente
                      </span>
                    </label>

                    {obsNeedsHelp && (
                      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-rose-200">
                        <div>
                          <label className="block text-muted font-medium mb-1">Notion à cibler</label>
                          <Input
                            type="text"
                            value={obsTopic}
                            onChange={(e) => setObsTopic(e.target.value)}
                            placeholder="Ex: Calcul littéral..."
                            className="text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-muted font-medium mb-1">Degré d'Urgence</label>
                          <select
                            value={obsUrgency}
                            onChange={(e) => setObsUrgency(e.target.value as HelpUrgency)}
                            className="w-full rounded-lg border border-border bg-white px-2.5 py-1.5 text-xs focus:outline-teal"
                          >
                            <option value="faible">Faible (soutien ponctuel)</option>
                            <option value="moyen">Moyen (remédiation TaRL Groupe B)</option>
                            <option value="urgent">Urgent (blocage fondamental Groupe A)</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-parchment-dark bg-slate-50/50 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowObsModal(false)}
                    className="text-xs"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="bg-teal hover:bg-teal-dark text-white text-xs font-semibold"
                  >
                    {submitting ? 'Enregistrement...' : 'Enregistrer Observation'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 2: ADD GRADE */}
        {mounted && showGradeModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowGradeModal(false); }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-parchment-dark max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-parchment-dark px-6 py-4 bg-slate-50 shrink-0">
                <h3 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                  <Award className="h-4 w-4 text-teal" />
                  Ajouter une Évaluation : {student.first_name} {student.last_name}
                </h3>
                <button
                  type="button"
                  onClick={() => setShowGradeModal(false)}
                  className="rounded p-1.5 text-muted hover:bg-parchment hover:text-navy transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleAddGrade} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  <div>
                    <label className="block text-muted font-medium mb-1">Titre de l'évaluation</label>
                    <Input
                      type="text"
                      value={gradeTitle}
                      onChange={(e) => setGradeTitle(e.target.value)}
                      placeholder="Ex: Contrôle Continu N°1, Devoir Maison 2..."
                      required
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted font-medium mb-1">Type</label>
                      <select
                        value={gradeType}
                        onChange={(e) => setGradeType(e.target.value as EvaluationType)}
                        className="w-full rounded-lg border border-parchment-dark bg-white px-3 py-2 text-xs focus:outline-teal"
                      >
                        <option value="controle">Contrôle Continu</option>
                        <option value="devoir">Devoir Maison</option>
                        <option value="activite_pratique">Activité Pratique</option>
                        <option value="oral">Oral / Participation</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-muted font-medium mb-1">Date</label>
                      <Input
                        type="date"
                        value={gradeDate}
                        onChange={(e) => setGradeDate(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-muted font-medium mb-1">Note Obtenue</label>
                      <Input
                        type="number"
                        step="0.25"
                        min="0"
                        value={gradeScore}
                        onChange={(e) => setGradeScore(e.target.value)}
                        placeholder="15.5"
                        required
                        className="text-xs font-bold text-navy"
                      />
                    </div>
                    <div>
                      <label className="block text-muted font-medium mb-1">Sur (Barème)</label>
                      <Input
                        type="number"
                        value={gradeMaxScore}
                        onChange={(e) => setGradeMaxScore(e.target.value)}
                        placeholder="20"
                        className="text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-muted font-medium mb-1">Coefficient</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={gradeCoeff}
                        onChange={(e) => setGradeCoeff(e.target.value)}
                        placeholder="1"
                        className="text-xs font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-muted font-medium mb-1">Appréciation Didactique</label>
                    <textarea
                      value={gradeComment}
                      onChange={(e) => setGradeComment(e.target.value)}
                      rows={2}
                      placeholder="Ex: Très bonne maîtrise du raisonnement, soigner la rédaction..."
                      className="w-full rounded-lg border border-parchment-dark bg-white p-2.5 text-xs focus:outline-teal"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-parchment-dark bg-slate-50/50 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowGradeModal(false)}
                    className="text-xs"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="bg-teal hover:bg-teal-dark text-white text-xs font-semibold"
                  >
                    {submitting ? 'Enregistrement...' : 'Enregistrer Note'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {/* MODAL 3: EDIT STUDENT */}
        {mounted && showEditModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto bg-navy/60 backdrop-blur-sm transition-all"
            onClick={(e) => { if (e.target === e.currentTarget) setShowEditModal(false); }}
          >
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-parchment-dark max-h-[90vh] flex flex-col overflow-hidden my-auto animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-parchment-dark px-6 py-4 bg-slate-50 shrink-0">
                <h3 className="text-base font-serif font-bold text-navy flex items-center gap-2">
                  <Edit2 className="h-4 w-4 text-teal" />
                  Modifier la Fiche Élève
                </h3>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="rounded p-1.5 text-muted hover:bg-parchment hover:text-navy transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={handleEditStudent} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted font-medium mb-1">Prénom</label>
                      <Input
                        type="text"
                        value={editFirst}
                        onChange={(e) => setEditFirst(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-muted font-medium mb-1">Nom</label>
                      <Input
                        type="text"
                        value={editLast}
                        onChange={(e) => setEditLast(e.target.value)}
                        required
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted font-medium mb-1">Code CNE / Massar</label>
                      <Input
                        type="text"
                        value={editCne}
                        onChange={(e) => setEditCne(e.target.value)}
                        className="text-xs font-mono uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-muted font-medium mb-1">Genre</label>
                      <select
                        value={editGender}
                        onChange={(e) => setEditGender(e.target.value as 'M' | 'F')}
                        className="w-full rounded-lg border border-parchment-dark bg-white px-3 py-2 text-xs focus:outline-teal"
                      >
                        <option value="M">Masculin (M)</option>
                        <option value="F">Féminin (F)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-muted font-medium mb-1">Statut Didactique TaRL (Niveau)</label>
                    <select
                      value={editTarl}
                      onChange={(e) => setEditTarl(e.target.value as TarlStatus)}
                      className="w-full rounded-lg border border-parchment-dark bg-white px-3 py-2 text-xs focus:outline-teal"
                    >
                      <option value="standard">Niveau Standard (Conforme aux attendus)</option>
                      <option value="soutien_prioritaire">Soutien Prioritaire (TaRL A - Difficultés fondamentales)</option>
                      <option value="consolidation">Consolidation (TaRL B - Fragilités ciblées)</option>
                      <option value="depassement">Défi / Avancé (TaRL C - En dépassement)</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-muted font-medium mb-1">Nom du Tuteur Légal</label>
                      <Input
                        type="text"
                        value={editGuardianName}
                        onChange={(e) => setEditGuardianName(e.target.value)}
                        placeholder="Père, Mère, Tuteur..."
                        className="text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-muted font-medium mb-1">Téléphone Tuteur</label>
                      <Input
                        type="tel"
                        value={editGuardianPhone}
                        onChange={(e) => setEditGuardianPhone(e.target.value)}
                        placeholder="06 XX XX XX XX"
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-muted font-medium mb-1">Besoins Particuliers / PAI / Notes</label>
                    <textarea
                      value={editSpecialNeeds}
                      onChange={(e) => setEditSpecialNeeds(e.target.value)}
                      rows={2}
                      placeholder="Allergies, difficultés visuelles, aménagement d'évaluation..."
                      className="w-full rounded-lg border border-parchment-dark bg-white p-2.5 text-xs focus:outline-teal"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 p-4 border-t border-parchment-dark bg-slate-50/50 shrink-0">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowEditModal(false)}
                    className="text-xs"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={submitting}
                    className="bg-teal hover:bg-teal-dark text-white text-xs font-semibold"
                  >
                    {submitting ? 'Enregistrement...' : 'Mettre à jour'}
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
