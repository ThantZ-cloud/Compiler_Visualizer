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

import java.util.List;

/**
 * Walks a JavaParser AST and produces a proper JSON tree.
 */
public class AstSerializer {

    private static final ObjectMapper mapper = new ObjectMapper();

    public static String toJson(CompilationUnit cu) {
        try {
            ObjectNode root = nodeToJson(cu);
            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            return "{\"error\": \"Failed to serialize AST: " + e.getMessage() + "\"}";
        }
    }

    private static ObjectNode nodeToJson(Node node) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("type", node.getClass().getSimpleName());

        node.getBegin().ifPresent(pos -> { obj.put("line", pos.line); obj.put("column", pos.column); });
        node.getEnd().ifPresent(pos -> { obj.put("endLine", pos.line); obj.put("endColumn", pos.column); });

        // --- node-specific metadata ---
        if (node instanceof CompilationUnit cu) {
            cu.getPackageDeclaration().ifPresent(pd -> obj.put("package", pd.getNameAsString()));
            ArrayNode imports = mapper.createArrayNode();
            cu.getImports().forEach(imp -> imports.add(imp.getNameAsString()));
            if (!imports.isEmpty()) obj.set("importNames", imports);
        } else if (node instanceof ImportDeclaration imp) {
            obj.put("name", imp.getNameAsString());
            obj.put("static", imp.isStatic());
            obj.put("asterisk", imp.isAsterisk());
        } else if (node instanceof PackageDeclaration pd) {
            obj.put("name", pd.getNameAsString());
        } else if (node instanceof ClassOrInterfaceDeclaration cid) {
            obj.put("name", cid.getNameAsString());
            obj.put("interface", cid.isInterface());
            addModifierKeywords(obj, cid.getModifiers());
            if (!cid.getExtendedTypes().isEmpty()) {
                ArrayNode arr = mapper.createArrayNode();
                cid.getExtendedTypes().forEach(t -> arr.add(t.getNameAsString()));
                obj.set("extends", arr);
            }
            if (!cid.getImplementedTypes().isEmpty()) {
                ArrayNode arr = mapper.createArrayNode();
                cid.getImplementedTypes().forEach(t -> arr.add(t.getNameAsString()));
                obj.set("implements", arr);
            }
        } else if (node instanceof EnumDeclaration ed) {
            obj.put("name", ed.getNameAsString());
            addModifierKeywords(obj, ed.getModifiers());
        } else if (node instanceof EnumConstantDeclaration ecd) {
            obj.put("name", ecd.getNameAsString());
        } else if (node instanceof AnnotationDeclaration ad) {
            obj.put("name", ad.getNameAsString());
            addModifierKeywords(obj, ad.getModifiers());
        } else if (node instanceof RecordDeclaration rd) {
            obj.put("name", rd.getNameAsString());
            addModifierKeywords(obj, rd.getModifiers());
        } else if (node instanceof FieldDeclaration fd) {
            addModifierKeywords(obj, fd.getModifiers());
        } else if (node instanceof MethodDeclaration md) {
            obj.put("name", md.getNameAsString());
            addModifierKeywords(obj, md.getModifiers());
            obj.put("returnType", md.getType().asString());
        } else if (node instanceof ConstructorDeclaration cd) {
            obj.put("name", cd.getNameAsString());
            addModifierKeywords(obj, cd.getModifiers());
        } else if (node instanceof Parameter p) {
            obj.put("name", p.getNameAsString());
            obj.put("varArgs", p.isVarArgs());
            obj.put("type", p.getType().asString());
        } else if (node instanceof VariableDeclarator vd) {
            obj.put("name", vd.getNameAsString());
            vd.getInitializer().ifPresent(init -> obj.put("initializerPresent", true));
        } else if (node instanceof MarkerAnnotationExpr ma) {
            obj.put("name", ma.getNameAsString());
        } else if (node instanceof SingleMemberAnnotationExpr sma) {
            obj.put("name", sma.getNameAsString());
        } else if (node instanceof NormalAnnotationExpr na) {
            obj.put("name", na.getNameAsString());
        } else if (node instanceof TypeParameter tp) {
            obj.put("name", tp.getNameAsString());
        } else if (node instanceof NameExpr ne) {
            obj.put("name", ne.getNameAsString());
        } else if (node instanceof FieldAccessExpr fae) {
            obj.put("field", fae.getNameAsString());
        } else if (node instanceof MethodCallExpr mce) {
            obj.put("method", mce.getNameAsString());
        } else if (node instanceof MethodReferenceExpr mre) {
            obj.put("method", mre.getIdentifier());
        } else if (node instanceof AssignExpr ae) {
            obj.put("operator", ae.getOperator().asString());
        } else if (node instanceof UnaryExpr ue) {
            obj.put("operator", ue.getOperator().asString());
        } else if (node instanceof BinaryExpr be) {
            obj.put("operator", be.getOperator().asString());
        } else if (node instanceof InstanceOfExpr ie) {
            obj.put("type", ie.getType().asString());
        } else if (node instanceof CastExpr ce) {
            obj.put("type", ce.getType().asString());
        } else if (node instanceof LabeledStmt ls) {
            obj.put("label", ls.getLabel().asString());
        } else if (node instanceof BreakStmt bs) {
            bs.getLabel().ifPresent(l -> obj.put("label", l.asString()));
        } else if (node instanceof ContinueStmt cs) {
            cs.getLabel().ifPresent(l -> obj.put("label", l.asString()));
        } else if (node instanceof ReturnStmt rs) {
            rs.getExpression().ifPresent(e -> obj.put("hasValue", true));
        } else if (node instanceof SwitchEntry se) {
            if (!se.getLabels().isEmpty()) {
                ArrayNode labels = mapper.createArrayNode();
                se.getLabels().forEach(e -> labels.add(e.toString()));
                obj.set("labels", labels);
            }
        } else if (node instanceof LiteralStringValueExpr lve) {
            obj.put("value", lve.getValue());
        } else if (node instanceof IntegerLiteralExpr lie) {
            obj.put("value", lie.getValue());
        } else if (node instanceof LongLiteralExpr lle) {
            obj.put("value", lle.getValue());
        } else if (node instanceof DoubleLiteralExpr dle) {
            obj.put("value", dle.getValue());
        } else if (node instanceof CharLiteralExpr cle) {
            obj.put("value", cle.getValue());
        } else if (node instanceof BooleanLiteralExpr ble) {
            obj.put("value", ble.getValue());
        }

        // recurse into children
        List<Node> children = node.getChildNodes();
        if (!children.isEmpty()) {
            ArrayNode childrenArr = mapper.createArrayNode();
            for (Node child : children) {
                childrenArr.add(nodeToJson(child));
            }
            obj.set("children", childrenArr);
        }

        return obj;
    }

    private static void addModifierKeywords(ObjectNode obj, List<Modifier> modifiers) {
        if (modifiers.isEmpty()) return;
        ArrayNode arr = mapper.createArrayNode();
        modifiers.forEach(m -> arr.add(m.getKeyword().asString()));
        obj.set("modifiers", arr);
    }
}
