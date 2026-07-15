package com.compilervisualizer.controller;

import com.compilervisualizer.dto.AuthResponse;
import com.compilervisualizer.dto.LoginRequest;
import com.compilervisualizer.dto.RegisterRequest;
import com.compilervisualizer.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request) {
        AuthResponse response = authService.register(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    public ResponseEntity<AuthResponse> getCurrentUser(Authentication authentication) {
        // The authentication object contains the current user info
        String username = authentication.getName();
        return ResponseEntity.ok(AuthResponse.builder()
                .username(username)
                .tokenType("Bearer")
                .build());
    }
}
