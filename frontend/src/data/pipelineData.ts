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

export const pipelineSteps: PipelineStepData[] = [
  {
    id: "source",
    title: "Source Code",
    subtitle: "Human-Readable Instructions",
    phase: 1,
    color: "#8B5CF6",
    icon: "FileCode",
    explanation: [
      "Everything starts with source code — the instructions you write in a programming language like Java. This is text that humans can read and understand.",
      "Think of it like a recipe written in English. The computer can't follow it directly — it needs to be translated into a language the machine understands.",
      "The compiler's job is to take this human-readable text and transform it, step by step, into instructions the JVM can execute.",
    ],
    javaConcept:
      'In Java, source code lives in .java files. Each file contains a class definition. The compiler reads this file and begins the transformation pipeline.',
    input: "// Your Java source code",
    output: JAVA_HELLO_WORLD,
  },
  {
    id: "lexical",
    title: "Lexical Analysis",
    subtitle: "Tokenization",
    phase: 2,
    color: "#00FF88",
    icon: "Scan",
    explanation: [
      "The lexer (lexical analyzer) reads your source code character by character and groups them into meaningful units called tokens — like breaking a sentence into individual words.",
      "For example, the word 'public' becomes a KEYWORD token, 'HelloWorld' becomes an IDENTIFIER token, and '\"Hello, World!\"' becomes a STRING_LITERAL token.",
      "This is like how you learned to read: first you recognize individual words before you can understand sentences. The lexer ignores whitespace and comments — they don't affect the program's meaning.",
    ],
    javaConcept:
      "Java has 67 keywords (like class, public, static, void), identifiers (names you create), literals (fixed values), operators (+, -, =), and separators ({, }, ;). The lexer categorizes every piece of your code.",
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
    title: "Syntax Analysis",
    subtitle: "Abstract Syntax Tree (AST)",
    phase: 3,
    color: "#00D4FF",
    icon: "TreePine",
    explanation: [
      "The parser takes the flat list of tokens and organizes them into a tree structure called an Abstract Syntax Tree (AST). This reveals the grammatical structure of your code.",
      "Think of it like diagramming a sentence in English class — identifying the subject, verb, object, and their relationships. The AST shows which parts of your code contain other parts.",
      "The tree structure makes it easy for later phases to understand the hierarchy: a class contains methods, methods contain statements, statements contain expressions. Each node knows its type, position, and children.",
    ],
    javaConcept:
      "Java has strict grammar rules (defined in the Java Language Specification). The parser checks that your tokens follow these rules — for example, that every '{' has a matching '}', and that statements end with ';'. If not, you get a syntax error.",
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
    title: "Semantic Analysis",
    subtitle: "Symbol Table & Type Checking",
    phase: 4,
    color: "#FF00FF",
    icon: "Search",
    explanation: [
      "Semantic analysis checks whether your code actually makes sense — not just grammatically (syntax), but logically. It builds a symbol table: a dictionary of every name in your program and what it means.",
      "Think of it like a glossary for a textbook. When you read 'System.out.println()', the compiler looks up 'System' in its table, finds it's a class in java.lang, then checks that 'out' is a static field of type PrintStream, and that 'println(String)' is a valid method on it.",
      "This phase catches errors like using an undeclared variable, calling a method with wrong argument types, or trying to assign a String to an int. The compiler compares what you wrote against the rules of the language.",
    ],
    javaConcept:
      "Java is statically typed — every variable must have a declared type, and types must be compatible. The symbol table tracks class names, method signatures, variable types, and scope (what's visible where). This is like a map the compiler builds to understand your program's meaning.",
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
    title: "Code Generation",
    subtitle: "Three-Address Code (IR)",
    phase: 5,
    color: "#FFB000",
    icon: "Code2",
    explanation: [
      "Before generating final bytecode, the compiler creates an Intermediate Representation (IR) called Three-Address Code (TAC). Each instruction has at most three operands: two inputs and one output.",
      "Think of it as a simplified, stripped-down version of your code — like reducing a complex math equation step by step. Complex expressions are broken into simple pieces: load this, call that, store the result here.",
      "TAC is important because it's a universal format that's easy to optimize. The compiler can rearrange, eliminate redundant operations, or combine instructions at this stage before generating the final bytecode.",
    ],
    javaConcept:
      "In our example, the method call System.out.println('Hello, World!') gets decomposed into: load the System class, access its out field, load the string constant, then call println. Each step is one simple instruction.",
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
    id: "bytecode",
    title: "Bytecode",
    subtitle: "JVM Instructions",
    phase: 6,
    color: "#FF3366",
    icon: "Cpu",
    explanation: [
      "The final output is Java bytecode — a set of compact binary instructions that the Java Virtual Machine (JVM) can execute. This is what gets saved in .class files.",
      "Think of bytecode as an assembled recipe — every instruction is precise, numbered, and ready to follow. The JVM reads these instructions one by one and executes them on your machine.",
      "This is why Java is 'write once, run anywhere' — the same bytecode runs on any device that has a JVM, whether it's Windows, Mac, or Linux. The bytecode is platform-independent; the JVM handles the platform-specific details.",
    ],
    javaConcept:
      "The javac compiler produces .class files containing bytecode. You can examine them with javap -c (the Java class file disassembler). Each bytecode instruction is one byte long (hence the name), with opcode 0-255.",
    input: "{ Three-Address Code from Code Generation }",
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
];
