# PEDAGOGEN REMAKE — Rules & Architecture Principles

## 🎯 Core Principles

### 0. In-Place Refactor — No New Project

- **All changes happen inside `pedagogen/`** — The existing Next.js project is the target
- **No `npx create-next-app`** — Keep current `package.json`, `tsconfig.json`, `next.config.ts`
- **Refactor incrementally** — Rewrite files in place, delete/rename as needed, never start fresh
- **Preserve `globals.css` design tokens** — The Tailwind v4 theme (`@theme inline`) is already correct
- **Keep existing dependencies** — Only add new ones if absolutely necessary (ask first)
- **Delete stale code** — Old components, unused API routes, dead utils get removed as we replace them

### 1. Server-First with RSC (React Server Components)

- **Default to Server Components** — Only use `'use client'` when absolutely necessary (interactivity, browser APIs, hooks)
- **Data fetching in Server Components** — Use `async/await` directly in components, no SWR/TanStack Query for server data
- **Streaming with Suspense** — Use `<Suspense>` boundaries for progressive rendering
- **Server Actions for mutations** — Use Next.js Server Actions instead of API routes where possible

### 2. Strict Type Safety

- **Zero `any`** — Use `unknown` + type guards, branded types for IDs
- **Zod v4 everywhere** — Schemas for: env, API inputs, DB rows, AI outputs, form data
- **Infer types from Zod** — `type T = z.infer<typeof schema>`
- **Discriminated unions** — For generation modes, document types, provider types
- **Path aliases** — `@/*` maps to `./src/*` (e.g., `@/lib/ai`, `@/components/ui`, `@/types/generation`)

### 3. Layer-Based Architecture (Preferred)

```
src/
├── app/                   # Next.js App Router (routes, layouts, pages)
│   ├── (dashboard)/       # Dashboard route group
│   │   ├── generate/      # Generation pages
│   │   ├── references/    # References pages
│   │   ├── history/       # History pages
│   │   ├── settings/      # Settings pages
│   │   └── layout.tsx     # Dashboard layout
│   ├── (auth)/            # Auth route group
│   │   ├── login/
│   │   └── register/
│   ├── api/               # Only for webhooks, SSE endpoints
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Landing redirect
├── components/            # Reusable UI primitives (shared across features)
│   ├── ui/                # Button, Card, Input, Select, Modal, Badge, Toast...
│   ├── layout/            # Sidebar, TopBar, PageTransition
│   ├── generate/          # Generation-specific components (CourseForm, DocumentPicker, Progress, Preview)
│   ├── references/        # Reference-specific components (FileUploader, ReferenceCard)
│   └── auth/              # Auth components (AuthGuard, forms)
├── lib/                   # Core utilities & business logic
│   ├── ai/                # Multi-provider AI abstraction
│   │   ├── providers/     # None, HuggingFace, LM Studio implementations
│   │   ├── types.ts       # Provider interfaces, GenerateRequest/Result
│   │   └── factory.ts     # Provider factory
│   ├── agents/            # Agent orchestration (heavy, medium, light)
│   │   ├── tools/         # Tool definitions (one per document type)
│   │   ├── heavyAgent.ts
│   │   ├── mediumAgent.ts
│   │   └── lightAgent.ts
│   ├── builders/          # Document builders (docx, pptx, pdf, md, zip)
│   ├── curriculum/        # Morocco curriculum metadata (1AC/2AC/3AC)
│   ├── db/                # Database layer
│   │   ├── schema.ts      # SQLite schema + migrations
│   │   ├── client.ts      # better-sqlite3 singleton
│   │   └── repositories/  # Repository classes (UserRepo, GenerationRepo, ReferenceRepo)
│   ├── auth/              # Auth utilities (JWT, bcrypt, cookies)
│   ├── utils/             # Shared helpers (cn, date, tokenEstimator, validation)
│   └── validators/        # Zod schemas (env, forms, API, DB rows)
├── hooks/                 # Shared React hooks (useTheme, useLanguage, useAuth)
├── providers/             # React Context providers (Theme, Language, Auth, Toast)
├── types/                 # Shared branded types & discriminated unions
│   ├── generation.ts      # GenerationMode, DocumentType, CourseMetadata...
│   ├── references.ts      # ReferenceFile, FileCategory...
│   ├── ai.ts              # Provider, Model, GenerateEvent...
│   └── branded.ts         # Brand<Type, 'UserId'> etc.
├── styles/                # Global styles (globals.css, markdown.css)
└── middleware.ts          # Auth guard, i18n, rate limiting
```

### 4. Multi-Provider AI Abstraction (Simplified for Now)

```typescript
// Provider interface — all providers implement this
interface AIProvider {
  readonly id: string;
  readonly name: string;
  readonly models: Model[];
  generate(request: GenerateRequest): AsyncIterable<GenerateEvent> | Promise<GenerateResult>;
}

// Supported providers (user selects in settings)
- "none"           // No AI connected → returns structured template/layout only
- "huggingface"    // HuggingFace Router API (gpt-oss-120b, etc.)
- "lmstudio"       // LM Studio local server (OpenAI-compatible API)
```

### 5. SQLite-First Persistence

- **better-sqlite3** for dev/prod (single file, zero config)
- **Repository pattern** — Clean data access layer
- **Migrations** — Simple numbered SQL files in `migrations/`
- **No ORM** — Raw SQL with typed row mappers (performance + control)

---

## 📋 Development Rules

### Component Reuse Rules

1. **Always use existing components first** — Before writing `<input>`, `<select>`, or any UI element, check if a matching component exists in `components/ui/`. Use `<Input>`, `<Select>`, `<Button>`, etc.
2. **Never duplicate elements across pages** — If the same UI pattern appears in 2+ pages, extract it into a shared component in `components/`. Examples: mode selector cards, progress tracker, file list, metadata form.
3. **Co-locate page-specific components** — Components used by only one page go in `components/{feature}/`. Components shared across pages go in `components/ui/`.

### Build Discipline

- **Do NOT run `npm run build` unless explicitly asked or you just fixed a type/lint error.** The build is slow (~30s+). Use `tsc --noEmit` for quick type checks instead.

### Code Quality

1. **No new dependencies without approval** — Use existing: `zod`, `animejs`, `lucide-react`, `docx`, `pptxgenjs`, `jspdf`, `marked`, `react-hook-form`, `zustand`, `better-sqlite3`, `jose`, `bcryptjs`
2. **ESLint + Prettier** — Add `eslint.config.mjs` with strict rules
3. **TypeScript strict mode** — Already enabled, keep it
4. **No inline styles** — Use Tailwind v4 `@theme inline` + CSS variables
5. **Component co-location** — Keep components near their feature

### Git Workflow

- Branch: `DEV{next_number}_{short_desc}` (e.g., `DEV13_foundation`)
- Commits: `[DEVXX] type: description` (feat, fix, refactor, chore)
- Push: Always `git add .` then push to new branch

### AI Agent Rules

1. **Single responsibility per tool** — One tool = one document type
2. **Structured output only** — Tools return validated Zod schemas, never raw text
3. **Streaming via Server-Sent Events** — For heavy/medium modes
4. **Token estimation before generation** — Show user cost upfront
5. **Cancellation support** — AbortController for in-flight generations

### UI/UX Rules

1. **Design tokens in CSS** — Colors, fonts, spacing in `globals.css` `@theme inline`
2. **Anime.js for all motion** — Page transitions, stagger, progress, micro-interactions
3. **Playfair Display (display) + Inter (body) + Noto Sans Arabic** — No other fonts
4. **Mode colors**: Heavy=Red, Medium=Amber, Light=Green
5. **Zellige pattern** — Subtle background on dashboard
6. **RTL support** — `dir="rtl"` on `<html>` for Arabic
7. **Accessibility** — Semantic HTML, focus states, ARIA labels

### Performance Rules

1. **Bundle size budget** — < 100KB initial JS
2. **Dynamic imports** — Heavy libs (`docx`, `pptxgenjs`, `jspdf`) only on demand
3. **Image optimization** — Next.js `<Image>` always
4. **Caching** — `fetch(..., { next: { revalidate: 3600 } })` for static data
5. **Streaming** — Never buffer full AI response

---

## 🏗️ Implementation Phases

### Phase 1: Foundation — Scaffold, DB, Auth, UI Primitives

- [ ] New project scaffold with strict TS config
- [ ] Tailwind v4 + design tokens in `globals.css` (migrate existing theme)
- [ ] SQLite schema (`users`, `generations`, `references`, `settings`) + migrations
- [ ] Repository layer (UserRepo, GenerationRepo, ReferenceRepo, SettingsRepo)
- [ ] Auth: JWT + bcrypt, HttpOnly cookies, login/register/logout
- [ ] Shared UI primitives (Button, Card, Input, Select, Modal, Badge, Toast)
- [ ] Providers: Theme, Lang, Auth, Toast
- [ ] Middleware: auth guard + language detection
- [ ] Route groups: `(auth)` and `(dashboard)` layouts

### Phase 2: Multi-Provider AI Layer + Settings

- [ ] AI provider interface (`lib/ai/types.ts`): `AIProvider`, `GenerateRequest`, `GenerateEvent`, `Model`
- [ ] 3 provider implementations:
  - `none` → returns structured template data (no API call)
  - `huggingface` → HF Router API (`openai/gpt-oss-120b:fastest`)
  - `lmstudio` → LM Studio local server (OpenAI-compatible `fetch`)
- [ ] Provider factory (`lib/ai/factory.ts`) — resolves provider by user setting
- [ ] Settings page UI: provider selector + API key input + connection test
- [ ] Encrypted API key storage in SQLite (`settings` table)

### Phase 3: Generation Core — Agents, Tools, Builders, SSE

- [ ] Zod schemas for all generation types + document types
- [ ] Agent tools: `generate_fiche_pedagogique`, `generate_planification`, `generate_cours_complet`, `generate_gestion_classe`, `generate_resume_eleve`, `generate_pptx_outline`, `generate_images`
- [ ] Agent orchestration:
  - `heavyAgent.ts` — sequential tool calls, all docs
  - `mediumAgent.ts` — selected docs in parallel
  - `lightAgent.ts` — single-turn markdown
- [ ] Streaming SSE endpoint (`/api/generate/stream`)
- [ ] Document builders: `docxBuilder.ts`, `pptxBuilder.ts`, `pdfBuilder.ts`, `mdBuilder.ts`, `zipBuilder.ts`
- [ ] Token estimation utility (before generation)

### Phase 4: Generation UI

- [ ] Dashboard page: stats (docs, tokens, refs), quick-action cards, recent generations
- [ ] Generate hub (`/generate`): 3 animated mode selector cards
- [ ] Course form (`/generate/[mode]`): metadata form (RSC + Server Actions)
- [ ] Document picker (medium mode only): checkbox list
- [ ] Generation progress: live step tracker + token counter (Anime.js)
- [ ] Output preview + download buttons per file
- [ ] "No AI" mode: generates structured template/layout without API call

### Phase 5: References & History

- [ ] References page: upload dropzone, category selector, file cards grid
- [ ] Reference injection into agent context (when `useReferences: true`)
- [ ] History page: table with filter (mode, niveau, matière, date)
- [ ] Re-generate from existing metadata
- [ ] File download API route

### Phase 6: Polish — Animations, RTL, Responsive, Error Handling

- [ ] Anime.js: page transitions, stagger entries, progress animations, micro-interactions
- [ ] Arabic RTL support (`dir="rtl"` + font switching)
- [ ] Mobile responsiveness: <640px, 640-1024px, >1024px
- [ ] Error boundaries + toast notifications (react-hot-toast)
- [ ] Loading skeletons for async content
- [ ] Production build optimization: dynamic imports for heavy libs

---

## 🚫 Anti-Patterns (Do Not Do)

| Anti-Pattern | Correct Approach |
|--------------|------------------|
| API routes for everything | Server Actions + RSC |
| `useEffect` for data fetching | `async` Server Components |
| `any` type | `unknown` + type guard / Zod |
| Props drilling | Context for truly global state |
| Inline event handlers in Server Components | Server Actions or Client Components |
| Mixing server/client in same file | Separate files, clear boundary |
| Hardcoded strings | Constants + i18n keys |
| Direct DB calls in components | Repository layer |
| Buffering AI responses | Streaming SSE |
| Multiple providers in one file | Strategy pattern + interface |

---

## ✅ Definition of Done

A feature is complete when:

- [ ] TypeScript compiles with zero errors (`npm run build`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Unit tests for pure logic (when test framework added)
- [ ] Works in both French and Arabic (RTL)
- [ ] Mobile responsive (< 640px, 640-1024px, > 1024px)
- [ ] Accessible (keyboard nav, screen reader)
- [ ] Animated with Anime.js (entry, progress, completion)
- [ ] Documented in feature's `README.md`
