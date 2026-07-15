package com.compilervisualizer.controller;

import com.compilervisualizer.dto.CompileRequest;
import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.service.CompileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/execute")
@RequiredArgsConstructor
public class ExecuteController {

    private final CompileService compileService;

    @PostMapping
    public ResponseEntity<CompileResponse> execute(@Valid @RequestBody CompileRequest request) {
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<Map<String, Object>> getExecutionResult(@PathVariable String jobId) {
        // For MVP, execution is synchronous
        // This endpoint is a placeholder for future async execution
        Map<String, Object> response = new HashMap<>();
        response.put("jobId", jobId);
        response.put("status", "completed");
        response.put("message", "Synchronous execution - result returned immediately");
        return ResponseEntity.ok(response);
    }
}
