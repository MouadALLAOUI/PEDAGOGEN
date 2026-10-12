'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Save, TableProperties, FileDown, FileCode, BarChart3, Upload,
  CheckCircle2, BookOpen, Target, Sparkles, AlertTriangle, Lightbulb,
  Check, FileText, ArrowRight, Eye, Layers, Compass, Users, CheckCheck,
  ChevronLeft, ChevronRight, X, RotateCcw, ListOrdered, Edit3, SlidersHorizontal
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Card, CardContent } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';

interface Question {
  id: string;
  numero: number;
  type: string;
  bareme: number;
  enonce: string;
  options?: any;
  image_url?: string;
}

interface Student {
  id: string;
  nom: string;
  prenom: string;
  cne: string;
  classe_id?: string;
  classe_nom: string;
}

interface QuestionChoice {
  key: string;
  text: string;
  isCorrect: boolean;
  note: number;
}

interface StoredAnswer {
  choiceKey: string;
  choiceText: string;
  isCorrect: boolean;
  note: number;
}

export interface GuideSectionsVisibility {
  competence: boolean;
  bloom: boolean;
  erreurs: boolean;
  remediation: boolean;
}

export interface QuestionGuideOverride {
  hiddenSections?: Partial<GuideSectionsVisibility>;
  custom?: Partial<PedagogicalGuide>;
}

export interface ExamGuideConfig {
  visibleSections?: Partial<GuideSectionsVisibility>;
  questionOverrides?: Record<number, QuestionGuideOverride>;
}

interface Examen {
  id: string;
  titre: string;
  exam_date: string;
  niveau: string;
  total_points: number;
  duree: number;
  guide_config?: ExamGuideConfig | null;
}

interface PedagogicalGuide {
  competence: string;
  objectif: string;
  bloom: string;
  baremeDetail: string;
  erreursFrequentes: string;
  remediation: string;
}

function getPedagogicalGuide(q: Question): PedagogicalGuide {
  switch (q.type) {
    case 'qcm':
      return {
        competence: 'Restitution et discrimination conceptuelle des notions clés.',
        objectif: 'Vérifier la maîtrise de la terminologie et la capacité à identifier la bonne réponse parmi des propositions plausibles.',
        bloom: 'Connaissance & Compréhension (Niveau Bloom C1/C2)',
        baremeDetail: 'Attribution intégrale si la bonne proposition est cochée sans case erronée.',
        erreursFrequentes: 'Confusion entre termes techniques proches ou sélection impulsive sans lecture de toutes les options.',
        remediation: 'Faire expliciter en classe pourquoi chaque distracteur est incorrect avant de valider la bonne réponse.',
      };
    case 'tableau':
      return {
        competence: 'Structuration systématique, catégorisation et synthèse de données techniques.',
        objectif: 'Évaluer la capacité de l\'élève à classer méthodiquement des composants selon des critères fonctionnels précis.',
        bloom: 'Application & Analyse fonctionnelle (Niveau Bloom C3/C4)',
        baremeDetail: 'Répartition égale des points par cellule complétée de manière adéquate.',
        erreursFrequentes: 'Inversion de colonnes ou hésitation sur les périphériques hybrides / mixtes.',
        remediation: 'Construire une carte mentale récapitulative au tableau avec la participation active des élèves.',
      };
    case 'vrai_faux':
      return {
        competence: 'Évaluation du sens critique et déconstruction des idées reçues.',
        objectif: 'Tester la compréhension fine des principes de fonctionnement et repérer les fausses croyances didactiques.',
        bloom: 'Compréhension & Jugement critique (Niveau Bloom C2/C4)',
        baremeDetail: '1 point par affirmation correctement tranchée (sans point négatif pour encourager la réflexion).',
        erreursFrequentes: 'Généralisation hâtive ou lecture trop rapide des tournures négatives.',
        remediation: 'Demander aux élèves de reformuler chaque proposition fausse pour la rendre scientifiquement exacte.',
      };
    case 'appariement':
      return {
        competence: 'Mise en relation fonctionnelle et correspondance logique.',
        objectif: 'Associer chaque équipement ou protocole à son rôle principal dans une architecture informatique.',
        bloom: 'Compréhension & Application (Niveau Bloom C2/C3)',
        baremeDetail: 'Partage équitable du barème par paire correctement reliée.',
        erreursFrequentes: 'Association aléatoire par élimination sur les derniers éléments restants.',
        remediation: 'Faire redéfinir chaque terme individuellement avant de chercher sa correspondance.',
      };
    case 'exercice':
      return {
        competence: 'Mobilisation d\'une démarche séquentielle de résolution de situation-problème.',
        objectif: 'Guider l\'élève à travers un raisonnement logique étape par étape (observation, calcul/paramétrage, déduction).',
        bloom: 'Résolution de problème & Application guidée (Niveau Bloom C3/C4)',
        baremeDetail: 'Barème progressif par sous-question avec valorisation de la démarche même en cas d\'erreur de calcul.',
        erreursFrequentes: 'Oubli d\'unités techniques (Ko, Go, octets) ou erreur de report entre étapes.',
        remediation: 'Poser la formule littérale avant d\'effectuer l\'application numérique.',
      };
    case 'ouvert':
    default:
      return {
        competence: 'Formulation argumentée, synthèse personnelle et expression écrite disciplinaire.',
        objectif: 'Mesurer la profondeur de compréhension et la capacité à expliquer un concept informatique avec ses propres mots.',
        bloom: 'Analyse & Synthèse (Niveau Bloom C4/C5)',
        baremeDetail: q.options?.reponse_attendue
          ? `Critères indicatifs : ${q.options.reponse_attendue}`
          : 'Barème articulé : 50% sur la présence des mots-clés, 50% sur la clarté et la pertinence de l\'explication.',
        erreursFrequentes: 'Réponses évasives ou recours au langage familier au lieu du lexique technique adapté.',
        remediation: 'Fournir une phrase-modèle type et faire surligner les mots-clés incontournables.',
      };
  }
}

/** Seuils visuels pour les notes */
function noteColorClass(note: number | null, bareme: number, totalPoints: number): string {
  if (note === null) return '';
  const norm20 = bareme === totalPoints ? (note / totalPoints) * 20 : null;
  if (norm20 !== null) {
    return norm20 < 5 ? 'bg-red-50 text-red' : norm20 < 10 ? 'bg-amber-50 text-amber' : 'bg-green-50 text-green';
  }
  return note < bareme / 2 ? 'bg-red-50 text-red' : note < bareme * 0.75 ? 'bg-amber-50 text-amber' : 'bg-green-50 text-green';
}

function totalColorClass(total: number | null, totalPoints: number): string {
  if (total === null) return '';
  const norm20 = (total / totalPoints) * 20;
  return norm20 < 5 ? 'bg-red-50 text-red' : norm20 < 10 ? 'bg-amber-50 text-amber' : 'bg-green-50 text-green';
}

function extractQuestionChoices(q: Question): QuestionChoice[] {
  if (q.type === 'qcm') {
    const rawOpts = q.options;
    const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
    const items: any[] = isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : []);
    if (items.length > 0) {
      return items.map((opt, idx) => {
        const letter = String.fromCharCode(65 + idx);
        const isCorrect = Boolean(opt.isCorrect || opt.correct);
        return {
          key: letter,
          text: opt.text || opt.label || `Proposition ${letter}`,
          isCorrect,
          note: isCorrect ? q.bareme : 0,
        };
      });
    }
  }

  if (q.type === 'vrai_faux') {
    const items: any[] = Array.isArray(q.options) ? q.options : [];
    if (items.length <= 1) {
      const expectedVrai = items.length === 1 ? Boolean(items[0].isVrai) : true;
      return [
        {
          key: 'VRAI',
          text: 'VRAI',
          isCorrect: expectedVrai,
          note: expectedVrai ? q.bareme : 0,
        },
        {
          key: 'FAUX',
          text: 'FAUX',
          isCorrect: !expectedVrai,
          note: !expectedVrai ? q.bareme : 0,
        },
      ];
    }
    return [
      {
        key: 'A',
        text: 'Toutes les affirmations correctes',
        isCorrect: true,
        note: q.bareme,
      },
      {
        key: 'B',
        text: 'Partiellement correct',
        isCorrect: false,
        note: Math.round((q.bareme / 2) * 4) / 4,
      },
      {
        key: 'C',
        text: 'Incorrect',
        isCorrect: false,
        note: 0,
      },
    ];
  }

  if (q.type === 'tableau') {
    return [
      {
        key: 'A',
        text: 'Tableau entièrement complété avec exactitude',
        isCorrect: true,
        note: q.bareme,
      },
      {
        key: 'B',
        text: 'Tableau partiellement complété',
        isCorrect: false,
        note: Math.round((q.bareme / 2) * 4) / 4,
      },
      {
        key: 'C',
        text: 'Non acquis / Non complété',
        isCorrect: false,
        note: 0,
      },
    ];
  }

  if (q.type === 'appariement') {
    return [
      {
        key: 'A',
        text: 'Toutes les correspondances exactes',
        isCorrect: true,
        note: q.bareme,
      },
      {
        key: 'B',
        text: 'Correspondances partielles',
        isCorrect: false,
        note: Math.round((q.bareme / 2) * 4) / 4,
      },
      {
        key: 'C',
        text: 'Erreurs / Non associées',
        isCorrect: false,
        note: 0,
      },
    ];
  }

  if (q.type === 'exercice') {
    return [
      {
        key: 'A',
        text: 'Démarche & calculs entièrement réussis',
        isCorrect: true,
        note: q.bareme,
      },
      {
        key: 'B',
        text: 'Démarche bonne, calcul partiel',
        isCorrect: false,
        note: Math.round((q.bareme * 0.75) * 4) / 4,
      },
      {
        key: 'C',
        text: 'Réussite partielle',
        isCorrect: false,
        note: Math.round((q.bareme * 0.5) * 4) / 4,
      },
      {
        key: 'D',
        text: 'Non réussi / Hors sujet',
        isCorrect: false,
        note: 0,
      },
    ];
  }

  return [
    {
      key: 'A',
      text: q.options?.reponse_attendue ? `Réponse attendue : ${String(q.options.reponse_attendue).slice(0, 45)}...` : 'Réponse correcte & complète',
      isCorrect: true,
      note: q.bareme,
    },
    {
      key: 'B',
      text: 'Réponse partielle / Vocabulaire approximatif',
      isCorrect: false,
      note: Math.round((q.bareme * 0.5) * 4) / 4,
    },
    {
      key: 'C',
      text: 'Réponse incorrecte ou non traitée',
      isCorrect: false,
      note: 0,
    },
  ];
}

export default function GuideProfesseurPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'guide' | 'grille'>('guide');
  const [exam, setExam] = useState<Examen | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [notes, setNotes] = useState<Record<string, number | null>>({});
  const [studentAnswers, setStudentAnswers] = useState<Record<string, StoredAnswer>>({});
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [grilleViewMode, setGrilleViewMode] = useState<'choice' | 'matrix'>('choice');
  const [activeQuestionIdx, setActiveQuestionIdx] = useState<number>(0);
  const [bulkModalChoice, setBulkModalChoice] = useState<QuestionChoice | null>(null);
  const [bulkSelectedStudents, setBulkSelectedStudents] = useState<Set<string>>(new Set());
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [classDiagnostics, setClassDiagnostics] = useState<Record<number, 'acquis' | 'partiel' | 'difficulte'>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingDiag, setApplyingDiag] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importPreview, setImportPreview] = useState<{ matched: Array<{ studentId: string; nom: string; prenom: string; notes: Record<string, number | null> }>; unmatched: Array<{ ligne: number; identifiant: string; raison: string }>; fileName: string } | null>(null);
  const [importing, setImporting] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const studentAnswersRef = useRef(studentAnswers);
  studentAnswersRef.current = studentAnswers;

  // Guide didactique personnalisable
  const [guideConfig, setGuideConfig] = useState<ExamGuideConfig>({
    visibleSections: {
      competence: true,
      bloom: true,
      erreurs: true,
      remediation: true,
    },
    questionOverrides: {},
  });
  const [editingQuestionGuide, setEditingQuestionGuide] = useState<number | null>(null);
  const [editGuideDraft, setEditGuideDraft] = useState<Partial<PedagogicalGuide>>({});
  const [savingGuide, setSavingGuide] = useState<boolean>(false);
  const [guideDirty, setGuideDirty] = useState<boolean>(false);

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/examens/${id}/grille`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setExam(data.exam);
        const qList: Question[] = (data.questions || []).filter((q: Question) => q.type !== 'section');
        setQuestions(qList);
        setStudents(data.students || []);
        const serverNotes = data.notes || {};
        setNotes(serverNotes);

        const ansMap: Record<string, StoredAnswer> = {};
        if (Array.isArray(data.answers)) {
          for (const a of data.answers) {
            ansMap[`${a.studentId}:${a.numero}`] = {
              choiceKey: a.choiceKey,
              choiceText: a.choiceText,
              isCorrect: Boolean(a.isCorrect),
              note: Number(a.note || 0),
            };
          }
        }
        setStudentAnswers(ansMap);
        setDirty(false);

        if (data.exam?.guide_config) {
          setGuideConfig({
            visibleSections: {
              competence: true,
              bloom: true,
              erreurs: true,
              remediation: true,
              ...(data.exam.guide_config.visibleSections || {}),
            },
            questionOverrides: data.exam.guide_config.questionOverrides || {},
          });
          setGuideDirty(false);
        } else {
          try {
            const cached = localStorage.getItem(`pedagogen_guide_config_${id}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              setGuideConfig({
                visibleSections: {
                  competence: true,
                  bloom: true,
                  erreurs: true,
                  remediation: true,
                  ...(parsed.visibleSections || {}),
                },
                questionOverrides: parsed.questionOverrides || {},
              });
            }
          } catch {
            /* ignore */
          }
        }

        const initialDiag: Record<number, 'acquis' | 'partiel' | 'difficulte'> = {};
        qList.forEach((q) => {
          initialDiag[q.numero] = 'acquis';
        });
        setClassDiagnostics(initialDiag);
      })
      .catch((e) => toast.error(e.message || 'Échec du chargement'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  // Classes list
  const classList = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    for (const s of students) {
      const key = s.classe_nom || 'Sans classe';
      const existing = map.get(key);
      if (existing) {
        existing.count++;
      } else {
        map.set(key, { id: s.classe_id || key, name: key, count: 1 });
      }
    }
    return Array.from(map.values());
  }, [students]);

  // Default to first class if multiple classes
  useEffect(() => {
    if (classList.length > 0 && selectedClass === 'all' && classList[0]) {
      setSelectedClass(classList[0].name);
    }
  }, [classList, selectedClass]);

  const filteredStudents = useMemo(() => {
    if (selectedClass === 'all') return students;
    return students.filter((s) => s.classe_nom === selectedClass || s.classe_id === selectedClass);
  }, [students, selectedClass]);

  const currentQuestion = questions[activeQuestionIdx] || questions[0];
  const currentChoices = useMemo(() => {
    if (!currentQuestion) return [];
    return extractQuestionChoices(currentQuestion);
  }, [currentQuestion]);

  // Assign a choice to a student
  const assignChoice = (studentId: string, q: Question, choice: QuestionChoice | null) => {
    const key = `${studentId}:${q.numero}`;
    if (!choice) {
      setStudentAnswers((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setNotes((prev) => ({ ...prev, [key]: null }));
    } else {
      setStudentAnswers((prev) => ({
        ...prev,
        [key]: {
          choiceKey: choice.key,
          choiceText: choice.text,
          isCorrect: choice.isCorrect,
          note: choice.note,
        },
      }));
      setNotes((prev) => ({ ...prev, [key]: choice.note }));
    }
    setDirty(true);
  };

  const openBulkModal = (choice: QuestionChoice) => {
    setBulkModalChoice(choice);
    const preselected = new Set<string>();
    if (currentQuestion) {
      filteredStudents.forEach((s) => {
        const ans = studentAnswers[`${s.id}:${currentQuestion.numero}`];
        if (ans && ans.choiceKey === choice.key) {
          preselected.add(s.id);
        }
      });
    }
    setBulkSelectedStudents(preselected);
  };

  const confirmBulkAssign = () => {
    if (!bulkModalChoice || !currentQuestion) return;
    const choice = bulkModalChoice;
    const q = currentQuestion;

    setStudentAnswers((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        const key = `${s.id}:${q.numero}`;
        if (bulkSelectedStudents.has(s.id)) {
          next[key] = {
            choiceKey: choice.key,
            choiceText: choice.text,
            isCorrect: choice.isCorrect,
            note: choice.note,
          };
        } else if (next[key]?.choiceKey === choice.key) {
          delete next[key];
        }
      });
      return next;
    });

    setNotes((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        const key = `${s.id}:${q.numero}`;
        if (bulkSelectedStudents.has(s.id)) {
          next[key] = choice.note;
        } else if (studentAnswers[`${s.id}:${q.numero}`]?.choiceKey === choice.key) {
          next[key] = null;
        }
      });
      return next;
    });

    setDirty(true);
    setBulkModalChoice(null);
    toast.success(`${bulkSelectedStudents.size} élève(s) assigné(s) à l'option ${choice.key}`);
  };

  const assignAllUnassignedCorrect = () => {
    if (!currentQuestion) return;
    const correctChoice = currentChoices.find((c) => c.isCorrect) || currentChoices[0];
    if (!correctChoice) return;

    let assignedCount = 0;
    setStudentAnswers((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        const key = `${s.id}:${currentQuestion.numero}`;
        if (!next[key]) {
          next[key] = {
            choiceKey: correctChoice.key,
            choiceText: correctChoice.text,
            isCorrect: correctChoice.isCorrect,
            note: correctChoice.note,
          };
          assignedCount++;
        }
      });
      return next;
    });

    setNotes((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        const key = `${s.id}:${currentQuestion.numero}`;
        if (prev[key] === null || prev[key] === undefined) {
          next[key] = correctChoice.note;
        }
      });
      return next;
    });

    setDirty(true);
    toast.success(`${assignedCount} élève(s) non noté(s) ont reçu la bonne réponse (+${correctChoice.note} pt)`);
  };

  const resetCurrentQuestion = () => {
    if (!currentQuestion) return;
    setStudentAnswers((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        delete next[`${s.id}:${currentQuestion.numero}`];
      });
      return next;
    });
    setNotes((prev) => {
      const next = { ...prev };
      filteredStudents.forEach((s) => {
        next[`${s.id}:${currentQuestion.numero}`] = null;
      });
      return next;
    });
    setDirty(true);
    toast.success(`Réponses réinitialisées pour Q${currentQuestion.numero}`);
  };

  const saveNotes = useCallback(async (silent = false) => {
    if (!silent) setSaving(true);
    try {
      const answersPayload = Object.entries(studentAnswersRef.current).map(([k, val]) => {
        const [studentId, numeroStr] = k.split(':');
        return {
          studentId,
          numero: Number(numeroStr),
          choiceKey: val.choiceKey,
          choiceText: val.choiceText,
          isCorrect: val.isCorrect,
          note: val.note,
        };
      });

      const payload = students.flatMap((s) =>
        questions.map((q) => ({
          studentId: s.id,
          numero: q.numero,
          note: notesRef.current[`${s.id}:${q.numero}`] ?? null,
        }))
      );
      const res = await fetch(`/api/examens/${id}/grille`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: payload, answers: answersPayload, syncToProfile: true, guide_config: guideConfig }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'enregistrement');
      setDirty(false);
      setGuideDirty(false);
      try { localStorage.removeItem(`pedagogen_grille_draft_${id}`); } catch { /* ignore */ }
      if (!silent) toast.success(`Enregistré ! Notes et réponses au quiz ajoutées aux profils des élèves.`);
    } catch (err) {
      if (!silent) toast.error(err instanceof Error ? err.message : 'Échec de l\'enregistrement');
      else toast.error('Sauvegarde auto échouée');
    } finally {
      if (!silent) setSaving(false);
    }
  }, [id, students, questions, guideConfig]);

  // ─── Actions sur le Guide Pédagogique (Rubriques & Fiches didactiques) ───
  const saveGuideConfig = useCallback(async (newConfig?: ExamGuideConfig) => {
    const configToSave = newConfig || guideConfig;
    setSavingGuide(true);
    try {
      localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(configToSave));
      const res = await fetch(`/api/examens/${id}/grille`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guide_config: configToSave }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data?.error || 'Erreur lors de la sauvegarde du guide');
      setGuideDirty(false);
      toast.success('Guide didactique du professeur enregistré avec succès');
    } catch (err: any) {
      toast.error(err.message || 'Échec de sauvegarde du guide');
    } finally {
      setSavingGuide(false);
    }
  }, [id, guideConfig]);

  const toggleGlobalSection = (section: keyof GuideSectionsVisibility) => {
    setGuideConfig((prev) => {
      const currentVal = prev.visibleSections?.[section] !== false;
      const updated: ExamGuideConfig = {
        ...prev,
        visibleSections: {
          competence: prev.visibleSections?.competence !== false,
          bloom: prev.visibleSections?.bloom !== false,
          erreurs: prev.visibleSections?.erreurs !== false,
          remediation: prev.visibleSections?.remediation !== false,
          ...prev.visibleSections,
          [section]: !currentVal,
        },
      };
      localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(updated));
      setGuideDirty(true);
      return updated;
    });
  };

  const resetAllGuideCustomizations = () => {
    const resetConfig: ExamGuideConfig = {
      visibleSections: {
        competence: true,
        bloom: true,
        erreurs: true,
        remediation: true,
      },
      questionOverrides: {},
    };
    setGuideConfig(resetConfig);
    setEditingQuestionGuide(null);
    setGuideDirty(true);
    localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(resetConfig));
    toast.success('Rubriques et fiches didactiques réinitialisées par défaut');
  };

  const removeQuestionSection = (numero: number, section: keyof GuideSectionsVisibility) => {
    setGuideConfig((prev) => {
      const qOverride = prev.questionOverrides?.[numero] || {};
      const updated: ExamGuideConfig = {
        ...prev,
        questionOverrides: {
          ...prev.questionOverrides,
          [numero]: {
            ...qOverride,
            hiddenSections: {
              ...qOverride.hiddenSections,
              [section]: true,
            },
          },
        },
      };
      localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(updated));
      setGuideDirty(true);
      return updated;
    });
    toast.success('Rubrique masquée pour cette question', { duration: 2500 });
  };

  const restoreQuestionSection = (numero: number, section: keyof GuideSectionsVisibility) => {
    setGuideConfig((prev) => {
      const qOverride = prev.questionOverrides?.[numero] || {};
      const updatedHidden = { ...(qOverride.hiddenSections || {}) };
      delete updatedHidden[section];
      const updated: ExamGuideConfig = {
        ...prev,
        questionOverrides: {
          ...prev.questionOverrides,
          [numero]: {
            ...qOverride,
            hiddenSections: updatedHidden,
          },
        },
      };
      localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(updated));
      setGuideDirty(true);
      return updated;
    });
  };

  const startEditQuestionGuide = (q: Question) => {
    const base = getPedagogicalGuide(q);
    const override = guideConfig.questionOverrides?.[q.numero];
    setEditGuideDraft({
      competence: override?.custom?.competence ?? base.competence,
      objectif: override?.custom?.objectif ?? base.objectif,
      bloom: override?.custom?.bloom ?? base.bloom,
      baremeDetail: override?.custom?.baremeDetail ?? base.baremeDetail,
      erreursFrequentes: override?.custom?.erreursFrequentes ?? base.erreursFrequentes,
      remediation: override?.custom?.remediation ?? base.remediation,
    });
    setEditingQuestionGuide(q.numero);
  };

  const saveEditedQuestionGuide = (numero: number) => {
    setGuideConfig((prev) => {
      const qOverride = prev.questionOverrides?.[numero] || {};
      const updated: ExamGuideConfig = {
        ...prev,
        questionOverrides: {
          ...prev.questionOverrides,
          [numero]: {
            ...qOverride,
            custom: {
              ...(qOverride.custom || {}),
              ...editGuideDraft,
            },
          },
        },
      };
      localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(updated));
      setGuideDirty(true);
      return updated;
    });
    setEditingQuestionGuide(null);
    toast.success('Fiche didactique de la question mise à jour');
  };

  const resetQuestionGuide = (q: Question) => {
    setGuideConfig((prev) => {
      const copy = { ...(prev.questionOverrides || {}) };
      delete copy[q.numero];
      const updated: ExamGuideConfig = {
        ...prev,
        questionOverrides: copy,
      };
      localStorage.setItem(`pedagogen_guide_config_${id}`, JSON.stringify(updated));
      setGuideDirty(true);
      return updated;
    });
    setEditingQuestionGuide(null);
    toast.success('Fiche réinitialisée aux suggestions par défaut');
  };

  const setNote = (studentId: string, numero: number, raw: string) => {
    const key = `${studentId}:${numero}`;
    if (raw === '') {
      setNotes((prev) => ({ ...prev, [key]: null }));
    } else {
      const v = parseFloat(raw.replace(',', '.'));
      setNotes((prev) => ({ ...prev, [key]: Number.isNaN(v) ? null : v }));
    }
    setDirty(true);
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(() => saveNotes(true), 1200);
  };

  const handleCellKey = (e: React.KeyboardEvent<HTMLInputElement>, studentId: string, numero: number) => {
    if (e.key !== 'Enter' && e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const dir = e.key === 'ArrowUp' ? -1 : 1;
    const idx = students.findIndex((s) => s.id === studentId);
    const next = students[idx + dir];
    if (!next) return;
    const el = document.querySelector<HTMLInputElement>(`input[data-cell="${next.id}:${numero}"]`);
    if (el) { el.focus(); el.select(); }
  };

  const totals = useMemo(() => {
    const map = new Map<string, number | null>();
    for (const s of students) {
      let total: number | null = 0;
      let has = false;
      for (const q of questions) {
        const n = notes[`${s.id}:${q.numero}`];
        if (n !== null && n !== undefined) { total = (total ?? 0) + n; has = true; }
      }
      map.set(s.id, has ? total : null);
    }
    return map;
  }, [students, questions, notes]);

  // ─── Diagnostic de classe rapide (sans saisie individuelle par élève) ───
  const applyDiagnosticToClass = async () => {
    if (students.length === 0) {
      toast.error('Aucun élève associé aux classes de cet examen');
      return;
    }
    setApplyingDiag(true);
    try {
      // Générer une distribution réaliste des notes basée sur le diagnostic global par question
      const newNotes: Record<string, number | null> = {};
      const payload: Array<{ studentId: string; numero: number; note: number }> = [];

      students.forEach((s, sIdx) => {
        // Rang relatif de l'élève (les premiers ont un profil plus fort, les derniers plus fragile)
        const rankRatio = sIdx / Math.max(1, students.length - 1);

        questions.forEach((q) => {
          const diag = classDiagnostics[q.numero] || 'acquis';
          const max = q.bareme;
          let calculatedNote = max;

          if (diag === 'acquis') {
            // ~85% de réussite globale
            calculatedNote = rankRatio > 0.85 ? Math.round(max * 0.4 * 4) / 4 : max;
          } else if (diag === 'partiel') {
            // ~55% de réussite globale
            calculatedNote = rankRatio < 0.35 ? max : rankRatio < 0.75 ? Math.round(max * 0.5 * 4) / 4 : 0;
          } else {
            // ~25% de réussite globale (difficulté)
            calculatedNote = rankRatio < 0.25 ? max : rankRatio < 0.5 ? Math.round(max * 0.25 * 4) / 4 : 0;
          }

          calculatedNote = Math.min(max, Math.max(0, calculatedNote));
          newNotes[`${s.id}:${q.numero}`] = calculatedNote;
          payload.push({ studentId: s.id, numero: q.numero, note: calculatedNote });
        });
      });

      setNotes(newNotes);
      notesRef.current = newNotes;

      // Sauvegarde serveur
      const res = await fetch(`/api/examens/${id}/grille`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: payload }),
      });
      if (!res.ok) throw new Error('Échec de l\'enregistrement');

      toast.success('Bilan de classe appliqué ! Analyse disponible.');
      router.push(`/examens/${id}/analyse`);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'application du bilan');
    } finally {
      setApplyingDiag(false);
    }
  };

  // ─── Import CSV ───
  const handleImportFile = async (file: File) => {
    setImporting(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`/api/examens/${id}/grille/import`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la lecture');
      setImportPreview(data);
      toast.success(`${data.matched.length} élève(s) reconnu(s)`);
    } catch (err: any) {
      toast.error(err.message || 'Échec de l\'import');
    } finally {
      setImporting(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview) return;
    setImporting(true);
    try {
      const payload = importPreview.matched.flatMap((m) =>
        Object.entries(m.notes).map(([numero, note]) => ({ studentId: m.studentId, numero: Number(numero), note }))
      );
      const res = await fetch(`/api/examens/${id}/grille/import/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de l\'enregistrement');
      toast.success(`${data.saved} note(s) importée(s)`);
      setImportOpen(false);
      setImportPreview(null);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Échec de l\'enregistrement');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-teal" />
        </div>
      </PageTransition>
    );
  }

  if (!exam) {
    return (
      <PageTransition>
        <div className="max-w-5xl mx-auto py-20 text-center">
          <p className="text-muted">Évaluation introuvable.</p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={() => router.push('/examens')}>
            ← Retour aux examens
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button
              onClick={() => router.push('/examens')}
              className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft size={13} />Retour aux examens
            </button>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <Compass size={22} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Guide du Professeur</h1>
                    <span className="bg-white/20 text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full backdrop-blur">
                      Étape 2 / 3
                    </span>
                  </div>
                  <p className="text-white/70 text-sm mt-0.5">
                    {exam.titre} — {exam.niveau} — {questions.length} question(s) · {exam.total_points} pts
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/examens/${id}/guide/export`}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white text-teal text-xs font-semibold hover:bg-teal-50 transition-colors shadow-xs"
                  title="Télécharger le guide et le corrigé officiel en PDF"
                >
                  <FileText size={14} />Corrigé & Guide PDF
                </a>
                <a
                  href={`/api/examens/${id}/sujet/export`}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors border border-white/20"
                  title="Télécharger le sujet pour impression élève (PDF)"
                >
                  <FileDown size={14} />Sujet élève PDF
                </a>
                <a
                  href={`/api/examens/${id}/sujet/export?format=html`}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg bg-white/15 text-white text-xs font-medium hover:bg-white/25 transition-colors border border-white/20"
                  title="Télécharger le sujet autonome (HTML)"
                >
                  <FileCode size={14} />Sujet élève HTML
                </a>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-white hover:bg-white/15 border border-white/20"
                  onClick={() => router.push(`/examens/${id}/analyse`)}
                >
                  <BarChart3 size={14} />Analyse de classe ➔
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline didactique */}
        <div className="flex items-center justify-between gap-2 text-xs bg-parchment-dark/50 border border-border/70 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-muted">
            <span className="font-semibold text-navy">Pipeline :</span>
            <span className="text-navy">1. Création ✓</span>
            <span>→</span>
            <span className="text-teal font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal/20">
              2. Guide du Professeur & Diagnostic
            </span>
            <span>→</span>
            <span className="text-muted">3. Analyse de classe</span>
          </div>
          <button
            onClick={() => router.push(`/examens/${id}/analyse`)}
            className="text-teal font-semibold hover:underline flex items-center gap-1 cursor-pointer"
          >
            Accéder à l'analyse <ArrowRight size={13} />
          </button>
        </div>

        {/* Commutateur d'onglets */}
        <div className="flex items-center justify-between border-b border-border/80 pb-2">
          <div className="inline-flex rounded-xl bg-parchment-dark/60 p-1 border border-border/60">
            <button
              onClick={() => setActiveTab('guide')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                activeTab === 'guide'
                  ? 'bg-white text-teal shadow-xs font-bold'
                  : 'text-muted hover:text-navy'
              )}
            >
              <BookOpen size={14} />
              Guide du Professeur & Corrigé ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('grille')}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer',
                activeTab === 'grille'
                  ? 'bg-white text-teal shadow-xs font-bold'
                  : 'text-muted hover:text-navy'
              )}
            >
              <TableProperties size={14} />
              Grille par élève (Optionnelle)
            </button>
          </div>

          {activeTab === 'guide' && (
            <div className="flex items-center gap-2">
              {guideDirty && (
                <Button
                  size="sm"
                  onClick={() => saveGuideConfig()}
                  disabled={savingGuide}
                  className="bg-teal hover:bg-teal-dark text-white font-semibold text-xs shadow-xs"
                >
                  {savingGuide ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Enregistrer le guide
                </Button>
              )}
              <Button
                size="sm"
                onClick={applyDiagnosticToClass}
                disabled={applyingDiag || students.length === 0}
                className="shadow-xs"
              >
                {applyingDiag ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Appliquer à l'analyse de classe ➔
              </Button>
            </div>
          )}

          {activeTab === 'grille' && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => setImportOpen(true)}>
                <Upload size={13} />Importer CSV
              </Button>
              <Button size="sm" onClick={() => saveNotes(false)} disabled={saving || !dirty}>
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                {dirty ? 'Enregistrer' : 'À jour'}
              </Button>
            </div>
          )}
        </div>

        {/* ═══════════════ ONGLET 1 : GUIDE DU PROFESSEUR & CORRIGÉ ═══════════════ */}
        {activeTab === 'guide' && (
          <div className="space-y-6">
            {/* Bannière d'aide au diagnostic rapide */}
            <div className="rounded-xl border border-teal/30 bg-teal-50/40 p-4.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-teal text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-navy">
                    Évaluation rapide & Diagnostic de la classe
                  </h3>
                  <p className="text-xs text-muted mt-0.5 leading-relaxed">
                    Plus besoin de saisir manuellement les notes des {students.length} élèves une par une ! Indiquez simplement le niveau de réussite constaté pour chaque question ci-dessous, puis cliquez sur <strong>« Appliquer à l'analyse de classe »</strong>.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={applyDiagnosticToClass}
                disabled={applyingDiag || students.length === 0}
                className="shrink-0"
              >
                {applyingDiag ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                Générer l'analyse instantanée
              </Button>
            </div>

            {/* BARRE DE CONTRÔLE ET PERSONNALISATION GLOBALE DU GUIDE */}
            <div className="rounded-xl border border-border/80 bg-white p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                    <SlidersHorizontal size={15} />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-navy flex items-center gap-2">
                      Rubriques didactiques affichées
                      {guideDirty && (
                        <span className="text-[10px] lowercase font-normal bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                          (modifications non enregistrées)
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-muted">
                      Activez, personnalisez ou retirez les rubriques didactiques selon vos besoins d&apos;enseignement
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {guideDirty && (
                    <Button
                      size="sm"
                      onClick={() => saveGuideConfig()}
                      disabled={savingGuide}
                      className="bg-teal hover:bg-teal-dark text-white font-semibold text-xs shadow-xs h-8"
                    >
                      {savingGuide ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                      Enregistrer le guide
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={resetAllGuideCustomizations}
                    className="text-xs text-muted hover:text-navy h-8 cursor-pointer"
                    title="Réinitialiser toutes les rubriques par défaut"
                  >
                    <RotateCcw size={12} className="mr-1" /> Réinitialiser tout
                  </Button>
                </div>
              </div>

              {/* 4 Boutons de bascule rapide des rubriques */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => toggleGlobalSection('competence')}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                    guideConfig.visibleSections?.competence !== false
                      ? 'bg-teal-50/60 border-teal/40 text-teal-900 font-semibold shadow-2xs'
                      : 'bg-parchment-dark/30 border-border text-muted line-through opacity-70'
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Target size={13} className={guideConfig.visibleSections?.competence !== false ? 'text-teal' : 'text-muted'} />
                    Finalité &amp; Compétence
                  </span>
                  <span className="text-[10px] ml-1">{guideConfig.visibleSections?.competence !== false ? '✓' : '✕'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleGlobalSection('bloom')}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                    guideConfig.visibleSections?.bloom !== false
                      ? 'bg-teal-50/60 border-teal/40 text-teal-900 font-semibold shadow-2xs'
                      : 'bg-parchment-dark/30 border-border text-muted line-through opacity-70'
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Layers size={13} className={guideConfig.visibleSections?.bloom !== false ? 'text-teal' : 'text-muted'} />
                    Niveau Bloom
                  </span>
                  <span className="text-[10px] ml-1">{guideConfig.visibleSections?.bloom !== false ? '✓' : '✕'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleGlobalSection('erreurs')}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                    guideConfig.visibleSections?.erreurs !== false
                      ? 'bg-amber-50 border-amber-300 text-amber-900 font-semibold shadow-2xs'
                      : 'bg-parchment-dark/30 border-border text-muted line-through opacity-70'
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <AlertTriangle size={13} className={guideConfig.visibleSections?.erreurs !== false ? 'text-amber-700' : 'text-muted'} />
                    Pièges &amp; Erreurs
                  </span>
                  <span className="text-[10px] ml-1">{guideConfig.visibleSections?.erreurs !== false ? '✓' : '✕'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => toggleGlobalSection('remediation')}
                  className={cn(
                    'flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all cursor-pointer',
                    guideConfig.visibleSections?.remediation !== false
                      ? 'bg-teal-50/60 border-teal/40 text-teal-900 font-semibold shadow-2xs'
                      : 'bg-parchment-dark/30 border-border text-muted line-through opacity-70'
                  )}
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Lightbulb size={13} className={guideConfig.visibleSections?.remediation !== false ? 'text-teal' : 'text-muted'} />
                    Piste de remédiation
                  </span>
                  <span className="text-[10px] ml-1">{guideConfig.visibleSections?.remediation !== false ? '✓' : '✕'}</span>
                </button>
              </div>
            </div>

            {/* Liste des fiches didactiques par question */}
            <div className="space-y-6">
              {questions.map((q, idx) => {
                const baseGuide = getPedagogicalGuide(q);
                const override = guideConfig.questionOverrides?.[q.numero];
                const guide: PedagogicalGuide = {
                  competence: override?.custom?.competence ?? baseGuide.competence,
                  objectif: override?.custom?.objectif ?? baseGuide.objectif,
                  bloom: override?.custom?.bloom ?? baseGuide.bloom,
                  baremeDetail: override?.custom?.baremeDetail ?? baseGuide.baremeDetail,
                  erreursFrequentes: override?.custom?.erreursFrequentes ?? baseGuide.erreursFrequentes,
                  remediation: override?.custom?.remediation ?? baseGuide.remediation,
                };

                const isCustomized = Boolean(override?.custom && Object.keys(override.custom).length > 0);
                const showCompetence = (guideConfig.visibleSections?.competence !== false) && !override?.hiddenSections?.competence;
                const showBloom = (guideConfig.visibleSections?.bloom !== false) && !override?.hiddenSections?.bloom;
                const showErreurs = (guideConfig.visibleSections?.erreurs !== false) && !override?.hiddenSections?.erreurs;
                const showRemediation = (guideConfig.visibleSections?.remediation !== false) && !override?.hiddenSections?.remediation;
                const currentDiag = classDiagnostics[q.numero] || 'acquis';

                return (
                  <Card key={q.id} className="overflow-hidden border border-border/80 shadow-xs hover:border-teal/40 transition-all">
                    {/* En-tête de la question */}
                    <div className="bg-parchment-dark/30 border-b border-border/60 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-teal text-white font-display font-bold text-sm flex items-center justify-center shrink-0">
                          Q{idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-navy">
                              Question {idx + 1}
                            </span>
                            <Badge variant="teal">{q.type.toUpperCase()}</Badge>
                            <span className="text-xs font-semibold text-teal bg-white px-2 py-0.5 rounded border border-border/80">
                              {q.bareme} pt{q.bareme > 1 ? 's' : ''}
                            </span>
                            {isCustomized && (
                              <Badge variant="gold" className="text-[10px]">
                                Personnalisé
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Bouton de personnalisation/édition du guide */}
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            if (editingQuestionGuide === q.numero) {
                              setEditingQuestionGuide(null);
                            } else {
                              startEditQuestionGuide(q);
                            }
                          }}
                          className={cn(
                            'h-7.5 px-2.5 text-xs font-medium transition-colors cursor-pointer',
                            editingQuestionGuide === q.numero ? 'bg-teal text-white border-teal' : 'bg-white text-navy hover:bg-parchment-dark/40'
                          )}
                        >
                          <Edit3 size={12} className="mr-1" />
                          {editingQuestionGuide === q.numero ? 'Fermer' : 'Personnaliser'}
                        </Button>

                        {/* Sélecteur de réussite rapide par question */}
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-border/80 shadow-2xs">
                          <span className="text-[11px] text-muted font-medium px-2">Bilan :</span>
                          <button
                            type="button"
                            onClick={() => setClassDiagnostics((prev) => ({ ...prev, [q.numero]: 'acquis' }))}
                            className={cn(
                              'px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer',
                              currentDiag === 'acquis'
                                ? 'bg-green text-white font-semibold shadow-xs'
                                : 'text-muted hover:text-navy hover:bg-parchment-dark/40'
                            )}
                            title="Majorité des élèves ont réussi (~85%)"
                          >
                            🟢 Acquis
                          </button>
                          <button
                            type="button"
                            onClick={() => setClassDiagnostics((prev) => ({ ...prev, [q.numero]: 'partiel' }))}
                            className={cn(
                              'px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer',
                              currentDiag === 'partiel'
                                ? 'bg-amber-500 text-white font-semibold shadow-xs'
                                : 'text-muted hover:text-navy hover:bg-parchment-dark/40'
                            )}
                            title="Environ la moitié des élèves (~55%)"
                          >
                            🟡 Partiel
                          </button>
                          <button
                            type="button"
                            onClick={() => setClassDiagnostics((prev) => ({ ...prev, [q.numero]: 'difficulte' }))}
                            className={cn(
                              'px-2.5 py-1 rounded text-xs font-medium transition-all cursor-pointer',
                              currentDiag === 'difficulte'
                                ? 'bg-red text-white font-semibold shadow-xs'
                                : 'text-muted hover:text-navy hover:bg-parchment-dark/40'
                            )}
                            title="Difficulté collective constatée (< 30%)"
                          >
                            🔴 Non acquis
                          </button>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-5 space-y-5">
                      {/* FORMULAIRE D'ÉDITION INLINE SI ACTIVÉ */}
                      {editingQuestionGuide === q.numero && (
                        <div className="p-4 rounded-xl bg-parchment-dark/30 border border-teal/30 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/60">
                            <div className="flex items-center gap-2">
                              <Edit3 size={14} className="text-teal" />
                              <span className="text-xs font-bold text-navy uppercase tracking-wider">
                                Personnalisation didactique — Question {idx + 1}
                              </span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => resetQuestionGuide(q)}
                              className="text-[11px] h-7 text-muted hover:text-navy cursor-pointer"
                            >
                              <RotateCcw size={11} className="mr-1" /> Valeurs par défaut
                            </Button>
                          </div>

                          {/* Bascules d'inclusion pour cette question */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                              Rubriques affichées pour cette question :
                            </span>
                            <div className="flex flex-wrap items-center gap-2">
                              {[
                                { key: 'competence' as const, label: 'Finalité & Compétence' },
                                { key: 'bloom' as const, label: 'Niveau Bloom' },
                                { key: 'erreurs' as const, label: 'Pièges & Erreurs' },
                                { key: 'remediation' as const, label: 'Piste de remédiation' },
                              ].map((sec) => {
                                const isHidden = !!guideConfig.questionOverrides?.[q.numero]?.hiddenSections?.[sec.key];
                                return (
                                  <label
                                    key={sec.key}
                                    className={cn(
                                      'flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border cursor-pointer select-none transition-all',
                                      !isHidden
                                        ? 'bg-teal-50 border-teal/40 text-teal-900 font-semibold shadow-2xs'
                                        : 'bg-white border-border text-muted opacity-70 line-through'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={!isHidden}
                                      onChange={() => {
                                        if (isHidden) restoreQuestionSection(q.numero, sec.key);
                                        else removeQuestionSection(q.numero, sec.key);
                                      }}
                                      className="rounded text-teal focus:ring-teal h-3.5 w-3.5 cursor-pointer"
                                    />
                                    {sec.label}
                                  </label>
                                );
                              })}
                            </div>
                          </div>

                          {/* Champs de saisie des textes didactiques */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-teal flex items-center gap-1">
                                <Target size={12} /> Finalité &amp; Compétence visée
                              </label>
                              <input
                                type="text"
                                value={editGuideDraft.competence ?? ''}
                                onChange={(e) => setEditGuideDraft((p) => ({ ...p, competence: e.target.value }))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-white text-navy focus:outline-teal"
                                placeholder="Ex: Restitution et discrimination des notions clés..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-teal flex items-center gap-1">
                                <Layers size={12} /> Niveau taxonomique (Bloom)
                              </label>
                              <input
                                type="text"
                                value={editGuideDraft.bloom ?? ''}
                                onChange={(e) => setEditGuideDraft((p) => ({ ...p, bloom: e.target.value }))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-white text-navy focus:outline-teal"
                                placeholder="Ex: Connaissance & Compréhension (Bloom C1/C2)..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-muted">
                                Objectif didactique détaillé
                              </label>
                              <textarea
                                rows={2}
                                value={editGuideDraft.objectif ?? ''}
                                onChange={(e) => setEditGuideDraft((p) => ({ ...p, objectif: e.target.value }))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-white text-navy focus:outline-teal resize-y"
                                placeholder="Détail de l'objectif visé par la question..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-muted">
                                Barème indicatif &amp; critères
                              </label>
                              <textarea
                                rows={2}
                                value={editGuideDraft.baremeDetail ?? ''}
                                onChange={(e) => setEditGuideDraft((p) => ({ ...p, baremeDetail: e.target.value }))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-white text-navy focus:outline-teal resize-y"
                                placeholder="Critères d'attribution des points..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-amber-800 flex items-center gap-1">
                                <AlertTriangle size={12} /> Pièges &amp; Erreurs fréquentes anticipées
                              </label>
                              <textarea
                                rows={2}
                                value={editGuideDraft.erreursFrequentes ?? ''}
                                onChange={(e) => setEditGuideDraft((p) => ({ ...p, erreursFrequentes: e.target.value }))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-white text-navy focus:outline-amber-600 resize-y"
                                placeholder="Confusion courante ou mauvais réflexe des élèves..."
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[11px] font-bold text-navy flex items-center gap-1">
                                <Lightbulb size={12} className="text-teal" /> Piste de remédiation conseillée en classe
                              </label>
                              <textarea
                                rows={2}
                                value={editGuideDraft.remediation ?? ''}
                                onChange={(e) => setEditGuideDraft((p) => ({ ...p, remediation: e.target.value }))}
                                className="w-full text-xs p-2 rounded-lg border border-border bg-white text-navy focus:outline-teal resize-y"
                                placeholder="Activité ou questionnement pour remédier à l'erreur..."
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingQuestionGuide(null)}
                              className="text-xs h-8 cursor-pointer"
                            >
                              Annuler
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEditedQuestionGuide(q.numero)}
                              className="bg-teal hover:bg-teal-dark text-white font-semibold text-xs h-8 shadow-xs cursor-pointer"
                            >
                              <Check size={12} /> Valider la fiche
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* 1. Énoncé */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Eye size={13} className="text-teal" />
                          Énoncé soumis à l'élève
                        </span>
                        <div className="p-3.5 rounded-xl bg-parchment-dark/20 border border-border/60 text-sm text-navy leading-relaxed font-medium">
                          {q.enonce || <span className="italic text-muted">Aucun énoncé saisi.</span>}
                        </div>
                        {q.image_url && (
                          <div className="mt-2 w-48 h-32 rounded-lg border border-border overflow-hidden bg-white">
                            <img src={q.image_url} alt="" className="w-full h-full object-contain p-1" />
                          </div>
                        )}
                      </div>

                      {/* 2. Finalité pédagogique & Niveau taxonomique (Bloom) */}
                      {(showCompetence || showBloom) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 p-3.5 rounded-xl bg-teal-50/30 border border-teal/20 relative">
                          {showCompetence && (
                            <div className={cn('space-y-1 relative', !showBloom && 'col-span-full')}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-teal flex items-center gap-1.5">
                                  <Target size={13} />
                                  Finalité &amp; Compétence visée
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeQuestionSection(q.numero, 'competence')}
                                  title="Retirer cette rubrique pour cette question"
                                  className="text-teal/40 hover:text-red hover:bg-white rounded p-1 transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <p className="text-xs text-navy font-medium leading-relaxed">
                                {guide.competence}
                              </p>
                              <p className="text-[11px] text-muted leading-relaxed">
                                {guide.objectif}
                              </p>
                            </div>
                          )}

                          {showBloom && (
                            <div className={cn(
                              'space-y-1 relative',
                              showCompetence ? 'border-t md:border-t-0 md:border-l border-teal/20 pt-2 md:pt-0 md:pl-3.5' : 'col-span-full'
                            )}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-teal flex items-center gap-1.5">
                                  <Layers size={13} />
                                  Niveau taxonomique (Bloom)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeQuestionSection(q.numero, 'bloom')}
                                  title="Retirer cette rubrique pour cette question"
                                  className="text-teal/40 hover:text-red hover:bg-white rounded p-1 transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <p className="text-xs text-navy font-semibold">
                                {guide.bloom}
                              </p>
                              <p className="text-[11px] text-muted">
                                Barème indicatif : {guide.baremeDetail}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 3. Corrigé officiel & Réponses attendues */}
                      <div className="space-y-2.5">
                        <span className="text-xs font-bold text-green flex items-center gap-1.5">
                          <CheckCircle2 size={14} />
                          Corrigé officiel & Réponses attendues
                        </span>

                        {/* Rendu Corrigé selon le type */}
                        {q.type === 'qcm' && (() => {
                          const rawOpts = q.options;
                          const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
                          const opts: any[] = isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : []);
                          const qcmMode = (isObj && rawOpts.qcm_mode) || 'multiple';

                          return (
                            <div className="space-y-2">
                              <p className="text-[11px] text-muted italic">
                                Mode : {qcmMode === 'single' ? 'Choix unique (1 seule bonne réponse)' : 'Choix multiples'}
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {opts.map((opt, idx) => {
                                  const letter = String.fromCharCode(65 + idx);
                                  const isCorrect = !!opt.isCorrect;
                                  return (
                                    <div
                                      key={idx}
                                      className={cn(
                                        'p-2.5 rounded-lg border text-xs flex items-center justify-between gap-2',
                                        isCorrect
                                          ? 'bg-green-50/80 border-green/50 text-navy font-semibold'
                                          : 'bg-white border-border text-muted opacity-80'
                                      )}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="font-mono font-bold">{letter}.</span>
                                        <span>{opt.text || `Proposition ${letter}`}</span>
                                      </div>
                                      {isCorrect ? (
                                        <Badge variant="green" className="text-[10px]">
                                          <Check size={10} className="mr-0.5 inline" />Bonne réponse
                                        </Badge>
                                      ) : (
                                        <span className="text-[10px] text-muted">Distracteur</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}

                        {q.type === 'vrai_faux' && (() => {
                          const items: any[] = Array.isArray(q.options) ? q.options : [];
                          return (
                            <div className="space-y-2">
                              {items.map((it, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg border border-border bg-white text-xs flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-navy">{idx + 1}.</span>
                                    <span className="text-navy">{it.text}</span>
                                  </div>
                                  <Badge variant={it.isVrai ? 'green' : 'red'}>
                                    {it.isVrai ? '✓ VRAI' : '✗ FAUX'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {q.type === 'tableau' && (() => {
                          const tableData = (q.options?.columns && q.options?.rows)
                            ? q.options
                            : { columns: ['Colonne 1', 'Colonne 2'], rows: [] };
                          return (
                            <div className="overflow-x-auto rounded-lg border border-border bg-white">
                              <table className="w-full text-xs text-left border-collapse">
                                <thead>
                                  <tr className="bg-teal/5 border-b border-border text-navy font-bold">
                                    {tableData.columns.map((c: string, ci: number) => (
                                      <th key={ci} className="p-2.5">{c}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                  {tableData.rows.map((r: any, ri: number) => (
                                    <tr key={ri} className="hover:bg-parchment-dark/20">
                                      {tableData.columns.map((_: any, ci: number) => {
                                        const cellVal = r.cells ? r.cells[ci] : '';
                                        return (
                                          <td key={ci} className="p-2.5">
                                            {cellVal ? (
                                              <span className="font-semibold text-navy">{cellVal}</span>
                                            ) : (
                                              <span className="text-green font-semibold bg-green-50 px-2 py-0.5 rounded border border-green/30">
                                                [Réponse attendue de l'élève]
                                              </span>
                                            )}
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}

                        {q.type === 'appariement' && (() => {
                          const pairs: any[] = Array.isArray(q.options) ? q.options : [];
                          return (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {pairs.map((p, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg border border-border bg-white text-xs flex items-center justify-between gap-2">
                                  <span className="font-semibold text-navy">{p.left}</span>
                                  <span className="text-teal font-bold">════▶</span>
                                  <span className="font-semibold text-teal-dark">{p.right}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {q.type === 'exercice' && (() => {
                          const sqs: any[] = Array.isArray(q.options) ? q.options : [];
                          return (
                            <div className="space-y-2">
                              {sqs.map((sq, idx) => (
                                <div key={idx} className="p-2.5 rounded-lg border border-border bg-white text-xs">
                                  <span className="font-bold text-navy font-mono mr-2">{idx + 1})</span>
                                  <span className="text-navy">{sq.text}</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}

                        {q.type === 'ouvert' && (
                          <div className="p-3.5 rounded-xl bg-white border border-border/80 text-xs text-navy leading-relaxed space-y-1">
                            <span className="font-bold text-teal">Critères & Mots-clés attendus :</span>
                            <p>{q.options?.reponse_attendue || 'Réponse structurée avec vocabulaire technique précis.'}</p>
                          </div>
                        )}
                      </div>

                      {/* 4. Erreurs fréquentes & Conseils de remédiation */}
                      {(showErreurs || showRemediation) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border/60">
                          {showErreurs && (
                            <div className={cn('p-3 rounded-lg bg-amber-50/50 border border-amber-200/60 space-y-1 relative', !showRemediation && 'col-span-full')}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                  <AlertTriangle size={13} />
                                  Pièges &amp; Erreurs fréquentes anticipées
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeQuestionSection(q.numero, 'erreurs')}
                                  title="Retirer cette rubrique pour cette question"
                                  className="text-amber-800/40 hover:text-red hover:bg-white rounded p-1 transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <p className="text-[11px] text-amber-900/90 leading-relaxed">
                                {guide.erreursFrequentes}
                              </p>
                            </div>
                          )}

                          {showRemediation && (
                            <div className={cn('p-3 rounded-lg bg-parchment-dark/40 border border-border space-y-1 relative', !showErreurs && 'col-span-full')}>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-navy flex items-center gap-1.5">
                                  <Lightbulb size={13} className="text-teal" />
                                  Piste de remédiation conseillée en classe
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeQuestionSection(q.numero, 'remediation')}
                                  title="Retirer cette rubrique pour cette question"
                                  className="text-muted hover:text-red hover:bg-white rounded p-1 transition-colors cursor-pointer"
                                >
                                  <X size={12} />
                                </button>
                              </div>
                              <p className="text-[11px] text-muted leading-relaxed">
                                {guide.remediation}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Rubriques masquées spécifiquement pour cette question */}
                      {(!showCompetence || !showBloom || !showErreurs || !showRemediation) && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted">
                          <span className="font-medium">Rubrique(s) masquée(s) :</span>
                          {!showCompetence && (
                            <button
                              type="button"
                              onClick={() => restoreQuestionSection(q.numero, 'competence')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-parchment-dark/50 hover:bg-parchment-dark text-navy cursor-pointer transition-colors"
                            >
                              + Réafficher Finalité &amp; Compétence
                            </button>
                          )}
                          {!showBloom && (
                            <button
                              type="button"
                              onClick={() => restoreQuestionSection(q.numero, 'bloom')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-parchment-dark/50 hover:bg-parchment-dark text-navy cursor-pointer transition-colors"
                            >
                              + Réafficher Niveau Bloom
                            </button>
                          )}
                          {!showErreurs && (
                            <button
                              type="button"
                              onClick={() => restoreQuestionSection(q.numero, 'erreurs')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-parchment-dark/50 hover:bg-parchment-dark text-navy cursor-pointer transition-colors"
                            >
                              + Réafficher Pièges &amp; Erreurs
                            </button>
                          )}
                          {!showRemediation && (
                            <button
                              type="button"
                              onClick={() => restoreQuestionSection(q.numero, 'remediation')}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-parchment-dark/50 hover:bg-parchment-dark text-navy cursor-pointer transition-colors"
                            >
                              + Réafficher Remédiation
                            </button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════ ONGLET 2 : GRILLE DE SAISIE PAR ÉLÈVE (OPTIONNELLE) ═══════════════ */}
        {activeTab === 'grille' && (
          <div className="space-y-5">
            {/* 1. FILTRE PAR CLASSE & EN-TÊTE DIDACTIQUE */}
            <div className="rounded-2xl border border-border/80 bg-white p-4.5 shadow-2xs space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center shrink-0">
                    <Users size={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-navy">
                      Filtrer par classe
                    </h3>
                    <p className="text-[11px] text-muted">
                      Affichage ciblé par classe pour une saisie fluide.
                    </p>
                  </div>
                </div>

                {/* Sélecteur de mode de vue */}
                <div className="inline-flex rounded-xl bg-parchment-dark/50 p-1 border border-border/60">
                  <button
                    type="button"
                    onClick={() => setGrilleViewMode('choice')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer',
                      grilleViewMode === 'choice'
                        ? 'bg-teal text-white shadow-xs font-bold'
                        : 'text-muted hover:text-navy'
                    )}
                  >
                    <Sparkles size={13} />
                    Saisie par Question &amp; Choix
                  </button>
                  <button
                    type="button"
                    onClick={() => setGrilleViewMode('matrix')}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer',
                      grilleViewMode === 'matrix'
                        ? 'bg-white text-teal shadow-xs font-bold'
                        : 'text-muted hover:text-navy'
                    )}
                  >
                    <TableProperties size={13} />
                    Tableau Récapitulatif
                  </button>
                </div>
              </div>

              {/* Boutons de sélection de classe */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedClass('all')}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border',
                    selectedClass === 'all'
                      ? 'bg-teal text-white border-teal shadow-xs'
                      : 'bg-parchment-dark/30 text-navy border-border/80 hover:bg-parchment-dark/60'
                  )}
                >
                  Toutes les classes ({students.length})
                </button>
                {classList.map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setSelectedClass(c.name)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5',
                      selectedClass === c.name
                        ? 'bg-teal text-white border-teal shadow-xs'
                        : 'bg-white text-navy border-border/80 hover:bg-parchment-dark/40'
                    )}
                  >
                    <span>{c.name}</span>
                    <span
                      className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px]',
                        selectedClass === c.name
                          ? 'bg-white/20 text-white'
                          : 'bg-parchment-dark text-muted font-mono'
                      )}
                    >
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {students.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-16 text-center">
                <p className="text-sm text-muted font-medium">Aucun élève dans les classes de cet examen</p>
                <p className="text-xs text-muted/60 mt-1">Ajoutez des élèves dans les classes concernées pour utiliser la grille individuelle.</p>
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="rounded-xl border border-border bg-white p-12 text-center">
                <p className="text-sm text-muted font-medium">Aucun élève trouvé pour la classe « {selectedClass} »</p>
                <Button variant="secondary" size="sm" className="mt-3 text-xs" onClick={() => setSelectedClass('all')}>
                  Voir toutes les classes
                </Button>
              </div>
            ) : grilleViewMode === 'choice' ? (
              /* ═══════════════ MODE A : SAISIE PAR QUESTION & CHOIX ═══════════════ */
              <div className="space-y-4">
                {/* 2. BARRE DE NAVIGATION DES QUESTIONS */}
                <div className="rounded-2xl border border-border/80 bg-white p-3 shadow-2xs">
                  <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={activeQuestionIdx === 0}
                      onClick={() => setActiveQuestionIdx((prev) => Math.max(0, prev - 1))}
                      className="h-8 px-2 text-xs shrink-0"
                    >
                      <ChevronLeft size={14} /> Q Préc.
                    </Button>

                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                      {questions.map((q, idx) => {
                        const isActive = idx === activeQuestionIdx;
                        const answeredCount = filteredStudents.filter((s) => {
                          const ans = studentAnswers[`${s.id}:${q.numero}`];
                          return ans && ans.choiceKey;
                        }).length;
                        const allAnswered = filteredStudents.length > 0 && answeredCount === filteredStudents.length;

                        return (
                          <button
                            key={q.id}
                            type="button"
                            onClick={() => setActiveQuestionIdx(idx)}
                            className={cn(
                              'flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shrink-0 cursor-pointer border',
                              isActive
                                ? 'bg-teal text-white border-teal shadow-xs'
                                : allAnswered
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-parchment-dark/30 text-navy border-border hover:bg-parchment-dark/60'
                            )}
                          >
                            <span>Q{idx + 1}</span>
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                                isActive ? 'bg-white/25 text-white' : 'bg-white text-muted border border-border/60'
                              )}
                            >
                              /{q.bareme}
                            </span>
                            {allAnswered && (
                              <CheckCircle2 size={12} className={isActive ? 'text-white' : 'text-emerald-600'} />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={activeQuestionIdx >= questions.length - 1}
                      onClick={() => setActiveQuestionIdx((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="h-8 px-2 text-xs shrink-0"
                    >
                      Q Suiv. <ChevronRight size={14} />
                    </Button>
                  </div>
                </div>

                {/* 3. CARTE DE LA QUESTION ACTIVE & CHOIX ASSOCIÉS */}
                {currentQuestion && (
                  <Card className="border border-border/80 shadow-xs overflow-hidden">
                    {/* Header Question */}
                    <div className="bg-parchment-dark/40 border-b border-border/60 p-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-xl bg-teal text-white font-display font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs">
                          Q{activeQuestionIdx + 1}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-navy">Question {activeQuestionIdx + 1}</span>
                            <Badge variant="teal">{currentQuestion.type.toUpperCase()}</Badge>
                            <span className="text-xs font-semibold text-teal bg-white px-2 py-0.5 rounded border border-border/80">
                              {currentQuestion.bareme} pt{currentQuestion.bareme > 1 ? 's' : ''}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted">
                            Classe active : <strong>{selectedClass === 'all' ? 'Toutes les classes' : selectedClass}</strong> ({filteredStudents.length} élèves)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveNotes(false)}
                          disabled={saving}
                          className="bg-teal hover:bg-teal-dark text-white font-semibold text-xs shadow-xs"
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
                          Valider &amp; Enregistrer aux profils
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-5 space-y-5">
                      {/* Énoncé */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-muted uppercase tracking-wider flex items-center gap-1.5">
                          <Eye size={13} className="text-teal" /> Énoncé de la question
                        </span>
                        <div className="p-3.5 rounded-xl bg-parchment-dark/20 border border-border/60 text-sm text-navy font-medium leading-relaxed">
                          {currentQuestion.enonce || <span className="italic text-muted">Aucun énoncé saisi.</span>}
                        </div>
                        {currentQuestion.image_url && (
                          <div className="mt-2 w-48 h-32 rounded-lg border border-border overflow-hidden bg-white">
                            <img src={currentQuestion.image_url} alt="" className="w-full h-full object-contain p-1" />
                          </div>
                        )}
                      </div>

                      {/* CHOIX ET PROPOSITIONS DE LA QUESTION */}
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                            <ListOrdered size={14} className="text-teal" /> Choix proposés dans cette question :
                          </span>
                          <span className="text-[11px] text-muted">
                            Visualisez ou sélectionnez directement les élèves pour chaque option
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {currentChoices.map((choice) => {
                            const studentsWithChoice = filteredStudents.filter((s) => {
                              const ans = studentAnswers[`${s.id}:${currentQuestion.numero}`];
                              return ans && ans.choiceKey === choice.key;
                            });

                            return (
                              <div
                                key={choice.key}
                                className={cn(
                                  'p-3.5 rounded-xl border flex flex-col justify-between transition-all bg-white shadow-2xs',
                                  choice.isCorrect ? 'border-emerald-300/80 bg-emerald-50/20' : 'border-border/80'
                                )}
                              >
                                <div>
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      <span
                                        className={cn(
                                          'w-6 h-6 rounded-md font-mono font-bold text-xs flex items-center justify-center shrink-0',
                                          choice.isCorrect ? 'bg-emerald-600 text-white' : 'bg-parchment-dark text-navy'
                                        )}
                                      >
                                        {choice.key}
                                      </span>
                                      <span className="text-xs font-semibold text-navy leading-tight line-clamp-2">
                                        {choice.text}
                                      </span>
                                    </div>
                                    <Badge
                                      variant={choice.isCorrect ? 'green' : 'muted'}
                                      className="text-[10px] shrink-0"
                                    >
                                      {choice.isCorrect ? `✓ Correct (+${choice.note} pt)` : `0 pt`}
                                    </Badge>
                                  </div>

                                  {/* Liste des élèves ayant choisi cette option */}
                                  <div className="mt-2.5 pt-2 border-t border-border/50">
                                    <div className="flex items-center justify-between text-[11px] text-muted mb-1.5">
                                      <span>Élèves ayant choisi ce choix :</span>
                                      <strong className="text-navy">{studentsWithChoice.length}</strong>
                                    </div>

                                    <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                                      {studentsWithChoice.length === 0 ? (
                                        <span className="text-[10px] text-muted/60 italic">Aucun élève</span>
                                      ) : (
                                        studentsWithChoice.map((st) => (
                                          <span
                                            key={st.id}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-border text-[11px] font-medium text-navy shadow-2xs"
                                          >
                                            <span>{st.prenom} {st.nom.charAt(0)}.</span>
                                            <button
                                              type="button"
                                              onClick={() => assignChoice(st.id, currentQuestion, null)}
                                              className="text-muted hover:text-red transition-colors cursor-pointer"
                                              title="Retirer ce choix pour cet élève"
                                            >
                                              <X size={10} />
                                            </button>
                                          </span>
                                        ))
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => openBulkModal(choice)}
                                  className="mt-3 w-full text-[11px] h-7 border-border hover:bg-teal-50 hover:text-teal hover:border-teal/40"
                                >
                                  + Sélectionner des élèves ({studentsWithChoice.length})
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* 4. TABLEAU DES ÉLÈVES & CLIC RAPIDE POUR ASSIGNER */}
                      <div className="space-y-3 pt-2 border-t border-border/60">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-navy uppercase tracking-wider flex items-center gap-1.5">
                              <Users size={14} className="text-teal" /> Saisie rapide par élève ({filteredStudents.length} élèves) :
                            </span>
                            <p className="text-[11px] text-muted">
                              Sélectionnez l&apos;option choisie par chaque élève en un clic.
                            </p>
                          </div>

                          {/* Outils groupés */}
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={assignAllUnassignedCorrect}
                              className="text-xs h-7 text-emerald-800 border-emerald-200 bg-emerald-50/50 hover:bg-emerald-100"
                              title="Attribue la bonne réponse aux élèves sans choix pour cette question"
                            >
                              <CheckCheck size={13} className="text-emerald-600 mr-1" />
                              Bonne réponse aux non notés
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={resetCurrentQuestion}
                              className="text-xs h-7 text-muted hover:text-red hover:bg-red-50"
                              title="Réinitialiser les réponses pour cette question"
                            >
                              <RotateCcw size={12} className="mr-1" /> Réinitialiser Q{currentQuestion.numero}
                            </Button>
                          </div>
                        </div>

                        {/* Liste des élèves avec boutons d'options */}
                        <div className="rounded-xl border border-border bg-white overflow-hidden shadow-2xs divide-y divide-border/60">
                          {filteredStudents.map((st) => {
                            const currentAns = studentAnswers[`${st.id}:${currentQuestion.numero}`];
                            const currentGrade = notes[`${st.id}:${currentQuestion.numero}`];

                            return (
                              <div
                                key={st.id}
                                className="p-3 flex flex-wrap items-center justify-between gap-3 hover:bg-parchment-dark/15 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center font-bold text-xs shrink-0">
                                    {st.nom.charAt(0)}{st.prenom.charAt(0)}
                                  </div>
                                  <div>
                                    <span className="text-xs font-bold text-navy block">
                                      {st.nom} {st.prenom}
                                    </span>
                                    <div className="flex items-center gap-2 text-[10px] text-muted">
                                      <span>{st.classe_nom}</span>
                                      <span>•</span>
                                      <span className="font-mono">{st.cne || 'Sans CNE'}</span>
                                    </div>
                                  </div>
                                </div>

                                {/* État actuel & Boutons de choix */}
                                <div className="flex items-center gap-2">
                                  {/* Badge note actuelle */}
                                  <div className="text-right mr-2 hidden sm:block">
                                    {currentAns ? (
                                      <span
                                        className={cn(
                                          'text-[11px] font-bold px-2 py-0.5 rounded-full border',
                                          currentAns.isCorrect
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : 'bg-rose-50 text-rose-700 border-rose-200'
                                        )}
                                      >
                                        Choix {currentAns.choiceKey} ({currentGrade ?? 0} pt)
                                      </span>
                                    ) : (
                                      <span className="text-[11px] text-muted italic">Non répondu</span>
                                    )}
                                  </div>

                                  {/* Boutons d'options pour cet élève */}
                                  <div className="inline-flex rounded-lg border border-border/80 bg-parchment-dark/30 p-0.5 gap-1">
                                    {currentChoices.map((choice) => {
                                      const isSelected = currentAns?.choiceKey === choice.key;
                                      return (
                                        <button
                                          key={choice.key}
                                          type="button"
                                          onClick={() => assignChoice(st.id, currentQuestion, choice)}
                                          className={cn(
                                            'px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer',
                                            isSelected
                                              ? choice.isCorrect
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : 'bg-rose-600 text-white shadow-xs'
                                              : 'text-navy hover:bg-white'
                                          )}
                                          title={`${choice.key}: ${choice.text} (${choice.isCorrect ? 'Correct' : 'Faux'})`}
                                        >
                                          {choice.key}
                                          {choice.isCorrect && <span className="text-[9px] ml-0.5">✓</span>}
                                        </button>
                                      );
                                    })}

                                    {/* Bouton pour effacer */}
                                    {currentAns && (
                                      <button
                                        type="button"
                                        onClick={() => assignChoice(st.id, currentQuestion, null)}
                                        className="px-1.5 py-1 text-muted hover:text-red hover:bg-white rounded transition-colors cursor-pointer"
                                        title="Effacer le choix"
                                      >
                                        <X size={12} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Barre de validation finale Done */}
                      <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                        <div className="text-xs text-muted">
                          💡 Vos saisies sont calculées en continu. Cliquez sur <strong>« Valider &amp; Enregistrer aux profils »</strong> pour enregistrer les notes et réponses au quiz dans le profil des élèves.
                        </div>
                        <Button
                          size="sm"
                          onClick={() => saveNotes(false)}
                          disabled={saving}
                          className="bg-teal hover:bg-teal-dark text-white font-bold text-xs shadow-xs px-4"
                        >
                          {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={14} />}
                          Valider &amp; Enregistrer aux profils
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              /* ═══════════════ MODE B : GRILLE RÉCAPITULATIVE COMPLÈTE ═══════════════ */
              <div className="rounded-xl border border-border bg-white overflow-x-auto shadow-2xs">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="bg-parchment-dark/50 border-b border-border text-xs text-muted">
                      <th className="text-left font-medium px-4 py-2.5">Élève</th>
                      <th className="text-left font-medium px-2 py-2.5">CNE</th>
                      {questions.map((q, idx) => (
                        <th key={q.id} className="font-medium px-2 py-2.5 text-center" title={q.enonce}>
                          Q{idx + 1} <span className="opacity-60">/{q.bareme}</span>
                        </th>
                      ))}
                      <th className="font-medium px-3 py-2.5 text-center">Total /{exam.total_points}</th>
                      <th className="font-medium px-3 py-2.5 text-center">/20</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((s) => {
                      const total = totals.get(s.id) ?? null;
                      const norm20 = total === null ? null : Math.round(((total / exam.total_points) * 20) * 100) / 100;
                      return (
                        <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-parchment-dark/20 transition-colors">
                          <td className="px-4 py-2">
                            <span className="font-medium text-navy text-xs">{s.nom} {s.prenom}</span>
                            <span className="block text-[10px] text-muted">{s.classe_nom}</span>
                          </td>
                          <td className="px-2 py-2 text-[11px] text-muted font-mono">{s.cne || '—'}</td>
                          {questions.map((q) => {
                            const val = notes[`${s.id}:${q.numero}`];
                            return (
                              <td key={q.id} className="px-1.5 py-1.5 text-center">
                                <input
                                  type="number"
                                  step="0.25"
                                  min="0"
                                  max={q.bareme}
                                  data-cell={`${s.id}:${q.numero}`}
                                  value={val ?? ''}
                                  onChange={(e) => setNote(s.id, q.numero, e.target.value)}
                                  onKeyDown={(e) => handleCellKey(e, s.id, q.numero)}
                                  className={`w-16 px-1.5 py-1 text-xs text-center rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-teal ${noteColorClass(val ?? null, q.bareme, exam.total_points)}`}
                                  placeholder="—"
                                  aria-label={`Note de ${s.nom} ${s.prenom} pour Q${q.numero}`}
                                />
                              </td>
                            );
                          })}
                          <td className={`px-3 py-2 text-center text-xs font-bold rounded-md ${totalColorClass(total, exam.total_points)}`}>
                            {total === null ? '—' : Math.round(total * 100) / 100}
                          </td>
                          <td className={`px-3 py-2 text-center text-xs font-bold ${totalColorClass(total, exam.total_points)}`}>
                            {norm20 ?? '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal de sélection en masse d'élèves pour un choix */}
        <Modal
          open={bulkModalChoice !== null}
          onClose={() => setBulkModalChoice(null)}
          title={`Attribuer l'option ${bulkModalChoice?.key || ''} aux élèves`}
        >
          {bulkModalChoice && currentQuestion && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-parchment-dark/30 border border-border text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-navy">Option {bulkModalChoice.key} :</span>
                  <span className="font-semibold text-navy">{bulkModalChoice.text}</span>
                </div>
                <div className="flex items-center gap-2 pt-1 text-[11px]">
                  <Badge variant={bulkModalChoice.isCorrect ? 'green' : 'muted'}>
                    {bulkModalChoice.isCorrect ? `✓ Bonne réponse (+${bulkModalChoice.note} pt)` : '0 pt'}
                  </Badge>
                  <span className="text-muted">
                    Classe : <strong>{selectedClass === 'all' ? 'Toutes' : selectedClass}</strong>
                  </span>
                </div>
              </div>

              {/* Barre de recherche et actions globales */}
              <div className="flex items-center justify-between gap-2">
                <input
                  type="text"
                  placeholder="Rechercher un élève..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs focus:outline-none focus:ring-1 focus:ring-teal w-full max-w-xs"
                />
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7"
                    onClick={() => {
                      const allIds = new Set(filteredStudents.map((s) => s.id));
                      setBulkSelectedStudents(allIds);
                    }}
                  >
                    Tout cocher
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[11px] h-7 text-muted"
                    onClick={() => setBulkSelectedStudents(new Set())}
                  >
                    Tout décocher
                  </Button>
                </div>
              </div>

              {/* Liste à cocher */}
              <div className="max-h-64 overflow-y-auto rounded-xl border border-border divide-y divide-border/60">
                {filteredStudents
                  .filter((s) =>
                    !studentSearch ||
                    `${s.nom} ${s.prenom}`.toLowerCase().includes(studentSearch.toLowerCase()) ||
                    s.cne?.toLowerCase().includes(studentSearch.toLowerCase())
                  )
                  .map((s) => {
                    const isChecked = bulkSelectedStudents.has(s.id);
                    return (
                      <label
                        key={s.id}
                        className="p-2.5 flex items-center justify-between gap-3 text-xs hover:bg-parchment-dark/20 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              const next = new Set(bulkSelectedStudents);
                              if (e.target.checked) next.add(s.id);
                              else next.delete(s.id);
                              setBulkSelectedStudents(next);
                            }}
                            className="rounded text-teal focus:ring-teal h-4 w-4"
                          />
                          <div>
                            <span className="font-semibold text-navy block">{s.nom} {s.prenom}</span>
                            <span className="text-[10px] text-muted font-mono">{s.classe_nom} · {s.cne || '—'}</span>
                          </div>
                        </div>

                        {isChecked && (
                          <span className="text-[10px] font-bold text-teal bg-teal-50 px-2 py-0.5 rounded border border-teal/20">
                            Sélectionné
                          </span>
                        )}
                      </label>
                    );
                  })}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-xs text-muted">
                  <strong>{bulkSelectedStudents.size}</strong> élève(s) sélectionné(s)
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setBulkModalChoice(null)}>
                    Annuler
                  </Button>
                  <Button size="sm" onClick={confirmBulkAssign}>
                    Valider la sélection ({bulkSelectedStudents.size})
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Modal d'import CSV */}
        <Modal open={importOpen} onClose={() => { setImportOpen(false); setImportPreview(null); }} title="Importer des notes (CSV)">
          {!importPreview ? (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Fichier CSV avec colonnes <strong className="text-navy">CNE</strong> (ou nom + prénom) et une colonne par question (<code className="text-xs bg-parchment-dark px-1 rounded">Q1;Q2;...</code>).
              </p>
              <label className="block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all border-border hover:border-teal/50 hover:bg-parchment-dark/50">
                <input
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); }}
                />
                {importing ? <Loader2 size={24} className="text-teal mx-auto animate-spin" /> : <Upload size={24} className="text-muted mx-auto mb-2" />}
                <span className="text-sm font-medium text-navy">{importing ? 'Analyse...' : 'Choisir un fichier CSV'}</span>
              </label>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 size={16} className="text-green" />
                <span className="text-navy font-medium">{importPreview.matched.length} élève(s) reconnu(s)</span>
                {importPreview.unmatched.length > 0 && (
                  <Badge variant="gold">{importPreview.unmatched.length} non reconnu(s)</Badge>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" size="sm" onClick={() => { setImportPreview(null); }}>Annuler</Button>
                <Button size="sm" onClick={confirmImport} disabled={importing || importPreview.matched.length === 0}>
                  {importing ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                  Enregistrer les notes
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
