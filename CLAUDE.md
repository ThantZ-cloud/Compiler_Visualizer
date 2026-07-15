# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

## Commands

### Frontend (`frontend/`)
- `npm run dev` — Start Vite dev server (port 5173) — like running a local server for your HTML/JS
- `npm run build` — TypeScript check + Vite production build — like compiling Java before deploying
- `npm run lint` — Run oxlint (not ESLint — see below) — like a code style checker
- `npm run preview` — Preview production build

### Backend (`backend/`)
- `./mvnw spring-boot:run` — Start Spring Boot server (port 8080) — like running a Java application
- `./mvnw clean package` — Build jar — like `javac` + jar packaging
- `./mvnw test` — Run tests

### Full Stack
- Frontend runs on `http://localhost:5173`, backend on `http://localhost:8080`
- API calls from frontend hit `http://localhost:8080/api`
- CORS is configured in `CorsConfig.java` — update if ports change

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
├── App.tsx              # Main component — the root of the app
├── App.css              # Styling (like CSS for your HTML)
├── main.tsx             # Entry point — like public static void main()
├── context/
│   └── AuthContext.tsx   # Shared state for login/user info (like a global variable)
├── services/
│   └── api.ts           # API calls — like your HTTP client in Java
└── types/
    └── index.ts         # TypeScript interfaces — like Java classes for data shapes
```

**How the frontend works:**
1. `main.tsx` starts the app (like `main()` in Java)
2. `App.tsx` renders two panels: code editor (Monaco Editor) and visualization tabs
3. User writes Java code, clicks "Compile & Execute"
4. `api.ts` sends the code to the backend via HTTP POST
5. Backend returns compilation results (tokens, AST, bytecode, output)
6. Results are displayed in tabs (Tokens, AST, Semantic, Bytecode, Execution)

**Key React concepts in this project:**
- **`useState`** — like declaring a variable that React watches. When it changes, the UI re-renders.
- **`useCallback`** — like memoizing a method so it doesn't get recreated every render.
- **`useRef`** — like a instance variable that doesn't trigger re-renders.
- **Props** — like method parameters. Parent components pass data to children.
- **Components** — like Java classes, but for UI. Each returns JSX.

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
| Compile code | `POST /api/compile` | `compileService.compileAndExecute(sourceCode, stdin)` → returns full results |
| Save code | `POST /api/code/save` | `codeService.saveCode(userId, title, sourceCode)` |
| Get saved code | `GET /api/code/saved` | `codeService.getSavedCodes(userId)` → returns list |

**JWT Authentication (like a session token):**
1. User logs in → server generates a JWT token (a signed string)
2. Frontend stores token in `localStorage` (like a cookie but managed by JS)
3. Every API request includes `Authorization: Bearer <token>` header
4. Server validates the token on each request — no server-side session needed

### Key Design Decisions

- All `/api/compile/**` endpoints return the full response (tokens + AST + symbol table + bytecode + output) — the individual phase endpoints aren't optimized yet
- Tokenization and AST run in parallel (via `CompletableFuture`) — like running two threads simultaneously
- Results are cached (LRU, max 128 entries) — if you compile the same code twice, the second time is instant
- Compile timeout: 10 seconds per phase — prevents infinite loops from freezing the server
- Temp files are cleaned up after each compilation run

## When Modifying

- Frontend uses TypeScript strict mode — respect existing types in `src/types/index.ts`
- Backend DTOs use Lombok builders — add fields with `@Builder` pattern, not constructors
- All compilation output is ephemeral (temp files cleaned up after each run)
- The project uses oxlint, NOT ESLint — do not add `.eslintrc` or ESLint dependencies
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
