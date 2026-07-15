package com.compilervisualizer.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompileRequest {

    @NotBlank(message = "Source code is required")
    private String sourceCode;

    private String input;  // optional stdin for execution
}
