# Compiler Visualizer — Project Plan

> A web-based tool that lets users write Java code and visualize the entire compilation pipeline step-by-step, then see the execution result.

---

## 1. Project Overview

### What It Does
Users write Java code in a browser-based editor. The system visualizes **how** the code compiles (lexing → parsing → AST → semantic analysis → bytecode generation) with animated UI, and then shows the **result** of executing the code.

### Why It's Valuable
- **Educational**: Demystifies compiler internals — one of the hardest CS subjects
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
| **UI Framework** | Tailwind CSS v4 | ^4.0 | Utility-first CSS, rapid styling |
| **Component Library** | shadcn/ui | latest | Pre-built accessible components |
| **Code Editor** | Monaco Editor | @monaco-editor/react ^4.7 | VS Code's editor — syntax highlighting, autocomplete |
| **Tree Visualization** | D3.js | ^7.9 | Best library for rendering AST/parse trees |
| **Animations** | Framer Motion | ^12.42 | Smooth phase transitions |
| **HTTP Client** | Axios | ^1.18 | API calls with JWT interceptors |
| **Backend** | Spring Boot | 3.2.0, Java 17 | Industry standard, matches Java EE |
| **Java Parsing** | JavaParser | 3.25.8 | Token extraction + AST without building a compiler |
| **Bytecode** | javac + javap | JDK built-in | Compile in-process, disassemble with `javap -c -p` |
| **Database (Dev)** | SQLite | via Hibernate | Simple local development, no server needed |
| **Database (Prod)** | MySQL | 8+ | Production database |
| **ORM** | Spring Data JPA | Hibernate | Standard JPA with Spring Boot |
| **Auth** | Spring Security + JWT | jjwt 0.12.3 | Stateless authentication |
| **Build Tool** | Maven | Spring wrapper | Standard Java build tool |
| **Linting** | oxlint | ^1.71 | NOT ESLint — faster, Rust-based |

### Design System

| Token | Value | Usage |
|---|---|---|
| `--color-midnight` | `#0a0e1a` | Page background |
| `--color-surface` | `#111827` | Card/panel background |
| `--color-surface-2` | `#1a2234` | Elevated surfaces |
| `--color-cyan` | `#00d4ff` | Primary accent |
| `--color-amber` | `#f59e0b` | Secondary accent |
| `--color-violet` | `#a78bfa` | Tertiary accent |
| `--color-emerald` | `#34d399` | Success states |
| `--color-rose` | `#fb7185` | Error/delete states |
| `--font-display` | Space Grotesk | Headings |
| `--font-body` | Inter | Body text |
| `--font-mono` | JetBrains Mono | Code/data |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│  (React Router: / = landing, /compiler = editor)            │
│                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │   Sidebar    │  │      Route Content                  │ │
│  │ (FileBrowser)│  │                                     │ │
│  │  - Files     │  │  / → LandingPage                    │ │
│  │  (flat list) │  │  /compiler → EditorPage             │ │
│  │              │  │  /visualize/tokens → TokenChart     │ │
│  └──────────────┘  │  /visualize/ast → AstTree (D3.js)   │ │
│                    │  /visualize/semantic → SemanticTree │ │
│                    │  /visualize/bytecode → BytecodePanel │ │
│                    └─────────────────────────────────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  CompileContext (shared state)                      │   │
│  │  - code, results, currentFileId, isDirty            │   │
│  │  - save/load, confirmDiscard                        │   │
│  └─────────────────────────────────────────────────────┘   │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API (JSON) + JWT Header
┌────────────────────────────▼────────────────────────────────┐
│                  Spring Boot Backend                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────────────────────────┐   │
│  │  /api/auth   │  │         /api/compile              │   │
│  │  JWT Login   │  │  ┌────────────────────────────┐  │   │
│  │  Register    │  │  │ CompileService              │  │   │
│  └──────┬───────┘  │  │  1. JavaLexer (tokens)     │  │   │
│         │          │  │  2. JavaParser (AST)        │  │   │
│         │          │  │  3. SymbolTableBuilder      │  │   │
│         │          │  │  4. javac + javap (bytecode)│  │   │
│         │          │  │  5. java (execution)        │  │   │
│         │          │  └────────────────────────────┘  │   │
│         │          └──────────────────────────────────┘   │
│         │          ┌──────────────────────────────────┐   │
│         │          │         /api/code                 │   │
│         │          │  Save, Load, Update, Delete       │   │
│         │          └──────────────────────────────────┘   │
│         └─────────────────┼──────────────────────────────┘
│                           │
│                  ┌────────▼────────┐
│                  │  Spring Data    │
│                  │  JPA / Hibernate│
│                  └────────┬────────┘
└───────────────────────────┼─────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │  SQLite (dev)       │
                 │  MySQL (prod)       │
                 │                     │
                 │  - users            │
                 │  - saved_code       │
                 │  - folder           │
                 └─────────────────────┘
```

---

## 4. Route Structure

| Route | Component | Description |
|---|---|---|
| `/` | LandingPage | Hero section, pipeline overview, code preview |
| `/compiler` | EditorPage | Monaco editor, file sidebar, output terminal |
| `/visualize/tokens` | TokensPanel | D3.js bar chart + token flow |
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
- **Flat file list** under "MY SNIPPETS" root
- No folder navigation in the UI (backend folder endpoints exist but unused)
- Each file stores: title, source code, timestamps

### Features
| Feature | Status | Description |
|---|---|---|
| Create file | ✅ | Click 📄 → type name → Enter |
| Load file | ✅ | Click file in sidebar → loads in editor |
| Save file | ✅ | 💾 button or Ctrl+S |
| Delete file | ✅ | ✕ button on hover, with confirmation |
| Rename file | ✅ | Right-click → Rename |
| Dirty tracking | ✅ | Amber dot (●) when unsaved changes |
| Unsaved warning | ✅ | Confirm dialog before switching files |

### Save Flow
1. **New file** (no `currentFileId`): Prompts for filename, creates record, sets `currentFileId`
2. **Existing file** (`currentFileId` set): Updates record with current code
3. **Dirty state**: `isDirty` tracks if code differs from last saved state
4. **Confirm discard**: `confirmDiscard()` checks `isDirty` and shows `window.confirm()`

---

## 9. UI Layout

### Landing Page (`/`)
```
┌─────────────────────────────────────────────────────────────┐
│  [CV] Compiler Visualizer                    [ThantZ44 ▾]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              ● INTERACTIVE COMPILER EDUCATION               │
│                                                             │
│                 See Your Code                               │
│                Come Alive                                   │
│   Write Java code and watch the compiler transform it       │
│                                                             │
│          [Open Editor →]  [See How It Works ↓]              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                    THE PIPELINE                             │
│              Five Phases. One Journey.                      │
│                                                             │
│  ┌──────┐ ─→ ┌──────┐ ─→ ┌──────┐ ─→ ┌──────┐ ─→ ┌──────┐│
│  │ 01   │    │ 02   │    │ 03   │    │ 04   │    │ 05   ││
│  │Lexing│    │Parsing│   │ AST  │    │Seman.│    │Bytec.││
│  └──────┘    └──────┘    └──────┘    └──────┘    └──────┘│
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  WRITE CODE                                                │
│  A Real Editor. Real Compilation.          ┌──────────────┐│
│                                            │ Main.java    ││
│  ✓ Monaco editor                           │ public class ││
│  ✓ Real-time compilation                   │   Main { ... ││
│  ✓ Ctrl+S to save                          └──────────────┘│
├─────────────────────────────────────────────────────────────┤
│         Ready to See Compilation in Action?                 │
│                 [Open Editor →]                             │
└─────────────────────────────────────────────────────────────┘
```

### Editor Page (`/compiler`)
```
┌─────────────────────────────────────────────────────────────┐
│  [CV] Compiler Visualizer [Editor]  [▶ Compile] [◎ Visual] │
├──────────┬──────────────────────────────────────────────────┤
│ EXPLORER │  Main.java ●                        💾 Save     │
│ MY SNIP. │──────────────────────────────────────────────────│
│  file1   │  1  public class Main {                          │
│  file2   │  2      public static void main(String[] args) { │
│  file3   │  3          System.out.println("Hello, World!"); │
│          │  4      }                                        │
│          │  5  }                                            │
│          │──────────────────────────────────────────────────│
│          │  ● OUTPUT                                        │
│          │  Click ▶ Compile to run your code.               │
└──────────┴──────────────────────────────────────────────────┘
```

### Visualize Pages (`/visualize/*`)
```
┌─────────────────────────────────────────────────────────────┐
│  [CV] Compiler Visualizer [Editor]  [▶ Compile] [◎ Visual] │
├─────────────────────────────────────────────────────────────┤
│  [← Editor] [Tokens] [AST] [Semantic] [Bytecode]           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  [Full-screen D3.js visualization]                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Project Timeline

### Week 1: Foundation + Backend ✅
- [x] Set up Spring Boot project with Maven
- [x] Set up React project with Vite + TypeScript
- [x] Set up MySQL database
- [x] Configure Spring Data JPA + Hibernate
- [x] Create database schema (users, saved_code)
- [x] Implement JWT authentication
- [x] Create `/api/auth` endpoints
- [x] Integrate JavaParser for token extraction
- [x] Create `/api/compile` endpoint
- [x] Create `/api/execute` endpoint

### Week 2: Core Visualizations ✅
- [x] Token data structure + list panel
- [x] AST JSON display + D3.js tree
- [x] Symbol table extraction + D3.js tree
- [x] Bytecode extraction using `javap`
- [x] D3.js token visualization (bar chart + flow)

### Week 3: Frontend + Editor ✅
- [x] Monaco Editor integration
- [x] React Router navigation
- [x] CompileContext for shared state
- [x] FileBrowser sidebar (flat files)
- [x] Output console UI
- [x] Compile & Execute flow
- [x] Cancel compilation support
- [x] stdin input
- [x] Create `/api/code` endpoints
- [x] Framer Motion animations

### Week 4: UI Redesign + Polish ✅
- [x] Tailwind CSS v4 integration
- [x] shadcn/ui component library
- [x] Landing page (`/`) with hero + pipeline
- [x] Editor moved to `/compiler`
- [x] Design system (CSS variables, typography)
- [x] Dirty tracking + unsaved changes warning
- [x] File rename support
- [x] SQLite for development, MySQL for production
- [x] Delete confirmation dialogs

### Future Work
- [ ] Compilation history backend + UI
- [ ] Side-by-side source → bytecode view
- [ ] Responsive design
- [ ] Dark/light theme toggle

---

## 11. Security Considerations

| Risk | Mitigation | Status |
|---|---|---|
| Arbitrary code execution | Local execution with timeout (10s max) | ✅ |
| SQL injection | Parameterized queries via JPA/Hibernate | ✅ |
| XSS attacks | React's default escaping | ✅ |
| JWT theft | Token in localStorage, 24h expiry | ✅ |
| DoS via heavy compilation | LRU cache (128 entries), 10s timeout | ✅ |
| File system access | Temporary directories, cleanup after execution | ✅ |
| Secrets in git | `.gitignore` excludes `application.properties` | ✅ |

---

## 12. Resources

- [JavaParser](https://javaparser.org/) — Java source code parser
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code's editor
- [D3.js](https://d3js.org/) — Data visualization library
- [Tailwind CSS](https://tailwindcss.com/) — Utility-first CSS framework
- [shadcn/ui](https://ui.shadcn.com/) — React component library
- [Framer Motion](https://www.framer.com/motion/) — React animation library
- [React Router](https://reactrouter.com/) — Multi-page navigation
- [Spring Boot](https://spring.io/projects/spring-boot) — Backend framework
- [Godbolt Compiler Explorer](https://godbolt.org/) — Inspiration
