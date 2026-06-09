# Git Workflow Agent Prompt

A reusable AI agent workflow that automates Git operations, branch management, and conventional commit generation.

---

## Overview

This system defines a strict Git workflow for AI agents or developer assistants. It ensures:

* Consistent branch naming (`DEVXX`)
* Automatic branch incrementing from remote repository
* Clean synchronization with `main` or `master`
* Structured conventional commits
* Safe stash handling
* Standardized push process

It is designed for use with coding agents (Cursor, Cline, Codex-style agents, or custom automation scripts).

---

## Features

* Detects default branch (`main` or `master`)
* Automatically finds latest `DEV` branch from remote
* Generates next branch number (DEV01 → DEV02 → DEV03…)
* Handles stash save/restore automatically
* Enforces conventional commit types
* Standardized commit format
* Safe push workflow with validation checklist

---

## Commit Types Supported

* `feat` → new feature
* `fix` → bug fix
* `refactor` → code restructuring
* `perf` → performance improvement
* `docs` → documentation updates
* `style` → formatting only
* `test` → test changes
* `build` → build system changes
* `ci` → CI/CD updates
* `ops` → infrastructure changes
* `chore` → maintenance tasks
* `revert` → revert commits

---

## Workflow Summary

The agent follows this sequence:

1. Save current work:

   ```bash
   git stash
   ```

2. Detect default branch:

   * `main` if available
   * otherwise `master`

3. Sync repository:

   ```bash
   git checkout <default-branch>
   git pull --rebase origin <default-branch>
   ```

4. Find latest DEV branch:

   ```bash
   git fetch --all --prune
   git branch -r | grep "origin/DEV" | sed 's|origin/||' | sort -V | tail -n 1
   ```

5. Increment branch:

   * If last = `DEV03` → new = `DEV04`
   * If none exists → `DEV01`

6. Create new branch:

   ```bash
   git checkout -b DEVXX
   ```

7. Restore work:

   ```bash
   git stash pop
   ```

8. Commit changes:

   ```bash
   git add .
   git commit -m "[DEVXX] <type>: <message>"
   ```

9. Push branch:

   ```bash
   git push -u origin DEVXX
   ```

---

## Commit Message Rules

* Must use imperative tone
* Must be specific and descriptive
* Max 72 characters recommended
* Must include type prefix

### Example

```
[DEV04] feat: add authentication middleware
[DEV04] fix: resolve null pointer in user service
[DEV04] docs: update API documentation
```

---

## Validation Rules

Before pushing, ensure:

* Correct branch increment
* Repo is synced with remote
* No merge conflicts
* Commit type is valid
* Message is meaningful

---

## Usage

This workflow can be used as:

* AI agent system prompt
* Git automation script logic
* Developer workflow standard
* CI-assisted commit helper

---

## Notes

This system assumes:

* Remote origin is trusted and up-to-date
* DEV branches follow strict naming convention
* Only one active DEV branch per iteration is created

---

## License

MIT License (see [LICENSE.txt](LICENSE.txt) for details)
