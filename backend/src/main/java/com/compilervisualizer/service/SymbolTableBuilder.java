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
import com.github.javaparser.ast.type.ClassOrInterfaceType;
import com.github.javaparser.ast.type.Type;
import com.github.javaparser.ast.type.TypeParameter;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Builds a hierarchical symbol table from a JavaParser AST.
 * Outputs a JSON structure with scopes: package → class → method → variables.
 */
public class SymbolTableBuilder {

    private static final ObjectMapper mapper = new ObjectMapper();

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

            return mapper.writerWithDefaultPrettyPrinter().writeValueAsString(root);
        } catch (Exception e) {
            return "{\"error\": \"Failed to build symbol table: " + e.getMessage() + "\"}";
        }
    }

    private static ObjectNode typeDeclarationToJson(TypeDeclaration<?> td) {
        ObjectNode obj = mapper.createObjectNode();

        if (td instanceof ClassOrInterfaceDeclaration cid) {
            obj.put("kind", cid.isInterface() ? "interface" : "class");
            obj.put("name", cid.getNameAsString());
            addModifiers(obj, cid.getModifiers());
            addTypeParameters(obj, cid.getTypeParameters());

            // extends
            if (!cid.getExtendedTypes().isEmpty()) {
                ArrayNode extendsArr = mapper.createArrayNode();
                cid.getExtendedTypes().forEach(et -> extendsArr.add(et.getNameAsString()));
                obj.set("extends", extendsArr);
            }

            // implements
            if (!cid.getImplementedTypes().isEmpty()) {
                ArrayNode implementsArr = mapper.createArrayNode();
                cid.getImplementedTypes().forEach(it -> implementsArr.add(it.getNameAsString()));
                obj.set("implements", implementsArr);
            }
        } else if (td instanceof EnumDeclaration ed) {
            obj.put("kind", "enum");
            obj.put("name", ed.getNameAsString());
            addModifiers(obj, ed.getModifiers());

            // enum constants
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

        // members: fields, methods, constructors, inner types
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
            } else if (member instanceof EnumConstantDeclaration ecd) {
                // handled in enum constants above
            }
        }

        obj.set("members", members);
        return obj;
    }

    private static ObjectNode fieldToJson(FieldDeclaration fd) {
        ObjectNode obj = mapper.createObjectNode();
        obj.put("kind", "field");
        addModifiers(obj, fd.getModifiers());

        // process each variable in the declaration (e.g., int x, y;)
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

        // return type
        obj.set("returnType", typeToJson(md.getType()));

        // type parameters (generics)
        addTypeParameters(obj, md.getTypeParameters());

        // parameters
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

        // thrown exceptions
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
                // bounds
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
}
