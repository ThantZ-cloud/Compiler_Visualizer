package com.compilervisualizer.controller;

import com.compilervisualizer.dto.FolderRequest;
import com.compilervisualizer.dto.FolderResponse;
import com.compilervisualizer.service.FolderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/folders")
@RequiredArgsConstructor
public class FolderController {

    private final FolderService folderService;

    @PostMapping
    public ResponseEntity<FolderResponse> createFolder(
            Authentication authentication,
            @Valid @RequestBody FolderRequest request) {
        return ResponseEntity.ok(folderService.createFolder(authentication.getName(), request));
    }

    @GetMapping
    public ResponseEntity<List<FolderResponse>> getFolders(Authentication authentication) {
        return ResponseEntity.ok(folderService.getFolders(authentication.getName()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FolderResponse> renameFolder(
            Authentication authentication,
            @PathVariable Long id,
            @Valid @RequestBody FolderRequest request) {
        return ResponseEntity.ok(folderService.renameFolder(authentication.getName(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFolder(
            Authentication authentication,
            @PathVariable Long id) {
        folderService.deleteFolder(authentication.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
