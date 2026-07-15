package com.compilervisualizer.controller;

import com.compilervisualizer.dto.CompileRequest;
import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.service.CompileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/compile")
@RequiredArgsConstructor
public class CompileController {

    private final CompileService compileService;

    @PostMapping
    public ResponseEntity<CompileResponse> compile(@Valid @RequestBody CompileRequest request) {
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/tokens")
    public ResponseEntity<CompileResponse> compileTokens(@Valid @RequestBody CompileRequest request) {
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/ast")
    public ResponseEntity<CompileResponse> compileAst(@Valid @RequestBody CompileRequest request) {
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/semantic")
    public ResponseEntity<CompileResponse> compileSemantic(@Valid @RequestBody CompileRequest request) {
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/bytecode")
    public ResponseEntity<CompileResponse> compileBytecode(@Valid @RequestBody CompileRequest request) {
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput());
        return ResponseEntity.ok(response);
    }
}
