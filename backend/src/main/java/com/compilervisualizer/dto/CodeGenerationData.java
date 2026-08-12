package com.compilervisualizer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Complete structured data for the code generation visualization.
 * Includes individual TAC instructions and basic block decomposition.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CodeGenerationData {

    /** Fully qualified class name (or just class name if default package). */
    private String className;

    /** Package name, or empty string for default package. */
    private String packageName;

    /** All TAC instructions in order. */
    private List<TacInstruction> instructions;

    /** Basic blocks built from the instructions. */
    private List<BasicBlockInfo> basicBlocks;

    /** Summary counts. */
    private int totalInstructions;
    private int totalBlocks;
    private int totalEdges;
}
