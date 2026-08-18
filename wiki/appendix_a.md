## ILOC

n **CHAPTER OVERVIEW** iloc is the assembly code for a simple abstract machine. It was originally designed as a low-level, linear ir for use in an optimizing compiler. We use it throughout the book as an example ir. We also use it as a simplified target language in the chapters that discuss code generation. This appendix serves as a reference on iloc.

##### Keywords: Intermediate Representation, Three-Address Code, iloc

A.1 **INTRODUCTION** iloc is the linear assembly code for a simple abstract risc machine. The iloc used in this book is a simplified version of the intermediate representation that was used in the Massively Scalar Compiler Project at Rice University. For example, iloc as presented here assumes one generic data type, an inte- ger without a specific length; in the compiler, the ir supported a broad variety of data types. The iloc abstract machine has an unlimited number of registers. It has three- address, register-to-register operations, load and store operations, compar- isons, and branches. It supports just a few simple addressing modes—direct, address + offset, address + immediate, and immediate. Source operands are read at the beginning of the cycle when the operation issues. Result operands are defined at the end of the cycle in which the operation completes. Other than its instruction set, the details of the machine are left unspecified. Most of the examples assume a simple machine, with a single functional unit that executes iloc operations in their order of appearance. When other models are used, we discuss them explicitly. **Engineering a Compiler**. **DOI: 10.1016/B978-0-12-088478-0.00014-1** Copyright c 2012, Elsevier Inc. All rights reserved.

##### 726 APPENDIX A ILOC

An iloc program consists of a sequential list of instructions. Each instruction may be preceded by a label. A label is just a textual string; it is separated from the instruction by a colon. By convention, we limit ourselves to labels of the form [*a–z*] ([*a–z*] j [0–9] j – )*. If some instruction needs more than one label, we insert an instruction that only contains a nop before it, and place the extra label on the nop. To define an iloc program more formally,

*IlocProgram*! *InstructionList* *InstructionList*! *Instruction* j label : *Instruction* j *Instruction InstructionList*

Each instruction contains one or more operations. A single-operation instruction is written on a line of its own, while a multioperation instruc- tion can span several lines. To group operations into a single instruction, we enclose them in square brackets and separate them with semicolons. More formally,

*Instruction*! *Operation* j [ *OperationList*] *OperationList*! *Operation* j *Operation*; *OperationList*

An iloc operation corresponds to a machine-level instruction that might be issued to a single functional unit in a single cycle. It has an opcode, a sequence of comma-separated source operands, and a sequence of comma- separated target operands. The sources are separated from the targets by the symbol ), pronounced “into.”

*Operation*! *NormalOp* j *ControlFlowOp* *NormalOp*! *Opcode OperandList*) *OperandList* *OperandList*! *Operand* j *Operand*, *OperandList* *Operand*! register j num j label

The nonterminal *Opcode* can be any iloc operation, except cbr, jump, and jumpI. Unfortunately, as in a real assembly language, the relationship between an opcode and the form of its operands is less than systematic. The easiest way to specify the form of the operands for each opcode is in

**A.2** *Naming Conventions* **727**
a tabular form. The tables that occur later in this appendix show the number of operands and their types for each iloc opcode used in the book.

*Operand*s may be one of three types: register, num, and label. The type of each operand is determined by the opcode and the position of the operand in the operation. In the examples, we use both numerical (r₁₀) and symbolic (ri) names for registers. Numbers are simple integers, signed if necessary. We always begin a label with an l to make its type obvious. This is a con- vention rather than a rule. iloc simulators and tools should treat any string of the form described above as a potential label.

Most operations have a single target operand; some of the store operations have multiple target operands, as do the branches. For example, storeAI has a single source operand and two target operands. The source must be a register, and the targets must be a register and an immediate constant. Thus, the iloc operation

storeAI ri) rj, 4

computes an address by adding 4 to the contents of rjand stores the value found in riinto the memory location specified by the address. In other words,

##### Memory (rj + 4) Contents (ri)

Control-flow operations have a slightly different syntax. Since these oper- ations do not define their targets, we write them with the single arrow !, instead of ).

*ControlFlowOp*! cbr register! label, label j jumpI! label

|j|!|
|---|---|
|j|!|

jump register

The first operation, cbr, implements a conditional branch. The other two operations are unconditional branches, called jumps.

A.2 **NAMING CONVENTIONS** The iloc code in the text examples uses a simple set of naming conventions.
**1.** Memory offsets for variables are represented symbolically by prefixing the variable name with the @ character.

##### 728 APPENDIX A ILOC

**2.** The user can assume an unlimited supply of registers. These are named with simple integers, as in r₁₇₇₆, or with symbolic names, as in ri.
**3.** The register rarpis reserved as a pointer to the current activation record. Thus, the operation
loadAI rarp, @x ) r1 loads the contents of the variable x, stored at offset @x from the arp, into r₁.

iloc comments begin with the string // and continue until the end of a line. We assume that these are stripped out by the scanner; thus, they can occur anywhere in an instruction and are not mentioned in the grammar.

A.3 **INDIVIDUAL OPERATIONS** The examples in the book use a limited set of iloc operations. The tables at the end of this appendix shows the set of all iloc operations used in the book, except for the alternate branch syntax used in Chapter 7 to discuss the impact of different forms of branching constructs.
A.3.1 **Arithmetic** To express arithmetic, iloc has three-address, register-to-register operations.

|Opcode|Sources|Targets|Meaning|
|---|---|---|---|
|add|r1, r2|r3|r1 + r2 ) r3|
|sub|r1, r2|r3|r1 - r2 ) r3|
|mult|r1, r2|r3|r1 x r2 ) r3|
|div|r1, r2|r3|r1 ÷ r2 ) r3|
|addI|r1, c2|r3|r1 + c2 ) r3|
|subI|r1, c2|r3|r1 - c2 ) r3|
|rsubI|r1, c2|r3|c2 - r1 ) r3|
|multI|r1, c2|r3|r1 x c2 ) r3|
|divI|r1, c2|r3|r1 ÷ c2 ) r3|
|rdivI|r1, c2|r3|c2 ÷ r1 ) r3|

All these operations read their source operands from registers or constants and write their result back to a register. Any register can serve as a source or destination operand.

The first four operations are standard register-to-register operations. The next six operations specify an immediate operand. The noncommutative operations, sub and div, have two immediate forms to allow the imme- diate operand on either side of the operator. The immediate forms are

**A.3** *Individual Operations* **729**
useful to express the results of certain optimizations, to write down exam- ples more concisely, and to record obvious ways to reduce demand for registers.

Note that a real iloc-based processor would need more than one data type. This would lead to typed opcodes or to polymorphic opcodes. We would prefer a family of typed opcodes—an integer add, a floating-point add, and so on. The research compiler where iloc originated has distinct arithmetic operations for integer, single-precision floating-point, double- precision floating-point, complex, and pointer data, but not for character data.

A.3.2 **Shifts** iloc supports a set of arithmetic shift operations—to the left and to the right, in both register and immediate forms.

|Opcode|Sources|Targets|Meaning|
|---|---|---|---|
|lshift|r1, r2|r3|r1 r2 ) r3|
|lshiftI|r1, c2|r3|r1 c2 ) r3|
|rshift|r1, r2|r3|r1 r2 ) r3|
|rshiftI|r1, c2|r3|r1 c2 ) r3|

A.3.3 **Memory Operations** To move values between memory and registers, iloc supports a full set of load and store operations. The load and cload operations move data items from memory to registers. **Opcode Sources Targets Meaning**
MEMORY (r1) ) r2

|load|r1|r2|
|---|---|---|
|loadAI|r1, c2|r3|
|loadAO|r1, r2|r3|
|cload|r1|r2|
|cloadAI|r1, c2|r3|
|cloadAO|r1, r2|r3|

MEMORY (r1 + c2) ) r3 MEMORY (r1 + r2) ) r3 character load character loadAI character loadAO

The operations differ in the addressing modes that they support. The load and cload forms assume that the full address is in the single register operand. The loadAI and cloadAI forms add an immediate value to the contents of the register to form an immediate address before performing the load. We call these *address-immediate* operations. The loadAO and cloadAO

|730 APPENDIX A ILOC||forms add the contents of two registers to compute an effective address before performing the load. We call these address-offset As a final form of load, iloc supports a simple load immediate operation. It takes an integer from the instruction stream and places it in a register.|operations.||
|---|---|---|---|---|
||of value that it supports. Opcode store storeAI storeAO cstore cstoreAI cstoreAO|Opcode Sources Targets Meaning loadI c1 r2 c1) r2 A complete, iloc-like ir should have a load immediate for each distinct kind The store operations match the load operations. iloc supports both numer- ical stores and character stores in its simple register form, in the address- immediate form, and in the address-offset form. Sources Targets Meaning r1 r2 r1) MEMORY (r2) r1 r2, c3 r1) MEMORY (r2 + c3) r1 r2, r3 r1) MEMORY (r2 + r3) r1 r2 character store r1 r2, c3 character storeAI r1 r2, r3 character storeAO|||
|A.3.4||There is no store immediate operation. Register-to-Register Copy Operations To move values between registers, without going though memory, iloc includes a set of register-to-register copy operations.|||
||Opcode i2i c2c c2i i2c|Sources Targets Meaning r1 r2 r1) r2 for integers r1 r2 r1) r2 for characters r1 r2 convert character to integer r1 r2 convert integer to character|||

**A.4** *Control-Flow Operations* **731**
The first two operations, i2i and c2c, copy a value from one register to another, with no conversion. The former is for use with integer values, while the latter is for characters. The last two operations perform conversions between characters and integers, replacing a character by its ordinal position in the ascii character set and replacing an integer with the corresponding ascii character.

A.4 **CONTROL-FLOW OPERATIONS** In general, the iloc comparison operators take two values and return a boolean value. If the specified relationship holds between its operands, the comparison sets the target register to the value true; otherwise the target register receives false.

|Opcode|Sources|Targets|Meaning|
|---|---|---|---|
|cmp LT|r1, r2|r3|true ) r3 if r1 < r2 false ) r3 otherwise|
|cmp LE|r1, r2|r3|true ) r3 if r1 r2 false ) r3 otherwise|
|cmp EQ|r1, r2|r3|true ) r3 if r1 D r2 false ) r3 otherwise|
|cmp GE|r1, r2|r3|true ) r3 if r1 r2 false ) r3 otherwise|
|cmp GT|r1, r2|r3|true ) r3 if r1 > r2 false ) r3 otherwise|
|cmp NE|r1, r2|r3|true ) r3 if r1 6D r2 false ) r3 otherwise|
|cbr|r1|l2, l3|l2 ! PC if r1 D true l3 ! PC otherwise|

The conditional branch operation, cbr, takes a boolean as its argument and transfers control to one of two target labels. The first label is selected if the boolean is true; the second is selected if the boolean is false. Because the two branch targets are not “defined” by the instruction, we change the syntax slightly. Rather than use the arrow ), we write branches with the single arrow !.

All branches in iloc have two labels. This approach eliminates a branch followed by a jump and makes the code more concise. It also eliminates any “fall-through” paths; by making those paths explicit, it removes any positional dependence and simplifies construction of the control-flow graph.

##### 732 APPENDIX A ILOC

A.4.1 **Alternate Comparison and Branch Syntax** To discuss code shape on processors that use a condition code, we must intro- duce an alternate comparison and branch syntax. The condition code scheme simplifies the comparison and pushes the complexity into the conditional branch operation.

|Opcode|Sources|Targets|Meaning|
|---|---|---|---|
|comp|r1, r2|cc3|sets cc3|
|cbr LT|cc1|l2, l3|l2 ! PC if cc3 D LT l3 ! PC otherwise|
|cbr LE|cc1|l2, l3|l2 ! PC if cc3 D LE l3 ! PC otherwise|
|cbr EQ|cc1|l2, l3|l2 ! PC if cc3 D EQ l3 ! PC otherwise|
|cbr GE|cc1|l2, l3|l2 ! PC if cc3 D GE l3 ! PC otherwise|
|cbr GT|cc1|l2, l3|l2 ! PC if cc3 D GT l3 ! PC otherwise|
|cbr NE|cc1|l2, l3|l2 ! PC if cc3 D NE l3 ! PC otherwise|

Here, the comparison operator, comp, takes two values and sets the condition code appropriately. We always designate the target of comp as a condition- code register by writing it as cci. The corresponding conditional branch has six variants, one for each comparison result.

A.4.2 **Jumps** iloc includes two forms of the jump operation. The form used in almost all of the examples is an immediate jump that transfers control to a literal label. The second, a jump-to-register operation, takes a single register operand. It interprets contents of the register as a runtime address and transfers control to that address.
**Sources**

|Opcode|Targets|Meaning|
|---|---|---|
|jumpI|l1|l1 ! PC|
|jump|r1|r1 ! PC|

— —

The jump-to-register form is an ambiguous control-flow transfer. Once it has been generated, the compiler may be unable to deduce the correct set of

**A.5** *Representing SSA Form* **733**
target labels for the jump. For this reason, the compiler should avoid using jump to register, if possible.

Sometimes, the gyrations needed to avoid a jump to register are so complex that jump to register becomes attractive, despite its problems. For example, fortran includes a construct that jumps to a label variable; implementing it with immediate branches would require logic similar to a case statement— a series of immediate branches, along with code to match the runtime value of the label variable against the set of possible labels. In such circumstances, the compiler should probably use a jump to register.

To reduce the loss of information from jump to register, iloc includes a pseudo-operation that lets the compiler record the set of possible labels for a jump to register. The tbl operation has two arguments, a register and an immediate label.

**Opcode Sources Targets Meaning**

tbl r1, l2 — r1 might hold l2

A tbl operation can occur only after a jump. The compiler interprets a set of one or more tbls as naming all the possible labels for the register. Thus, the following code sequence asserts that the jump targets one of L01, L03, L05, or L08:

jump!ri tbl ri, L01 tbl ri, L03 tbl ri, L05 tbl ri, L08

A.5 **REPRESENTING SSA FORM** When a compiler constructs the ssa form of a program from its ir version, it needs a way to represent-functions. In iloc, the natural way to write a -function is as an iloc operation. Thus, we will sometimes write
phi ri, rj, rk) rm

for the-function rm(ri, rj, rk). Because of the nature of ssa form, the phi operation may take an arbitrary number of sources. It always defines a single target.

|734 APPENDIX A ILOC|||
|---|---|---|
||ILOC Opcode Summary Opcode Sources Targets Meaning nop none none Used as a placeholder add r1, r2 r3 r1 + r2) r3 sub r1, r2 r3 r1 - r2) r3 mult r1, r2 r3 r1 x r2) r3 div r1, r2 r3 r1 ÷ r2) r3 addI r1, c2 r3 r1 + c2) r3 subI r1, c2 r3 r1 - c2) r3 rsubI r1, c2 r3 c2 - r1) r3 multI r1, c2 r3 r1 x c2) r3 divI r1, c2 r3 r1 ÷ c2) r3 rdivI r1, c2 r3 c2 ÷ r1) r3 lshift r1, r2 r3 r1 r2) r3 lshiftI r1, c2 r3 r1 c2) r3 rshift r1, r2 r3 r1 r2) r3 rshiftI r1, c2 r3 r1 c2) r3 and r1, r2 r3 r1 ^ r2) r3 andI r1, c2 r3 r1 ^ c2) r3 or r1, r2 r3 r1 _ r2) r3 orI r1, c2 r3 r1 _ c2) r3 xor r1, r2 r3 r1 xor r2) r3 xorI r1, c2 r3 r1 xor c2) r3 loadI c1 r2 c1) r2 load r1 r2 MEMORY (r1)) r2 loadAI r1, c2 r3 MEMORY (r1 + c2)) r3 loadAO r1, r2 r3 MEMORY (r1 + r2)) r3 cload r1 r2 character load cloadAI r1, c2 r3 character loadAI cloadAO r1, r2 r3 character loadAO store r1 r2 r1) MEMORY (r2) storeAI r1 r2, c3 r1) MEMORY (r2 + c3) storeAO r1 r2, r3 r1) MEMORY (r2 + r3) cstore r1 r2 character store cstoreAI r1 r2, c3 character storeAI cstoreAO r1 r2, r3 character storeAO i2i r1 r2 r1) r2 for integers c2c r1 r2 r1) r2 for characters c2i r1 r2 convert character to integer i2c r1 r2 convert integer to character||

**A.5** *Representing SSA Form* **735**
**ILOC Control-Flow Operations**

**Meaning**

|Opcode|Sources|Targets|
|---|---|---|
|jump||r1|
|jumpI||l1|
|cbr tbl|r1 r1, l2|l2, l3|
|cmp LT|r1, r2|r3|
|cmp LE|r1, r2|r3|
|cmp EQ|r1, r2|r3|
|cmp GE|r1, r2|r3|
|cmp GT|r1, r2|r3|
|cmp NE|r1, r2|r3|
|comp|r1, r2|cc3|
|cbr LT|cc1|l2, l3|
|cbr LE|cc1|l2, l3|
|cbr EQ|cc1|l2, l3|
|cbr GE|cc1|l2, l3|
|cbr GT|cc1|l2, l3|
|cbr NE|cc1|l2, l3|

— r1 ! PC — l1 ! PC l2 ! PC l3 ! PC —

true ) r3 false ) r3 true ) r3 false ) r3 true ) r3 false ) r3 true ) r3 false ) r3 true ) r3 false ) r3 true ) r3 false ) r3 sets cc3

l2 ! PC l3 ! PC l2 ! PC l3 ! PC l2 ! PC l3 ! PC l2 ! PC l3 ! PC l2 ! PC l3 ! PC l2 ! PC l3 ! PC

if r1 D true otherwise

if r1 *<* r2 otherwise if r1 r2 otherwise if r1 D r2 otherwise if r1 r2 otherwise if r1 *>* r2 otherwise if r1 6D r2 otherwise

if cc3 D LT otherwise if cc3 D LE otherwise if cc3 D EQ otherwise if cc3 D GE otherwise if cc3 D GT otherwise if cc3 D NE otherwise

r1 might hold l2

##### This page intentionally left blank

#### Appendix

