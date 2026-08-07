package com.compilervisualizer.service;

import com.compilervisualizer.dto.CompileResponse;
import org.springframework.stereotype.Service;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Thread-safe LRU cache for compile results keyed by source code + stdin.
 * Evicts the least-recently-inserted entry when full (insertion-order LRU).
 */
@Service
public class CompileResultCache {

    private static final int MAX_CACHE_SIZE = 128;

    private final Map<String, CompileResponse> cache = new LinkedHashMap<>(MAX_CACHE_SIZE + 1, 0.75f, false) {
        @Override
        protected boolean removeEldestEntry(Map.Entry<String, CompileResponse> eldest) {
            return size() > MAX_CACHE_SIZE;
        }
    };

    public synchronized CompileResponse get(String key) {
        return cache.get(key);
    }

    public synchronized void put(String key, CompileResponse response) {
        cache.put(key, response);
    }

    public synchronized void clear() {
        cache.clear();
    }

    public synchronized int size() {
        return cache.size();
    }
}
