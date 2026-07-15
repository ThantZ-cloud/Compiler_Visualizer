# Compiler Visualizer — Project Plan (4-Week MVP)

> A web-base

d tool that lets users write Java code and visualize the entire compilation pipeline step-by-step, then see the execution result.

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

---

## 2. Tech Stack (MVP - 4 Weeks)

| Layer | Technology | Why |
|---|---|---|
| **Frontend** | React + TypeScript | Modern, component-based, strong typing |
| **Code Editor** | Monaco Editor (VS Code's editor) | Syntax highlighting, autocomplete, professional feel |
| **Tree Visualization** | D3.js | Best library for rendering AST/parse trees |
| **Animations** | Framer Motion | Smooth phase transitions and UI animations |
| **Backend** | Spring Boot (Java 17) | Industry standard, matches Java EE course requirements |
| **Java Parsing** | JavaParser | Parse Java code → tokens, AST, symbol table without building a compiler from scratch |
| **Execution** | Local Java (javac/java) | Direct execution on host machine for MVP |
| **Database** | H2 (dev) / PostgreSQL (prod) | In-memory for dev, PostgreSQL for production |
| **ORM** | Spring Data JPA | Standard JPA integration with Spring Boot |
| **Build Tool** | Maven | Standard Java build tool, well-supported by Spring Boot |

### Included in MVP
- ✅ Authentication (Spring Security + JWT) — for saving code
- ✅ Save/load code snippets
- ✅ Compilation history

### Deferred to Post-MVP
- ❌ Docker sandboxing — use local execution for MVP

---

## 3. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    React Frontend                           │
│                                                             │
│  ┌──────────────┐  ┌─────────────────────────────────────┐ │
│  │   Monaco     │  │      Visualization Panel            │ │
│  │   Code       │  │  ┌─────┬─────┬─────┬─────┬─────┐  │ │
│  │   Editor     │  │  │Lex  │Parse│ AST │Sema │Byte │  │ │
│  │              │  │  └──┬──┴──┬──┴──┬──┴──┬──┴──┬──┘  │ │
│  └──────┬───────┘  │     │     │     │     │     │      │ │
│         │          │  [Animated Phase Transitions]       │ │
│         │          └─────────────────────────────────────┘ │
│         │          ┌─────────────────────────────────────┐ │
│         └─────────▶│      Output Console                 │ │
│                    │      (execution result)             │ │
│                    └─────────────────────────────────────┘ │
└────────────────────────────┬────────────────────────────────┘
                             │ REST API (JSON)
┌────────────────────────────▼────────────────────────────────┐
│                  Spring Boot Backend                        │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  /api/auth   │  │ /api/compile │  │ /api/execute │     │
│  │  JWT Login   │  │  JavaParser  │  │  Local Java  │     │
│  │  Register    │  │  Phase Data  │  │  javac/java  │     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
│         └─────────────────┼──────────────────┘              │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  Spring Data    │                        │
│                  │  JPA / Hibernate│                        │
│                  └────────┬────────┘                        │
└───────────────────────────┼─────────────────────────────────┘
                            │
                 ┌──────────▼──────────┐
                 │     PostgreSQL      │
                 │                     │
                 │  - users            │
                 │  - saved_code       │
                 │  - compilation_log  │
                 └─────────────────────┘
```

---

## 4. Database Schema

### users
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| username | VARCHAR(50) | Unique |
| email | VARCHAR(100) | Unique |
| password_hash | VARCHAR(255) | BCrypt hashed |
| created_at | TIMESTAMP | Account creation |
| updated_at | TIMESTAMP | Last update |

### saved_code
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| user_id | BIGINT (FK) | References users.id |
| title | VARCHAR(100) | Code title |
| source_code | TEXT | Java source code |
| created_at | TIMESTAMP | When saved |
| updated_at | TIMESTAMP | Last modified |

### compilation_log
| Column | Type | Description |
|---|---|---|
| id | BIGINT (PK) | Auto-generated |
| user_id | BIGINT (FK) | References users.id |
| code_id | BIGINT (FK) | References saved_code.id |
| source_code | TEXT | Code that was compiled |
| tokens_json | JSONB | Lexical analysis output |
| ast_json | JSONB | Abstract syntax tree |
| symbol_table_json | JSONB | Semantic analysis output |
| bytecode | TEXT | Generated bytecode |
| execution_output | TEXT | Code execution result |
| compiled_at | TIMESTAMP | When compiled |

---

## 5. API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login, returns JWT |
| GET | `/api/auth/me` | Get current user info |

### Code Management
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/code/save` | Save code snippet |
| GET | `/api/code/saved` | Get all saved codes |
| GET | `/api/code/{id}` | Get specific code |
| DELETE | `/api/code/{id}` | Delete code |

### Compilation & Execution
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/compile` | Compile code, returns all phase data |
| POST | `/api/compile/tokens` | Get lexical analysis only |
| POST | `/api/compile/ast` | Get AST only |
| POST | `/api/compile/semantic` | Get semantic analysis only |
| POST | `/api/compile/bytecode` | Get bytecode only |
| POST | `/api/execute` | Execute code in sandbox, return output |
| GET | `/api/execute/{jobId}` | Get execution result (async) |

---

## 6. Compilation Phases Visualization

### Phase 1: Lexical Analysis (Tokenization)
```
Input:  "int main() { return 42; }"
Output: [
  { type: "KEYWORD",   value: "int",     line: 1, col: 1 },
  { type: "IDENT",     value: "main",    line: 1, col: 5 },
  { type: "LPAREN",    value: "(",       line: 1, col: 9 },
  { type: "RPAREN",    value: ")",       line: 1, col: 10 },
  { type: "LBRACE",    value: "{",       line: 1, col: 12 },
  { type: "KEYWORD",   value: "return",  line: 1, col: 14 },
  { type: "INT_LITERAL", value: "42",    line: 1, col: 21 },
  { type: "SEMICOLON", value: ";",       line: 1, col: 23 },
  { type: "RBRACE",    value: "}",       line: 1, col: 25 }
]
```
**UI**: Each token highlighted in source code with color-coded categories.

### Phase 2: Syntax Analysis (Parsing)
```
Output: Parse tree → Abstract Syntax Tree (AST)
```
**UI**: Interactive tree visualization using D3.js. Nodes expand/collapse. Click a node to see its source location.

### Phase 3: Semantic Analysis
```
Output: {
  symbolTable: [...],
  typeErrors: [...],
  scopeInfo: [...]
}
```
**UI**: Symbol table displayed as a table. Type errors highlighted inline. Scope blocks visualized.

### Phase 4: Code Generation (Bytecode)
```
Output: JVM bytecode instructions
```
**UI**: Side-by-side view — source code on left, bytecode on right with color mapping.

### Phase 5: Execution
```
Output: stdout, stderr, exit code, execution time
```
**UI**: Terminal-style output console below the visualization panel.

---

## 7. UI Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Logo] Compiler Visualizer                    [Login] [Profile]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────┐  ┌───────────────────────────────┐ │
│  │                        │  │  Phase: [Lex][Parse][AST]...  │ │
│  │    Monaco Editor       │  │                               │ │
│  │                        │  │   [Visualization Area]        │ │
│  │    (Java code)         │  │                               │ │
│  │                        │  │   (Tokens / AST Tree /        │ │
│  │                        │  │    Symbol Table / Bytecode)   │ │
│  │                        │  │                               │ │
│  └────────────────────────┘  └───────────────────────────────┘ │
│                                                                 │
│  [▶ Compile & Execute]  [💾 Save]  [📂 Load]                   │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  Output Console                                          │ │
│  │  $ javac Main.java                                       │ │
│  │  $ java Main                                             │ │
│  │  Hello, World!                                           │ │
│  │  Exit code: 0                                            │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Project Phases & Timeline (4-Week MVP)

### Week 1: Foundation + Backend
- [ ] Set up Spring Boot project with Maven
- [ ] Set up React project with TypeScript
- [ ] Set up PostgreSQL database
- [ ] Configure Spring Data JPA + Hibernate
- [ ] Create database schema (users, saved_code, compilation_log)
- [ ] Set up project structure (packages, folders)
- [ ] Implement JWT authentication (Spring Security)
- [ ] Create `/api/auth` endpoints (register, login)
- [ ] Integrate JavaParser for token extraction
- [ ] Create `/api/compile` endpoint (token, AST, semantic, bytecode)
- [ ] Create `/api/execute` endpoint (local javac/java)

### Week 2: Core Visualizations
- [ ] Token data structure (type, value, line, column)
- [ ] UI: Color-coded token highlighting in editor
- [ ] UI: Token list panel with categories
- [ ] JavaParser AST extraction
- [ ] D3.js tree visualization (interactive nodes)
- [ ] Symbol table extraction + display
- [ ] Bytecode extraction using `javap`
- [ ] Side-by-side source → bytecode view

### Week 3: Frontend + Editor
- [ ] Integrate Monaco Editor in React
- [ ] Basic code editing with Java syntax highlighting
- [ ] Visualization panel (phase tabs: Lex → Parse → AST → Semantic → Bytecode)
- [ ] Animated phase transitions (Framer Motion)
- [ ] Output console UI (stdout/stderr display)
- [ ] Compile & Execute button flow
- [ ] Basic error handling
- [ ] Create `/api/code` endpoints (save, load, delete)
- [ ] Create `/api/history` endpoint (compilation history)

### Week 4: Integration + Polish
- [ ] End-to-end compile/execute flow testing
- [ ] Error handling and loading states
- [ ] Save/load code snippets UI
- [ ] Compilation history UI
- [ ] Basic responsive design
- [ ] Code cleanup and documentation
- [ ] Demo preparation

---

## 9. Security Considerations

| Risk | Mitigation |
|---|---|
| Arbitrary code execution | Local execution with timeout (10s max), no network access |
| SQL injection | Parameterized queries via JPA/Hibernate |
| XSS attacks | React's default escaping, input sanitization |
| JWT theft | HTTP-only cookies, short expiry, refresh tokens |
| DoS via heavy compilation | Rate limiting, timeout on compilation (10s max) |
| File system access | Temporary directories, cleanup after execution |

---

## 10. Future Enhancements (Post-MVP)

- [ ] Support for more languages (C, Python, JavaScript)
- [ ] Compiler optimization visualization (-O0, -O1, -O2, -O3)
- [ ] Side-by-side compiler comparison (like Godbolt)
- [ ] Share compilations via URL
- [ ] Dark/light theme
- [ ] Mobile-responsive design
- [ ] Collaborative code editing
- [ ] AI-powered compiler error explanations

---

## 11. Resources

- [JavaParser](https://javaparser.org/) — Java source code parser
- [ANTLR](https://www.antlr.org/) — Parser generator
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) — VS Code's editor
- [D3.js](https://d3js.org/) — Data visualization library
- [Spring Boot](https://spring.io/projects/spring-boot) — Backend framework
- [Godbolt Compiler Explorer](https://godbolt.org/) — Inspiration
