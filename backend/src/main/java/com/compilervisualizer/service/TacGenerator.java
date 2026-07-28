package com.compilervisualizer.service;

import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Walks a JavaParser AST and generates Three-Address Code (TAC).
 * Each instruction has at most three operands: result = op1 operator op2.
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
     * Internal visitor that walks the AST and emits TAC instructions.
     */
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

            // System.out.println(...) special case
            if (mce.getScope().isPresent()) {
                Expression scope = mce.getScope().get();
                if (scope instanceof FieldAccessExpr fae) {
                    if (fae.getScope().toString().equals("System") && fae.getNameAsString().equals("out")) {
                        String temp = newTemp();
                        instructions.add(temp + " = getstatic System.out : PrintStream");

                        for (Expression arg_expr : mce.getArguments()) {
                            String argTemp = newTemp();
                            if (arg_expr instanceof StringLiteralExpr sle) {
                                instructions.add(argTemp + " = ldc \"" + sle.getValue() + "\"");
                            } else if (arg_expr instanceof IntegerLiteralExpr ile) {
                                instructions.add(argTemp + " = ldc " + ile.getValue());
                            } else if (arg_expr instanceof DoubleLiteralExpr dle) {
                                instructions.add(argTemp + " = ldc " + dle.getValue());
                            } else {
                                String result = processExpression(arg_expr);
                                instructions.add(argTemp + " = " + result);
                            }
                            temp = argTemp;
                        }

                        instructions.add("invokevirtual PrintStream.println(" + getArgTypes(mce) + ") : void");
                        return;
                    }
                }
            }

            // Generic method call
            String temp = newTemp();
            List<String> argTemps = new ArrayList<>();
            for (Expression arg_expr : mce.getArguments()) {
                argTemps.add(processExpression(arg_expr));
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

            // Init
            fs.getInitialization().forEach(init -> init.accept(this, arg));

            // Condition
            instructions.add(startLabel + ":");
            if (fs.getCompare().isPresent()) {
                String condition = processExpression(fs.getCompare().get());
                instructions.add("iffalse " + condition + " goto " + endLabel);
            }

            // Body
            fs.getBody().accept(this, arg);

            // Update
            fs.getUpdate().forEach(update -> update.accept(this, arg));
            instructions.add("goto " + startLabel);
            instructions.add(endLabel + ":");
        }

        /**
         * Process an expression and return the temp variable or literal holding its result.
         */
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
                // Build a mini-instruction for the call
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
                // Fallback: use the string representation
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
