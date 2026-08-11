# Compilation Pipeline Visualization Guide

> Source: *Engineering a Compiler* (2nd Edition) by Keith D. Cooper & Linda Torczon
> Purpose: Step-by-step visualization plan for each phase of the compilation pipeline.

---

## 1. Lexical Analysis (Scanner)

The scanner translates a stream of characters into a stream of classified words (tokens).

### Visualization Steps

**Step 1 — Transition Diagram (DFA)**

Visualize the Deterministic Finite Automaton (DFA) as a directed graph:
- Circles represent states
- Double circles represent accepting states
- Arrows represent character-based transitions

**Step 2 — Character Classification**

Show the **Classifier Table (CharCat)** being consulted. When a character is read, highlight its category in the table:

| Category | Examples |
|----------|----------|
| Digit    | `0`-`9` |
| Letter   | `a`-`z`, `A`-`Z` |
| Operator | `+`, `-`, `*`, `/` |
| Delimiter | `(`, `)`, `{`, `}` |

**Step 3 — State Traversal**

Animate the movement from the current state to the next state based on the **Transition Table (δ)**. If the scanner enters an error state (s<sub>e</sub>), visualize the rollback process:
- Revert the internal pointer to the last known accepting state
- Pop the stack back to the saved state

**Step 4 — Token Identification**

When an accepting state is reached and no further transitions are valid, output the result as a pair:

```
⟨lexeme, syntactic category⟩
```

Example: `int` → `⟨"int", KEYWORD⟩`

---

## 2. Syntax Analysis (Parser)

The parser builds a constructive proof that the token stream belongs to the language defined by the grammar.

### Visualization Steps

**Step 1 — Parse Stack (LR(1) Bottom-Up)**

For a bottom-up LR(1) parser, visualize a stack containing interleaved symbols and states:

```
┌───────┐
│ State │  ← top
│ Symbol│
│ State │
│ Symbol│
│  ...  │
└───────┘
```

**Step 2 — Shift and Reduce Actions**

- **Shift:** Show a token moving from the input stream onto the stack. Push a new state from the **Action Table**.
- **Reduce:** Highlight a *handle* (a sequence of symbols matching a production's right-hand side) at the top of the stack. Pop the symbols and replace them with a non-terminal. Push a new state from the **Goto Table**.

**Step 3 — Parse Tree Growth**

Show the parse tree growing from the bottom (tokens) up to the root (Goal symbol) as reductions occur. Each reduction collapses a subtree into its parent non-terminal.

---

## 3. Semantic Analysis (Elaboration)

This phase goes beyond syntax to establish properties like type consistency and addressability.

### Visualization Steps

**Step 1 — AST Generation**

Transition from the bulky parse tree to a more concise **Abstract Syntax Tree (AST)** that removes "useless" non-terminals (like `Expr`, `Term`, `Factor`). The AST preserves only the essential structure.

**Step 2 — Attribute Evaluation**

Visualize two types of attributes flowing through the AST:
- **Synthesized attributes:** Values (like types) flow **up** from children to parents
- **Inherited attributes:** Values (like expected types or offsets) flow **down** from parents to children

Highlight AST nodes as they are "decorated" with this information.

**Step 3 — Scoped Symbol Table**

Visualize a **"sheaf of tables"** (a stack of hash tables):

```
┌──────────────┐
│ Global Scope │  ← bottom (inserted first)
├──────────────┤
│ Func Scope   │
├──────────────┤
│ Block Scope  │  ← top (current scope)
└──────────────┘
```

- **InitializeScope:** Push a new table onto the stack
- **FinalizeScope:** Pop the top table off the stack
- **Name lookup:** Search through the layers from top to bottom to resolve declarations

---

## 4. Optimizer (IR-to-IR Transformation)

The optimizer analyzes and transforms the IR to produce more efficient, equivalent code.

### Visualization Steps

**Step 1 — Control-Flow Graph (CFG) Construction**

Show the linear IR being broken into **basic blocks** (sequences of branch-free code). Connect them with edges representing transfers of control:

```
    ┌─────────┐
    │ Block 1 │ (entry)
    └────┬────┘
     ┌───┴───┐
     ▼       ▼
┌────────┐ ┌────────┐
│ Block 2│ │ Block 3│  (branch targets)
└───┬────┘ └───┬────┘
     └───┬─────┘
         ▼
    ┌─────────┐
    │ Block 4 │ (join point)
    └─────────┘
```

**Step 2 — Static Single Assignment (SSA) Form**

Two sub-steps:
1. **ϕ-insertion:** Highlight join points in the CFG where multiple paths converge. Insert ϕ-functions to merge values from different definitions.
2. **Renaming:** Walk the dominator tree in preorder. Assign unique subscripts to variables based on their definition points (e.g., `x₁`, `x₂`, `x₃`).

**Step 3 — Data-Flow Analysis**

Visualize facts (like constant values or variable liveness) propagating through the CFG:
- Facts flow forward or backward through blocks
- At each block, transfer functions compute new facts
- Repeat until the sets reach a **fixed point** (no more changes)

---

## 5. Code Generation

The back end maps the optimized IR onto the resources of the target machine.

### Visualization Steps

**Step 1 — Instruction Selection (Tiling)**

Visualize the tiling of the AST/IR tree:
- **Tiles** are machine-specific templates (e.g., "load from memory", "add two registers")
- Match tiles against subtrees to find the **lowest-cost implementation**
- Highlight each tile as it is selected, covering part of the tree

**Step 2 — Instruction Scheduling**

Visualize a **dependence graph** where:
- Nodes are operations
- Edges represent timing constraints (data dependencies, resource conflicts)

Show the **list-scheduling algorithm** picking "ready" operations (no unsatisfied dependencies) to fill functional units cycle-by-cycle. Display as a Gantt-style chart:

```
Cycle:  1    2    3    4    5
Slot A: [load] [add] [mul]
Slot B:       [sub] [div]
```

**Step 3 — Register Allocation**

Two sub-steps:
1. **Interference Graph:** Show a graph where nodes are live ranges and edges connect ranges that are live at the same time.
2. **Graph Coloring:** Animate the coloring process — assign physical register names (colors) to nodes such that no two adjacent nodes share the same color.

```
  (x)──(y)
   │  ╲
  (z)  (w)

x = R1, y = R2, z = R1, w = R2
```

---

## 6. Bytecode Execution

Bytecode is designed for a virtual stack machine. Visualization focuses on step-by-step execution.

### Visualization Steps

**Step 1 — Operand Stack**

Show the stack growing and shrinking as instructions execute:

```
┌───────┐
│   3   │  ← top
│   7   │
│       │  (empty)
└───────┘
```

**Step 2 — Instruction Execution**

For each bytecode instruction, animate the operation:
- **`iadd`:** Pop top two values, compute their sum, push the result back
- **`iload x`:** Push the value of variable x onto the stack
- **`istore x`:** Pop the top value, store it in variable x

**Step 3 — Program Counter**

Animate the program counter (PC) moving through the linear stream of bytecode instructions, highlighting the current instruction being executed.

---

## Quick Reference: Phase → Visualization Mapping

| Phase | Key Visualization | Data Structure |
|-------|-------------------|----------------|
| Lexical Analysis | DFA graph with state traversal | Transition Table, Classifier Table |
| Syntax Analysis | Parse stack with shift/reduce + growing parse tree | Action Table, Goto Table |
| Semantic Analysis | AST decoration + scoped symbol table stack | Attribute grammar, sheaf of tables |
| Optimization | CFG with data-flow facts + SSA form | Basic blocks, dominator tree |
| Code Generation | Tiling + Gantt chart + interference graph | Dependence graph, register file |
| Bytecode | Stack machine execution + program counter | Operand stack, bytecode stream |
