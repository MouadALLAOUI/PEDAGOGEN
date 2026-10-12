# PEDAGOGEN — Improvements (2026-10-04)

Companion to `AUDIT.md`. Everything below is implemented on the current branch and verified with a passing production build, except the "Roadmap" section which is proposed future work.

---

## Implemented

### 1. Auto-retry on transient HuggingFace failures
**File:** `src/lib/agents/agentTools.ts`
- New `fetchWithRetry()` helper wraps the `callHuggingFace` request.
- Retries up to **2 extra attempts** (backoff 2s, 4s) on **429 / 500 / 502 / 503 / 504** and network errors — the failures that previously aborted an entire heavy generation mid-way.
- Never retries user cancels or the 20-minute timeout (abort signal), so cancellation stays instant and a hung model can't triple the wait.
- 400/401/403 style errors still fail immediately with their real message.

### 2. SQLite robustness (WAL concurrency + hot-path indexes)
**File:** `src/lib/db/index.ts`
- `PRAGMA busy_timeout = 5000` — concurrent requests (e.g. a heavy generation writing progress while you browse history) now wait up to 5s for the write lock instead of throwing `SQLITE_BUSY`.
- Added missing indexes used by the ZIP endpoint and files page:
  - `idx_generated_files_generation ON generated_files(generation_id)`
  - `idx_generated_files_doc_type ON generated_files(doc_type)`
- WAL mode + `foreign_keys` were already on.

### 3. SSE heartbeat keep-alive for long generations
**File:** `src/app/api/generate/progress/[id]/route.ts`
- The progress stream now sends an SSE comment (`: hb`) every 15s. Proxies/CDNs and some browsers close idle event-streams during silent stretches of long model calls (up to 20 min per document), which used to show "connexion perdue" errors mid-generation.
- EventSource ignores comment lines, so **no client change is needed**. Heartbeat and listener are cleaned up together on done/error/disconnect.

### 4. `/api/health` endpoint
**File:** `src/app/api/health/route.ts` (new), whitelisted in `src/proxy.ts`
- Returns `{ status, checks: { database, hfTokenConfigured, uptimeSeconds, timestamp } }`.
- Public (no auth) so uptime monitors / `curl localhost:3000/api/health` work without a session.

### 5. Middleware → proxy migration (Next.js 16 convention)
**File:** `src/middleware.ts` → **`src/proxy.ts`**, export renamed `middleware()` → `proxy()`
- Removes the build warning `The "middleware" file convention is deprecated`. Behavior is unchanged (same matcher, same auth logic, same `x-user-id` header injection).

### 6. OpenCode provider startup timeout fix
**File:** `src/lib/ai/providers/opencode.ts`
- The SDK auto-starts an `opencode serve` process with a hardcoded **10s** `serverTimeout`. Cold starts (first run, Windows, auth refresh) routinely exceed it, so every generation failed with `OpenCode request timed out after 10000ms during server startup` (×3 SDK retries).
- The provider is now created once at module level with `serverTimeout: 90s` (override with `OPENCODE_SERVER_TIMEOUT` env var). Per-call settings were silently ignored by the SDK's singleton client manager, so a single configured instance is the correct pattern.
- `OPENCODE_URL=http://127.0.0.1:4096` env var connects to an already-running OpenCode server and skips autostart entirely — the most reliable option on slow machines.
- `streamText` retries capped at 1 (was 3) so a genuinely-down OpenCode fails in ~3 min instead of ~5.
- Timeout errors now surface a French message telling the user to run `opencode serve` manually or set `OPENCODE_URL`.

---

## Already present (verified, no change needed)
These audit items were found fixed on disk and were only verified: auth on all `/api` routes via the proxy, `x-user-id` forwarded to API routes (per-user settings), JWT secret required in production, secure cookies, seeded account disabled outside dev, settings token masking, upload size/type validation, real rate limiting, zod validation on generate routes, prompt-injection delimiters for references, metadata-only debug logging.

---

## Roadmap (proposed, in priority order)

These are **not implemented** — they need your go-ahead because they touch flow or need decisions.

### R1. Server-side history writes (robustness)
Today the status page POSTs the result to `/api/history` from the browser when the `done` event arrives. If the tab closes at the wrong moment, the generation completes but history loses the entry.
**Change:** write the history row inside `heavy`/`medium` routes right before emitting `done`; the status page keeps its POST as a fallback no-op (idempotent upsert).

### R2. Per-user scoping for the remaining `'default'` tables
`custom_prompts` and `reference_files` have no `user_id` column yet, while settings already support per-user rows via `x-user-id`. Add the column + migration and filter reads/writes by the authenticated user.

### R3. Full-text search over history (SQLite FTS5)
The dashboard search only filters the 5 most recent docs client-side. An FTS5 virtual table over `generations` (lecon, matiere, unite, metadata) would give instant, accent-tolerant search across all history — no new packages, FTS5 ships with better-sqlite3.

### R4. Retention policy for generated files
`data/generated` grows forever. A small startup sweep (e.g. delete files older than N days whose generation has a `zip_url`, or a "Clean up" button in Settings) keeps disk usage bounded.

### R5. Structured logging
`console.error/warn` calls are spread across routes. `src/lib/utils/logger.ts` already exists — route all errors through it with levels (`ERROR` always shown; `DEBUG` gated by `PEDAGOGEN_DEBUG=true`) and one line per generation step, so support/debugging is grep-able by `generationId`.

### R6. Generation queue
Two simultaneous heavy generations share one HF token and can trip rate limits. A tiny queue (max 1–2 running, others queued with a "position" event in the existing SSE) smooths this out with no user-facing change.

### R7. Smoke-test script
No test framework is configured (per AGENTS.md, not adding one without instruction). A zero-dependency `node scripts/smoke.mjs` that hits `/api/health`, logs in, runs a light-mode generation and asserts output would catch regressions before pushes.
