# Compiler Visualizer - Security Layer (JWT + Spring Security)

## ဤဖိုင်အကြောင်း

ဤဖိုင်သည် ဒီ Project ရဲ့ Security ပိုင်း — JWT Authentication, Spring Security Configuration,
Authentication Flow နဲ့ Filter Chain တွေအကြောင်းကို မြန်မာလို အသေးစိတ်ရှင်းပြထားပါတယ်။

---

## 1. Authentication ဆိုတာဘာလဲ? (အခြေခံအကြောင်း)

Authentication ဆိုတာ **"သင်ဘယ်သူလဲ"** ဆိုတာကို အတည်ပြုတာပါ။

### ရိုးရာ Session-based Authentication (JEE နည်း):

```
1. User → Login (username + password)
2. Server → Session ID တစ်ခုဆောက် → DB/memory မှာသိမ်း
3. Server → Browser ကို Cookie (JSESSIONID) ပြန်
4. Browser → နောက် request တိုင်းမှာ Cookie ပါပို့
5. Server → Cookie ထဲက Session ID ကို DB မှာစစ် → User ကိုသိ
```

**အားနည်းချက်:** Server က session data ကို သိမ်းထားရတယ် (stateful)။
Server အများကြီးရှိရင် session တွေကို share လုပ်ရခက်တယ်။

### JWT-based Authentication (ဒီ Project မှာသုံးထားတာ):

```
1. User → Login (username + password)
2. Server → JWT token တစ်ခုဆောက် → **DB မှာမသိမ်းဘူး**
3. Server → Browser ကို JWT token ပြန်
4. Browser → နောက် request တိုင်းမှာ Authorization header နဲ့ JWT ပါပို့
5. Server → JWT ကို verify (signature စစ်) → User ကိုသိ → **DB ကိုမေးစရာမလို**
```

**အားသာချက်:** Stateless — Server က session သိမ်းစရာမလို။
Server အများကြီးရှိရင်လည်း JWT ကိုယ်တိုင်က data တွေသယ်ထားလို့ share လုပ်စရာမလို။

---

## 2. JWT ဆိုတာဘာလဲ?

JWT (JSON Web Token) ဆိုတာ **သုံးပိုင်းပါတဲ့ string** တစ်ခုပါ။

```
header.payload.signature
```

### JWT တစ်ခုရဲ့ ပုံစံ:

```
eyJhbGciOiJIUzI1NiJ9.           ← Header (base64 encoded)
eyJzdWIiOiJ0aGFudCJ9.           ← Payload (base64 encoded)
dGhpcyBpcyB0aGUgc2lnbmF0dXJl   ← Signature (secret key နဲ့ လက်မှတ်ထိုး)
```

### JWT ရဲ့ အစိတ်အပိုင်းတွေ:

```
Header:
{
  "alg": "HS256",        ← Algorithm (HMAC-SHA256)
  "typ": "JWT"
}

Payload:
{
  "sub": "thant",        ← Subject (ဒီမှာ username)
  "iat": 1700000000,     ← Issued At
  "exp": 1700086400      ← Expiration
}

Signature:
HMAC-SHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secretKey
)
```

### JWT ရဲ့ အရေးကြီးဆုံးအချက်:

**JWT ကို ဘယ်သူမဆို ဖတ်လို့ရတယ်** (base64 decode လုပ်ရုံနဲ့)။
ဒါပေမယ့် **ပြင်လို့မရဘူး** — ပြင်ရင် signature က မကိုက်တော့ဘူး။

ဒါကြောင့်:
- JWT ထဲမှာ **password လို sensitive data တွေ မထည့်ရဘူး**
- JWT ရဲ့ signature က data integrity ကို ကာကွယ်တယ်

---

## 3. JWT Token Provider (JwtTokenProvider.java)

```java
@Component  // ← Spring component (auto-detect လုပ်ခံရ)
public class JwtTokenProvider {

    @Value("${jwt.secret}")       // ← application.properties ကနေယူ
    private String jwtSecret;
    
    @Value("${jwt.expiration}")   // ← 86400000ms = 24 hours
    private long jwtExpiration;

    // Secret key ကို HMAC key အဖြစ်ပြောင်း
    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(jwtSecret.getBytes());
    }

    // Token ထုတ်တယ် (Authentication object ကနေ)
    public String generateToken(Authentication authentication) {
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpiration);
        
        return Jwts.builder()
                .subject(userDetails.getUsername())   // ← "sub": username
                .issuedAt(now)                        // ← "iat": ထုတ်တဲ့အချိန်
                .expiration(expiryDate)               // ← "exp": သက်တမ်းကုန်ဆုံး
                .signWith(getSigningKey())            // ← Secret key နဲ့လက်မှတ်ထိုး
                .compact();                           // ← String အဖြစ်ထုတ်
    }

    // Token ကနေ username ကိုထုတ်
    public String getUsernameFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();  // ← "sub" field ကနေ username ယူ
    }

    // Token ကို Validate လုပ် (သက်တမ်းကုန်ရင် false)
    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(getSigningKey())
                    .build()
                    .parseSignedClaims(token);
            return true;  // Signature မှန်ရင် → true
        } catch (JwtException | IllegalArgumentException e) {
            return false; // Signature မှားရင် → false
        }
    }
}
```

### @Value ဆိုတာဘာလဲ?

`@Value("${jwt.secret}")` က **application.properties** ထဲက value ကိုထုတ်ယူတယ်။

```properties
# application.properties
jwt.secret=${JWT_SECRET:dev-only-secret-change-in-production-32chars}
jwt.expiration=86400000
```

- `JWT_SECRET` environment variable ရှိရင် အဲဒါသုံး
- မရှိရင် "dev-only-secret-change-in-production-32chars" ဆိုတဲ့ default သုံး

### JWT Library (jjwt) ကိုသုံးထားတယ်:

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <scope>runtime</scope>
</dependency>
```

---

## 4. JWT Authentication Filter (JwtAuthenticationFilter.java)

Filter ဆိုတာ **Request တွေကို Controller မရောက်ခင် ကြိုဖမ်းတဲ့အလွှာ**ပါ။

### ဘယ်လိုအလုပ်လုပ်လဲ?

```
Browser Request (with JWT in Authorization header)
    │
    ▼
┌──────────────────────────────────────────┐
│          JwtAuthenticationFilter         │
│                                          │
│  1. Authorization header ကနေ token ထုတ်│
│     "Bearer eyJhbGci..." → "eyJhbGci..." │
│                                          │
│  2. Token ကို validate လုပ်             │
│     JwtTokenProvider.validateToken(token) │
│                                          │
│  3. Token ကနေ username ထုတ်             │
│     "thant"                              │
│                                          │
│  4. UserDetailsService နဲ့ user info ယူ │
│     loadUserByUsername("thant")          │
│                                          │
│  5. SecurityContext ထဲမှာ auth set လုပ် │
│     "ဒီ request က thant ပါ"             │
│                                          │
└──────────────────┬───────────────────────┘
                   │
                   ▼
            Controller ဆီဆက်သွား
            (Authentication object ပါသွားတယ်)
```

### Filter Code အသေးစိတ်:

```java
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    // OncePerRequestFilter → request တစ်ခုအတွက် တစ်ခါပဲ run မယ်

    private final JwtTokenProvider tokenProvider;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain) 
            throws ServletException, IOException {
        
        // Step 1: Request ထဲက token ကိုထုတ်
        String token = getTokenFromRequest(request);
        
        // Step 2: Token ရှိရင် validate လုပ်
        if (StringUtils.hasText(token) && tokenProvider.validateToken(token)) {
            
            // Step 3: Token ကနေ username ထုတ်
            String username = tokenProvider.getUsernameFromToken(token);
            
            // Step 4: User details ကို DB ကနေယူ
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            
            // Step 5: Authentication object ဆောက်
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,                        // credentials
                            userDetails.getAuthorities() // roles (USER)
                    );
            
            authentication.setDetails(
                new WebAuthenticationDetailsSource().buildDetails(request)
            );
            
            // Step 6: SecurityContext ထဲမှာ set
            SecurityContextHolder.getContext().setAuthentication(authentication);
            // → ဒီကနေမှ Controller က Authentication parameter ကိုလက်ခံနိုင်
        }
        
        // Step 7: နောက် filter ကိုဆက်လွှတ်
        filterChain.doFilter(request, response);
    }

    // Authorization header ကနေ token ကိုထုတ်
    private String getTokenFromRequest(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        
        // "Bearer eyJhbGci..." → "eyJhbGci..."
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);  // "Bearer " ဆိုတဲ့ ၇ လုံးကိုဖြတ်
        }
        
        return null;
    }
}
```

### SecurityContextHolder ဆိုတာဘာလဲ?

SecurityContextHolder က **လက်ရှိ request ရဲ့ security information ကို သိမ်းတဲ့နေရာ**ပါ။

```java
// Controller ထဲမှာ ဒီလိုယူလို့ရတယ်
Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
String username = authentication.getName();  // "thant"
```

Spring က **method parameter** အနေနဲ့လည်း inject လုပ်ပေးတယ်:

```java
@GetMapping("/me")
public ResponseEntity<AuthResponse> getCurrentUser(Authentication authentication) {
    String username = authentication.getName();  // ← Spring က auto inject လုပ်ပေး
    // ...
}
```

---

## 5. UserDetailsService (CustomUserDetailsService.java)

UserDetailsService က **username နဲ့ DB ကနေ user info ယူပြီး Spring Security အတွက် UserDetails object ပြောင်းပေးတယ်။**

```java
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) 
            throws UsernameNotFoundException {
        
        // DB ကနေ user ကိုရှာ
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException(
                    "User not found with username: " + username));
        
        // Spring Security အတွက် UserDetails object ဆောက်
        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getUsername())
                .password(user.getPasswordHash())    // ← Encrypted password
                .authorities("USER")                  // ← Role: USER
                .accountExpired(false)
                .accountLocked(false)
                .credentialsExpired(false)
                .disabled(false)
                .build();
    }
}
```

**JEE နဲ့နှိုင်းယှဉ်:**
- JEE မှာ `UserPrincipal` ကိုယ်တိုင်ဆောက်ရ
- Spring Security က `UserDetails` interface ကိုပေးထားပြီး
- `UserDetailsService` ကိုသာ implement လုပ်ရ

---

## 6. Spring Security Configuration (SecurityConfig.java)

SecurityConfig က **ဘယ် URL တွေကို လုံခြုံရေးခံရမလဲ, ဘယ် filter တွေသုံးမလဲ** ဆိုတာကို သတ်မှတ်တယ်။

```java
@Configuration
@EnableWebSecurity  // ← Spring Security ကို enable လုပ်
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // 1. CORS — Frontend (port 5173) ကနေ API ကိုခေါ်ခွင့်
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            
            // 2. CSRF — REST API အတွက် disable (stateless)
            .csrf(csrf -> csrf.disable())
            
            // 3. Session — STATELESS (no session, JWT ကိုပဲသုံး)
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            
            // 4. URL Authorization
            .authorizeHttpRequests(auth -> auth
                // /api/auth/** — ဘယ်သူမဆိုသုံးခွင့် (login/register)
                .requestMatchers("/api/auth/**").permitAll()
                
                // /api/compile, /api/execute — ဘယ်သူမဆိုသုံးခွင့်
                .requestMatchers("/api/compile/**", "/api/execute/**").permitAll()
                
                // အခြားအကုန် → Login ဝင်ထားမှသုံးခွင့်
                .anyRequest().authenticated()
            )
            
            // 5. JWT Filter ကို UsernamePasswordAuthenticationFilter ရှေ့မှာထည့်
            .addFilterBefore(jwtAuthenticationFilter, 
                UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        
        // Frontend URLs — ဒီကနေခေါ်တဲ့ request တွေကိုပဲ accept လုပ်
        config.setAllowedOrigins(Arrays.asList(
            "http://localhost:5173",   // Vite dev server
            "http://127.0.0.1:5173",
            "http://localhost:3000",   // Alternative port
            "http://127.0.0.1:3000"
        ));
        
        // HTTP methods
        config.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS"
        ));
        
        // Headers
        config.setAllowedHeaders(Arrays.asList(
            "Authorization", "Content-Type", "Accept"
        ));
        
        config.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public AuthenticationManager authenticationManager(
            AuthenticationConfiguration authenticationConfiguration) throws Exception {
        return authenticationConfiguration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();  // ← Password တွေကို BCrypt နဲ့ encrypt လုပ်
    }
}
```

### Security Configuration တစ်ခုချင်းစီကို ရှင်းပြခြင်း:

#### a) CORS (Cross-Origin Resource Sharing)

CORS ဆိုတာ **Frontend (port 5173) ကနေ Backend (port 8080) ကို API ခေါ်ခွင့်ပေးတာ**ပါ။

```
Browser (http://localhost:5173)
    │
    ├── ❌ Same origin: http://localhost:5173/api → OK
    │
    └── ⚠️ Cross origin: http://localhost:8080/api → BLOCKED by browser
         (port တူမှမတူတာ)
         
CORS config မရှိရင် browser က block လုပ်တယ်
CORS config ရှိရင် browser က allow လုပ်တယ်
```

#### b) CSRF (Cross-Site Request Forgery)

CSRF ကို REST API အတွက် **disable** လုပ်ထားတယ်။
ဘာလို့လဲဆိုတော့:
- CSRF က session-based auth အတွက်ပဲလိုတယ်
- JWT token ကို header ကနေပို့တယ် (cookie ကနေမဟုတ်ဘူး)
- ဒါကြောင့် CSRF attack က JWT-based API ကို မထိခိုက်ဘူး

#### c) Session Creation Policy: STATELESS

ဒါက Spring ကို **session မသုံးပါဘူး**လို့ပြောတာ။
- JWT ကိုပဲသုံးမယ်
- HTTP session ကို create မလုပ်ဘူး
- Request တစ်ခုချင်းစီက independent ဖြစ်တယ်

#### d) Password Encoder: BCrypt

BCrypt က **password တွေကို hash (encrypt) လုပ်တဲ့ algorithm**ပါ။

```java
// Password သိမ်းတဲ့အခါ:
String hash = passwordEncoder.encode("myPassword123");
// → $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy

// Password စစ်တဲ့အခါ:
passwordEncoder.matches("myPassword123", hash);  // → true
passwordEncoder.matches("wrongPassword", hash);  // → false
```

**ဘာလို့ BCrypt သုံးတာလဲ?**
- **One-way hash** — encrypt လုပ်လို့ရတယ်, ပြန် decrypt လုပ်လို့မရဘူး
- **Salt** — တူညီတဲ့ password တွေကိုတောင် hash မတူအောင်လုပ်ပေးတယ်
- **Slow** — တမင်တရာ နှေးအောင်လုပ်ထားတယ် (brute force ကိုကာကွယ်ဖို့)

---

## 7. Authentication Flow (အပြည့်အစုံ)

### Register (စာရင်းသွင်း):

```
Client                              Server
  │                                    │
  │  POST /api/auth/register           │
  │  {                                 │
  │    "username": "thant",           │
  │    "email": "thant@example.com",  │
  │    "password": "MyPass123"        │
  │  }                                │
  │──────────────────────────────────▶│
  │                                    │
  │                        1. Validation စစ်
  │                           @Valid @RequestBody
  │                           → @NotBlank, @Size, @Email, @Pattern
  │                                    │
  │                        2. Username/email ရှိပြီးလား စစ်
  │                           userRepository.existsByUsername("thant")
  │                           userRepository.existsByEmail("thant@example.com")
  │                                    │
  │                        3. Password ကို BCrypt နဲ့ encrypt
  │                           passwordEncoder.encode("MyPass123")
  │                           → "$2a$10$..." (hash string)
  │                                    │
  │                        4. User entity ဆောက်
  │                           User.builder()
  │                             .username("thant")
  │                             .email("thant@example.com")
  │                             .passwordHash("$2a$10$...")  ← hash ကိုပဲသိမ်း
  │                             .build()
  │                                    │
  │                        5. DB ထဲသိမ်း
  │                           userRepository.save(user)
  │                           → INSERT INTO users ...
  │                                    │
  │                        6. JWT token ထုတ်
  │                           tokenProvider.generateToken("thant")
  │                           → "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0aGFudCJ9..."
  │                                    │
  │  ← 200 OK                          │
  │  {                                 │
  │    "token": "eyJhbGci...",        │
  │    "tokenType": "Bearer",          │
  │    "userId": 1,                    │
  │    "username": "thant",           │
  │    "email": "thant@example.com"   │
  │  }                                │
```

### Login (အကောင့်ဝင်):

```
Client                              Server
  │                                    │
  │  POST /api/auth/login              │
  │  {                                 │
  │    "username": "thant",           │
  │    "password": "MyPass123"        │
  │  }                                │
  │──────────────────────────────────▶│
  │                                    │
  │                        1. Authentication Manager ကို ခေါ်
  │                           authenticationManager.authenticate(
  │                             new UsernamePasswordAuthenticationToken(
  │                               "thant", "MyPass123"))
  │                                    │
  │                        2. Spring Security က:
  │                           a. CustomUserDetailsService.loadUserByUsername("thant")
  │                              → DB ကနေ user info ယူ
  │                           b. Password စစ်
  │                              passwordEncoder.matches("MyPass123", storedHash)
  │                              → မှန်ရင် OK, မှားရင် BadCredentialsException
  │                                    │
  │                        3. JWT token ထုတ်
  │                           tokenProvider.generateToken(authentication)
  │                                    │
  │  ← 200 OK                          │
  │  {                                 │
  │    "token": "eyJhbGci...",        │
  │    "tokenType": "Bearer",          │
  │    "userId": 1,                    │
  │    "username": "thant",           │
  │    "email": "thant@example.com"   │
  │  }                                │
```

### Secured API Call (Login ဝင်ထားမှ သုံးလို့ရတဲ့ API):

```
Client                              Server
  │                                    │
  │  GET /api/code/saved               │
  │  Authorization: Bearer eyJhbGci... │
  │──────────────────────────────────▶│
  │                                    │
  │  JwtAuthenticationFilter:          │
  │  1. Header ကနေ token ထုတ်         │
  │     "Bearer eyJhbGci..."           │
  │     → "eyJhbGci..."               │
  │                                    │
  │  2. Token validate                 │
  │     tokenProvider.validateToken("eyJhbGci...")
  │     → Signature စစ် → OK          │
  │                                    │
  │  3. Username ထုတ်                  │
  │     tokenProvider.getUsernameFromToken("eyJhbGci...")
  │     → "thant"                      │
  │                                    │
  │  4. UserDetails ယူ                │
  │     userDetailsService.loadUserByUsername("thant")
  │                                    │
  │  5. SecurityContext ထဲမှာ set     │
  │     SecurityContextHolder          │
  │       .getContext()                │
  │       .setAuthentication(...)     │
  │                                    │
  │  CodeController:                   │
  │  authentication.getName() → "thant"
  │  codeService.getSavedCodes("thant")
  │                                    │
  │  ← 200 OK                          │
  │  [                                │
  │    { id: 1, title: "Hello.java",  │
  │      sourceCode: "..." },         │
  │    ...                            │
  │  ]                                │
```

---

## 8. Security Layers Summary

```
Request
  │
  ├── CORS Filter (Spring Security)
  │     └── Frontend origin (port 5173) ကဟုတ်ရဲ့လားစစ်
  │
  ├── CSRF Filter (Disabled)
  │     └── REST API အတွက် disable
  │
  ├── JwtAuthenticationFilter
  │     ├── Token ပါလားစစ်
  │     ├── Token မှန်ရဲ့လားစစ် (signature)
  │     ├── Username ထုတ်
  │     └── SecurityContext ထဲမှာ set
  │
  ├── Authorization Filter
  │     ├── /api/auth/** → အကုန်ခွင့်
  │     ├── /api/compile/** → အကုန်ခွင့်
  │     └── အခြား → Authentication ရှိမှခွင့်
  │
  └── Controller
        └── Authentication parameter ကိုလက်ခံ
```

---

## 9. JEE မှာ ဒါတွေကို ဘယ်လိုရေးရမလဲ? (နှိုင်းယှဉ်ချက်)

### JEE (Servlet-based) Authentication:

```java
// JEE — အကုန်ကိုယ်တိုင်ရေးရ
@WebServlet("/api/auth/login")
public class LoginServlet extends HttpServlet {
    
    protected void doPost(HttpServletRequest req, HttpServletResponse resp) {
        // 1. Read request body → JSON parsing
        BufferedReader reader = req.getReader();
        StringBuilder sb = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            sb.append(line);
        }
        JSONObject json = new JSONObject(sb.toString());
        String username = json.getString("username");
        String password = json.getString("password");
        
        // 2. JDBC query
        Connection conn = DriverManager.getConnection(url, user, pass);
        PreparedStatement ps = conn.prepareStatement(
            "SELECT * FROM users WHERE username = ?");
        ps.setString(1, username);
        ResultSet rs = ps.executeQuery();
        
        // 3. Password verify
        if (rs.next()) {
            String hash = rs.getString("password_hash");
            if (BCrypt.checkpw(password, hash)) {
                // 4. Generate JWT (ကိုယ်တိုင်)
                String token = generateJwt(username);
                
                // 5. Write JSON response (ကိုယ်တိုင်)
                resp.setContentType("application/json");
                JSONObject response = new JSONObject();
                response.put("token", token);
                response.put("tokenType", "Bearer");
                resp.getWriter().write(response.toString());
            }
        }
    }
}
```

### Spring Boot (ဒီ Project):

```java
// Spring Boot — Spring က အကုန်လုပ်ပေး
@PostMapping("/login")
public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
    return ResponseEntity.ok(authService.login(request));
}
```

---

## 10. အဓိက Security Concepts အကျဉ်းချုပ်

| Concept | ရှင်းလင်းချက် | ဒီ Project မှာ |
|---------|-------------|----------------|
| **Authentication** | သင်ဘယ်သူလဲဆိုတာ အတည်ပြု | JWT Token |
| **Authorization** | သင်ဘာလုပ်ခွင့်ရှိလဲ | URL-based (permitAll/authenticated) |
| **JWT** | JSON data တွေပါတဲ့ self-contained token | `JwtTokenProvider` |
| **BCrypt** | Password hash algorithm (one-way) | `PasswordEncoder` |
| **CORS** | Frontend/Backend port မတူရင် ခွင့်ပြု | `corsConfigurationSource` |
| **CSRF** | Cross-site request forgery ကာကွယ် | REST API အတွက် disable |
| **Stateless** | Session မသုံးဘူး | `STATELESS` policy |
| **Filter** | Request ကြိုဖမ်းတဲ့အလွှာ | `JwtAuthenticationFilter` |
| **SecurityContext** | လက်ရှိ user info သိမ်းတဲ့နေရာ | `SecurityContextHolder` |

---

## ဖိုင်အားလုံး

- **detailInBurmese_1_Architecture.md** — Backend Architecture အကြောင်း
- **detailInBurmese_2_Database.md** — Database layer (MySQL, JPA, Entities, Repositories)
- **detailInBurmese_3_Security.md** — Security layer (JWT, Spring Security, Authentication) — ဤဖိုင်
