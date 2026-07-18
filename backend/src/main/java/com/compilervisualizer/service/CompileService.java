package com.compilervisualizer.service;

import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.dto.TokenDto;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.tools.*;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@Slf4j
public class CompileService {

    private static final int TIMEOUT_SECONDS = 10;
    private static final int MAX_CACHE_SIZE = 128;
    private static final Pattern PUBLIC_CLASS_PATTERN =
        Pattern.compile("public\\s+class\\s+(\\w+)");

    private final ExecutorService compileExecutor = Executors.newFixedThreadPool(4);

    // Simple LRU-style cache: sourceCode+input → response
    private final ConcurrentHashMap<String, CompileResponse> cache = new ConcurrentHashMap<>();

    public CompileResponse compileAndExecute(String sourceCode, String stdinInput) {
        // Check cache first
        String cacheKey = sourceCode + "\0" + (stdinInput != null ? stdinInput : "");
        CompileResponse cached = cache.get(cacheKey);
        if (cached != null) {
            log.debug("Cache hit for compilation");
            return cached;
        }

        long pipelineStart = System.currentTimeMillis();
        Path tempDir = null;

        try {
            tempDir = Files.createTempDirectory("compiler-visualizer");
            String className = detectClassName(sourceCode);
            Path sourceFile = tempDir.resolve(className + ".java");
            Files.writeString(sourceFile, sourceCode);

            // Phase 1+2: Tokenization and AST run in parallel
            long t0 = System.currentTimeMillis();

            CompletableFuture<List<TokenDto>> tokensFuture = CompletableFuture.supplyAsync(() -> {
                JavaLexer lexer = new JavaLexer(sourceCode);
                return lexer.tokenize();
            }, compileExecutor).exceptionally(ex -> {
                log.error("Token extraction failed", ex);
                return List.of();
            });

            CompletableFuture<CompilationUnit> astFuture = CompletableFuture.supplyAsync(() -> {
                return StaticJavaParser.parse(sourceCode);
            }, compileExecutor).exceptionally(ex -> {
                log.error("AST generation failed", ex);
                return null;
            });

            // Wait for both to complete
            List<TokenDto> tokens;
            CompilationUnit cu;
            String tokenError = null;
            String astError = null;
            try {
                tokens = tokensFuture.get();
            } catch (Exception e) {
                tokens = List.of();
                tokenError = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            }
            try {
                cu = astFuture.get();
            } catch (Exception e) {
                cu = null;
                astError = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            }

            // Phase 2: Serialize AST (depends on AST parse)
            String astJson;
            try {
                if (cu != null) {
                    astJson = AstSerializer.toJson(cu);
                } else {
                    astJson = "{\"error\": \"" + escapeJson(astError != null ? astError : "Parse failed") + "\"}";
                }
            } catch (Exception e) {
                astJson = "{\"error\": \"" + escapeJson(e.getMessage()) + "\"}";
                astError = e.getMessage();
            }

            // Phase 3: Symbol Table (reuse parsed AST from Phase 2)
            long t1 = System.currentTimeMillis();
            String symbolTableJson;
            String symbolTableError = null;
            try {
                if (cu == null) {
                    symbolTableJson = "{\"error\": \"Skipped — AST parse failed\"}";
                } else {
                    symbolTableJson = SymbolTableBuilder.toJson(cu);
                }
            } catch (Exception e) {
                log.error("Symbol table generation failed", e);
                symbolTableJson = "{\"error\": \"" + escapeJson(e.getMessage()) + "\"}";
                symbolTableError = e.getMessage();
            }
            long symbolTableTime = System.currentTimeMillis() - t1;

            long parallelTime = System.currentTimeMillis() - t0;
            long tokenTime = parallelTime; // both ran in parallel, same wall-clock
            long astTime = parallelTime;

            // Phase 4: Compile to bytecode (javac + javap)
            long t3 = System.currentTimeMillis();
            String bytecode;
            String compilationError = null;
            try {
                bytecode = compileToBytecode(sourceFile, tempDir, className);
            } catch (Exception e) {
                log.error("Bytecode generation failed", e);
                bytecode = "";
                compilationError = e.getMessage();
            }
            long bytecodeTime = System.currentTimeMillis() - t3;

            // Phase 5: Execute
            long t4 = System.currentTimeMillis();
            String executionOutput = "";
            String executionError = null;
            Integer exitCode = null;
            try {
                ExecutionResult result = executeCode(tempDir, className, stdinInput);
                executionOutput = result.stdout;
                executionError = result.stderr.isEmpty() ? null : result.stderr;
                exitCode = result.exitCode;
            } catch (Exception e) {
                log.error("Execution failed", e);
                executionError = e.getMessage();
            }
            long executionTime = System.currentTimeMillis() - t4;

            long totalTime = System.currentTimeMillis() - pipelineStart;

            // Determine legacy error field
            String firstError = firstNonNull(tokenError, astError, symbolTableError, compilationError, executionError);

            CompileResponse response = CompileResponse.builder()
                .tokens(tokens)
                .tokenError(tokenError)
                .tokenTimeMs(tokenTime)
                .astJson(astJson)
                .astError(astError)
                .astTimeMs(astTime)
                .symbolTableJson(symbolTableJson)
                .symbolTableError(symbolTableError)
                .symbolTableTimeMs(symbolTableTime)
                .bytecode(bytecode)
                .compilationError(compilationError)
                .bytecodeTimeMs(bytecodeTime)
                .executionOutput(executionOutput)
                .executionError(executionError)
                .exitCode(exitCode)
                .executionTimeMs(executionTime)
                .error(firstError)
                .compilationTimeMs(totalTime)
                .build();

            // Cache the result (evict oldest if at capacity)
            if (cache.size() >= MAX_CACHE_SIZE) {
                // Evict the oldest entry by insertion order
                String oldestKey = cache.keySet().iterator().next();
                cache.remove(oldestKey);
            }
            cache.put(cacheKey, response);

            return response;

        } catch (Exception e) {
            log.error("Pipeline failed", e);
            long totalTime = System.currentTimeMillis() - pipelineStart;
            return CompileResponse.builder()
                .error(e.getMessage())
                .compilationTimeMs(totalTime)
                .build();
        } finally {
            cleanupTempDir(tempDir);
        }
    }

    // --- Class name detection ---

    private String detectClassName(String sourceCode) {
        Matcher matcher = PUBLIC_CLASS_PATTERN.matcher(sourceCode);
        if (matcher.find()) {
            return matcher.group(1);
        }
        // fallback: find any class declaration
        Pattern anyClass = Pattern.compile("class\\s+(\\w+)");
        Matcher m2 = anyClass.matcher(sourceCode);
        if (m2.find()) {
            return m2.group(1);
        }
        // ultimate fallback
        return "Main";
    }

    // --- Phase 4: Bytecode ---

    private String compileToBytecode(Path sourceFile, Path tempDir, String className) throws Exception {
        // --- javac via javax.tools.JavaCompiler (in-process, no JVM fork) ---
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new RuntimeException("No Java compiler available — ensure you're running on a JDK, not JRE");
        }

        DiagnosticCollector<JavaFileObject> diagnostics = new DiagnosticCollector<>();
        StandardJavaFileManager fileManager = compiler.getStandardFileManager(diagnostics, null, null);

        Iterable<? extends JavaFileObject> compilationUnits =
            fileManager.getJavaFileObjects(sourceFile.toFile());

        JavaCompiler.CompilationTask task = compiler.getTask(
            null, fileManager, diagnostics,
            List.of("-d", tempDir.toString()),
            null, compilationUnits);

        boolean success = task.call();
        fileManager.close();

        if (!success) {
            StringBuilder errors = new StringBuilder("Compilation failed:");
            for (Diagnostic<? extends JavaFileObject> d : diagnostics.getDiagnostics()) {
                errors.append("\n").append(d.getMessage(null));
            }
            throw new RuntimeException(errors.toString());
        }

        // --- javap via ProcessBuilder (no API equivalent) ---
        Path classFile = tempDir.resolve(className + ".class");
        if (!Files.exists(classFile)) {
            throw new RuntimeException("Class file not found: " + className + ".class");
        }

        ProcessBuilder pb = new ProcessBuilder("javap", "-c", "-p", classFile.toString());
        pb.redirectErrorStream(true);
        Process process = pb.start();

        String output = readStream(process.getInputStream());
        boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);

        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("javap timed out after " + TIMEOUT_SECONDS + "s");
        }

        if (process.exitValue() != 0) {
            throw new RuntimeException("javap failed:\n" + output);
        }

        return output;
    }

    // --- Phase 5: Execution ---

    private ExecutionResult executeCode(Path tempDir, String className, String stdinInput) throws Exception {
        ProcessBuilder pb = new ProcessBuilder("java", "-cp", tempDir.toString(), className);
        pb.redirectErrorStream(true); // merge stderr into stdout to prevent deadlock
        Process process = pb.start();

        // provide stdin if requested
        if (stdinInput != null && !stdinInput.isEmpty()) {
            try (OutputStream os = process.getOutputStream()) {
                os.write(stdinInput.getBytes());
                os.flush();
            }
        }

        String output = readStream(process.getInputStream());
        boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);

        if (!finished) {
            process.destroyForcibly();
            return new ExecutionResult(
                output,
                "[Timed out after " + TIMEOUT_SECONDS + "s]",
                -1
            );
        }

        return new ExecutionResult(output, "", process.exitValue());
    }

    // --- Helpers ---

    private String readStream(InputStream is) throws IOException {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (sb.length() > 0) sb.append("\n");
                sb.append(line);
            }
        }
        return sb.toString();
    }

    private void cleanupTempDir(Path tempDir) {
        if (tempDir == null) return;
        try {
            Files.walk(tempDir)
                .sorted((a, b) -> b.compareTo(a))
                .forEach(path -> {
                    try { Files.deleteIfExists(path); } catch (Exception ignored) {}
                });
        } catch (Exception e) {
            log.warn("Failed to clean up temp directory: {}", tempDir, e);
        }
    }

    private String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String firstNonNull(String... values) {
        for (String v : values) {
            if (v != null) return v;
        }
        return null;
    }

    private record ExecutionResult(String stdout, String stderr, int exitCode) {}
}
