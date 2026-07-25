---
name: ui-ux-review-agent
description: Custom UI/UX review subagent (bonded agent, Sonnet, auto-permission) for auditing frontend components
metadata:
  type: project
---

A UI/UX review **bonded subagent** was created at `.claude/skills/ui-ux-review/SKILL.md`. Configured as:

| Field | Value |
|-------|-------|
| `bonded_agent` | `ui-ux-review` |
| `bond_type` | `PRIMARY_BOND` |
| `model` | `sonnet` |
| `allowed-tools` | `Read, Write, Edit, Bash, Glob, Grep, WebFetch` |

The `allowed-tools` field grants **auto-permission** — the subagent can read, edit, write, and search files without prompting.

The skill reviews frontend React components for:
- Accessibility (WCAG AA compliance, ARIA labels, keyboard nav, reduced motion)
- Responsiveness (mobile layout, touch targets, overflow, sidebar behavior)
- Visual consistency (design tokens, typography, spacing, dark/light themes)
- UX flow (feedback, navigation, confirmation dialogs, empty/loading states)
- React best practices (key props, re-renders, effect cleanup, typing)
- i18n (translation completeness, Myanmar text overflow)
- Performance (lazy loading, memoization, virtualization, bundle splitting)

The project uses a cyberpunk/terminal theme with neon green accent, Orbitron headings, and dark/light mode support via `data-theme` on `<html>`.

**How to apply:** Invoke via `/ui-ux-review <target>` where target is a component name, page name, or `all` for a full audit. The subagent spawns in its own context, reads the files, walks the checklist, and applies fixes autonomously (auto-permission).
