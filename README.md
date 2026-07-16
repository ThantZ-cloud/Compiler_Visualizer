# Compiler Visualizer

A web application for visualizing the Java compilation pipeline. Write Java code, see it go through lexing, parsing, AST generation, semantic analysis, and bytecode generation — then view execution results.

## Tech Stack

### Frontend

- **React 19** + **TypeScript 6** + **Vite 8**
- **React Router v7** — multi-page navigation (editor vs visualizations)
- **Monaco Editor** (`@monaco-editor/react`) — VS Code-like code editing with Java syntax highlighting
- **D3.js** — data visualization (AST tree, token charts, symbol table tree)
- **Framer Motion** — animations
- **Axios** — API client with JWT interceptors
- **oxlint** — linting (not ESLint)

### Backend

- **Spring Boot 3.2** + **Java 17** + **Maven**
- **JavaParser 3.25** — token extraction and AST generation
- **Spring Security + JWT** — stateless authentication
- **Spring Data JPA** — database access
- **MySQL** (production) / **H2** (dev) / **PostgreSQL** (ready)
- **Lombok** — boilerplate reduction

## Getting Started

### Prerequisites

- **Java 17+** (JDK, not JRE)
- **Node.js 18+** and npm
- **MySQL 8+** (or use H2 for local dev)
- **Maven** (or use the included `mvnw` wrapper)

### Backend

```bash
cd backend

# Start the server (port 8080)
./mvnw spring-boot:run

# Build the jar
./mvnw clean package

# Run tests
./mvnw test
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (port 5173)
npm run dev

# Production build
npm run build

# Lint
npm run lint
```

The frontend runs on `http://localhost:5173` and the backend on `http://localhost:8080`.

## Architecture

### Compilation Pipeline

When a user clicks "Compile & Execute", the backend runs all phases sequentially:

1. **Tokenization** — `JavaLexer` extracts tokens (keywords, identifiers, literals, operators) from source code using JavaParser's AST visitor
2. **AST Generation** — `StaticJavaParser.parse()` produces an Abstract Syntax Tree; `AstSerializer` converts it to JSON
3. **Symbol Table** — `SymbolTableBuilder` walks the AST to extract class/method/field declarations and their types
4. **Bytecode** — `javax.tools.JavaCompiler` compiles source in-process, then `javap -c -p` disassembles the `.class` file
5. **Execution** — `ProcessBuilder` runs `java` with a 10-second timeout; stdin is piped in if provided

Phases 1 and 2 run in parallel via `CompletableFuture`. Results are cached (LRU, max 128 entries).

### API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | No | Register a new user |
| POST | `/api/auth/login` | No | Login, returns JWT |
| GET | `/api/auth/me` | Yes | Get current user |
| POST | `/api/compile` | No | Full pipeline (tokens + AST + symbol table + bytecode + execution) |
| POST | `/api/compile/tokens` | No | Tokenization only |
| POST | `/api/compile/ast` | No | AST generation only |
| POST | `/api/compile/semantic` | No | Symbol table only |
| POST | `/api/compile/bytecode` | No | Bytecode generation only |
| POST | `/api/execute` | No | Execute compiled code |
| POST | `/api/code/save` | Yes | Save code snippet |
| GET | `/api/code/saved` | Yes | List saved snippets (supports `?folderId=` filter) |
| PUT | `/api/code/:id` | Yes | Update a saved snippet |
| DELETE | `/api/code/:id` | Yes | Delete a saved snippet |
| POST | `/api/folders` | Yes | Create a folder |
| GET | `/api/folders` | Yes | List all folders |
| PUT | `/api/folders/:id` | Yes | Rename a folder |
| DELETE | `/api/folders/:id` | Yes | Delete a folder |

### Frontend Structure

```
frontend/src/
├── main.tsx                 # Entry point with BrowserRouter, Routes, CompileProvider
├── index.css                # Dark theme reset (VS Code-inspired)
├── context/
│   ├── AuthContext.tsx      # Auth state (login, register, logout, JWT token)
│   └── CompileContext.tsx   # Shared compile state (code, results, file management)
├── components/
│   ├── Layout.tsx           # Shared layout: header + sidebar + Outlet for routes
│   ├── FileBrowser.tsx      # VS Code-like sidebar (folders, files, context menu)
│   ├── AstTree.tsx          # D3.js AST tree visualization (collapsible)
│   ├── TokenChart.tsx       # D3.js token bar chart + token flow visualization
│   └── SemanticTree.tsx     # D3.js collapsible tree for symbol table
├── pages/
│   ├── EditorPage.tsx       # Code editor (Monaco) + terminal output
│   ├── VisualizeLayout.tsx  # Nav bar with phase links + Outlet
│   ├── TokensPanel.tsx      # Token visualization with chart/grid toggle
│   ├── AstPanel.tsx         # Full-screen AST tree
│   ├── SemanticPanel.tsx    # Symbol table with tree/JSON toggle
│   └── BytecodePanel.tsx    # Full-screen bytecode display
├── services/
│   └── api.ts               # Axios client: authAPI, compileAPI, codeAPI, folderAPI
└── types/
    └── index.ts             # TypeScript interfaces (Token, CompileResponse, Folder, etc.)
```

### Backend Structure

```
backend/src/main/java/com/compilervisualizer/
├── CompilerVisualizerApplication.java   # Spring Boot entry point
├── config/
│   ├── SecurityConfig.java              # Spring Security + JWT + CORS config
│   └── GlobalExceptionHandler.java      # Global error handling
├── controller/
│   ├── AuthController.java              # /api/auth/**
│   ├── CompileController.java           # /api/compile/**
│   ├── ExecuteController.java           # /api/execute/**
│   ├── CodeController.java              # /api/code/**
│   └── FolderController.java            # /api/folders/**
├── dto/                                 # Request/response DTOs (Lombok @Builder)
├── model/
│   ├── User.java                        # User entity
│   ├── SavedCode.java                   # Saved code with folder FK
│   ├── Folder.java                      # Folder entity (user-owned)
│   └── CompilationLog.java              # Compilation history
├── repository/                          # Spring Data JPA repositories
├── security/
│   ├── JwtTokenProvider.java            # JWT generation and validation
│   ├── JwtAuthenticationFilter.java     # Per-request JWT validation
│   └── CustomUserDetailsService.java    # UserDetailsService for Spring Security
└── service/
    ├── CompileService.java              # Orchestrates the full compilation pipeline
    ├── JavaLexer.java                   # Token extraction via JavaParser
    ├── AstSerializer.java               # AST → JSON conversion
    ├── SymbolTableBuilder.java          # Symbol table extraction
    ├── AuthService.java                 # Registration and login logic
    ├── CodeService.java                 # Saved code CRUD (with folder support)
    └── FolderService.java               # Folder CRUD
```

## UI

The app uses a VS Code-inspired layout with React Router for multi-page navigation:

### Routes
- **`/`** — Code editor (Monaco) with terminal output at bottom
- **`/visualize/tokens`** — D3.js bar chart + token flow visualization
- **`/visualize/ast`** — D3.js collapsible AST tree
- **`/visualize/semantic`** — D3.js collapsible symbol table tree
- **`/visualize/bytecode`** — Raw bytecode display

### Components
- **Header**: Logo, "Compile & Execute" button with cancel support, "Visualize" button, auth buttons
- **Sidebar** (when logged in): VS Code-like FileBrowser with folders and files
- **Editor**: Monaco Editor with Java syntax highlighting
- **Terminal**: Output panel at bottom (like VS Code terminal)
- **Visualizations**: Full-screen D3.js charts/trees for each compilation phase

### Theme
Dark theme (VS Code-inspired) with color-coded token types (keywords, methods, classes).

## Configuration

### Backend (`application.properties`)

- `server.port` — backend port (default: 8080)
- `spring.datasource.*` — database connection
- `jwt.secret` — JWT signing secret (change in production!)
- `jwt.expiration` — token lifetime in ms (default: 24h)
- Compile timeout: 10 seconds per phase

### Frontend

- `src/services/api.ts` — `API_BASE_URL` (default: `http://localhost:8080/api`)
- Vite config: `vite.config.ts`

## License

MIT
