package com.compilervisualizer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * A basic block in the control flow graph built from TAC instructions.
 * A basic block has a single entry point and a single exit point.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BasicBlockInfo {

    /** Block index (0-based). */
    private int id;

    /** Label name if the block starts with a label (e.g. "L0"), or null. */
    private String label;

    /** Block type: entry, exit, normal, branch, loop, merge. */
    private String type;

    /** Indices into the TacInstruction list belonging to this block. */
    private List<Integer> instructions;

    /** Outgoing edges from this block. */
    private List<EdgeInfo> edges;

    /**
     * A control flow edge between two basic blocks.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EdgeInfo {
        /** Target block id. */
        private int targetBlockId;

        /** Edge kind: fallthrough, branch_true, branch_false, loop_back. */
        private String kind;

        /** Condition label text (e.g. "if t2 < 10"), or null for unconditional. */
        private String label;
    }
}
