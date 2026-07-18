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

    @PostMapping
    public ResponseEntity<SavedCodeResponse> saveCode(
            Authentication authentication,
            @Valid @RequestBody SaveCodeRequest request) {
        SavedCodeResponse response = codeService.saveCode(authentication.getName(), request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/saved")
    public ResponseEntity<List<SavedCodeResponse>> getSavedCodes(
            Authentication authentication,
            @RequestParam(required = false) Long folderId) {
        List<SavedCodeResponse> response;
        if (folderId != null) {
            response = codeService.getSavedCodesByFolder(authentication.getName(), folderId);
        } else {
            response = codeService.getSavedCodes(authentication.getName());
        }
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<SavedCodeResponse> getSavedCode(
            Authentication authentication,
            @PathVariable Long id) {
        SavedCodeResponse response = codeService.getSavedCode(authentication.getName(), id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SavedCodeResponse> updateSavedCode(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody SaveCodeRequest request) {
        SavedCodeResponse response = codeService.updateSavedCode(authentication.getName(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavedCode(
            Authentication authentication,
            @PathVariable Long id) {
        codeService.deleteSavedCode(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
