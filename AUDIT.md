# PEDAGOGEN — Full App Audit (2026-09-13)

Audit of `pedagogen/` covering API routes, security, AI/agents, builders, DB, and frontend.
Severity: 🔴 Critical · 🟠 High · 🟡 Medium · ⚪ Low. Each item lists the file, the problem, and the fix.

---

## 🔴 CRITICAL

### C1. All data API routes have zero authentication
- Files: `src/app/api/generated/route.ts`, `generated/preview/`, `generated/zip/`, `generate/zip/`, `settings/route.ts`, `settings/prompts/`, `history/`, `references/*`, `chat/`, `images/*`, `downloads/[...path]/`
- There is **no `middleware.ts`** in the project. Only `auth/profile` reads the JWT cookie, and even it never rejects unauthenticated callers. Anyone can list, delete, download all generated documents, read/write settings (including the stored HF token), and spend the server's HF token via `/api/chat` and `/api/generate/*`.
- **Fix:** Add `middleware.ts` matching `/api/:path*` (excluding `/api/auth/*`) that verifies the JWT; add a shared `requireUser()` helper for handlers.

### C2. Hardcoded fallback JWT secret + insecure auth cookie
- `src/lib/db/auth.ts:5-7` — `process.env.JWT_SECRET || 'pedagogen-dev-secret-key-change-in-production-2024'` (anyone can forge tokens if env unset).
- `src/app/api/auth/login/route.ts:26-31`, `register/route.ts:29-34` — cookie `secure: false`.
- **Fix:** Throw at boot if `JWT_SECRET` missing in production; `secure: process.env.NODE_ENV === 'production'`.

### C3. Two competing SQLite schemas — history silently broken on fresh installs
- `src/lib/db/index.ts:30-153` vs `src/lib/db/schema.ts:3-55` both `CREATE TABLE IF NOT EXISTS` on the same `data/pedagogen.db`. The two `generations` schemas differ (`matiere/niveau/...` vs `metadata/files`). `src/lib/utils/historyStore.ts:67-81` INSERTs using BOTH column sets; `addHistoryEntry` errors are swallowed (line 82) so history never saves when the wrong variant wins. `src/lib/db/repositories/*` expect tables only the schema.ts migration creates.
- Also two duplicate `getDb` singletons: `src/lib/db/client.ts:8` and `src/lib/db/index.ts:18`.
- **Fix:** Keep one schema source of truth (index.ts), migrate/remove the repositories, keep one `getDb`.

### C4. Unauthenticated arbitrary file read + unvalidated deletes
- `src/app/api/downloads/[...path]/route.ts:14-25` and `generated/preview/route.ts:33-40` — path traversal check is a weak `'..'` substring test (URL-encoded `%2e%2e` bypasses); serves any file under `data/generated`.
- `generated/route.ts:21-45` DELETE — deletes arbitrary rows/files by id, no ownership check.
- **Fix:** Require auth; `path.resolve()` then assert `resolved.startsWith(GENERATED_DIR + sep)`; validate against DB records.

### C5. HF API token stored in plaintext and echoed to any client
- `settings/route.ts` GET returns all settings including `huggingface_token` in plaintext; `settings/page.tsx:96,130` round-trips it. Combined with C1, anyone can steal the token.
- **Fix:** Mask secrets in GET responses, whitelist writable keys, require auth.

### C6. AI providers request `stream:false` but parse the response as SSE — text silently empty
- `src/lib/ai/providers/lmstudio.ts:27` and `huggingface.ts:33` send `stream: false` then parse `data: ...` lines (37–74 / 43–80). OpenAI-compatible servers return a single JSON body → `fullText` stays empty.
- **Fix:** Send `stream: true`, or parse with `response.json()` when `stream:false`.

### C7. `lmstudio.ts` uses `request.model` as the endpoint URL
- `lmstudio.ts:12` — `baseUrl = request.baseUrl || request.model || DEFAULT_URL` → `fetch("local-model")` throws when a model is set.
- **Fix:** Never fall back from `model` to `baseUrl`; keep them separate.

### C8. XSS in generated evaluation HTML
- `src/lib/builders/htmlBuilder.ts:834` — `evalData.duree` (AI-produced, unvalidated) is interpolated into a `<script>` block with only `"` escaped; `</script><img onerror=...>` breaks out → arbitrary JS when the teacher opens the file.
- **Fix:** `JSON.stringify()` the value and escape `</script` → `<\/script`, or `parseInt` server-side.

### C9. Unhandled `JSON.parse` of tool-call arguments crashes whole generation
- `src/lib/agents/agentTools.ts:959, 1366` — malformed/truncated arguments throw out of `callLocalModel`, aborting all remaining documents.
- **Fix:** try/catch, skip or reuse the JSON-recovery regex used elsewhere (lines 976, 1163).

### C10. Hardcoded seeded account with known password
- `src/lib/db/index.ts:176-188` — seeds `enseignant@pedagogen.ma` / `pedagogen2024` in every environment.
- **Fix:** Gate behind a dev flag or remove.

---

## 🟠 HIGH

### H1. `evaluation` documents generated with the fiche pédagogique tool
- `src/lib/agents/mediumAgent.ts:8` — `evaluation: 'generate_fiche_pedagogique'` (copy/paste error). Selecting "evaluation" in medium mode silently produces a fiche.
- **Fix:** `evaluation: 'generate_evaluation'`.

### H2. Orchestrator marks errored steps as completed with empty files
- `src/lib/agents/orchestrator.ts:87-120` — on `error` it yields progress but doesn't skip the subsequent `file` / `done` events; a late `done` overwrites `fullText`.
- **Fix:** Track `failed` per step and skip file/done yields.

### H3. Failures masked by giant fabricated fallback documents
- `agentTools.ts:1026-1082, 1189-1242, 1428-1507` — when JSON parsing fails, code synthesizes a fake payload stuffed with raw model text; user receives a garbage DOCX with no error. ~50-line literal duplicated 3×.
- **Fix:** Throw a typed error / emit `error` event; extract one shared fallback if kept.

### H4. Unauthenticated uploads with no file validation
- `src/app/api/references/route.ts:32-50` — any file type/size, no cap, no rate limit → disk exhaustion.
- **Fix:** Whitelist `pdf/docx/txt/md`, cap ~10 MB, require auth.

### H5. Rate limiting is a stub that always allows
- `src/lib/utils/rateLimit.ts` — `checkHeavyRateLimit()` returns `{allowed: true, remaining: 3}` unconditionally; the 429 branch in `generate/heavy/route.ts:160-163` is dead code.
- **Fix:** Implement a real per-user limiter (in-memory or DB counter).

### H6. `process.env.HF_TOKEN` mutated from DB at request time
- `generate/heavy/route.ts:105,153`, `light/route.ts:17`, `medium/route.ts:88` — global, race-prone; one user's token used for all.
- **Fix:** Pass token explicitly via provider options (supported: `src/lib/ai/providers/huggingface.ts:9`).

### H7. Settings hardcoded to `'default'` user
- `chat/route.ts`, `heavy/route.ts:195`, `stream/route.ts:1440` etc. — all settings/chat keyed to `user_id='default'`; multi-user is defeated.
- **Fix:** Key by authenticated user id.

### H8. Prompt injection via teacher prompts and uploaded references
- `src/lib/agents/prompts/assembler.ts:34-43`, `mediumAgent.ts:33-39` — custom prompts and uploaded reference contents concatenated verbatim into the system prompt.
- **Fix:** Wrap untrusted content in delimiters (`<reference>…</reference>`), instruct the model it's data only, cap length.

### H9. Abort-listener + timeout leak in local model calls
- `agentTools.ts:864-869, 1326-1331` — `signal.addEventListener('abort', …)` never removed; `custom` path (1131-1142) has no timeout unlike the `openai` path.
- **Fix:** `{ once: true }` + `removeEventListener` in `finally`; apply timeout to both paths.

### H10. Duplicated token env / settings write leaks
- `settings/route.ts:25-50` POST — anyone can write any key/value including the HF token (see C1/C5).

### H11. `PreviewPanel` reads localStorage during render
- `src/app/(dashboard)/generate/page.tsx:144-145` — throws during SSR/prerender; never updates on edit.
- **Fix:** Read in `useEffect` into state (pattern already used for `LAST_GEN_KEY`).

### H12. Settings/profile saves never check `res.ok`
- `src/app/(dashboard)/settings/page.tsx:124-146`, `profile/page.tsx:49-62` — failures still show "Enregistré".
- **Fix:** Check `res.ok`, show error toast.

### H13. Auth forms lack validation wiring / a11y
- `src/app/(auth)/AuthPage.tsx:60,68,84,99,116` — labels without `htmlFor`/`id`, no `role="alert"`, error persists across tab switch.
- **Fix:** Wire ids, `aria-live`, clear error on tab change.

### H14. SSE status page stale-closure bugs
- `src/app/(dashboard)/generate/status/page.tsx:226-227` — effect re-runs on `result`/`error` deps, tearing down EventSource mid-stream; `onerror` closes a possibly reconnected instance.
- **Fix:** Use refs for completion state; don't include `result`/`error` in deps.

### H15. Client-side history write on `done`
- `status/page.tsx:201-205` — the browser POSTs the result to `/api/history`; fragile and fabricates users server-side (`history/route.ts:31-55` attributes to `SELECT id FROM users LIMIT 1` when unauthenticated, duplicated 3×).
- **Fix:** Write history server-side in the generation route; require auth in history POST.

---

## 🟡 MEDIUM

### AI / Agents
- **M1.** `heavyAgent.ts:13-27` — ignores `signal`, `useLocalModel`, `debugMode`; `customPrompts` unused; hardcoded `deepseek-ai/DeepSeek-R1`; hardcoded English user prompt.
- **M2.** Silent `maxTokens` clamp: `agentTools.ts:839` `Math.min(maxTokens, 2048)` — heavy/medium request 12000–16000, all clamped with no warning; UI promises "15,000–30,000" tokens (`validators/generation.ts:74`).
- **M3.** `orchestrator.ts:74` — `model: request.mode === "heavy" ? undefined : undefined` (always undefined, leftover).
- **M4.** Sensitive logging: `agentTools.ts:849-858, 1312-1320` — console.logs the entire system prompt + request body on every call; debug-gate it.
- **M5.** `opencode.ts:61-64, 78-101` — only `tools[0]!` supported (multi-doc requests silently use first schema); usage hardcoded to zeros.
- **M6.** `huggingface.ts:86-97` — `generateWithTools` drops `apiKey`/`baseUrl`/`debugMode`; user token from Settings never reaches the tools path.

### Search / References
- **M7.** `src/lib/search/vectorStore.ts` — `embed_index_status` written even when all embedding batches fail (116-123); `JSON.parse(row.embedding)` per row without try/catch (155); untyped `as any` rows; legacy/deprecated HF embedding endpoint is a single point of failure.

### Builders
- **M8.** `pdfBuilder.ts` — no `sanitizeText` (docxBuilder has it) and doesn't skip `timing_consistency_check` → internal check note leaks into PDFs. Duplicate `flattenContent` in `docxBuilder.ts:30`/`pdfBuilder.ts:9`. Extract `builders/shared.ts`.
- **M9.** `fichePedagogiqueDocxBuilder.ts:255-257` — `delete (content as any).timing_consistency_check` mutates the shared content object (breaks ZIP multi-format export). Skip the key during iteration instead.
- **M10.** `pptxBuilder.ts:222-267` — `validateSlideDurations` discards AI `slide_duration_minutes` and recomputes from fixed 20/50/20; hardcoded "Diapositive ${index+4}" / `slide: i+4` break if preamble changes; bullets silently truncated to 5.
- **M11.** `fichePedagogiqueBuilder.ts:116,354`, `planificationBuilder.ts:167,308` — `(doc as any).__currentY` hidden state on jsPDF instance + undocumented `doc.internal.events.subscribe('addPage')`. Thread `y` explicitly.
- **M12.** `zipBuilder.ts:17-19` — empty catch silently skips unreadable files; surface skipped names.

### Frontend
- **M13.** Dashboard `page.tsx:259,262` — broken links: `/files?file=${doc.id}` (param ignored) and `/api/downloads/${doc.id}` passes a generation id where a storage path is expected.
- **M14.** Dashboard `page.tsx:145-150` — search input state never used to filter anything.
- **M15.** `chatbot/page.tsx:139-145` — error handler overwrites the user's message if the assistant placeholder wasn't appended; no AbortController/cleanup on unmount; `localhost:1234` URL hardcoded (line 27).
- **M16.** `PageTransition.tsx:19-20` — sets `opacity: 0` before animejs runs; page stays invisible if animation throws. No `prefers-reduced-motion` handling anywhere.
- **M17.** `AuthGuard` is client-only — dashboard flashes for logged-out users. Check the cookie in the (dashboard) server layout instead.
- **M18.** `status/page.tsx:122-126` — Notification permission requested unconditionally on mount, ignoring the saved `notifications_enabled` setting.
- **M19.** `references/page.tsx` — stale debounce fetch (77-87, no abort/latest-query guard); failed uploads/deletes only `console.error`, no user-facing error (127-170); `any[]` state.
- **M20.** `OnboardingWizard.tsx:61-66` + `Modal.tsx` — no focus trap, no `aria-modal`/`role="dialog"`, no Escape on the onboarding overlay.
- **M21.** `generationManager.ts:21, 76-101` — listener Set never cleared; `cancelGeneration` schedules a delete timeout that can delete a *new* generation reusing the id.
- **M22.** `content-disposition` header injection risk — `downloads/route.ts:32`, `references/download/[id]/route.ts` use raw record names; sanitize quotes/CR/LF.
- **M23.** No input validation on generate routes — `heavy/route.ts:96`, `light/route.ts:741`, `medium/route.ts:970` cast `request.json()` blindly; only `stream/route.ts:1372` uses the zod schema. Reuse `validators/generation.ts` everywhere.
- **M24.** Registration: no email format check, no rate limit (`auth/register/route.ts:8-21`).
- **M25.** Token estimation: `tokenEstimator.ts:9-16` miscategorizes non-Arabic chars; `tokenTracker.ts:19-21` fabricates "1.8× savings" as real telemetry.

---

## ⚪ LOW

- **L1.** Dead/duplicated code: `ui/Toast.tsx` (second, never-mounted Toaster), `hooks/useSettings.ts` (unused), `zustand` dependency with zero stores, `mdBuilder.ts:87-89` identity function, `heavy/build/route.ts:706` `+ (gen.totalTokens ? 0 : 0)`, `agentTools.ts:1539-1556` dead params, duplicate `getDbSetting` helper in 6 routes → extract to `src/lib/db/settings.ts`.
- **L2.** Duplicated `DOC_CONFIG` / builder switch / watermark logic across `heavy/route.ts`, `heavy/build/route.ts`, `medium/route.ts` (drift already: build handles `planification`, medium doesn't).
- **L3.** Hardcoded model IDs/URLs scattered: `chat/route.ts` (`HF_API_URL`, `DeepSeek-R1`, `kimi-k2.5-free`), `heavy/route.ts:326`, `medium/route.ts:1170` → move to config.
- **L4.** Cookie parsed by regex in `heavy/build/route.ts:605-606` instead of `request.cookies.get('auth-token')`.
- **L5.** Dead fixture JSON inside `src/lib` (`lib/generated/*.json`, `agents/generated/*.json`, `agents/prompts/cours_complet.json` duplicates) and 77 KB `references/curr_informatiques_college.md` — move to `/data` or load lazily.
- **L6.** Curriculum typo: `moroccoCollege.ts:29` — `'التربية Musikique'` → `'التربية الموسيقية'`.
- **L7.** Non-null assertions on array indexing: `pdfBuilder.ts:96`, `fichePedagogiqueBuilder.ts:243-249,278,283`.
- **L8.** `orchestrator.ts:111` — server-side `new Blob([content]).size`; use `Buffer.byteLength`.
- **L9.** `bcryptjs` via `require()` inside `seedDefaults` (`db/index.ts:180`) — use top-level import.
- **L10.** localStorage keys as scattered string literals (`pedagogen_*`, ~11 keys) — centralize in a constants module; chatbot's local-model settings duplicate the DB settings page (two sources of truth).
- **L11.** A11y: icon-only buttons with `title` only (files/history/dashboard pages) — add `aria-label`.
- **L12.** `globals.css` — `--tw-space-y-reverse` overrides poke Tailwind internals (may break in v4); `[dir="rtl"] .flex-row` hack; external Google Fonts `@import` is render-blocking (consider `next/font`); external Unsplash URL in `(auth)/layout.tsx:13` renders nothing offline.
- **L13.** `imagesTxtBuilder.ts` — `as any[]`, `purpose.includes('wan')` substring match, ~20 lines of hardcoded directives duplicated per image.
- **L14.** Accent-key handling (`remédiation` vs `remediation`) ad-hoc in 2 builders (`planGestionBuilder.ts:308,328`, `planGestionDocxBuilder.ts:195`) — normalize in one parsing layer.
- **L15.** Provider id enums duplicated in `lib/ai/types.ts:1` and `validators/providerSettings.ts:4` — keep in sync or share.
- **L16.** `history/page.tsx:93` "regenerate" writes `entry.metadata` to localStorage with a shape that partially mismatches `SavedGeneration`.
- **L17.** Files page: single delete has no confirmation (batch does); `formatDate` inconsistent with `toLocaleDateString('fr-FR')` elsewhere.

---

## Recommended fix order

1. **Security first:** C1 (auth middleware), C2 (JWT/cookie), C4 (path traversal), C5 (token masking), C10 (seeded account), H4/H5 (uploads + rate limit).
2. **Correctness of core output:** C6/C7 (provider stream/URL bugs), C8 (XSS), C9 (JSON.parse crash), H1 (wrong evaluation tool), H2/H3 (error masking).
3. **Data integrity:** C3 (unify DB schema — history is silently broken today).
4. **Frontend bugs:** H11–H15, M13–M16.
5. **Consistency/cleanup:** M8–M12, then the Low items (dead code removal, shared helpers, constants).

---

## Quick wins (small diffs, high value)

| Fix | File | Effort |
|---|---|---|
| `evaluation: 'generate_evaluation'` | `mediumAgent.ts:8` | 1 line |
| Secure cookie in prod | `login/route.ts`, `register/route.ts` | 2 lines |
| Throw on missing `JWT_SECRET` in prod | `lib/db/auth.ts` | 2 lines |
| Fix Arabic subject typo | `moroccoCollege.ts:29` | 1 line |
| Remove dead `? undefined : undefined` | `orchestrator.ts:74` | 1 line |
| `stream: true` in providers (or JSON parse) | `lmstudio.ts`, `huggingface.ts` | few lines |
| try/catch around `JSON.parse` tool args | `agentTools.ts:959,1366` | few lines |
| Check `res.ok` in settings/profile saves | `settings/page.tsx`, `profile/page.tsx` | few lines |
