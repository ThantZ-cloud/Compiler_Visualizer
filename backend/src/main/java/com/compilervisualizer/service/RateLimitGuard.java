package com.compilervisualizer.service;

import com.compilervisualizer.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/**
 * Centralizes the per-IP rate-limit guard used by controllers, raising a
 * {@link RateLimitExceededException} instead of hand-building error responses.
 */
@Component
@RequiredArgsConstructor
public class RateLimitGuard {

    public static final int MAX_COMPILES_PER_MINUTE = 10;
    public static final int MAX_LOGINS_PER_MINUTE = 5;
    public static final int MAX_REGISTRATIONS_PER_MINUTE = 3;

    private final RateLimiter rateLimiter;

    public void checkCompile(HttpServletRequest request) {
        acquire(request.getRemoteAddr(), MAX_COMPILES_PER_MINUTE, RateLimiter.WINDOW_SECONDS,
            "Rate limit exceeded. Max " + MAX_COMPILES_PER_MINUTE + " compiles per minute.");
    }

    public void checkLogin(HttpServletRequest request) {
        acquire("login:" + request.getRemoteAddr(), MAX_LOGINS_PER_MINUTE, RateLimiter.WINDOW_SECONDS,
            "Too many login attempts. Please try again later.");
    }

    public void checkRegister(HttpServletRequest request) {
        acquire("register:" + request.getRemoteAddr(), MAX_REGISTRATIONS_PER_MINUTE, RateLimiter.WINDOW_SECONDS,
            "Too many registration attempts. Please try again later.");
    }

    private void acquire(String key, int maxRequests, int windowSeconds, String message) {
        if (!rateLimiter.tryAcquire(key, maxRequests, windowSeconds)) {
            throw new RateLimitExceededException(message);
        }
    }
}