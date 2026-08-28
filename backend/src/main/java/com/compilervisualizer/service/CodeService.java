package com.compilervisualizer.service;

import com.compilervisualizer.dto.PaginatedResponse;
import com.compilervisualizer.dto.SaveCodeRequest;
import com.compilervisualizer.dto.SavedCodeResponse;
import com.compilervisualizer.exception.AccessDeniedException;
import com.compilervisualizer.exception.NotFoundException;
import com.compilervisualizer.model.SavedCode;
import com.compilervisualizer.model.User;
import com.compilervisualizer.repository.SavedCodeRepository;
import com.compilervisualizer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CodeService {

    private final SavedCodeRepository savedCodeRepository;
    private final UserRepository userRepository;

    @Transactional
    public SavedCodeResponse saveCode(String email, SaveCodeRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new NotFoundException("User not found"));

        SavedCode savedCode = SavedCode.builder()
                .user(user)
                .title(request.getTitle())
                .sourceCode(request.getSourceCode())
                .build();

        savedCodeRepository.save(savedCode);
        return mapToResponse(savedCode);
    }

    @Transactional(readOnly = true)
    public PaginatedResponse<SavedCodeResponse> getSavedCodes(String email, int page, int size) {
        // Clamp page size between 1 and 100
        size = Math.max(1, Math.min(size, 100));

        Pageable pageable = PageRequest.of(page, size);
        Page<SavedCode> savedCodePage = savedCodeRepository
                .findByUserEmailOrderByUpdatedAtDesc(email, pageable);

        List<SavedCodeResponse> data = savedCodePage.getContent()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());

        return PaginatedResponse.<SavedCodeResponse>builder()
                .data(data)
                .page(savedCodePage.getNumber())
                .size(savedCodePage.getSize())
                .totalElements(savedCodePage.getTotalElements())
                .totalPages(savedCodePage.getTotalPages())
                .build();
    }

    @Transactional(readOnly = true)
    public SavedCodeResponse getSavedCode(String email, Long id) {
        SavedCode savedCode = getOwnedSavedCode(email, id);
        return mapToResponse(savedCode);
    }

    @Transactional
    public SavedCodeResponse updateSavedCode(String email, Long id, SaveCodeRequest request) {
        SavedCode savedCode = getOwnedSavedCode(email, id);

        savedCode.setTitle(request.getTitle());
        savedCode.setSourceCode(request.getSourceCode());
        savedCodeRepository.save(savedCode);
        return mapToResponse(savedCode);
    }

    @Transactional
    public void deleteSavedCode(String email, Long id) {
        SavedCode savedCode = getOwnedSavedCode(email, id);
        savedCodeRepository.delete(savedCode);
    }

    private SavedCode getOwnedSavedCode(String email, Long id) {
        SavedCode savedCode = savedCodeRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Saved code not found"));

        if (!savedCode.getUser().getEmail().equals(email)) {
            throw new AccessDeniedException("Unauthorized access");
        }
        return savedCode;
    }

    private SavedCodeResponse mapToResponse(SavedCode savedCode) {
        return SavedCodeResponse.builder()
                .id(savedCode.getId())
                .title(savedCode.getTitle())
                .sourceCode(savedCode.getSourceCode())
                .createdAt(savedCode.getCreatedAt())
                .updatedAt(savedCode.getUpdatedAt())
                .build();
    }
}