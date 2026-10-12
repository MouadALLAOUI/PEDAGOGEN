# PEDAGOGEN — Feature & UX Improvement Proposals

Everything below is grounded in the current codebase (tables, routes and components named). Organized by effort vs impact. Nothing here requires a new dependency unless stated.

---

## 1. Quick wins (small effort, immediately visible)

| Idea | Where | Why |
|---|---|---|
| **Grille de notation : clavier + autosave** | `examens/[id]/grille` | Enter advances to the next student in the same question, Tab moves right, notes autosave (debounced POST like the status page does) + localStorage draft. Grade entry on paper is the most repetitive task in the app. |
| **"Dupliquer l'examen"** | `examens/[id]` | Copy an exam (questions, classes) with a new date. Teachers reuse Contrôle 1 → Contrôle 2 structure. One POST reusing `createExam`. |
| **Modèle CSV téléchargeable** | `classes/[id]/import` | A "Télécharger le modèle" button serving a 3-row sample CSV with the exact accepted headers (nom;prenom;CNE;classe;niveau;genre). Kills the #1 import confusion. |
| **Import des notes par CSV** | `examens/[id]/grille` | Spec'd but not yet built: upload `CNE;Q1;Q2;...` after paper correction, match students by CNE, reuse the import preview/validation pattern from `csvImport.ts`. |
| **Undo au lieu de confirm()** | All list pages | `toast('Classe supprimée', { action: { label: 'Annuler', onClick: restore } })` — delete stays reversible for a few seconds. Less fear, fewer mistakes. |
| **Lier le dashboard aux modules** | `(dashboard)/page.tsx` | The "Documents" card and shortcuts still only target generation/history. Add recent exams + notebook entries + a "Continuer" card (last notebook entry per class with a "Réaliser la séance suivante" button). |
| **Auto-remplissage de la leçon** | `/generate` | Autocomplete `unite`/`lecon` from history (LIKE query) so teachers don't retype metadata for lessons they already generated. |

## 2. Feature additions by module

### Génération (the core)
- **Générer pour plusieurs classes d'un coup** — metadata already carries niveau; allow selecting classes (from the new `classes` table) and produce per-class variants (e.g. differentiated résumé élève). The heavy route loop already iterates documents; add a class dimension.
- **Présets de génération** — save `metadata + includePrompt + excludePrompt + documentsToGenerate` as a named preset (table exists: reuse `custom_prompts` pattern). "Mon format de fiche 2AC" en un clic.
- **Évaluation générée depuis la fiche / le cours** — a button on a completed fiche: "Créer l'évaluation de cette leçon" → pre-fills `/examens/new` or runs `generate_evaluation` with the cours content as reference. Closes the loop fiche → évaluation → analyse → carnet.
- **Choix du modèle par document** — the heavy route already supports per-doc models; expose it in the UI (e.g. deepseek-style model for évaluation, fast model for résumé). Store per-doc choice in settings.
- **Suivi des tokens par mois** — `tokens_used` exists on every generation row; add a small stats card on the dashboard (this month, per mode) + a soft monthly budget warning in settings.

### Classes & Élèves
- **Résultats d'examens dans le Dossier 360°** — the student page (`students/[id]`) already aggregates grades/attendance/observations. Feed `exam_grades` into it (normalized /20) and into `student_grades` so the AI advisor sees exam results too. One JOIN + a tab section.
- **Vue "élèves en difficulté" par enseignant** — cross-class list from exam profils (`en_difficulte`) + `needs_help` observations. Directly actionable before conseils de classe.
- **Fiche de transfert PDF** — export a student's 360° summary (already all in DB) as a printable PDF for administration/parents.

### Examens
- **Comparaison entre évaluations** — line per student across exams of the same class (progression). Data: `exam_grades` JOIN `exams` — a simple table + sparkline-style bars, no chart lib needed.
- **Banque de questions** — save questions with type/bareme (`question_bank` table), reuse when composing exams. Reduces exam creation to checkboxes.
- **Sujet d'évaluation imprimable (PDF élève)** — from exam questions generate a clean printable subject (distinct from the teacher's grille), using the existing ministerial header util.

### Carnet de Bord
- **Vue calendrier** — monthly grid beside the timeline (pure CSS grid, dates from `notebook_entries`).
- **Export du carnet (PDF archivage inspection)** — per class + period: entries + session feedbacks (`session_feedbacks` already exists!) merged into one printable document via jspdf.
- **Statuts à traiter** — a "planifiée" entry older than today shows as "à reporter/réalisée ?" on the dashboard.
- **Créer l'entrée depuis la génération** — after a successful generation, one click "Ajouter au carnet" pre-fills class/date/lecon and links the produced documents (the N:N `notebook_entry_documents` table is ready).

### Chatbot & Références
- **Chatbot contextuel** — attach a generated document or notebook entry to the conversation ("explique ce cours aux élèves"). Messages already stream; just inject content into the system prompt.
- **RAG sur le carnet** — index notebook résumés into the existing `reference_embeddings` vector store so generation can reference "ce que j'ai déjà traité avec cette classe".

## 3. UX overhaul items

- **Mobile / tablette d'abord pour l'usage en classe.** The in-class flows are: attendance, one-tap observations, saisie des notes, carnet. Audit these pages at 390px width — the tables (grille, attendance) need horizontal-scroll wrappers or card layout on small screens. This is the single biggest real-world UX factor: teachers hold a tablet during class.
- **Dark mode.** Theme tokens are already CSS variables in `globals.css` (`@theme inline`); add `.dark` overrides + a toggle in the TopBar next to the language toggle. ~1 hour of work for a visible win.
- **Palette de commandes (Ctrl+K).** Navigation + actions ("nouvelle fiche", "aller à 2AC Classe 1", "grille de Contrôle 1"). Pure client component over existing routes.
- **États de chargement uniformes.** `SkeletonFileList` exists — use it on every list page (classes, examens, notebook) instead of spinners.
- **Impression.** Print stylesheet for fiche + évaluation (the evaluation HTML already prints; make the preview print-friendly with `@media print` so teachers never need Word just to print).
- **Accessibilité.** Focus traps in modals, `aria-label` on icon buttons, visible focus rings (audit found gaps; the new pages follow the same patterns, so fix the shared `Modal` once).
- **Onboarding contextualisé.** The existing wizard shows once; extend it with 3 "first actions" (créer une classe → importer les élèves → générer une fiche) with real deep links.

## 4. Platform / architecture (already documented in IMPROVEMENTS.md)

- **R1** server-side history writes · **R2** per-user scoping of custom_prompts/references · **R3** FTS5 full-text search (history + notebook + files in one search) · **R4** retention for `data/generated` · **R5** structured logging · **R6** generation queue · **R7** smoke-test script.
- **Multi-utilisateur réel** — once R2 lands, per-teacher dashboards, per-teacher classes (the `user_id` columns are already everywhere).

## 5. Suggested order

1. **Sprint UX (quick wins)** — grille keyboard/autosave, duplicate exam, CSV template, notes import, undo toasts, dashboard links. All small, all daily-use.
2. **Connect the loop** — fiche → évaluation → carnet links, exam results in student 360°, "ajouter au carnet" after generation. This turns 4 separate modules into one product.
3. **In-class UX** — mobile audit of attendance/grille/observations, dark mode, skeletons.
4. **Bigger bets** — presets, question bank, multi-class generation, FTS5 search, calendar view.
