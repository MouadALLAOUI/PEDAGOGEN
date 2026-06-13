---
name: efficient-codebase-exploration
description: >
  Guides agents to work efficiently in any codebase by using targeted search,
  parallel tool calls, and minimal file reads instead of scanning files one by one.
  Reduces token waste and speeds up edits by teaching a "search-first, read-second" workflow.
license: MIT
metadata:
  author: Mouad ALLAOUI
  version: '2.0.0'
---

# Efficient Codebase Exploration

## Purpose

Explore and modify projects while minimizing unnecessary file reads, token usage, and execution time. The objective is to understand only what is required to complete the task.

---

## Core Principle

Never read unless search proves the read is necessary.

Assume the repository is large. Do not scan the entire codebase unless explicitly requested. Start narrow and expand only when justified.

---

## Fast Path

If the user specifies:
- the feature,
- the entry file(s),
- and the desired outcome,

skip Phases 2–4. Proceed directly to targeted search and implementation.

Example:

> "Add Google login.
> Feature: Authentication.
> Start from authService.ts."

---

## Exploration Strategy

### Phase 1: Understand the Task

Determine:
- What feature is involved?
- What files were explicitly mentioned?
- What outcome is expected?

Do not read files yet.

---

### Phase 2: Initial Context

**Step 1 — Check for context files (parallel):**

```
Glob → **/AGENTS.md
Glob → **/Audit.md
Glob → **/project.md
Glob → **/overview.md
Glob → **/README.md
```

**Step 2 — Read the first one found.** If it has project context (purpose, stack, conventions), that's enough. Stop searching.

**Step 3 — If no context file exists**, continue using lightweight discovery. Recommend creating context files. Only generate them when explicitly requested by the user.

---

### Phase 3: Structure Discovery

**Step 1 — Check for structure documentation (parallel):**

```
Glob → **/ARCHITECTURE.md
Glob → **/structure.md
```

**Step 2 — Read the first one found.** If it describes the file layout, that's enough. Stop searching.

**Step 3 — If no structure doc exists**, continue with lightweight discovery. Use the `ARCHITECTURE.template.md` from the skill templates when the user requests documentation.

---

### Phase 4: Dependency Expansion

Expand context only when necessary. Use this order:

```
User-specified files
  ↓
Direct imports
  ↓
Direct consumers/callers
  ↓
Shared utilities
  ↓
Feature-local configuration
  ↓
Global configuration
  ↓
Framework internals
```

Avoid unrelated modules.

---

### Phase 5: Search and Read

**Search first, read second.** Find the exact file(s) and line(s) before loading content.

| Goal | Tool | Example |
|------|------|---------|
| Find where a function is defined | `Grep` with `include` | `Grep pattern="export.*function useForm" include="*.ts"` |
| Find files matching a name | `Glob` | `Glob pattern="**/Button*.{tsx,ts}"` |
| Find where a concept appears | `Grep` | `Grep pattern="handleSubmit\|onSubmit" include="*.tsx"` |
| Find imports of a module | `Grep` | `Grep pattern="from.*@/components/ui" include="*.ts"` |
| Find who uses a function | `Grep` | `Grep pattern="functionName\|<functionName" include="*.ts"` |
| Find config files | `Glob` | `Glob pattern="**/{tailwind,postcss,tsconfig}.config.*"` |

**Read with precision:**

| Scenario | Strategy |
|----------|----------|
| Small file (< 100 lines) | `Read` with no offset/limit |
| Specific function or section | `Read` with `offset` and `limit` |
| Component shape | Read first ~50 lines (imports, props) |
| File exports/defaults | `Read` with `offset` near the end |
| File structure overview | `Grep` inside the file with patterns |

**Parallel reads:** Send all independent `Read` calls in one message — never sequentially.

---

### Phase 6: Planning

Before making changes, summarize:
- Files involved
- Why they are needed
- Planned modifications
- Potential risks

Wait for confirmation if uncertainty exists.

---

### Phase 7: Implementation

Make minimal changes. Preserve:
- Existing architecture
- Naming conventions
- Coding style
- Design patterns

Do not refactor unrelated code.

---

### Phase 8: Validation

Run only relevant validations:
- Related unit tests
- Related lint checks
- Related build steps

Avoid full test suites unless requested.

---

## Context Cache

Avoid re-reading files already analyzed during the current task.

Maintain an internal cache containing:
- File path
- Purpose
- Important symbols
- Last reason for reading

Reuse cached understanding whenever possible.

Only re-read files if:
- They have changed
- Additional details are required
- The previous read was incomplete

---

## Search Budget

Use the following defaults based on mode:

| Operation | Conservative | Balanced | Exploratory | Audit |
|-----------|-------------|----------|-------------|-------|
| Glob | 3 | 5 | 15 | Unlimited |
| Grep | 5 | 10 | 20 | Unlimited |
| Read | 5 | 10 | 20 | Unlimited |
| Lines read | 500 | 1000 | 3000 | Unlimited |

Exceed these limits only if justified.

When approaching a limit, summarize findings and request approval.

---

## Edit Budget

Use the following defaults based on mode:

| Limit | Conservative | Balanced | Exploratory | Audit |
|-------|-------------|----------|-------------|-------|
| Files modified | 2 | 5 | 10 | Unlimited |
| Unrelated edits | 0 | 0 | 0 | 0 |
| Refactoring scope | feature-local | feature-local | feature-local | project-wide |

Request approval before exceeding these limits.

---

## Documentation Updates

Documentation updates are opt-in.

Only update `AGENTS.md`, `ARCHITECTURE.md`, or audit files when:
- Explicitly requested
- Significant architectural changes occur
- The user has enabled Documentation Mode

---

## Anti-Patterns

Avoid:
- Reading the entire repository
- Loading every file in `src/`
- Refactoring unrelated components
- Running all tests by default
- Rebuilding the entire application unnecessarily
- Re-reading previously analyzed files without reason
- Serial tool calls when parallel ones would suffice
- Auto-generating documentation without being asked

---

## Escalation Rule

If the task cannot be completed within these constraints, explain:
- What information is missing
- Why additional files are needed
- What the next exploration step would be

Then request approval.

---

## Success Criteria

A successful execution:
- Solves the user's request
- Uses minimal context
- Minimizes token consumption
- Avoids unnecessary exploration
- Produces focused modifications
- Respects documentation opt-in policy

---

## Modes

### Conservative (default)

```
Searches: 3 Glob, 5 Grep
Reads: 5
Files modified: 2
Documentation: opt-in only
```

Use for small fixes, bug patches, single-line changes.

---

### Balanced

```
Searches: 5 Glob, 10 Grep
Reads: 10
Files modified: 5
Documentation: opt-in only
```

Use for normal development, feature work, multi-file changes.

---

### Exploratory

```
Searches: 15 Glob, 20 Grep
Reads: 20
Files modified: 10
Documentation: opt-in only
```

Use for unfamiliar features, large refactors, cross-cutting concerns.

---

### Audit

```
Repository scan allowed.
Architecture generation allowed.
Full validation allowed.
Documentation: auto-generate on request
```

Use for onboarding, code reviews, documentation generation.

---

# Templates

## AGENTS.template.md

```md
# Project Instructions

Read this file first.

Do not scan the entire repository.

Follow the Efficient Codebase Exploration skill.

Project-specific architecture is documented in ARCHITECTURE.md.
```

## ARCHITECTURE.template.md

```md
# Architecture

## Project Type
<!-- e.g., Next.js app, Laravel API, CLI tool -->

## Tech Stack
<!-- Framework, language, key libraries -->

## Directory Structure
<!-- Top-level layout with brief descriptions -->

## Features

### [Feature Name]
- Entry files:
- Key components:
- Dependencies:

## Shared Utilities
<!-- Common helpers, services, utilities -->

## Important Rules
<!-- Conventions, constraints, gotchas -->
```

---

# Future Extensions

## Skill Splitting

Split into two composable skills:
1. **Efficient Codebase Exploration** → how to understand projects
2. **Safe Code Modification** → how to edit, test, and validate changes

Usage: `Efficient Codebase Exploration (Conservative) + Safe Code Modification`
