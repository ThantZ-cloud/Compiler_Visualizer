# Compiler Visualizer - Backend Architecture (ဗိသုကာလက်ရာပုံစံ)

## ဤဖိုင်အကြောင်း

ဤဖိုင်သည် Compiler Visualizer Project ၏ Backend (Spring Boot) ကို မြန်မာလို အသေးစိတ်ရှင်းပြထားသည်။
သင် JEE (Java Enterprise Edition) နှင့် MySQL ကို စတင်လေ့လာသူဖြစ်သောကြောင့် Java နှင့် ရင်းနှီးပြီးသား
အခြေခံများကို အသုံးပြု၍ JEE/Spring Boot အသစ်အဆန်းများကို ဆက်စပ်ရှင်းပြထားပါသည်။

---

## 1. Spring Boot ဆိုတာဘာလဲ?

Spring Boot ဆိုတာ **Java Web Application တွေကို မြန်မြန်ဆန်ဆန်ရေးနိုင်ဖို့ လုပ်ထားတဲ့ Framework** တစ်ခုပါ။

### JEE နဲ့ ဘာကွာလဲ?

| JEE (Servlet-based) | Spring Boot |
|---------------------|-------------|
| `web.xml` မှာ Servlet တွေကို manual register လုပ်ရ | Auto-configuration — Spring က အလိုအလျောက် setup လုပ်ပေး |
| `@WebServlet` နဲ့ Servlet class တွေရေးရ | `@RestController` တစ်ခုတည်းနဲ့ REST API ရေးလို့ရ |
| Dependency management ကို Maven မှာ manual လုပ်ရ | Spring Boot Starter တွေက auto-manage လုပ်ပေး |
| Server ကို manually deploy လုပ်ရ (Tomcat, JBoss) | Embedded Tomcat ပါတယ် — `java -jar` နဲ့တည့်တည့် run လို့ရ |

**J2SE နဲ့ နှိုင်းယှဉ်ရရင်:**
- J2SE က standard Java applications တွေအတွက် (သင်လက်ရှိသိထားတဲ့ Java)
- JEE/Spring Boot က **Web applications** အတွက် — HTTP requests တွေကို handle လုပ်ပြီး JSON/HTML တွေ response ပြန်ပေးတယ်
- Spring Boot က JEE ထက်ပိုပြီး **အလိုအလျောက်လုပ်ပေးတာများတယ်** (Convention over Configuration)

### ဒီ Project မှာ Spring Boot က ဘယ်လိုအလုပ်လုပ်လဲ?

```
Browser (React) 
    │
    ▼  HTTP Request (JSON)
┌─────────────────────────────────────┐
│         Spring Boot Server          │
│  (port 8080, embedded Tomcat)       │
│                                     │
│  ┌──────────┐  ┌──────────┐        │
│  │Controller │→│  Service │        │
│  │(REST API) │  │(Business)│        │
│  └──────────┘  └────┬─────┘        │
│                     │              │
│              ┌──────▼──────┐       │
│              │  Repository  │       │
│              │  (Database)  │       │
│              └──────────────┘       │
│                                     │
│  ┌─────────────────────────┐        │
│  │   Security (JWT Auth)   │        │
│  └─────────────────────────┘        │
└─────────────────────────────────────┘
```

**ဒါက စားသောက်ဆိုင်တစ်ဆိုင်နဲ့ တင်စားကြည့်ရအောင်:**

- **Controller** = စားပွဲထိုး — ဧည့်သည်ဆီက order ကိုလက်ခံတယ်၊ မီးဖိုချောင်ကိုပို့တယ်၊ ပြန်ယူလာပေးတယ်
- **Service** = စားဖိုမှူး — order ကိုလက်ခံပြီး တကယ်ချက်ပြုတ်တယ် (business logic)
- **Repository** = ရေခဲသေတ္တာ/စားစရာဗီရို — ပစ္စည်းတွေကို သိမ်းတယ် (Database)

---

## 2. Project Structure — Package တွေက ဘာတွေလဲ?

```
backend/src/main/java/com/compilervisualizer/
│
├── CompilerVisualizerApplication.java    ← App entry point (main method)
│
├── config/                               ← Spring configuration တွေ
│   ├── SecurityConfig.java               ← Spring Security setup
│   └── GlobalExceptionHandler.java       ← Error handling
│
├── controller/                           ← REST API endpoints
│   ├── AuthController.java               ← /api/auth/* (login/register)
│   ├── CodeController.java               ← /api/code/* (save/load code)
│   ├── CompileController.java            ← /api/compile/* (compile code)
│   └── ExecuteController.java            ← /api/execute (run code)
│
├── dto/                                  ← Data Transfer Objects
│   ├── AuthResponse.java                 ← Login/register response
│   ├── CompileRequest.java               ← Compile request body
│   ├── CompileResponse.java              ← Compile result
│   ├── LoginRequest.java                 ← Login request body
│   ├── RegisterRequest.java              ← Register request body
│   ├── SaveCodeRequest.java              ← Save code request
│   ├── SavedCodeResponse.java            ← Saved code response
│   └── TokenDto.java                     ← Token data
│
├── exception/                            ← Custom exceptions
│   ├── CompilationException.java
│   └── NotFoundException.java
│
├── model/                                ← Database entities
│   ├── User.java                         ← users table
│   └── SavedCode.java                    ← saved_code table
│
├── repository/                           ← Database access
│   ├── UserRepository.java
│   └── SavedCodeRepository.java
│
├── security/                             ← JWT & Auth
│   ├── CustomUserDetailsService.java
│   ├── JwtAuthenticationFilter.java
│   └── JwtTokenProvider.java
│
└── service/                              ← Business logic
    ├── AuthService.java
    ├── CodeService.java
    ├── CompileService.java
    ├── JavaLexer.java
    ├── AstSerializer.java
    ├── SymbolTableBuilder.java
    └── RateLimiter.java
```

### Layer တစ်ခုချင်းစီကို ကြည့်ရအောင်:

#### a) Controller Layer (ထိန်းချုပ်သူအလွှာ)

Controller က HTTP Request တွေကို လက်ခံပြီး Response ပြန်ပေးတယ်။
JEE Servlet (`@WebServlet`) နဲ့တူပေမယ့် ပိုရှင်းပါတယ်။

```java
// JEE Servlet နည်း
@WebServlet("/api/auth/login")
public class LoginServlet extends HttpServlet {
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
        // Read request body manually
        // Parse JSON manually
        // Call service
        // Write JSON response manually
    }
}

// Spring Boot နည်း (ဒီ project မှာသုံးထားတာ)
@RestController          // ← ဒါက Spring ကို "ဒါ REST controller" လို့ပြောတာ
@RequestMapping("/api/auth")  // ← URL base path
public class AuthController {
    
    @PostMapping("/login")     // ← POST /api/auth/login ကို handle လုပ်
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        // Spring က request body ကို JSON → Java object (LoginRequest) အလိုအလျောက် convert လုပ်ပေး
        // Spring က response ကို Java object → JSON အလိုအလျောက် convert လုပ်ပေး
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }
}
```

**အဓိက Annotations တွေ:**
- `@RestController` — ဒီ class က REST API ဖြစ်တယ်လို့ Spring ကိုပြောတာ
- `@RequestMapping("/api/auth")` — URL prefix
- `@PostMapping("/login")` — POST method အတွက်
- `@GetMapping("/me")` — GET method အတွက်
- `@RequestBody` — HTTP request body ကို Java object ပြောင်းပေးတယ်
- `@Valid` — Validation လုပ်ပေးတယ် (field တွေကို စစ်ပေးတယ်)

#### b) Service Layer (ဝန်ဆောင်မှုအလွှာ)

Service က **Business Logic** တွေကို လုပ်ဆောင်တယ်။ Controller က request ကိုလက်ခံပြီး
Service ကိုခေါ်တယ်။ Service က data တွေကို process လုပ်ပြီး Repository ကိုခေါ်တယ်။

```java
@Service   // ← ဒါက Spring ကို "ဒါ Service class" လို့ပြောတာ
@RequiredArgsConstructor  // ← Lombok: constructor အလိုအလျောက်ထုတ်ပေး
public class AuthService {
    
    // Spring က ဒါတွေကို auto inject လုပ်ပေးတယ် (Dependency Injection)
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;
    
    public AuthResponse register(RegisterRequest request) {
        // 1. Username/email ရှိပြီးသားလား စစ်
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new RuntimeException("Username already exists");
        }
        
        // 2. User entity အသစ်ဆောက်
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .passwordHash(passwordEncoder.encode(request.getPassword()))  // password ကို encrypt လုပ်
                .build();
        
        // 3. DB ထဲသိမ်း
        userRepository.save(user);
        
        // 4. JWT token ထုတ်
        String token = tokenProvider.generateToken(user.getUsername());
        
        // 5. Response ပြန်
        return AuthResponse.builder()
                .token(token)
                .tokenType("Bearer")
                .userId(user.getId())
                .build();
    }
}
```

#### c) Repository Layer (ဒေတာအလွှာ)

Repository က **Database ကို ဆက်သွယ်တဲ့အလွှာ**။
JEE မှာ JDBC ကိုသုံးပြီး SQL query တွေရေးရပေမယ့် Spring Data JPA က
အလိုအလျောက် SQL တွေထုတ်ပေးတယ်။

```java
// JEE JDBC နည်း — SQL တွေ ကိုယ်တိုင်ရေးရ
public User findByUsername(String username) {
    Connection conn = getConnection();
    PreparedStatement ps = conn.prepareStatement("SELECT * FROM users WHERE username = ?");
    ps.setString(1, username);
    ResultSet rs = ps.executeQuery();
    // ResultSet ကနေ data တွေကို manually extract လုပ်ရ
    User user = new User();
    user.setId(rs.getLong("id"));
    // ...
    return user;
}

// Spring Data JPA နည်း (ဒီ project မှာသုံးထားတာ) — method name လောက်ပဲပေးရ
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);  // ← ဒီ method name ကို ကြည့်ပြီး Spring က SQL auto generate လုပ်ပေး
}
```

**Repository Method Naming Convention (အလွန်အရေးကြီး):**
Spring Data JPA က method name တွေကို parse လုပ်ပြီး SQL အလိုအလျောက်ထုတ်ပေးတယ်။

| Method Name | Generated SQL (အကြမ်းဖျင်း) |
|-------------|---------------------------|
| `findByUsername(String name)` | `WHERE username = ?` |
| `findByEmail(String email)` | `WHERE email = ?` |
| `existsByUsername(String name)` | `SELECT COUNT(*) WHERE username = ?` |
| `findByUserIdOrderByCreatedAtDesc(Long id)` | `WHERE user_id = ? ORDER BY created_at DESC` |
| `findByUserIdAndTitleContainingIgnoreCase(Long id, String title)` | `WHERE user_id = ? AND UPPER(title) LIKE UPPER(?)` |

---

## 3. Dependency Injection (DI) ဆိုတာဘာလဲ?

Dependency Injection က Spring Boot ရဲ့ **အဓိက concept** တစ်ခုပါ။

### J2SE မှာ သင်သိထားတဲ့အတိုင်း:

```java
// J2SE — သင်ကိုယ်တိုင် object တွေကို create လုပ်ရ
public class AuthController {
    private AuthService authService;
    private UserRepository userRepository;
    
    public AuthController() {
        // ကိုယ်တိုင် create လုပ်ရ
        this.authService = new AuthService();  // tightly coupled
        this.userRepository = new UserRepository();
    }
}
```

### Spring Boot DI:

```java
// Spring Boot — Spring က auto inject လုပ်ပေး
@RestController
@RequiredArgsConstructor  // ← Lombok: constructor auto generate
public class AuthController {
    
    private final AuthService authService;    // ← final field
    private final UserRepository userRepository;
    
    // Spring က ဒီ constructor ကနေ object တွေကို auto ဖြည့်ပေးတယ်
    // ကိုယ်တိုင် new လုပ်စရာမလိုဘူး
}
```

**Dependency Injection ရဲ့ အားသာချက်:**
1. **Loose coupling** — class တွေက တစ်ခုနဲ့တစ်ခု သီးသန့်ရှိတယ်
2. **Testing လွယ်တယ်** — Mock objects တွေနဲ့ test လုပ်လို့ရတယ်
3. **Spring က object lifecycle ကို manage လုပ်ပေးတယ်**

---

## 4. Annotations အကျဉ်းချုပ်

| Annotation | ဘာအတွက်လဲ? | JEE/J2SE နဲ့ နှိုင်းယှဉ် |
|------------|------------|----------------------|
| `@SpringBootApplication` | App ကို Spring Boot app ဖြစ်ကြောင်းပြော | `main()` method အတွက် |
| `@RestController` | Class က REST API controller | `@WebServlet` နဲ့တူ |
| `@Service` | Class က business logic service | Service class တစ်ခု |
| `@Repository` | Class က data access layer | DAO pattern နဲ့တူ |
| `@GetMapping` | GET request အတွက် | `doGet()` method |
| `@PostMapping` | POST request အတွက် | `doPost()` method |
| `@PutMapping` | PUT request အတွက် | — |
| `@DeleteMapping` | DELETE request အတွက် | — |
| `@RequestBody` | Request body → Java object | JSON parsing လုပ်စရာမလို |
| `@PathVariable` | URL ထဲက variable ယူ | `req.getParameter()` |
| `@Valid` | Validation လုပ် | Manual validation လုပ်စရာမလို |
| `@RequiredArgsConstructor` | Constructor auto generate (Lombok) | — |

---

## 5. Compilation Pipeline (CompileService) — အဓိက Business Logic

CompileService က **Java code ကို compile လုပ်ပြီး pipeline တစ်ဆင့်ချင်းစီရဲ့ result တွေကို ထုတ်ပေးတယ်။**

```
Source Code (User ရေးလိုက်တဲ့ Java code)
    │
    ▼
┌─────────────────────┐
│ 1. Tokenization     │  ← JavaLexer က code ကို token တွေခွဲ
│    (Lexing)         │     "int x = 5;" → [KEYWORD:int] [IDENTIFIER:x] [OPERATOR:=] [LITERAL:5] [SEPARATOR:;]
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ 2. AST Generation   │  ← JavaParser က code ကို tree structure ပြောင်း
│    (Parsing)        │     သစ်ပင်ပုံစံ (Root → Class → Method → Statements)
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ 3. Symbol Table     │  ← Class/method/field တွေရဲ့ declaration တွေကို စုစည်း
│    (Semantic)       │     "ဒီ project မှာ User class ရှိတယ်၊ သူ့မှာ id field ရှိတယ်" ဆိုတာမျိုး
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ 4. Bytecode Gen     │  ← javac (Java Compiler) က bytecode ထုတ်
│                     │     javap နဲ့ disassemble လုပ် → human-readable bytecode
└─────────┬───────────┘
          │
┌─────────▼───────────┐
│ 5. Execution        │  ← Compiled class file ကို run → output ကို capture
│                     │     System.out.println() တွေရဲ့ output
└─────────────────────┘
```

### ဒီ Project ရဲ့ အထူးအဆန်း — Parallel Execution:

Phase 1 (Tokenization) နဲ့ Phase 2 (AST) ကို **တစ်ပြိုင်နက်တည်း (parallel)** run ထားတယ်။

```java
// Thread 1: Tokenization
CompletableFuture<List<TokenDto>> tokensFuture = CompletableFuture.supplyAsync(() -> {
    JavaLexer lexer = new JavaLexer(sourceCode);
    return lexer.tokenize();
}, compileExecutor);

// Thread 2: AST Generation (တစ်ပြိုင်နက်တည်း run)
CompletableFuture<CompilationUnit> astFuture = CompletableFuture.supplyAsync(() -> {
    return StaticJavaParser.parse(sourceCode);
}, compileExecutor);

// Result တွေကို စောင့်
List<TokenDto> tokens = tokensFuture.get();
CompilationUnit cu = astFuture.get();
```

**J2SE နဲ့ ဆက်စပ်မှု:** ဒါက Java multithreading ကို Spring Boot မှာ CompletableFuture နဲ့ အသုံးပြုထားတာပါ။

### Caching စနစ်:

```java
private final ConcurrentHashMap<String, CompileResponse> cache = new ConcurrentHashMap<>();

public CompileResponse compileAndExecute(String sourceCode, String stdinInput) {
    String cacheKey = sourceCode + "\0" + (stdinInput != null ? stdinInput : "");
    CompileResponse cached = cache.get(cacheKey);
    if (cached != null) {
        return cached;  // အတူတူ code ဆို cache ကနေ ပြန် (မြန်တယ်)
    }
    // ... compile လုပ် ...
    cache.put(cacheKey, response);  // Result ကို cache ထဲသိမ်း
}
```

ကိုယ်တိုင်ရေးထားတဲ့ LRU-style cache (အကြီးဆုံး 128 entry) သုံးထားတယ်။
တူညီတဲ့ code ကို ထပ် compile လုပ်ရင် cache ကနေ ချက်ချင်းပြန်ပေးတယ်။

### Temp File Cleanup:

Compile လုပ်ပြီးတာနဲ့ temporary file တွေကို **ချက်ချင်းရှင်းပေးတယ်**။

```java
finally {
    cleanupTempDir(tempDir);  // temp files တွေကို ရှင်းပစ်
}
```

---

## 6. Exception Handling (GlobalExceptionHandler)

Spring Boot မှာ exception တွေကို **တစ်နေရာတည်းမှာ handle လုပ်လို့ရတယ်။**

```java
@RestControllerAdvice  // ← Global exception handler
public class GlobalExceptionHandler {
    
    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NotFoundException ex) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
            .body(buildError(HttpStatus.NOT_FOUND, ex.getMessage()));
    }
    
    @ExceptionHandler(BadCredentialsException.class)
    public ResponseEntity<Map<String, Object>> handleBadCredentials(BadCredentialsException ex) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(buildError(HttpStatus.UNAUTHORIZED, "Invalid username or password"));
    }
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntime(RuntimeException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(buildError(HttpStatus.INTERNAL_SERVER_ERROR, "An internal error occurred"));
    }
}
```

**JEE ကျရင်:** Servlet တစ်ခုချင်းစီမှာ try-catch လုပ်ရတယ်။
Spring Boot မှာ `@RestControllerAdvice` တစ်ခုတည်းနဲ့ တစ်နေရာတည်းမှာ handle လုပ်လို့ရတယ်။

---

## 7. Rate Limiter (တစ်မိနစ်ကို compile အကြိမ်ရေ ကန့်သတ်ချက်)

```java
@Service
public class RateLimiter {
    private static final int MAX_REQUESTS = 10;      // တစ်မိနစ် ၁၀ ကြိမ်ပဲ compile လုပ်ခွင့်
    private static final long WINDOW_MS = 60_000;     // 1 minute window
    
    private final ConcurrentHashMap<String, long[]> requests = new ConcurrentHashMap<>();
    //                         client IP      timestamp array
    
    public boolean tryAcquire(String key) {
        // Client IP အတွက် request timestamps တွေကို သိမ်း
        // တစ်မိနစ်အတွင်း ၁၀ ကြိမ်ထက်ပိုရင် false ပြန်
    }
}
```

---

## နောက်ဖိုင်များ

ဤဖိုင်က Backend Architecture အကြောင်းဖြစ်သည်။
ဆက်လက်လေ့လာရန်:

- **detailInBurmese_2_Database.md** — Database layer (MySQL, JPA, Entities, Repositories)
- **detailInBurmese_3_Security.md** — Security layer (JWT, Spring Security, Authentication)
