# Compiler Visualizer - Database Layer (MySQL + JPA/Hibernate)

## ဤဖိုင်အကြောင်း

ဤဖိုင်သည် ဒီ Project ရဲ့ Database ပိုင်းကို မြန်မာလို အသေးစိတ်ရှင်းပြထားသည်။
MySQL, JPA, Hibernate, Entity Classes, Relationships, Repositories နဲ့ DTOs တွေအကြောင်း ပါဝင်ပါတယ်။

---

## 1. Database Configuration

### application.properties (Default: SQLite for development)

```properties
# Server Configuration
server.port=8080

# Default profile: use SQLite for development
spring.profiles.active=dev
```

### application-dev.properties (SQLite — Development)

```properties
spring.datasource.url=jdbc:sqlite:dev.db
spring.datasource.driverClassName=org.sqlite.JDBC
spring.jpa.database-platform=org.hibernate.community.dialect.SQLiteDialect
spring.jpa.hibernate.ddl-auto=update
```

### application-mysql.properties (MySQL — Production)

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/compiler_visualizer?createDatabaseIfNotExist=true&useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=UTC
spring.datasource.driverClassName=com.mysql.cj.jdbc.Driver
spring.datasource.username=root
spring.datasource.password=
spring.jpa.hibernate.ddl-auto=update
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.MySQLDialect
```

### Database Configuration တစ်ခုချင်းစီကို ရှင်းပြခြင်း

**Spring Profiles** — Environment အလိုက် configuration ပြောင်းသုံးခြင်း:

```bash
# SQLite နဲ့ run မယ် (default)
mvn spring-boot:run

# MySQL နဲ့ run မယ်
mvn spring-boot:run -Dspring-boot.run.profiles=mysql
```

DataSource Properties တွေရဲ့ အဓိပ္ပါယ်:

| Property | အဓိပ္ပါယ် | JEE/JDBC နဲ့ နှိုင်းယှဉ် |
|----------|-----------|----------------------|
| `spring.datasource.url` | Database ရဲ့လိပ်စာ | JDBC connection string |
| `spring.datasource.driverClassName` | JDBC driver class | `Class.forName("com.mysql.cj.jdbc.Driver")` |
| `spring.datasource.username` | DB username | — |
| `spring.datasource.password` | DB password | — |
| `spring.jpa.hibernate.ddl-auto=update` | **အလွန်အရေးကြီး** — Entity class တွေကိုကြည့်ပြီး table တွေကို auto create/update လုပ်ပေး | JEE မှာ SQL script တွေကိုယ်တိုင်ရေးရ |
| `spring.jpa.properties.hibernate.dialect` | Hibernate ကို "ဒီ DB type အတွက် SQL ဘယ်လိုရေးရမလဲ" ပြောတာ | — |

**ddl-auto=update ဆိုတာ ဘာလဲ?**

ဒါက **အံ့ဖွယ်ကောင်းတဲ့ feature** တစ်ခုပါ။ သင်က Java class (Entity) ကို ရေးလိုက်ရုံနဲ့
Spring က MySQL table ကို အလိုအလျောက် create/update လုပ်ပေးတယ်။

```java
// Java Entity class ရေးလိုက်တာနဲ့
@Entity
@Table(name = "users")
public class User {
    @Id
    private Long id;
    private String username;
    private String email;
}

// Spring က အောက်ပါ SQL ကို auto run ပေးတယ်
// CREATE TABLE users (
//     id BIGINT PRIMARY KEY,
//     username VARCHAR(255),
//     email VARCHAR(255)
// );
```

JEE/JDBC မှာ သင်ကိုယ်တိုင် `CREATE TABLE` script တွေရေးပြီး run ရမယ်။
Spring Data JPA မှာ ddl-auto=update ဆိုရင် **အလိုအလျောက်** လုပ်ပေးတယ်။

---

## 2. pom.xml — Dependencies (မှီခိုပစ္စည်းများ)

```xml
<!-- Spring Boot Web — REST API အတွက် -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-web</artifactId>
</dependency>

<!-- Spring Data JPA — Database access အတွက် -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>

<!-- Validation — @Valid, @NotBlank စတဲ့ validation တွေအတွက် -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-validation</artifactId>
</dependency>

<!-- MySQL Connector -->
<dependency>
    <groupId>com.mysql</groupId>
    <artifactId>mysql-connector-j</artifactId>
    <scope>runtime</scope>
</dependency>

<!-- Lombok — getter/setter/constructor တွေကို auto generate လုပ်ပေးတယ် -->
<dependency>
    <groupId>org.projectlombok</groupId>
    <artifactId>lombok</artifactId>
    <optional>true</optional>
</dependency>
```

### Spring Boot Starter ဆိုတာဘာလဲ?

Spring Boot Starter ဆိုတာ **dependency တွေကို အစုလိုက်ထည့်ပေးတဲ့ package** တစ်ခုပါ။

ဥပမာ — `spring-boot-starter-data-jpa` ဆိုတာက အောက်ပါအစုအဝေးကို တစ်ခါတည်းထည့်ပေးတယ်:
- Hibernate (JPA implementation)
- Spring Data JPA
- Transaction management
- Connection pooling (HikariCP)

JEE မှာ ဒါတွေကို တစ်ခုချင်းထည့်ရမယ်။ Spring Boot Starter က **အကုန်အဆင်သင့် ထုပ်ပေးထားတယ်။**

---

## 3. Entity Classes (Database Tables ကို ကိုယ်စားပြုသော Java Classes)

### User Entity

`model/User.java` → `users` table

```java
package com.compilervisualizer.model;

import jakarta.persistence.*;     // ← JPA annotations (not javax.persistence anymore)
import lombok.*;                   // ← Lombok annotations
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity                                    // ← ဒါက database table တစ်ခုဖြစ်ကြောင်းပြော
@Table(name = "users")                     // ← Table name (မပေးရင် class name အတိုင်းယူ)
@Getter @Setter                            // ← Lombok: getter/setter auto generate
@Builder                                   // ← Lombok: Builder pattern auto generate
@NoArgsConstructor                         // ← Lombok: no-arg constructor
@AllArgsConstructor                        // ← Lombok: all-arg constructor
public class User {

    @Id                                    // ← Primary key
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "user_gen")
    @TableGenerator(
        name = "user_gen",
        table = "id_generator",            // ← ID တွေသိမ်းမယ့် table
        pkColumnName = "gen_name",
        pkColumnValue = "user_id",
        valueColumnName = "gen_value",
        allocationSize = 1                 // ← တစ်ခါသုံးရင် 1 တိုး
    )
    private Long id;

    @Column(nullable = false, unique = true, length = 50)  // ← NOT NULL, UNIQUE, VARCHAR(50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String passwordHash;           // ← Encrypted password (never store raw password!)

    @CreationTimestamp                     // ← Auto set on insert
    @Column(updatable = false)             // ← Update လုပ်ရင် ဒါကို မပြောင်းနဲ့
    private LocalDateTime createdAt;

    @UpdateTimestamp                       // ← Auto set on update
    private LocalDateTime updatedAt;
}
```

### @GeneratedValue(strategy = GenerationType.TABLE) ဆိုတာဘာလဲ?

ID auto-generation အတွက် strategy ၃ မျိုးရှိတယ်:

| Strategy | ဘယ်လိုအလုပ်လုပ်လဲ | ဘယ်အချိန်သုံးသင့်လဲ |
|----------|-----------------|-------------------|
| `GenerationType.IDENTITY` | DB ရဲ့ auto_increment ကိုသုံး | MySQL, PostgreSQL အတွက် အမြန်ဆုံး |
| `GenerationType.SEQUENCE` | DB sequence ကိုသုံး | Oracle, PostgreSQL အတွက် |
| `GenerationType.TABLE` | DB table နဲ့ ID တွေသိမ်း | Database အမျိုးမျိုးနဲ့သုံးလို့ရ (portable) |

ဒီ Project က `GenerationType.TABLE` ကိုသုံးထားတယ်။ ဆိုလိုတာက `id_generator` ဆိုတဲ့
table တစ်ခုရှိမယ်။ အဲဒီ table မှာ ID တန်ဖိုးတွေကို သိမ်းတယ်။

```
id_generator table:
┌──────────────────────┬────────────┐
│ gen_name             │ gen_value  │
├──────────────────────┼────────────┤
│ user_id              │ 1          │
│ saved_code_id        │ 1          │
└──────────────────────┴────────────┘
```

User အသစ်ထည့်တိုင်း `UPDATE id_generator SET gen_value = gen_value + 1 WHERE gen_name = 'user_id'` လုပ်တယ်။

**MySQL အတွက်ဆိုရင်** `IDENTITY` က ပိုကောင်းတယ်။ ဒါပေမယ့် ဒီ Project က SQLite, H2, PostgreSQL, MySQL
အကုန်သုံးလို့ရအောင် TABLE strategy ကိုသုံးထားတာ။

### Lombok Annotations တွေက ဘာတွေလုပ်ပေးလဲ?

```java
// သင်ရေးရမယ့် code
@Entity
public class User {
    private Long id;
    private String username;
    
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    
    // Constructor တွေ, builder... အများကြီးရေးရ
}

// Lombok သုံးရင်
@Entity
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class User {
    private Long id;
    private String username;
    // Lombok က compile လုပ်တဲ့အခါ getter/setter/constructor တွေကို auto generate လုပ်ပေးတယ်
}
```

### @CreationTimestamp / @UpdateTimestamp

Hibernate ရဲ့ feature တွေပါ။
- `@CreationTimestamp` — Record အသစ်ထည့်တဲ့အခါ current timestamp ကို auto ထည့်ပေးတယ်
- `@UpdateTimestamp` — Record ကို update လုပ်တဲ့အခါတိုင်း current timestamp ကို auto ပြောင်းပေးတယ်

**JEE ကျရင်** — `INSERT INTO users (...) VALUES (..., NOW())` လို့ manually ရေးရတယ်။
Spring Data JPA မှာ annotation တပ်ရုံနဲ့ ပြီးတယ်။

---

### SavedCode Entity

`model/SavedCode.java` → `saved_code` table

```java
@Entity
@Table(name = "saved_code")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class SavedCode {

    @Id
    @GeneratedValue(strategy = GenerationType.TABLE, generator = "saved_code_gen")
    @TableGenerator(name = "saved_code_gen", table = "id_generator",
        pkColumnName = "gen_name", pkColumnValue = "saved_code_id",
        valueColumnName = "gen_value", allocationSize = 1)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)        // ← Many SavedCodes → One User
    @JoinColumn(name = "user_id", nullable = false)  // ← Foreign key column
    private User user;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")  // ← TEXT type (long text)
    private String sourceCode;

    @CreationTimestamp
    @Column(updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
```

### @ManyToOne Relationship ကို အသေးစိတ်

```
saved_code table                   users table
┌──────────────────────────────┐   ┌──────────────────┐
│ id          (PK)             │   │ id      (PK)     │
│ user_id     (FK → users.id)──┼──▶│ username         │
│ title                        │   │ email            │
│ source_code                  │   │ password_hash    │
│ created_at                   │   └──────────────────┘
│ updated_at                   │
└──────────────────────────────┘
```

- `@ManyToOne` — SavedCode တစ်ခုက User တစ်ယောက်နဲ့ပဲဆိုင်
  - User တစ်ယောက်က SavedCode အများကြီးရှိနိုင်တယ် (OneToMany)
  - SavedCode တစ်ခုက User တစ်ယောက်ပဲရှိတယ် (ManyToOne)
  
- `fetch = FetchType.LAZY` — User data ကို **လိုမှ ယူ** (performance အတွက်)
  - EAGER: User ကိုပါချက်ချင်းယူ
  - LAZY: User ကိုတကယ်လိုမှ DB ကနေထပ်ယူ

- `@JoinColumn(name = "user_id")` — Foreign key column name

**JEE နဲ့နှိုင်းယှဉ်:**
```sql
-- JEE: Foreign key ကို SQL မှာ manually ရေးရ
CREATE TABLE saved_code (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Spring Data JPA: @ManyToOne + @JoinColumn တပ်ရုံနဲ့ ပြီး
-- Hibernate က auto generate လုပ်ပေးတယ်
```

---

## 4. Repositories (Database Access Layer)

### UserRepository

```java
@Repository  // ← ဒါက Data Access Object (DAO) ဖြစ်ကြောင်းပြော
public interface UserRepository extends JpaRepository<User, Long> {
    // User — Entity type
    // Long — Primary key type
    
    // Method name ကိုကြည့်ပြီး Spring Data JPA က SQL auto generate လုပ်ပေးတယ်
    
    Optional<User> findByUsername(String username);
    // → SELECT * FROM users WHERE username = ?
    
    Optional<User> findByEmail(String email);
    // → SELECT * FROM users WHERE email = ?
    
    Boolean existsByUsername(String username);
    // → SELECT COUNT(*) FROM users WHERE username = ?
    // → true/false ပြန်
    
    Boolean existsByEmail(String email);
    // → SELECT COUNT(*) FROM users WHERE email = ?
}
```

### SavedCodeRepository

```java
@Repository
public interface SavedCodeRepository extends JpaRepository<SavedCode, Long> {
    
    List<SavedCode> findByUserIdOrderByCreatedAtDesc(Long userId);
    // → SELECT * FROM saved_code WHERE user_id = ? ORDER BY created_at DESC
    // → User ရဲ့ saved code တွေကို အသစ်ဆုံးအရင်ပြန်
    
    List<SavedCode> findByUserIdAndTitleContainingIgnoreCase(Long userId, String title);
    // → SELECT * FROM saved_code WHERE user_id = ? AND UPPER(title) LIKE UPPER(?)
    // → Title အလိုက် search လုပ် (case insensitive)
}
```

### JpaRepository က ဘာ methods တွေ အလိုလိုပေးလဲ?

`extends JpaRepository<Entity, ID>` လုပ်လိုက်တာနဲ့ အောက်ပါ methods တွေ အလိုလိုရတယ်:

| Method | SQL | အသုံးပြုပုံ |
|--------|-----|-----------|
| `save(entity)` | `INSERT INTO ...` | Record အသစ်ထည့် |
| `save(entity)` (with id) | `UPDATE ... SET ... WHERE id=?` | Record ပြင်ဆင် |
| `findById(id)` | `SELECT * FROM ... WHERE id=?` | ID နဲ့ရှာ |
| `findAll()` | `SELECT * FROM ...` | အကုန်ယူ |
| `delete(entity)` | `DELETE FROM ... WHERE id=?` | ဖျက်ပစ် |
| `existsById(id)` | `SELECT COUNT(*) FROM ... WHERE id=?` | ရှိမရှိစစ် |

**JEE/JDBC ကျရင်** — ဒါတွေအကုန်ကို ကိုယ်တိုင် SQL ရေးရတယ်။ Spring Data JPA က **အလိုအလျောက် လုပ်ပေးတယ်။**

---

## 5. DTOs (Data Transfer Objects)

DTO ဆိုတာ **ဘယ်အချက်အလက်တွေကို API ကနေ ပြင်ပကိုပို့မလဲ** ဆိုတာကို သတ်မှတ်တဲ့ object တွေပါ။
Entity က DB ရဲ့ structure ကိုကိုယ်စားပြုပြီး DTO က API response ရဲ့ structure ကိုကိုယ်စားပြုတယ်။

### Request DTOs (Client → Server)

**LoginRequest:**
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class LoginRequest {
    @NotBlank(message = "Username is required")
    private String username;
    
    @NotBlank(message = "Password is required")
    private String password;
}
```

**RegisterRequest:**
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class RegisterRequest {
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 50, message = "Username must be between 3 and 50 characters")
    private String username;
    
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;
    
    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(regexp = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).*$",
             message = "Password must contain at least one uppercase letter, one lowercase letter, and one digit")
    private String password;
}
```

**CompileRequest:**
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class CompileRequest {
    @NotBlank(message = "Source code is required")
    @Size(max = 50000, message = "Source code too large (max 50,000 characters)")
    private String sourceCode;
    
    private String input;  // optional stdin for execution
}
```

### Jakarta Validation Annotations:

| Annotation | အလုပ်လုပ်ပုံ | ဘာတွေစစ်လဲ |
|-----------|------------|-----------|
| `@NotBlank` | String က null/empty/whitespace မဖြစ်ရ | " ", "", null ❌ |
| `@Size(min, max)` | String length ကို စစ် | သတ်မှတ်ထားတဲ့ range ထဲမှာရှိရမယ် |
| `@Email` | Email format မှန်မမှန်စစ် | `user@example.com` ✅ |
| `@Pattern(regexp)` | Regex နဲ့စစ် | စကားဝှက်မှာ uppercase, lowercase, digit ပါရမယ် |

**JEE ကျရင်** — ဒါတွေကို ကိုယ်တိုင် if-else စစ်ရတယ်။ Spring က annotation တပ်ရုံနဲ့ validation လုပ်ပေးတယ်။

### Response DTOs (Server → Client)

**AuthResponse:**
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class AuthResponse {
    private String token;      // JWT token
    private String tokenType;  // "Bearer"
    private Long userId;
    private String username;
    private String email;
}
```

**SavedCodeResponse:**
```java
@Data @Builder @NoArgsConstructor @AllArgsConstructor
public class SavedCodeResponse {
    private Long id;
    private String title;
    private String sourceCode;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
```

### Entity နဲ့ DTO ဘာကွာလဲ?

Entity ကို DB နဲ့ချိတ်ဆက်ဖို့သုံးတယ်။ DTO ကို API response အတွက်သုံးတယ်။
Entity မှာ DB relation တွေပါတယ် (ဥပမာ `@ManyToOne User user`)။
DTO မှာ API ကနေပြန်မယ့် data ပဲထည့်တယ်။

```
Entity (User)                    DTO (AuthResponse)
┌──────────────────┐            ┌──────────────────┐
│ id (PK)          │            │ userId           │  ← API ကိုပြန်တဲ့ data
│ username         │            │ username         │
│ email            │            │ email            │
│ passwordHash     │  ← secret  │ token            │
│ createdAt        │            │ tokenType        │
│ updatedAt        │            └──────────────────┘
└──────────────────┘
```

**passwordHash** က Entity မှာပါတယ် (DB မှာသိမ်းဖို့)။
ဒါပေမယ့် **AuthResponse** (API response) မှာ passwordHash ကိုမပြန်ဘူး။
အဲဒီအစား token နဲ့ အခြား data တွေကိုပြန်တယ်။

---

## 6. ဒီ Project ရဲ့ Database Tables (MySQL)

ဒီ Project မှာ table ၃ ခုရှိတယ်:

```sql
-- Table 1: users
CREATE TABLE users (
    id BIGINT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME,
    updated_at DATETIME
);

-- Table 2: saved_code
CREATE TABLE saved_code (
    id BIGINT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    title VARCHAR(100) NOT NULL,
    source_code TEXT NOT NULL,
    created_at DATETIME,
    updated_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Table 3: id_generator (for TABLE strategy)
CREATE TABLE id_generator (
    gen_name VARCHAR(255) PRIMARY KEY,
    gen_value BIGINT NOT NULL
);

-- id_generator data
INSERT INTO id_generator (gen_name, gen_value) VALUES ('user_id', 1);
INSERT INTO id_generator (gen_name, gen_value) VALUES ('saved_code_id', 1);
```

**ဒါပေမယ့်** — Spring Boot က `ddl-auto=update` ဆိုတော့ ဒီ SQL တွေကို ကိုယ်တိုင် run စရာမလိုဘူး။
Entity class တွေရေးတာနဲ့ Spring က auto create လုပ်ပေးတယ်။

---

## 7. JPA Repository Flow — ဘယ်လိုအလုပ်လုပ်လဲ?

```
Browser (React) — POST /api/code
    │
    ▼
CodeController.saveCode()
    │  { title: "Hello.java", sourceCode: "public class Hello {...}" }
    ▼
CodeService.saveCode("thant", request)
    │
    ├─ 1. userRepository.findByUsername("thant")
    │      → SELECT * FROM users WHERE username = 'thant'
    │      → User entity ပြန်
    │
    ├─ 2. SavedCode entity အသစ်ဆောက်
    │      SavedCode.builder()
    │          .user(user)        ← User entity ကို assign
    │          .title("Hello.java")
    │          .sourceCode("public class Hello {...}")
    │          .build()
    │
    ├─ 3. savedCodeRepository.save(savedCode)
    │      → INSERT INTO saved_code (user_id, title, source_code, created_at, updated_at)
    │        VALUES (1, 'Hello.java', 'public class Hello {...}', NOW(), NOW())
    │
    └─ 4. mapToResponse(savedCode)
           → Entity → DTO ပြောင်း
           → SavedCodeResponse ပြန်
    │
    ▼
Browser ← { id: 1, title: "Hello.java", sourceCode: "...", createdAt: "..." }
```

### CodeService method တွေကို အသေးစိတ်:

**saveCode — Code အသစ်သိမ်း:**
```java
public SavedCodeResponse saveCode(String username, SaveCodeRequest request) {
    // 1. User ရှိမရှိစစ်
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
    
    // 2. SavedCode entity ဆောက်
    SavedCode savedCode = SavedCode.builder()
            .user(user)              // User object ကို assign
            .title(request.getTitle())
            .sourceCode(request.getSourceCode())
            .build();
    
    // 3. DB ထဲသိမ်း
    savedCodeRepository.save(savedCode);
    
    // 4. Entity → DTO ပြောင်းပြီး response ပြန်
    return mapToResponse(savedCode);
}
```

**getSavedCodes — User ရဲ့ saved code အကုန်ယူ:**
```java
public List<SavedCodeResponse> getSavedCodes(String username) {
    User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));
    
    return savedCodeRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()                           // Stream API (Java 8)
            .map(this::mapToResponse)           // Entity → DTO ပြောင်း
            .collect(Collectors.toList());      // List အဖြစ်စုစည်း
}
```

**updateSavedCode — Code ကို update:**
```java
public SavedCodeResponse updateSavedCode(String username, Long id, SaveCodeRequest request) {
    // 1. Saved code ရှိမရှိစစ်
    SavedCode savedCode = savedCodeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Saved code not found"));
    
    // 2. Ownership စစ် (ဒီ user ရဲ့ code မှန်း verify)
    if (!savedCode.getUser().getUsername().equals(username)) {
        throw new RuntimeException("Unauthorized access");  // တခြားသူရဲ့ code ကိုပြင်လို့မရ
    }
    
    // 3. Field တွေကို update
    savedCode.setTitle(request.getTitle());
    savedCode.setSourceCode(request.getSourceCode());
    
    // 4. DB ကို save (id ရှိလို့ UPDATE ဖြစ်မယ်)
    savedCodeRepository.save(savedCode);
    
    return mapToResponse(savedCode);
}
```

**deleteSavedCode — Code ဖျက်ပစ်:**
```java
public void deleteSavedCode(String username, Long id) {
    // 1. ရှိမရှိစစ်
    SavedCode savedCode = savedCodeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Saved code not found"));
    
    // 2. Ownership စစ်
    if (!savedCode.getUser().getUsername().equals(username)) {
        throw new RuntimeException("Unauthorized access");
    }
    
    // 3. ဖျက်ပစ်
    savedCodeRepository.delete(savedCode);
}
```

---

## 8. MySQL နဲ့အလုပ်လုပ်ပုံ — Summary

### Spring Boot မှာ MySQL သုံးဖို့ လိုအပ်တာတွေ:

| အဆင့် | ဘာလုပ်ရမလဲ | ဒီ Project မှာ ရှိလား |
|------|------------|------------------|
| 1 | MySQL ကို local မှာ install လုပ် | သင်ကိုယ်တိုင်လုပ်ရ |
| 2 | Database တစ်ခုဆောက် (`compiler_visualizer`) | URL မှာ `createDatabaseIfNotExist=true` ပါလို့ auto create လုပ်ပေး |
| 3 | `application-mysql.properties` မှာ connection သတ်မှတ် | ✅ ရှိတယ် |
| 4 | MySQL dependency ထည့် | ✅ pom.xml မှာပါတယ် |
| 5 | `mysql` profile နဲ့ run | `mvn spring-boot:run -Dspring-boot.run.profiles=mysql` |

### Database ဆိုင်ရာ အဓိကအချက်များ:

1. **Spring Data JPA** က JDBC ကို wrap လုပ်ထားပြီး ပိုလွယ်ကူအောင်လုပ်ပေးတယ်
2. **ddl-auto=update** က entity class ကိုကြည့်ပြီး table တွေကို auto create/update လုပ်ပေးတယ်
3. **Repository method naming** က method name ကိုကြည့်ပြီး SQL auto generate လုပ်ပေးတယ်
4. **@ManyToOne / @OneToMany** က relationship တွေကို သတ်မှတ်တယ်
5. **Lombok** က getter/setter/constructor တွေကို auto generate လုပ်ပေးတယ်
6. **Entity** က DB အတွက်, **DTO** က API အတွက်

---

## နောက်ဖိုင်များ

- **detailInBurmese_1_Architecture.md** — Backend Architecture အကြောင်း
- **detailInBurmese_3_Security.md** — Security layer (JWT, Spring Security, Authentication)
