package com.compilervisualizer.service;

import com.compilervisualizer.dto.BasicBlockInfo;
import com.compilervisualizer.dto.BasicBlockInfo.EdgeInfo;
import com.compilervisualizer.dto.CodeGenerationData;
import com.compilervisualizer.dto.TacInstruction;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Walks a JavaParser AST and generates Three-Address Code (TAC).
 * Each instruction has at most three operands: result = op1 operator op2.
 *
 * Provides both legacy text output ({@link #generate}) and
 * structured output ({@link #generateStructured}) for the visualization pipeline.
 */
public class TacGenerator {

    /**
     * Generate TAC from a parsed CompilationUnit.
     * Returns a formatted string with line-numbered instructions.
     */
    public static String generate(CompilationUnit cu) {
        try {
            List<String> instructions = new ArrayList<>();
            AtomicInteger tempCounter = new AtomicInteger(0);

            cu.accept(new TacVisitor(instructions, tempCounter), null);

            StringBuilder sb = new StringBuilder();
            sb.append("// Three-Address Code\n");
            sb.append("// Generated from: ");
            cu.getPackageDeclaration().ifPresentOrElse(
                pd -> sb.append(pd.getNameAsString()).append("."),
                () -> sb.append("(default package).")
            );
            cu.findFirst(ClassOrInterfaceDeclaration.class).ifPresent(
                cid -> sb.append(cid.getNameAsString())
            );
            sb.append("\n\n");

            int lineNum = 0;
            for (String instr : instructions) {
                if (instr.startsWith("//") || instr.isBlank()) {
                    sb.append(instr).append("\n");
                } else {
                    sb.append(String.format("%3d: %s%n", lineNum++, instr));
                }
            }

            return sb.toString();
        } catch (Exception e) {
            return "// Error generating TAC: " + e.getMessage();
        }
    }

    /**
     * Generate structured TAC data for the code generation visualization.
     * Returns individual instructions and basic block decomposition.
     */
    public static CodeGenerationData generateStructured(CompilationUnit cu) {
        try {
            // Resolve class and package info
            String packageName = cu.getPackageDeclaration()
                .map(pd -> pd.getNameAsString())
                .orElse("");
            String className = cu.findFirst(ClassOrInterfaceDeclaration.class)
                .map(ClassOrInterfaceDeclaration::getNameAsString)
                .orElse("Unknown");

            // Generate structured instructions
            List<TacInstruction> instructions = new ArrayList<>();
            AtomicInteger tempCounter = new AtomicInteger(0);

            cu.accept(new StructuredTacVisitor(instructions, tempCounter), null);

            // Build basic blocks from instructions
            List<BasicBlockInfo> blocks = buildBasicBlocks(instructions);

            int totalEdges = blocks.stream()
                .mapToInt(b -> b.getEdges().size())
                .sum();

            return CodeGenerationData.builder()
                .className(className)
                .packageName(packageName)
                .instructions(instructions)
                .basicBlocks(blocks)
                .totalInstructions(instructions.size())
                .totalBlocks(blocks.size())
                .totalEdges(totalEdges)
                .build();
        } catch (Exception e) {
            return CodeGenerationData.builder()
                .className("Unknown")
                .packageName("")
                .instructions(List.of())
                .basicBlocks(List.of())
                .totalInstructions(0)
                .totalBlocks(0)
                .totalEdges(0)
                .build();
        }
    }

    // ─── Basic Block Builder ───────────────────────────────────────────

    /**
     * Splits a flat list of TAC instructions into basic blocks.
     * A new block starts at: the first instruction, any label, and after any
     * control flow instruction (if, iffalse, goto, return).
     */
    private static List<BasicBlockInfo> buildBasicBlocks(List<TacInstruction> instructions) {
        if (instructions.isEmpty()) return List.of();

        // Step 1: Identify block start indices
        Set<Integer> blockStarts = new LinkedHashSet<>();
        blockStarts.add(0);

        for (int i = 0; i < instructions.size(); i++) {
            TacInstruction instr = instructions.get(i);
            String op = instr.getOp();

            // Labels always start a new block
            if ("label".equals(op)) {
                blockStarts.add(i);
            }

            // Control flow instructions end the current block; the next instruction starts a new one
            if (("if".equals(op) || "iffalse".equals(op) || "goto".equals(op) || "return".equals(op))
                && i + 1 < instructions.size()) {
                blockStarts.add(i + 1);
            }
        }

        // Step 2: Build block ranges
        List<Integer> startsList = new ArrayList<>(blockStarts);
        List<BasicBlockInfo> blocks = new ArrayList<>();

        for (int blockIdx = 0; blockIdx < startsList.size(); blockIdx++) {
            int start = startsList.get(blockIdx);
            int end = (blockIdx + 1 < startsList.size()) ? startsList.get(blockIdx + 1) : instructions.size();

            List<Integer> instrIndices = new ArrayList<>();
            for (int i = start; i < end; i++) {
                instrIndices.add(i);
            }

            // Determine block label and type
            String label = null;
            String type = "normal";
            TacInstruction firstInstr = instructions.get(start);

            if ("label".equals(firstInstr.getOp())) {
                label = firstInstr.getResult();
                type = "normal";
            }
            if (blockIdx == 0) {
                type = "entry";
            }

            // Check if last instruction is a branch/return
            TacInstruction lastInstr = instructions.get(end - 1);
            if ("return".equals(lastInstr.getOp())) {
                type = "exit";
            } else if ("if".equals(lastInstr.getOp()) || "iffalse".equals(lastInstr.getOp())) {
                type = "branch";
            } else if ("goto".equals(lastInstr.getOp())) {
                // Goto at end could be loop-back or fall-through
                type = "normal";
            }

            blocks.add(BasicBlockInfo.builder()
                .id(blockIdx)
                .label(label)
                .type(type)
                .instructions(instrIndices)
                .edges(new ArrayList<>())
                .build());
        }

        // Step 3: Build edges by scanning last instruction of each block
        Map<String, Integer> labelToBlockId = new HashMap<>();
        for (BasicBlockInfo block : blocks) {
            if (block.getLabel() != null) {
                labelToBlockId.put(block.getLabel(), block.getId());
            }
        }

        for (BasicBlockInfo block : blocks) {
            if (block.getInstructions().isEmpty()) continue;

            int lastIdx = block.getInstructions().get(block.getInstructions().size() - 1);
            TacInstruction lastInstr = instructions.get(lastIdx);

            switch (lastInstr.getOp()) {
                case "if" -> {
                    // Conditional branch: falls through to next block AND branches to target
                    int targetBlockId = labelToBlockId.getOrDefault(lastInstr.getTarget(), block.getId() + 1);
                    block.getEdges().add(EdgeInfo.builder()
                        .targetBlockId(targetBlockId)
                        .kind("branch_true")
                        .label(lastInstr.getArg1())
                        .build());
                    if (block.getId() + 1 < blocks.size() && block.getId() + 1 != targetBlockId) {
                        block.getEdges().add(EdgeInfo.builder()
                            .targetBlockId(block.getId() + 1)
                            .kind("fallthrough")
                            .label(null)
                            .build());
                    }
                }
                case "iffalse" -> {
                    // Inverted conditional: falls through (condition true) OR branches (condition false)
                    int targetBlockId = labelToBlockId.getOrDefault(lastInstr.getTarget(), block.getId() + 1);
                    block.getEdges().add(EdgeInfo.builder()
                        .targetBlockId(targetBlockId)
                        .kind("branch_false")
                        .label(lastInstr.getArg1())
                        .build());
                    if (block.getId() + 1 < blocks.size() && block.getId() + 1 != targetBlockId) {
                        block.getEdges().add(EdgeInfo.builder()
                            .targetBlockId(block.getId() + 1)
                            .kind("fallthrough")
                            .label(null)
                            .build());
                    }
                }
                case "goto" -> {
                    int targetBlockId = labelToBlockId.getOrDefault(lastInstr.getTarget(), block.getId() + 1);
                    String kind = (targetBlockId <= block.getId()) ? "loop_back" : "goto";
                    block.getEdges().add(EdgeInfo.builder()
                        .targetBlockId(targetBlockId)
                        .kind(kind)
                        .label(null)
                        .build());
                }
                default -> {
                    // Fall-through to next block
                    if (block.getId() + 1 < blocks.size()) {
                        block.getEdges().add(EdgeInfo.builder()
                            .targetBlockId(block.getId() + 1)
                            .kind("fallthrough")
                            .label(null)
                            .build());
                    }
                }
            }
        }

        // Mark loop blocks (blocks with loop_back edges)
        for (BasicBlockInfo block : blocks) {
            boolean hasLoopBack = block.getEdges().stream()
                .anyMatch(e -> "loop_back".equals(e.getKind()));
            if (hasLoopBack && "normal".equals(block.getType())) {
                block.setType("loop");
            }
        }

        return blocks;
    }

    // ─── Structured TAC Visitor ────────────────────────────────────────

    /**
     * Visitor that produces structured TacInstruction objects.
     */
    private static class StructuredTacVisitor extends VoidVisitorAdapter<Void> {
        private final List<TacInstruction> instructions;
        private final AtomicInteger tempCounter;
        private String currentComment = null;

        StructuredTacVisitor(List<TacInstruction> instructions, AtomicInteger tempCounter) {
            this.instructions = instructions;
            this.tempCounter = tempCounter;
        }

        private String newTemp() {
            return "t" + tempCounter.getAndIncrement();
        }

        private int getSourceLine(Node node) {
            return node.getBegin().map(b -> b.line - 1).orElse(-1); // 0-based
        }

        private void emit(String op, String result, String arg1, String operator, String arg2,
                          String target, String comment, int sourceLine) {
            instructions.add(TacInstruction.builder()
                .line(instructions.size())
                .op(op)
                .result(result)
                .arg1(arg1)
                .operator(operator)
                .arg2(arg2)
                .target(target)
                .comment(comment)
                .sourceLine(sourceLine)
                .build());
        }

        private void emitLabel(String label, int sourceLine) {
            emit("label", label, null, null, null, null, null, sourceLine);
        }

        @Override
        public void visit(MethodDeclaration md, Void arg) {
            String params = md.getParameters().stream()
                .map(p -> p.getTypeAsString() + " " + p.getNameAsString())
                .reduce((a, b) -> a + ", " + b)
                .orElse("");

            String comment = "// Method: " + md.getTypeAsString() + " " + md.getNameAsString() + "(" + params + ")";
            emit("method_start", md.getNameAsString(), params, null, null, null, comment, getSourceLine(md));
            super.visit(md, arg);
            emit("method_end", null, null, null, null, null, null, getSourceLine(md));
        }

        @Override
        public void visit(ExpressionStmt stmt, Void arg) {
            stmt.getExpression().accept(this, arg);
        }

        @Override
        public void visit(MethodCallExpr mce, Void arg) {
            String methodName = mce.getNameAsString();

            // System.out.println(...) special case
            if (mce.getScope().isPresent()) {
                Expression scope = mce.getScope().get();
                if (scope instanceof FieldAccessExpr fae) {
                    if (fae.getScope().toString().equals("System") && fae.getNameAsString().equals("out")) {
                        String comment = "// " + mce.toString();
                        int srcLine = getSourceLine(mce);

                        String temp = newTemp();
                        emit("getstatic", temp, "System.out", null, "PrintStream", null, comment, srcLine);

                        String lastArg = temp;
                        for (Expression argExpr : mce.getArguments()) {
                            String argTemp = newTemp();
                            if (argExpr instanceof StringLiteralExpr sle) {
                                emit("ldc", argTemp, "\"" + sle.getValue() + "\"", null, null, null, null, srcLine);
                            } else if (argExpr instanceof IntegerLiteralExpr ile) {
                                emit("ldc", argTemp, ile.getValue(), null, null, null, null, srcLine);
                            } else if (argExpr instanceof DoubleLiteralExpr dle) {
                                emit("ldc", argTemp, dle.getValue(), null, null, null, null, srcLine);
                            } else {
                                String result = processExpression(argExpr, srcLine);
                                emit("assign", argTemp, result, null, null, null, null, srcLine);
                            }
                            lastArg = argTemp;
                        }

                        emit("invokevirtual", null, "PrintStream.println", null,
                            getArgTypes(mce), null, null, srcLine);
                        return;
                    }
                }
            }

            // Generic method call
            int srcLine = getSourceLine(mce);
            String comment = "// " + mce.toString();
            String temp = newTemp();
            List<String> argTemps = new ArrayList<>();
            for (Expression argExpr : mce.getArguments()) {
                argTemps.add(processExpression(argExpr, srcLine));
            }
            String args = String.join(", ", argTemps);
            emit("invokevirtual", temp, methodName, null, args, null, comment, srcLine);
        }

        @Override
        public void visit(VariableDeclarationExpr vde, Void arg) {
            int srcLine = getSourceLine(vde);
            for (VariableDeclarator vd : vde.getVariables()) {
                String name = vd.getNameAsString();
                if (vd.getInitializer().isPresent()) {
                    String initResult = processExpression(vd.getInitializer().get(), srcLine);
                    emit("assign", name, initResult, null, null, null, null, srcLine);
                } else {
                    emit("assign", name, "0", null, null, null, "// default value", srcLine);
                }
            }
        }

        @Override
        public void visit(ReturnStmt rs, Void arg) {
            int srcLine = getSourceLine(rs);
            if (rs.getExpression().isPresent()) {
                String result = processExpression(rs.getExpression().get(), srcLine);
                emit("return", null, result, null, null, null, null, srcLine);
            } else {
                emit("return", null, null, null, null, null, null, srcLine);
            }
        }

        @Override
        public void visit(IfStmt ifs, Void arg) {
            int srcLine = getSourceLine(ifs);
            String condition = processExpression(ifs.getCondition(), srcLine);
            String label = "L" + tempCounter.getAndIncrement();
            emit("if", null, condition, null, null, label, "// if (" + ifs.getCondition() + ")", srcLine);
            ifs.getThenStmt().accept(this, arg);
            if (ifs.getElseStmt().isPresent()) {
                String elseLabel = "L" + tempCounter.getAndIncrement();
                emit("goto", null, null, null, null, elseLabel, null, srcLine);
                emitLabel(label, srcLine);
                ifs.getElseStmt().get().accept(this, arg);
                emitLabel(elseLabel, srcLine);
            } else {
                emitLabel(label, srcLine);
            }
        }

        @Override
        public void visit(WhileStmt ws, Void arg) {
            int srcLine = getSourceLine(ws);
            String startLabel = "L" + tempCounter.getAndIncrement();
            String endLabel = "L" + tempCounter.getAndIncrement();
            emitLabel(startLabel, srcLine);
            String condition = processExpression(ws.getCondition(), srcLine);
            emit("iffalse", null, condition, null, null, endLabel, "// while (" + ws.getCondition() + ")", srcLine);
            ws.getBody().accept(this, arg);
            emit("goto", null, null, null, null, startLabel, null, srcLine);
            emitLabel(endLabel, srcLine);
        }

        @Override
        public void visit(ForStmt fs, Void arg) {
            int srcLine = getSourceLine(fs);
            String startLabel = "L" + tempCounter.getAndIncrement();
            String endLabel = "L" + tempCounter.getAndIncrement();

            // Init
            fs.getInitialization().forEach(init -> init.accept(this, arg));

            // Condition
            emitLabel(startLabel, srcLine);
            if (fs.getCompare().isPresent()) {
                String condition = processExpression(fs.getCompare().get(), srcLine);
                emit("iffalse", null, condition, null, null, endLabel,
                    "// for (" + fs.getCompare().orElse(null) + ")", srcLine);
            }

            // Body
            fs.getBody().accept(this, arg);

            // Update
            fs.getUpdate().forEach(update -> update.accept(this, arg));
            emit("goto", null, null, null, null, startLabel, null, srcLine);
            emitLabel(endLabel, srcLine);
        }

        /**
         * Process an expression and return the temp variable or literal holding its result.
         */
        private String processExpression(Expression expr, int srcLine) {
            if (expr instanceof StringLiteralExpr sle) {
                return "\"" + sle.getValue() + "\"";
            } else if (expr instanceof IntegerLiteralExpr ile) {
                return ile.getValue();
            } else if (expr instanceof DoubleLiteralExpr dle) {
                return dle.getValue();
            } else if (expr instanceof BooleanLiteralExpr ble) {
                return ble.getValue() ? "true" : "false";
            } else if (expr instanceof NameExpr ne) {
                return ne.getNameAsString();
            } else if (expr instanceof MethodCallExpr mce) {
                String temp = newTemp();
                if (mce.getScope().isPresent()) {
                    Expression scope = mce.getScope().get();
                    if (scope instanceof FieldAccessExpr fae) {
                        if (fae.getScope().toString().equals("System") && fae.getNameAsString().equals("out")) {
                            emit("getstatic", temp, "System.out", null, "PrintStream", null, null, srcLine);
                            for (Expression arg : mce.getArguments()) {
                                String argT = processExpression(arg, srcLine);
                                String argTemp = newTemp();
                                emit("assign", argTemp, argT, null, null, null, null, srcLine);
                                temp = argTemp;
                            }
                            emit("invokevirtual", null, "PrintStream.println", null,
                                getArgTypes(mce), null, null, srcLine);
                            return temp;
                        }
                    }
                }
                List<String> args = new ArrayList<>();
                for (Expression arg : mce.getArguments()) {
                    args.add(processExpression(arg, srcLine));
                }
                emit("invokevirtual", temp, mce.getNameAsString(), null,
                    String.join(", ", args), null, null, srcLine);
                return temp;
            } else if (expr instanceof BinaryExpr be) {
                String left = processExpression(be.getLeft(), srcLine);
                String right = processExpression(be.getRight(), srcLine);
                String temp = newTemp();
                emit("binary", temp, left, be.getOperator().asString(), right, null, null, srcLine);
                return temp;
            } else if (expr instanceof UnaryExpr ue) {
                String operand = processExpression(ue.getExpression(), srcLine);
                String temp = newTemp();
                emit("neg", temp, ue.getOperator().asString(), null, operand, null, null, srcLine);
                return temp;
            } else if (expr instanceof AssignExpr ae) {
                String target = ae.getTarget().toString();
                String value = processExpression(ae.getValue(), srcLine);
                emit("assign", target, value, null, null, null, null, srcLine);
                return target;
            } else if (expr instanceof FieldAccessExpr fae) {
                String scope = processExpression(fae.getScope(), srcLine);
                return scope + "." + fae.getNameAsString();
            } else if (expr instanceof ThisExpr) {
                return "this";
            } else {
                return expr.toString();
            }
        }

        private String getArgTypes(MethodCallExpr mce) {
            return mce.getArguments().stream()
                .map(arg -> {
                    if (arg instanceof StringLiteralExpr) return "String";
                    if (arg instanceof IntegerLiteralExpr) return "int";
                    if (arg instanceof DoubleLiteralExpr) return "double";
                    if (arg instanceof BooleanLiteralExpr) return "boolean";
                    return "Object";
                })
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
        }
    }

    // ─── Legacy Text Visitor (kept for backward compat) ────────────────

    private static class TacVisitor extends VoidVisitorAdapter<Void> {
        private final List<String> instructions;
        private final AtomicInteger tempCounter;

        TacVisitor(List<String> instructions, AtomicInteger tempCounter) {
            this.instructions = instructions;
            this.tempCounter = tempCounter;
        }

        private String newTemp() {
            return "t" + tempCounter.getAndIncrement();
        }

        @Override
        public void visit(MethodDeclaration md, Void arg) {
            String params = md.getParameters().stream()
                .map(p -> p.getTypeAsString() + " " + p.getNameAsString())
                .reduce((a, b) -> a + ", " + b)
                .orElse("");

            instructions.add("// Method: " + md.getModifiers() + " " + md.getTypeAsString()
                + " " + md.getNameAsString() + "(" + params + ")");
            instructions.add(md.getNameAsString() + "(" + params + ") {");
            instructions.add("");

            super.visit(md, arg);
            instructions.add("}");
            instructions.add("");
        }

        @Override
        public void visit(ExpressionStmt stmt, Void arg) {
            stmt.getExpression().accept(this, arg);
        }

        @Override
        public void visit(MethodCallExpr mce, Void arg) {
            String methodName = mce.getNameAsString();

            if (mce.getScope().isPresent()) {
                Expression scope = mce.getScope().get();
                if (scope instanceof FieldAccessExpr fae) {
                    if (fae.getScope().toString().equals("System") && fae.getNameAsString().equals("out")) {
                        String temp = newTemp();
                        instructions.add(temp + " = getstatic System.out : PrintStream");

                        for (Expression argExpr : mce.getArguments()) {
                            String argTemp = newTemp();
                            if (argExpr instanceof StringLiteralExpr sle) {
                                instructions.add(argTemp + " = ldc \"" + sle.getValue() + "\"");
                            } else if (argExpr instanceof IntegerLiteralExpr ile) {
                                instructions.add(argTemp + " = ldc " + ile.getValue());
                            } else if (argExpr instanceof DoubleLiteralExpr dle) {
                                instructions.add(argTemp + " = ldc " + dle.getValue());
                            } else {
                                String result = processExpression(argExpr);
                                instructions.add(argTemp + " = " + result);
                            }
                            temp = argTemp;
                        }

                        instructions.add("invokevirtual PrintStream.println(" + getArgTypes(mce) + ") : void");
                        return;
                    }
                }
            }

            String temp = newTemp();
            List<String> argTemps = new ArrayList<>();
            for (Expression argExpr : mce.getArguments()) {
                argTemps.add(processExpression(argExpr));
            }
            String args = String.join(", ", argTemps);
            instructions.add(temp + " = invokevirtual " + methodName + "(" + args + ")");
        }

        @Override
        public void visit(VariableDeclarationExpr vde, Void arg) {
            for (VariableDeclarator vd : vde.getVariables()) {
                String name = vd.getNameAsString();
                if (vd.getInitializer().isPresent()) {
                    String initResult = processExpression(vd.getInitializer().get());
                    instructions.add(name + " = " + initResult);
                } else {
                    instructions.add(name + " = 0 // default");
                }
            }
        }

        @Override
        public void visit(ReturnStmt rs, Void arg) {
            if (rs.getExpression().isPresent()) {
                String result = processExpression(rs.getExpression().get());
                instructions.add("return " + result);
            } else {
                instructions.add("return");
            }
        }

        @Override
        public void visit(IfStmt ifs, Void arg) {
            String condition = processExpression(ifs.getCondition());
            String label = "L" + tempCounter.getAndIncrement();
            instructions.add("if " + condition + " goto " + label);
            ifs.getThenStmt().accept(this, arg);
            if (ifs.getElseStmt().isPresent()) {
                String elseLabel = "L" + tempCounter.getAndIncrement();
                instructions.add("goto " + elseLabel);
                instructions.add(label + ":");
                ifs.getElseStmt().get().accept(this, arg);
                instructions.add(elseLabel + ":");
            } else {
                instructions.add(label + ":");
            }
        }

        @Override
        public void visit(WhileStmt ws, Void arg) {
            String startLabel = "L" + tempCounter.getAndIncrement();
            String endLabel = "L" + tempCounter.getAndIncrement();
            instructions.add(startLabel + ":");
            String condition = processExpression(ws.getCondition());
            instructions.add("iffalse " + condition + " goto " + endLabel);
            ws.getBody().accept(this, arg);
            instructions.add("goto " + startLabel);
            instructions.add(endLabel + ":");
        }

        @Override
        public void visit(ForStmt fs, Void arg) {
            String startLabel = "L" + tempCounter.getAndIncrement();
            String endLabel = "L" + tempCounter.getAndIncrement();

            fs.getInitialization().forEach(init -> init.accept(this, arg));

            instructions.add(startLabel + ":");
            if (fs.getCompare().isPresent()) {
                String condition = processExpression(fs.getCompare().get());
                instructions.add("iffalse " + condition + " goto " + endLabel);
            }

            fs.getBody().accept(this, arg);

            fs.getUpdate().forEach(update -> update.accept(this, arg));
            instructions.add("goto " + startLabel);
            instructions.add(endLabel + ":");
        }

        private String processExpression(Expression expr) {
            if (expr instanceof StringLiteralExpr sle) {
                return "\"" + sle.getValue() + "\"";
            } else if (expr instanceof IntegerLiteralExpr ile) {
                return ile.getValue();
            } else if (expr instanceof DoubleLiteralExpr dle) {
                return dle.getValue();
            } else if (expr instanceof BooleanLiteralExpr ble) {
                return ble.getValue() ? "true" : "false";
            } else if (expr instanceof NameExpr ne) {
                return ne.getNameAsString();
            } else if (expr instanceof MethodCallExpr mce) {
                String temp = newTemp();
                if (mce.getScope().isPresent()) {
                    Expression scope = mce.getScope().get();
                    if (scope instanceof FieldAccessExpr fae) {
                        if (fae.getScope().toString().equals("System") && fae.getNameAsString().equals("out")) {
                            instructions.add(temp + " = getstatic System.out : PrintStream");
                            for (Expression arg : mce.getArguments()) {
                                String argT = processExpression(arg);
                                String argTemp = newTemp();
                                instructions.add(argTemp + " = " + argT);
                                temp = argTemp;
                            }
                            instructions.add("invokevirtual PrintStream.println(" + getArgTypes(mce) + ") : void");
                            return temp;
                        }
                    }
                }
                List<String> args = new ArrayList<>();
                for (Expression arg : mce.getArguments()) {
                    args.add(processExpression(arg));
                }
                instructions.add(temp + " = invokevirtual " + mce.getNameAsString() + "(" + String.join(", ", args) + ")");
                return temp;
            } else if (expr instanceof BinaryExpr be) {
                String left = processExpression(be.getLeft());
                String right = processExpression(be.getRight());
                String temp = newTemp();
                instructions.add(temp + " = " + left + " " + be.getOperator().asString() + " " + right);
                return temp;
            } else if (expr instanceof UnaryExpr ue) {
                String operand = processExpression(ue.getExpression());
                String temp = newTemp();
                instructions.add(temp + " = " + ue.getOperator().asString() + operand);
                return temp;
            } else if (expr instanceof AssignExpr ae) {
                String target = ae.getTarget().toString();
                String value = processExpression(ae.getValue());
                instructions.add(target + " = " + value);
                return target;
            } else if (expr instanceof FieldAccessExpr fae) {
                String scope = processExpression(fae.getScope());
                return scope + "." + fae.getNameAsString();
            } else if (expr instanceof ThisExpr) {
                return "this";
            } else {
                return expr.toString();
            }
        }

        private String getArgTypes(MethodCallExpr mce) {
            return mce.getArguments().stream()
                .map(arg -> {
                    if (arg instanceof StringLiteralExpr) return "String";
                    if (arg instanceof IntegerLiteralExpr) return "int";
                    if (arg instanceof DoubleLiteralExpr) return "double";
                    if (arg instanceof BooleanLiteralExpr) return "boolean";
                    return "Object";
                })
                .reduce((a, b) -> a + ", " + b)
                .orElse("");
        }
    }
}
