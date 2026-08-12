<div align="center">

# ⚡ Compilation Visualizer

[![CI](https://github.com/ThantZ-cloud/Compiler_Visualizer/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/ThantZ-cloud/Compiler_Visualizer/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node](https://img.shields.io/badge/Node.js-22%20LTS-339933?logo=nodejs&logoColor=white)](https://nodejs.org/)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?logo=openjdk&logoColor=white)](https://openjdk.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)

### 🎯 Write Java code → Watch the compiler dissect it — token by token, branch by branch, byte by byte.

A full-stack web app that visualizes the **entire Java compilation pipeline** in real time.
Write code in a VS Code–grade editor, then explore each compilation phase through
interactive D3.js trees, 3D Three.js scenes, and raw bytecode disassembly.

</div>

---

## 📸 Screenshots

| Screenshot | Description |
|------------|-------------|
| [🏠 Landing Page](screenshots/01-landing-page.png) | Binary rain animation + terminal typewriter hero |
| [✏️ Code Editor](screenshots/02-editor-page.png) | Monaco Editor with Java syntax + terminal output |
| [🌐 3D Pipeline](screenshots/03-pipeline-3d.png) | Three.js 3D walkthrough of the compilation pipeline |
| [🔤 Token Visualization](screenshots/04-tokens-visualization.png) | D3.js bar chart showing token types & flow |
| [🌳 AST Tree](screenshots/05-ast-tree.png) | D3.js collapsible Abstract Syntax Tree |
| [📋 Symbol Table](screenshots/06-semantic-symbol-table.png) | D3.js tree of class/method/field declarations |
| [💾 Bytecode Display](screenshots/07-bytecode-display.png) | JVM bytecode via `javap -c -p` disassembly |

---

## ⚛️ Tech Stack

### Frontend

| Tech | Version | Why |
|------|---------|-----|
| [React](https://react.dev/) | 19 | Ultra-fast concurrent rendering |
| [TypeScript](https://www.typescriptlang.org/) | 6 | Strict typing, zero `any` escape hatches |
| [Vite](https://vite.dev/) | 8 | Sub-second HMR + Rolldown bundler |
| [Tailwind CSS](https://tailwindcss.com/) | 4 | Utility-first styling via `@theme` tokens |
| [Monaco Editor](https://microsoft.github.io/monaco-editor/) | — | The same editor that powers VS Code |
| [D3.js](https://d3js.org/) | 7 | AST trees, token charts, symbol table trees |
| [Three.js](https://threejs.org/) | — | 3D animated compilation pipeline scene |
| [Framer Motion](https://www.framer.com/motion/) | 12 | Butter-smooth phase transitions |
| [React Router](https://reactrouter.com/) | 7 | Multi-page navigation |
| [i18next](https://www.i18next.com/) | 26 | English + Myanmar (Burmese) 🌏 |
| [oxlint](https://oxc.rs/docs/guide/usage/linter) | 1.73 | Rust-based linter — blazing fast, not ESLint |
| [Axios](https://axios-http.com/) | 1 | HTTP client with JWT interceptors |

### Backend

| Tech | Version | Why |
|------|---------|-----|
| [Spring Boot](https://spring.io/projects/spring-boot) | 3.2 | Industry-standard Java framework |
| [Java](https://openjdk.org/) | 17 | LTS release with modern language features |
| [Maven](https://maven.apache.org/) | — | Build tool + dependency management |
| [JavaParser](https://javaparser.org/) | 3.25 | Token extraction + AST without writing a parser |
| [Spring Security](https://spring.io/projects/spring-security) + JWT | — | Stateless authentication |
| [Spring Data JPA](https://spring.io/projects/spring-data-jpa) | — | ORM layer over Hibernate |
| [H2 Database](https://www.h2database.com/) | — | In-memory dev database — zero setup |
| [MySQL](https://www.mysql.com/) | 8+ | Production database |
| [Lombok](https://projectlombok.org/) | — | Bye-bye boilerplate |

---

## ✅ CI / CD

This project uses **GitHub Actions** for Continuous Integration.
Every push and every PR triggers two parallel jobs:

| Job | Runner | Steps | Time |
|-----|--------|-------|------|
| 🎨 **Frontend** | `ubuntu-latest` + Node 22 LTS | `npm ci` → `oxlint` → `tsc + vite build` | ~25s |
| ☕ **Backend** | `ubuntu-latest` + Java 17 | `mvn clean package` (compile + JUnit tests) | ~30s |

```
  You push code  ──►  GitHub triggers CI  ──►  ✅ Both green = safe to merge
                                            └─►  ❌ Red X = fix and re-push
```

> ℹ️ **Node 22 LTS is required** — Vite 8 and `@vitejs/plugin-react` 6 enforce
> `engines: ^20.19.0 || >=22.12.0`. Node 22 also ships npm 10.9, which keeps
> `package-lock.json` in sync between local dev and CI. If you use nvm:
> ```bash
> nvm use 22
> ```

Workflow file: [`.github/workflows/ci.yml`](.github/workflows/ci.yml)

---

## 🏃 Getting Started

### Prerequisites

| Tool | Version | Required? |
|------|---------|-----------|
| **Java JDK** | 17+ | ✅ Yes |
| **Node.js** | 22 LTS | ✅ Yes |
| **Maven** | 3.6+ | ✅ Yes |
| **MySQL** | 8+ | ⬜ Production only (H2 for dev) |

### ☕ Backend

```bash
cd backend

# Start the dev server (port 8080) — H2 in-memory DB, zero config
mvn spring-boot:run

# Or build the jar
mvn clean package

# Run tests
mvn test
```

### ⚛️ Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Production build (TypeScript check + Vite build)
npm run build

# Lint (oxlint — not ESLint)
npm run lint
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:8080`.

---

## 🏗️ Architecture

### Compilation Pipeline

When you click **Compile & Execute**, the backend runs five phases:

```
  Source Code
       │
       ▼
  ┌─────────────┐     ┌─────────────┐
  │ 1. Lexer    │     │ 2. Parser   │     ← Run in parallel (CompletableFuture)
  │   tokens    │     │   AST JSON  │
  └──────┬──────┘     └──────┬──────┘
         │                   │
         ▼                   ▼
  ┌─────────────────────────────────┐
  │ 3. Symbol Table Builder         │     ← Walks AST for declarations
  │   classes, methods, fields      │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │ 4. Bytecode Generation          │     ← javac (in-process) + javap -c -p
  │   JVM disassembly               │
  └──────────────┬──────────────────┘
                 │
                 ▼
  ┌─────────────────────────────────┐
  │ 5. Execution                    │     ← ProcessBuilder, 10s timeout
  │   stdout / stderr               │
  └─────────────────────────────────┘
```

Results are cached with an LRU cache (128 entries) to avoid recompiling identical source.

### Project Structure

```
compilingVisualizer/
├── .github/workflows/
│   └── ci.yml                      # 🤖 CI workflow (Node 22 + Java 17)
├── frontend/                       # ⚛️ React + TypeScript + Vite
│   └── src/
│       ├── pages/                  # Landing, Editor, Pipeline, Visualize panels
│       ├── components/             # Monaco editor, D3 charts, Three.js scene
│       ├── context/                # Auth, Compile, Theme, Language providers
│       ├── i18n/                   # English + Myanmar translations
│       └── services/               # Axios API client
├── backend/                        # ☕ Spring Boot + Java 17
│   └── src/main/java/com/compilervisualizer/
│       ├── controller/             # Auth, Compile, Code, Folder endpoints
│       ├── service/                # CompileService, JavaLexer, AstSerializer
│       ├── security/               # JWT provider, filter, UserDetailsService
│       └── model/                  # User, SavedCode, Folder entities
└── screenshots/                    # 📸 App screenshots
```

---

## 🔌 API Endpoints

| Method | Path | Auth | Description |
|--------|------|:----:|-------------|
| `POST` | `/api/auth/register` | — | Register a new user |
| `POST` | `/api/auth/login` | — | Login → returns JWT |
| `GET` | `/api/auth/me` | ✅ | Get current user info |
| `POST` | `/api/compile` | — | Full pipeline (tokens + AST + symbols + bytecode + execution) |
| `POST` | `/api/compile/tokens` | — | Tokenization only |
| `POST` | `/api/compile/ast` | — | AST generation only |
| `POST` | `/api/compile/semantic` | — | Symbol table only |
| `POST` | `/api/compile/bytecode` | — | Bytecode generation only |
| `POST` | `/api/code/save` | ✅ | Save code snippet |
| `GET` | `/api/code/saved` | ✅ | List saved snippets |
| `PUT` | `/api/code/:id` | ✅ | Update a snippet |
| `DELETE` | `/api/code/:id` | ✅ | Delete a snippet |
| `POST` | `/api/folders` | ✅ | Create a folder |
| `GET` | `/api/folders` | ✅ | List all folders |
| `PUT` | `/api/folders/:id` | ✅ | Rename a folder |
| `DELETE` | `/api/folders/:id` | ✅ | Delete a folder |

> ⚡ All compile endpoints are rate-limited (10 req/min per IP). Returns `429` when exceeded.

---

## 🧭 Routes

| Route | Page | What you see |
|-------|------|-------------|
| `/` | 🏠 Landing | Binary rain, terminal typewriter, feature cards |
| `/pipeline` | 🌐 Pipeline | Three.js 3D animated compilation pipeline |
| `/compiler` | ✏️ Editor | Monaco editor + terminal output |
| `/visualize/tokens` | 🔤 Tokens | D3.js bar chart + token flow |
| `/visualize/ast` | 🌳 AST | D3.js collapsible syntax tree |
| `/visualize/semantic` | 📋 Symbols | D3.js collapsible symbol table tree |
| `/visualize/bytecode` | 💾 Bytecode | Raw JVM bytecode disassembly |

---

## 🎨 Design System

A **cyberpunk terminal** aesthetic — neon green on deep black, JetBrains Mono everywhere.

| Accent | Hex | Usage |
|--------|-----|-------|
| 🟢 Neon | `#00FF88` | Primary actions, active states |
| 🔵 Cyan | `#00D4FF` | Secondary actions, info |
| 🟣 Magenta | `#FF00FF` | Tertiary highlights |
| 🟡 Amber | `#FFB000` | Warnings, unsaved changes |
| 🔴 Rose | `#FF3366` | Errors, destructive actions |

Fonts: **Orbitron** for headings, **JetBrains Mono** for body & code.

Includes **dark / light / system** theme toggle and **English / Myanmar** language switch.

---

## 👥 Team Workflow

```
  main  ──────────┬──────────────────────────┬──────────
                   │                          │
  feat/login  ────┘ work → commit → push → PR ┘ merge
                                                 ↑
                                          CI must pass ✅
                                          Reviewer approves ✅
```

| Rule | Why |
|------|-----|
| Never push directly to `main` | Everyone's code would collide — always use branches |
| One branch per feature/fix | `git checkout -b feat/tokens-panel` |
| Open a PR before merging | Lets teammates review before it goes live |
| Wait for CI ✅ | Don't merge broken code — fix it and re-push |

---

## 📄 License

**MIT** — free to use, modify, and distribute.

<div align="center">

Built with ⚡ by [Thant Zin Htun](https://github.com/ThantZ-cloud)

</div>
