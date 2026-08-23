# Project Context

This is **Compiler Visualizer** — a web app that visualizes the Java compilation pipeline (lexing → parsing → AST → semantic analysis → bytecode → execution).
read  @CLAUDE.md

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite, **shadcn-style components** co-located in `frontend/src/components/` (no separate `ui/` folder) and **Tailwind CSS v4** with custom `@theme` tokens in `frontend/src/index.css` (no component-level CSS files; everything is utility classes)
- **Backend**: Spring Boot 3.2 (Java 17) + **SQLite** for local dev (H2 for tests, MySQL for production)
- **i18n**: i18next with English (`en`) and Myanmar (`my`) locales
- **Visualization**: D3.js (AST, tokens, symbol tables, CFG), Three.js (3D pipeline)
- **Auth**: Spring Security + JWT (stateless)
- **Audit subagents** (read-only, under `.opencode/agents/`): `backend-refactor`, `backend-reviewer`, `database-architecture-reviewer`, `frontend-refactor`, `ui-ux-reviewer`

## Key Conventions

- Run the frontend with `npm run dev` (Vite, port 5173); backend with `mvn spring-boot:run` (port 8080)
- Lint: `npm run lint` (ESLint via flat config `eslint.config.js`); typecheck/build: `npm run build`
- No emoji anywhere in the UI — use Lucide icons
- All user-facing copy goes through i18n in `frontend/src/i18n/locales/{en,my}.json`
- Three DB profiles: dev (SQLite, default), test (H2, auto-loaded under `src/test`), prod (MySQL, activate with `-Dspring-boot.run.profiles=mysql`)

## Teaching Style & Provenance (persist every session)

- All compiler concepts follow a single textbook internally (`wiki/`), but the UI must be textbook-agnostic: **never render** `Fig.`, `Figure`, `§`, `Ch.`, `Chapter`, `Engineering a Compiler`, or `wiki/` paths to the end user. Use neutral phrasing like “Example walkthrough” or “How it works”.
- Explain like the developer profile in `CLAUDE.md` (J2SE/MySQL → React/Spring): start from what they know (components ≈ Java classes, state ≈ instance vars), then introduce compiler jargon (RE, NFA, DFA, PDA, CFG).
- Every pipeline phase (`/visualize/{lexical,syntax,semantic,cfg,codegen,bytecode}`) exposes an **Examples** walkthrough in the same top-level-tab pattern as the lexical `Build` tab: small concrete Java program → editable code chip + step 1…N animation (circles/arrows, trees, or tables) → result. The `Build` NFA walkthrough (`a(b|c)*`) is the reference pattern.
- **Algorithm labels:** Every visualization/result must show the algorithm that built it, directly in the UI (title or badge) via i18n. Use these canonical names:
  - Lexical: `NFA — Thompson Construction`, `DFA — Subset Construction`, `Min-DFA — Hopcroft's Algorithm`, `Scanner — Maximal-Munch / DFA Simulation`
  - Syntax: `PDA — Pushdown Automaton`, `Shift-Reduce Parsing`, `AST Construction`
  - Semantic: `Scope Tree`, `Symbol Table`, `Type Resolution`, `Type Checking`
  - Optimizer/CFG: `Basic Blocks`, `Dominator Tree`, `SSA Form`, `Liveness / Data-Flow Analysis`, `List Scheduling`
  - Codegen: `TAC Decomposition`, `Basic Blocks`, `Flow Graph`, `Instruction Scheduling`, `Register Allocation (Graph Coloring)`
  - Bytecode: `Bytecode Listing (javap)`, `Stack Machine Simulation`, `Execution Flow`
  Never add a visualization without its algorithm label.
- Internal audit agents (`.opencode/agents/*`) may reference chapters for verification, but their findings must be rewritten into neutral user-facing copy before shipping.
- `wiki/` is internal only — never link to it from the UI.

## Key Flows (recent features)

- **Visualizer empty state**: with no compile results, `/visualize/*` offers **LOAD SAMPLE CODE** — `compileSample()` in `CompileContext` compiles `SAMPLE_JAVA_CODE` (`frontend/src/data/sampleCode.ts`, a factorial loop) in place; users never need the editor to explore visualizations
- **Phase badge**: the visualizer sidebar tags the active route as FRONT END / OPTIMIZER / BACK END (`visualize.phaseBadge.*`); the Static-view tab labels are i18n (`visualize.tabs.rawCfg`, `visualize.tabs.rawBytecode`)
- **Landing page**: hero mockup cycles all 8 pipeline panels (SOURCE first, `landing.preview.panels.editor.code`); "How it works" teaches the three-phase compiler (`landing.protocol.*`); hero CTA **TRY THE VISUALIZER** (`landing.exploreVisualizer`) deep-links to `/visualize/lexical`

<!-- context7 -->
Use Context7 MCP to fetch current documentation whenever the user asks about a library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like React, Next.js, Prisma, Express, Tailwind, Django, or Spring Boot. This includes API syntax, configuration, version migration, library-specific debugging, setup instructions, and CLI tool usage. Use even when you think you know the answer — your training data may not reflect recent changes. Prefer this over web search for library docs.

Do not use for: refactoring, writing scripts from scratch, debugging business logic, code review, or general programming concepts.

## Steps

1. Always start with `resolve-library-id` using the library name and what to look up in the library's documentation, unless the user provides an exact library ID in `/org/project` format
2. Pick the best match (ID format: `/org/project`) by: exact name match, description relevance, code snippet count, source reputation (High/Medium preferred), and benchmark score (higher is better). If results don't look right, try alternate names or queries (e.g., "next.js" not "nextjs", or rephrase the question). Use version-specific IDs when the user mentions a version
3. `query-docs` with the selected library ID and what to look up in the library's documentation (not single words), scoped to a single concept. If the question spans multiple distinct concepts (e.g. routing and auth and caching), make a separate `query-docs` call per concept with the same library ID, unless the question is about how the concepts interact — combined queries dilute ranking and return shallow results for each topic
4. Answer using the fetched docs
<!-- context7 -->
