package com.compilervisualizer.service;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RateLimiterTest {

    private final RateLimiter rateLimiter = new RateLimiter();

    @Test
    void allowsUpToMaxRequestsInWindow() {
        for (int i = 0; i < 10; i++) {
            assertTrue(rateLimiter.tryAcquire("ip-1"), "request " + (i + 1) + " should be allowed");
        }
        assertFalse(rateLimiter.tryAcquire("ip-1"), "11th request in window should be rejected");
    }

    @Test
    void differentKeysAreIndependent() {
        for (int i = 0; i < 10; i++) {
            rateLimiter.tryAcquire("ip-a");
        }
        assertTrue(rateLimiter.tryAcquire("ip-b"), "different key should not be rate limited");
    }

    @Test
    void customWindowAndLimit() {
        // 3 allowed per 60s window
        assertTrue(rateLimiter.tryAcquire("register:ip", 3, 60));
        assertTrue(rateLimiter.tryAcquire("register:ip", 3, 60));
        assertTrue(rateLimiter.tryAcquire("register:ip", 3, 60));
        assertFalse(rateLimiter.tryAcquire("register:ip", 3, 60));
    }
}
