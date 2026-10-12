'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Loader2, Save, Plus, Trash2, ClipboardCheck, BookMarked,
  Trash, Image as ImageIcon, X, CheckSquare, CheckCircle2, ArrowRightLeft,
  ListChecks, FileQuestion, Eye, TableProperties, Rows, Columns, Sparkles,
  ChevronUp, ChevronDown, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { PageTransition } from '@/components/layout/PageTransition';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/utils/cn';
import type { CollegeClass } from '@/types/student';

const QUESTION_TYPES = [
  { value: 'qcm', label: 'QCM (Choix de réponses)' },
  { value: 'tableau', label: 'Tableau / Grille à compléter' },
  { value: 'vrai_faux', label: 'Vrai / Faux' },
  { value: 'ouvert', label: 'Question ouverte' },
  { value: 'appariement', label: 'Appariement (Relier)' },
  { value: 'exercice', label: 'Exercice guidé' },
  { value: 'section', label: '§ Séparateur / Partie' },
];

export interface QcmChoice {
  id: string;
  text: string;
  isCorrect?: boolean;
  image_url?: string;
  isOther?: boolean;
}

export interface TableQuestionData {
  columns: string[];
  rows: Array<{
    id: string;
    cells: string[];
  }>;
}

export interface VraiFauxItem {
  id: string;
  text: string;
  isVrai: boolean;
}

export interface AppariementPair {
  id: string;
  left: string;
  right: string;
}

export interface SousQuestionItem {
  id: string;
  text: string;
}

interface QuestionDraft {
  key: number;
  type: string;
  enonce: string;
  bareme: string;
  options: any;
  image_url?: string;
  reponse_attendue?: string;
  layout?: 'vertical' | 'horizontal';
  qcm_mode?: 'single' | 'multiple';
  all_correct?: boolean;
}

interface BankQuestion {
  id: string;
  type: string;
  enonce: string;
  bareme: number;
  options?: any;
  image_url?: string;
}

function defaultOptionsForType(type: string): any {
  switch (type) {
    case 'qcm':
      return [
        { id: 'opt_1', text: '', isCorrect: true },
        { id: 'opt_2', text: '', isCorrect: false },
        { id: 'opt_3', text: '', isCorrect: false },
      ];
    case 'tableau':
      return {
        columns: ['Périphérique / Élément', 'Type (Matériel / Logiciel)', 'Rôle principal'],
        rows: [
          { id: 'row_1', cells: ['Clavier', 'Matériel', 'Saisie de caractères'] },
          { id: 'row_2', cells: ['Windows 10', 'Logiciel', 'Système d\'exploitation'] },
          { id: 'row_3', cells: ['Souris', '', ''] },
        ],
      };
    case 'vrai_faux':
      return [
        { id: 'vf_1', text: '', isVrai: true },
        { id: 'vf_2', text: '', isVrai: false },
      ];
    case 'appariement':
      return [
        { id: 'app_1', left: '', right: '' },
        { id: 'app_2', left: '', right: '' },
        { id: 'app_3', left: '', right: '' },
      ];
    case 'exercice':
      return [
        { id: 'sq_1', text: '' },
        { id: 'sq_2', text: '' },
      ];
    case 'section':
      return { description: '' };
    default:
      return [];
  }
}

function getPlaceholderForType(type: string): string {
  switch (type) {
    case 'qcm':
      return 'Posez la question ici (ex : Parmi les composants suivants, lesquels sont des périphériques d\'entrée ?)...';
    case 'tableau':
      return 'Consigne générale du tableau (ex : Complétez le tableau ci-dessous en indiquant le type et le rôle de chaque composant)...';
    case 'vrai_faux':
      return 'Consigne générale (ex : Indiquez pour chaque affirmation si elle est vraie ou fausse)...';
    case 'appariement':
      return 'Consigne d\'appariement (ex : Reliez chaque équipement réseau à son rôle principal)...';
    case 'exercice':
      return 'Contexte, situation-problème ou énoncé général de l\'exercice...';
    case 'section':
      return 'Titre de la partie / section (ex : Partie 1 : Restitution des connaissances)...';
    case 'ouvert':
    default:
      return 'Rédigez l\'énoncé complet de la question (ex : Expliquez la différence entre la mémoire RAM et la mémoire ROM)...';
  }
}

export default function NouvelExamenPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<CollegeClass[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    titre: '',
    exam_date: new Date().toISOString().slice(0, 10),
    duree: '60',
    niveau: '1AC',
  });
  const [classeIds, setClasseIds] = useState<string[]>([]);
  const [questions, setQuestions] = useState<QuestionDraft[]>([
    {
      key: 1,
      type: 'qcm',
      enonce: '',
      bareme: '2',
      options: defaultOptionsForType('qcm'),
      image_url: '',
    },
  ]);
  const [saveToBank, setSaveToBank] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState<BankQuestion[]>([]);
  const [bankSelected, setBankSelected] = useState<Set<string>>(new Set());
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const DRAFT_KEY = 'pedagogen_exam_new_draft';

  useEffect(() => {
    fetch('/api/classes')
      .then((r) => r.json())
      .then((data) => setClasses(data.classes || []))
      .catch(() => toast.error('Échec du chargement des classes'));
  }, []);

  // Restauration du brouillon ou préremplissage depuis fiche
  useEffect(() => {
    try {
      // 1. Préremplissage prioritaire si on vient d'une fiche pédagogique
      const prefillRaw = localStorage.getItem('pedagogen_exam_prefill');
      if (prefillRaw) {
        localStorage.removeItem('pedagogen_exam_prefill');
        const prefill = JSON.parse(prefillRaw);
        if (prefill.titre) setForm((f) => ({ ...f, titre: prefill.titre, niveau: prefill.niveau || f.niveau }));
        if (Array.isArray(prefill.classeIds) && prefill.classeIds.length > 0) {
          setClasseIds(prefill.classeIds);
        }
        toast.success('Prérempli depuis la leçon — complétez les questions');
        setDraftLoaded(true);
        return;
      }

      // 2. Restauration automatique du brouillon en cours
      const draftRaw = localStorage.getItem(DRAFT_KEY);
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        if (draft.form) setForm(draft.form);
        if (Array.isArray(draft.classeIds)) setClasseIds(draft.classeIds);
        if (Array.isArray(draft.questions) && draft.questions.length > 0) {
          setQuestions(draft.questions);
        }
        if (typeof draft.saveToBank === 'boolean') setSaveToBank(draft.saveToBank);
        toast.success('Brouillon d\'examen restauré', { icon: '📝' });
      }
    } catch {
      /* ignore */
    } finally {
      setDraftLoaded(true);
    }
  }, []);

  // Sauvegarde automatique en temps réel dans localStorage
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      const hasContent = Boolean(
        form.titre.trim() ||
        classeIds.length > 0 ||
        questions.some((q) => q.enonce?.trim() || q.image_url)
      );
      if (hasContent) {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({
            form,
            classeIds,
            questions,
            saveToBank,
            updatedAt: Date.now(),
          })
        );
      }
    } catch {
      /* ignore */
    }
  }, [form, classeIds, questions, saveToBank, draftLoaded]);

  const handleClearDraft = () => {
    if (window.confirm('Voulez-vous réinitialiser le formulaire et effacer le brouillon en cours ?')) {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {
        /* ignore */
      }
      setForm({
        titre: '',
        exam_date: new Date().toISOString().slice(0, 10),
        duree: '60',
        niveau: '1AC',
      });
      setClasseIds([]);
      setQuestions([
        {
          key: 1,
          type: 'qcm',
          enonce: '',
          bareme: '2',
          options: defaultOptionsForType('qcm'),
          image_url: '',
        },
      ]);
      setSaveToBank(false);
      toast.success('Brouillon effacé');
    }
  };

  const totalPoints = questions.reduce((s, q) => s + (parseFloat(q.bareme) || 0), 0);

  const addQuestion = (type = 'qcm') => {
    setQuestions((prev) => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        type,
        enonce: '',
        bareme: '2',
        options: defaultOptionsForType(type),
        image_url: '',
        layout: 'vertical',
        qcm_mode: 'multiple',
      },
    ]);
  };

  const addSection = () => {
    const nextPart = questions.filter((q) => q.type === 'section').length + 1;
    setQuestions((prev) => [
      ...prev,
      {
        key: Date.now() + Math.random(),
        type: 'section',
        enonce: `Partie ${nextPart} : `,
        bareme: '0',
        options: { description: '' },
        image_url: '',
        all_correct: true,
      },
    ]);
    toast.success('Séparateur de section ajouté');
  };

  const moveQuestion = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= questions.length) return;
    setQuestions((prev) => {
      if (targetIndex < 0 || targetIndex >= prev.length) return prev;
      const current = prev[index];
      const target = prev[targetIndex];
      if (!current || !target) return prev;
      const list = [...prev];
      list[index] = target;
      list[targetIndex] = current;
      return list;
    });
  };

  const removeQuestion = (key: number) => {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((q) => q.key !== key) : prev));
  };

  const updateQuestion = (key: number, patch: Partial<QuestionDraft>) => {
    setQuestions((prev) => prev.map((q) => (q.key === key ? { ...q, ...patch } : q)));
  };

  const handleTypeChange = (key: number, newType: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== key) return q;
        const currentOptions = q.options;
        const isArray = Array.isArray(currentOptions);
        const isTable = !isArray && currentOptions?.columns && currentOptions?.rows;
        const isMismatched =
          !currentOptions ||
          (newType === 'tableau' && !isTable) ||
          (newType !== 'tableau' && isTable) ||
          (newType === 'qcm' && (!isArray || currentOptions.length === 0 || currentOptions[0].left !== undefined || currentOptions[0].isVrai !== undefined)) ||
          (newType === 'vrai_faux' && (!isArray || currentOptions.length === 0 || currentOptions[0].isVrai === undefined)) ||
          (newType === 'appariement' && (!isArray || currentOptions.length === 0 || currentOptions[0].left === undefined)) ||
          (newType === 'exercice' && (!isArray || currentOptions.length === 0 || currentOptions[0].left !== undefined || currentOptions[0].isCorrect !== undefined));

        return {
          ...q,
          type: newType,
          bareme: newType === 'section' ? '0' : (parseFloat(q.bareme) === 0 ? '2' : q.bareme),
          all_correct: newType === 'section' ? true : q.all_correct,
          options: isMismatched ? defaultOptionsForType(newType) : currentOptions,
        };
      })
    );
  };

  const toggleClasse = (cid: string) => {
    setClasseIds((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));
  };

  // ─── Image Upload pour la question ───
  const handleUploadImageForQuestion = (qKey: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image trop volumineuse (max 5 Mo)');
        return;
      }
      const tId = toast.loading('Chargement de l\'image...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/images', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Échec du téléversement');
        updateQuestion(qKey, { image_url: data.url });
        toast.success('Image ajoutée à la question !', { id: tId });
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors du téléversement', { id: tId });
      }
    };
    input.click();
  };

  // ─── QCM Option Handlers ───
  const addQcmChoice = (qKey: number, isOther: boolean = false) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const rawOpts = q.options;
        const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
        const items = [...(isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : []))];
        const newChoice: QcmChoice = isOther
          ? { id: `opt_${Date.now()}_other`, text: 'Autre (préciser) :', isCorrect: false, isOther: true }
          : { id: `opt_${Date.now()}_${items.length}`, text: '', isCorrect: false };
        items.push(newChoice);
        return { ...q, options: isObj ? { ...rawOpts, items } : items };
      })
    );
  };

  const updateQcmChoice = (qKey: number, optIdx: number, patch: Partial<QcmChoice>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const isSingle = q.qcm_mode === 'single';
        const rawOpts = q.options;
        const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
        const items = [...(isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : []))];
        const updated = items.map((opt: QcmChoice, idx: number) => {
          if (idx === optIdx) {
            return { ...opt, ...patch };
          }
          if (isSingle && patch.isCorrect === true) {
            return { ...opt, isCorrect: false };
          }
          return opt;
        });
        return { ...q, options: isObj ? { ...rawOpts, items: updated } : updated };
      })
    );
  };

  const removeQcmChoice = (qKey: number, optIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const rawOpts = q.options;
        const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
        const items = (isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : [])).filter((_: any, idx: number) => idx !== optIdx);
        return { ...q, options: isObj ? { ...rawOpts, items } : items };
      })
    );
  };

  // Upload d'image spécifique à une proposition QCM (ex : clavier, souris, écran...)
  const handleUploadImageForChoice = (qKey: number, optIdx: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image trop volumineuse (max 5 Mo)');
        return;
      }
      const tId = toast.loading('Chargement de l\'illustration...');
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/images', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Échec du téléversement');
        updateQcmChoice(qKey, optIdx, { image_url: data.url });
        toast.success('Illustration ajoutée au choix !', { id: tId });
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors du téléversement', { id: tId });
      }
    };
    input.click();
  };

  // ─── Tableau Handlers ───
  const addTableColumn = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const curr = (q.options?.columns && q.options?.rows) ? q.options : defaultOptionsForType('tableau');
        const newCols = [...curr.columns, `Colonne ${curr.columns.length + 1}`];
        const newRows = curr.rows.map((r: any) => ({
          ...r,
          cells: [...(r.cells || []), ''],
        }));
        return { ...q, options: { columns: newCols, rows: newRows } };
      })
    );
  };

  const updateTableColumn = (qKey: number, colIdx: number, label: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const curr = (q.options?.columns && q.options?.rows) ? q.options : defaultOptionsForType('tableau');
        const newCols = [...curr.columns];
        newCols[colIdx] = label;
        return { ...q, options: { ...curr, columns: newCols } };
      })
    );
  };

  const removeTableColumn = (qKey: number, colIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const curr = (q.options?.columns && q.options?.rows) ? q.options : defaultOptionsForType('tableau');
        if (curr.columns.length <= 2) return q;
        const newCols = curr.columns.filter((_: any, idx: number) => idx !== colIdx);
        const newRows = curr.rows.map((r: any) => ({
          ...r,
          cells: (r.cells || []).filter((_: any, idx: number) => idx !== colIdx),
        }));
        return { ...q, options: { columns: newCols, rows: newRows } };
      })
    );
  };

  const addTableRow = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const curr = (q.options?.columns && q.options?.rows) ? q.options : defaultOptionsForType('tableau');
        const emptyCells = new Array(curr.columns.length).fill('');
        const newRows = [
          ...curr.rows,
          { id: `row_${Date.now()}_${curr.rows.length}`, cells: emptyCells },
        ];
        return { ...q, options: { ...curr, rows: newRows } };
      })
    );
  };

  const updateTableCell = (qKey: number, rowIdx: number, colIdx: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const curr = (q.options?.columns && q.options?.rows) ? q.options : defaultOptionsForType('tableau');
        const newRows = [...curr.rows];
        const row = newRows[rowIdx];
        if (!row) return q;
        const newCells = [...(row.cells || [])];
        newCells[colIdx] = val;
        newRows[rowIdx] = { ...row, cells: newCells };
        return { ...q, options: { ...curr, rows: newRows } };
      })
    );
  };

  const removeTableRow = (qKey: number, rowIdx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const curr = (q.options?.columns && q.options?.rows) ? q.options : defaultOptionsForType('tableau');
        if (curr.rows.length <= 1) return q;
        const newRows = curr.rows.filter((_: any, idx: number) => idx !== rowIdx);
        return { ...q, options: { ...curr, rows: newRows } };
      })
    );
  };

  // ─── Vrai / Faux Handlers ───
  const addVfItem = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = [...(q.options || [])];
        opts.push({ id: `vf_${Date.now()}_${opts.length}`, text: '', isVrai: true });
        return { ...q, options: opts };
      })
    );
  };

  const updateVfItem = (qKey: number, idx: number, patch: Partial<VraiFauxItem>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = [...(q.options || [])];
        opts[idx] = { ...opts[idx], ...patch };
        return { ...q, options: opts };
      })
    );
  };

  const removeVfItem = (qKey: number, idx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = ((q.options || []) as VraiFauxItem[]).filter((_: VraiFauxItem, i: number) => i !== idx);
        return { ...q, options: opts };
      })
    );
  };

  // ─── Question "Toutes les réponses sont correctes (sans barème)" Handlers ───
  const isEveryAnswerCorrect = (q: QuestionDraft) => {
    return !!q.all_correct || parseFloat(q.bareme) === 0;
  };

  const toggleEveryAnswerCorrect = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const active = isEveryAnswerCorrect(q);
        if (active) {
          return {
            ...q,
            bareme: '1',
            all_correct: false,
          };
        } else {
          // If QCM, mark all choices as correct
          let newOptions = q.options;
          if (q.type === 'qcm') {
            const rawOpts = q.options;
            const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
            const items: QcmChoice[] = isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : []);
            const updatedItems = items.map((opt) => ({ ...opt, isCorrect: true }));
            newOptions = isObj ? { ...rawOpts, items: updatedItems } : updatedItems;
          }
          return {
            ...q,
            bareme: '0',
            all_correct: true,
            options: newOptions,
          };
        }
      })
    );
  };

  // ─── Modèle Grille Oui / Non ───
  const applyOuiNonTablePreset = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        return {
          ...q,
          enonce: q.enonce.trim() ? q.enonce : 'Connais-tu déjà ces mots ? (Coche Oui ou Non pour chaque mot)',
          options: {
            columns: ['Mot', 'Oui', 'Non'],
            rows: [
              { id: `r_${Date.now()}_1`, cells: ['Ordinateur', '', ''] },
              { id: `r_${Date.now()}_2`, cells: ['Clavier', '', ''] },
              { id: `r_${Date.now()}_3`, cells: ['Souris', '', ''] },
              { id: `r_${Date.now()}_4`, cells: ['Internet', '', ''] },
              { id: `r_${Date.now()}_5`, cells: ['Fichier', '', ''] },
              { id: `r_${Date.now()}_6`, cells: ['Dossier', '', ''] },
            ],
          },
        };
      })
    );
    toast.success('Modèle de grille Oui / Non appliqué');
  };
  const addAppariementPair = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = [...(q.options || [])];
        opts.push({ id: `app_${Date.now()}_${opts.length}`, left: '', right: '' });
        return { ...q, options: opts };
      })
    );
  };

  const updateAppariementPair = (qKey: number, idx: number, patch: Partial<AppariementPair>) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = [...(q.options || [])];
        opts[idx] = { ...opts[idx], ...patch };
        return { ...q, options: opts };
      })
    );
  };

  const removeAppariementPair = (qKey: number, idx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = ((q.options || []) as AppariementPair[]).filter((_: AppariementPair, i: number) => i !== idx);
        return { ...q, options: opts };
      })
    );
  };

  // ─── Exercice Sub-questions Handlers ───
  const addSousQuestion = (qKey: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = [...(q.options || [])];
        opts.push({ id: `sq_${Date.now()}_${opts.length}`, text: '' });
        return { ...q, options: opts };
      })
    );
  };

  const updateSousQuestion = (qKey: number, idx: number, text: string) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = [...(q.options || [])];
        opts[idx] = { ...opts[idx], text };
        return { ...q, options: opts };
      })
    );
  };

  const removeSousQuestion = (qKey: number, idx: number) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.key !== qKey) return q;
        const opts = ((q.options || []) as SousQuestionItem[]).filter((_: SousQuestionItem, i: number) => i !== idx);
        return { ...q, options: opts };
      })
    );
  };

  // ─── Submit Form ───
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre.trim()) { toast.error('Le titre est requis'); return; }
    if (classeIds.length === 0) { toast.error('Sélectionnez au moins une classe'); return; }
    if (questions.some((q) => Number.isNaN(parseFloat(q.bareme)) || parseFloat(q.bareme) < 0)) {
      toast.error('Le barème de chaque question doit être supérieur ou égal à 0');
      return;
    }
    setSaving(true);
    try {
      const preparedQuestions = questions.map((q, i) => {
        let finalOptions = q.options;
        if (q.type === 'qcm') {
          const rawOpts = q.options;
          const items = Array.isArray(rawOpts) ? rawOpts : (rawOpts?.items || []);
          finalOptions = {
            items,
            layout: q.layout || 'vertical',
            qcm_mode: q.qcm_mode || 'multiple',
            all_correct: !!q.all_correct,
          };
        } else if (q.all_correct) {
          if (typeof finalOptions === 'object' && !Array.isArray(finalOptions)) {
            finalOptions = { ...finalOptions, all_correct: true };
          }
        }
        return {
          numero: i + 1,
          type: q.type,
          enonce: q.enonce,
          bareme: parseFloat(q.bareme) || 0,
          options: finalOptions || [],
          image_url: q.image_url || '',
        };
      });

      const res = await fetch('/api/examens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          duree: parseInt(form.duree) || 60,
          classe_ids: classeIds,
          questions: preparedQuestions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Échec de la création');

      if (saveToBank) {
        try {
          await fetch('/api/question-bank', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              questions: preparedQuestions
                .filter((q) => q.enonce.trim() || q.image_url)
                .map((q) => ({
                  type: q.type,
                  enonce: q.enonce,
                  bareme: q.bareme,
                  options: q.options,
                  image_url: q.image_url,
                })),
            }),
          });
          toast.success('Questions enregistrées dans la banque');
        } catch { /* non bloquant */ }
      }

      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch { /* ignore */ }

      toast.success('Examen créé avec succès !');
      router.push(`/examens/${data.examen.id}/grille`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Échec de la création');
    } finally {
      setSaving(false);
    }
  };

  // ─── Bank Modal ───
  const openBank = async () => {
    try {
      const res = await fetch('/api/question-bank');
      const data = await res.json();
      setBank(data.questions || []);
      setBankSelected(new Set());
      setBankOpen(true);
    } catch {
      toast.error('Échec du chargement de la banque');
    }
  };

  const importFromBank = () => {
    const picked = bank.filter((q) => bankSelected.has(q.id));
    if (picked.length === 0) return;
    setQuestions((prev) => {
      const cleaned = prev.filter(
        (q) => q.enonce.trim() || q.image_url || parseFloat(q.bareme) !== 2 || q.type !== 'qcm' || prev.length > 1
      );
      const base = cleaned.length === 1 && !cleaned[0]!.enonce.trim() && !cleaned[0]!.image_url ? [] : cleaned;
      return [
        ...base,
        ...picked.map((q) => {
          let layout: 'vertical' | 'horizontal' = 'vertical';
          let qcm_mode: 'single' | 'multiple' = 'multiple';
          let options = q.options;
          if (q.type === 'qcm' && options && !Array.isArray(options)) {
            layout = options.layout || 'vertical';
            qcm_mode = options.qcm_mode || 'multiple';
            options = options.items || defaultOptionsForType('qcm');
          }
          if (!options || (Array.isArray(options) && options.length === 0)) {
            options = defaultOptionsForType(q.type);
          }
          return {
            key: Date.now() + Math.random(),
            type: q.type,
            enonce: q.enonce,
            bareme: String(q.bareme),
            options,
            image_url: q.image_url || '',
            layout,
            qcm_mode,
          };
        }),
      ];
    });
    setBankOpen(false);
    toast.success(`${picked.length} question(s) importée(s) de la banque`);
  };

  const deleteFromBank = async (id: string) => {
    try {
      const res = await fetch(`/api/question-bank?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setBank((prev) => prev.filter((q) => q.id !== id));
      setBankSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
    } catch {
      toast.error('Échec de la suppression');
    }
  };

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal via-teal-dark to-navy p-6 lg:p-8 text-white">
          <div className="absolute top-0 right-0 w-56 h-56 bg-teal-light/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="relative z-10">
            <button onClick={() => router.push('/examens')} className="flex items-center gap-1.5 text-white/60 text-xs mb-3 hover:text-white transition-colors cursor-pointer">
              <ArrowLeft size={13} />Retour aux examens
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
                  <ClipboardCheck size={20} />
                </div>
                <div>
                  <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">Nouvel Examen</h1>
                  <p className="text-white/60 text-sm mt-0.5">Configuration des questions, choix de réponses et illustrations</p>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 backdrop-blur rounded-lg px-2.5 py-1.5 text-[11px] text-white/80 shrink-0 border border-white/15">
                <span className="w-2 h-2 rounded-full bg-teal-light animate-pulse shrink-0" />
                <span>Brouillon auto-sauvegardé</span>
                <span className="text-white/40">•</span>
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="text-white/70 hover:text-white underline cursor-pointer"
                  title="Effacer le brouillon et recommencer à zéro"
                >
                  Effacer
                </button>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Infos générales */}
          <Card>
            <CardContent className="p-6 pt-6 space-y-5">
              <Input
                label="Titre de l'examen *"
                value={form.titre}
                onChange={(e) => setForm({ ...form, titre: e.target.value })}
                placeholder="ex : Contrôle 1 — Réseaux & Internet"
                required
              />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="Date *"
                  type="date"
                  value={form.exam_date}
                  onChange={(e) => setForm({ ...form, exam_date: e.target.value })}
                  required
                />
                <Input
                  label="Durée (min)"
                  type="number"
                  min="5"
                  value={form.duree}
                  onChange={(e) => setForm({ ...form, duree: e.target.value })}
                />
                <Select
                  label="Niveau"
                  value={form.niveau}
                  onChange={(e) => setForm({ ...form, niveau: e.target.value })}
                  options={['1AC', '2AC', '3AC'].map((n) => ({ value: n, label: n }))}
                />
              </div>
              <div>
                <p className="block text-sm font-medium text-navy mb-2">Classes concernées *</p>
                {classes.length === 0 ? (
                  <p className="text-xs text-muted">Aucune classe — créez-en une dans « Classes & Élèves ».</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {classes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => toggleClasse(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          classeIds.includes(c.id)
                            ? 'bg-teal text-white border-teal shadow-xs'
                            : 'bg-white text-navy border-border hover:border-teal/50'
                        }`}
                      >
                        {c.name} <span className="opacity-60">({c.niveau})</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Section Questions */}
          <Card>
            <CardContent className="p-6 pt-6 space-y-5">
              <div className="flex items-center justify-between pb-1 border-b border-border/60">
                <div>
                  <h3 className="font-display text-lg font-semibold text-navy">Questions & Barème</h3>
                  <p className="text-xs text-muted">Chaque question dispose de réglages adaptés à sa typologie</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-teal px-2.5 py-1 bg-teal-50 rounded-lg">
                    Total : {totalPoints} pts
                  </span>
                  <Button type="button" variant="secondary" size="sm" onClick={openBank}>
                    <BookMarked size={13} />Banque
                  </Button>
                </div>
              </div>

              {/* Liste des questions et séparateurs de section */}
              <div className="space-y-5">
                {(() => {
                  let seq = 0;
                  const qNumMap = questions.map((item) => (item.type === 'section' ? 0 : ++seq));

                  return questions.map((q, i) => {
                    if (q.type === 'section') {
                      return (
                        <div
                          key={q.key}
                          className="rounded-xl border-2 border-navy/20 bg-slate-50/70 p-4 space-y-3.5 hover:border-navy/40 transition-all shadow-xs relative overflow-hidden"
                        >
                          <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-navy" />
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-border/50">
                            <div className="flex items-center gap-2.5">
                              <span className="px-2.5 py-1 rounded-md bg-navy text-white font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow-xs">
                                <Layers size={13} />
                                Partie / Section
                              </span>
                              <div className="w-48">
                                <Select
                                  value={q.type}
                                  onChange={(e) => handleTypeChange(q.key, e.target.value)}
                                  options={QUESTION_TYPES}
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Monter */}
                              <button
                                type="button"
                                onClick={() => moveQuestion(i, -1)}
                                disabled={i === 0}
                                className="p-1.5 rounded-lg border border-border bg-white text-muted hover:text-navy hover:bg-parchment-dark/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Monter cette section"
                              >
                                <ChevronUp size={15} />
                              </button>

                              {/* Descendre */}
                              <button
                                type="button"
                                onClick={() => moveQuestion(i, 1)}
                                disabled={i === questions.length - 1}
                                className="p-1.5 rounded-lg border border-border bg-white text-muted hover:text-navy hover:bg-parchment-dark/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                                title="Descendre cette section"
                              >
                                <ChevronDown size={15} />
                              </button>

                              {/* Supprimer */}
                              <button
                                type="button"
                                onClick={() => removeQuestion(q.key)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted hover:text-red transition-colors cursor-pointer"
                                title="Supprimer cette section"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-semibold text-navy mb-1">
                                Titre de la partie / section <span className="text-red">*</span>
                              </label>
                              <input
                                type="text"
                                value={q.enonce}
                                onChange={(e) => updateQuestion(q.key, { enonce: e.target.value })}
                                placeholder="ex : Partie 1 : Restitution des connaissances"
                                className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-navy font-bold focus:outline-none focus:ring-1 focus:ring-navy"
                                required
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-semibold text-navy mb-1">
                                Consigne ou barème indicatif (optionnel)
                              </label>
                              <input
                                type="text"
                                value={typeof q.options === 'object' ? (q.options?.description || '') : ''}
                                onChange={(e) =>
                                  updateQuestion(q.key, {
                                    options: {
                                      ...(typeof q.options === 'object' ? q.options : {}),
                                      description: e.target.value,
                                    },
                                  })
                                }
                                placeholder="ex : (8 points) — Répondez précisément à chaque question"
                                className="w-full rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-muted focus:text-navy focus:outline-none focus:ring-1 focus:ring-navy"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={q.key}
                        className="rounded-xl border border-border/80 bg-white p-5 space-y-4 hover:border-teal/40 transition-all shadow-xs"
                      >
                        {/* Header de la question */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/40">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-lg bg-teal-50 text-teal-dark font-display font-bold text-sm flex items-center justify-center shrink-0">
                              Q{qNumMap[i]}
                            </span>
                            <div className="w-52">
                              <Select
                                value={q.type}
                                onChange={(e) => handleTypeChange(q.key, e.target.value)}
                                options={QUESTION_TYPES}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Monter */}
                            <button
                              type="button"
                              onClick={() => moveQuestion(i, -1)}
                              disabled={i === 0}
                              className="p-1.5 rounded-lg border border-border bg-white text-muted hover:text-navy hover:bg-parchment-dark/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Monter la question"
                            >
                              <ChevronUp size={15} />
                            </button>

                            {/* Descendre */}
                            <button
                              type="button"
                              onClick={() => moveQuestion(i, 1)}
                              disabled={i === questions.length - 1}
                              className="p-1.5 rounded-lg border border-border bg-white text-muted hover:text-navy hover:bg-parchment-dark/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
                              title="Descendre la question"
                            >
                              <ChevronDown size={15} />
                            </button>
                        {/* Barème */}
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all",
                          parseFloat(q.bareme) === 0
                            ? "bg-teal-50 border-teal/40 text-teal-dark"
                            : "bg-parchment-dark/50 border-border/60"
                        )}>
                          <span className="text-xs text-muted font-medium">Barème :</span>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            value={q.bareme}
                            onChange={(e) => updateQuestion(q.key, { bareme: e.target.value, all_correct: parseFloat(e.target.value) === 0 })}
                            className="w-14 text-center font-bold text-navy text-xs bg-white border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal"
                            required
                          />
                          <span className="text-xs text-muted">pts</span>
                          {parseFloat(q.bareme) === 0 && (
                            <span className="text-[10px] bg-teal text-white font-semibold px-1.5 py-0.5 rounded ml-0.5">
                              0 pt
                            </span>
                          )}
                        </div>

                        {/* Bouton Image */}
                        <button
                          type="button"
                          onClick={() => handleUploadImageForQuestion(q.key)}
                          className={cn(
                            'p-2 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 cursor-pointer',
                            q.image_url
                              ? 'bg-teal-50 text-teal border-teal/40'
                              : 'bg-white text-muted hover:text-navy border-border hover:bg-parchment-dark/30'
                          )}
                          title={q.image_url ? 'Remplacer l\'image' : 'Ajouter une image'}
                        >
                          <ImageIcon size={14} />
                          <span className="hidden sm:inline">{q.image_url ? 'Image ✓' : 'Image'}</span>
                        </button>

                        {/* Supprimer question */}
                        <button
                          type="button"
                          onClick={() => removeQuestion(q.key)}
                          className="p-2 rounded-lg hover:bg-red-50 text-muted hover:text-red transition-colors cursor-pointer"
                          title="Supprimer la question"
                          disabled={questions.length <= 1}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    {/* Zone de l'énoncé de la question */}
                    <div>
                      <label className="block text-xs font-semibold text-navy mb-1.5">
                        Énoncé de la question <span className="text-red">*</span>
                      </label>
                      <textarea
                        rows={2}
                        value={q.enonce}
                        onChange={(e) => updateQuestion(q.key, { enonce: e.target.value })}
                        placeholder={getPlaceholderForType(q.type)}
                        className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-teal/30 focus:border-teal transition-all resize-y"
                        required
                      />
                    </div>

                    {/* Aperçu de l'image attachée */}
                    {q.image_url && (
                      <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border/80 bg-parchment-dark/20">
                        <div
                          className="relative w-16 h-16 rounded-md overflow-hidden bg-white border border-border/80 cursor-pointer shrink-0"
                          onClick={() => setPreviewImageUrl(q.image_url || null)}
                          title="Agrandir l'image"
                        >
                          <img
                            src={q.image_url}
                            alt="Illustration question"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                            <Eye size={14} />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-navy truncate">Image / Schéma attaché</p>
                          <p className="text-[11px] text-muted truncate">{q.image_url}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <button
                              type="button"
                              onClick={() => handleUploadImageForQuestion(q.key)}
                              className="text-[11px] text-teal hover:underline cursor-pointer"
                            >
                              Changer
                            </button>
                            <span className="text-muted/40">•</span>
                            <button
                              type="button"
                              onClick={() => updateQuestion(q.key, { image_url: '' })}
                              className="text-[11px] text-red hover:underline cursor-pointer"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ─── BLOCS SELON LE TYPE DE QUESTION ─── */}

                    {/* 1. QCM */}
                    {q.type === 'qcm' && (() => {
                      const rawOpts = q.options;
                      const isObj = !Array.isArray(rawOpts) && rawOpts && typeof rawOpts === 'object';
                      const opts: QcmChoice[] = isObj ? (rawOpts.items || []) : (Array.isArray(rawOpts) ? rawOpts : []);
                      const layout = q.layout || (isObj && rawOpts.layout) || 'vertical';
                      const qcmMode = q.qcm_mode || (isObj && rawOpts.qcm_mode) || 'multiple';
                      const hasOtherOption = opts.some((o) => o.isOther);

                      return (
                        <div className="rounded-xl border border-border/70 bg-parchment-dark/25 p-4 space-y-4">
                          {/* Barre d'outils et réglages du QCM */}
                          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/50">
                            <div>
                              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                                <CheckSquare size={14} className="text-teal" />
                                Choix de réponses ({opts.length})
                              </span>
                              <span className="text-[11px] text-muted italic">
                                {qcmMode === 'single'
                                  ? 'Cochez la seule bonne réponse (bouton radio)'
                                  : 'Cochez la ou les bonnes réponses (cases à cocher)'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              {/* Sélecteur Choix unique vs Choix multiples */}
                              <div className="inline-flex rounded-lg border border-border bg-white p-0.5 text-xs shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.key, { qcm_mode: 'single' })}
                                  className={cn(
                                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
                                    qcmMode === 'single'
                                      ? 'bg-teal text-white shadow-xs font-semibold'
                                      : 'text-muted hover:text-navy'
                                  )}
                                  title="Une seule bonne réponse autorisée"
                                >
                                  <span className="w-2.5 h-2.5 rounded-full border-2 border-current inline-block" />
                                  Choix unique
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.key, { qcm_mode: 'multiple' })}
                                  className={cn(
                                    'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5',
                                    qcmMode === 'multiple'
                                      ? 'bg-teal text-white shadow-xs font-semibold'
                                      : 'text-muted hover:text-navy'
                                  )}
                                  title="Plusieurs bonnes réponses possibles"
                                >
                                  <CheckSquare size={12} />
                                  Choix multiples
                                </button>
                              </div>

                              {/* Sélecteur Disposition : Verticale vs Horizontale */}
                              <div className="inline-flex rounded-lg border border-border bg-white p-0.5 text-xs shadow-2xs">
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.key, { layout: 'vertical' })}
                                  className={cn(
                                    'px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
                                    layout === 'vertical'
                                      ? 'bg-teal text-white shadow-xs font-semibold'
                                      : 'text-muted hover:text-navy'
                                  )}
                                  title="Disposition en liste verticale"
                                >
                                  <Rows size={12} />
                                  Verticale
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updateQuestion(q.key, { layout: 'horizontal' })}
                                  className={cn(
                                    'px-2 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1',
                                    layout === 'horizontal'
                                      ? 'bg-teal text-white shadow-xs font-semibold'
                                      : 'text-muted hover:text-navy'
                                  )}
                                  title="Disposition horizontale en ligne (côte-à-côte avec images)"
                                >
                                  <Columns size={12} />
                                  Horizontale
                                </button>
                              </div>

                              {/* Bouton : Toute réponse est correcte (sans barème) */}
                              <button
                                type="button"
                                onClick={() => toggleEveryAnswerCorrect(q.key)}
                                className={cn(
                                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border',
                                  isEveryAnswerCorrect(q)
                                    ? 'bg-teal-50 border-teal text-teal-dark font-semibold shadow-2xs'
                                    : 'bg-white border-border text-muted hover:text-navy hover:border-teal/40 shadow-2xs'
                                )}
                                title="Marquer comme question de positionnement / sondage : toute réponse est acceptée et le barème est fixé à 0 pt"
                              >
                                <Sparkles size={12} className={isEveryAnswerCorrect(q) ? 'text-teal' : 'text-muted'} />
                                {isEveryAnswerCorrect(q)
                                  ? '✓ Toute réponse acceptée (sans barème / 0 pt)'
                                  : 'Toute réponse est correcte (sans barème)'}
                              </button>
                            </div>
                          </div>

                          {/* Rendu des choix selon la disposition */}
                          {layout === 'horizontal' ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                              {opts.map((opt: QcmChoice, optIdx: number) => {
                                const letter = String.fromCharCode(65 + optIdx);
                                return (
                                  <div
                                    key={opt.id || optIdx}
                                    className={cn(
                                      'flex flex-col p-2.5 rounded-xl border transition-all bg-white relative group',
                                      opt.isCorrect
                                        ? 'border-teal bg-teal-50/30 ring-1 ring-teal/30'
                                        : 'border-border hover:border-teal/40'
                                    )}
                                  >
                                    {/* Illustration option (si présente ou bouton pour ajouter) */}
                                    <div className="relative mb-2 w-full h-24 rounded-lg bg-parchment-dark/30 border border-border/70 overflow-hidden flex items-center justify-center">
                                      {opt.image_url ? (
                                        <>
                                          <img
                                            src={opt.image_url}
                                            alt={`Illustration choix ${letter}`}
                                            className="w-full h-full object-contain p-1"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => updateQcmChoice(q.key, optIdx, { image_url: '' })}
                                            className="absolute top-1 right-1 p-1 rounded-md bg-black/60 text-white hover:bg-red transition-colors cursor-pointer"
                                            title="Supprimer cette image"
                                          >
                                            <X size={11} />
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleUploadImageForChoice(q.key, optIdx)}
                                          className="flex flex-col items-center justify-center gap-1 text-[11px] text-muted hover:text-teal transition-colors cursor-pointer w-full h-full"
                                        >
                                          <ImageIcon size={18} className="opacity-60" />
                                          <span>+ Image</span>
                                        </button>
                                      )}
                                    </div>

                                    {/* Ligne contrôle et texte */}
                                    <div className="flex items-start gap-2">
                                      <label
                                        className="flex items-center gap-1 cursor-pointer select-none mt-1"
                                        title={qcmMode === 'single' ? 'Marquer comme la seule bonne réponse' : 'Marquer comme bonne réponse'}
                                      >
                                        <input
                                          type={qcmMode === 'single' ? 'radio' : 'checkbox'}
                                          name={`qcm_correct_${q.key}`}
                                          checked={!!opt.isCorrect}
                                          onChange={(e) =>
                                            updateQcmChoice(q.key, optIdx, { isCorrect: e.target.checked })
                                          }
                                          className={cn(
                                            'text-teal accent-teal cursor-pointer',
                                            qcmMode === 'single' ? 'w-4 h-4 rounded-full' : 'w-4 h-4 rounded'
                                          )}
                                        />
                                        <span className="text-xs font-mono font-bold text-navy">
                                          {letter}.
                                        </span>
                                      </label>

                                      <div className="flex-1 min-w-0">
                                        {opt.isOther ? (
                                          <div className="space-y-1">
                                            <input
                                              type="text"
                                              value={opt.text}
                                              onChange={(e) =>
                                                updateQcmChoice(q.key, optIdx, { text: e.target.value })
                                              }
                                              className="w-full rounded border border-border px-2 py-1 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal bg-white font-medium"
                                            />
                                            <div className="px-2 py-1 bg-parchment-dark/40 border border-dashed border-border rounded text-[10px] text-muted italic">
                                              [ Réponse libre de l'élève ]
                                            </div>
                                          </div>
                                        ) : (
                                          <input
                                            type="text"
                                            value={opt.text}
                                            onChange={(e) =>
                                              updateQcmChoice(q.key, optIdx, { text: e.target.value })
                                            }
                                            placeholder={`Proposition ${letter}...`}
                                            className={cn(
                                              'w-full rounded border px-2 py-1 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal transition-all',
                                              opt.isCorrect
                                                ? 'bg-teal-50/50 border-teal/40 font-medium'
                                                : 'bg-white border-border'
                                            )}
                                          />
                                        )}
                                      </div>

                                      {opts.length > 2 && (
                                        <button
                                          type="button"
                                          onClick={() => removeQcmChoice(q.key, optIdx)}
                                          className="p-1 text-muted hover:text-red rounded-md hover:bg-red-50 transition-colors cursor-pointer mt-0.5"
                                          title="Supprimer ce choix"
                                        >
                                          <X size={13} />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="space-y-2.5">
                              {opts.map((opt: QcmChoice, optIdx: number) => {
                                const letter = String.fromCharCode(65 + optIdx);
                                return (
                                  <div
                                    key={opt.id || optIdx}
                                    className="flex items-center gap-2 p-1.5 rounded-lg border border-transparent hover:border-border/60 hover:bg-white/60 transition-all"
                                  >
                                    <label
                                      className="flex items-center gap-1.5 cursor-pointer select-none"
                                      title={qcmMode === 'single' ? 'Marquer comme la seule bonne réponse' : 'Marquer comme bonne réponse'}
                                    >
                                      <input
                                        type={qcmMode === 'single' ? 'radio' : 'checkbox'}
                                        name={`qcm_correct_${q.key}`}
                                        checked={!!opt.isCorrect}
                                        onChange={(e) =>
                                          updateQcmChoice(q.key, optIdx, { isCorrect: e.target.checked })
                                        }
                                        className={cn(
                                          'text-teal accent-teal cursor-pointer',
                                          qcmMode === 'single' ? 'w-4 h-4 rounded-full' : 'w-4 h-4 rounded'
                                        )}
                                      />
                                      <span className="text-xs font-mono font-bold text-navy w-5 text-center">
                                        {letter}.
                                      </span>
                                    </label>

                                    {/* Mini miniature image si présente */}
                                    {opt.image_url ? (
                                      <div className="relative w-8 h-8 rounded border border-border overflow-hidden bg-white shrink-0 group">
                                        <img src={opt.image_url} alt="" className="w-full h-full object-cover" />
                                        <button
                                          type="button"
                                          onClick={() => updateQcmChoice(q.key, optIdx, { image_url: '' })}
                                          className="absolute inset-0 bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                                          title="Supprimer l'image"
                                        >
                                          <X size={10} />
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleUploadImageForChoice(q.key, optIdx)}
                                        className="p-1.5 text-muted/60 hover:text-teal rounded border border-border/50 hover:border-teal/50 bg-white transition-colors cursor-pointer shrink-0"
                                        title="Ajouter une illustration à cette option"
                                      >
                                        <ImageIcon size={13} />
                                      </button>
                                    )}

                                    {opt.isOther ? (
                                      <div className="flex-1 flex items-center gap-2">
                                        <input
                                          type="text"
                                          value={opt.text}
                                          onChange={(e) =>
                                            updateQcmChoice(q.key, optIdx, { text: e.target.value })
                                          }
                                          className="w-44 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal font-medium"
                                        />
                                        <div className="flex-1 px-3 py-1.5 bg-white border border-dashed border-border rounded-lg text-xs text-muted/70 italic">
                                          [ Champ texte libre pour la réponse de l'élève ]
                                        </div>
                                      </div>
                                    ) : (
                                      <input
                                        type="text"
                                        value={opt.text}
                                        onChange={(e) =>
                                          updateQcmChoice(q.key, optIdx, { text: e.target.value })
                                        }
                                        placeholder={`Proposition ${letter}...`}
                                        className={cn(
                                          'flex-1 rounded-lg border px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal transition-all',
                                          opt.isCorrect
                                            ? 'bg-teal-50/50 border-teal/40 font-medium'
                                            : 'bg-white border-border'
                                        )}
                                      />
                                    )}

                                    {opts.length > 2 && (
                                      <button
                                        type="button"
                                        onClick={() => removeQcmChoice(q.key, optIdx)}
                                        className="p-1.5 text-muted hover:text-red rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                        title="Supprimer cette option"
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Boutons d'ajout d'options */}
                          <div className="flex flex-wrap items-center gap-3 pt-1">
                            <button
                              type="button"
                              onClick={() => addQcmChoice(q.key, false)}
                              className="inline-flex items-center gap-1.5 text-xs text-teal font-medium hover:text-teal-dark transition-colors cursor-pointer"
                            >
                              <Plus size={13} /> Ajouter un choix de réponse
                            </button>

                            {!hasOtherOption && (
                              <button
                                type="button"
                                onClick={() => addQcmChoice(q.key, true)}
                                className="inline-flex items-center gap-1.5 text-xs text-navy/70 hover:text-teal font-medium transition-colors cursor-pointer"
                              >
                                <Plus size={13} /> Ajouter option « Autre » (champ texte libre)
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Tableau / Grille à compléter */}
                    {q.type === 'tableau' && (() => {
                      const tableData: TableQuestionData = (q.options?.columns && q.options?.rows)
                        ? q.options
                        : defaultOptionsForType('tableau');
                      const { columns, rows } = tableData;

                      return (
                        <div className="rounded-xl border border-border/70 bg-parchment-dark/25 p-4 space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border/50">
                            <div>
                              <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                                <TableProperties size={14} className="text-teal" />
                                Tableau / Grille à compléter ({columns.length} colonnes × {rows.length} lignes)
                              </span>
                              <p className="text-[11px] text-muted mt-0.5">
                                Astuce : les cases laissées vides s'afficheront sous forme de pointillés (...) pour que l'élève les remplisse.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => applyOuiNonTablePreset(q.key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-border hover:border-teal text-navy hover:text-teal transition-all cursor-pointer shadow-2xs"
                                title="Appliquer le modèle de tableau Oui / Non (ex : Connais-tu déjà ces mots ?)"
                              >
                                <CheckSquare size={12} className="text-teal" />
                                Modèle Oui / Non
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleEveryAnswerCorrect(q.key)}
                                className={cn(
                                  'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border',
                                  isEveryAnswerCorrect(q)
                                    ? 'bg-teal-50 border-teal text-teal-dark font-semibold shadow-2xs'
                                    : 'bg-white border-border text-muted hover:text-navy hover:border-teal/40 shadow-2xs'
                                )}
                                title="Marquer comme question de positionnement / sondage sans notation (0 pt)"
                              >
                                <Sparkles size={12} className={isEveryAnswerCorrect(q) ? 'text-teal' : 'text-muted'} />
                                {isEveryAnswerCorrect(q)
                                  ? '✓ Sans barème (0 pt)'
                                  : 'Toute réponse est correcte (sans barème)'}
                              </button>
                              <button
                                type="button"
                                onClick={() => addTableColumn(q.key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-border hover:border-teal text-navy hover:text-teal transition-all cursor-pointer shadow-2xs"
                              >
                                <Plus size={12} />+ Colonne
                              </button>
                              <button
                                type="button"
                                onClick={() => addTableRow(q.key)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white border border-border hover:border-teal text-navy hover:text-teal transition-all cursor-pointer shadow-2xs"
                              >
                                <Plus size={12} />+ Ligne
                              </button>
                            </div>
                          </div>

                          <div className="overflow-x-auto rounded-lg border border-border bg-white shadow-2xs">
                            <table className="w-full text-xs text-left border-collapse">
                              <thead>
                                <tr className="bg-teal/5 border-b border-border/80 text-navy font-semibold">
                                  <th className="p-2.5 w-10 text-center text-muted font-mono">#</th>
                                  {columns.map((col, cIdx) => {
                                    const clean = (col || '').toLowerCase().trim();
                                    const isChoice = clean === 'oui' || clean === 'non' || clean === 'vrai' || clean === 'faux';
                                    return (
                                      <th key={cIdx} className={cn("p-2", isChoice ? "w-28 text-center" : "min-w-[150px]")}>
                                        <div className="flex items-center gap-1">
                                          <input
                                            type="text"
                                            value={col}
                                            onChange={(e) => updateTableColumn(q.key, cIdx, e.target.value)}
                                            placeholder={`Colonne ${cIdx + 1}...`}
                                            className="w-full bg-white px-2 py-1 rounded border border-border/80 text-xs font-bold text-navy focus:outline-none focus:ring-1 focus:ring-teal text-center"
                                          />
                                          {columns.length > 2 && (
                                            <button
                                              type="button"
                                              onClick={() => removeTableColumn(q.key, cIdx)}
                                              className="p-1 text-muted hover:text-red transition-colors cursor-pointer"
                                              title="Supprimer cette colonne"
                                            >
                                              <X size={12} />
                                            </button>
                                          )}
                                        </div>
                                      </th>
                                    );
                                  })}
                                  <th className="p-2 w-10 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {rows.map((row, rIdx) => (
                                  <tr key={row.id || rIdx} className="hover:bg-parchment-dark/20 transition-colors">
                                    <td className="p-2.5 text-center font-mono text-muted font-bold text-[11px]">
                                      {rIdx + 1}
                                    </td>
                                    {columns.map((colName, cIdx) => {
                                      const cleanCol = (colName || '').toLowerCase().trim();
                                      const isChoiceCol = cleanCol === 'oui' || cleanCol === 'non' || cleanCol === 'vrai' || cleanCol === 'faux';
                                      if (isChoiceCol) {
                                        const isChecked = row.cells[cIdx] === '✓';
                                        return (
                                          <td key={cIdx} className="p-2 text-center">
                                            <div className="flex items-center justify-center">
                                              <button
                                                type="button"
                                                onClick={() => updateTableCell(q.key, rIdx, cIdx, isChecked ? '' : '✓')}
                                                className={cn(
                                                  'w-7 h-7 rounded border flex items-center justify-center font-bold text-xs transition-all cursor-pointer select-none',
                                                  isChecked
                                                    ? 'bg-teal text-white border-teal shadow-2xs'
                                                    : 'bg-white border-border text-muted hover:border-teal/60 hover:text-navy hover:bg-teal-50/20'
                                                )}
                                                title="Cliquer pour définir la réponse attendue (ou laisser vide pour case élève / sondage)"
                                              >
                                                {isChecked ? '✓' : '□'}
                                              </button>
                                            </div>
                                          </td>
                                        );
                                      }
                                      return (
                                        <td key={cIdx} className="p-2">
                                          <input
                                            type="text"
                                            value={row.cells[cIdx] || ''}
                                            onChange={(e) => updateTableCell(q.key, rIdx, cIdx, e.target.value)}
                                            placeholder="Vide = à compléter"
                                            className={cn(
                                              'w-full px-2.5 py-1.5 rounded border text-xs focus:outline-none focus:ring-1 focus:ring-teal transition-all',
                                              row.cells[cIdx]
                                                ? 'bg-white border-border text-navy font-medium'
                                                : 'bg-parchment-dark/30 border-dashed border-border/80 text-muted/80 placeholder:text-muted/50 italic'
                                            )}
                                          />
                                        </td>
                                      );
                                    })}
                                    <td className="p-2 text-center">
                                      {rows.length > 1 && (
                                        <button
                                          type="button"
                                          onClick={() => removeTableRow(q.key, rIdx)}
                                          className="p-1 text-muted hover:text-red rounded hover:bg-red-50 transition-colors cursor-pointer"
                                          title="Supprimer cette ligne"
                                        >
                                          <Trash size={12} />
                                        </button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. Vrai / Faux */}
                    {q.type === 'vrai_faux' && (
                      <div className="rounded-xl border border-border/70 bg-parchment-dark/25 p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-border/40">
                          <div>
                            <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="text-teal" />
                              Affirmations à évaluer ({(q.options || []).length})
                            </span>
                            <span className="text-[11px] text-muted italic">
                              {isEveryAnswerCorrect(q)
                                ? 'Mode positionnement / sondage : toute réponse est acceptée sans pénalité'
                                : 'Indiquez la réponse attendue pour chaque affirmation'}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => toggleEveryAnswerCorrect(q.key)}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border',
                              isEveryAnswerCorrect(q)
                                ? 'bg-teal-50 border-teal text-teal-dark font-semibold shadow-2xs'
                                : 'bg-white border-border text-muted hover:text-navy hover:border-teal/40 shadow-2xs'
                            )}
                            title="Marquer comme question de positionnement / sondage : toute réponse est acceptée et le barème est fixé à 0 pt"
                          >
                            <Sparkles size={12} className={isEveryAnswerCorrect(q) ? 'text-teal' : 'text-muted'} />
                            {isEveryAnswerCorrect(q)
                              ? '✓ Toute réponse acceptée (sans barème / 0 pt)'
                              : 'Toute réponse est correcte (sans barème)'}
                          </button>
                        </div>

                        <div className="space-y-2">
                          {(q.options || []).map((item: VraiFauxItem, itemIdx: number) => (
                            <div key={item.id || itemIdx} className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-navy w-5 text-center">
                                {itemIdx + 1}.
                              </span>
                              <input
                                type="text"
                                value={item.text}
                                onChange={(e) => updateVfItem(q.key, itemIdx, { text: e.target.value })}
                                placeholder="Affirmation (ex : La mémoire ROM est une mémoire vive volatile)..."
                                className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                              />

                              {isEveryAnswerCorrect(q) ? (
                                <div className="px-2.5 py-1 text-xs font-medium bg-teal-50 text-teal-dark border border-teal/40 rounded-lg shrink-0">
                                  ✓ Libre (0 pt)
                                </div>
                              ) : (
                                <div className="flex rounded-lg border border-border overflow-hidden shrink-0 bg-white">
                                  <button
                                    type="button"
                                    onClick={() => updateVfItem(q.key, itemIdx, { isVrai: true })}
                                    className={cn(
                                      'px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer',
                                      item.isVrai
                                        ? 'bg-green text-white font-semibold'
                                        : 'text-muted hover:bg-parchment-dark/40'
                                    )}
                                  >
                                    ✓ Vrai
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => updateVfItem(q.key, itemIdx, { isVrai: false })}
                                    className={cn(
                                      'px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border-l border-border',
                                      !item.isVrai
                                        ? 'bg-red text-white font-semibold'
                                        : 'text-muted hover:bg-parchment-dark/40'
                                    )}
                                  >
                                    ✗ Faux
                                  </button>
                                </div>
                              )}

                              {(q.options || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeVfItem(q.key, itemIdx)}
                                  className="p-1.5 text-muted hover:text-red rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Supprimer cette affirmation"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addVfItem(q.key)}
                          className="inline-flex items-center gap-1.5 text-xs text-teal font-medium hover:text-teal-dark pt-1 transition-colors cursor-pointer"
                        >
                          <Plus size={13} /> Ajouter une affirmation
                        </button>
                      </div>
                    )}

                    {/* 3. Appariement */}
                    {q.type === 'appariement' && (
                      <div className="rounded-xl border border-border/70 bg-parchment-dark/25 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                            <ArrowRightLeft size={14} className="text-teal" />
                            Paires à relier ({(q.options || []).length})
                          </span>
                          <span className="text-[11px] text-muted italic">
                            Colonne A (Élément) ↔ Colonne B (Correspondance)
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(q.options || []).map((pair: AppariementPair, pIdx: number) => (
                            <div key={pair.id || pIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={pair.left}
                                onChange={(e) => updateAppariementPair(q.key, pIdx, { left: e.target.value })}
                                placeholder="Élément gauche (ex : Routeur)..."
                                className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                              />
                              <span className="text-teal font-bold text-xs shrink-0 px-1">↔</span>
                              <input
                                type="text"
                                value={pair.right}
                                onChange={(e) => updateAppariementPair(q.key, pIdx, { right: e.target.value })}
                                placeholder="Élément droit (ex : Interconnexion des réseaux)..."
                                className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                              />

                              {(q.options || []).length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeAppariementPair(q.key, pIdx)}
                                  className="p-1.5 text-muted hover:text-red rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Supprimer cette paire"
                                >
                                  <X size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addAppariementPair(q.key)}
                          className="inline-flex items-center gap-1.5 text-xs text-teal font-medium hover:text-teal-dark pt-1 transition-colors cursor-pointer"
                        >
                          <Plus size={13} /> Ajouter une paire à relier
                        </button>
                      </div>
                    )}

                    {/* 4. Question Ouverte */}
                    {q.type === 'ouvert' && (
                      <div className="rounded-xl border border-border/70 bg-parchment-dark/25 p-4 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-navy">
                          <FileQuestion size={14} className="text-teal" />
                          Corrigé indicatif & critères d'évaluation (optionnel)
                        </div>
                        <textarea
                          rows={2}
                          value={q.reponse_attendue || ''}
                          onChange={(e) => updateQuestion(q.key, { reponse_attendue: e.target.value })}
                          placeholder="Mots-clés attendus, barème détaillé par critère ou réponse type..."
                          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-xs text-navy placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-teal resize-y"
                        />
                        <p className="text-[11px] text-muted">
                          Ce guide de correction restera réservé à l'enseignant pour la grille d'évaluation.
                        </p>
                      </div>
                    )}

                    {/* 5. Exercice guidé */}
                    {q.type === 'exercice' && (
                      <div className="rounded-xl border border-border/70 bg-parchment-dark/25 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-navy flex items-center gap-1.5">
                            <ListChecks size={14} className="text-teal" />
                            Sous-questions / Étapes guidées ({(q.options || []).length})
                          </span>
                          <span className="text-[11px] text-muted italic">
                            Décomposez l'exercice en questions intermédiaires
                          </span>
                        </div>

                        <div className="space-y-2">
                          {(q.options || []).map((sq: SousQuestionItem, sqIdx: number) => (
                            <div key={sq.id || sqIdx} className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-navy w-6 text-center">
                                {sqIdx + 1})
                              </span>
                              <input
                                type="text"
                                value={sq.text}
                                onChange={(e) => updateSousQuestion(q.key, sqIdx, e.target.value)}
                                placeholder={`Sous-question ${sqIdx + 1} (ex : Calculer la taille du fichier en kilo-octets)...`}
                                className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-teal"
                              />

                              <button
                                type="button"
                                onClick={() => removeSousQuestion(q.key, sqIdx)}
                                className="p-1.5 text-muted hover:text-red rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                title="Supprimer cette sous-question"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>

                        <button
                          type="button"
                          onClick={() => addSousQuestion(q.key)}
                          className="inline-flex items-center gap-1.5 text-xs text-teal font-medium hover:text-teal-dark pt-1 transition-colors cursor-pointer"
                        >
                          <Plus size={13} /> Ajouter une sous-question
                        </button>
                      </div>
                    )}
                  </div>
                );
              });
            })()}
              </div>

              {/* Boutons d'ajout rapide */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={addSection}
                  className="border-dashed border-navy/40 text-navy bg-navy/5 hover:bg-navy/10 cursor-pointer font-medium"
                  title="Ajouter un séparateur de partie ou section"
                >
                  <Layers size={13} className="text-navy" />+ Séparateur de Partie
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('qcm')}>
                  <Plus size={13} />+ QCM
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('tableau')}>
                  <Plus size={13} />+ Tableau
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('vrai_faux')}>
                  <Plus size={13} />+ Vrai / Faux
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('ouvert')}>
                  <Plus size={13} />+ Question Ouverte
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('appariement')}>
                  <Plus size={13} />+ Appariement
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addQuestion('exercice')}>
                  <Plus size={13} />+ Exercice
                </Button>
              </div>

              <label className="flex items-center gap-2 text-xs text-navy cursor-pointer pt-2 border-t border-border/50">
                <input
                  type="checkbox"
                  checked={saveToBank}
                  onChange={(e) => setSaveToBank(e.target.checked)}
                  className="accent-teal cursor-pointer"
                />
                Enregistrer ces questions dans la banque (réutilisables pour de futurs examens)
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.push('/examens')}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              Créer l'examen
            </Button>
          </div>
        </form>

        {/* Modal : Banque de questions */}
        <Modal open={bankOpen} onClose={() => setBankOpen(false)} title="Banque de Questions">
          <div className="space-y-3">
            {bank.length === 0 ? (
              <p className="text-sm text-muted py-6 text-center">
                Banque vide — cochez « Enregistrer ces questions dans la banque » lors de la création d'un examen pour la remplir.
              </p>
            ) : (
              <>
                <div className="max-h-72 overflow-y-auto rounded-lg border border-border divide-y divide-border/50">
                  {bank.map((q) => (
                    <label
                      key={q.id}
                      className={cn(
                        'flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors',
                        bankSelected.has(q.id) ? 'bg-teal-50' : 'hover:bg-parchment-dark/40'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={bankSelected.has(q.id)}
                        onChange={() =>
                          setBankSelected((prev) => {
                            const n = new Set(prev);
                            if (n.has(q.id)) n.delete(q.id);
                            else n.add(q.id);
                            return n;
                          })
                        }
                        className="mt-0.5 accent-teal cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-navy">{q.enonce || '(sans énoncé)'}</span>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted">
                          <span className="uppercase font-semibold text-teal">{q.type}</span>
                          <span>·</span>
                          <span>{q.bareme} pt(s)</span>
                          {q.image_url && <span>· [avec image]</span>}
                          {Array.isArray(q.options) && q.options.length > 0 && (
                            <span>· {q.options.length} élément(s)</span>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          deleteFromBank(q.id);
                        }}
                        className="text-muted/40 hover:text-red p-1 cursor-pointer"
                        title="Supprimer de la banque"
                        aria-label="Supprimer de la banque"
                      >
                        <Trash size={13} />
                      </button>
                    </label>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="teal">{bankSelected.size} sélectionnée(s)</Badge>
                  <Button size="sm" onClick={importFromBank} disabled={bankSelected.size === 0}>
                    <Plus size={13} /> Importer la sélection
                  </Button>
                </div>
              </>
            )}
          </div>
        </Modal>

        {/* Modal : Aperçu image */}
        <Modal open={!!previewImageUrl} onClose={() => setPreviewImageUrl(null)} title="Illustration de la question">
          {previewImageUrl && (
            <div className="space-y-3">
              <div className="max-h-[70vh] overflow-hidden rounded-lg bg-black/5 flex items-center justify-center p-2">
                <img
                  src={previewImageUrl}
                  alt="Aperçu question"
                  className="max-h-[65vh] max-w-full object-contain rounded"
                />
              </div>
              <div className="flex justify-end">
                <Button size="sm" variant="secondary" onClick={() => setPreviewImageUrl(null)}>
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </PageTransition>
  );
}
