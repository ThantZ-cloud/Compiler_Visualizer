package com.compilervisualizer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * A single three-address code instruction.
 * Each instruction has at most three operands: result = arg1 operator arg2.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TacInstruction {

    /** TAC line number (0-based). */
    private int line;

    /** Operation category: assign, add, sub, mul, div, mod, neg,
     *  goto, if, iffalse, label, invokevirtual, getstatic, ldc, return */
    private String op;

    /** Destination variable (e.g. "t0", "sum"), or null for labels/gotos. */
    private String result;

    /** First operand (e.g. variable name, literal, "System.out"). */
    private String arg1;

    /** Binary operator (e.g. "+", "*", "<="), or null. */
    private String operator;

    /** Second operand, or null for unary/label/return instructions. */
    private String arg2;

    /** Goto/if target label (e.g. "L3"), or null. */
    private String target;

    /** Source code comment from the original Java line. */
    private String comment;

    /** Original source line number (0-based, -1 if no mapping). */
    private int sourceLine;
}
