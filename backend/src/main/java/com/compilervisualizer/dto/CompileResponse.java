package com.compilervisualizer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

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

    private String bytecode;
    private String compilationError;

    private String executionOutput;
    private String executionError;
    private Integer exitCode;

    private String error;       // legacy: first error encountered (for backward compat)
    private Long compilationTimeMs;

    // Per-phase timing (ms)
    private Long tokenTimeMs;
    private Long astTimeMs;
    private Long symbolTableTimeMs;
    private Long bytecodeTimeMs;
    private Long executionTimeMs;
}
