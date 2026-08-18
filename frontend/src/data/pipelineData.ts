import type { TFunction } from 'i18next';

export interface PipelineStepData {
  id: string;
  title: string;
  subtitle: string;
  phase: number;
  color: string;
  icon: string;
  explanation: string[];
  javaConcept: string;
  input: string;
  output: string;
}

export const JAVA_HELLO_WORLD = `public class HelloWorld {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;

export function getPipelineSteps(t: TFunction): PipelineStepData[] {
  return [
    {
      id: "source",
      title: t('pipeline.steps.source.title'),
      subtitle: t('pipeline.steps.source.subtitle'),
      phase: 1,
      color: "#8B5CF6",
      icon: "FileCode",
      explanation: [
        t('pipeline.steps.source.explanation1'),
        t('pipeline.steps.source.explanation2'),
        t('pipeline.steps.source.explanation3'),
      ],
      javaConcept: t('pipeline.steps.source.javaConcept'),
      input: "// Your Java source code",
      output: JAVA_HELLO_WORLD,
    },
    {
      id: "lexical",
      title: t('pipeline.steps.lexical.title'),
      subtitle: t('pipeline.steps.lexical.subtitle'),
      phase: 2,
      color: "#00FF88",
      icon: "Scan",
      explanation: [
        t('pipeline.steps.lexical.explanation1'),
        t('pipeline.steps.lexical.explanation2'),
        t('pipeline.steps.lexical.explanation3'),
      ],
      javaConcept: t('pipeline.steps.lexical.javaConcept'),
      input: JAVA_HELLO_WORLD,
      output: `[
  { "type": "KEYWORD",       "value": "public",     "line": 1, "col": 1  },
  { "type": "KEYWORD",       "value": "class",      "line": 1, "col": 8  },
  { "type": "IDENTIFIER",    "value": "HelloWorld", "line": 1, "col": 14 },
  { "type": "SEPARATOR",     "value": "{",          "line": 1, "col": 25 },
  { "type": "KEYWORD",       "value": "public",     "line": 2, "col": 5  },
  { "type": "KEYWORD",       "value": "static",     "line": 2, "col": 12 },
  { "type": "KEYWORD",       "value": "void",       "line": 2, "col": 19 },
  { "type": "IDENTIFIER",    "value": "main",       "line": 2, "col": 24 },
  { "type": "SEPARATOR",     "value": "(",          "line": 2, "col": 28 },
  { "type": "KEYWORD",       "value": "String",     "line": 2, "col": 29 },
  { "type": "SEPARATOR",     "value": "[",          "line": 2, "col": 35 },
  { "type": "SEPARATOR",     "value": "]",          "line": 2, "col": 36 },
  { "type": "IDENTIFIER",    "value": "args",       "line": 2, "col": 38 },
  { "type": "SEPARATOR",     "value": ")",          "line": 2, "col": 42 },
  { "type": "SEPARATOR",     "value": "{",          "line": 2, "col": 44 },
  { "type": "IDENTIFIER",    "value": "System",     "line": 3, "col": 9  },
  { "type": "OPERATOR",      "value": ".",          "line": 3, "col": 15 },
  { "type": "IDENTIFIER",    "value": "out",        "line": 3, "col": 16 },
  { "type": "OPERATOR",      "value": ".",          "line": 3, "col": 19 },
  { "type": "IDENTIFIER",    "value": "println",    "line": 3, "col": 20 },
  { "type": "SEPARATOR",     "value": "(",          "line": 3, "col": 27 },
  { "type": "STRING_LITERAL","value": "\\"Hello, World!\\"", "line": 3, "col": 28 },
  { "type": "SEPARATOR",     "value": ")",          "line": 3, "col": 44 },
  { "type": "SEPARATOR",     "value": ";",          "line": 3, "col": 45 },
  { "type": "SEPARATOR",     "value": "}",          "line": 4, "col": 5  },
  { "type": "SEPARATOR",     "value": "}",          "line": 5, "col": 1  }
]`,
    },
    {
      id: "syntax",
      title: t('pipeline.steps.syntax.title'),
      subtitle: t('pipeline.steps.syntax.subtitle'),
      phase: 3,
      color: "#00D4FF",
      icon: "TreePine",
      explanation: [
        t('pipeline.steps.syntax.explanation1'),
        t('pipeline.steps.syntax.explanation2'),
        t('pipeline.steps.syntax.explanation3'),
      ],
      javaConcept: t('pipeline.steps.syntax.javaConcept'),
      input: "[26 tokens from Lexical Analysis]",
      output: `{
  "type": "CompilationUnit",
  "children": [
    {
      "type": "ClassDeclaration",
      "name": "HelloWorld",
      "modifiers": ["public"],
      "children": [
        {
          "type": "MethodDeclaration",
          "name": "main",
          "modifiers": ["public", "static"],
          "returnType": "void",
          "parameters": [
            {
              "type": "Parameter",
              "name": "args",
              "type": "String[]"
            }
          ],
          "children": [
            {
              "type": "ExpressionStmt",
              "expression": {
                "type": "MethodCallExpr",
                "scope": {
                  "type": "FieldAccessExpr",
                  "scope": { "type": "NameExpr", "name": "System" },
                  "name": "out"
                },
                "name": "println",
                "arguments": [
                  {
                    "type": "StringLiteralExpr",
                    "value": "Hello, World!"
                  }
                ]
              }
            }
          ]
        }
      ]
    }
  ]
}`,
    },
    {
      id: "semantic",
      title: t('pipeline.steps.semantic.title'),
      subtitle: t('pipeline.steps.semantic.subtitle'),
      phase: 4,
      color: "#FF00FF",
      icon: "Search",
      explanation: [
        t('pipeline.steps.semantic.explanation1'),
        t('pipeline.steps.semantic.explanation2'),
        t('pipeline.steps.semantic.explanation3'),
      ],
      javaConcept: t('pipeline.steps.semantic.javaConcept'),
      input: "{ AST from Syntax Analysis }",
      output: `{
  "package": "",
  "imports": [],
  "types": [
    {
      "kind": "class",
      "name": "HelloWorld",
      "modifiers": ["public"],
      "members": [
        {
          "kind": "method",
          "name": "main",
          "modifiers": ["public", "static"],
          "returnType": "void",
          "parameters": [
            { "name": "args", "type": "String[]" }
          ],
          "typeParameters": [],
          "thrownExceptions": []
        }
      ]
    }
  ],
  "typeResolution": {
    "System": { "resolved": true, "type": "java.lang.System" },
    "System.out": { "resolved": true, "type": "java.io.PrintStream" },
    "println(String)": { "resolved": true, "returnType": "void" }
  },
  "errors": []
}`,
    },
    {
      id: "ir",
      title: t('pipeline.steps.ir.title'),
      subtitle: t('pipeline.steps.ir.subtitle'),
      phase: 5,
      color: "#FFB000",
      icon: "Code2",
      explanation: [
        t('pipeline.steps.ir.explanation1'),
        t('pipeline.steps.ir.explanation2'),
        t('pipeline.steps.ir.explanation3'),
      ],
      javaConcept: t('pipeline.steps.ir.javaConcept'),
      input: "{ AST + Symbol Table from previous phases }",
      output: `// Three-Address Code for HelloWorld.main()
// Each line: result = operand1 operator operand2

  t1 = invokevirtual System.out : PrintStream
  t2 = ldc "Hello, World!"
  t3 = invokevirtual PrintStream.println(String) : void
  return

// Expanded form (what the compiler actually generates):

  0: getstatic     java/lang/System.out : Ljava/io/PrintStream;
  3: ldc           "Hello, World!"
  5: invokevirtual java/io/PrintStream.println:(Ljava/lang/String;)V
  8: return

// Control Flow:
//   [Entry] --> [Call println] --> [Return]
//   No branches, no loops — straight-line code.`,
    },
    {
      id: "optimizer",
      title: t('pipeline.steps.optimizer.title'),
      subtitle: t('pipeline.steps.optimizer.subtitle'),
      phase: 6,
      color: "#A3E635",
      icon: "Wand2",
      explanation: [
        t('pipeline.steps.optimizer.explanation1'),
        t('pipeline.steps.optimizer.explanation2'),
        t('pipeline.steps.optimizer.explanation3'),
      ],
      javaConcept: t('pipeline.steps.optimizer.javaConcept'),
      input: "{ IR (Three-Address Code) from the front end }",
      output: `// Original IR — inside a loop:
//   for i = 1..n {  a = a * 2 * b * c * d(i)  }
//
// Analysis: 2, b, c never change inside the loop
// Transformation (loop-invariant code motion):
//
//   t = 2 * b * c          // hoisted OUT of the loop
//   for i = 1..n {  a = a * d(i) * t  }
//
// Multiplications per loop: 4n  ->  2n + 2`,
    },
    {
      id: "bytecode",
      title: t('pipeline.steps.bytecode.title'),
      subtitle: t('pipeline.steps.bytecode.subtitle'),
      phase: 7,
      color: "#FF3366",
      icon: "Cpu",
      explanation: [
        t('pipeline.steps.bytecode.explanation1'),
        t('pipeline.steps.bytecode.explanation2'),
        t('pipeline.steps.bytecode.explanation3'),
      ],
      javaConcept: t('pipeline.steps.bytecode.javaConcept'),
      input: "{ Optimized IR from the Optimizer }",
      output: `// HelloWorld.class — Compiled with javac
// Disassembled with javap -c -p

public class HelloWorld {
  public static void main(java.lang.String[]);
    Code:
       0: getstatic     #2  // Field java/lang/System.out:Ljava/io/PrintStream;
       3: ldc           #3  // String "Hello, World!"
       5: invokevirtual #4  // Method java/io/PrintStream.println:(Ljava/lang/String;)V
       8: return

  // Bytecode bytes (hex):
  // B2 00 02 12 03 B6 00 04 B1
  //
  // B2 = getstatic    (2 bytes operand)
  // 12 = ldc          (1 byte operand)
  // B6 = invokevirtual (2 bytes operand)
  // B1 = return       (no operands)
}`,
    },
    {
      id: "execution",
      title: t('pipeline.steps.execution.title'),
      subtitle: t('pipeline.steps.execution.subtitle'),
      phase: 8,
      color: "#F8FAFC",
      icon: "Play",
      explanation: [
        t('pipeline.steps.execution.explanation1'),
        t('pipeline.steps.execution.explanation2'),
        t('pipeline.steps.execution.explanation3'),
      ],
      javaConcept: t('pipeline.steps.execution.javaConcept'),
      input: "{ HelloWorld.class — the bytecode from the back end }",
      output: `$ java HelloWorld
Hello, World!
$
// What happened under the hood:
//   1. JVM class loader loads HelloWorld.class
//   2. Bytecode is verified, then interpreted op by op
//   3. Hot code detected -> JIT compiler translates
//      it to native machine code for your CPU
//   4. Native code runs directly on the hardware`,
    },
  ];
}
