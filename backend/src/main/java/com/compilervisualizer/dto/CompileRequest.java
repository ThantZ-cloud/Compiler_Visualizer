package com.compilervisualizer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
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
    @Size(max = 50000, message = "Source code too large (max 50,000 characters)")
    private String sourceCode;

    private String input;  // optional stdin for execution
}
