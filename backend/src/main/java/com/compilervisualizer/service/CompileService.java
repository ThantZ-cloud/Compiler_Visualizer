package com.compilervisualizer.service;

import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.dto.CompileResponse.ClassInfo;
import com.compilervisualizer.dto.TokenDto;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.ClassOrInterfaceDeclaration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.tools.*;
import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.stream.Stream;

@Service
@Slf4j
public class CompileService {

    private static final int TIMEOUT_SECONDS = 10;
    private static final int MAX_CACHE_SIZE = 128;

    private final ExecutorService compileExecutor = Executors.newFixedThreadPool(4);

    // Simple LRU-style cache: sourceCode+input → response
    private final ConcurrentHashMap<String, CompileResponse> cache = new ConcurrentHashMap<>();

    public CompileResponse compileAndExecute(String sourceCode, String stdinInput, String entryClassName) {
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

            // Parse AST first to detect all classes
            CompilationUnit cuForDetection = StaticJavaParser.parse(sourceCode);
            List<ClassInfo> detectedClasses = detectClasses(cuForDetection);

            // Determine the file name: use public class, or class with main, or first class
            String fileName = resolveFileName(detectedClasses);
            Path sourceFile = tempDir.resolve(fileName + ".java");
            Files.writeString(sourceFile, sourceCode);

            // Determine entry class for execution
            String className = resolveEntryClass(detectedClasses, entryClassName);

            // Phase 1: Tokenization (run in parallel with AST reuse)
            long t0 = System.currentTimeMillis();

            CompletableFuture<List<TokenDto>> tokensFuture = CompletableFuture.supplyAsync(() -> {
                JavaLexer lexer = new JavaLexer(sourceCode);
                return lexer.tokenize();
            }, compileExecutor).exceptionally(ex -> {
                log.error("Token extraction failed", ex);
                return List.of();
            });

            // Reuse the AST already parsed for class detection
            CompilationUnit cu = cuForDetection;
            String tokenError = null;
            String astError = null;

            List<TokenDto> tokens;
            try {
                tokens = tokensFuture.get();
            } catch (Exception e) {
                tokens = List.of();
                tokenError = e.getCause() != null ? e.getCause().getMessage() : e.getMessage();
            }

            // Phase 2: Serialize AST (reuse parsed AST)
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

            // Phase 3b: Control Flow Graph (reuse parsed AST)
            long tCfg = System.currentTimeMillis();
            String cfgJson;
            String cfgError = null;
            try {
                if (cu == null) {
                    cfgJson = "{\"error\": \"Skipped — AST parse failed\"}";
                } else {
                    cfgJson = ControlFlowGraphBuilder.toJson(cu);
                }
            } catch (Exception e) {
                log.error("CFG generation failed", e);
                cfgJson = "{\"error\": \"" + escapeJson(e.getMessage()) + "\"}";
                cfgError = e.getMessage();
            }
            long cfgTime = System.currentTimeMillis() - tCfg;

            long parallelTime = System.currentTimeMillis() - t0;
            long tokenTime = parallelTime;
            long astTime = parallelTime;

            // Phase 3.5: Three-Address Code (reuses parsed AST)
            long t2 = System.currentTimeMillis();
            String tacJson;
            String tacError = null;
            try {
                if (cu == null) {
                    tacJson = "// Skipped — AST parse failed";
                } else {
                    tacJson = TacGenerator.generate(cu);
                }
            } catch (Exception e) {
                log.error("TAC generation failed", e);
                tacJson = "// Error generating TAC: " + e.getMessage();
                tacError = e.getMessage();
            }
            long tacTime = System.currentTimeMillis() - t2;

            // Phase 4: Compile to bytecode (javac + javap for all classes)
            long t3 = System.currentTimeMillis();
            Map<String, String> allBytecode;
            String bytecode;
            String compilationError = null;
            try {
                allBytecode = compileToBytecodeMulti(sourceFile, tempDir);
                bytecode = allBytecode.getOrDefault(className, "");
            } catch (Exception e) {
                log.error("Bytecode generation failed", e);
                allBytecode = Map.of();
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
            String firstError = firstNonNull(tokenError, astError, symbolTableError, tacError, cfgError, compilationError, executionError);

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
                .tacJson(tacJson)
                .tacError(tacError)
                .tacTimeMs(tacTime)
                .cfgJson(cfgJson)
                .cfgError(cfgError)
                .cfgTimeMs(cfgTime)
                .bytecode(bytecode)
                .compilationError(compilationError)
                .bytecodeTimeMs(bytecodeTime)
                .executionOutput(executionOutput)
                .executionError(executionError)
                .exitCode(exitCode)
                .executionTimeMs(executionTime)
                .error(firstError)
                .compilationTimeMs(totalTime)
                .classes(detectedClasses)
                .allBytecode(allBytecode)
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

    // --- Class name detection (using JavaParser AST) ---

    /**
     * Detect all class declarations in the source using JavaParser.
     */
    private List<ClassInfo> detectClasses(CompilationUnit cu) {
        List<ClassInfo> classes = new ArrayList<>();
        cu.findAll(ClassOrInterfaceDeclaration.class).forEach(clazz -> {
            String name = clazz.getNameAsString();
            boolean isPublic = clazz.isPublic();
            boolean hasMain = clazz.getMethodsByName("main").stream().anyMatch(method ->
                method.isStatic() && method.isPublic()
                    && method.getTypeAsString().equals("void")
                    && method.getParameters().size() == 1
                    && method.getParameter(0).getTypeAsString().equals("String[]")
            );
            classes.add(new ClassInfo(name, hasMain, isPublic));
        });
        return classes;
    }

    /**
     * Resolve the source file name based on detected classes.
     * Java requires the file to match the public class name.
     */
    private String resolveFileName(List<ClassInfo> classes) {
        // Priority: public class > class with main > first class > "Main"
        return classes.stream()
            .filter(ClassInfo::isPublic)
            .map(ClassInfo::getName)
            .findFirst()
            .orElseGet(() -> classes.stream()
                .filter(ClassInfo::isHasMain)
                .map(ClassInfo::getName)
                .findFirst()
                .orElseGet(() -> classes.stream()
                    .map(ClassInfo::getName)
                    .findFirst()
                    .orElse("Main")));
    }

    /**
     * Resolve which class to execute.
     * Priority: user-specified > class with main > public class > first class > "Main"
     */
    private String resolveEntryClass(List<ClassInfo> classes, String requestedEntry) {
        if (requestedEntry != null && !requestedEntry.isBlank()) {
            // Verify the requested class exists
            boolean exists = classes.stream().anyMatch(c -> c.getName().equals(requestedEntry));
            if (exists) return requestedEntry;
        }
        // Auto-detect: class with main > public class > first class > "Main"
        return classes.stream()
            .filter(ClassInfo::isHasMain)
            .map(ClassInfo::getName)
            .findFirst()
            .orElseGet(() -> classes.stream()
                .filter(ClassInfo::isPublic)
                .map(ClassInfo::getName)
                .findFirst()
                .orElseGet(() -> classes.stream()
                    .map(ClassInfo::getName)
                    .findFirst()
                    .orElse("Main")));
    }

    // --- Phase 4: Bytecode (multi-class) ---

    /**
     * Compile source and run javap on ALL generated .class files.
     * Returns a map of className → javap output.
     */
    private Map<String, String> compileToBytecodeMulti(Path sourceFile, Path tempDir) throws Exception {
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

        // --- javap on ALL .class files ---
        Map<String, String> result = new LinkedHashMap<>();
        try (Stream<Path> classFiles = Files.walk(tempDir)) {
            classFiles
                .filter(p -> p.toString().endsWith(".class"))
                .sorted()
                .forEach(classFile -> {
                    String name = classFile.getFileName().toString().replace(".class", "");
                    // Skip inner classes (contain $) for cleaner display
                    if (name.contains("$")) return;

                    try {
                        ProcessBuilder pb = new ProcessBuilder("javap", "-c", "-p", classFile.toString());
                        pb.redirectErrorStream(true);
                        Process process = pb.start();
                        String output = readStream(process.getInputStream());
                        boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
                        if (finished && process.exitValue() == 0) {
                            result.put(name, output);
                        }
                    } catch (Exception e) {
                        log.warn("javap failed for {}: {}", name, e.getMessage());
                    }
                });
        }

        if (result.isEmpty()) {
            throw new RuntimeException("No .class files generated after compilation");
        }

        return result;
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
