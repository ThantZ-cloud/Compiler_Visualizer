package com.compilervisualizer.service;

import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class RateLimiter {

    public static final int WINDOW_SECONDS = 60;
    private static final int MAX_REQUESTS = 10;
    // Purge keys that have gone idle past this threshold to avoid unbounded growth.
    private static final long MAX_IDLE_MS = 10 * 60_000L;

    private final ConcurrentHashMap<String, long[]> requests = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key) {
        return tryAcquire(key, MAX_REQUESTS, WINDOW_SECONDS);
    }

    public boolean tryAcquire(String key, int maxRequests, int windowSeconds) {
        long now = System.currentTimeMillis();
        long windowMs = windowSeconds * 1000L;
        AtomicBoolean allowed = new AtomicBoolean(false);

        requests.compute(key, (k, v) -> {
            long[] recent = new long[16];
            int count = 0;
            if (v != null) {
                for (long ts : v) {
                    if (now - ts < windowMs) {
                        if (count == recent.length) recent = Arrays.copyOf(recent, recent.length * 2);
                        recent[count++] = ts;
                    }
                }
            }

            if (count >= maxRequests) {
                allowed.set(false);
                return Arrays.copyOf(recent, count);
            }

            long[] updated = Arrays.copyOf(recent, count + 1);
            updated[count] = now;
            allowed.set(true);
            return updated;
        });

        maybePurgeIdleKeys(now);
        return allowed.get();
    }

    private void maybePurgeIdleKeys(long now) {
        if (requests.size() < 1000) {
            return;
        }
        requests.entrySet().removeIf(e -> {
            long[] ts = e.getValue();
            for (long t : ts) {
                if (now - t < MAX_IDLE_MS) {
                    return false;
                }
            }
            return true;
        });
    }
}