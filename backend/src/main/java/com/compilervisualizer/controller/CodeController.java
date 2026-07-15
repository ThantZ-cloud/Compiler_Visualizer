package com.compilervisualizer.controller;

import com.compilervisualizer.dto.SaveCodeRequest;
import com.compilervisualizer.dto.SavedCodeResponse;
import com.compilervisualizer.service.CodeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/code")
@RequiredArgsConstructor
public class CodeController {

    private final CodeService codeService;

    @PostMapping("/save")
    public ResponseEntity<SavedCodeResponse> saveCode(
            Authentication authentication,
            @Valid @RequestBody SaveCodeRequest request) {
        SavedCodeResponse response = codeService.saveCode(authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/saved")
    public ResponseEntity<List<SavedCodeResponse>> getSavedCodes(Authentication authentication) {
        List<SavedCodeResponse> response = codeService.getSavedCodes(authentication.getName());
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SavedCodeResponse> getSavedCode(
            Authentication authentication,
            @PathVariable Long id) {
        SavedCodeResponse response = codeService.getSavedCode(authentication.getName(), id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedCode(
            Authentication authentication,
            @PathVariable Long id) {
        codeService.deleteSavedCode(authentication.getName(), id);
        return ResponseEntity.ok().build();
    }
}
