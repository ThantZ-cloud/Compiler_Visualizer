package com.compilervisualizer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompileResponse {

    private List<TokenDto> tokens;
    private String tokenError;

    private String astJson;
    private String astError;

    private String symbolTableJson;
    private String symbolTableError;

    private String tacJson;
    private String tacError;

    private String bytecode;
    private String compilationError;

    private String cfgJson;
    private String cfgError;
    private Long cfgTimeMs;

    private String executionOutput;
    private String executionError;
    private Integer exitCode;

    private String error;       // legacy: first error encountered (for backward compat)
    private Long compilationTimeMs;

    // Per-phase timing (ms)
    private Long tokenTimeMs;
    private Long astTimeMs;
    private Long symbolTableTimeMs;
    private Long tacTimeMs;
    private Long bytecodeTimeMs;
    private Long executionTimeMs;

    // Multi-class support
    private List<ClassInfo> classes;
    private Map<String, String> allBytecode;

    /**
     * Metadata about a class detected in the source code.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ClassInfo {
        private String name;
        private boolean hasMain;
        private boolean isPublic;
    }
}
