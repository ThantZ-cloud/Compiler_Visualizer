package com.compilervisualizer.service;

import com.compilervisualizer.dto.FolderRequest;
import com.compilervisualizer.dto.FolderResponse;
import com.compilervisualizer.model.Folder;
import com.compilervisualizer.model.User;
import com.compilervisualizer.repository.FolderRepository;
import com.compilervisualizer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FolderService {

    private final FolderRepository folderRepository;
    private final UserRepository userRepository;

    public FolderResponse createFolder(String username, FolderRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Folder.FolderBuilder builder = Folder.builder()
            .user(user)
            .name(request.getName());

        if (request.getParentId() != null) {
            Folder parent = folderRepository.findByIdAndUserId(request.getParentId(), user.getId())
                .orElseThrow(() -> new RuntimeException("Parent folder not found"));
            builder.parent(parent);
        }

        Folder folder = folderRepository.save(builder.build());
        return mapToResponse(folder);
    }

    public List<FolderResponse> getFolders(String username) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        return folderRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(this::mapToResponse)
            .collect(Collectors.toList());
    }

    public FolderResponse renameFolder(String username, Long folderId, FolderRequest request) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Folder folder = folderRepository.findByIdAndUserId(folderId, user.getId())
            .orElseThrow(() -> new RuntimeException("Folder not found"));

        folder.setName(request.getName());
        folder = folderRepository.save(folder);
        return mapToResponse(folder);
    }

    public void deleteFolder(String username, Long folderId) {
        User user = userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"));

        Folder folder = folderRepository.findByIdAndUserId(folderId, user.getId())
            .orElseThrow(() -> new RuntimeException("Folder not found"));

        folderRepository.delete(folder);
    }

    private FolderResponse mapToResponse(Folder folder) {
        return FolderResponse.builder()
            .id(folder.getId())
            .name(folder.getName())
            .parentId(folder.getParent() != null ? folder.getParent().getId() : null)
            .createdAt(folder.getCreatedAt())
            .updatedAt(folder.getUpdatedAt())
            .build();
    }
}
