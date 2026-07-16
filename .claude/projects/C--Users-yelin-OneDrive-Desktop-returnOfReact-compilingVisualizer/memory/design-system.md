---
name: design-system
description: Compiler Visualizer design system - cyberpunk/terminal aesthetic with neon green, dark backgrounds, Orbitron + JetBrains Mono fonts
metadata:
  type: project
---

## Design System Established (2026-07-17)

The Compiler Visualizer uses a cyberpunk/terminal aesthetic validated by UI/UX Pro Max skill.

### Color Palette
- Primary: `#00FF88` (neon green) - CTAs, active states, accents
- Background: `#0A0A0F` (void black) - main background
- Surface: `#12121A` (card) - cards, panels
- Border: `#1E1E30` - subtle borders
- Text: `#E0E0F0` (primary), `#8888AA` (dim), `#555570` (muted)
- Accent colors: Cyan `#00D4FF`, Magenta `#FF00FF`, Amber `#FFB000`, Rose `#FF3366`

### Typography
- Display: Orbitron (headings, labels, buttons)
- Body/Mono: JetBrains Mono (code, body text, terminal)

### Key Patterns
- Terminal HUD-style header with compile/visualize buttons
- ASCII-style branding (`< CV />`, `[ BEGIN ]`)
- Scanline overlay effect (optional, respects reduced-motion)
- Neon glow effects on hover/focus states
- Phase cards with color-coded borders
- D3.js collapsible trees for AST and semantic visualization

### Accessibility Improvements Applied
- Focus-visible states on all interactive elements
- ARIA labels on icon-only buttons and SVG containers
- Skip link for keyboard navigation
- Reduced motion support (disables all animations)
- Skeleton loading states for async content
- Unicode symbols instead of emojis for icons

**Why:** Establishes consistent design language across the app.
**How to apply:** Follow these tokens when adding new components or pages.
