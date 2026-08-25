package com.compilervisualizer.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.ImportDeclaration;
import com.github.javaparser.ast.Modifier;
import com.github.javaparser.ast.Node;
import com.github.javaparser.ast.PackageDeclaration;
import com.github.javaparser.ast.body.*;
import com.github.javaparser.ast.expr.*;
import com.github.javaparser.ast.stmt.*;
import com.github.javaparser.ast.type.*;
import com.github.javaparser.ast.visitor.VoidVisitorAdapter;


import java.util.*;
import java.util.stream.Collectors;

/**
 * Builds a rich semantic model from a JavaParser AST, including:
 * - Scope tree (package → class → method → block)
 * - Symbol table (classes, fields, methods, variables, parameters)
 * - Type resolution steps (how System.out.println resolves)
 * - Type checking matrix (assignments, method calls, operators, returns)
 * - Semantic errors (undeclared symbols, type mismatches, etc.)
 */
public class SymbolTableBuilder {

    private static final ObjectMapper mapper = new ObjectMapper();

    /**
     * Builds the complete semantic analysis JSON from a CompilationUnit.
     */
    public static String toJson(CompilationUnit cu) {
        try {
            ObjectNode root = mapper.createObjectNode();

            // package
            cu.getPackageDeclaration().ifPresent(pd -> {
                root.put("package", pd.getNameAsString());
            });

            // imports
            ArrayNode imports = mapper.createArrayNode();
            cu.getImports().forEach(imp -> {
                ObjectNode impNode = mapper.createObjectNode();
                impNode.put("name", imp.getNameAsString());
                impNode.put("static", imp.isStatic());
                impNode.put("asterisk", imp.isAsterisk());
                imports.add(impNode);
            });
            root.set("imports", imports);

            // types (classes, interfaces, enums)
            ArrayNode types = mapper.createArrayNode();
            for (TypeDeclaration<?> td : cu.getTypes()) {
                types.add(typeDeclarationToJson(td));
            }
            root.set("types", types);

            // --- Semantic Analysis Enrichments ---

            // Build scope tree
            ScopeBuildContext scopeCtx = new ScopeBuildContext();
            ObjectNode scopeTree = buildScopeTree(cu, scopeCtx);
            root.set("scopeTree", scopeTree);

            // Collect symbols with scope info
            ArrayNode symbols = collectAllSymbols(cu, scopeCtx);
            root.set("symbols", symbols);

            // Type resolution (best-effort, pattern-based for stdlib)
            TypeResolutionCollector resolutionCollector = new TypeResolutionCollector();
            cu.accept(resolutionCollector, null);
            root.set("typeResolution", resolutionCollector.getResult());

            // Type checking
            TypeCheckCollector checkCollector = new TypeCheckCollector();
            cu.accept(checkCollector, null);
            root.set("typeChecks", checkCollector.getChecks());

            // Semantic errors
            root.set("errors", checkCollector.getErrors());

            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            return JsonEscape.errorJson("Failed to build symbol table: " + e.getMessage());
        }
    }

    // --- Existing type/member serialization (unchanged) ---

    private static ObjectNode typeDeclarationToJson(TypeDeclaration<?> td) {
        ObjectNode obj = mapper.createObjectNode();

        if (td instanceof ClassOrInterfaceDeclaration cid) {
            obj.put("kind", cid.isInterface() ? "interface" : "class");
            obj.put("name", cid.getNameAsString());
            addModifiers(obj, cid.getModifiers());
            addTypeParameters(obj, cid.getTypeParameters());

            if (!cid.getExtendedTypes().isEmpty()) {
                ArrayNode extendsArr = mapper.createArrayNode();
                cid.getExtendedTypes().forEach(et -> extendsArr.add(et.getNameAsString()));
                obj.set("extends", extendsArr);
            }

            if (!cid.getImplementedTypes().isEmpty()) {
                ArrayNode implementsArr = mapper.createArrayNode();
                cid.getImplementedTypes().forEach(it -> implementsArr.add(it.getNameAsString()));
                obj.set("implements", implementsArr);
            }
        } else if (td instanceof EnumDeclaration ed) {
            obj.put("kind", "enum");
            obj.put("name", ed.getNameAsString());
            addModifiers(obj, ed.getModifiers());

            ArrayNode constants = mapper.createArrayNode();
            ed.getEntries().forEach(entry -> {
                ObjectNode c = mapper.createObjectNode();
                c.put("name", entry.getNameAsString());
                constants.add(c);
            });
            obj.set("constants", constants);
        } else if (td instanceof AnnotationDeclaration ad) {
            obj.put("kind", "annotation");
            obj.put("name", ad.getNameAsString());
            addModifiers(obj, ad.getModifiers());
        } else if (td instanceof RecordDeclaration rd) {
            obj.put("kind", "record");
            obj.put("name", rd.getNameAsString());
            addModifiers(obj, rd.getModifiers());
            addTypeParameters(obj, rd.getTypeParameters());
        }

        ArrayNode members = mapper.createArrayNode();
        for (BodyDeclaration<?> member : td.getMembers()) {
            if (member instanceof FieldDeclaration fd) {
                members.add(fieldToJson(fd));
            } else if (member instanceof MethodDeclaration md) {
                members.add(methodToJson(md));
            } else if (member instanceof ConstructorDeclaration cd) {
                members.add(constructorToJson(cd));
            } else if (member instanceof InitializerDeclaration id) {
                ObjectNode initNode = mapper.createObjectNode();
                initNode.put("kind", "initializer");
                initNode.put("static", id.isStatic());
                members.add(initNode);
            } else if (member instanceof TypeDeclaration<?> innerTd) {
                members.add(typeDeclarationToJson(innerTd));
            }
        }
        obj.set("members", members);
        return obj;
    }

    private static ObjectNode fieldToJson(FieldDeclaration fd) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("kind", "field");
        addModifiers(obj, fd.getModifiers());

        ArrayNode vars = mapper.createArrayNode();
        for (VariableDeclarator vd : fd.getVariables()) {
            ObjectNode v = mapper.createObjectNode();
            v.put("name", vd.getNameAsString());
            v.set("type", typeToJson(vd.getType()));
            vd.getInitializer().ifPresent(init ->
                v.put("initializerPresent", true)
            );
            vars.add(v);
        }
        obj.set("variables", vars);
        return obj;
    }

    private static ObjectNode methodToJson(MethodDeclaration md) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("kind", "method");
        obj.put("name", md.getNameAsString());
        addModifiers(obj, md.getModifiers());
        obj.set("returnType", typeToJson(md.getType()));
        addTypeParameters(obj, md.getTypeParameters());

        ArrayNode params = mapper.createArrayNode();
        md.getParameters().forEach(p -> {
            ObjectNode param = mapper.createObjectNode();
            param.put("name", p.getNameAsString());
            param.set("type", typeToJson(p.getType()));
            param.put("varArgs", p.isVarArgs());
            addModifiers(param, p.getModifiers());
            params.add(param);
        });
        obj.set("parameters", params);

        if (!md.getThrownExceptions().isEmpty()) {
            ArrayNode exceptions = mapper.createArrayNode();
            md.getThrownExceptions().forEach(ex -> exceptions.add(ex.asString()));
            obj.set("throws", exceptions);
        }
        return obj;
    }

    private static ObjectNode constructorToJson(ConstructorDeclaration cd) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("kind", "constructor");
        obj.put("name", cd.getNameAsString());
        addModifiers(obj, cd.getModifiers());
        addTypeParameters(obj, cd.getTypeParameters());

        ArrayNode params = mapper.createArrayNode();
        cd.getParameters().forEach(p -> {
            ObjectNode param = mapper.createObjectNode();
            param.put("name", p.getNameAsString());
            param.set("type", typeToJson(p.getType()));
            param.put("varArgs", p.isVarArgs());
            addModifiers(param, p.getModifiers());
            params.add(param);
        });
        obj.set("parameters", params);

        if (!cd.getThrownExceptions().isEmpty()) {
            ArrayNode exceptions = mapper.createArrayNode();
            cd.getThrownExceptions().forEach(ex -> exceptions.add(ex.asString()));
            obj.set("throws", exceptions);
        }
        return obj;
    }

    private static ObjectNode typeToJson(Type type) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("name", type.asString());
        return obj;
    }

    private static void addModifiers(ObjectNode obj, List<Modifier> modifiers) {
        if (modifiers.isEmpty()) return;
        ArrayNode arr = mapper.createArrayNode();
        modifiers.forEach(m -> arr.add(m.getKeyword().asString()));
        obj.set("modifiers", arr);
    }

    private static void addTypeParameters(ObjectNode obj,
                                         com.github.javaparser.ast.NodeList<TypeParameter> typeParams) {
        if (!typeParams.isEmpty()) {
            ArrayNode tpArr = mapper.createArrayNode();
            typeParams.forEach(tp -> {
                ObjectNode tpNode = mapper.createObjectNode();
                tpNode.put("name", tp.getNameAsString());
                if (!tp.getTypeBound().isEmpty()) {
                    ArrayNode bounds = mapper.createArrayNode();
                    tp.getTypeBound().forEach(b -> bounds.add(b.asString()));
                    tpNode.set("bounds", bounds);
                }
                tpArr.add(tpNode);
            });
            obj.set("typeParameters", tpArr);
        }
    }

    // === SCOPE TREE ===

    /**
     * Builds a hierarchical scope tree from the AST.
     * Structure: package → [type] → [method/constructor] → [block statements]
     */
    private static ObjectNode buildScopeTree(CompilationUnit cu, ScopeBuildContext ctx) {
        ObjectNode root = mapper.createObjectNode();
        root.put("name", cu.getPackageDeclaration()
            .map(pd -> pd.getNameAsString())
            .orElse("(default package)"));
        root.put("kind", "package");
        root.put("scopeId", ctx.nextScopeId++);
        ArrayNode children = mapper.createArrayNode();
        root.set("children", children);

        for (TypeDeclaration<?> td : cu.getTypes()) {
            ObjectNode typeNode = scopeForType(td, ctx);
            children.add(typeNode);
        }

        return root;
    }

    private static ObjectNode scopeForType(TypeDeclaration<?> td, ScopeBuildContext ctx) {
        ObjectNode node = mapper.createObjectNode();
        node.put("name", td.getNameAsString());
        String kind;
        if (td instanceof ClassOrInterfaceDeclaration cid) {
            kind = cid.isInterface() ? "interface" : "class";
        } else if (td instanceof EnumDeclaration) {
            kind = "enum";
        } else if (td instanceof AnnotationDeclaration) {
            kind = "annotation";
        } else if (td instanceof RecordDeclaration) {
            kind = "record";
        } else {
            kind = "type";
        }
        node.put("kind", kind);
        node.put("scopeId", ctx.nextScopeId++);

        ArrayNode members = mapper.createArrayNode();
        node.set("children", members);

        for (BodyDeclaration<?> member : td.getMembers()) {
            if (member instanceof MethodDeclaration md) {
                members.add(scopeForMethod(md, ctx));
            } else if (member instanceof ConstructorDeclaration cd) {
                members.add(scopeForConstructor(cd, ctx));
            } else if (member instanceof FieldDeclaration fd) {
                ObjectNode fieldNode = mapper.createObjectNode();
                fieldNode.put("name", "(fields)");
                fieldNode.put("kind", "fields");
                fieldNode.put("scopeId", ctx.nextScopeId++);
                ArrayNode fieldChildren = mapper.createArrayNode();
                for (VariableDeclarator vd : fd.getVariables()) {
                    ObjectNode varNode = mapper.createObjectNode();
                    varNode.put("name", vd.getNameAsString());
                    varNode.put("kind", "variable");
                    varNode.put("type", vd.getType().asString());
                    varNode.put("modifiers", String.join(" ", fd.getModifiers().stream()
                        .map(m -> m.getKeyword().asString()).collect(Collectors.joining(" "))));
                    varNode.put("scopeId", ctx.nextScopeId++);
                    fieldChildren.add(varNode);
                }
                fieldNode.set("children", fieldChildren);
                members.add(fieldNode);
            }
        }

        return node;
    }

    private static ObjectNode scopeForMethod(MethodDeclaration md, ScopeBuildContext ctx) {
        ObjectNode node = mapper.createObjectNode();
        String params = md.getParameters().stream()
            .map(p -> p.getType().asString() + " " + p.getNameAsString())
            .collect(Collectors.joining(", "));
        node.put("name", md.getNameAsString() + "(" + params + ")");
        node.put("kind", "method");
        node.put("returnType", md.getType().asString());
        node.put("modifiers", String.join(" ", md.getModifiers().stream()
            .map(m -> m.getKeyword().asString()).collect(Collectors.joining(" "))));
        node.put("scopeId", ctx.nextScopeId++);

        ArrayNode children = mapper.createArrayNode();
        node.set("children", children);

        if (md.getBody().isPresent()) {
            BlockStmt body = md.getBody().get();
            for (Parameter p : md.getParameters()) {
                ObjectNode paramNode = mapper.createObjectNode();
                paramNode.put("name", p.getNameAsString());
                paramNode.put("kind", "parameter");
                paramNode.put("type", p.getType().asString());
                paramNode.put("scopeId", ctx.nextScopeId++);
                children.add(paramNode);
            }
            collectBlockScopes(body, children, ctx);
        }

        return node;
    }

    private static ObjectNode scopeForConstructor(ConstructorDeclaration cd, ScopeBuildContext ctx) {
        ObjectNode node = mapper.createObjectNode();
        String params = cd.getParameters().stream()
            .map(p -> p.getType().asString() + " " + p.getNameAsString())
            .collect(Collectors.joining(", "));
        node.put("name", cd.getNameAsString() + "(" + params + ")");
        node.put("kind", "constructor");
        node.put("scopeId", ctx.nextScopeId++);

        ArrayNode children = mapper.createArrayNode();
        node.set("children", children);

        for (Parameter p : cd.getParameters()) {
            ObjectNode paramNode = mapper.createObjectNode();
            paramNode.put("name", p.getNameAsString());
            paramNode.put("kind", "parameter");
            paramNode.put("type", p.getType().asString());
            paramNode.put("scopeId", ctx.nextScopeId++);
            children.add(paramNode);
        }
        collectBlockScopes(cd.getBody(), children, ctx);
        return node;
    }

    /**
     * Recursively collects block scopes from statements.
     */
    private static void collectBlockScopes(BlockStmt block, ArrayNode children, ScopeBuildContext ctx) {
        for (Statement stmt : block.getStatements()) {
            if (stmt instanceof BlockStmt nested) {
                ObjectNode blockNode = mapper.createObjectNode();
                blockNode.put("name", "{ block }");
                blockNode.put("kind", "block");
                blockNode.put("scopeId", ctx.nextScopeId++);
                ArrayNode blockChildren = mapper.createArrayNode();
                collectBlockScopes(nested, blockChildren, ctx);
                blockNode.set("children", blockChildren);
                children.add(blockNode);
            } else {
                collectDeclarationsFromNode(stmt, children, ctx);
                collectNestedBlocks(stmt, children, ctx);
            }
        }
    }

    /**
     * Recursively finds nested blocks in control-flow statements.
     */
    private static void collectNestedBlocks(Statement stmt, ArrayNode children, ScopeBuildContext ctx) {
        if (stmt instanceof IfStmt ifStmt) {
            if (ifStmt.getThenStmt() instanceof BlockStmt) {
                collectBlockScopes((BlockStmt) ifStmt.getThenStmt(), children, ctx);
            } else {
                collectDeclarationsFromNode(ifStmt.getThenStmt(), children, ctx);
                collectNestedBlocks(ifStmt.getThenStmt(), children, ctx);
            }
            ifStmt.getElseStmt().ifPresent(elseStmt -> {
                if (elseStmt instanceof BlockStmt) {
                    collectBlockScopes((BlockStmt) elseStmt, children, ctx);
                } else {
                    collectDeclarationsFromNode(elseStmt, children, ctx);
                    collectNestedBlocks(elseStmt, children, ctx);
                }
            });
        } else if (stmt instanceof WhileStmt ws) {
            if (ws.getBody() instanceof BlockStmt) {
                collectBlockScopes((BlockStmt) ws.getBody(), children, ctx);
            } else {
                collectDeclarationsFromNode(ws.getBody(), children, ctx);
                collectNestedBlocks(ws.getBody(), children, ctx);
            }
        } else if (stmt instanceof DoStmt ds) {
            if (ds.getBody() instanceof BlockStmt) {
                collectBlockScopes((BlockStmt) ds.getBody(), children, ctx);
            } else {
                collectDeclarationsFromNode(ds.getBody(), children, ctx);
                collectNestedBlocks(ds.getBody(), children, ctx);
            }
        } else if (stmt instanceof ForStmt fs) {
            for (Expression init : fs.getInitialization()) {
                collectDeclarationsFromNode(init, children, ctx);
            }
            if (fs.getBody() instanceof BlockStmt) {
                collectBlockScopes((BlockStmt) fs.getBody(), children, ctx);
            } else {
                collectDeclarationsFromNode(fs.getBody(), children, ctx);
                collectNestedBlocks(fs.getBody(), children, ctx);
            }
        } else if (stmt instanceof ForEachStmt fs) {
            collectDeclarationsFromNode(fs.getVariable(), children, ctx);
            if (fs.getBody() instanceof BlockStmt) {
                collectBlockScopes((BlockStmt) fs.getBody(), children, ctx);
            } else {
                collectDeclarationsFromNode(fs.getBody(), children, ctx);
                collectNestedBlocks(fs.getBody(), children, ctx);
            }
        } else if (stmt instanceof SwitchStmt ss) {
            for (SwitchEntry entry : ss.getEntries()) {
                for (Statement s : entry.getStatements()) {
                    collectDeclarationsFromNode(s, children, ctx);
                    collectNestedBlocks(s, children, ctx);
                }
            }
        }
    }

    private static void collectDeclarationsFromNode(Node node, ArrayNode children, ScopeBuildContext ctx) {
        node.accept(new VoidVisitorAdapter<ArrayNode>() {
            @Override
            public void visit(VariableDeclarationExpr vde, ArrayNode arg) {
                for (VariableDeclarator vd : vde.getVariables()) {
                    ObjectNode varNode = mapper.createObjectNode();
                    varNode.put("name", vd.getNameAsString());
                    varNode.put("kind", "variable");
                    varNode.put("type", vd.getType().asString());
                    varNode.put("scopeId", ctx.nextScopeId++);
                    arg.add(varNode);
                }
            }

            @Override
            public void visit(Parameter param, ArrayNode arg) {
                ObjectNode paramNode = mapper.createObjectNode();
                paramNode.put("name", param.getNameAsString());
                paramNode.put("kind", "parameter");
                paramNode.put("type", param.getType().asString());
                paramNode.put("scopeId", ctx.nextScopeId++);
                arg.add(paramNode);
            }
        }, children);
    }

    /**
     * Collects all symbols across all scopes as a flat list.
     */
    private static ArrayNode collectAllSymbols(CompilationUnit cu, ScopeBuildContext ctx) {
        ArrayNode symbols = mapper.createArrayNode();
        String packageStr = cu.getPackageDeclaration().map(pd -> pd.getNameAsString()).orElse("");

        for (TypeDeclaration<?> td : cu.getTypes()) {
            if (td instanceof ClassOrInterfaceDeclaration cid) {
                String scopePath = cid.getNameAsString();
                addTypeMembers(cid, scopePath, packageStr, symbols);
            }
        }

        return symbols;
    }

    private static void addTypeMembers(ClassOrInterfaceDeclaration cid, String scopePath, String pkg, ArrayNode symbols) {
        for (BodyDeclaration<?> member : cid.getMembers()) {
            if (member instanceof FieldDeclaration fd) {
                for (VariableDeclarator vd : fd.getVariables()) {
                    ObjectNode sym = mapper.createObjectNode();
                    sym.put("name", vd.getNameAsString());
                    sym.put("kind", "field");
                    sym.put("type", vd.getType().asString());
                    sym.put("scope", scopePath);
                    sym.put("modifiers", fd.getModifiers().stream()
                        .map(m -> m.getKeyword().asString()).collect(Collectors.joining(" ")));
                    sym.put("declaredAt", vd.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
                    symbols.add(sym);
                }
            } else if (member instanceof MethodDeclaration md) {
                ObjectNode sym = mapper.createObjectNode();
                sym.put("name", md.getNameAsString());
                sym.put("kind", "method");
                sym.put("type", md.getType().asString());
                sym.put("scope", scopePath);
                sym.put("modifiers", md.getModifiers().stream()
                    .map(m -> m.getKeyword().asString()).collect(Collectors.joining(" ")));
                ArrayNode params = mapper.createArrayNode();
                for (Parameter p : md.getParameters()) {
                    ObjectNode param = mapper.createObjectNode();
                    param.put("name", p.getNameAsString());
                    param.put("type", p.getType().asString());
                    params.add(param);
                }
                sym.set("parameters", params);
                symbols.add(sym);
            }
        }
    }

    // --- Type Resolution ---

    /**
     * Walks the AST and collects type resolution steps for named expressions,
     * particularly chained calls like System.out.println.
     * Uses pattern-based resolution for well-known stdlib symbols.
     */
    private static class TypeResolutionCollector extends VoidVisitorAdapter<Void> {
        private final ArrayNode result = mapper.createArrayNode();
        private final Map<String, String> varTypes = new HashMap<>();

        public ArrayNode getResult() {
            return result;
        }

        @Override
        public void visit(MethodDeclaration md, Void arg) {
            for (Parameter param : md.getParameters()) {
                varTypes.put(param.getNameAsString(), param.getType().asString());
            }
            super.visit(md, arg);
        }

        @Override
        public void visit(VariableDeclarator vd, Void arg) {
            varTypes.put(vd.getNameAsString(), vd.getType().asString());
            super.visit(vd, arg);
        }

        @Override
        public void visit(ForStmt fs, Void arg) {
            for (Expression init : fs.getInitialization()) {
                init.accept(this, arg);
            }
            fs.getCompare().ifPresent(c -> c.accept(this, arg));
            for (Expression upd : fs.getUpdate()) {
                upd.accept(this, arg);
            }
            fs.getBody().accept(this, arg);
        }

        @Override
        public void visit(ForEachStmt fes, Void arg) {
            fes.getVariable().accept(this, arg);
            fes.getIterable().accept(this, arg);
            fes.getBody().accept(this, arg);
        }

        @Override
        public void visit(NameExpr ne, Void arg) {
            String name = ne.getNameAsString();
            ObjectNode entry = mapper.createObjectNode();
            entry.put("symbol", name);
            entry.put("source", ne.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));

            // Pattern-based resolution for well-known stdlib symbols + local variable types
            String[] knownStdlib = {
                "System", "String", "Object", "Math", "Integer", "Double",
                "Boolean", "Character", "Byte", "Short", "Long", "Float",
                "Number", "Thread", "Runnable", "Exception", "Error",
                "RuntimeException", "IllegalArgumentException", "NullPointerException"
            };
            boolean resolved = false;
            String resolvedFqn = null;

            for (String cls : knownStdlib) {
                if (name.equals(cls)) {
                    resolvedFqn = "java.lang." + cls;
                    resolved = true;
                    break;
                }
            }
            String localType = varTypes.get(name);
            if (!resolved && localType != null) {
                resolved = true;
                resolvedFqn = localType;
            }

            entry.put("resolved", resolved);
            if (resolved) {
                entry.put("fqn", resolvedFqn);
                if (localType != null) {
                    entry.put("type", localType);
                    entry.put("kind", "variable");
                } else {
                    entry.put("kind", "class");
                }
            } else {
                entry.put("resolved", false);
            }
            result.add(entry);
            super.visit(ne, arg);
        }

        @Override
        public void visit(FieldAccessExpr fae, Void arg) {
            String fullChain = fae.toString();
            ObjectNode entry = mapper.createObjectNode();
            entry.put("symbol", fullChain);
            entry.put("source", fae.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));

            Expression scope = fae.getScope();
            String scopeStr = scope != null ? scope.toString() : "";

            // Pattern: System.out → java.lang.System.out : java.io.PrintStream
            if (scopeStr.equals("System")) {
                entry.put("resolved", true);
                entry.put("fqn", "java.lang.System.out");
                entry.put("type", "java.io.PrintStream");
                entry.put("kind", "field");
            } else if ("System.out".equals(scopeStr)) {
                entry.put("resolved", true);
                entry.put("fqn", "java.io.PrintStream");
                entry.put("type", "java.io.PrintStream");
                entry.put("kind", "class");
            } else {
                entry.put("resolved", false);
            }
            result.add(entry);
            super.visit(fae, arg);
        }

        @Override
        public void visit(MethodCallExpr mce, Void arg) {
            String methodName = mce.getNameAsString();
            Optional<Expression> scopeOpt = mce.getScope();
            String receiver = scopeOpt.map(Object::toString).orElse("");
            String fullCall = receiver.isEmpty() ? methodName : receiver + "." + methodName;

            ObjectNode entry = mapper.createObjectNode();
            entry.put("symbol", fullCall);
            entry.put("source", mce.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));

            // Resolution: System.out.println(String) → PrintStream.println(String)
            if ("println".equals(methodName) && "System.out".equals(receiver)) {
                String argType = mce.getArguments().isEmpty()
                    ? "void"
                    : getArgTypeString(mce.getArguments().get(0));
                entry.put("resolved", true);
                entry.put("fqn", "java.io.PrintStream.println(" + argType + ")");
                entry.put("returnType", "void");
                entry.put("kind", "method");
            } else if ("print".equals(methodName) && "System.out".equals(receiver)) {
                String argType = mce.getArguments().isEmpty()
                    ? "void"
                    : getArgTypeString(mce.getArguments().get(0));
                entry.put("resolved", true);
                entry.put("fqn", "java.io.PrintStream.print(" + argType + ")");
                entry.put("returnType", "void");
                entry.put("kind", "method");
            } else if ("exit".equals(methodName) && "System".equals(receiver)) {
                entry.put("resolved", true);
                entry.put("fqn", "java.lang.System.exit(int)");
                entry.put("returnType", "void");
                entry.put("kind", "method");
            } else if ("sleep".equals(methodName) && "Thread".equals(receiver)) {
                entry.put("resolved", true);
                entry.put("fqn", "java.lang.Thread.sleep(long)");
                entry.put("returnType", "void");
                entry.put("kind", "method");
            } else if ("abs".equals(methodName) && "Math".equals(receiver)) {
                String argType = mce.getArguments().isEmpty() ? "int" : getArgTypeString(mce.getArguments().get(0));
                entry.put("resolved", true);
                entry.put("fqn", "java.lang.Math.abs(" + argType + ")");
                entry.put("returnType", argType);
                entry.put("kind", "method");
            } else {
                entry.put("resolved", false);
            }
            result.add(entry);
            super.visit(mce, arg);
        }

        private String getArgTypeString(Expression expr) {
            if (expr instanceof StringLiteralExpr) return "String";
            if (expr instanceof IntegerLiteralExpr) return "int";
            if (expr instanceof DoubleLiteralExpr) return "double";
            if (expr instanceof BooleanLiteralExpr) return "boolean";
            if (expr instanceof CharLiteralExpr) return "char";
            if (expr instanceof LongLiteralExpr) return "long";
            if (expr instanceof NullLiteralExpr) return "null";
            if (expr instanceof NameExpr ne) {
                String name = ne.getNameAsString();
                if ("true".equals(name) || "false".equals(name)) return "boolean";
                return name;
            }
            if (expr instanceof ArrayAccessExpr) return "Object";
            try {
                return expr.calculateResolvedType().describe();
            } catch (Exception e) {
                return "Object";
            }
        }
    }

    // --- Type Checking ---

    private static class TypeCheckCollector extends VoidVisitorAdapter<Void> {
        private final ArrayNode checks = mapper.createArrayNode();
        private final ArrayNode errors = mapper.createArrayNode();
        private final Map<String, String> varTypes = new HashMap<>();

        public ArrayNode getChecks() { return checks; }
        public ArrayNode getErrors() { return errors; }

        private String normalizeType(String type) {
            if (type != null && type.startsWith("java.lang.")) {
                return type.substring("java.lang.".length());
            }
            return type;
        }

        @Override
        public void visit(MethodDeclaration md, Void arg) {
            for (Parameter param : md.getParameters()) {
                varTypes.put(param.getNameAsString(), param.getType().asString());
            }
            super.visit(md, arg);
        }

        @Override
        public void visit(ForStmt fs, Void arg) {
            // Ensure initialization (where loop variable is declared) is visited before compare/update/body
            // Default VoidVisitorAdapter order can cause body to be visited before init, leading to false "cannot find symbol" for loop variables.
            for (Expression init : fs.getInitialization()) {
                init.accept(this, arg);
            }
            fs.getCompare().ifPresent(c -> c.accept(this, arg));
            for (Expression upd : fs.getUpdate()) {
                upd.accept(this, arg);
            }
            fs.getBody().accept(this, arg);
        }

        @Override
        public void visit(ForEachStmt fes, Void arg) {
            fes.getVariable().accept(this, arg);
            fes.getIterable().accept(this, arg);
            fes.getBody().accept(this, arg);
        }

        @Override
        public void visit(AssignExpr ae, Void arg) {
            Expression target = ae.getTarget();
            Expression value = ae.getValue();

            String targetType = resolveExprType(target);
            String valueType = resolveExprType(value);

            ObjectNode check = mapper.createObjectNode();
            check.put("check", "assignment");
            check.put("target", target.toString());
            check.put("targetType", targetType);
            check.put("value", value.toString());
            check.put("valueType", valueType);
            check.put("operator", ae.getOperator().asString());

            boolean pass = isAssignable(targetType, valueType);
            check.put("result", pass ? "pass" : "fail");
            check.put("location", ae.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
            check.put("line", ae.getBegin().map(p -> p.line).orElse(-1));
            check.put("column", ae.getBegin().map(p -> p.column).orElse(-1));

            checks.add(check);

            if (!pass) {
                ObjectNode err = mapper.createObjectNode();
                err.put("message", "Type mismatch: cannot assign " + valueType + " to " + targetType);
                err.put("line", ae.getBegin().map(p -> p.line).orElse(-1));
                err.put("column", ae.getBegin().map(p -> p.column).orElse(-1));
                err.put("severity", "ERROR");
                err.put("checkId", checks.size() - 1);
                errors.add(err);
            }

            super.visit(ae, arg);
        }

        @Override
        public void visit(MethodCallExpr mce, Void arg) {
            String methodName = mce.getNameAsString();
            List<String> argTypes = new ArrayList<>();
            for (Expression expr : mce.getArguments()) {
                argTypes.add(resolveExprType(expr));
            }

            Optional<Expression> scopeOpt = mce.getScope();
            String receiver = scopeOpt.map(Object::toString).orElse("this");

            ObjectNode check = mapper.createObjectNode();
            check.put("check", "method_call");
            check.put("method", methodName);

            ArrayNode argList = mapper.createArrayNode();
            argTypes.forEach(argList::add);
            check.set("argumentTypes", argList);
            check.put("receiver", receiver);

            boolean known = isKnownMethod(methodName, argTypes, receiver);
            check.put("result", known ? "pass" : "unknown");
            check.put("location", mce.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
            check.put("line", mce.getBegin().map(p -> p.line).orElse(-1));
            check.put("column", mce.getBegin().map(p -> p.column).orElse(-1));

            checks.add(check);

            if (!known) {
                ObjectNode err = mapper.createObjectNode();
                err.put("message", "Cannot resolve method '" + receiver + "." + methodName + "' with arguments " + argTypes);
                err.put("line", mce.getBegin().map(p -> p.line).orElse(-1));
                err.put("column", mce.getBegin().map(p -> p.column).orElse(-1));
                err.put("severity", "ERROR");
                err.put("checkId", checks.size() - 1);
                errors.add(err);
            }

            super.visit(mce, arg);
        }

        @Override
        public void visit(NameExpr ne, Void arg) {
            String name = ne.getNameAsString();
            String[] knownStdlib = {"System", "String", "Math", "Integer", "Double", "Boolean",
                "Character", "Byte", "Short", "Long", "Float", "Number", "Thread",
                "Object", "RuntimeException", "Exception", "Error",
                "IllegalArgumentException", "NullPointerException"};
            boolean known = Arrays.asList(knownStdlib).contains(name) || varTypes.containsKey(name);

            ObjectNode check = mapper.createObjectNode();
            check.put("check", "symbol_resolution");
            check.put("symbol", name);
            check.put("result", known ? "pass" : "unresolved");
            check.put("location", ne.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
            check.put("line", ne.getBegin().map(p -> p.line).orElse(-1));
            check.put("column", ne.getBegin().map(p -> p.column).orElse(-1));
            checks.add(check);

            if (!known) {
                ObjectNode err = mapper.createObjectNode();
                err.put("message", "Cannot find symbol: " + name);
                err.put("line", ne.getBegin().map(p -> p.line).orElse(-1));
                err.put("column", ne.getBegin().map(p -> p.column).orElse(-1));
                err.put("severity", "ERROR");
                err.put("checkId", checks.size() - 1);
                errors.add(err);
            }
            super.visit(ne, arg);
        }

        @Override
        public void visit(VariableDeclarator vd, Void arg) {
            varTypes.put(vd.getNameAsString(), vd.getType().asString());
            if (vd.getInitializer().isPresent()) {
                Expression init = vd.getInitializer().get();
                String varType = vd.getType().asString();
                String initType = resolveExprType(init);

                ObjectNode check = mapper.createObjectNode();
                check.put("check", "variable_declaration");
                check.put("variable", vd.getNameAsString());
                check.put("declaredType", varType);
                check.put("initType", initType);
                check.put("initValue", init.toString());

                boolean pass = isAssignable(varType, initType);
                check.put("result", pass ? "pass" : "fail");
                check.put("location", vd.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
                check.put("line", vd.getBegin().map(p -> p.line).orElse(-1));
                check.put("column", vd.getBegin().map(p -> p.column).orElse(-1));
                checks.add(check);

                if (!pass) {
                    ObjectNode err = mapper.createObjectNode();
                    err.put("message", "Incompatible types: " + varType + " cannot be converted from " + initType);
                    err.put("line", vd.getBegin().map(p -> p.line).orElse(-1));
                    err.put("column", vd.getBegin().map(p -> p.column).orElse(-1));
                    err.put("severity", "ERROR");
                    err.put("checkId", checks.size() - 1);
                    errors.add(err);
                }
            }
            super.visit(vd, arg);
        }

        @Override
        public void visit(UnaryExpr ue, Void arg) {
            Expression inner = ue.getExpression();
            String innerType = resolveExprType(inner);
            String op = ue.getOperator().asString();

            ObjectNode check = mapper.createObjectNode();
            check.put("check", "unary_expression");
            check.put("operator", op);
            check.put("operandType", innerType);

            boolean pass;
            if (ue.getOperator() == UnaryExpr.Operator.MINUS || ue.getOperator() == UnaryExpr.Operator.PLUS) {
                pass = isNumeric(innerType);
            } else if (ue.getOperator() == UnaryExpr.Operator.LOGICAL_COMPLEMENT) {
                pass = "boolean".equals(innerType);
            } else {
                pass = true;
            }

            check.put("result", pass ? "pass" : "fail");
            check.put("location", ue.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
            check.put("line", ue.getBegin().map(p -> p.line).orElse(-1));
            check.put("column", ue.getBegin().map(p -> p.column).orElse(-1));
            checks.add(check);

            if (!pass) {
                ObjectNode err = mapper.createObjectNode();
                err.put("message", "Operator '" + op + "' cannot be applied to '" + innerType + "'");
                err.put("line", ue.getBegin().map(p -> p.line).orElse(-1));
                err.put("column", ue.getBegin().map(p -> p.column).orElse(-1));
                err.put("severity", "ERROR");
                err.put("checkId", checks.size() - 1);
                errors.add(err);
            }
            super.visit(ue, arg);
        }

        @Override
        public void visit(BinaryExpr be, Void arg) {
            String leftType = resolveExprType(be.getLeft());
            String rightType = resolveExprType(be.getRight());
            String op = be.getOperator().asString();

            ObjectNode check = mapper.createObjectNode();
            check.put("check", "binary_expression");
            check.put("operator", op);
            check.put("leftType", leftType);
            check.put("rightType", rightType);

            boolean pass = isBinaryCompatible(leftType, rightType, op);
            check.put("result", pass ? "pass" : "fail");
            check.put("location", be.getBegin().map(p -> p.line + ":" + p.column).orElse("?"));
            check.put("line", be.getBegin().map(p -> p.line).orElse(-1));
            check.put("column", be.getBegin().map(p -> p.column).orElse(-1));
            checks.add(check);

            if (!pass) {
                ObjectNode err = mapper.createObjectNode();
                err.put("message", "Operator '" + op + "' cannot be applied to '" + leftType + "', '" + rightType + "'");
                err.put("line", be.getBegin().map(p -> p.line).orElse(-1));
                err.put("column", be.getBegin().map(p -> p.column).orElse(-1));
                err.put("severity", "ERROR");
                err.put("checkId", checks.size() - 1);
                errors.add(err);
            }
            super.visit(be, arg);
        }

        private String resolveExprType(Expression expr) {
            if (expr instanceof StringLiteralExpr) return "java.lang.String";
            if (expr instanceof IntegerLiteralExpr) return "int";
            if (expr instanceof DoubleLiteralExpr) return "double";
            if (expr instanceof BooleanLiteralExpr) return "boolean";
            if (expr instanceof CharLiteralExpr) return "char";
            if (expr instanceof LongLiteralExpr) return "long";
            if (expr instanceof NullLiteralExpr) return "null";

            if (expr instanceof NameExpr ne) {
                String name = ne.getNameAsString();
                if ("true".equals(name) || "false".equals(name)) return "boolean";
                String declared = varTypes.get(name);
                if (declared != null) return declared;
                String[] knownStdlib = {"System", "String", "Math", "Integer", "Double", "Boolean",
                    "Character", "Byte", "Short", "Long", "Float", "Number", "Thread",
                    "Object", "RuntimeException", "Exception", "Error"};
                if (Arrays.asList(knownStdlib).contains(name)) {
                    return "java.lang." + name;
                }
                return name;
            }

            if (expr instanceof FieldAccessExpr fae) {
                Expression scope = fae.getScope();
                String scopeStr = scope != null ? scope.toString() : "";
                if ("System.out".equals(scopeStr)) return "java.io.PrintStream";
                if ("System.err".equals(scopeStr)) return "java.io.PrintStream";
                if ("System".equals(scopeStr) && "out".equals(fae.getNameAsString())) return "java.io.PrintStream";
                return fae.getNameAsString();
            }

            if (expr instanceof ArrayAccessExpr aae) {
                String base = resolveExprType(aae.getName());
                if (base == null || base.isBlank()) return "Object";
                return base.replace("[]", "");
            }

            if (expr instanceof MethodCallExpr mce) {
                String method = mce.getNameAsString();
                Optional<Expression> scopeOpt = mce.getScope();
                String receiver = scopeOpt.map(Object::toString).orElse("");
                if ("println".equals(method) && "System.out".equals(receiver)) return "void";
                if ("print".equals(method) && "System.out".equals(receiver)) return "void";
                if ("exit".equals(method) && "System".equals(receiver)) return "void";
                if ("abs".equals(method) && "Math".equals(receiver)) return "int";
                if ("sqrt".equals(method) && "Math".equals(receiver)) return "double";
                if ("parseInt".equals(method) && "Integer".equals(receiver)) return "int";
                return "Object";
            }

            if (expr instanceof BinaryExpr be) {
                String leftType = resolveExprType(be.getLeft());
                String rightType = resolveExprType(be.getRight());
                return promote(leftType, rightType);
            }

            if (expr instanceof UnaryExpr ue) {
                String innerType = resolveExprType(ue.getExpression());
                if ("boolean".equals(innerType)) return "boolean";
                return innerType;
            }

            if (expr instanceof CastExpr ce) {
                return ce.getType().asString();
            }

            return expr.toString();
        }

        private boolean isAssignable(String target, String value) {
            if (target == null || value == null) return true;
            if (target.equals(value)) return true;

            // null is assignable to any reference type
            if ("null".equals(value)) return !isPrimitive(target);

            // Primitive widening
            if (isPrimitive(target) && isPrimitive(value)) {
                return isWiderThan(target, value);
            }

            // int → long, float, double
            if ("int".equals(value) && ("long".equals(target) || "float".equals(target) || "double".equals(target))) return true;
            if ("long".equals(value) && ("float".equals(target) || "double".equals(target))) return true;
            if ("float".equals(value) && "double".equals(target)) return true;
            if ("char".equals(value) && ("int".equals(target) || "long".equals(target) || "float".equals(target) || "double".equals(target))) return true;
            if ("short".equals(value) && ("int".equals(target) || "long".equals(target) || "float".equals(target) || "double".equals(target))) return true;
            if ("byte".equals(value) && ("int".equals(target) || "long".equals(target) || "float".equals(target) || "double".equals(target))) return true;

            // String literals to String
            if ("java.lang.String".equals(target) && "java.lang.String".equals(value)) return true;

            // FQN matches or ends with
            return target.equals(value) || target.endsWith("." + value) || value.endsWith("." + target);
        }

        private boolean isPrimitive(String type) {
            return type != null && (type.equals("int") || type.equals("long") || type.equals("float")
                || type.equals("double") || type.equals("boolean") || type.equals("char")
                || type.equals("byte") || type.equals("short"));
        }

        private boolean isNumeric(String type) {
            return type != null && (type.equals("int") || type.equals("long") || type.equals("float")
                || type.equals("double") || type.equals("char") || type.equals("byte") || type.equals("short"));
        }

        private boolean isWiderThan(String wider, String narrower) {
            Map<String, Integer> width = Map.of(
                "byte", 1, "short", 2, "char", 3, "int", 4, "long", 5, "float", 6, "double", 7
            );
            return width.getOrDefault(wider, 0) >= width.getOrDefault(narrower, 0);
        }

        private boolean isBinaryCompatible(String left, String right, String op) {
            if ("+".equals(op)) {
                // String concatenation works with any type + String
                if ("java.lang.String".equals(left) || "java.lang.String".equals(right)) return true;
                return isCompatibleOperands(left, right);
            }
            if ("==".equals(op) || "!=".equals(op)) {
                return isCompatibleOperands(left, right);
            }
            if ("||".equals(op) || "&&".equals(op)) {
                return "boolean".equals(left) && "boolean".equals(right);
            }
            if (isComparisonOp(op)) {
                return isCompatibleOperands(left, right);
            }
            // Arithmetic ops
            return isNumeric(left) && isNumeric(right);
        }

        private boolean isComparisonOp(String op) {
            return op.equals("<") || op.equals(">") || op.equals("<=") || op.equals(">=");
        }

        private boolean isCompatibleOperands(String left, String right) {
            if ("null".equals(left) || "null".equals(right)) return true;
            if (left.equals(right)) return true;
            if (isPrimitive(left) && isPrimitive(right) && isWiderThan(left, right)) return true;
            if (isPrimitive(left) && isPrimitive(right) && isWiderThan(right, left)) return true;
            if (isNumeric(left) && isNumeric(right)) return true;
            return left.equals(right) || left.endsWith("." + right) || right.endsWith("." + left);
        }

        private String promote(String a, String b) {
            if (isPrimitive(a) && isPrimitive(b)) {
                int wa = widthMap.getOrDefault(a, 0);
                int wb = widthMap.getOrDefault(b, 0);
                int max = Math.max(wa, wb);
                for (Map.Entry<String, Integer> e : widthMap.entrySet()) {
                    if (e.getValue() == max) return e.getKey();
                }
            }
            if ("java.lang.String".equals(a) || "java.lang.String".equals(b)) return "java.lang.String";
            return a != null ? a : b;
        }

        private Map<String, Integer> widthMap = Map.of(
            "byte", 1, "short", 2, "char", 3, "int", 4, "long", 5, "float", 6, "double", 7
        );

        private boolean isKnownMethod(String methodName, List<String> argTypes, String receiver) {
            Map<String, List<String>> printStreamMethods = Map.of(
                "println", List.of("String", "int", "double", "boolean", "char", "long", "float", "null"),
                "print", List.of("String", "int", "double", "boolean", "char", "long", "float", "null")
            );

            if ("System.out".equals(receiver) || "System.err".equals(receiver)) {
                if (printStreamMethods.containsKey(methodName)) {
                    if (argTypes.isEmpty()) return true;
                    return printStreamMethods.get(methodName).contains(normalizeType(argTypes.get(0)));
                }
                return false;
            }

            if ("Math".equals(receiver) || "java.lang.Math".equals(receiver)) {
                Map<String, List<String>> mathMethods = Map.of(
                    "abs", List.of("int", "long", "double", "float"),
                    "max", List.of("int", "long", "double", "float"),
                    "min", List.of("int", "long", "double", "float"),
                    "sqrt", List.of("double"),
                    "pow", List.of("double")
                );
                if (mathMethods.containsKey(methodName)) {
                    if (argTypes.isEmpty()) return false;
                    List<String> allowed = mathMethods.get(methodName);
                    for (String argType : argTypes) {
                        if (!allowed.contains(normalizeType(argType))) return false;
                    }
                    return true;
                }
            }

            return false;
        }
    }

    /**
     * Context for scope tree construction.
     */
    private static class ScopeBuildContext {
        int nextScopeId = 0;
    }
}
