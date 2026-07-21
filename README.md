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
- **Maven 3.6+** (install globally, or use the OS package manager)
- **MySQL 8+** (production only — SQLite is used for local dev automatically)

### Backend

Open a terminal and run:

```bash
cd backend

# Download dependencies + start the server (port 8080)
# Maven auto-downloads all required .jar files on first run
mvn spring-boot:run

# Or explicitly download dependencies first (one-time)
mvn dependency:resolve

# Build the jar
mvn clean package

# Run tests
mvn test
```

> **Note:** The dev profile uses SQLite by default — no database setup needed for local development. For MySQL, activate the `mysql` profile: `mvn spring-boot:run -Dspring-boot.run.profiles=mysql`

### Frontend

Open a **second** terminal and run:

```bash
cd frontend

# Install dependencies (first time only — creates node_modules/)
npm install

# Start dev server (port 5173)
npm run dev

# Production build (TypeScript check + Vite build)
npm run build

# Preview production build locally
npm run preview

# Lint (uses oxlint, not ESLint)
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
├── main.tsx                 # Entry point with BrowserRouter, Routes, providers
├── index.css                # Dark theme reset (VS Code-inspired)
├── i18n/
│   ├── index.ts             # i18next setup with English (en) and Myanmar (my)
│   └── locales/
│       ├── en.json          # English translations
│       └── my.json          # Myanmar (Burmese) translations
├── context/
│   ├── AuthContext.tsx      # Auth state (login, register, logout, JWT token)
│   ├── CompileContext.tsx   # Shared compile state (code, results, file management)
│   ├── ThemeContext.tsx     # Theme state (dark/light/system) with localStorage
│   └── LanguageContext.tsx  # Language state (en/my) wrapping i18next
├── components/
│   ├── Layout.tsx           # Shared layout: header + sidebar + Outlet for routes
│   ├── FileBrowser.tsx      # VS Code-like sidebar (folders, files, context menu)
│   ├── AstTree.tsx          # D3.js AST tree visualization (collapsible)
│   ├── TokenChart.tsx       # D3.js token bar chart + token flow visualization
│   ├── SemanticTree.tsx     # D3.js collapsible tree for symbol table
│   ├── PipelineScene.tsx    # Three.js 3D compilation pipeline visualization
│   ├── BinaryRain.tsx       # Canvas-based Matrix-style binary rain animation
│   ├── Skeleton.tsx         # Loading skeleton placeholder
│   ├── LoginModal.tsx       # Modal dialog for user login
│   ├── RegisterModal.tsx    # Modal dialog for user registration
│   ├── UserMenu.tsx         # Dropdown menu for user profile + logout
│   ├── Footer.tsx           # Footer component (currently unused)
│   └── ui/                  # shadcn/ui components
│       ├── button.tsx, card.tsx, dialog.tsx, dropdown-menu.tsx
│       ├── input.tsx, label.tsx, separator.tsx, tabs.tsx
├── pages/
│   ├── LandingPage.tsx      # Landing page with BinaryRain, typewriter, feature cards
│   ├── PipelinePage.tsx     # Full-page Three.js 3D pipeline visualization
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
- **`/`** — Landing page with BinaryRain animation, typewriter effect, feature cards
- **`/pipeline`** — Full-page Three.js 3D pipeline visualization
- **`/compiler`** — Code editor (Monaco) with terminal output at bottom
- **`/visualize/tokens`** — D3.js bar chart + token flow visualization
- **`/visualize/ast`** — D3.js collapsible AST tree
- **`/visualize/semantic`** — D3.js collapsible symbol table tree
- **`/visualize/bytecode`** — Raw bytecode display

### Components
- **Header**: Logo, "Compile & Execute" button with cancel support, "Visualize" button, auth buttons, language/theme toggles
- **Sidebar** (when logged in): VS Code-like FileBrowser with folders and files
- **Editor**: Monaco Editor with Java syntax highlighting
- **Terminal**: Output panel at bottom (like VS Code terminal)
- **Visualizations**: Full-screen D3.js charts/trees for each compilation phase
- **PipelineScene**: Three.js 3D scene showing the compilation pipeline as an animated flow
- **BinaryRain**: Canvas-based Matrix-style "digital rain" animation on the landing page
- **Skeleton**: Loading placeholder while compilation results are being fetched
- **LoginModal / RegisterModal**: Modal dialogs for JWT-based authentication
- **UserMenu**: Avatar dropdown with profile info and logout

### Theme & Internationalization

- **Theme**: Dark/light/system mode via `ThemeContext.tsx` — persisted in `localStorage` and applied as a `data-theme` attribute on `<html>`
- **Internationalization**: English and Myanmar (Burmese) via i18next (`LanguageContext.tsx` wrapping i18next). Switch languages in the header dropdown

## Configuration

### Backend (`application.properties`)

- `server.port` — backend port (default: 8080)
- `spring.profiles.active` — active profile (`dev` uses SQLite, `mysql` uses MySQL)
- `spring.datasource.*` — database connection
- `jwt.secret` — JWT signing secret (change in production!)
- `jwt.expiration` — token lifetime in ms (default: 24h)
- Compile timeout: 10 seconds per phase

### Frontend

- `src/services/api.ts` — `API_BASE_URL` (default: `http://localhost:8080/api`)
- Vite config: `vite.config.ts`

## License

MIT
