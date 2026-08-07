package com.compilervisualizer.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
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

    @Size(max = 100000, message = "Input too large (max 100,000 characters)")
    private String input;  // optional stdin for execution

    @Size(max = 255, message = "Class name too long")
    @Pattern(regexp = "[A-Za-z_$][A-Za-z0-9_$]*", message = "Invalid class name")
    private String entryClassName;  // optional: which class to execute (auto-detected if null)
}
