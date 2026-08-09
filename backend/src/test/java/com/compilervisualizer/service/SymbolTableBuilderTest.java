package com.compilervisualizer.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class SymbolTableBuilderTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void testBasicSymbolTableWithScopeTree() throws Exception {
        String code = """
            public class Main {
                int x;
                public static void main(String[] args) {
                    int y = 5;
                    System.out.println(y);
                }
            }
            """;

        CompilationUnit cu = StaticJavaParser.parse(code);
        String json = SymbolTableBuilder.toJson(cu);

        JsonNode root = mapper.readTree(json);

        // Package level
        assertTrue(root.has("scopeTree"), "Should have scopeTree");
        assertEquals("(default package)", root.get("scopeTree").get("name").asText());
        assertEquals("package", root.get("scopeTree").get("kind").asText());

        // Scope tree should have children (types)
        JsonNode scopeChildren = root.get("scopeTree").get("children");
        assertTrue(scopeChildren.isArray() && scopeChildren.size() > 0, "Should have type children");

        JsonNode mainClass = scopeChildren.get(0);
        assertEquals("Main", mainClass.get("name").asText());
        assertEquals("class", mainClass.get("kind").asText());

        // Method scope should be a child
        JsonNode methodChildren = mainClass.get("children");
        assertTrue(methodChildren.isArray() && methodChildren.size() > 0, "Should have method children");

        JsonNode mainMethod = findMethodScope(methodChildren, "main");
        assertNotNull(mainMethod, "Should find main method scope");
        assertEquals("method", mainMethod.get("kind").asText());

        // Local variables should be in the method scope
        boolean foundY = false;
        for (JsonNode child : mainMethod.get("children")) {
            if ("y".equals(child.get("name").asText()) && "variable".equals(child.get("kind").asText())) {
                foundY = true;
                assertEquals("int", child.get("type").asText());
            }
        }
        assertTrue(foundY, "Should find local variable 'y'");

        // Should also have symbols array
        assertTrue(root.has("symbols"), "Should have symbols array");
    }

    @Test
    void testTypeResolutionForSystemOutPrintln() throws Exception {
        String code = """
            public class Main {
                public static void main(String[] args) {
                    System.out.println("Hello");
                }
            }
            """;

        CompilationUnit cu = StaticJavaParser.parse(code);
        String json = SymbolTableBuilder.toJson(cu);
        JsonNode root = mapper.readTree(json);

        JsonNode resolutions = root.get("typeResolution");
        assertNotNull(resolutions, "Should have typeResolution");

        boolean foundSystemOutPrintln = false;
        for (JsonNode entry : resolutions) {
            String symbol = entry.get("symbol").asText();
            if ("System.out.println".equals(symbol)) {
                foundSystemOutPrintln = true;
                assertTrue(entry.get("resolved").asBoolean(), "println should be resolved");
                assertEquals("java.io.PrintStream.println(String)", entry.get("fqn").asText());
                assertEquals("void", entry.get("returnType").asText());
            }
            if ("System".equals(symbol)) {
                assertTrue(entry.get("resolved").asBoolean(), "System should be resolved");
                assertEquals("java.lang.System", entry.get("fqn").asText());
            }
            if ("System.out".equals(symbol)) {
                assertTrue(entry.get("resolved").asBoolean(), "System.out should be resolved");
                assertEquals("java.io.PrintStream", entry.get("type").asText());
            }
        }
        assertTrue(foundSystemOutPrintln, "Should find System.out.println resolution");
    }

    @Test
    void testTypeCheckingForVariableAssignment() throws Exception {
        String code = """
            public class Main {
                public static void main(String[] args) {
                    int x = 10;
                    double d = x;
                }
            }
            """;

        CompilationUnit cu = StaticJavaParser.parse(code);
        String json = SymbolTableBuilder.toJson(cu);
        JsonNode root = mapper.readTree(json);

        JsonNode checks = root.get("typeChecks");
        assertNotNull(checks, "Should have typeChecks");

        boolean foundAssignment = false;
        for (JsonNode check : checks) {
            if ("assignment".equals(check.get("check").asText()) || "variable_declaration".equals(check.get("check").asText())) {
                foundAssignment = true;
                assertTrue(check.get("result").asText().equals("pass") || check.get("result").asText().equals("fail"),
                    "Should have pass/fail result");
            }
        }
        assertTrue(foundAssignment, "Should have at least one assignment check");
    }

    @Test
    void testTypeErrorDetection() throws Exception {
        String code = """
            public class Main {
                public static void main(String[] args) {
                    String s = 10;
                }
            }
            """;

        CompilationUnit cu = StaticJavaParser.parse(code);
        String json = SymbolTableBuilder.toJson(cu);
        JsonNode root = mapper.readTree(json);

        JsonNode errors = root.get("errors");
        assertNotNull(errors, "Should have errors array");
        assertTrue(errors.isArray(), "Errors should be array");

        boolean foundMismatch = false;
        for (JsonNode err : errors) {
            if (err.get("message").asText().contains("Incompatible types")) {
                foundMismatch = true;
                assertEquals("ERROR", err.get("severity").asText());
            }
        }
        assertTrue(foundMismatch, "Should detect type mismatch for String = int");
    }

    @Test
    void testNestedScopes() throws Exception {
        String code = """
            public class Main {
                public static void main(String[] args) {
                    for (int i = 0; i < 10; i++) {
                        int j = i * 2;
                    }
                }
            }
            """;

        CompilationUnit cu = StaticJavaParser.parse(code);
        String json = SymbolTableBuilder.toJson(cu);
        JsonNode root = mapper.readTree(json);

        JsonNode scopeTree = root.get("scopeTree");
        assertNotNull(scopeTree);

        JsonNode methods = scopeTree.get("children").get(0).get("children");
        JsonNode mainMethod = findMethodScope(methods, "main");
        assertNotNull(mainMethod);

        // The method should contain variables from the for loop init
        boolean foundI = false;
        boolean foundJ = false;
        for (JsonNode child : mainMethod.get("children")) {
            String name = child.get("name").asText();
            if ("i".equals(name)) foundI = true;
            if ("j".equals(name)) foundJ = true;
        }
        assertTrue(foundI, "Should find loop variable i");
        assertTrue(foundJ, "Should find inner variable j");
    }

    @Test
    void testNoFalsePositiveErrorsForHelloWorldAndLocalVars() throws Exception {
        String code = """
            public class Main {
                public static void main(String[] args) {
                    System.out.println("Hello, World!");
                    int x = 42;
                    System.out.println(x);
                    System.out.println(args[0]);
                    double d = Math.sqrt(16.0);
                }
            }
            """;

        CompilationUnit cu = StaticJavaParser.parse(code);
        String json = SymbolTableBuilder.toJson(cu);
        JsonNode root = mapper.readTree(json);

        JsonNode errors = root.get("errors");
        assertNotNull(errors, "Should have errors array");
        assertEquals(0, errors.size(), "Valid code must not produce semantic errors, got: " + errors);

        // Local variable + parameter must resolve as known symbols
        JsonNode checks = root.get("typeChecks");
        boolean argsResolved = false;
        boolean xResolved = false;
        for (JsonNode check : checks) {
            if ("symbol_resolution".equals(check.get("check").asText())) {
                String symbol = check.get("symbol").asText();
                if ("args".equals(symbol) && "pass".equals(check.get("result").asText())) argsResolved = true;
                if ("x".equals(symbol) && "pass".equals(check.get("result").asText())) xResolved = true;
            }
        }
        assertTrue(argsResolved, "Parameter 'args' should resolve");
        assertTrue(xResolved, "Local variable 'x' should resolve");
    }

    private JsonNode findMethodScope(JsonNode children, String methodName) {
        for (JsonNode child : children) {
            if ("method".equals(child.get("kind").asText())) {
                String name = child.get("name").asText();
                if (name.startsWith(methodName + "(")) {
                    return child;
                }
            }
        }
        return null;
    }
}
