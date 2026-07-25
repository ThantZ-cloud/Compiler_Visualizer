---
name: ui-ux-reviewer
description: Custom UI/UX reviewer agent for auditing frontend components (accessibility, responsiveness, visual consistency, UX)
metadata:
  type: project
---

A UI/UX reviewer **agent** was created at `.claude/agents/ui-ux-reviewer.md`. Moved from `.claude/skills/ui-ux-review/`. Configured as:

| Field | Value |
|-------|-------|
| `model` | `sonnet` |
| `allowed-tools` | `Read, Write, Edit, Bash, Glob, Grep, WebFetch` |

The `allowed-tools` field grants **auto-permission** — the subagent can read, edit, write, and search files without prompting.

The agent reviews frontend React components for:
- Accessibility (WCAG AA compliance, ARIA labels, keyboard nav, reduced motion)
- Responsiveness (mobile layout, touch targets, overflow, sidebar behavior)
- Visual consistency (design tokens, typography, spacing, dark/light themes)
- UX flow (feedback, navigation, confirmation dialogs, empty/loading states)
- React best practices (key props, re-renders, effect cleanup, typing)
- i18n (translation completeness, Myanmar text overflow)
- Performance (lazy loading, memoization, virtualization, bundle splitting)

The project uses a cyberpunk/terminal theme with neon green accent, Orbitron headings, and dark/light mode support via `data-theme` on `<html>`.

**How to apply:** Invoke as a subagent type via the Agent tool with `subagent_type: "ui-ux-reviewer"` and a prompt specifying the target component/page or `all` for full audit.
