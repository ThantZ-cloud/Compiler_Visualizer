package com.compilervisualizer.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Runs external processes (javap, java) safely.
 * <p>
 * Fixes two hang scenarios present in the original inline implementation:
 * <ul>
 *   <li>stdout was drained <em>before</em> {@code waitFor(timeout)} — a process that
 *       never exits blocked the caller thread forever, and the timeout was never reached;</li>
 *   <li>stdin was written synchronously before stdout was drained — a child that never
 *       reads stdin and never prints could deadlock on a full OS pipe buffer.</li>
 * </ul>
 * Both streams are now handled on background daemon threads, the timeout is enforced with
 * {@code waitFor(seconds)} first, and a timed-out process is {@link Process#destroyForcibly()}
 * killed. Output is size-capped so a noisy child cannot exhaust memory.
 */
@Service
@Slf4j
public class CodeExecutor {

    private static final long MAX_OUTPUT_CHARS = 1_000_000;
    private static final int KILL_GRACE_SECONDS = 2;

    private final ExecutorService ioExecutor = Executors.newCachedThreadPool(r -> {
        Thread t = new Thread(r, "code-executor-io");
        t.setDaemon(true);
        return t;
    });

    @Value("${compile.execution-timeout-seconds:10}")
    private int timeoutSeconds;

    public int getTimeoutSeconds() {
        return timeoutSeconds;
    }

    /**
     * Runs a command, feeds optional stdin, and returns captured output.
     * Blocks at most {@code timeoutSeconds + kill grace} even for infinite loops.
     */
    public ExecutionResult run(List<String> command, Path workingDir, String stdinInput) {
        Process process;
        try {
            ProcessBuilder pb = new ProcessBuilder(command);
            if (workingDir != null) {
                pb.directory(workingDir.toFile());
            }
            pb.redirectErrorStream(true); // merge stderr to avoid pipe deadlock
            process = pb.start();
        } catch (IOException e) {
            log.error("Failed to start process {}: {}", command, e.getMessage());
            return ExecutionResult.failed(e.getMessage());
        }

        // Drain stdout on a daemon thread so waitFor(timeout) can actually fire.
        CompletableFuture<String> stdoutFuture = CompletableFuture
            .supplyAsync(() -> readStream(process.getInputStream()), ioExecutor);

        // Feed stdin on a daemon thread so a child that never reads it cannot deadlock us.
        CompletableFuture<Void> stdinFuture = stdinInput == null || stdinInput.isEmpty()
            ? null
            : CompletableFuture.runAsync(() -> writeStdin(process.getOutputStream(), stdinInput), ioExecutor);

        boolean finished;
        try {
            finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            process.destroyForcibly();
            return ExecutionResult.failed("Execution interrupted");
        }

        if (!finished) {
            // Kill hard, then reap stdout with a short grace period.
            process.destroyForcibly();
            try {
                process.waitFor(KILL_GRACE_SECONDS, TimeUnit.SECONDS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
            }
            String partial = await(stdoutFuture);
            return new ExecutionResult(partial,
                "[Timed out after " + timeoutSeconds + "s]",
                -1);
        }

        String output = await(stdoutFuture);
        return new ExecutionResult(output, "", process.exitValue());
    }

    /** Resolves the {@code java} launcher from the running JRE/JDK home. */
    public String javaExecutable() {
        return resolveExecutable("java");
    }

    /** Resolves the {@code javap} tool from the running JDK home. */
    public String javapExecutable() {
        return resolveExecutable("javap");
    }

    private String resolveExecutable(String name) {
        String javaHome = System.getProperty("java.home");
        String suffix = isWindows() ? ".exe" : "";
        Path candidate = Path.of(javaHome, "bin", name + suffix);
        if (Files.exists(candidate)) {
            return candidate.toString();
        }
        log.warn("{} not found under java.home={}, falling back to PATH", name, javaHome);
        return name;
    }

    private static boolean isWindows() {
        return System.getProperty("os.name", "").toLowerCase().contains("win");
    }

    private void writeStdin(OutputStream os, String input) {
        try (OutputStream out = os) {
            out.write(input.getBytes(StandardCharsets.UTF_8));
            out.flush();
        } catch (IOException e) {
            log.debug("Failed to write stdin (child may have exited): {}", e.getMessage());
        }
    }

    private String readStream(InputStream is) {
        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) {
                if (sb.length() >= MAX_OUTPUT_CHARS) {
                    log.warn("Process output exceeded {} chars, truncating", MAX_OUTPUT_CHARS);
                    break;
                }
                if (sb.length() > 0) sb.append("\n");
                sb.append(line);
            }
        } catch (IOException e) {
            // Stream closes when the process dies — normal on timeout.
            log.debug("Stream read aborted: {}", e.getMessage());
        }
        return sb.toString();
    }

    private String await(CompletableFuture<String> future) {
        try {
            return future.get(KILL_GRACE_SECONDS, TimeUnit.SECONDS);
        } catch (Exception e) {
            return "";
        }
    }

    public record ExecutionResult(String stdout, String stderr, int exitCode) {
        public static ExecutionResult failed(String message) {
            return new ExecutionResult("", message, -1);
        }
    }
}
