package com.compilervisualizer.controller;

import com.compilervisualizer.dto.CompileRequest;
import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.service.CompileService;
import com.compilervisualizer.service.RateLimiter;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/compile")
@RequiredArgsConstructor
public class CompileController {

    private final CompileService compileService;
    private final RateLimiter rateLimiter;

    @PostMapping
    public ResponseEntity<?> compile(@Valid @RequestBody CompileRequest request,
                                     HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        if (!rateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", "Rate limit exceeded. Max 10 compiles per minute."));
        }
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/tokens")
    public ResponseEntity<?> compileTokens(@Valid @RequestBody CompileRequest request,
                                           HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        if (!rateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", "Rate limit exceeded. Max 10 compiles per minute."));
        }
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ast")
    public ResponseEntity<?> compileAst(@Valid @RequestBody CompileRequest request,
                                        HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        if (!rateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", "Rate limit exceeded. Max 10 compiles per minute."));
        }
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/semantic")
    public ResponseEntity<?> compileSemantic(@Valid @RequestBody CompileRequest request,
                                             HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        if (!rateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", "Rate limit exceeded. Max 10 compiles per minute."));
        }
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bytecode")
    public ResponseEntity<?> compileBytecode(@Valid @RequestBody CompileRequest request,
                                             HttpServletRequest httpRequest) {
        String clientIp = httpRequest.getRemoteAddr();
        if (!rateLimiter.tryAcquire(clientIp)) {
            return ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS)
                .body(Map.of("message", "Rate limit exceeded. Max 10 compiles per minute."));
        }
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }
}
