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

## 2. Tech Stack (Actual)

| Layer | Technology | Version | Why |
|---|---|---|---|
| **Frontend** | React + TypeScript | React 19, TS 6, Vite 8 | Modern, component-based, strong typing |
| **Code Editor** | Monaco Editor | @monaco-editor/react ^4.7 | VS Code's editor — syntax highlighting, autocomplete |
| **Tree Visualization** | D3.js | ^7.9 | Best library for rendering AST/parse trees (planned) |
| **Animations** | Framer Motion | ^12.42 | Smooth phase transitions (planned) |
| **HTTP Client** | Axios | ^1.18 | API calls with JWT interceptors |
| **Backend** | Spring Boot | 3.2.0, Java 17 | Industry standard, matches Java EE |
| **Java Parsing** | JavaParser | 3.25.8 | Token extraction + AST without building a compiler |
| **Bytecode** | javac + javap | JDK built-in | Compile in-process, disassemble with `javap -c -p` |
| **Database** | MySQL | 8+ (prod) | Production database |
| **ORM** | Spring Data JPA | Hibernate | Standard JPA with Spring Boot |
| **Auth** | Spring Security + JWT | jjwt 0.12.3 | Stateless authentication |
| **Build Tool** | Maven | Spring wrapper | Standard Java build tool |
| **Linting** | oxlint | ^1.71 | NOT ESLint — faster, Rust-based |

### What's Actually Built vs Planned

| Feature | Status | Notes |
|---|---|---|
| Spring Boot project setup | ✅ Done | Maven, Java 17, Spring Boot 3.2 |
| React project setup | ✅ Done | Vite 8, TypeScript 6, oxlint |
| MySQL database | ✅ Done | Configured in `application.properties` |
| JWT authentication | ✅ Done | Register, login, token validation |
| Save/load code snippets | ✅ Done | CRUD endpoints + frontend API |
| Token extraction (JavaLexer) | ✅ Done | Via JavaParser AST visitors |
| AST generation | ✅ Done | `StaticJavaParser.parse()` + JSON serialization |
| Symbol table extraction | ✅ Done | `SymbolTableBuilder` walks AST |
| Bytecode generation | ✅ Done | `javax.tools.JavaCompiler` + `javap -c -p` |
| Code execution | ✅ Done | ProcessBuilder with 10s timeout, stdin support |
| Compile & Execute button | ✅ Done | With cancel support (AbortController) |
| Phase tabs UI | ✅ Done | Tokens, AST, Semantic, Bytecode, Execution |
| Token list display | ✅ Done | Color-coded by type (keyword, method, class) |
| AST JSON display | ✅ Done | Pre-formatted JSON (D3 tree planned) |
| Symbol table display | ✅ Done | Pre-formatted JSON |
| Bytecode display | ✅ Done | Pre-formatted monospace text |
| Execution output display | ✅ Done | Terminal-style with error handling |
| stdin input | ✅ Done | Textarea for Scanner input |
| Compilation caching | ✅ Done | LRU cache, max 128 entries |
| D3.js tree visualization | ❌ Planned | Interactive AST tree nodes |
| Framer Motion animations | ❌ Planned | Phase transition animations |
| Save/Load UI | ❌ Planned | Frontend for saved snippets |
| Compilation history | ❌ Planned | Backend entity not yet created |
| Responsive design | ❌ Planned | Desktop-first for now |
| Dark/light theme toggle | ❌ Planned | Dark theme only for now |

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │   Monaco     │  │      Visualization Panel            │ │
│  │   Code       │  │  ┌─────┬─────┬─────┬─────┬─────┐  │ │
│  │   Editor     │  │  │Token│ AST │Sema │Byte │Exec │  │ │
│  │              │  │  └──┬──┴──┬──┴──┬──┴──┬──┴──┬──┘  │ │
│  └──────┬───────┘  │     │     │     │     │     │      │ │
│         │          │  [Tab-based Phase Switching]        │ │
│         │          └─────────────────────────────────────┘ │
│         │          ┌─────────────────────────────────────┐ │
│         └─────────▶│      Stdin Input + Output           │ │
│                    │      (execution result)             │ │
│                    └─────────────────────────────────────┘ │
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
│         │          │  Save, Load, Delete snippets      │   │
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
                 │      MySQL          │
                 │                     │
                 │  - users            │
                 │  - saved_code       │
                 └─────────────────────┘
```

---

## 4. Database Schema (Actual)

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
| title | VARCHAR | Code title |
| source_code | TEXT | Java source code |
| created_at | TIMESTAMP | When saved |
| updated_at | TIMESTAMP | Last modified |

### compilation_log (planned — entity not yet created)
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| user_id | BIGINT (FK) | References users.id |
| code_id | BIGINT (FK) | References saved_code.id |
| source_code | TEXT | Code that was compiled |
| tokens_json | TEXT | Lexical analysis output |
| ast_json | TEXT | Abstract syntax tree |
| symbol_table_json | TEXT | Semantic analysis output |
| bytecode | TEXT | Generated bytecode |
| execution_output | TEXT | Code execution result |
| compiled_at | TIMESTAMP | When compiled |

---

## 5. API Endpoints (Actual)

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
| POST | `/api/compile/tokens` | No | Full pipeline (not optimized yet) |
| POST | `/api/compile/ast` | No | Full pipeline (not optimized yet) |
| POST | `/api/compile/semantic` | No | Full pipeline (not optimized yet) |
| POST | `/api/compile/bytecode` | No | Full pipeline (not optimized yet) |
| POST | `/api/execute` | No | Execute compiled code only |

### Code Management
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/code/save` | Yes | Save code snippet |
| GET | `/api/code/saved` | Yes | Get all saved codes |
| GET | `/api/code/{id}` | Yes | Get specific code |
| DELETE | `/api/code/{id}` | Yes | Delete code |

### Request/Response Format
```json
// POST /api/compile
// Request:
{
  "sourceCode": "public class Main { public static void main(String[] args) { System.out.println(\"Hello\"); } }",
  "input": ""  // optional stdin
}

// Response:
{
  "tokens": [{"type": "KEYWORD", "value": "public", "line": 1, "column": 1, "length": 6}],
  "astJson": "{...}",
  "symbolTableJson": "{...}",
  "bytecode": "public static void main(java.lang.String[]);",
  "executionOutput": "Hello",
  "compilationTimeMs": 342,
  "tokenTimeMs": 45,
  "astTimeMs": 45,
  "symbolTableTimeMs": 23,
  "bytecodeTimeMs": 180,
  "executionTimeMs": 49
}
```

---

## 6. Compilation Phases (What Happens Inside)

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
```
Output: JSON representation of the AST
```
**How:** `StaticJavaParser.parse()` builds the tree, `AstSerializer.toJson()` converts to JSON.

### Phase 3: Semantic Analysis
```
Output: {
  "classes": [{"name": "Main", "methods": [...], "fields": [...]}]
}
```
**How:** `SymbolTableBuilder` walks the AST, extracts class/method/field declarations with types.

### Phase 4: Code Generation (Bytecode)
```
Output: JVM bytecode instructions (javap -c -p)
```
**How:** `javax.tools.JavaCompiler` compiles in-process (no fork), then `javap` disassembles.

### Phase 5: Execution
```
Output: stdout, stderr, exit code
```
**How:** `ProcessBuilder` runs `java -cp <tempdir> Main` with 10s timeout. Stdin piped in if provided.

### Performance: Parallel Execution
Phases 1 and 2 run in parallel via `CompletableFuture`:
```java
CompletableFuture<List<TokenDto>> tokensFuture = CompletableFuture.supplyAsync(() -> lexer.tokenize());
CompletableFuture<CompilationUnit> astFuture = CompletableFuture.supplyAsync(() -> parse(sourceCode));
// Both run simultaneously — same wall-clock time as one phase
```

---

## 7. UI Layout (Actual)

```
┌─────────────────────────────────────────────────────────────────┐
│  Compiler Visualizer              [▶ Compile & Execute] [Cancel]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────┐  ┌───────────────────────────────┐ │
│  │  Code Editor           │  │  Phase: [Token][AST][Sem][Bc] │ │
│  │                        │  ├───────────────────────────────┤ │
│  │  Standard Input:       │  │                               │ │
│  │  ┌──────────────────┐  │  │   [Visualization Content]    │ │
│  │  │ 5 10             │  │  │                               │ │
│  │  └──────────────────┘  │  │   Tokens: colored cards       │ │
│  │                        │  │   AST: pre-formatted JSON     │ │
│  │  ┌──────────────────┐  │  │   Semantic: symbol table      │ │
│  │  │ Monaco Editor    │  │  │   Bytecode: monospace text    │ │
│  │  │ (Java syntax)    │  │  │   Exec: terminal output       │ │
│  │  │                  │  │  │                               │ │
│  │  └──────────────────┘  │  │                               │ │
│  └────────────────────────┘  └───────────────────────────────┘ │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Error Banner (toast notification on failure)             │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Project Timeline (Actual Progress)

### Week 1: Foundation + Backend ✅
- [x] Set up Spring Boot project with Maven
- [x] Set up React project with Vite + TypeScript
- [x] Set up MySQL database
- [x] Configure Spring Data JPA + Hibernate
- [x] Create database schema (users, saved_code)
- [x] Set up project structure (packages, folders)
- [x] Implement JWT authentication (Spring Security)
- [x] Create `/api/auth` endpoints (register, login, me)
- [x] Integrate JavaParser for token extraction
- [x] Create `/api/compile` endpoint (full pipeline)
- [x] Create `/api/execute` endpoint (local java)

### Week 2: Core Visualizations 🔄
- [x] Token data structure (type, value, line, column)
- [x] Token list panel with color-coded categories
- [x] AST JSON display (pre-formatted)
- [x] Symbol table extraction + display
- [x] Bytecode extraction using `javap`
- [ ] D3.js tree visualization (interactive nodes) — PLANNED
- [ ] Side-by-side source → bytecode view — PLANNED

### Week 3: Frontend + Editor ✅
- [x] Integrate Monaco Editor in React
- [x] Java syntax highlighting
- [x] Visualization panel (phase tabs)
- [x] Output console UI (stdout/stderr display)
- [x] Compile & Execute button flow
- [x] Cancel compilation support (AbortController)
- [x] stdin input for Scanner
- [x] Basic error handling
- [x] Create `/api/code` endpoints (save, load, delete)
- [ ] Framer Motion animations — PLANNED
- [ ] Compilation history endpoint — PLANNED

### Week 4: Integration + Polish 🔄
- [x] End-to-end compile/execute flow working
- [x] Error handling and loading states
- [x] Caching (LRU, 128 entries)
- [ ] Save/load code snippets UI — PLANNED
- [ ] Compilation history UI — PLANNED
- [ ] Basic responsive design — PLANNED
- [ ] Code cleanup and documentation — IN PROGRESS
- [ ] Demo preparation — PLANNED

---

## 9. Security Considerations

| Risk | Mitigation | Status |
|---|---|---|
| Arbitrary code execution | Local execution with timeout (10s max) | ✅ Done |
| SQL injection | Parameterized queries via JPA/Hibernate | ✅ Done |
| XSS attacks | React's default escaping | ✅ Done |
| JWT theft | Token in localStorage, 24h expiry | ✅ Done |
| DoS via heavy compilation | LRU cache (128 entries), 10s timeout | ✅ Done |
| File system access | Temporary directories, cleanup after execution | ✅ Done |
| Secrets in git | `.gitignore` excludes `application.properties` | ✅ Done |

---

## 10. Future Enhancements (Post-MVP)

- [ ] D3.js interactive AST tree (expand/collapse nodes)
- [ ] Framer Motion phase transition animations
- [ ] Save/Load UI for code snippets
- [ ] Compilation history with replay
- [ ] Support for more languages (C, Python, JavaScript)
- [ ] Compiler optimization visualization (-O0, -O1, -O2, -O3)
- [ ] Side-by-side compiler comparison (like Godbolt)
- [ ] Share compilations via URL
- [ ] Dark/light theme toggle
- [ ] Mobile-responsive design
- [ ] Collaborative code editing
- [ ] AI-powered compiler error explanations
- [ ] Docker sandboxing for safer execution

---

## 11. Resources

- [JavaParser](https://javaparser.org/) — Java source code parser
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code's editor
- [D3.js](https://d3js.org/) — Data visualization library
- [Framer Motion](https://www.framer.com/motion/) — React animation library
- [Spring Boot](https://spring.io/projects/spring-boot) — Backend framework
- [Spring Security](https://spring.io/projects/spring-security) — Authentication
- [Godbolt Compiler Explorer](https://godbolt.org/) — Inspiration
- [oxlint](https://oxc-project.github.io/docs/oxlint/) — Fast linter (Rust-based)
