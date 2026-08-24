package com.compilervisualizer.controller;

import com.compilervisualizer.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/health")
@RequiredArgsConstructor
public class HealthController {

    private final UserRepository userRepository;

    @GetMapping
    public ResponseEntity<Map<String, Object>> health() {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("status", "up");
        body.put("db", "up");
        try {
            userRepository.count();
        } catch (Exception e) {
            body.put("status", "degraded");
            body.put("db", "down");
            body.put("dbError", e.getMessage());
        }
        return ResponseEntity.ok(body);
    }
}
