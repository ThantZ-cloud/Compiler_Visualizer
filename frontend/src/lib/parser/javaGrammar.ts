import type { GrammarRule, PdaStateNode, PdaTransition } from './types';

// ── Java Context-Free Grammar (curated subset for visualization) ──
// Each rule mirrors a production of the Java Language Specification so the
// shift-reduce animation can label reductions with real grammar rules.

export const GRAMMAR_RULES: GrammarRule[] = [
  { id: 'G01', lhs: 'CompilationUnit', rhs: ['PackageDecl?', 'Import*', 'TypeDecl*'], description: 'A Java file: optional package, imports, then type declarations.' },
  { id: 'G02', lhs: 'TypeDecl', rhs: ['ClassOrInterfaceDecl'], description: 'A top-level type is a class, interface, enum or record.' },
  { id: 'G03', lhs: 'TypeDecl', rhs: ['EnumDeclaration'], description: 'An enum is also a top-level type.' },
  { id: 'G04', lhs: 'TypeDecl', rhs: ['RecordDeclaration'], description: 'Records are a newer kind of top-level type.' },
  { id: 'G05', lhs: 'ClassOrInterfaceDecl', rhs: ['Modifier*', "'class'", 'Identifier', 'ClassBody'], description: "`class Name { ... }` — the class shape." },
  { id: 'G06', lhs: 'ClassOrInterfaceDecl', rhs: ['Modifier*', "'interface'", 'Identifier', 'ClassBody'], description: "`interface Name { ... }` — interfaces declare abstract contracts." },
  { id: 'G07', lhs: 'ClassBody', rhs: ["'{", 'MemberDecl*', "'}'"], description: 'A class body is a brace-delimited list of members.' },
  { id: 'G08', lhs: 'Member', rhs: ['FieldDeclaration'], description: 'Members can be fields.' },
  { id: 'G09', lhs: 'Member', rhs: ['MethodDeclaration'], description: 'Members can be methods.' },
  { id: 'G10', lhs: 'Member', rhs: ['ConstructorDeclaration'], description: 'Members can be constructors.' },
  { id: 'G11', lhs: 'FieldDeclaration', rhs: ['Modifier*', 'Type', 'VariableDeclarator', "';'"], description: 'A field: modifiers, a type, and a name (optionally initialised).' },
  { id: 'G12', lhs: 'MethodDeclaration', rhs: ['Modifier*', 'Type', 'Identifier', "'('", 'FormalParamList?', "')'", 'BlockStmt'], description: 'A method: modifiers, return type, name, parameters, body.' },
  { id: 'G13', lhs: 'ConstructorDeclaration', rhs: ['Modifier*', 'Identifier', "'('", 'FormalParamList?', "')'", 'BlockStmt'], description: 'A constructor shares the class name and has no return type.' },
  { id: 'G14', lhs: 'FormalParamList', rhs: ['Parameter', ',', 'Parameter*'], description: 'A comma-separated parameter list.' },
  { id: 'G15', lhs: 'Parameter', rhs: ['Type', 'Identifier'], description: 'Each parameter has a type and a name.' },
  { id: 'G16', lhs: 'VariableDeclarationExpr', rhs: ['Type', 'VariableDeclarator', ',', 'VariableDeclarator*'], description: 'Local variable declarations bound to an expression statement.' },
  { id: 'G17', lhs: 'VariableDeclarator', rhs: ['Identifier', "'='", 'Expr?'], description: 'A variable name, optionally initialised.' },
  { id: 'G18', lhs: 'BlockStmt', rhs: ["'{'", 'Stmt*', "'}'"], description: 'A block groups zero or more statements.' },
  { id: 'G19', lhs: 'Stmt', rhs: ['ExpressionStmt'], description: 'An expression followed by a semicolon.' },
  { id: 'G20', lhs: 'Stmt', rhs: ['IfStmt'], description: 'An if statement.' },
  { id: 'G21', lhs: 'IfStmt', rhs: ["'if'", "'('", 'Expr', "')'", 'Stmt', "'else'?", 'Stmt?'], description: '`if (cond) ... else ...`' },
  { id: 'G22', lhs: 'Stmt', rhs: ['WhileStmt'], description: 'A while loop.' },
  { id: 'G23', lhs: 'WhileStmt', rhs: ["'while'", "'('", 'Expr', "')'", 'Stmt'], description: '`while (cond) ...`' },
  { id: 'G24', lhs: 'Stmt', rhs: ['ForStmt'], description: 'A classic for loop.' },
  { id: 'G25', lhs: 'Stmt', rhs: ['ReturnStmt'], description: 'A return statement.' },
  { id: 'G26', lhs: 'ReturnStmt', rhs: ["'return'", 'Expr?', "';'"], description: '`return [expr];`' },
  { id: 'G27', lhs: 'Stmt', rhs: ['LocalClassDeclarationStmt'], description: 'A class declared inside a method body.' },
  { id: 'G28', lhs: 'Expr', rhs: ['AssignExpr'], description: 'Assignment expressions (`x = ...`).' },
  { id: 'G29', lhs: 'AssignExpr', rhs: ['Expr', 'op', 'Expr'], description: '`lhs op rhs`' },
  { id: 'G30', lhs: 'Expr', rhs: ['BinaryExpr'], description: 'Binary arithmetic / logical expressions.' },
  { id: 'G31', lhs: 'BinaryExpr', rhs: ['Expr', 'op', 'Expr'], description: '`a op b`' },
  { id: 'G32', lhs: 'Expr', rhs: ['UnaryExpr'], description: 'Unary expressions like `-x` or `!flag`.' },
  { id: 'G33', lhs: 'Expr', rhs: ['MethodCallExpr'], description: 'Calling a method with arguments.' },
  { id: 'G34', lhs: 'MethodCallExpr', rhs: ['Scope', 'Identifier', "'('", 'Args?', "')'"], description: '`target.method(args...)`' },
  { id: 'G35', lhs: 'Expr', rhs: ['FieldAccessExpr'], description: 'Accessing a field: `obj.field`.' },
  { id: 'G36', lhs: 'Expr', rhs: ['ObjectCreationExpr'], description: '`new ClassName(args...)`' },
  { id: 'G37', lhs: 'Expr', rhs: ['NameExpr'], description: 'A bare identifier (variable or parameter reference).' },
  { id: 'G38', lhs: 'Expr', rhs: ['Literal'], description: 'A literal value: number, string, char, boolean.' },
  { id: 'G39', lhs: 'Literal', rhs: ['StringLiteralExpr'], description: '`"text"`' },
  { id: 'G40', lhs: 'Literal', rhs: ['IntegerLiteralExpr'], description: '`42`' },
  { id: 'G41', lhs: 'Literal', rhs: ['BooleanLiteralExpr'], description: '`true` or `false`' },
  { id: 'G42', lhs: 'Modifier', rhs: ['ModifierKeyword'], description: '`public`, `private`, `static`, `final`, ...' },
];

/** Lookup table: AST node type name → curated rule id */
const RULE_BY_LHS: Record<string, string> = {};
for (const rule of GRAMMAR_RULES) {
  if (!RULE_BY_LHS[rule.lhs]) RULE_BY_LHS[rule.lhs] = rule.id;
}

/** Find the curated rule for an AST node type, or null */
export function findGrammarRule(nodeType: string): GrammarRule | null {
  const id = RULE_BY_LHS[nodeType];
  if (id) return GRAMMAR_RULES.find(r => r.id === id) ?? null;
  return null;
}

// ── Pushdown Automaton diagram ──
// The parser is a PDA: a finite-state controller plus a stack memory.

export const PDA_STATES: PdaStateNode[] = [
  { id: 'start', label: 'q₀ START', description: 'Awaiting the first token', x: 40, y: 40, isStart: true },
  { id: 'header', label: 'q₁ HEADER', description: 'Parsing a type declaration header', x: 250, y: 10 },
  { id: 'body', label: 'q₂ BODY', description: 'Parsing members between { }', x: 460, y: 40 },
  { id: 'statement', label: 'q₃ STATEMENT', description: 'Parsing a statement inside a block', x: 460, y: 150 },
  { id: 'accept', label: 'q₄ ACCEPT', description: 'The whole program reduced', x: 250, y: 190, isAccept: true },
];

export const PDA_TRANSITIONS: PdaTransition[] = [
  { from: 'start', to: 'header', label: "SHIFT 'class' | 'interface' | 'enum' | 'record'" },
  { from: 'header', to: 'body', label: "SHIFT '{'" },
  { from: 'body', to: 'statement', label: 'SHIFT stmt keyword / identifier' },
  { from: 'statement', to: 'body', label: "REDUCE → ';' / '}'" },
  { from: 'body', to: 'accept', label: "REDUCE CompilationUnit on '}'" },
];