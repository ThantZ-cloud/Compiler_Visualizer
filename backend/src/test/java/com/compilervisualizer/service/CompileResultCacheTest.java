package com.compilervisualizer.service;

import com.compilervisualizer.dto.CompileResponse;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class CompileResultCacheTest {

    private final CompileResultCache cache = new CompileResultCache();

    private CompileResponse response(int n) {
        return CompileResponse.builder().error("response-" + n).build();
    }

    @Test
    void storesAndRetrievesByKey() {
        cache.put("a", response(1));
        assertEquals("response-1", cache.get("a").getError());
        assertNull(cache.get("missing"));
    }

    @Test
    void evictsEldestWhenFull() {
        // Fill past the 128-entry cap
        for (int i = 0; i < 129; i++) {
            cache.put("key-" + i, response(i));
        }
        assertEquals(128, cache.size());
        assertNull(cache.get("key-0"), "oldest entry should be evicted");
        assertNotNull(cache.get("key-128"), "newest entry should survive");
    }
}
