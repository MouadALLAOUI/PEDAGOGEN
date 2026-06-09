---
name: git-workflow-agent
description: An agent that manages Git operations for the project, including branch creation, commit formatting, and pushing to remote repositories.
license: MIT
metadata:
    author: Mouad ALLAOUI
    version: '1.0.0'
---

# Git Workflow Agent Rules

You are responsible for managing Git operations for this project.

## Step 1 - Save Current Work

```bash
git stash
```

---

## Step 2 - Detect Default Branch

Determine whether the repository uses `main` or `master`.

Example:

```bash
git branch -a
```

Priority:

1. Use `main` if it exists.
2. Otherwise use `master`.

Store the result as:

```text
DEFAULT_BRANCH
```

---

## Step 3 - Update Local Repository

```bash
git checkout $DEFAULT_BRANCH
git pull --rebase origin $DEFAULT_BRANCH
```

---

## Step 4 - Determine Next DEV Branch

Find the latest remote DEV branch:

```bash
git fetch --all --prune

git branch -r | grep "origin/DEV" | sed 's|origin/||' | sort -V | tail -n 1
```

Examples:

```text
DEV01
DEV02
DEV03
```

If the latest branch is:

```text
DEV03
```

Create:

```text
DEV04
```

If no DEV branch exists:

```text
DEV01
```

The agent must automatically increment the number.

Examples:

```text
DEV01 → DEV02
DEV09 → DEV10
DEV99 → DEV100
```

Store the result as:

```text
NEW_BRANCH
```

Create branch:

```bash
git checkout -b $NEW_BRANCH
```

---

## Step 5 - Restore Work

```bash
git stash pop
```

---

## Step 6 - Determine Commit Type

Analyze modified files and select the best matching type.

### Allowed Types

- feat
- fix
- refactor
- perf
- docs
- style
- test
- build
- ci
- ops
- chore
- revert

---

## Step 7 - Create Commit Message

Format:

```text
[$NEW_BRANCH] <type>: <short description>
```

Examples:

```text
[DEV04] feat: add user profile page

[DEV04] fix: resolve authentication timeout

[DEV04] docs: update installation guide
```

Rules:

- Use imperative mood.
- Maximum 72 characters.
- Be specific.
- Never use:
    - update
    - changes
    - fix stuff
    - wip

---

## Step 8 - Commit

```bash
git add .

git commit -m "[$NEW_BRANCH] <type>: <description>"
```

---

## Step 9 - Push

```bash
git push -u origin $NEW_BRANCH
```

---

## Validation Checklist

Before pushing:

- Default branch detected correctly.
- Repository synchronized with remote.
- DEV branch number incremented correctly.
- Commit type follows convention.
- Commit message is descriptive.
- No merge conflicts exist.
- Push target matches branch name.

Only proceed when all validations pass.
