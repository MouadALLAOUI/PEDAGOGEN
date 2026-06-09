# PEDAGOGEN — Structured Agent Prompt

Next.js AI-Powered Pedagogical Document Generator for Moroccan Teachers

---

## 🧭 PROJECT OVERVIEW

You are building **PEDAGOGEN**, a Next.js web application that uses AI agents to generate pedagogical documents for Moroccan college teachers (collège: 1AC, 2AC, 3AC). The app has a professional, educational-authority aesthetic using **Anime.js** for animations and **Lucide React** for icons.

---

## 🗂️ TECH STACK

```
Framework        : Next.js 14+ (App Router)
Language         : TypeScript
Styling          : Tailwind CSS
Icons            : lucide-react
Animations       : animejs (v4)
AI SDK           : Anthropic SDK (@anthropic-ai/sdk) — local agents via API routes
File Generation  : docx (docxjs), pptxgenjs, jsPDF or pdfkit, marked (for md)
State            : Zustand or React Context
Upload/Storage   : Local filesystem (Next.js /public or /uploads) or Supabase Storage
Form Handling    : React Hook Form + Zod
```

---

## 📁 PROJECT STRUCTURE

```
pedagogen/
├── app/
│   ├── layout.tsx                  # Root layout, global fonts, providers
│   ├── page.tsx                    # Landing / Dashboard
│   ├── generate/
│   │   ├── page.tsx                # Generation Hub (mode selector)
│   │   └── [mode]/
│   │       └── page.tsx            # Heavy / Medium / Light generation pages
│   ├── references/
│   │   └── page.tsx                # Reference Files Manager
│   └── history/
│       └── page.tsx                # Generated Documents History
│
├── api/
│   ├── generate/
│   │   ├── heavy/route.ts          # Heavy mode agent (streaming)
│   │   ├── medium/route.ts         # Medium mode agent
│   │   └── light/route.ts          # Light mode agent
│   └── references/
│       └── route.ts                # CRUD for reference files
│
├── components/
│   ├── ui/                         # Reusable primitives (Button, Card, Modal, Badge...)
│   ├── layout/
│   │   ├── Sidebar.tsx
│   │   ├── TopBar.tsx
│   │   └── PageTransition.tsx      # Anime.js page transitions
│   ├── generate/
│   │   ├── ModeSelector.tsx        # Heavy / Medium / Light cards
│   │   ├── CourseForm.tsx          # Lesson metadata form
│   │   ├── DocumentPicker.tsx      # Medium mode: pick which docs to generate
│   │   ├── GenerationProgress.tsx  # Token stream + progress animation
│   │   └── OutputPreview.tsx       # Preview before download
│   └── references/
│       ├── FileUploader.tsx
│       └── ReferenceCard.tsx
│
├── lib/
│   ├── agents/
│   │   ├── heavyAgent.ts           # Full course generation orchestrator
│   │   ├── mediumAgent.ts          # Selective document generator
│   │   ├── lightAgent.ts           # Markdown-only fast generator
│   │   └── agentTools.ts           # Shared tool definitions (file builder, image fetcher...)
│   ├── builders/
│   │   ├── docxBuilder.ts          # DOCX output builder
│   │   ├── pptxBuilder.ts          # PPTX output builder
│   │   ├── pdfBuilder.ts           # PDF output builder
│   │   └── mdBuilder.ts            # Markdown output
│   ├── curriculum/
│   │   └── moroccoCollege.ts       # Hardcoded curriculum metadata (1AC/2AC/3AC subjects, levels)
│   └── utils/
│       ├── tokenEstimator.ts       # Estimate token cost before generation
│       └── fileStorage.ts          # Save/read reference files from disk or DB
│
├── types/
│   ├── generation.ts               # GenerationMode, DocumentType, CourseMetadata...
│   └── references.ts               # ReferenceFile, FileCategory...
│
└── public/
    └── references/                 # Default uploaded reference files
```

---

## ⚙️ CORE TYPES

```typescript
// types/generation.ts

type GenerationMode = 'heavy' | 'medium' | 'light';

type DocumentType =
  | 'fiche_pedagogique'
  | 'planification'
  | 'plan_gestion_classe'
  | 'evaluation'
  | 'cours_complet'
  | 'resume_eleve'
  | 'presentation_pptx'
  | 'images_illustratives';

type OutputFormat = 'docx' | 'pptx' | 'pdf' | 'md';

interface CourseMetadata {
  niveau: '1AC' | '2AC' | '3AC';
  matiere: string;               // e.g. "Mathématiques", "Sciences de la Vie"
  unite: string;                 // Unité / Chapitre
  lecon: string;                 // Titre de la leçon
  duree: number;                 // Duration in minutes
  competences: string[];         // Target competences
  langue: 'fr' | 'ar' | 'fr+ar'; // Language of output
  semestre: 1 | 2;
}

interface GenerationRequest {
  mode: GenerationMode;
  metadata: CourseMetadata;
  documentsToGenerate?: DocumentType[];  // used in medium mode
  outputFormat: OutputFormat | OutputFormat[];
  useReferences: boolean;        // inject user-uploaded reference files
}

interface GenerationResult {
  id: string;
  createdAt: Date;
  mode: GenerationMode;
  metadata: CourseMetadata;
  files: GeneratedFile[];
  tokensUsed: number;
  durationMs: number;
}

interface GeneratedFile {
  name: string;
  type: DocumentType;
  format: OutputFormat;
  url: string;                   // local download URL
  sizeKb: number;
}
```

---

## 🤖 AGENT ARCHITECTURE

### Generation Modes

#### 🔴 HEAVY MODE — Full Course Package

```
Entry: POST /api/generate/heavy
Agent type: Multi-step orchestration (sequential tool calls)
Max one per day (enforced via rate-limit cookie or DB flag)

Steps:
1. Parse CourseMetadata + inject reference files as context
2. TOOL: generate_fiche_pedagogique → structured JSON
3. TOOL: generate_planification → weekly/monthly sequence
4. TOOL: generate_cours_complet → full lesson content (objectives, activities, evaluation)
5. TOOL: generate_gestion_classe → classroom management notes
6. TOOL: generate_resume_eleve → student-facing summary
7. TOOL: generate_pptx_outline → slide structure
8. BUILDER: Compile all to DOCX + PPTX + PDF bundle
9. Stream progress events back to client via SSE

Token budget: ~15,000–30,000 tokens
Output: ZIP of DOCX + PPTX + PDF
```

#### 🟡 MEDIUM MODE — Selective Document Generator

```
Entry: POST /api/generate/medium
Agent type: Parallel tool calls based on selected DocumentTypes

Steps:
1. User selects which documents they want (DocumentPicker UI)
2. For each selected document: fire corresponding agent tool
3. Agent calls tools in parallel where possible
4. Stream individual document completion events
5. Build files in selected format(s)

Token budget: ~3,000–12,000 tokens (variable)
Output: Selected docs in chosen format(s)
```

#### 🟢 LIGHT MODE — Quick Markdown Lesson

```
Entry: POST /api/generate/light
Agent type: Single-turn, no tools

Steps:
1. Single prompt with CourseMetadata
2. System prompt enforces Moroccan curriculum structure
3. Returns structured Markdown with:
   - Objectifs
   - Prérequis
   - Déroulement (Introduction / Activité / Synthèse)
   - Évaluation rapide
4. Return raw .md file for download

Token budget: ~500–2,000 tokens
Output: .md file only
```

---

## 🛠️ AGENT TOOLS DEFINITION

Define these as Anthropic tool_use tools inside the agent routes:

```typescript
// lib/agents/agentTools.ts

export const pedagogicalTools = [
  {
    name: "generate_fiche_pedagogique",
    description: "Generate a complete fiche pédagogique following the Moroccan Ministry of Education format.",
    input_schema: {
      type: "object",
      properties: {
        metadata: { $ref: "#/CourseMetadata" },
        competences_visees: { type: "array", items: { type: "string" } },
        activites: { type: "array", items: { type: "string" } },
        evaluation_type: { type: "string", enum: ["formative", "sommative", "diagnostique"] }
      },
      required: ["metadata"]
    }
  },
  {
    name: "generate_planification",
    description: "Generate a semester planification sequence for a given subject and level.",
    input_schema: { ... }
  },
  {
    name: "generate_cours_complet",
    description: "Generate the full lesson content including teacher script, student activities, and blackboard layout.",
    input_schema: { ... }
  },
  {
    name: "generate_gestion_classe",
    description: "Generate a classroom management plan tailored to Moroccan collège context.",
    input_schema: { ... }
  },
  {
    name: "generate_resume_eleve",
    description: "Generate a student-facing lesson summary in simplified French or Arabic.",
    input_schema: { ... }
  },
  {
    name: "generate_pptx_outline",
    description: "Generate a structured PPTX slide outline (titles, bullets, speaker notes).",
    input_schema: { ... }
  }
]
```

---

## 📎 REFERENCE FILES SYSTEM

### Categories

```typescript
type ReferenceCategory =
  | 'fiche_structure'     // Blank fiche templates
  | 'curriculum'          // Official programme scolaire
  | 'livre_blanc'         // Livre blanc de l'éducation
  | 'instructions_ministerielle' // Circulaires et notes ministérielles
  | 'custom';             // User-defined references
```

### Behavior

- Files are uploaded via the **References** page
- Stored locally in `/public/references/` or a DB
- When `useReferences: true` in a generation request, the agent retrieves relevant files and injects them as document blocks in the system prompt context
- Each file shows: filename, category badge, upload date, size, delete button

---

## 🎨 UI DESIGN SYSTEM

### Visual Identity

- **Palette**: Deep navy `#0F172A` base, warm parchment `#FDF6E3` surfaces, accent Moroccan teal `#0D9488`, gold `#D97706` for badges/modes
- **Typography**: Display — `Playfair Display` (authority); Body — `Inter`; Arabic support via `Noto Sans Arabic`
- **Mode color coding**: Heavy = `#DC2626` (red), Medium = `#D97706` (amber), Light = `#16A34A` (green)
- **Signature element**: Animated Moroccan geometric pattern (zellige) as a subtle background motif on the dashboard

### Anime.js Usage

```typescript
// Page entrance: stagger cards on mount
anime({
  targets: '.mode-card',
  translateY: [40, 0],
  opacity: [0, 1],
  delay: anime.stagger(120),
  easing: 'easeOutExpo',
  duration: 600
});

// Generation progress: pulsing token counter
anime({
  targets: '#token-counter',
  innerHTML: [0, currentTokens],
  round: 1,
  easing: 'easeOutQuad',
  duration: 800
});

// Document completion: check-in animation per doc
anime({
  targets: `#doc-${docType}`,
  scale: [0.8, 1],
  opacity: [0, 1],
  easing: 'spring(1, 80, 10, 0)'
});
```

---

## 📄 PAGE SPECIFICATIONS

### `/` — Dashboard

- Stats: Total docs generated, tokens used this week, last generation
- Quick-action cards: Start Heavy / Medium / Light
- Recent generations list
- Token quota indicator (especially for Heavy mode: "1 heavy session remaining today")

### `/generate` — Generation Hub

- Mode selector (3 animated cards with mode description, estimated time, token cost range)
- On select → CourseForm appears with animated slide-in

### `/generate/[mode]` — Generation Page

- CourseForm (niveau, matière, unité, leçon, langue, durée, compétences)
- Medium mode: DocumentPicker checklist
- Format selector (DOCX / PPTX / PDF / MD depending on mode)
- "Lancer la génération" CTA → triggers stream
- GenerationProgress: live step tracker + token counter
- OutputPreview: rendered preview + download buttons

### `/references` — Reference Files

- Upload dropzone (accepts PDF, DOCX, TXT)
- Category selector per file
- File cards grid with metadata
- "Apply to all generations" global toggle

### `/history` — Document History

- Table of all generated documents
- Filter by mode, niveau, matière, date
- Re-download or re-generate from same metadata

---

## 🔌 API ROUTE CONTRACTS

```typescript
// POST /api/generate/heavy
// Body: GenerationRequest (mode: 'heavy')
// Response: Server-Sent Events stream
// Events:
//   { type: 'step', step: 'fiche_pedagogique', status: 'started' }
//   { type: 'step', step: 'fiche_pedagogique', status: 'done' }
//   { type: 'tokens', used: 3240, total: 28000 }
//   { type: 'file', name: 'cours_1AC_math.docx', url: '/downloads/...' }
//   { type: 'done', result: GenerationResult }
//   { type: 'error', message: '...' }

// POST /api/generate/medium
// Same contract, fewer steps

// POST /api/generate/light
// Body: GenerationRequest (mode: 'light')
// Response: JSON { markdown: string, downloadUrl: string }
```

---

## ✅ IMPLEMENTATION PHASES

### Phase 1 — Foundation

- [ ] Next.js project scaffold with Tailwind + Lucide + Anime.js
- [ ] Design system: colors, fonts, component primitives (Button, Card, Badge, Modal)
- [ ] Layout: Sidebar + TopBar + PageTransition
- [ ] Dashboard page (static, no AI yet)

### Phase 2 — Reference System

- [ ] References page UI
- [ ] File upload API route
- [ ] ReferenceCard component
- [ ] File retrieval utility for agent context injection

### Phase 3 — Light Mode Agent

- [ ] CourseForm component
- [ ] Light mode API route (single-turn Anthropic call)
- [ ] Markdown builder + download
- [ ] Generation page for light mode

### Phase 4 — Medium Mode Agent

- [ ] DocumentPicker component
- [ ] Medium mode API route (parallel tool calls)
- [ ] DOCX + PDF builders
- [ ] SSE streaming + GenerationProgress component

### Phase 5 — Heavy Mode Agent

- [ ] Multi-step orchestration agent
- [ ] PPTX builder
- [ ] ZIP bundler
- [ ] Daily rate limit enforcement
- [ ] OutputPreview with per-file download

### Phase 6 — Polish

- [ ] History page
- [ ] Token usage tracking
- [ ] Anime.js signature animations
- [ ] Arabic language output support
- [ ] Mobile responsiveness

---

## 🌐 SYSTEM PROMPT TEMPLATE (injected per agent)

```
You are PEDAGOGEN, an AI assistant specialized in generating pedagogical documents for Moroccan collège teachers (1AC, 2AC, 3AC).

You follow the official Moroccan Ministry of Education curriculum guidelines.
You write in {langue} (French / Arabic / bilingual as specified).
You produce structured, practical, classroom-ready content.

The teacher is preparing: {lecon} — {matiere} — {niveau} — Semestre {semestre}
Unité: {unite}
Durée de la séance: {duree} minutes
Compétences visées: {competences}

{if useReferences}
Reference documents provided by the teacher:
{injected reference file contents}
{/if}

Always structure your output strictly for document builders.
Return valid JSON matching the requested schema — no extra prose.
```

---

## 🚀 BOOTSTRAP COMMAND

```bash
npx create-next-app@latest pedagogen \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd pedagogen

npm install \
  animejs \
  lucide-react \
  @anthropic-ai/sdk \
  docx \
  pptxgenjs \
  jspdf \
  marked \
  zustand \
  react-hook-form \
  zod \
  @hookform/resolvers \
  react-dropzone
```
