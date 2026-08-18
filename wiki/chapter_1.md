## Overview of Compilation

n **CHAPTER OVERVIEW** Compilers are computer programs that translate a program written in one language into a program written in another language. At the same time, a compiler is a large software system, with many internal components and algorithms and complex interactions between them. Thus, the study of com- piler construction is an introduction to techniques for the translation and improvement of programs, and a practical exercise in software engineering. This chapter provides a conceptual overview of all the major components of a modern compiler.

##### Keywords: Compiler, Interpreter, Automatic Translation

1.1 **INTRODUCTION** The role of the computer in daily life grows each year. With the rise of the Internet, computers and the software that runs on them provide communica- tions, news, entertainment, and security. Embedded computers have changed the ways that we build automobiles, airplanes, telephones, televisions, and radios. Computation has created entirely new categories of activity, from video games to social networks. Supercomputers predict daily weather and the course of violent storms. Embedded computers synchronize traffic lights and deliver e-mail to your pocket. All of these computer applications rely on software computer programs that build virtual tools on top of the low-level abstractions provided by the underlying hardware. Almost all of that software is translated by a tool called a *compiler*. A compiler is simply a computer program that trans-**Compiler** lates other computer programs to prepare them for execution. This book a computer program that translates other presents the fundamental techniques of automatic translation that are used computer programs **Engineering a Compiler**. **DOI: 10.1016/B978-0-12-088478-0.00001-3** Copyright c 2012, Elsevier Inc. All rights reserved.

##### 2 CHAPTER 1 Overview of Compilation

to build compilers. It describes many of the challenges that arise in compiler construction and the algorithms that compiler writers use to address them.

##### Conceptual Roadmap

A compiler is a tool that translates software written in one language into another language. To translate text from one language to another, the tool must understand both the form, or syntax, and content, or meaning, of the input language. It needs to understand the rules that govern syntax and mean- ing in the output language. Finally, it needs a scheme for mapping content from the source language to the target language.

The structure of a typical compiler derives from these simple observations. The compiler has a front end to deal with the source language. It has a back end to deal with the target language. Connecting the front end and the back end, it has a formal structure for representing the program in an interme- diate form whose meaning is largely independent of either language. To improve the translation, a compiler often includes an optimizer that analyzes and rewrites that intermediate form.

##### Overview

Computer programs are simply sequences of abstract operations written in a *programming language*—a formal language designed for expressing com- putation. Programming languages have rigid properties and meanings—as opposed to natural languages, such as Chinese or Portuguese. Programming languages are designed for expressiveness, conciseness, and clarity. Natural languages allow ambiguity. Programming languages are designed to avoid ambiguity; an ambiguous program has no meaning. Programming languages are designed to specify computations—to record the sequence of actions that perform some task or produce some results.

Programming languages are, in general, designed to allow humans to express computations as sequences of operations. Computer processors, hereafter referred to as processors, microprocessors, or machines, are designed to exe- cute sequences of operations. The operations that a processor implements are, for the most part, at a much lower level of abstraction than those speci- fied in a programming language. For example, a programming language typ- ically includes a concise way to print some number to a file. That single programming language statement must be translated into literally hundreds of machine operations before it can execute.

The tool that performs such translations is called a compiler. The compiler takes as input a program written in some language and produces as its out- put an equivalent program. In the classic notion of a compiler, the output

**1.1** *Introduction* **3**
program is expressed in the operations available on some specific processor, often called the target machine. Viewed as a black box, a compiler might look like this:

*Source Target*

Compiler *Program Program*

Typical “source” languages might be c, c++, fortran, Java, or ml. The “target” language is usually the instruction set of some processor. **Instruction set** The set of operations supported by a processor; Some compilers produce a target program written in a human-oriented pro-the overall design of an instruction set is often gramming language rather than the assembly language of some computer. called an*instruction set architecture*or ISA. The programs that these compilers produce require further translation before they can execute directly on a computer. Many research compilers produce C programs as their output. Because compilers for C are available on most computers, this makes the target program executable on all those systems, at the cost of an extra compilation for the final target. Compilers that tar- get programming languages rather than the instruction set of a computer are often called *source-to-source translators*.

Many other systems qualify as compilers. For example, a typesetting pro- gram that produces PostScript can be considered a compiler. It takes as input a specification for how the document should look on the printed page and it produces as output a PostScript file. PostScript is simply a language for describing images. Because the typesetting program takes an executable specification and produces another executable specification, it is a compiler.

The code that turns PostScript into pixels is typically an *interpreter*, not a compiler. An interpreter takes as input an executable specification and produces as output the result of executing the specification.

*Source Results*

Interpreter *Program*

Some languages, such as Perl, Scheme, and apl, are more often implemented with interpreters than with compilers.

Some languages adopt translation schemes that include both compilation and interpretation. Java is compiled from source code into a form called *bytecode*, a compact representation intended to decrease download times for **Virtual machine** Java applications. Java applications execute by running the bytecode on the A virtual machine is a simulator for some corresponding Java Virtual Machine (jvm), an interpreter for bytecode. To processor. It is an*interpreter*for that machine’s complicate the picture further, many implementations of the jvm include a instruction set.

##### 4 CHAPTER 1 Overview of Compilation

compiler that executes at runtime, sometimes called a *just-in-time compiler*, or jit, that translates heavily used bytecode sequences into native code for the underlying computer.

Interpreters and compilers have much in common. They perform many of the same tasks. Both analyze the input program and determine whether or not it is a valid program. Both build an internal model of the structure and mean- ing of the program. Both determine where to store values during execution. However, interpreting the code to produce a result is quite different from emitting a translated program that can be executed to produce the result. This book focuses on the problems that arise in building compilers. However, an implementor of interpreters may find much of the material relevant.

##### Why Study Compiler Construction?

A compiler is a large, complex program. Compilers often include hundreds of thousands, if not millions, of lines of code, organized into multiple sub- systems and components. The various parts of a compiler interact in complex ways. Design decisions made for one part of the compiler have impor- tant ramifications for other parts. Thus, the design and implementation of a compiler is a substantial exercise in software engineering.

A good compiler contains a microcosm of computer science. It makes practi- cal use of greedy algorithms (register allocation), heuristic search techniques (list scheduling), graph algorithms (dead-code elimination), dynamic pro- gramming (instruction selection), finite automata and push-down automata (scanning and parsing), and fixed-point algorithms (data-flow analysis). It deals with problems such as dynamic allocation, synchronization, nam- ing, locality, memory hierarchy management, and pipeline scheduling. Few software systems bring together as many complex and diverse compo- nents. Working inside a compiler provides practical experience in software engineering that is hard to obtain with smaller, less intricate systems.

Compilers play a fundamental role in the central activity of computer science: preparing problems for solution by computer. Most software is com- piled, and the correctness of that process and the efficiency of the resulting code have a direct impact on our ability to build large systems. Most students are not satisfied with reading about these ideas; many of the ideas must be implemented to be appreciated. Thus, the study of compiler construction is an important component of a computer science education.

Compilers demonstrate the successful application of theory to practical problems. The tools that automate the production of scanners and parsers apply results from formal language theory. These same tools are used for

**1.1** *Introduction* **5**
text searching, website filtering, word processing, and command-language interpreters. Type checking and static analysis apply results from lattice the- ory, number theory, and other branches of mathematics to understand and improve programs. Code generators use algorithms for tree-pattern match- ing, parsing, dynamic programming, and text matching to automate the selection of instructions.

Still, some problems that arise in compiler construction are open problems— that is, the current best solutions have room for improvement. Attempts to design high-level, universal, intermediate representations have foundered on complexity. The dominant method for scheduling instructions is a greedy algorithm with several layers of tie-breaking heuristics. While it is obvious that compilers should use commutativity and associativity to improve the code, most compilers that try to do so simply rearrange the expression into some canonical order.

Building a successful compiler requires expertise in algorithms, engineering, and planning. Good compilers approximate the solutions to hard problems. They emphasize efficiency, in their own implementations and in the code they generate. They have internal data structures and knowledge repre- sentations that expose the right level of detail—enough to allow strong optimization, but not enough to force the compiler to wallow in detail. Compiler construction brings together ideas and techniques from across the breadth of computer science and applies them in a constrained setting to solve some truly hard problems.

##### The Fundamental Principles of Compilation

Compilers are large, complex, carefully engineered objects. While many issues in compiler design are amenable to multiple solutions and interpre- tations, there are two fundamental principles that a compiler writer must keep in mind at all times. The first principle is inviolable:

*The compiler must preserve the meaning of the program being compiled.*

Correctness is a fundamental issue in programming. The compiler must preserve correctness by faithfully implementing the “meaning” of its input program. This principle lies at the heart of the social contract between the compiler writer and compiler user. If the compiler can take liberties with meaning, then why not simply generate a nop or a return? If an incorrect translation is acceptable, why expend the effort to get it right?

The second principle that a compiler must observe is practical:

*The compiler must improve the input program in some discernible way.*

##### 6 CHAPTER 1 Overview of Compilation

A traditional compiler improves the input program by making it directly executable on some target machine. Other “compilers” improve their input in different ways. For example, tpic is a program that takes the specifica- tion for a drawing written in the graphics language pic and converts it into LATEX; the “improvement” lies in LATEX’s greater availability and generality. A source-to-source translator for c must produce code that is, in some mea- sure, better than the input program; if it is not, why would anyone invoke it?

1.2 **COMPILER STRUCTURE** A compiler is a large, complex software system. The community has been building compilers since 1955, and over the years, we have learned many lessons about how to structure a compiler. Earlier, we depicted a compiler as a simple box that translates a source program into a target program. Reality, of course, is more complex than that simple picture. As the single-box model suggests, a compiler must both understand the source program that it takes as input and map its functionality to the target machine. The distinct nature of these two tasks suggests a division of labor and leads to a design that decomposes compilation into two major pieces: a *front end* and a *back end*.
*Source* IR *Target*

Front End Back End *Program Program*

Compiler

The front end focuses on understanding the source-language program. The back end focuses on mapping programs to the target machine. This sep- aration of concerns has several important implications for the design and implementation of compilers.

The front end must encode its knowledge of the source program in some **IR** structure for later use by the back end. This *intermediate representation* (ir) A compiler uses some set of data structures to becomes the compiler’s definitive representation for the code it is translating. represent the code that it processes. That form is At each point in compilation, the compiler will have a definitive represen- called an*intermediate representation*, or IR. tation. It may, in fact, use several different irs as compilation progresses, but at each point, one representation will be the definitive ir. We think of the definitive ir as the version of the program passed between independent phases of the compiler, like the ir passed from the front end to the back end in the preceding drawing.

In a two-phase compiler, the front end must ensure that the source program is well formed, and it must map that code into the ir. The back end must map

**1.2** *Compiler Structure* **7**
##### MAY YOU STUDY IN INTERESTING TIMES

This is an exciting era in the design and implementation of compilers. In the 1980s, almost all compilers were large, monolithic systems. They took as input one of a handful of languages and produced assembly code for some particular computer. The assembly code was pasted together with the code produced by other compilations—including system libraries and application libraries—to form an executable. The executable was stored on a disk, and at the appropriate time, the final code was moved from the disk to main memory and executed.

Today, compiler technology is being applied in many different settings. As computers find applications in diverse places, compilers must cope with new and different constraints. Speed is no longer the sole criterion for judging the compiled code. Today, code might be judged on how small it is, on how much energy it consumes, on how well it compresses, or on how many page faults it generates when it runs.

At the same time, compilation techniques have escaped from the mono- lithic systems of the 1980s. They are appearing in many new places. Java compilers take partially compiled programs (in Java "bytecode" format) and translate them into native code for the target machine. In this environ- ment, success requires that the sum of compile time plus runtime must be less than the cost of interpretation. Techniques to analyze whole programs are moving from compile time to link time, where the linker can analyze the assembly code for the entire application and use that knowledge to improve the program. Finally, compilers are being invoked at runtime to generate customized code that capitalizes on facts that cannot be known any earlier. If the compilation time can be kept small and the benefits are large, this strategy can produce noticeable improvements.

the ir program into the instruction set and the finite resources of the target machine. Because the back end only processes ir created by the front end, it can assume that the ir contains no syntactic or semantic errors.

The compiler can make multiple passes over the ir form of the code before emitting the target program. This should lead to better code, as the compiler can, in effect, study the code in one phase and record relevant details. Then, in later phases, it can use these recorded facts to improve the quality of translation. This strategy requires that knowledge derived in the first pass be recorded in the ir, where later passes can find and use it.

Finally, the two-phase structure may simplify the process of *retargeting* **Retargeting** the compiler. We can easily envision constructing multiple back ends for a The task of changing the compiler to generate single front end to produce compilers that accept the same language but tar-code for a new processor is often called *retargeting*the compiler. get different machines. Similarly, we can envision front ends for different

##### 8 CHAPTER 1 Overview of Compilation

languages producing the same ir and using a common back end. Both scenarios assume that one ir can serve for several combinations of source and target; in practice, both language-specific and machine-specific details usually find their way into the ir.

Introducing an ir makes it possible to add more phases to compilation. The compiler writer can insert a third phase between the front end and the back **Optimizer** end. This middle section, or *optimizer*, takes an ir program as its input and The middle section of a compiler, called an produces a semantically equivalent ir program as its output. By using the ir *optimizer*, analyzes and transforms the IR to as an interface, the compiler writer can insert this third phase with minimal improve it. disruption to the front end and back end. This leads to the following compiler structure, termed a *three-phase compiler*.

*Source* IR IR *Target*

Front End Optimizer Back End *Program Program* Compiler

The optimizer is an ir-to-ir transformer that tries to improve the ir program in some way. (Notice that these transformers are, themselves, compilers according to our definition in Section 1.1.) The optimizer can make one or more passes over the ir, analyze the ir, and rewrite the ir. The optimizer may rewrite the ir in a way that is likely to produce a faster target program from the back end or a smaller target program from the back end. It may have other objectives, such as a program that produces fewer page faults or uses less energy.

Conceptually, the three-phase structure represents the classic optimizing compiler. In practice, each phase is divided internally into a series of passes. The front end consists of two or three passes that handle the details of recognizing valid source-language programs and producing the initial ir form of the program. The middle section contains passes that perform dif- ferent optimizations. The number and purpose of these passes vary from compiler to compiler. The back end consists of a series of passes, each of which takes the ir program one step closer to the target machine’s instruc- tion set. The three phases and their individual passes share a common infrastructure. This structure is shown in Figure 1.1.

In practice, the conceptual division of a compiler into three phases, a front end, a middle section or optimizer, and a back end, is useful. The problems addressed by these phases are different. The front end is concerned with understanding the source program and recording the results of its analy- sis into ir form. The optimizer section focuses on improving the ir form.

**1.3** *Overview of Translation* **9**
*Front End Optimizer Back End*

-----... ----- *Scanner* *Parser* *Elaboration* *Inst Selection* *Optimization 1Optimization 2Optimization n Inst Scheduling Reg Allocation*

6 6 6 6 6 6 6 6 6 <u>?????????</u> *Infrastructure*

n **FIGURE 1.1** Structure of a Typical Compiler.

The back end must map the transformed ir program onto the bounded resources of the target machine in a way that leads to efficient use of those resources.

Of these three phases, the optimizer has the murkiest description. The term *optimization* implies that the compiler discovers an optimal solution to some problem. The issues and problems that arise in optimization are so com- plex and so interrelated that they cannot, in practice, be solved optimally. Furthermore, the actual behavior of the compiled code depends on interac- tions among all of the techniques applied in the optimizer and the back end. Thus, even if a single technique can be proved optimal, its interactions with other techniques may produce less than optimal results. As a result, a good optimizing compiler can improve the quality of the code, relative to an unop- timized version. However, an optimizing compiler will almost always fail to produce optimal code.

The middle section can be a single monolithic pass that applies one or more optimizations to improve the code, or it can be structured as a series of smaller passes with each pass reading and writing ir. The monolithic struc- ture may be more efficient. The multipass structure may lend itself to a less complex implementation and a simpler approach to debugging the compiler. It also creates the flexibility to employ different sets of optimization in dif- ferent situations. The choice between these two approaches depends on the constraints under which the compiler is built and operates.

1.3 **OVERVIEW OF TRANSLATION** To translate code written in a programming language into code suitable for execution on some target machine, a compiler runs through many steps.

##### 10 CHAPTER 1 Overview of Compilation

##### NOTATION

Compiler books are, in essence, about notation. After all, a compiler trans- lates a program written in one notation into an equivalent program written in another notation. A number of notational issues will arise in your reading of this book. In some cases, these issues will directly affect your understanding of the material.

*Expressing Algorithms* We have tried to keep the algorithms concise. Algorithms are written at a relatively high level, assuming that the reader can supply implementation details. They are written in a *slanted*, *sans-* *serif font*. Indentation is both deliberate and significant; it matters most in an *if-then-else* construct. Indented code after a *then* or an *else* forms a block. In the following code fragment

|if Action|[s,word]|= ‘‘shift|s ’’ then|
|---|---|---|---|
|push|word|||
|push|s|||
|word else if|NextWord()|||

*i*

*i*

all the statements between the *then* and the *else* are part of the *then* clause of the *if-then-else* construct. When a clause in an *if-then-* *else* construct contains just one statement, we write the keyword *then* or *else* on the same line as the statement.

*Writing Code* In some examples, we show actual program text written in some language chosen to demonstrate a particular point. Actual program text is written in a monospace font.

*Arithmetic Operators* Finally, we have forsaken the traditional use of * for × and of / for ÷, except in actual program text. The meaning should be clear to the reader.

To make this abstract process more concrete, consider the steps needed to generate executable code for the following expression:

a a × 2 × b × c × d

where a, b, c, and d are variables, indicates an assignment, and × is the operator for multiplication. In the following subsections, we will trace the path that a compiler takes to turn this simple expression into executable code.

1.3.1 **The Front End** Before the compiler can translate an expression into executable target- machine code, it must understand both its form, or *syntax*, and its meaning,

**1.3** *Overview of Translation* **11**
or *semantics*. The front end determines if the input code is well formed, in terms of both syntax and semantics. If it finds that the code is valid, it creates a representation of the code in the compiler’s intermediate representation; if not, it reports back to the user with diagnostic error messages to identify the problems with the code.

##### Checking Syntax

To check the syntax of the input program, the compiler must compare the program’s structure against a definition for the language. This requires an appropriate formal definition, an efficient mechanism for testing whether or not the input meets that definition, and a plan for how to proceed on an illegal input.

Mathematically, the source language is a set, usually infinite, of strings defined by some finite set of rules, called a *grammar*. Two separate passes in the front end, called the scanner and the parser, determine whether or not the input code is, in fact, a member of the set of valid programs defined by the grammar.

Programming language grammars usually refer to words based on their parts of speech, sometimes called syntactic categories. Basing the grammar rules on parts of speech lets a single rule describe many sentences. For example, in English, many sentences have the form

##### Sentence! Subject verb Object endmark

where verb and endmark are parts of speech, and *Sentence*, *Subject*, and *Object* are syntactic variables. *Sentence* represents any string with the form described by this rule. The symbol “!” reads “derives” and means that an instance of the right-hand side can be abstracted to the syntactic variable on the left-hand side.

Consider a sentence like “Compilers are engineered objects.” The first step in understanding the syntax of this sentence is to identify distinct words in the input program and to classify each word with a part of speech. In a compiler, this task falls to a pass called the *scanner*. The scanner takes a **Scanner** stream of characters and converts it to a stream of classified words—that the compiler pass that converts a string of is, pairs of the form (*p*,*s*), where *p* is the word’s *part of speech* and *s* is its characters into a stream of words spelling. A scanner would convert the example sentence into the following stream of classified words:

(noun,“Compilers”), (verb,“are”), (adjective,“engineered”), (noun,“objects”), (endmark,“.”)

##### 12 CHAPTER 1 Overview of Compilation

In practice, the actual spelling of the words might be stored in a hash table and represented in the pairs with an integer index to simplify equality tests. Chapter 2 explores the theory and practice of scanner construction.

In the next step, the compiler tries to match the stream of categorized words against the rules that specify syntax for the input language. For example, a working knowledge of English might include the following grammatical rules:

|1 Sentence|! Subject verb Object endmark|
|---|---|
|2 Subject|!|
|3 Subject|! Modifier noun|
|4 Object|!|
|5 Object|! Modifier noun|
|6 Modifier|!|

noun

noun

adjective *: : :*

By inspection, we can discover the following *derivation* for our example sentence:

**Rule Prototype Sentence**

**—** *Sentence* 1 *Subject* verb *Object* endmark 2

|noun verb Object endmark|||
|---|---|---|
|noun verb Modifier noun||endmark|
|noun verb|adjective|noun endmark|

5 6

The derivation starts with the syntactic variable *Sentence*. At each step, it rewrites one term in the prototype sentence, replacing the term with a right- hand side that can be derived from that rule. The first step uses Rule 1 to replace *Sentence*. The second uses Rule 2 to replace *Subject*. The third replaces *Object* using Rule 5, while the final step rewrites *Modifier* with adjective according to Rule 6. At this point, the prototype sentence gener- ated by the derivation matches the stream of categorized words produced by the scanner.

The derivation proves that the sentence “Compilers are engineered objects.” belongs to the language described by Rules 1 through 6. The sentence is grammatically correct. The process of automatically finding derivations is **Parser** the compiler pass that determines if the input called *parsing*. Chapter 3 presents the techniques that compilers use to parse stream is a sentence in the source language the input program.

**1.3** *Overview of Translation* **13**
A grammatically correct sentence can be meaningless. For example, the sentence “Rocks are green vegetables” has the same parts of speech in the same order as “Compilers are engineered objects,” but has no rational meaning. To understand the difference between these two sentences requires contextual knowledge about software systems, rocks, and vegetables.

The semantic models that compilers use to reason about programming lan-**Type checking** guages are simpler than the models needed to understand natural language. the compiler pass that checks for type-consistent A compiler builds mathematical models that detect specific kinds of incon-uses of names in the input program sistency in a program. Compilers check for consistency of type; for example, the expression

a a × 2 × b × c × d

might be syntactically well-formed, but if b and d are character strings, the sentence might still be invalid. Compilers also check for consistency of num- ber in specific situations; for example, an array reference should have the same number of dimensions as the array’s declared rank and a procedure call should specify the same number of arguments as the procedure’s defini- tion. Chapter 4 explores some of the issues that arise in compiler-based type checking and semantic elaboration.

##### Intermediate Representations

The final issue handled in the front end of a compiler is the generation of an ir form of the code. Compilers use a variety of different kinds of ir, depending on the source language, the target language, and the specific trans- formations that the compiler applies. Some irs represent the program as a

|t0|a × 2|
|---|---|
|t1|t0 × b|
|t2|t1 × c|
|t3|t2 × d|
|a|t3|

graph. Others resemble a sequential assembly code program. The code in the margin shows how our example expression might look in a low-level, sequential ir. Chapter 5 presents an overview of the variety of kinds of irs that compilers use.

For every source-language construct, the compiler needs a strategy for how it will implement that construct in the ir form of the code. Specific choices affect the compiler’s ability to transform and improve the code. Thus, we spend two chapters on the issues that arise in generation of ir for source-code constructs. Procedure linkages are, at once, a source of inefficiency in the final code and the fundamental glue that pieces together different source files into an application. Thus, we devote Chapter 6 to the issues that surround procedure calls. Chapter 7 presents implementation strategies for most other programming language constructs.

##### 14 CHAPTER 1 Overview of Compilation

##### TERMINOLOGY

A careful reader will notice that we use the word *code* in many places where either *program* or *procedure* might naturally fit. Compilers can be invoked to translate fragments of code that range from a single reference through an entire system of programs. Rather than specify some scope of compilation, we will continue to use the ambiguous, but more general, term, *code*.

1.3.2 **The Optimizer** When the front end emits ir for the input program, it handles the statements one at a time, in the order that they are encountered. Thus, the initial ir program contains general implementation strategies that will work in any surrounding context that the compiler might generate. At runtime, the code will execute in a more constrained and predictable context. The optimizer analyzes the ir form of the code to discover facts about that context and uses that contextual knowledge to rewrite the code so that it computes the same answer in a more efficient way. Efficiency can have many meanings. The classic notion of optimization is to reduce the application’s running time. In other contexts, the optimizer might try to reduce the size of the compiled code, or other properties such as the energy that the processor consumes evaluating the code. All of these strategies target efficiency. Returning to our example, consider it in the context shown in Figure 1.2a. The statement occurs inside a loop. Of the values that it uses, only a and d change inside the loop. The values of 2, b, and c are invariant in the loop. If the optimizer discovers this fact, it can rewrite the code as shown in
Figure 1.2b. In this version, the number of multiplications has been reduced
 from 4 n to 2 n + 2. For n*>*1, the rewritten loop should execute faster. This kind of optimization is discussed in Chapters 8, 9, and 10.
##### Analysis

Most optimizations consist of an analysis and a transformation. The analysis determines where the compiler can safely and profitably apply the technique. **Data-flow analysis** Compilers use several kinds of analysis to support transformations. *Data-* a form of compile-time reasoning about the *flow analysis* reasons, at compile time, about the flow of values at runtime. runtime flow of values Data-flow analyzers typically solve a system of simultaneous set equations that are derived from the structure of the code being translated. *Dependence* *analysis* uses number-theoretic tests to reason about the values that can be

**1.3** *Overview of Translation* **15**
b

|c|||b||
|---|---|---|---|---|
|a 1|||c||
||||a 1||
|for i = read d|1 to n||t 2 ×|b × c|
|a a|× 2 × b|× c × d|for i =|1 to n|
|end|||read d a a|× d × t|
||||end||

c b

(a) Original Code in Context (b) Improved Code n **FIGURE 1.2** Context Makes a Difference. assumed by subscript expressions. It is used to disambiguate references to array elements. Chapter 9 presents a detailed look at data-flow analysis and its application, along with the construction of static-single-assignment form, an ir that encodes information about the flow of both values and control directly in the ir.
##### Transformation

To improve the code, the compiler must go beyond analyzing it. The com- piler must use the results of analysis to rewrite the code into a more efficient form. Myriad transformations have been invented to improve the time or space requirements of executable code. Some, such as discovering loop-invariant computations and moving them to less frequently executed locations, improve the running time of the program. Others make the code more compact. Transformations vary in their effect, the scope over which they operate, and the analysis required to support them. The literature on transformations is rich; the subject is large enough and deep enough to merit one or more separate books. Chapter 10 covers the subject of scalar transformations—that is, transformations intended to improve the perfor- mance of code on a single processor. It presents a taxonomy for organizing the subject and populates that taxonomy with examples.

1.3.3 **The Back End** The compiler’s back end traverses the ir form of the code and emits code for the target machine. It selects target-machine operations to implement each ir operation. It chooses an order in which the operations will execute efficiently. It decides which values will reside in registers and which values will reside in memory and inserts code to enforce those decisions.

##### 16 CHAPTER 1 Overview of Compilation

##### ABOUT ILOC

Throughout the book, low-level examples are written in a notation that we call ILOC—an acronym derived from "intermediate language for an optimizing compiler." Over the years, this notation has undergone many changes. The version used in this book is described in detail in Appendix A.

Think of ILOC as the assembly language for a simple RISC machine. It has a standard set of operations. Most operations take arguments that are regis- ters. The memory operations, loads and stores, transfer values between memory and the registers. To simplify the exposition in the text, most examples assume that all data consists of integers.

Each operation has a set of operands and a target. The operation is written in five parts: an operation name, a list of operands, a separator, a list of targets, and an optional comment. Thus, to add registers 1 and 2, leaving the result in register 3, the programmer would write add r1,r2) r3 // example instruction The separator,), precedes the target list. It is a visual reminder that infor- mation flows from left to right. In particular, it disambiguates cases where a person reading the assembly-level text can easily confuse operands and targets. (See loadAI and storeAI in the following table.)

The example in Figure 1.3 only uses four ILOC operations:

**ILOC Operation Meaning**

Memory(r1 +c2) ! r3

|loadAI|r1,c2) r3|||
|---|---|---|---|
|loadI|c1|2|c1 ! r2|
|mult|r1,r2) r3||r1 × r2 ! r3|
|storeAI|r1|2,c3|r1 ! Memory(r2 +c3)|

) r

) r

Appendix A contains a more detailed description of ILOC. The examples consistently use rarpas a register that contains the start of data storage for the current procedure, also known as the *activation record pointer*.

##### Instruction Selection

The first stage of code generation rewrites the ir operations into target

|t0|a × 2||||
|---|---|---|---|---|
|t1|t0 × b||||
|t2|t1 × c||||
|t3|t2 × d||||
|a|t3|a × 2|× b ×|c × d,|

machine operations, a process called *instruction selection*. Instruction selection maps each ir operation, in its context, into one or more target machine operations. Consider rewriting our example expression, a into code for the iloc virtual machine to illustrate the process. (We will use iloc throughout the book.) The ir form of the expression is repeated in the margin. The compiler might choose the operations shown in Figure 1.3. This code assumes that a, b, c, and d

**1.3** *Overview of Translation* **17**
)

|loadAI|rarp, @a|ra|// load|‘a’|||
|---|---|---|---|---|---|---|
|loadI|2|r2|// constant|2 into|r2||
|loadAI|rarp, @b|rb|// load|‘b’|||
|loadAI|rarp, @c|rc|// load|‘c’|||
|loadAI|rarp, @d|rd|// load|‘d’|||
|mult|ra, r2|ra|// ra|a × 2|||
|mult|ra, rb|ra|// ra|(a × 2)|× b||
|mult|ra, rc|ra|// ra|(a × 2|× b) ×|c|
|mult|ra, rd|ra|// ra|(a × 2|× b × c)|× d|
|storeAI|ra|rarp, @a|// write|ra back|to ‘a’||
|n FIGURE 1.3|ILOC|a × 2|× b × c ×|d.|||

) ) ) ) ) ) ) ) )

##### Code for a

are located at offsets @a, @b, @c, and @d from an address contained in the register rarp.

The compiler has chosen a straightforward sequence of operations. It loads all of the relevant values into registers, performs the multiplications in order, and stores the result to the memory location for a. It assumes an unlimited supply of registers and names them with symbolic names such as rato hold a and rarp to hold the address where the data storage for our named values begins. Implicitly, the instruction selector relies on the register allocator to map these symbolic register names, or *virtual registers*, to the actual registers **Virtual register** of the target machine. a symbolic register name that the compiler uses to indicate that a value can be stored in a register The instruction selector can take advantage of special operations on the target machine. For example, if an immediate-multiply operation

|(multI) is available, it might replace the operation mult r|||) r with|
|---|---|---|---|
|multI ra, 2) ra, eliminating the need for the operation loadI 2) r2 and add.|a, r2 a|a, r2 a, ra a|a|

reducing the demand for registers. If addition is faster than multiplica- tion, it might replace mult r) r with add r) r, avoiding both the loadI and its use of r₂, as well as replacing the mult with a faster Chapter 11 presents two different techniques for instruction selec- tion that use pattern matching to choose efficient implementations for ir operations.

##### Register Allocation

During instruction selection, the compiler deliberately ignored the fact that the target machine has a limited set of registers. Instead, it used vir- tual registers and assumed that “enough” registers existed. In practice, the earlier stages of compilation may create more demand for registers than the hardware can support. The register allocator must map those virtual registers

##### 18 CHAPTER 1 Overview of Compilation

onto actual target-machine registers. Thus, the register allocator decides, at each point in the code, which values should reside in the target-machine reg- isters. It then rewrites the code to reflect its decisions. For example, a register allocator might minimize register use by rewriting the code from Figure 1.3 as follows:

|loadAI|rarp, @a|r1|// load|‘a’|||
|---|---|---|---|---|---|---|
|add|r1, r1|r1|// r1|a × 2|||
|loadAI|rarp, @b|r2|// load|‘b’|||
|mult|r1, r2|r1|// r1|(a × 2)|× b||
|loadAI|rarp, @c|r2|// load|‘c’|||
|mult|r1, r2|r1|// r1|(a × 2|× b) ×|c|
|loadAI|rarp, @d|r2|// load|‘d’|||
|mult|r1, r2|r1|// r1|(a × 2|× b × c)|× d|
|storeAI|r1|rarp,|// write|ra back|to ‘a’||

) ) ) ) ) ) ) ) ) @a

This sequence uses three registers instead of six.

Minimizing register use may be counterproductive. If, for example, any of the named values, a, b, c, or d, are already in registers, the code should reference those registers directly. If all are in registers, the sequence could be implemented so that it required no additional registers. Alternatively, if some nearby expression also computed a × 2, it might be better to preserve that value in a register than to recompute it later. This optimization would increase demand for registers but eliminate a later instruction. Chapter 13 explores the problems that arise in register allocation and the techniques that compiler writers use to solve them.

##### Instruction Scheduling

To produce code that executes quickly, the code generator may need to reorder operations to reflect the target machine’s specific performance con- straints. The execution time of the different operations can vary. Memory access operations can take tens or hundreds of cycles, while some arith- metic operations, particularly division, take several cycles. The impact of these longer latency operations on the performance of compiled code can be dramatic.

Assume, for the moment, that a loadAI or storeAI operation requires three cycles, a mult requires two cycles, and all other operations require one cycle. The following table shows how the previous code fragment performs under these assumptions. The **Start** column shows the cycle in which each oper- ation begins execution and the **End** column shows the cycle in which it completes.

**1.3** *Overview of Translation* **19**

|Start|End||||||||
|---|---|---|---|---|---|---|---|---|
|1|3|loadAI||rarp, @a) r1||||// load ‘a’|
|4|4|add||r1, r1|) r|1||// r1 a × 2|
|5|7|loadAI||rarp, @b) r2||||// load ‘b’|
|8|9|mult||r1, r2|) r|1||// r1 (a × 2) × b|
|10|12|loadAI||rarp, @c) r2||||// load ‘c’|
|13|14|mult||r1, r2|) r|1||// r1 (a × 2 × b) × c|
|15|17|loadAI||rarp, @d) r2||||// load ‘d’|
|18|19|mult||r1, r2|) r|1||// r1 (a × 2 × b × c) × d|
|20|22|storeAI|r1||) r|arp, @a||// write ra back to ‘a’|

This nine-operation sequence takes 22 cycles to execute. Minimizing regis- ter use did not lead to rapid execution.

Many processors have a property by which they can initiate new operations while a long-latency operation executes. As long as the results of a long- latency operation are not referenced until the operation completes, execution proceeds normally. If, however, some intervening operation tries to read the result of the long-latency operation prematurely, the processor delays the operation that needs the value until the long-latency operation completes. An operation cannot begin to execute until its operands are ready, and its results are not ready until the operation terminates.

The instruction scheduler reorders the operations in the code. It attempts to minimize the number of cycles wasted waiting for operands. Of course, the scheduler must ensure that the new sequence produces the same result as the original. In many cases, the scheduler can drastically improve the perfor- mance of “naive” code. For our example, a good scheduler might produce the following sequence:

|Start|End||||||||
|---|---|---|---|---|---|---|---|---|
|1|3|loadAI||rarp, @a) r1||||// load ‘a’|
|2|4|loadAI||rarp, @b) r2||||// load ‘b’|
|3|5|loadAI||rarp, @c) r3||||// load ‘c’|
|4|4|add||r1, r1|) r|1||// r1 a × 2|
|5|6|mult||r1, r2|) r|1||// r1 (a × 2) × b|
|6|8|loadAI||rarp, @d) r2||||// load ‘d’|
|7|8|mult||r1, r3|) r|1||// r1 (a × 2 × b) × c|
|9|10|mult||r1, r2|) r|1||// r1 (a × 2 × b × c) × d|
|11|13|storeAI|r1||) r|arp, @a||// write ra back to ‘a’|

##### 20 CHAPTER 1 Overview of Compilation

##### COMPILER CONSTRUCTION IS ENGINEERING

A typical compiler has a series of passes that, together, translate code from some source language into some target language. Along the way, the compiler uses dozens of algorithms and data structures. The compiler writer must select, for each step in the process, an appropriate solution.

A successful compiler executes an unimaginable number of times. Con- sider the total number of times that GCC compiler has run. Over GCC’s lifetime, even small inefficiencies add up to a significant amount of time. The savings from good design and implementation accumulate over time. Thus, the compiler writer must pay attention to compile time costs, such as the asymptotic complexity of algorithms, the actual running time of the implementation, and the space used by data structures. The compiler writer should have in mind a budget for how much time the compiler will spend on its various tasks.

For example, scanning and parsing are two problems for which efficient algorithms abound. Scanners recognize and classify words in time pro- portional to the number of characters in the input program. For a typical programming language, a parser can build derivations in time proportional to the length of the derivation. (The restricted structure of programming languages makes efficient parsing possible.) Because efficient and effec- tive techniques exist for scanning and parsing, the compiler writer should expect to spend just a small fraction of compile time on these tasks.

By contrast, optimization and code generation contain several problems that require more time. Many of the algorithms that we will examine for program analysis and optimization will have complexities greater than **O**(*n*). Thus, algorithm choice in the optimizer and code generator has a larger impact on compile time than it does in the compiler’s front end. The compiler writer may need to trade precision of analysis and effectiveness of optimization against increases in compile time. He or she should make such decisions consciously and carefully.

This version of the code requires just 13 cycles to execute. The code uses one more register than the minimal number. It starts an operation in every cycle except 8, 10, and 12. Other equivalent schedules are possible, as are equal-length schedules that use more registers. Chapter 12 presents several scheduling techniques that are in widespread use.

##### Interactions Among Code-Generation Components

Most of the truly hard problems that occur in compilation arise during code generation. To make matters more complex, these problems interact. For

**1.4** *Summary and Perspective* **21**
example, instruction scheduling moves load operations away from the arith- metic operations that depend on them. This can increase the period over which the values are needed and, correspondingly, increase the number of registers needed during that period. Similarly, the assignment of particular values to specific registers can constrain instruction scheduling by creating a “false” dependence between two operations. (The second operation can- not be scheduled until the first completes, even though the values in the common register are independent. Renaming the values can eliminate this false dependence, at the cost of using more registers.)

1.4 **SUMMARY AND PERSPECTIVE** Compiler construction is a complex task. A good compiler combines ideas from formal language theory, from the study of algorithms, from artificial intelligence, from systems design, from computer architecture, and from the theory of programming languages and applies them to the problem of trans- lating a program. A compiler brings together greedy algorithms, heuristic techniques, graph algorithms, dynamic programming, dfas and nfas, fixed- point algorithms, synchronization and locality, allocation and naming, and pipeline management. Many of the problems that confront the compiler are too hard for it to solve optimally; thus, compilers use approximations, heuris- tics, and rules of thumb. This produces complex interactions that can lead to surprising results—both good and bad. To place this activity in an orderly framework, most compilers are organized into three major phases: a front end, an optimizer, and a back end. Each phase has a different set of problems to tackle, and the approaches used to solve those problems differ, too. The front end focuses on translating source code into some ir. Front ends rely on results from formal language theory and type theory, with a healthy dose of algorithms and data structures. The middle section, or optimizer, translates one ir program into another, with the goal of producing an ir program that executes efficiently. Optimizers analyze programs to derive knowledge about their runtime behavior and then use that knowledge to transform the code and improve its behavior. The back end maps an ir program to the instruction set of a specific processor. A back end approximates the answers to hard problems in allocation and scheduling, and the quality of its approximation has a direct impact on the speed and size of the compiled code. This book explores each of these phases. Chapters 2 through 4 deal with the algorithms used in a compiler’s front end. Chapters 5 through 7 describe background material for the discussion of optimization and code generation. Chapter 8 provides an introduction to code optimization. Chapters 9 and 10

##### 22 CHAPTER 1 Overview of Compilation

provide more detailed treatment of analysis and optimization for the inter- ested reader. Finally, Chapters 11 through 13 cover the techniques used by back ends for instruction selection, scheduling, and register allocation.

n **CHAPTER NOTES** The first compilers appeared in the 1950s. These early systems showed surprising sophistication. The original fortran compiler was a multipass system that included a distinct scanner, parser, and register allocator, along with some optimizations [26, 27]. The Alpha system, built by Ershov and his colleagues, performed local optimization [139] and used graph coloring to reduce the amount of memory needed for data items [140, 141].

Knuth provides some interesting recollections of compiler construction in the early 1960s [227]. Randell and Russell describe early implementa- tion efforts for Algol 60 [293]. Allen describes the history of compiler development inside ibm with an emphasis on the interplay of theory and practice [14].

Many influential compilers were built in the 1960s and 1970s. These include the classic optimizing compiler fortran H [252, 307], the Bliss-11 and Bliss-32 compilers [72, 356], and the portable bcpl compiler [300]. These compilers produced high-quality code for a variety of cisc machines. Com- pilers for students, on the other hand, focused on rapid compilation, good diagnostic messages, and error correction [97, 146].

The advent of risc architecture in the 1980s led to another generation of compilers; these focused on strong optimization and code generation [24, 81, 89, 204]. These compilers featured full-blown optimizers structured as shown in Figure 1.1. Modern risc compilers still follow this model.

During the 1990s, compiler-construction research focused on reacting to the rapid changes taking place in microprocessor architecture. The decade began with Intel’s *i*860 processor challenging compiler writers to manage pipelines and memory latencies directly. At its end, compilers confronted challenges that ranged from multiple functional units to long memory laten- cies to parallel code generation. The structure and organization of 1980s risc compilers proved flexible enough for these new challenges, so researchers built new passes to insert into the optimizers and code generators of their compilers.

While Java systems use a mix of compilation and interpretation [63, 279], Java is not the first language to employ such a mix. Lisp systems have long included both native-code compilers and virtual-machine implementation

##### Exercises 23

schemes [266, 324]. The Smalltalk-80 system used a bytecode distribution and a virtual machine [233]; several implementations added just-in-time compilers [126].

n **EXERCISES**

**1.** Consider a simple Web browser that takes as input a textual string in html format and displays the specified graphics on the screen. Is the display process one of compilation or interpretation?
**2.** In designing a compiler, you will face many tradeoffs. What are the five qualities that you, as a user, consider most important in a compiler that you purchase? Does that list change when you are the compiler writer? What does your list tell you about a compiler that you would implement?
**3.** Compilers are used in many different circumstances. What differences might you expect in compilers designed for the following applications?
**a.** A just-in-time compiler used to translate user interface code downloaded over a network
**b.** A compiler that targets the embedded processor used in a cellular telephone
**c.** A compiler used in an introductory programming course at a high school
**d.** A compiler used to build wind-tunnel simulations that run on a massively parallel processor (where all processors are identical)
**e.** A compiler that targets numerically intensive programs to a large number of diverse machines

##### This page intentionally left blank

#### Chapter 2

