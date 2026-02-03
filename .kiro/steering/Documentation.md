---
inclusion: always
---

# Documentation vs Task Reports

## Key Distinction

| Type | Purpose | Lifespan |
|------|---------|----------|
| **Documentation** | Long-term reference guiding decisions | Persistent, evolves with project |
| **Task Reports** | Quick summaries of completed work | Archival, date-stamped snapshots |

## Documentation Folders

Located in `docs/` 

| Folder | Purpose | Examples |
|--------|---------|----------|
| `Art_Docs/` | Visual design references | Entity sprites, color palettes, animation specs |
| `Code_Tech_Docs/` | Technical architecture | System diagrams, API patterns, performance notes |
| `Design_Docs/` | Gameplay design | Mechanics, balance, progression systems |
| `My_Docs/` | User-created docs | Read-only for AI, user-maintained |

## Why Separate Domains?

Code changes frequently. By separating:
- **Art docs** preserve visual intent even when renderers change
- **Design docs** preserve gameplay goals even when implementation changes
- **Tech docs** capture architecture decisions independent of game design

# Task Reports
Quick summaries of completed work. For documentation folder structure, see #[[file:.kiro/steering/documentation.md]]

## Location

`docs/task_reports/`

## Naming Convention

**Format:** `DD-MM-2026_[Filename].md`

## When to Create

- After verifying a feature/fix is working
- When explicitly requested
- Never speculatively

## Guidelines

| Rule | Rationale |
|------|-----------|
| Keep concise | Focus on what changed and why |
| Use livelinks | Connect to related docs/code |
| Merge overlapping topics | Avoid fragmentation |
| Date at top of file | Quick reference |

## Consolidation

When multiple reports cover overlapping topics:
1. Create consolidated doc with current date
2. Merge content, remove duplicates
3. Move old docs to `task_reports/Archive/`
4. Update `task_reports/00_INDEX.md`

## Index

Maintain `docs/task_reports/00_INDEX.md` for navigation.