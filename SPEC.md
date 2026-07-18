# Compilation Visualizer -- Project Plan

> A web-based tool that lets users write Java code and visualize the entire compilation pipeline step-by-step, then see the execution result.

---

## 1. Project Overview

### What It Does
Users write Java code in a browser-based editor. The system visualizes **how** the code compiles (lexing -> parsing -> AST -> semantic analysis -> bytecode generation) with animated UI, and then shows the **result** of executing the code.

### Why It's Valuable
- **Educational**: Demystifies compiler internals -- one of the hardest CS subjects
- **Unique**: No existing tool combines compilation phase visualization + execution for Java
- **Portfolio**: Demonstrates full-stack development, compiler knowledge, and UI skills

### Target Users
- CS students learning compilers, programming languages, or Java
- Developers curious about how Java compilation works
- Educators teaching compiler courses

### Developer Profile
The developer knows HTML, CSS, JavaScript, J2SE, and MySQL. Learning React, Spring Boot, and full-stack development. All explanations should connect new concepts to Java fundamentals.

---

## 2. Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Frontend** | React + TypeScript | React 19, TS 6, Vite 8 | Modern, component-based, strong typing |
| **UI Framework** | Tailwind CSS v4 | ^4.3 | Utility-first CSS, rapid styling via `@theme` tokens |
| **Icons** | Lucide React | ^1.24 | SVG icon library (no emoji used anywhere) |
| **i18n** | i18next + react-i18next | i18next ^26, react-i18next ^17 | English and Myanmar language support |
| **Code Editor** | Monaco Editor | @monaco-editor/react ^4.7 | VS Code's editor -- syntax highlighting, autocomplete |
| **Tree Visualization** | D3.js | ^7.9 | Best library for rendering AST/parse trees |
| **Animations** | Framer Motion | ^12.42 | Smooth phase transitions |
| **HTTP Client** | Axios | ^1.18 | API calls with JWT interceptors |
| **Utility Libraries** | clsx, tailwind-merge, class-variance-authority | latest | Conditional classnames, tailwind merging, variant styling |
| **Base UI** | @base-ui/react | ^1.6 | Headless UI primitives |
| **Backend** | Spring Boot | 3.2.0, Java 17 | Industry standard, matches Java EE |
| **Java Parsing** | JavaParser | 3.25.8 | Token extraction + AST without building a compiler |
| **Bytecode** | javac + javap | JDK built-in | Compile in-process, disassemble with `javap -c -p` |
| **Database (Dev)** | SQLite | via Hibernate | Simple local development, no server needed |
| **Database (Prod)** | MySQL | 8+ | Production database |
| **ORM** | Spring Data JPA | Hibernate | Standard JPA with Spring Boot |
| **Auth** | Spring Security + JWT | jjwt 0.12.3 | Stateless authentication |
| **Build Tool** | Maven | Spring wrapper | Standard Java build tool |
| **Linting** | oxlint | ^1.71 | NOT ESLint -- faster, Rust-based |

### Design System

All styling uses Tailwind CSS v4 with custom `@theme` tokens defined in `frontend/src/index.css`. No component-level CSS files exist -- everything is utility classes. Light theme overrides are provided via `[data-theme="light"]` selector.

| Token | Value (dark) | Usage |
|---|---|---|
| `--color-void` | `#0A0A0F` | Page background (deep black) |
| `--color-void-light` | `#0E0E18` | Slightly lighter void |
| `--color-card` | `#12121A` | Card/panel background |
| `--color-card-hover` | `#1A1A28` | Card hover state |
| `--color-surface` | `#16161F` | Surface background |
| `--color-surface-2` | `#1E1E2E` | Elevated surfaces |
| `--color-surface-3` | `#262638` | Highest elevation |
| `--color-border` | `#1E1E30` | Default border |
| `--color-border-bright` | `#2A2A42` | Bright border |
| `--color-neon` | `#00FF88` | Primary accent (neon green) |
| `--color-cyan` | `#00D4FF` | Secondary accent |
| `--color-magenta` | `#FF00FF` | Tertiary accent |
| `--color-amber` | `#FFB000` | Warning/dirty state |
| `--color-rose` | `#FF3366` | Error/delete states |
| `--color-text` | `#E0E0F0` | Primary text |
| `--color-text-dim` | `#8888AA` | Dimmed text |
| `--color-text-muted` | `#555570` | Muted/disabled text |
| `--font-display` | Orbitron | Headings (sci-fi/terminal aesthetic) |
| `--font-body` | JetBrains Mono | Body text |
| `--font-mono` | JetBrains Mono | Code/data |

---

## 3. Architecture

```
+-------------------------------------------------------------------+
|                        React Frontend                              |
|  (React Router: / = landing, /compiler = editor)                  |
|                                                                   |
|  Provider hierarchy:                                              |
|  ThemeProvider > LanguageProvider > AuthProvider > CompileProvider  |
|                                                                   |
|  +------------------+  +----------------------------------------+ |
|  |   Sidebar        |  |      Route Content                     | |
|  | (FileBrowser)    |  |                                        | |
|  |  - Files         |  |  / -> LandingPage (BinaryRain hero)    | |
|  |  (flat list)     |  |  /compiler -> EditorPage               | |
|  |  (auth only)     |  |  /pipeline -> PipelinePage (Three.js)  | |
|  +------------------+  |  /visualize/tokens -> TokenChart       | |
|                        |  /visualize/ast -> AstTree (D3.js)      | |
|                        |  /visualize/semantic -> SemanticTree    | |
|                        |  /visualize/bytecode -> BytecodePanel   | |
|                        +----------------------------------------+ |
|                                                                   |
|  +-------------------------------------------------------------+ |
|  |  CompileContext (shared state)                               | |
|  |  - code, results, currentFileId, isDirty                     | |
|  |  - save/load, confirmDiscard                                 | |
|  +-------------------------------------------------------------+ |
+------------------------------+------------------------------------+
                               | REST API (JSON) + JWT Header
+------------------------------v------------------------------------+
|                  Spring Boot Backend                              |
|                                                                   |
|  +----------------+  +----------------------------------------+  |
|  |  /api/auth     |  |         /api/compile                    |  |
|  |  JWT Login     |  |  +----------------------------------+  |  |
|  |  Register      |  |  | CompileService                    |  |  |
|  +-------+--------+  |  |  1. JavaLexer (tokens)           |  |  |
|          |           |  |  2. JavaParser (AST)              |  |  |
|          |           |  |  3. SymbolTableBuilder            |  |  |
|          |           |  |  4. javac + javap (bytecode)      |  |  |
|          |           |  |  5. java (execution)              |  |  |
|          |           |  +----------------------------------+  |  |
|          |           +----------------------------------------+  |
|          |           +----------------------------------------+  |
|          |           |         /api/code                       |  |
|          |           |  Save, Load, Update, Delete             |  |
|          |           +----------------------------------------+  |
|          +---------------------+--------------------------------+
|                               |
|                  +------------v-----------+
|                  |  Spring Data            |
|                  |  JPA / Hibernate        |
|                  +------------+-----------+
+-----------------------------+---------------------------+
                              |
                 +------------v-----------+
                 |  SQLite (dev)           |
                 |  MySQL (prod)           |
                 |                          |
                 |  - users                |
                 |  - saved_code           |
                 |  - folder               |
                 +-------------------------+
```

### File Structure

```
frontend/src/
  main.tsx                  # Entry point: BrowserRouter, provider hierarchy, routes
  index.css                 # Global styles, @theme tokens, light theme overrides, animations
  i18n/
    index.ts                # i18next initialization (en, my)
    locales/
      en.json               # English translations
      my.json               # Myanmar translations
  context/
    AuthContext.tsx          # Auth state (login, register, logout, JWT token)
    CompileContext.tsx       # Shared compile state (code, results, file management)
    ThemeContext.tsx          # Theme state (dark/light/system) with localStorage persistence
    LanguageContext.tsx       # Language state (en/my) wrapping i18next
  components/
    Layout.tsx              # Header bar + sidebar + Outlet (no component CSS files)
    FileBrowser.tsx          # VS Code-like sidebar (folders, files, context menu)
    AstTree.tsx              # D3.js AST tree visualization (collapsible)
    TokenChart.tsx           # D3.js token bar chart + token flow visualization
    SemanticTree.tsx         # D3.js collapsible tree for symbol table
    PipelineScene.tsx        # Three.js 3D pipeline visualization scene
    BinaryRain.tsx           # Canvas-based Matrix-style binary rain animation
    Skeleton.tsx             # Loading skeleton placeholder component
    LoginModal.tsx           # Modal dialog for user login
    RegisterModal.tsx        # Modal dialog for user registration
    UserMenu.tsx             # Dropdown menu for user profile and logout
    Footer.tsx               # Footer component (defined but currently unused)
    ui/
      button.tsx             # shadcn/ui button
      input.tsx              # shadcn/ui input
      card.tsx               # shadcn/ui card
      dialog.tsx             # shadcn/ui dialog
      dropdown-menu.tsx      # shadcn/ui dropdown menu
      label.tsx              # shadcn/ui label
      separator.tsx          # shadcn/ui separator
      tabs.tsx               # shadcn/ui tabs
  pages/
    LandingPage.tsx          # Hero with BinaryRain, typewriter, CTA buttons, copyright
    EditorPage.tsx           # Monaco editor + terminal output
    PipelinePage.tsx         # Full-page Three.js 3D pipeline visualization
    VisualizeLayout.tsx      # Nav bar with phase links + Outlet
    TokensPanel.tsx          # Token visualization with chart/grid toggle
    AstPanel.tsx             # Full-screen AST tree
    SemanticPanel.tsx        # Symbol table with tree/JSON toggle
    BytecodePanel.tsx        # Full-screen bytecode display
  services/
    api.ts                   # Axios client: authAPI, compileAPI, codeAPI, folderAPI
  types/
    index.ts                 # TypeScript interfaces (Token, CompileResponse, Folder, etc.)
```

**Note**: All component CSS files (Layout.css, AstTree.css, AuthModal.css, etc.) have been removed. All styling is now done with Tailwind CSS v4 utility classes inline. The only CSS file is `index.css` which contains `@theme` tokens, light theme overrides, and global animations.

---

## 4. Route Structure

| Route | Component | Description |
|---|---|---|
| `/` | LandingPage | Hero section with BinaryRain background, typewriter effect, CTA buttons, copyright at bottom |
| `/pipeline` | PipelinePage | Three.js 3D interactive pipeline visualization (lazy-loaded) |
| `/compiler` | EditorPage | Monaco editor, file sidebar (when logged in), terminal output |
| `/visualize` | VisualizeLayout | Phase nav bar + Outlet for child routes |
| `/visualize/tokens` | TokensPanel | D3.js bar chart + token grid with filter |
| `/visualize/ast` | AstPanel | D3.js collapsible tree |
| `/visualize/semantic` | SemanticPanel | D3.js collapsible symbol table |
| `/visualize/bytecode` | BytecodePanel | Raw bytecode display |

---

## 5. Database Schema

### users
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| username | VARCHAR | Unique |
| email | VARCHAR | Unique |
| password | VARCHAR | BCrypt hashed |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

### saved_code
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| user_id | BIGINT (FK) | References users.id |
| folder_id | BIGINT (FK, nullable) | References folder.id (unused in UI) |
| title | VARCHAR | Code title |
| source_code | TEXT | Java source code |
| created_at | TIMESTAMP | When saved |
| updated_at | TIMESTAMP | Last modified |

### folder
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| user_id | BIGINT (FK) | References users.id |
| name | VARCHAR | Folder name |
| parent_id | BIGINT (FK, nullable) | Self-referencing for nesting |
| created_at | TIMESTAMP | When created |
| updated_at | TIMESTAMP | Last modified |

> **Note**: Folder management exists in the backend but the frontend uses flat file listing only. Folders are not exposed in the current UI.

### compilation_log
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated (TABLE generator) |
| user_id | BIGINT (FK) | References users.id |
| code_id | BIGINT (FK, nullable) | References saved_code.id |
| source_code | TEXT | The compiled source code |
| tokens_json | JSON | Tokenization results |
| ast_json | JSON | AST serialization |
| symbol_table_json | JSON | Symbol table data |
| bytecode | TEXT | JVM bytecode output |
| execution_output | TEXT | Program output |
| compiled_at | TIMESTAMP | When compilation occurred |

### Database Profiles

| Profile | Database | Config File |
|---|---|---|
| `dev` (default) | SQLite (`dev.db`) | `application-dev.properties` |
| `prod` | MySQL | `application-prod.properties` |

Switch profiles: `./mvnw spring-boot:run -Dspring-boot.run.profiles=prod`

---

## 6. API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | No | Register new user, returns JWT |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user info |

### Compilation & Execution
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/compile` | No | Full pipeline (tokens + AST + symbol table + bytecode + execution) |
| POST | `/api/compile/tokens` | No | Compile and return full pipeline (phase-specific endpoint) |
| POST | `/api/compile/ast` | No | Compile and return full pipeline (phase-specific endpoint) |
| POST | `/api/compile/semantic` | No | Compile and return full pipeline (phase-specific endpoint) |
| POST | `/api/compile/bytecode` | No | Compile and return full pipeline (phase-specific endpoint) |
| POST | `/api/execute` | No | Execute compiled code |

### Code Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/code/save` | Yes | Save code snippet |
| GET | `/api/code/saved` | Yes | Get all saved codes |
| GET | `/api/code/{id}` | Yes | Get specific code |
| PUT | `/api/code/{id}` | Yes | Update code title/source |
| DELETE | `/api/code/{id}` | Yes | Delete code |

### Folder Management (backend exists, not used in UI)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/folders` | Yes | Create a folder |
| GET | `/api/folders` | Yes | List all folders |
| PUT | `/api/folders/{id}` | Yes | Rename a folder |
| DELETE | `/api/folders/{id}` | Yes | Delete a folder |

---

## 7. Compilation Phases

### Phase 1: Lexical Analysis (Tokenization)
```
Input:  "public class Main { }"
Output: [
  { type: "KEYWORD",  value: "public", line: 1, col: 1 },
  { type: "KEYWORD",  value: "class",  line: 1, col: 8 },
  { type: "CLASS",    value: "Main",   line: 1, col: 14 },
  { type: "LBRACE",   value: "{",      line: 1, col: 19 },
  { type: "RBRACE",   value: "}",      line: 1, col: 21 }
]
```
**How:** `JavaLexer` uses JavaParser's AST visitor to walk the tree and extract tokens.

### Phase 2: Syntax Analysis (Parsing)
**How:** `StaticJavaParser.parse()` builds the tree, `AstSerializer.toJson()` converts to JSON.

### Phase 3: Semantic Analysis
**How:** `SymbolTableBuilder` walks the AST, extracts class/method/field declarations with types.

### Phase 4: Code Generation (Bytecode)
**How:** `javax.tools.JavaCompiler` compiles in-process (no fork), then `javap` disassembles.

### Phase 5: Execution
**How:** `ProcessBuilder` runs `java -cp <tempdir> Main` with 10s timeout. Stdin piped in if provided.

### Performance: Parallel Execution
Phases 1 and 2 run in parallel via `CompletableFuture`.

---

## 8. File Management

### Current Implementation
- **Flat file list** under "SNIPPETS" root
- Backend folder API endpoints exist and are defined in `api.ts` (create, list, rename, delete)
- `FileBrowser.tsx` only shows when user is authenticated AND on `/compiler` route
- Each file stores: title, source code, timestamps

### Features
| Feature | Status | Description |
|---|---|---|
| Create file | Yes | Click + icon, type name, Enter |
| Load file | Yes | Click file in sidebar, loads in editor |
| Save file | Yes | Save button or Ctrl+S |
| Delete file | Yes | X button on hover, with confirmation |
| Rename file | Yes | Right-click context menu, Rename |
| Dirty tracking | Yes | Amber dot when unsaved changes |
| Unsaved warning | Yes | confirmDiscard() checks isDirty before switching files |

### Save Flow
1. **New file** (no `currentFileId`): Prompts for filename, creates record, sets `currentFileId`
2. **Existing file** (`currentFileId` set): Updates record with current code
3. **Dirty state**: `isDirty` tracks if code differs from last saved state
4. **Confirm discard**: `confirmDiscard()` checks `isDirty` and shows `window.confirm()`

---

## 9. UI Layout

### Header / Nav Bar (56px height)
```
+--------------------------------------------------------------+
| [Logo] Compilation Visualizer | COMPILER | VISUALIZER |      |
|                                |          |          | CANCEL | (when compiling)
|                                |    [Theme] [Lang]  | SIGN IN | [REGISTER] |
+--------------------------------------------------------------+
```
- **Left group**: Logo (SVG icon in border box) + "Compilation Visualizer" text (Orbitron font)
- **Separator**: vertical line
- **Nav links**: COMPILER button + VISUALIZER button (Eye icon + text), active state shows neon green border
- **Right group**:
  - CANCEL button (only shown when `loading` is true, rose/red color)
  - Theme toggle: cycles through dark (Moon) -> light (Sun) -> system (Monitor) using Lucide icons
  - Language toggle: clicks to toggle between EN and Myanmar text
  - Separator
  - Auth buttons: SIGN IN + REGISTER (or UserMenu when authenticated)
- **Height**: `h-14` (56px)
- **Min button size**: `min-w-[44px] min-h-[44px]` for touch targets
- All icons from Lucide React (no emoji used anywhere)

### Landing Page (`/`)
```
+--------------------------------------------------------------+
| BinaryRain canvas background (full page)                     |
|                                                               |
|                    [SYSTEM ONLINE]                            |
|                    (status badge)                              |
|                                                               |
|                   COMPILATION                                 |
|                   VISUALIZER                                  |
|              (Orbitron, glitch effect)                        |
|                                                               |
|            $ javac Main.java_                                 |
|        (terminal typewriter effect)                           |
|                                                               |
|    // Write Java code. Watch the compiler dissect it...       |
|                                                               |
|     [VIEW PIPELINE]        [[BEGIN]]                          |
|                            [[OPEN COMPILER]]                  |
|                           (if authenticated)                  |
|                                                               |
|           (c) 2026 Compilation Visualizer                     |
|                          (Contact Us)                         |
+--------------------------------------------------------------+
```
- **No footer component** on landing page -- only a simple copyright line at the bottom
- **Boot sequence**: Terminal-style boot animation plays on first load (skipped for prefers-reduced-motion)
- **BinaryRain**: Full-page canvas animation behind content
- **FloatingBinary**: Floating binary strings in background
- **CTA buttons**: "VIEW PIPELINE" navigates to `/pipeline`, "BEGIN" / "OPEN COMPILER" navigates to `/compiler`
- The Footer.tsx component exists in `components/` but is **not imported or used** on any page

### Editor Page (`/compiler`)
```
+--------------------------------------------------------------+
| [Logo] Compilation Visualizer | COMPILER | ...               |
+--------------------------------------------------------------+
| EXPLORER    |  [Main.java .] [SAVE] [> COMPILE] | STDIN: __ |
| SNIPPETS    |-----------------------------------------------|
|  file1.java |  1  public class Main {                         |
|  file2.java |  2      public static void main(String[] args) {|
|  file3.java |  3          System.out.println("Hello!");       |
|             |  4      }                                       |
| (auth only) |  5  }                                           |
|             |-------------------------------------------------|
|             |  OUTPUT                                         |
|             |  $ Click COMPILE to run your code.              |
+--------------------------------------------------------------+
```
- **Sidebar (FileBrowser)**: Only shown when user is authenticated AND on `/compiler` route. Width: `w-56` (224px).
- **Toolbar**: File tab (file icon + name + dirty indicator) | Save button (cyan) + Compile button (neon green) | Separator | STDIN input field
- **Editor**: Monaco Editor (Java language, vs-dark theme, JetBrains Mono font)
- **Terminal**: Fixed height `h-[220px]` at bottom, shows compilation output/errors/loading state

### Visualize Pages (`/visualize/*`)
```
+--------------------------------------------------------------+
| [Logo] Compilation Visualizer | COMPILER | ...               |
+--------------------------------------------------------------+
| <- COMPILER | [Tokens] [AST] [Semantic] [Bytecode] |  info  |
+--------------------------------------------------------------+
|                                                              |
|  [Full-screen D3.js visualization]                           |
|                                                              |
+--------------------------------------------------------------+
```
- **Phase nav bar**: "COMPILER" back button + Lucide icons (CircleDot, TreePine, Database, Binary) + phase names
- Active phase shows neon green border with glow shadow
- Phase info (token count, compilation time) shown on right when results exist

### Theme System
- Three modes: dark (default), light, system
- Stored in `localStorage` as `cv-theme`
- Applied via `data-theme` attribute on `<html>`
- Light theme overrides CSS variables in `index.css` via `[data-theme="light"]` selector
- Toggled via Moon/Sun/Monitor icons in the header bar

### i18n System
- Two languages: English (`en`) and Myanmar (`my`)
- Translation files at `src/i18n/locales/en.json` and `src/i18n/locales/my.json`
- Stored in `localStorage` as `cv-lang`
- Toggled via button showing "EN" or Myanmar script in the header bar
- Keys organized by section: `nav.*`, `landing.*`, `footer.*`, `auth.*`, `editor.*`

---

## 10. Context Providers

### Provider Hierarchy (in `main.tsx`)
```
ThemeProvider
  LanguageProvider
    AuthProvider
      CompileProvider
        Routes / Layout
```

| Context | File | Purpose |
|---|---|---|
| ThemeContext | `context/ThemeContext.tsx` | Theme state (dark/light/system), resolvedTheme, localStorage persistence |
| LanguageContext | `context/LanguageContext.tsx` | Language state (en/my), wraps i18next `changeLanguage` |
| AuthContext | `context/AuthContext.tsx` | User state, JWT token, login/register/logout |
| CompileContext | `context/CompileContext.tsx` | Code, results, loading, error, stdin, file management, compile/cancel |

---

## 11. Project Timeline

### Week 1: Foundation + Backend -- Done
- Set up Spring Boot project with Maven
- Set up React project with Vite + TypeScript
- Set up MySQL database
- Configure Spring Data JPA + Hibernate
- Create database schema (users, saved_code)
- Implement JWT authentication
- Create `/api/auth` endpoints
- Integrate JavaParser for token extraction
- Create `/api/compile` endpoint
- Create `/api/execute` endpoint

### Week 2: Core Visualizations -- Done
- Token data structure + list panel
- AST JSON display + D3.js tree
- Symbol table extraction + D3.js tree
- Bytecode extraction using `javap`
- D3.js token visualization (bar chart + flow)

### Week 3: Frontend + Editor -- Done
- Monaco Editor integration
- React Router navigation
- CompileContext for shared state
- FileBrowser sidebar (flat files)
- Output console UI
- Compile & Execute flow
- Cancel compilation support
- stdin input
- Create `/api/code` endpoints
- Framer Motion animations

### Week 4: UI Redesign + Polish -- Done
- Tailwind CSS v4 integration
- shadcn/ui component library
- Landing page with hero + pipeline
- Editor moved to `/compiler`
- Design system (CSS variables, typography)
- Dirty tracking + unsaved changes warning
- File rename support
- SQLite for development, MySQL for production
- Delete confirmation dialogs

### Week 5: 3D Pipeline + UI Polish -- Done
- Three.js 3D pipeline visualization (`/pipeline`)
- BinaryRain background animation
- Cyberpunk/terminal UI redesign (Orbitron fonts, neon green theme)
- Login/Register modal dialogs
- UserMenu dropdown
- Skeleton loading component
- Phase-specific compile endpoints (`/api/compile/tokens`, etc.)
- CompilationLog database model

### Week 6: Theme + i18n + Refinements -- Done
- Dark/light/system theme toggle (ThemeContext, localStorage persistence)
- English/Myanmar i18n language switch (i18next, LanguageContext)
- Lucide React icons replacing all emoji
- All component CSS files removed -- pure Tailwind CSS utility classes
- Project renamed from "Compiler Visualizer" to "Compilation Visualizer"
- Bigger touch targets (min-h-[44px] on interactive elements)
- Footer component created but not used on landing page (copyright only)
- Boot sequence animation on landing page
- Visualizer nav link added to header

### Future Work
- Compilation history backend + UI
- Side-by-side source -> bytecode view
- Responsive design
- Use Footer component on additional pages

---

## 12. Legacy Files

### `App.tsx`
`App.tsx` is a legacy single-page version of the application from before the React Router migration. It is still present in the codebase at `frontend/src/App.tsx` but is **not used in production routing**. The app entry point is `main.tsx`, which defines all routes via React Router.

### `Footer.tsx`
`Footer.tsx` exists at `frontend/src/components/Footer.tsx` and is fully implemented with brand logo, nav links, social icons, and copyright. However, it is **not imported or rendered** by any page component. The landing page has a minimal inline copyright line at the bottom instead.

---

## 13. Security Considerations

| Risk | Mitigation | Status |
|---|---|---|
| Arbitrary code execution | Local execution with timeout (10s max) | Done |
| SQL injection | Parameterized queries via JPA/Hibernate | Done |
| XSS attacks | React's default escaping | Done |
| JWT theft | Token in localStorage, 24h expiry | Done |
| DoS via heavy compilation | LRU cache (128 entries), 10s timeout | Done |
| File system access | Temporary directories, cleanup after execution | Done |
| Secrets in git | `.gitignore` excludes `application.properties` | Done |

---

## 14. Resources

- [JavaParser](https://javaparser.org/) -- Java source code parser
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) -- VS Code's editor
- [D3.js](https://d3js.org/) -- Data visualization library
- [Tailwind CSS](https://tailwindcss.com/) -- Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) -- React component library
- [Framer Motion](https://www.framer.com/motion/) -- React animation library
- [Lucide React](https://lucide.dev/) -- SVG icon library
- [i18next](https://www.i18next.com/) -- Internationalization framework
- [React Router](https://reactrouter.com/) -- Multi-page navigation
- [Spring Boot](https://spring.io/projects/spring-boot) -- Backend framework
- [Godbolt Compiler Explorer](https://godbolt.org/) -- Inspiration
