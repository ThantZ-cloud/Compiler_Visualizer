package com.compilervisualizer.service;

import com.compilervisualizer.dto.SaveCodeRequest;
import com.compilervisualizer.dto.SavedCodeResponse;
import com.compilervisualizer.model.Folder;
import com.compilervisualizer.model.SavedCode;
import com.compilervisualizer.model.User;
import com.compilervisualizer.repository.FolderRepository;
import com.compilervisualizer.repository.SavedCodeRepository;
import com.compilervisualizer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CodeService {

    private final SavedCodeRepository savedCodeRepository;
    private final UserRepository userRepository;
    private final FolderRepository folderRepository;

    public SavedCodeResponse saveCode(String username, SaveCodeRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Folder folder = null;
        if (request.getFolderId() != null) {
            folder = folderRepository.findByIdAndUserId(request.getFolderId(), user.getId())
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
        }

        SavedCode savedCode = SavedCode.builder()
                .user(user)
                .folder(folder)
                .title(request.getTitle())
                .sourceCode(request.getSourceCode())
                .build();

        savedCodeRepository.save(savedCode);

        return mapToResponse(savedCode);
    }

    public List<SavedCodeResponse> getSavedCodes(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return savedCodeRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SavedCodeResponse> getSavedCodesByFolder(String username, Long folderId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return savedCodeRepository.findByUserIdAndFolderIdOrderByCreatedAtDesc(user.getId(), folderId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<SavedCodeResponse> getUnfiledCodes(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return savedCodeRepository.findByUserIdAndFolderIsNullOrderByCreatedAtDesc(user.getId())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public SavedCodeResponse getSavedCode(String username, Long id) {
        SavedCode savedCode = savedCodeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Saved code not found"));

        if (!savedCode.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized access");
        }

        return mapToResponse(savedCode);
    }

    public SavedCodeResponse updateSavedCode(String username, Long id, SaveCodeRequest request) {
        SavedCode savedCode = savedCodeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Saved code not found"));

        if (!savedCode.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized access");
        }

        savedCode.setTitle(request.getTitle());
        savedCode.setSourceCode(request.getSourceCode());

        if (request.getFolderId() != null) {
            Folder folder = folderRepository.findByIdAndUserId(request.getFolderId(), savedCode.getUser().getId())
                    .orElseThrow(() -> new RuntimeException("Folder not found"));
            savedCode.setFolder(folder);
        } else {
            savedCode.setFolder(null);
        }

        savedCodeRepository.save(savedCode);
        return mapToResponse(savedCode);
    }

    public void deleteSavedCode(String username, Long id) {
        SavedCode savedCode = savedCodeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Saved code not found"));

        if (!savedCode.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized access");
        }

        savedCodeRepository.delete(savedCode);
    }

    private SavedCodeResponse mapToResponse(SavedCode savedCode) {
        return SavedCodeResponse.builder()
                .id(savedCode.getId())
                .title(savedCode.getTitle())
                .sourceCode(savedCode.getSourceCode())
                .folderId(savedCode.getFolder() != null ? savedCode.getFolder().getId() : null)
                .createdAt(savedCode.getCreatedAt())
                .updatedAt(savedCode.getUpdatedAt())
                .build();
    }
}
