package com.compilervisualizer.controller;

import com.compilervisualizer.dto.CompileRequest;
import com.compilervisualizer.dto.CompileResponse;
import com.compilervisualizer.service.CompileService;
import com.compilervisualizer.service.RateLimitGuard;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/compile")
@RequiredArgsConstructor
public class CompileController {

    private final CompileService compileService;
    private final RateLimitGuard rateLimitGuard;

    @PostMapping
    public ResponseEntity<CompileResponse> compile(@Valid @RequestBody CompileRequest request,
                                                   HttpServletRequest httpRequest) {
        rateLimitGuard.checkCompile(httpRequest);
        CompileResponse response = compileService.compileAndExecute(
            request.getSourceCode(), request.getInput(), request.getEntryClassName());
        return ResponseEntity.ok(response);
    }
}