# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
@AGENTS.md

## Startup Checklist

At the start of every conversation, list the contents of:
- `.opencode/agents/` — available audit subagents
- `.opencode/skill/` — available custom skills

This ensures you know what subagents and skills are available before doing any work.
## Developer Profile

The developer is a beginner learning React and backend API development with Spring Boot. They already have solid fundamentals in:
- **HTML, CSS, JavaScript** — core web fundamentals
- **J2SE** — Java core (classes, OOP, collections, etc.)
- **MySQL** — database queries, table design

Learning areas: React (components, state, hooks), REST API design, Spring Boot, TypeScript, build tools (Vite, Maven).

**When explaining, connect new concepts to what they already know.** For example: "React components are like Java classes — they have state (like instance variables) and render output (like a `toString()` method)."

## Project Overview

Compiler Visualizer — a web app where users write Java code and see the compilation pipeline visualized step by step (lexing → parsing → AST → semantic analysis → bytecode generation), then see execution results.

Think of it like an online Java compiler that doesn't just give you the answer — it shows you *how* Java compiles your code, phase by phase.

## Reference Textbook

All compiler concepts, algorithms, terminology, and pipeline structure follow:
**"Engineering a Compiler" (2nd Edition)** by Keith D. Cooper & Linda Torczon (Rice University)

- When researching compiler topics, align terminology and pipeline phases with this book
- If web sources or LLM training data conflict with the book, **prefer the book**
- Use the book's notation and classification for IR, code generation, register allocation, etc.
- When using Context7 or WebSearch, verify results match the book's approach before applying

### Pipeline → Chapter Mapping

| Pipeline Phase | Book Chapter(s) |
|---|---|
| Lexical Analysis | Chapter 3 — Lexical Analysis |
| Parsing / AST | Chapter 4 — Parsing |
| Semantic Analysis | Chapter 5 — Context-Sensitive Analysis |
| Intermediate Representation | Chapter 6 — Intermediate Representations |
| Code Generation | Chapters 7-8 — Machine Independence & Target Code Generation |
| Optimization | Chapters 9-11 — (future scope) |

### Reference Docs

Extracted book sections live in `docs/compiler-reference/` as markdown. Read these before implementing a new pipeline phase to stay consistent with the book's approach.

## Commands

### Frontend (`frontend/`)
- `npm run dev` — Start Vite dev server (port 5173) — like running a local server for your HTML/JS
- `npm run build` — TypeScript check + Vite production build — like compiling Java before deploying
- `npm run lint` — Run ESLint (flat config `eslint.config.js`) — like a code style checker
- `npm run preview` — Preview production build

### Backend (`backend/`)
- `./mvnw spring-boot:run` — Start Spring Boot server (port 8080) — like running a Java application
- `./mvnw clean package` — Build jar — like `javac` + jar packaging
- `./mvnw test` — Run tests

### Full Stack
- Frontend runs on `http://localhost:5173`, backend on `http://localhost:8080`
- API calls from frontend hit `http://localhost:8080/api`
- CORS is configured in `SecurityConfig.java` — update if ports change

## Architecture — How It All Fits Together

### The Big Picture (like a restaurant)

```
User (browser) → Frontend (waiter) → Backend (kitchen) → Database (pantry)
                    React              Spring Boot           MySQL
```

- **Frontend (React)** = the waiter. Takes your order (code input), sends it to the kitchen, brings back the food (compilation results).
- **Backend (Spring Boot)** = the kitchen. Receives the request, does the heavy lifting (compiling Java), returns the result.
- **Database (MySQL)** = the pantry. Stores user accounts and saved code snippets.

### Frontend (React 19 + TypeScript + Vite)

**What is React?** Like Java has classes, React has **components**. A component is a reusable piece of UI. Instead of writing one giant HTML file, you break the UI into small, independent pieces.

**Key concept — JSX:** React uses JSX, which looks like HTML inside JavaScript. Think of it as a template engine (like JSP if you've seen it). Example:
```jsx
// This is JSX — looks like HTML but it's actually JavaScript
function App() {
  return <h1>Hello, World!</h1>;  // Returns a UI element, like returning an object in Java
}
```

**File structure:**
```
frontend/src/
├── App.tsx              # Legacy single-page version (unused after React Router migration)
├── main.tsx             # Entry point with BrowserRouter, Routes, CompileProvider
├── index.css            # Cyberpunk/terminal theme reset (Orbitron, neon green)
├── i18n/
│   ├── index.ts         # i18next initialization (en, my)
│   └── locales/
│       ├── en.json      # English translations
│       └── my.json      # Myanmar translations
├── context/
│   ├── AuthContext.tsx   # Auth state (login, register, logout, JWT token)
│   ├── CompileContext.tsx # Shared compile state (code, results, files, compileSample)
│   ├── ThemeContext.tsx  # Theme state (dark/light/system) with localStorage persistence
│   └── LanguageContext.tsx # Language state (en/my) wrapping i18next
├── data/
│   ├── pipelineData.ts   # Pipeline page phase data (copy, colors, icons per phase)
│   └── sampleCode.ts     # SAMPLE_JAVA_CODE — loop sample for the visualizer's LOAD SAMPLE CODE
├── components/
│   ├── Layout.tsx       # Shared layout: header + sidebar + Outlet for routes
│   ├── FileBrowser.tsx  # VS Code-like sidebar (flat file list, context menu)
│   ├── AstTree.tsx      # D3.js AST tree visualization (collapsible)
│   ├── TokenChart.tsx   # D3.js token bar chart + token flow visualization
│   ├── SemanticTree.tsx # D3.js collapsible tree for symbol table
│   ├── PipelineScene.tsx # Three.js 3D pipeline visualization scene
│   ├── Skeleton.tsx     # Loading skeleton placeholder component
│   ├── LoginModal.tsx   # Modal dialog for user login
│   ├── RegisterModal.tsx # Modal dialog for user registration
│   ├── UserMenu.tsx     # Dropdown menu for user profile and logout
│   ├── Footer.tsx       # Footer component (defined but currently unused)
│   └── ui/              # shadcn/ui components (button, input, card, dialog, etc.)
├── pages/
│   ├── EditorPage.tsx   # Code editor (Monaco) + terminal output
│   ├── LandingPage.tsx  # Landing page: typewriter, 8-phase terminal mockup, three-phase compiler stepper
│   ├── PipelinePage.tsx # Full-page Three.js 3D pipeline visualization
│   ├── VisualizeLayout.tsx # Phase nav + FRONT END/OPTIMIZER/BACK END badge + empty-state LOAD SAMPLE CODE
│   ├── TokensPanel.tsx  # Token visualization with chart/grid toggle
│   ├── AstPanel.tsx     # Full-screen AST tree
│   ├── SemanticPanel.tsx # Symbol table with tree/JSON toggle
│   └── BytecodePanel.tsx # Full-screen bytecode display
├── services/
│   └── api.ts           # Axios client: authAPI, compileAPI, codeAPI
├── lib/
│   └── utils.ts         # cn() utility for merging Tailwind classnames
└── types/
    └── index.ts         # TypeScript interfaces (Token, CompileResponse, SavedCode, etc.)
```

**How the frontend works:**
1. `main.tsx` starts the app (like `main()` in Java) with React Router and CompileProvider
2. `Layout.tsx` renders the header, sidebar (when logged in), and route content via `<Outlet />`
3. User lands on `/` (LandingPage) with the hero and feature cards
4. User navigates to `/compiler` (EditorPage) to write Java code, clicks "Compile & Execute"
5. `CompileContext.tsx` manages shared state (code, results, current file, save/load)
6. `api.ts` sends the code to the backend via HTTP POST
7. Backend returns compilation results (tokens, AST, bytecode, output)
8. User clicks "Visualize" → navigates to `/visualize/tokens` (or ast/semantic/bytecode)
9. Each visualization page shows D3.js charts/trees for that phase
10. User can explore the pipeline in 3D at `/pipeline` (Three.js visualization)

**Route structure:**
```
/                      → LandingPage (hero, feature cards)
/pipeline              → PipelinePage (Three.js 3D pipeline visualization)
/compiler              → EditorPage (code editor + terminal)
/visualize             → VisualizeLayout (phase nav + Outlet)
/visualize/lexical     → LexicalAnalysisPanel (4-step pipeline; /visualize/tokens is an alias)
/visualize/syntax      → AstPanel (D3.js collapsible tree; /visualize/ast is an alias)
/visualize/semantic    → SemanticPanel (D3.js collapsible tree + symbol explorer)
/visualize/cfg         → Optimizer panel (CFG, dominator tree, SSA, data flow; /visualize/optimizer is an alias)
/visualize/codegen     → CodeGenerationPanel (TAC, basic blocks, scheduling, reg alloc)
/visualize/bytecode    → BytecodePanel (listing, stack machine, execution flow)
```

**Key React concepts in this project:**
- **`useState`** — like declaring a variable that React watches. When it changes, the UI re-renders.
- **`useCallback`** — like memoizing a method so it doesn't get recreated every render.
- **`useRef`** — like a instance variable that doesn't trigger re-renders.
- **`useContext`** — like accessing a global variable (AuthContext, CompileContext).
- **Props** — like method parameters. Parent components pass data to children.
- **Components** — like Java classes, but for UI. Each returns JSX.
- **React Router** — like URL mapping in Spring Boot (`@GetMapping`). Routes map URLs to components.

### Backend (Spring Boot 3.2 + Java 17)

**What is Spring Boot?** It's a Java framework that makes it easy to build web servers. Instead of writing raw servlets, you annotate classes and Spring handles the HTTP routing, dependency injection, etc.

**Analogy to what you know:**
- `@RestController` → like a Servlet that handles HTTP requests
- `@GetMapping` / `@PostMapping` → like mapping URL patterns to methods
- `@Autowired` / `@RequiredArgsConstructor` → like dependency injection (Spring creates and injects objects for you)
- `@Service` → like a business logic class (similar to a DAO/Service layer in Java EE)
- `application.properties` → like a configuration file (similar to `web.xml` but modern)

**The compilation pipeline (what happens when you click "Compile"):**

```
Source Code
    │
    ▼
┌─────────────────┐
│ 1. Tokenization  │  JavaLexer breaks code into tokens (keywords, identifiers, strings)
│    (lexing)      │  Like breaking a sentence into words
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 2. AST           │  JavaParser builds a tree structure (Abstract Syntax Tree)
│    Generation    │  Like a sentence diagram in English class
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 3. Symbol Table  │  Extracts class/method/field declarations and their types
│    (semantic)    │  Like a glossary of all names in your code
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Bytecode      │  javac compiles → javap disassembles the .class file
│    Generation    │  Shows you the JVM instructions
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 5. Execution     │  Runs the compiled Java program, captures output
│                  │  Like java Main in your terminal
└─────────────────┘
```

**API endpoints (like Java methods that respond to HTTP):**

| What | URL | Like in Java |
|------|-----|--------------|
| Register | `POST /api/auth/register` | `authService.register(username, email, password)` |
| Login | `POST /api/auth/login` | `authService.login(username, password)` → returns JWT token |
| Current user | `GET /api/auth/me` | `authService.getCurrentUser(token)` → returns user info |
| Compile code | `POST /api/compile` | `compileService.compileAndExecute(sourceCode, stdin)` → returns full results |
| Save code | `POST /api/code` | `codeService.saveCode(userId, title, sourceCode)` |
| Get saved code | `GET /api/code/saved` | `codeService.getSavedCodes(userId)` → returns list |
| Update code | `PUT /api/code/{id}` | `codeService.updateSavedCode(id, title, sourceCode)` |
| Delete code | `DELETE /api/code/{id}` | `codeService.deleteSavedCode(id)` |

**JWT Authentication (like a session token):**
1. User logs in → server generates a JWT token (a signed string)
2. Frontend stores token in `localStorage` (like a cookie but managed by JS)
3. Every API request includes `Authorization: Bearer <token>` header
4. Server validates the token on each request — no server-side session needed

### Key Design Decisions

- **React Router** separates landing (`/`), pipeline (`/pipeline`), editor (`/compiler`), and visualizations (`/visualize/*`) — each phase gets full screen
- **CompileContext** shares code/results across routes — compile once, visualize anywhere
- Visiting `/visualize/*` without results shows an empty state with a **LOAD SAMPLE CODE** button — `compileSample()` compiles `SAMPLE_JAVA_CODE` from `frontend/src/data/sampleCode.ts` (a factorial loop, chosen so the CFG/optimizer panels have branches to show) directly in the visualizer, no editor needed
- The visualize sidebar shows a **FRONT END / OPTIMIZER / BACK END** phase badge (`visualize.phaseBadge.*`) for the active route, and the hardcoded "Raw CFG"/"Raw Bytecode" tab labels are i18n keys (`visualize.tabs.*`)
- The landing page teaches the compiler's **three-phase structure** (front end → optimizer → back end, `landing.protocol.*`) and its terminal mockup cycles all 8 pipeline panels — SOURCE first (`landing.preview.panels.*`), matching the boot line "Phases 1-8"
- **FileBrowser** provides VS Code-like sidebar with flat file list, saved to MySQL per user
- **D3.js** visualizations: bar chart + token flow for tokens, collapsible trees for AST and semantic
- All `/api/compile/**` endpoints return the full response (tokens + AST + symbol table + bytecode + output)
- Tokenization and AST run in parallel (via `CompletableFuture`) — like running two threads simultaneously
- Results are cached (LRU, max 128 entries) — if you compile the same code twice, the second time is instant
- Compile timeout: 10 seconds per phase — prevents infinite loops from freezing the server
- Temp files are cleaned up after each compilation run
- CORS is configured in Spring Security filter chain (not separate CorsFilter bean)

## When Modifying

- Frontend uses TypeScript strict mode — respect existing types in `src/types/index.ts`
- Backend DTOs use Lombok builders — add fields with `@Builder` pattern, not constructors
- All compilation output is ephemeral (temp files cleaned up after each run)
- The project uses ESLint (flat config `eslint.config.js`) with `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh` — run via `npm run lint`
- D3.js visualizations use `useRef` for SVG containers and `useEffect` for rendering
- CORS is configured in `SecurityConfig.java` — update `corsConfigurationSource()` bean if ports change
- React Router routes are defined in `main.tsx` — add new routes there
- **Always commit changes** with a clear message explaining what was done and why

## MCP Tools

Use MCP tools whenever needed to assist with development tasks:

- **chrome-devtools**: Use for browser automation, testing frontend functionality, taking screenshots, debugging UI issues, and monitoring network requests/console messages
- **context7**: Use for querying up-to-date documentation and code examples for libraries and frameworks used in this project (React, Spring Boot, JavaParser, D3.js, Framer Motion, etc.)

### Common Use Cases
- Test frontend changes by navigating to localhost:5173 and interacting with the app
- Take screenshots to verify UI changes or document issues
- Check console messages for errors when debugging frontend problems
- Monitor network requests to verify API calls to the backend
- Query documentation for proper usage of project dependencies
