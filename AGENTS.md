# AGENTS.md — PEDAGOGEN

Next.js AI-powered pedagogical document generator for Moroccan collège teachers.

## Agent Guide

- keep my code dna structure  dont change the flow and logic
- dont change the design and style
- don't add new packages or dependencies without explicit instructions.
- if you need to fix a bug or an issue, keep the fix minimal and only address
- proiritize existing components and utilities over creating new ones, unless there's a clear gap that needs to be filled.

## GIT workflow

- always push all content `git add .`
- if i asked you to push to github, run this prompt `.agents\skills\git-workflow-agent\SKILL.md`
- always create a new branch for push.
- branch naming convention: `DEV{next_number}` for development branches (sequential: DEV11, DEV12, DEV13, ...) if exist jump it, `DEV{number}_{small_description}` for small changes (e.g., `DEV13_fix_login_bug`).

## Quick Commands

```bash
cd pedagogen          # ALWAYS cd here first — the Next.js project is in this subdirectory
npm run dev           # Dev server at localhost:3000
npm run build         # Production build
npm run start         # Production server
```

## Architecture

```
PEDAGOGEN/                    # Workspace root (NOT the Next.js project)
├── pedagogen/                # ← The actual Next.js app lives here
│   ├── src/app/              #   App Router pages + API routes
│   ├── src/components/       #   UI, layout, generate, references
│   ├── src/lib/agents/       #   HuggingFace AI agent logic
│   ├── src/lib/builders/     #   DOCX, PPTX, PDF, MD document builders
│   ├── src/lib/curriculum/   #   Moroccan curriculum metadata (1AC/2AC/3AC)
│   └── src/lib/utils/        #   cn(), fileStorage, tokenEstimator
├── .agents/skills/           #   Agent skills (git-workflow, laravel, frontend-design)
└── Prompt.md                 #   Project spec / design doc
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, `src/` dir)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS v4 (`@tailwindcss/postcss`) — no `tailwind.config` file, uses `@theme inline` in `globals.css`
- **AI:** HuggingFace Inference API via `fetch()` — model `openai/gpt-oss-120b:fastest`
- **DB/Storage:** Supabase (Docker self-hosted)
- **State:** React Context
- **Forms:** React Hook Form + Zod v4
- **Animations:** Anime.js v4
- **Icons:** Lucide React
- **File gen:** `docx`, `pptxgenjs`, `jspdf`, `marked`

## Environment Variables

Create `pedagogen/.env.local`:

```
HF_TOKEN=hf_your_token_here
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

⚠️ **Naming mismatch:** The root `.env` file uses `hugging_face_api` but the code reads `process.env.HF_TOKEN`. Always use `HF_TOKEN`.

## Supabase Setup (Docker)

```bash
# Start Supabase
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f

# Stop
docker compose down
```

**Services:**
| Service | Port | URL |
|---------|------|-----|
| Kong (API Gateway) | 54321 | http://localhost:54321 |
| Studio (Dashboard) | 3001 | http://localhost:3001 |
| Database (PostgreSQL) | 5432 | localhost:5432 |

**Default credentials:**
- Postgres: `postgres` / `postgres`
- Anon key: in `.env` (root)
- Service role key: in `.env` (root)

**Migration:** The SQL migration at `supabase/migrations/001_initial.sql` runs automatically on first `docker compose up`. It creates:
- Tables: `generations`, `reference_files`, `generated_files`
- Storage buckets: `references`, `generated`

## Key Conventions

- **Tailwind v4:** No config file. Custom theme colors defined in `globals.css` via `@theme inline` block (navy, teal, parchment, gold, etc.)
- **Fonts:** Playfair Display (display), Inter (body), Noto Sans Arabic — loaded via Google Fonts in `globals.css`
- **Path alias:** `@/*` maps to `./src/*`
- **API routes:** SSE streaming for heavy/medium modes, JSON response for light mode
- **Document types:** `fiche_pedagogique`, `planification`, `plan_gestion_classe`, `evaluation`, `cours_complet`, `resume_eleve`, `presentation_pptx`, `images_illustratives`
- **Generation modes:** `heavy` (all docs, streaming), `medium` (user-selected docs), `light` (markdown only)
- **Output formats:** `docx`, `pptx`, `pdf`, `md`

## Agent Skills

- `git-workflow-agent` — Branch naming: `DEV01`, `DEV02`, etc. Commit format: `[DEVXX] type: description`
- `frontend-design` — Avoid generic AI aesthetics. Use distinctive typography, bold color choices.
- `laravel-best-practices` — Not relevant to this project (skill exists for reuse elsewhere).

## Gotchas

1. **Always work inside `pedagogen/`** — the workspace root is NOT the Next.js project
2. **Tailwind v4 has no config file** — theme customization is CSS-first via `@theme inline`
3. **Zod v4** is installed (not v3) — import patterns may differ
4. **React 19** is installed — check for API changes from React 18
5. **No ESLint config** — project has no `.eslintrc` or `eslint.config`
6. **No test framework** — no Jest/Vitest configured yet
7. **`globals.css` imports Google Fonts directly** — no `next/font` for these fonts
8. **API routes use HuggingFace, not Anthropic** — the `Prompt.md` spec mentions Anthropic but the implementation uses HuggingFace Router API
