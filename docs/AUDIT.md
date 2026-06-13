# AUDIT — PEDAGOGEN

This document provides a comprehensive technical audit of the **PEDAGOGEN** project, covering its architecture, technology stack, database design, core agent workflows, and critical recommendations.

---

## 🧭 Project Overview

**PEDAGOGEN** is an AI-powered pedagogical document generator built with Next.js 16 (App Router). It is specifically designed to help Moroccan collège teachers (1AC, 2AC, 3AC) automatically generate high-quality, classroom-ready materials aligned with the official Moroccan Ministry of Education guidelines.

---

## 🛠️ Technology Stack & Dependencies

The project uses a modern web stack optimized for local development and self-hosted deployments:

### Core Framework & Runtime
- **Next.js 16 (App Router)** & **React 19**
- **TypeScript** (Strict Mode)

### Styling & Aesthetics
- **Tailwind CSS v4** (`@tailwindcss/postcss`) — Custom theme defined in `globals.css` via `@theme inline` (e.g. Navy, Teal, Gold, Parchment).
- **Typography**: Display: *Playfair Display*, Body: *Inter*, Arabic Support: *Noto Sans Arabic* (loaded directly via Google Fonts).
- **Animations**: **Anime.js v4** for custom, fluid micro-animations (page transitions, counters, step lists).
- **Icons**: **Lucide React**

### Database & Storage
- **better-sqlite3**: Relational SQLite database for user sessions, generation history, custom file metadata, and cache.
- **Local File System**: Uploaded reference files and generated documents are saved locally in the `data/` subdirectory.

### AI Engine
- **HuggingFace Inference API** using the `openai/gpt-oss-120b:fastest` model.
- Interaction is structured via API routes using system prompts and OpenAI-compatible tool calling schemas.

### Document Compilation
- **docx**: Compiles structured JSON data into styled Microsoft Word documents.
- **pptxgenjs**: Generates Microsoft PowerPoint slide decks with structured templates.
- **jspdf**: Generates PDF documents from flattened pedagogical content.
- **marked**: Renders Markdown content.
- **jszip**: Bundles generated documents into ZIP packages.

---

## 📁 Repository Architecture

The project structure is organized as follows:

```
PEDAGOGEN/                             # Workspace Root
├── pedagogen/                         # Next.js Application Root
│   ├── data/                          # Runtime data (SQLite DB, cached images, reference files)
│   ├── public/                        # Next.js public assets
│   ├── src/
│   │   ├── app/                       # App Router & API Endpoints
│   │   │   ├── (auth)/                # Auth layouts, login, and registration pages
│   │   │   ├── (dashboard)/           # Main layout, dashboard, generate hub, history, references, profile
│   │   │   └── api/                   # Back-end API endpoints
│   │   │       ├── auth/              # Registration and session creation
│   │   │       ├── generate/          # Orchestrators (heavy, medium, light)
│   │   │       ├── references/        # CRUD for reference documents
│   │   │       └── history/           # Fetching generation logs
│   │   ├── components/                # Reusable UI & Logic Components
│   │   │   ├── auth/                  # Auth cards and forms
│   │   │   ├── generate/              # CourseForm, DocumentPicker, GenerationProgress, ModeSelector
│   │   │   ├── layout/                # Sidebar, TopBar, and navigation components
│   │   │   ├── references/            # FileUploader, ReferenceCard
│   │   │   └── ui/                    # Reusable primitives (Buttons, Cards, Badges, Modals)
│   │   ├── lib/                       # Business logic layer
│   │   │   ├── agents/                # AI Agent Tools and Orchestrator drivers
│   │   │   ├── builders/              # DOCX, PPTX, PDF, and MD compilers
│   │   │   ├── curriculum/            # Moroccan program levels, subjects, and topics metadata
│   │   │   ├── db/                    # SQLite database connectors and schema initialization
│   │   │   └── utils/                 # Token estimation, file storage, rate limiters, and caches
│   │   └── types/                     # TypeScript Interfaces (generation.ts, references.ts)
```

---

## 🗄️ Database Design (SQLite)

The database schema is initialized dynamically in `src/lib/db/index.ts` within a local file (`data/pedagogen.db`).

### Schema Definitions

1. **`users`**: Manages teacher accounts.
   - `id` (TEXT PRIMARY KEY)
   - `email` (TEXT UNIQUE)
   - `password_hash` (TEXT)
   - `full_name` (TEXT)
   - `matiere` (TEXT)
   - `etablissement` (TEXT)
   - `telephone` (TEXT)
   - `avatar_url` (TEXT)
   - `created_at` / `updated_at` (TEXT)

2. **`generations`**: Keeps track of AI generation runs.
   - `id` (TEXT PRIMARY KEY)
   - `user_id` (TEXT)
   - `mode` (TEXT)
   - `matiere` (TEXT)
   - `niveau` (TEXT)
   - `lecon` (TEXT)
   - `unite` (TEXT)
   - `duree` (INTEGER)
   - `competences` (TEXT)
   - `langue` (TEXT)
   - `semestre` (INTEGER)
   - `tokens_used` (INTEGER)
   - `duration_ms` (INTEGER)
   - `files_count` (INTEGER)
   - `zip_url` (TEXT)
   - `created_at` (TEXT)

3. **`reference_files`**: Tracks curriculum documents and custom guidelines.
   - `id` (TEXT PRIMARY KEY)
   - `name` (TEXT)
   - `category` (TEXT)
   - `size` (INTEGER)
   - `storage_path` (TEXT)
   - `enabled` (INTEGER, boolean flag)
   - `builtin` (INTEGER, boolean flag)
   - `uploaded_at` (TEXT)

4. **`generated_files`**: Tracks documents compiled for a specific generation.
   - `id` (TEXT PRIMARY KEY)
   - `generation_id` (TEXT)
   - `name` (TEXT)
   - `doc_type` (TEXT)
   - `format` (TEXT)
   - `storage_path` (TEXT)
   - `url` (TEXT)
   - `size_kb` (INTEGER)
   - `created_at` (TEXT)

5. **`image_cache`**: Caches generated diagrams and illustration prompts.
   - `id` (TEXT PRIMARY KEY)
   - `prompt_hash` (TEXT)
   - `prompt` (TEXT)
   - `storage_path` (TEXT)
   - `url` (TEXT)
   - `tokens_used` (INTEGER)
   - `created_at` (TEXT)

---

## 🤖 Core Agent Workflows

The application supports three levels of AI-driven content generation:

### 1. Light Mode (Fast Generation)
- **Execution**: Single-turn HuggingFace request without tool calling.
- **Prompt**: Focuses on producing a structured pedagogical outline for the lesson.
- **Output**: Returns a single Markdown (`.md`) file.

### 2. Medium Mode (Selective Document Generation)
- **Execution**: Executes parallel tool calls on only the document types selected by the teacher (e.g., Fiche + Evaluation).
- **Output**: Compiles the specific files in the chosen format(s) and provides individual downloads.

### 3. Heavy Mode (Full Package)
- **Execution**: Multi-step sequential orchestration. Initiates a series of tool calls in order:
  1. `generate_fiche_pedagogique`
  2. `generate_planification`
  3. `generate_cours_complet`
  4. `generate_gestion_classe`
  5. `generate_resume_eleve`
  6. `generate_pptx_outline`
- **Streaming**: Uses Server-Sent Events (SSE) to report live progress to the client side.
- **Formats & Compilation**: Builds **DOCX, PDF, PPTX, and MD** formats for every document.
- **Output**: Combines all compiled files into a unified ZIP package.
- **Quota Limit**: Restricts generation to 3 heavy sessions per day per user (enforced in `src/lib/utils/rateLimit.ts`).

---

## ⚠️ Identified Gotchas & Recommendations

### 1. Environment Variable Naming Mismatch
* **Issue**: The codebase reads `process.env.HF_TOKEN` for HuggingFace API key authentication. However, some configuration resources or legacy scripts refer to `hugging_face_api` or other variations.
* **Recommendation**: Ensure that the active environment file is `pedagogen/.env.local` and explicitly exports `HF_TOKEN`.

### 2. Deployment Architecture Constraints
* **Issue**: `better-sqlite3` compiles native C++ bindings and runs synchronously on the local disk. If this project is deployed to a serverless platform (like Vercel), database writes will not persist due to serverless ephemeral filesystems, and native bindings may fail to load.
* **Recommendation**: PEDAGOGEN should be deployed on a persistent Virtual Private Server (VPS) or containerized environment (Docker Compose) where the `data/` volume is persisted.

### 3. PDF Arabic Font Rendering
* **Issue**: The current implementation of `pdfBuilder.ts` uses standard `jsPDF` configured with Helvetica. Helvetica does not support Arabic text rendering (characters will appear broken, disjointed, or as undefined glyphs).
* **Recommendation**: Embed a custom UTF-8 compatible Arabic font (e.g., *Noto Sans Arabic*) into the jsPDF builder definition to properly support teachers generating documents in Arabic or bilingual format.

### 4. Concurrent Requests Handling
* **Issue**: SQLite by default blocks write operations during active transactions. The system sets `PRAGMA journal_mode = WAL` to enable simultaneous readers and writers, which is excellent, but heavy sequential generations spanning multiple seconds might still cause slight locks if concurrency increases.
* **Recommendation**: Monitor execution times during active school semesters. Keep utilizing the sequential model to prevent API rate limit issues on HuggingFace.
