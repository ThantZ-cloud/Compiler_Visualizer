package com.compilervisualizer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;

import java.util.*;

/**
 * Builds a Control Flow Graph (CFG) from JavaParser AST.
 * Strictly adheres to compiler theory: basic blocks contain straight-line instructions
 * with a single entry and single exit. Control structures (if, while, for, switch, break, continue, return)
 * form leaders and terminate basic blocks.
 */
public class ControlFlowGraphBuilder {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static String toJson(CompilationUnit cu) {
        try {
            ObjectNode root = mapper.createObjectNode();
            ArrayNode methodsArr = mapper.createArrayNode();

            for (TypeDeclaration<?> td : cu.getTypes()) {
                String className = td.getNameAsString();
                for (BodyDeclaration<?> member : td.getMembers()) {
                    if (member instanceof MethodDeclaration md) {
                        methodsArr.add(buildMethodCfg(md, className));
                    } else if (member instanceof ConstructorDeclaration cd) {
                        methodsArr.add(buildConstructorCfg(cd, className));
                    }
                }
            }
            root.set("methods", methodsArr);
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            return "{\"error\": \"Failed to build CFG: " + escapeJson(e.getMessage()) + "\"}";
        }
    }

    private static ObjectNode buildMethodCfg(MethodDeclaration md, String className) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("name", md.getNameAsString());
        obj.put("declaringType", className);
        obj.put("returnType", md.getType().asString());
        obj.put("kind", "method");

        ArrayNode params = mapper.createArrayNode();
        for (Parameter p : md.getParameters()) {
            params.add(p.getType().asString() + " " + p.getNameAsString());
        }
        obj.set("parameters", params);

        Optional<BlockStmt> bodyOpt = md.getBody();
        if (bodyOpt.isPresent()) {
            CfgGraph graph = buildGraph(bodyOpt.get());
            obj.set("blocks", graph.blocks);
            obj.set("edges", graph.edges);
        } else {
            obj.set("blocks", mapper.createArrayNode());
            obj.set("edges", mapper.createArrayNode());
        }

        return obj;
    }

    private static ObjectNode buildConstructorCfg(ConstructorDeclaration cd, String className) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("name", cd.getNameAsString());
        obj.put("declaringType", className);
        obj.put("returnType", "constructor");
        obj.put("kind", "constructor");

        ArrayNode params = mapper.createArrayNode();
        for (Parameter p : cd.getParameters()) {
            params.add(p.getType().asString() + " " + p.getNameAsString());
        }
        obj.set("parameters", params);

        BlockStmt body = cd.getBody();
        if (body != null) {
            CfgGraph graph = buildGraph(body);
            obj.set("blocks", graph.blocks);
            obj.set("edges", graph.edges);
        } else {
            obj.set("blocks", mapper.createArrayNode());
            obj.set("edges", mapper.createArrayNode());
        }

        return obj;
    }

    private static CfgGraph buildGraph(BlockStmt body) {
        CfgContext ctx = new CfgContext();
        CfgBlock entryBlock = ctx.newBlock("ENTRY", "entry");
        CfgBlock exitBlock = ctx.newBlock("EXIT", "exit");

        CfgBlock finalActive = processStatements(body.getStatements(), entryBlock, exitBlock, ctx, null, null);

        // If control reaches the end of the method body, connect to exit
        if (finalActive != null && !finalActive.isTerminated) {
            ctx.addEdge(finalActive.id, exitBlock.id, "");
        }

        // Clean up orphan blocks that have no incoming edges (except entry) and no statements
        removeDeadOrphanBlocks(ctx, entryBlock, exitBlock);

        CfgGraph graph = new CfgGraph();
        for (CfgBlock b : ctx.allBlocks) {
            ObjectNode bObj = mapper.createObjectNode();
            bObj.put("id", b.id);
            bObj.put("label", b.label);
            bObj.put("type", b.type);
            ArrayNode stmts = mapper.createArrayNode();
            for (String s : b.statements) {
                stmts.add(s);
            }
            bObj.set("statements", stmts);
            graph.blocks.add(bObj);
        }
        for (CfgEdge e : ctx.edges) {
            ObjectNode eObj = mapper.createObjectNode();
            eObj.put("from", e.from);
            eObj.put("to", e.to);
            eObj.put("label", e.label);
            graph.edges.add(eObj);
        }
        return graph;
    }

    /**
     * Processes a list of statements linearly.
     * Returns the currently active basic block where subsequent linear statements should be added,
     * or null if control flow was unconditionally terminated (e.g. return/break/continue/throw).
     */
    private static CfgBlock processStatements(List<Statement> statements,
                                                CfgBlock currentBlock,
                                                CfgBlock exitBlock,
                                                CfgContext ctx,
                                                CfgBlock loopExit,
                                                CfgBlock loopHeader) {
        CfgBlock curr = currentBlock;

        for (Statement stmt : statements) {
            if (curr == null || curr.isTerminated) {
                // Statements after an unconditional return/break/throw are unreachable
                // We create a dead block if we want to capture them, or start a new block
                curr = ctx.newBlock("UNREACHABLE", "basic");
            }

            if (stmt instanceof IfStmt ifStmt) {
                curr = processIfStmt(ifStmt, curr, exitBlock, ctx, loopExit, loopHeader);
            } else if (stmt instanceof WhileStmt whileStmt) {
                curr = processWhileStmt(whileStmt, curr, exitBlock, ctx);
            } else if (stmt instanceof ForStmt forStmt) {
                curr = processForStmt(forStmt, curr, exitBlock, ctx);
            } else if (stmt instanceof DoStmt doStmt) {
                curr = processDoStmt(doStmt, curr, exitBlock, ctx);
            } else if (stmt instanceof SwitchStmt switchStmt) {
                curr = processSwitchStmt(switchStmt, curr, exitBlock, ctx, loopExit, loopHeader);
            } else if (stmt instanceof ReturnStmt rs) {
                curr.statements.add(formatReturn(rs));
                ctx.addEdge(curr.id, exitBlock.id, "");
                curr.isTerminated = true;
                curr = null;
            } else if (stmt instanceof ThrowStmt ts) {
                curr.statements.add("throw " + ts.getExpression());
                ctx.addEdge(curr.id, exitBlock.id, "exception");
                curr.isTerminated = true;
                curr = null;
            } else if (stmt instanceof BreakStmt bs) {
                curr.statements.add("break" + (bs.getLabel().map(l -> " " + l.getIdentifier()).orElse("")));
                int target = (loopExit != null ? loopExit.id : exitBlock.id);
                ctx.addEdge(curr.id, target, "break");
                curr.isTerminated = true;
                curr = null;
            } else if (stmt instanceof ContinueStmt cs) {
                curr.statements.add("continue" + (cs.getLabel().map(l -> " " + l.getIdentifier()).orElse("")));
                int target = (loopHeader != null ? loopHeader.id : exitBlock.id);
                ctx.addEdge(curr.id, target, "continue");
                curr.isTerminated = true;
                curr = null;
            } else if (stmt instanceof BlockStmt nestedBlock) {
                curr = processStatements(nestedBlock.getStatements(), curr, exitBlock, ctx, loopExit, loopHeader);
            } else if (stmt instanceof ExpressionStmt es) {
                curr.statements.add(es.getExpression().toString());
            } else if (stmt instanceof AssertStmt as) {
                curr.statements.add("assert " + as.getCheck());
            } else if (stmt instanceof SynchronizedStmt ss) {
                curr.statements.add("synchronized (" + ss.getExpression() + ")");
                CfgBlock syncBody = ctx.newBlock("SYNC_BODY", "basic");
                ctx.addEdge(curr.id, syncBody.id, "");
                curr = processStatements(ss.getBody().getStatements(), syncBody, exitBlock, ctx, loopExit, loopHeader);
            } else if (stmt instanceof TryStmt ts) {
                curr = processTryStmt(ts, curr, exitBlock, ctx, loopExit, loopHeader);
            } else if (stmt instanceof ExplicitConstructorInvocationStmt eci) {
                curr.statements.add(eci.toString());
            } else if (stmt instanceof LocalClassDeclarationStmt lcd) {
                curr.statements.add("class " + lcd.getClassDeclaration().getNameAsString());
            } else if (stmt instanceof LocalRecordDeclarationStmt lrd) {
                curr.statements.add("record " + lrd.getRecordDeclaration().getNameAsString());
            } else if (stmt instanceof EmptyStmt) {
                // Ignore empty statements ';'
            } else {
                curr.statements.add(stmt.toString().replace("\n", " ").trim());
            }
        }

        return curr;
    }

    private static CfgBlock processIfStmt(IfStmt ifStmt, CfgBlock currentBlock, CfgBlock exitBlock,
                                           CfgContext ctx, CfgBlock loopExit, CfgBlock loopHeader) {
        String condStr = "if (" + ifStmt.getCondition() + ")";
        currentBlock.statements.add(condStr);

        // Branch 1: THEN
        CfgBlock thenBlock = ctx.newBlock("THEN", "branch");
        ctx.addEdge(currentBlock.id, thenBlock.id, "true");
        CfgBlock lastThen = processBranchStmt(ifStmt.getThenStmt(), thenBlock, exitBlock, ctx, loopExit, loopHeader);

        // Branch 2: ELSE
        CfgBlock lastElse = null;
        boolean hasElse = ifStmt.getElseStmt().isPresent();
        if (hasElse) {
            Statement elseStmt = ifStmt.getElseStmt().get();
            CfgBlock elseBlock = ctx.newBlock("ELSE", "branch");
            ctx.addEdge(currentBlock.id, elseBlock.id, "false");
            lastElse = processBranchStmt(elseStmt, elseBlock, exitBlock, ctx, loopExit, loopHeader);
        }

        // Merge block
        CfgBlock mergeBlock = ctx.newBlock("JOIN_IF", "merge");

        if (lastThen != null && !lastThen.isTerminated) {
            ctx.addEdge(lastThen.id, mergeBlock.id, "");
        }

        if (hasElse) {
            if (lastElse != null && !lastElse.isTerminated) {
                ctx.addEdge(lastElse.id, mergeBlock.id, "");
            }
        } else {
            // If no else branch, false condition flows straight to merge
            ctx.addEdge(currentBlock.id, mergeBlock.id, "false");
        }

        return mergeBlock;
    }

    private static CfgBlock processBranchStmt(Statement branchStmt, CfgBlock startBlock, CfgBlock exitBlock,
                                                CfgContext ctx, CfgBlock loopExit, CfgBlock loopHeader) {
        if (branchStmt instanceof BlockStmt bs) {
            return processStatements(bs.getStatements(), startBlock, exitBlock, ctx, loopExit, loopHeader);
        } else {
            return processStatements(Collections.singletonList(branchStmt), startBlock, exitBlock, ctx, loopExit, loopHeader);
        }
    }

    private static CfgBlock processWhileStmt(WhileStmt whileStmt, CfgBlock currentBlock, CfgBlock exitBlock, CfgContext ctx) {
        String conditionStr = whileStmt.getCondition().toString();

        // Condition leader block
        CfgBlock condBlock = ctx.newBlock("WHILE_COND", "condition");
        condBlock.statements.add("while (" + conditionStr + ")");
        ctx.addEdge(currentBlock.id, condBlock.id, "");

        // Loop body
        CfgBlock bodyBlock = ctx.newBlock("WHILE_BODY", "loop");
        ctx.addEdge(condBlock.id, bodyBlock.id, "true");

        // Loop exit
        CfgBlock afterLoop = ctx.newBlock("AFTER_WHILE", "merge");
        ctx.addEdge(condBlock.id, afterLoop.id, "false");

        CfgBlock lastBody = processBranchStmt(whileStmt.getBody(), bodyBlock, exitBlock, ctx, afterLoop, condBlock);

        // Back-edge from end of loop body back to condition header
        if (lastBody != null && !lastBody.isTerminated) {
            ctx.addEdge(lastBody.id, condBlock.id, "loop");
        }

        return afterLoop;
    }

    private static CfgBlock processForStmt(ForStmt forStmt, CfgBlock currentBlock, CfgBlock exitBlock, CfgContext ctx) {
        // Init expressions in current block
        for (Expression init : forStmt.getInitialization()) {
            currentBlock.statements.add("for-init: " + init);
        }

        String conditionStr = forStmt.getCompare().map(Node::toString).orElse("true");

        CfgBlock condBlock = ctx.newBlock("FOR_COND", "condition");
        condBlock.statements.add("for (" + conditionStr + ")");
        ctx.addEdge(currentBlock.id, condBlock.id, "");

        CfgBlock bodyBlock = ctx.newBlock("FOR_BODY", "loop");
        ctx.addEdge(condBlock.id, bodyBlock.id, "true");

        CfgBlock updateBlock = ctx.newBlock("FOR_UPDATE", "loop");
        for (Expression update : forStmt.getUpdate()) {
            updateBlock.statements.add("for-update: " + update);
        }

        CfgBlock afterFor = ctx.newBlock("AFTER_FOR", "merge");
        ctx.addEdge(condBlock.id, afterFor.id, "false");

        CfgBlock lastBody = processBranchStmt(forStmt.getBody(), bodyBlock, null, ctx, afterFor, updateBlock);

        if (lastBody != null && !lastBody.isTerminated) {
            ctx.addEdge(lastBody.id, updateBlock.id, "");
        }
        ctx.addEdge(updateBlock.id, condBlock.id, "loop");

        return afterFor;
    }

    private static CfgBlock processDoStmt(DoStmt doStmt, CfgBlock currentBlock, CfgBlock exitBlock, CfgContext ctx) {
        CfgBlock bodyBlock = ctx.newBlock("DO_BODY", "loop");
        ctx.addEdge(currentBlock.id, bodyBlock.id, "");

        CfgBlock condBlock = ctx.newBlock("DO_COND", "condition");
        condBlock.statements.add("while (" + doStmt.getCondition() + ")");

        CfgBlock afterDo = ctx.newBlock("AFTER_DO", "merge");

        CfgBlock lastBody = processBranchStmt(doStmt.getBody(), bodyBlock, exitBlock, ctx, afterDo, condBlock);

        if (lastBody != null && !lastBody.isTerminated) {
            ctx.addEdge(lastBody.id, condBlock.id, "");
        }

        ctx.addEdge(condBlock.id, bodyBlock.id, "true");
        ctx.addEdge(condBlock.id, afterDo.id, "false");

        return afterDo;
    }

    private static CfgBlock processSwitchStmt(SwitchStmt switchStmt, CfgBlock currentBlock, CfgBlock exitBlock,
                                               CfgContext ctx, CfgBlock loopExit, CfgBlock loopHeader) {
        currentBlock.statements.add("switch (" + switchStmt.getSelector() + ")");

        CfgBlock afterSwitch = ctx.newBlock("AFTER_SWITCH", "merge");
        List<SwitchEntry> entries = switchStmt.getEntries();

        if (entries.isEmpty()) {
            ctx.addEdge(currentBlock.id, afterSwitch.id, "");
            return afterSwitch;
        }

        List<CfgBlock> caseBlocks = new ArrayList<>();
        for (int i = 0; i < entries.size(); i++) {
            SwitchEntry entry = entries.get(i);
            String labelStr = entry.getLabels().isEmpty() ? "default" : "case " + entry.getLabels().getFirst();
            CfgBlock caseBlock = ctx.newBlock(labelStr.toUpperCase(), "branch");
            caseBlock.statements.add(labelStr + ":");
            caseBlocks.add(caseBlock);
            ctx.addEdge(currentBlock.id, caseBlock.id, labelStr);
        }

        for (int i = 0; i < entries.size(); i++) {
            SwitchEntry entry = entries.get(i);
            CfgBlock caseBlock = caseBlocks.get(i);
            CfgBlock lastInCase = processStatements(entry.getStatements(), caseBlock, exitBlock, ctx, afterSwitch, loopHeader);

            if (lastInCase != null && !lastInCase.isTerminated) {
                if (i + 1 < caseBlocks.size()) {
                    ctx.addEdge(lastInCase.id, caseBlocks.get(i + 1).id, "fallthrough");
                } else {
                    ctx.addEdge(lastInCase.id, afterSwitch.id, "");
                }
            }
        }

        return afterSwitch;
    }

    private static CfgBlock processTryStmt(TryStmt ts, CfgBlock currentBlock, CfgBlock exitBlock,
                                            CfgContext ctx, CfgBlock loopExit, CfgBlock loopHeader) {
        currentBlock.statements.add("try");
        CfgBlock tryBody = ctx.newBlock("TRY_BODY", "basic");
        ctx.addEdge(currentBlock.id, tryBody.id, "");

        CfgBlock afterTry = ctx.newBlock("AFTER_TRY", "merge");

        CfgBlock lastTry = processStatements(ts.getTryBlock().getStatements(), tryBody, exitBlock, ctx, loopExit, loopHeader);
        if (lastTry != null && !lastTry.isTerminated) {
            ctx.addEdge(lastTry.id, afterTry.id, "");
        }

        for (CatchClause clause : ts.getCatchClauses()) {
            String param = clause.getParameter().getType().asString() + " " + clause.getParameter().getNameAsString();
            CfgBlock catchBlock = ctx.newBlock("CATCH", "branch");
            catchBlock.statements.add("catch (" + param + ")");
            ctx.addEdge(currentBlock.id, catchBlock.id, "catch");

            CfgBlock lastCatch = processStatements(clause.getBody().getStatements(), catchBlock, exitBlock, ctx, loopExit, loopHeader);
            if (lastCatch != null && !lastCatch.isTerminated) {
                ctx.addEdge(lastCatch.id, afterTry.id, "");
            }
        }

        if (ts.getFinallyBlock().isPresent()) {
            CfgBlock finallyBlock = ctx.newBlock("FINALLY", "basic");
            ctx.addEdge(afterTry.id, finallyBlock.id, "finally");
            CfgBlock lastFinally = processStatements(ts.getFinallyBlock().get().getStatements(), finallyBlock, exitBlock, ctx, loopExit, loopHeader);
            return lastFinally != null ? lastFinally : afterTry;
        }

        return afterTry;
    }

    private static void removeDeadOrphanBlocks(CfgContext ctx, CfgBlock entry, CfgBlock exit) {
        // Collect reachable block IDs via BFS
        Set<Integer> reachable = new HashSet<>();
        Queue<Integer> queue = new LinkedList<>();
        queue.add(entry.id);
        reachable.add(entry.id);

        while (!queue.isEmpty()) {
            int curr = queue.poll();
            for (CfgEdge e : ctx.edges) {
                if (e.from == curr) {
                    if (!reachable.contains(e.to)) {
                        reachable.add(e.to);
                        queue.add(e.to);
                    }
                }
            }
        }

        ctx.allBlocks.removeIf(b -> !reachable.contains(b.id) && b.statements.isEmpty());
        ctx.edges.removeIf(e -> !reachable.contains(e.from) || !reachable.contains(e.to));
    }

    private static String formatReturn(ReturnStmt rs) {
        return rs.getExpression().map(e -> "return " + e).orElse("return");
    }

    private static String escapeJson(String s) {
        if (s == null) return "";
        return s.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    // --- Helper Models ---

    private static class CfgBlock {
        int id;
        String label;
        String type; // "entry", "exit", "condition", "branch", "loop", "merge", "basic"
        List<String> statements = new ArrayList<>();
        boolean isTerminated = false;

        CfgBlock(int id, String label, String type) {
            this.id = id;
            this.label = label;
            this.type = type;
        }
    }

    private static class CfgEdge {
        int from, to;
        String label;

        CfgEdge(int from, int to, String label) {
            this.from = from;
            this.to = to;
            this.label = label;
        }
    }

    private static class CfgGraph {
        ArrayNode blocks = mapper.createArrayNode();
        ArrayNode edges = mapper.createArrayNode();
    }

    private static class CfgContext {
        int nextId = 0;
        List<CfgBlock> allBlocks = new ArrayList<>();
        List<CfgEdge> edges = new ArrayList<>();

        CfgBlock newBlock(String label, String type) {
            CfgBlock b = new CfgBlock(nextId++, label, type);
            allBlocks.add(b);
            return b;
        }

        void addEdge(int from, int to, String label) {
            // Avoid duplicate identical edges
            for (CfgEdge e : edges) {
                if (e.from == from && e.to == to && Objects.equals(e.label, label)) {
                    return;
                }
            }
            edges.add(new CfgEdge(from, to, label));
        }
    }
}
