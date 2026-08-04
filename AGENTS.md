# AGENTS.md — Project Context & Memory

> **Living memory file for AI agents working on this repo.** Read this first.
> This reflects the **current working-tree state** (branch `test1`), which is ahead of
> `CLAUDE.md`, `README.md`, and `SPEC.md` — those documents are partially outdated.

---

## 1. What This Project Is

**Compilation Visualizer** — a web app where users write Java code and watch the
compilation pipeline unfold step-by-step: **lexing → parsing → AST → semantic
analysis → IR/CFG → bytecode → execution**.

- **Frontend**: React 19 + TypeScript + Vite. Editor (Monaco), D3.js visualizations, Three.js 3D pipeline.
- **Backend**: Spring Boot 3.2 + Java 17 + Maven. Uses JavaParser for tokens/AST, `javax.tools.JavaCompiler` + `javap` for bytecode, `ProcessBuilder` + `java` for execution.
- **Auth**: Spring Security + JWT (stateless), BCrypt password hashing.
- **DB**: SQLite (dev) / H2 (tests) / MySQL (prod) via Spring Data JPA.
- **i18n**: English (`en`) + Myanmar (`my`) via i18next.
- **Design**: Tailwind CSS v4 with `@theme` tokens in `index.css`. Cyberpunk/terminal aesthetic (Orbitron + JetBrains Mono, neon green `#00FF88`).

---

## 2. Current Git State (IMPORTANT — knows what's on disk now)

- **Current branch: `test1`** (feature branch with the new "Studio" work).
- Other branches: `main`, `test`, `phyo-thin-kyi-branch`, `thantzin/login`, `thantzin/cfg` (`origin/thantzin/cfg` exists remotely).
- CI runs on `main` via GitHub Actions (`.github/workflows/ci.yml`) — frontend `npm ci && npm run lint && npm run build`, backend `mvn clean package`. Note: backend job uses `mvn`, **not** `./mvnw` (there is no Maven wrapper in the repo).
- **Uncommitted working-tree changes** (on `test1`): the whole Studio feature (see §6). Untracked files include:
  - `frontend/src/pages/CompilerStudio.tsx`
  - `frontend/src/components/{AstCanvas,PipelineStepper,PlaybackDeck,PresetSelect,StageCanvas}.tsx`
  - `frontend/src/context/StepperContext.tsx`
  - `frontend/src/data/presets.ts`
  - `frontend/src/lib/{astUtils,buildSteps,colors}.ts`
  - Deleted: `frontend/src/pages/EditorPage.tsx` (replaced by `CompilerStudio.tsx`)
- `git diff --stat` shows large edits to: `Layout.tsx`, `LandingPage.tsx`, `main.tsx`, `index.css`, `en.json`/`my.json`, `TokenChart.tsx`, `TokenFlow.tsx`, `AstTree.tsx`, `SemanticTree.tsx`, and their `.css` files.

> **Tip**: Do NOT assume `CLAUDE.md`/`README.md` file listings are accurate. Verify against `frontend/src` and `backend/src` before referencing paths.

---

## 3. Commands

### Frontend (`frontend/`)
| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on port **5173** |
| `npm run build` | `tsc -b` typecheck + Vite production build |
| `npm run lint` | **oxlint** (NOT ESLint — never add ESLint config) |
| `npm run preview` | Preview the production build |

### Backend (`backend/`)
| Command | What it does |
|---|---|
| `mvn spring-boot:run` | Spring Boot on port **8080** (no Maven wrapper in repo — use `mvn`) |
| `mvn clean package` | Compile + tests + jar |
| `mvn test` | Run tests |

- Dev profile uses **SQLite** (`dev.db`), no setup needed. MySQL via `-Dspring-boot.run.profiles=prod`.
- Frontend API base: `http://localhost:8080/api` (hard-coded in `frontend/src/services/api.ts`).
- CORS allowlist lives in `SecurityConfig.java` (`corsConfigurationSource()` bean) — update if ports change.

---

## 4. Architecture at a Glance

```
Browser (React) ──HTTP/JSON + JWT──▶ Spring Boot (8080) ──▶ SQLite/MySQL
                                    │
   POST /api/compile ──▶ CompileService.compileAndExecute(source, input)
```

### The compilation pipeline (`CompileService.java`)
1. **Tokenization** — `JavaLexer.tokenize()` (parallel, `CompletableFuture`)
2. **AST** — `StaticJavaParser.parse()` then `AstSerializer.toJson()` (parallel with #1)
3. **Symbol table** — `SymbolTableBuilder.toJson(cu)`
4. **CFG (IR)** — `ControlFlowGraphBuilder.toJson(cu)` — new "Phase 3b"
5. **Bytecode** — `javax.tools.JavaCompiler` in-process, then `javap -c -p` via ProcessBuilder
6. **Execution** — `ProcessBuilder("java", "-cp", tempDir, className)`, 10s timeout, stdin piped if provided

**Key behavior**:
- Cache: LRU-style `ConcurrentHashMap`, max 128 entries, key = `sourceCode + "\0" + input`.
- Class name detected via regex `public\s+class\s+(\w+)` (fallbacks to any `class` decl, then `Main`).
- Temp dir cleaned up in `finally`.
- 10s timeout per phase; `readStream()` merges stderr into stdout to avoid deadlock.
- Per-phase error fields + per-phase timings (`tokenTimeMs`, `astTimeMs`, etc.) in `CompileResponse`.
- **Rate limiting**: `RateLimiter` — 10 requests/minute per IP on all `/api/compile/**` and `/api/execute` (returns 429). Keys on remote IP.

### API surface
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | No | Returns JWT |
| POST | `/api/auth/login` | No | Returns JWT |
| GET | `/api/auth/me` | Yes | |
| POST | `/api/compile` | No | Full pipeline (tokens + AST + symbol + cfg + bytecode + exec) |
| POST | `/api/compile/{tokens,ast,semantic,bytecode}` | No | All just call the full pipeline (same result) |
| POST | `/api/execute` | No | |
| POST | `/api/code` | Yes | Save snippet |
| GET | `/api/code/saved` | Yes | |
| GET/PUT/DELETE | `/api/code/{id}` | Yes | |
| POST | `/api/folders`… | Yes | Folder CRUD (controllers exist in repo, `api.ts` currently only exposes `codeAPI`) |

Auth model: no `Folder` entity in `backend/src/main` currently (only `User`, `SavedCode`); `CompilationLog` model exists in some docs but is NOT in the current `model/` dir — verify before relying on it.

---

## 5. Frontend Structure (current, on `test1`)

```
frontend/src/
├── main.tsx                 # Entry: providers + routes (see provider chain below)
├── index.css                # Tailwind v4 @theme tokens + light-theme overrides + keyframes
├── i18n/                    # en.json / my.json (namespaces: nav, landing, stages, playback, studio, presets, …)
├── context/
│   ├── ThemeContext.tsx     # dark/light/system, localStorage 'cv-theme', data-theme attr
│   ├── LanguageContext.tsx  # en/my, wraps i18next
│   ├── AuthContext.tsx      # user + JWT + login/register/logout
│   ├── CompileContext.tsx   # code, result, loading, error, stdin, file CRUD, dirty tracking
│   └── StepperContext.tsx   # NEW — playback engine (steps, index, play/pause, speed, stage state)
├── components/
│   ├── Layout.tsx           # header + sidebar (FileBrowser when authed) + Outlet; theme/lang/help/share controls
│   ├── FileBrowser.tsx      # VS Code-like sidebar
│   ├── PresetSelect.tsx     # NEW — dropdown of example programs (data/presets.ts)
│   ├── PipelineStepper.tsx  # NEW — horizontal stage pills (lexer/parser/semantic/ir/codegen)
│   ├── StageCanvas.tsx      # NEW — right-pane visualization; AstCanvas + per-stage "reveal" lists
│   ├── AstCanvas.tsx        # NEW — D3 interactive AST (rounded cards + Bezier links, pan/zoom)
│   ├── PlaybackDeck.tsx     # NEW — floating play/pause/step/speed controls + explainer pill
│   ├── CfgGraph.tsx         # NEW — D3 CFG visualization (leveled ranks, edge badges, inspector drawer)
│   ├── AstTree.tsx / SemanticTree.tsx / TokenChart.tsx / TokenFlow.tsx  # D3 panels (visualize routes)
│   ├── PipelineScene.tsx / BinaryRain.tsx / Skeleton.tsx / LoginModal.tsx / RegisterModal.tsx / UserMenu.tsx / Footer.tsx
│   └── ui/                  # shadcn-style primitives (button, card, dialog, dropdown-menu, input, label, separator, tabs)
├── pages/
│   ├── LandingPage.tsx      # BinaryRain hero, boot sequence, CTA
│   ├── CompilerStudio.tsx   # NEW — replaces EditorPage: 40/60 split, Monaco + output + StageCanvas + PlaybackDeck
│   ├── PipelinePage.tsx     # Three.js 3D pipeline
│   ├── VisualizeLayout.tsx  # phase nav (Lexical/Tokens/AST/Semantic/Bytecode/CFG) + Outlet
│   ├── LexicalPanel.tsx / TokensPanel.tsx / AstPanel.tsx / SemanticPanel.tsx / BytecodePanel.tsx / CfgPanel.tsx
├── services/api.ts          # axios: authAPI, compileAPI, executeAPI, codeAPI
├── lib/
│   ├── astUtils.ts          # parseAst/flattenAst/getNodeLabel, BFS ids
│   ├── buildSteps.ts        # buildSteps(): CompileResponse → ordered Step[] across 5 stages; per-stage CAPS
│   └── colors.ts            # getTokenColor() — pastel token palette
├── data/presets.ts          # example programs (math, ifelse, loop)
└── types/index.ts           # Token, CompileResponse, Cfg{Node,Edge,Method,Data}, AuthResponse, etc.
```

### Route table (`main.tsx`)
| Route | Component |
|---|---|
| `/` | LandingPage |
| `/pipeline` | PipelinePage |
| `/compiler` | **CompilerStudio** |
| `/visualize/lexical` | LexicalPanel |
| `/visualize/tokens` | TokensPanel |
| `/visualize/ast` | AstPanel |
| `/visualize/semantic` | SemanticPanel |
| `/visualize/bytecode` | BytecodePanel |
| `/visualize/cfg` | CfgPanel |

### Provider chain (in `main.tsx`)
```
ThemeProvider > LanguageProvider > AuthProvider > CompileProvider > StepperProvider > Routes
```

---

## 6. NEW — The "Studio" Playback Feature (the current work-in-progress)

This is the major uncommitted feature on `test1`. **Understand this before touching the frontend.**

### Concept
`/compiler` is now **CompilerStudio**: a 40% editor / 60% canvas split with an animated
playback engine that steps through the whole compile result, stage by stage.

### How it works
1. `CompileProvider` compiles code (`POST /api/compile`) → `result`.
2. `StepperProvider` runs `buildSteps(result)` (from `lib/buildSteps.ts`) → a flat array of `Step`s:
   - `lexer`: non-whitespace/comment tokens (cap 100)
   - `parser`: AST nodes from `flattenAst(parseAst(...))` (cap 150)
   - `semantic`: symbols from `symbolTableJson` (cap 80)
   - `ir`: CFG basic blocks from `cfgJson` (cap 80)
   - `codegen`: non-empty bytecode lines (cap 100)
3. `StepperContext` manages `index`, `playing`, `speed` (0.5–4x, base 1000ms/step). Auto-plays on new compile, auto-pauses at end. Exposes `getStageState()`, `hasStageData()`, `jumpToStage()`, `revealedCountForStage()`.
4. `PipelineStepper` renders 5 stage pills (lexer/parser/semantic/ir/codegen) with pending/active/complete states; clicking jumps playback.
5. `StageCanvas` shows the **interactive AST** (D3 `AstCanvas`) when no result / resting / during parser stage; otherwise a **reveal view** that unfurls lexer chips, semantic rows, IR blocks, or bytecode lines in sync with the playback index.
6. `PlaybackDeck` = floating transport (reset / step-back / play-pause / step-forward + speed slider) + live explainer text.

### Key implementation details
- AST nodes get **stable ids = BFS index** (`astUtils.ts` `assignBfsIds`), so a step's `ref` matches the rendered node; `AstCanvas` highlights `id === currentStep.ref` with a cyan outline + tooltip.
- `AstCanvas` rebuilds per step but preserves user pan/zoom (reads `d3.zoomTransform` before clearing, recenters only on identity transform).
- `CompileResponse` now includes `cfgJson`/`cfgError`; frontend types match.
- Monaco: custom themes `compili-light` / `compili-dark` registered in `CompilerStudio.tsx`; Ctrl/Cmd+S saves; hover provider shows token type at cursor from cached `result.tokens`.
- i18n namespaces added: `studio.*`, `playback.*`, `stages.*`, `presets.*`.

### Known gaps / follow-ups to be aware of
- `PresetSelect` sits in the Layout header (centered, `/compiler` only).
- "Compiler & Step" is the primary CTA wording (`studio.compileStep`).
- CFG panel + `CfgGraph` are feature-complete on the backend (`ControlFlowGraphBuilder`) but live on the `/visualize/cfg` route, separate from the Studio playback (where CFG blocks feed the `ir` stage).

---

## 7. Conventions & Guardrails (from CLAUDE.md, still valid)

- **Always commit changes** when asked; write clear messages explaining what and why.
- Frontend is **TypeScript strict** — respect types in `src/types/index.ts`.
- Backend DTOs use **Lombok `@Builder`** pattern — add fields with builders, not constructors.
- Use **oxlint**, never ESLint. Don't add `.eslintrc` or ESLint deps.
- D3 visualizations: `useRef` for SVG container + `useEffect`/`useCallback` for rendering; clean up (`svg.selectAll('*').remove()`, remove zoom handlers) in effect cleanup.
- All styling via Tailwind v4 utility classes + `var(--color-*)` tokens. No component CSS files except the retained `.css` files imported by D3 tree components (e.g. `AstTree.css`).
- **No emojis anywhere** — use Lucide React icons (`lucide-react`).
- i18n: all user-facing strings go through `useTranslation()`; add keys to both `en.json` and `my.json`.
- Backend compile/execution is **ephemeral** — temp files cleaned up each run. Don't persist artifacts.
- CORS changes go in `SecurityConfig.java`.
- Routes/providers are wired in `main.tsx`.
- Icon-only buttons: keep min touch targets `min-h-[44px]` / `h-9 w-9` where used (a11y).
- Light theme must be handled — `[data-theme="light"]` overrides in `index.css`.

---

## 8. Useful References

- `CLAUDE.md` — developer-oriented guidance (analogies for a beginner, deeper backend pipeline explanation). Some paths/routes there are stale (still references `EditorPage.tsx`, `App.tsx`, old layout ASCII).
- `README.md` — setup, team workflow, CI explanation. Also partially stale (references `./mvnw`, `EditorPage`).
- `SPEC.md` — original design spec (design tokens table, phase details, DB schema). Still the best reference for **design tokens** and **phase semantics**; file listing is outdated.
- Skills available: `d3-viz`, `java-spring-boot`, `mysql`, `ui-ux-pro-max`, `spec-sync` (see `.claude/skills/` and `.agents/skills/`).

---

## 9. Quick Mental Model

- "Waiter/kitchen/pantry" analogy: **React = waiter** (UI), **Spring Boot = kitchen** (logic/compilation), **MySQL = pantry** (users/saved code).
- Compile once → results shared via `CompileContext` → visualize/playback anywhere via routes + `StepperContext`.
- The new Studio treats the compiler output as a **script to replay**, not just data to render — that's the core idea of `buildSteps` + `StepperContext`.
