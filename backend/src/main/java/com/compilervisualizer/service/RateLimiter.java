package com.compilervisualizer.service;

import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;

@Service
public class RateLimiter {

    private static final int MAX_REQUESTS = 10;
    private static final long WINDOW_MS = 60_000; // 1 minute

    private final ConcurrentHashMap<String, long[]> requests = new ConcurrentHashMap<>();

    public boolean tryAcquire(String key) {
        long now = System.currentTimeMillis();
        long[] timestamps = requests.compute(key, (k, v) -> {
            if (v == null) return new long[]{now};

            // Remove expired entries
            int count = 0;
            for (long ts : v) {
                if (now - ts < WINDOW_MS) count++;
            }

            if (count >= MAX_REQUESTS) return v;

            long[] updated = new long[count + 1];
            int i = 0;
            for (long ts : v) {
                if (now - ts < WINDOW_MS) updated[i++] = ts;
            }
            updated[i] = now;
            return updated;
        });

        int count = 0;
        for (long ts : timestamps) {
            if (now - ts < WINDOW_MS) count++;
        }
        return count <= MAX_REQUESTS;
    }
}
