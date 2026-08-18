## Scalar Optimizations

n **CHAPTER OVERVIEW** An optimizing compiler improves the quality of the code that it generates by applying transformations that rewrite the code. This chapter builds on the introduction to optimization provided in Chapter 8 and the material on static analysis in Chapter 9 to focus on optimization of the code for a single thread of control—so-called scalar optimization. The chapter introduces a broad selection of machine-independent transformations that address a variety of inefficiencies in the compiled code.

**Keywords:** Optimization, Transformation, Machine Dependent, Machine Independent, Redundancy, Dead Code, Constant Propagation

10.1 **INTRODUCTION** An optimizer analyzes and transforms the code with the intent to improve its performance. The compiler uses static analyses, such as data-flow anal- ysis (see Chapter 9) to discover opportunities for transformations and to prove their safety. These analyses are preludes to transformations—unless the compiler rewrites the code, nothing will change. Code optimization has a history that is as long as the history of com- pilers. The first fortran compiler included careful optimization with the intent to provide performance that rivaled hand-coded assembly code. Since that first optimizing compiler in the late 1950s, the literature on optimiza- tion has grown to include thousands of papers that describe analyses and transformations. Deciding which transformations to use and selecting an order of application
##### Scalar optimization

for them remains one of the most daunting decisions that a compiler writer code improvement techniques that focus on a faces. This chapter focuses on *scalar optimization*, that is, optimization of single thread of control

**Engineering a Compiler**. **DOI: 10.1016/B978-0-12-088478-0.00010-4** Copyright c 2012, Elsevier Inc. All rights reserved.

##### 540 CHAPTER 10 Scalar Optimizations

##### Machine independent

##### A transformation that improves code on most

##### target machines is consideredmachine

*independent*. **Machine dependent** A transformation that relies on knowledge of the target processor is considered*machine* *dependent*.

code along a single thread of control. It identifies five key sources of inef- ficiency in compiled code and then presents a set of optimizations that help to remove those inefficiencies. The chapter is organized around these five effects; we expect that a compiler writer choosing optimizations might use the same organizational scheme.

##### Conceptual Roadmap

Compiler-based optimization is the process of analyzing the code to deter- mine its properties and using the results of that analysis to rewrite the code into a more efficient or more effective form. Such improvement can be mea- sured in many ways, including decreased running time, smaller code size, or lower processor energy use during execution. Every compiler has some set of input programs for which it produces highly efficient code. A good optimizer should make that performance available on a much larger set of inputs. The optimizer should be robust, that is, small changes in the input should not produce wild performance changes.

An optimizer achieves these goals through two primary mechanisms. It elim- inates unnecessary overhead introduced by programming language abstrac- tions and it matches the needs of the resulting program to the available hardware and software resources of the target machine. In the broadest sense, transformations can be classified as either *machine independent* or *machine dependent*. For example, replacing a redundant computation with a reuse of the previously computed value is usually faster than recomputing the value; thus, redundancy elimination is considered machine indepen- dent. By contrast, implementing a character string copy operation with the “scatter-gather” hardware on a vector processor is clearly *machine depen-* *dent*. Rewriting that copy operation with a call to the hand-optimized system routine bcopy might be more broadly applicable.

##### Overview

Most optimizers are built as a series of passes, as shown in the margin. Each pass takes code in ir form as its input. Each pass produces a rewritten ver- sion of the ir code as its output. This structure breaks the implementation into smaller pieces and avoids some of the complexity that arises in large, monolithic programs. It allows the passes to be built and tested indepen- dently, which simplifies development, testing, and maintenance. It creates a natural way for the compiler to provide different levels of optimization; each level specifies a set of passes to run. The pass structure allows the com- piler writer to run some passes multiple times, if desirable. In practice, some passes should run once, while others might run several times at different points in the sequence.

*P P P* *a a a* -*s*-*s*-.. .-*s*- *s s s* *1 2 n*

<u>?6?6</u>?6 *Analysis*

**10.1** *Introduction* **541**
##### OPTIMIZATION SEQUENCES

The choice of specific transformations and the order of their application has a strong impact on the effectiveness of an optimizer. To make the problem harder, individual transformations have overlapping effects (e.g. local value numbering versus superlocal value numbering) and individual applications have different sets of inefficiencies.

Equally difficult, transformations that address different effects interact with one another. A given transformation can create opportunities for other transformations. Symmetrically, a given transformation can obscure or eliminate opportunities for other transformations.

Classic optimizing compilers provide several levels of optimization (e.g. -O, -O1, -O2,... ) as one way of providing the end user with multiple sequences that they can try. Researchers have focused on techniques to derive custom sequences for specific application codes, selecting both a set of transformations and an order of application. Section 10.7.3 discusses this problem in more depth.

In the design of an optimizer, the selection of transformations and the order- ing of those transformations play a critical role in determining the overall effectiveness of the optimizer. The selection of transformations determines what specific inefficiencies in the ir program the optimizer discovers and how it rewrites the code to reduce those inefficiencies. The order in which the compiler applies the transformations determines how the passes interact.

For example, in the appropriate context (r₂ *>* 0 and r₅ D 4), an optimizer might replace mult r2, r5) r₁₇ with lshiftI r2, 2) r₁₇. This change replaces a multicycle integer multiply with a single-cycle shift operation and reduces demand for registers. In most cases, this rewrite is profitable. If, however, the next pass relies on commutativity to rearrange expressions, then replacing a multiply with a shift forecloses an opportunity (multiply is commutative, shift is not). To the extent that a transformation makes later passes less effective, it may hurt overall code quality. Deferring the replace- ment of multiplies by shifts may avoid this problem; the context needed to prove safety and profitability for this rewrite is likely to survive the intervening passes.

The first hurdle in the design and construction of an optimizer is concep- tual. The optimization literature describes hundreds of distinct algorithms to improve ir programs. The compiler writer must select a subset of these transformations to implement and apply. While reading the origi- nal papers may help with the implementation, it provides little insight for

##### 542 CHAPTER 10 Scalar Optimizations

the decision process, since most of the papers advocate using their own transformations.

Compiler writers need to understand both what inefficiencies arise in appli- cations translated by their compilers and what impact those inefficiencies have on the application. Given a set of specific flaws to address, they can then select specific transformations to address them. Many transforma- tions, in fact, address multiple inefficiencies, so careful selection can reduce the number of passes needed. Since most optimizers are built with lim- ited resources, the compiler writer can prioritize transformations by their expected impact on the final code.

As mentioned in the conceptual roadmap, transformations fall into two broad categories: machine-independent transformations and machine-dependent transformations. Examples of machine-independent transformations from The distinction between the categories can be earlier chapters include local value numbering, inline substitution, and unclear. We call a transformation machine constant propagation. Machine-dependent transformations often fall into independent if it deliberately ignores target the realm of code generation. Examples include peephole optimization machine considerations, such as its impact on (see Section 11.5), instruction scheduling, and register allocation. Other register allocation. machine-dependent transformations fall into the realm the optimizer. Exam- ples include tree-height balancing, global code placement, and proce- dure placement. Some transformations resist classification; loop unrolling can address either machine-independent issues such as loop overhead or machine-dependent issues such as instruction scheduling.

Chapters 8 and 9 have already presented a number of transformations, selected to illustrate specific points in those chapters. The next three chap- ters focus on code generation, a machine-dependent activity. Many of the techniques presented in these chapters, such as peephole optimiza- tion, instruction scheduling, and register allocation, are machine-dependent transformations. This chapter presents a broad selection of transformations, mostly machine-independent transformations. The transformations are orga- nized around the effect that they have on the final code. We will concern ourselves with five specific effects.

n *Eliminate useless and unreachable code* The compiler can discover that an operation is either useless or unreachable. In most cases, eliminating such operations produces faster, smaller code. n *Move code* The compiler can move an operation to a place where it executes fewer times but produces the same answer. In most cases, code motion reduces runtime. In some cases, it reduces code size. n *Specialize a computation* The compiler can use the context around an operation to specialize it, as in the earlier example that rewrote a

**10.1** *Introduction* **543**
##### OPTIMIZATION AS SOFTWARE ENGINEERING

Having a separate optimizer can simplify the design and implementation of a compiler. The optimizer simplifies the front end; the front end can generate general-purpose code and ignore special cases. The optimizer simplifies the back end; the back end can focus on mapping the IR version of the program to the target machine. Without an optimizer, both the front end and back end must be concerned with finding opportunities for improvement and exploiting them. In a pass-structured optimizer, each pass contains a transformation and the analysis required to support it. In principle, each task that the opti- mizer performs can be implemented once. This provides a single point of control and lets the compiler writer implement complex functions once, rather than many times. For example, deleting an operation from the IR can be complicated. If the deleted operation leaves a basic block empty, except for the block-ending branch or jump, then the transformation should also delete the block and reconnect the block’s predecessors to its suc- cessors, as appropriate. Keeping this functionality in one place simplifies implementation, understanding, and maintenance. From a software engineering perspective, the pass structure, with a clear separation of concerns, makes sense. It lets each pass focus on a single task. It provides a clear separation of concerns—value numbering ignores reg- ister pressure and the register allocator ignores common subexpressions. It lets the compiler writer test passes independently and thoroughly, and it simplifies fault isolation.

multiply as a shift. Specialization reduces the cost of general code sequences. n *Eliminate a redundant computation* The compiler can prove that a value has already been computed and reuse the earlier value. In many cases, reuse costs less than recomputation. Local value numbering captures this effect. n *Enable other transformations* The compiler can rewrite the code in a way that exposes new opportunities for other transformations. Inline substitution, for example, creates opportunities for many other optimizations.

This set of categories covers most machine-independent effects that the com- piler can address. In practice, many transformations attack effects in more than one category. Local value numbering, for example, eliminates redun- dant computations, specializes computations with known constant values, and uses algebraic identities to identify and remove some kinds of useless computations.

##### 544 CHAPTER 10 Scalar Optimizations

10.2 **ELIMINATING USELESS AND** **UNREACHABLE CODE** Sometimes, programs contain computations that have no externally visible effect. If the compiler can determine that a given operation does not affect the program’s results, it can eliminate the operation. Most programmers do not write such code intentionally. However, it arises in most programs as the direct result of optimization in the compiler and often from macro expansion or naive translation in the compiler’s front end.
**Useless** Two distinct effects can make an operation eligible for removal. The opera- An operation is*useless*if no operation uses tion can be *useless*, meaning that its result has no externally visible effect. its result, or if all uses of the result are, Alternatively, the operation can be *unreachable*, meaning that it cannot exe- themselves dead. cute. If an operation falls into either category, it can be eliminated. The term **Unreachable** *dead code* is often used to mean either useless or unreachable code; we use An operation is*unreachable*if no valid the term to mean useless. control-flow path contains the operation. Removing useless or unreachable code shrinks the ir form of the code, which leads to a smaller executable program, faster compilation, and, often, to faster execution. It may also increase the compiler’s ability to improve the code. For example, unreachable code may have effects that show up in the results of static analysis and prevent the application of some trans- formations. In this case, removing the unreachable block may change the analysis results and allow further transformations (see, for example, sparse conditional constant propagation, or sccp, in Section 10.7.1).

Some forms of redundancy elimination also remove useless code. For instance, local value numbering applies algebraic identities to simplify the code. Examples include x + 0) x, y x 1) y, and max(z,z)) z. Each of these simplifications eliminates a useless operation—by definition, an oper- ation that, when removed, makes no difference in the program’s externally visible behavior.

Because the algorithms in this section modify the program’s control-flow graph (cfg), we carefully distinguish between the terms *branch*, as in an iloc cbr, and *jump*, as in an iloc jump. Close attention to this distinction will help the reader understand the algorithms.

10.2.1 **Eliminating Useless Code** The classic algorithms for eliminating useless code operate in a manner similar to mark-sweep garbage collectors with the ir code as data (see
##### An operation can set a return value in

Section 6.6.2). Like mark-sweep collectors, they perform two passes over several ways, including assignment to a the code. The first pass starts by clearing all the mark fields and marking call-by-reference parameter or a global variable, assignment through an ambiguous pointer, or “critical” operations as “useful.” An operation is *critical* if it sets return val- passing a return value via a return statement. ues for the procedure, it is an input/output statement, or it affects the value in

**10.2** *Eliminating Useless and Unreachable Code* **545**
*Mark()* *WorkList*; *for each operation i* *clear i’s mark* *if i is critical then*

|if i is|critical|then|||||
|---|---|---|---|---|---|---|
|mark|i||||||
|WorkList|WorkList|[ fig||)|||
|(WorkList|6D ;)|||each operation|i||
|remove|i from WorkList|||if i is unmarked|then||
|(assume|i is x|y op|z)|if i is|a branch|then|
|if def(y)|is not|marked then||rewrite|i with|a jump|
|mark|def(y)|||to|i’s nearest|marked|
|WorkList|WorkList|[ fdef(y)g||postdominator|||
|if def(z)|is not|marked then||if i is|not a jump|then|
|mark|def(z)|||delete|i||
|WorkList|WorkList|[ fdef(z)g|||||
|for each|block b|2 rdf(block(i))|||||
|let|j be the branch|that|ends||||
|if j|is unmarked|then|||||
|mark|j||||||
|WorkList||WorkList|[ f jg||||

*Sweep(* *while for*

*b*

(a) The *Mark* Routine (b) The *Sweep* Routine
n **FIGURE 10.1** Useless Code Elimination.

a storage location that may be accessible from outside the current procedure. Examples of critical operations include a procedure’s prologue and epilogue code and the precall and postreturn sequences at calls. Next, the algorithm traces the operands of useful operations back to their definitions and marks those operations as useful. This process continues, in a simple worklist iter- ative scheme, until no more operations can be marked as useful. The second pass walks the code and removes any operation not marked as useful.

Figure 10.1 makes these ideas concrete. The algorithm, which we call *Dead*,

assumes that the code is in ssa form. ssa simplifies the process because each use refers to a single definition. *Dead* consists of two passes. The first, called *Mark*, discovers the set of useful operations. The second, called *Sweep*, removes useless operations. *Mark* relies on reverse dominance fron- tiers, which derive from the dominance frontiers used in the ssa construction (see Section 9.3.2).

The treatment of operations other than branches or jumps is straightforward. The marking phase determines whether an operation is useful. The sweep phase removes operations that have not been marked as useful.

##### 546 CHAPTER 10 Scalar Optimizations

The treatment of control-flow operations is more complex. Every jump is considered useful. Branches are considered useful only if the execution of a useful operation depends on their presence. As the marking phase discovers useful operations, it also marks the appropriate branches as useful. To map from a marked operation to the branches that it makes useful, the algorithm relies on the notion of control dependence.

**Postdominance** The definition of control dependence relies on *postdominance*. In a cfg, In a CFG, *j postdominates i*if and only if every path node *j* postdominates node *i* if every path from *i* to the cfg’s exit node from*i*to the exit node passes through*j*. passes through *j*. Using postdominance, we can define control dependence

##### See also the definition of dominance on

as follows: in a cfg, node *j* is control-dependent on node *i* if and only if page 478.

**1.** There exists a nonnull path from *i* to *j* such that *j* postdominates every node on the path after *i*. Once execution begins on this path, it must flow through *j* to reach the cfg’s exit (from the definition of postdominance).
**2.** *j* does not strictly postdominate *i*. Another edge leaves *i* and control may flow along a path to a node not on the path to *j*. There must be a path beginning with this edge that leads to the cfg’s exit without passing through *j*. In other words, two or more edges leave block *i*. One or more edges leads to *j* and one or more edges do not. Thus, the decision made at the branch- ending block *i* can determine whether or not *j* executes. If an operation in *j* is useful, then the branch that ends *i* is also useful. This notion of control dependence is captured precisely by the *reverse dom-* *inance frontier* of *j*, denoted rdf(*j*). Reverse dominance frontiers are simply dominance frontiers computed on the reverse cfg. When *Mark* marks an operation in block *b* as useful, it visits every block in *b*’s reverse dominance frontier and marks their block-ending branches as useful. As it marks these branches, it adds them to the worklist. It halts when that worklist is empty. *Sweep* replaces any unmarked branch with a jump to its first postdominator that contains a marked operation. If the branch is unmarked, then its succes- sors, down to its immediate postdominator, contain no useful operations. (Otherwise, when those operations were marked, the branch would have been marked.) A similar argument applies if the immediate postdominator contains no marked operations. To find the nearest useful postdominator, the algorithm can walk up the postdominator tree until it finds a block that con- tains a useful operation. Since, by definition, the exit block is useful, this search must terminate. After *Dead* runs, the code contains no useless computations. It may contain empty blocks, which can be removed by the next algorithm.

*Eliminating Useless and Unreachable Code*

**10.2**
**547**

*BiBi* ⇒

*BjBj* Fold a Redundant Branch

10.2.2 **Eliminating Useless Control Flow** Optimization can change the ir form of the program so that it has useless control flow. If the compiler includes optimizations that can produce useless control flow as a side effect, then it should include a pass that simplifies the cfg by eliminating useless control flow. This section presents a simple algorithm called *Clean* that handles this task. *Clean* operates directly on the procedure’s cfg. It uses four transformations, shown in the margin. They are applied in the following order:
**1.** *Fold a Redundant Branch* If *Clean* finds a block that ends in a branch, and both sides of the branch target the same block, it replaces the branch with a jump to the target block. This situation arises as the result of other simplifications. For example, *Bi*might have had two successors, each with a jump to *Bj*. If another transformation had already emptied those blocks, then empty-block removal, discussed next, might produce the initial graph shown in the margin.
**2.** *Remove an Empty Block* If *Clean* finds a block that contains only a jump, it can merge the block into its successor. This situation arises when other passes remove all of the operations from a block *Bi*. Consider the left graph of the pair shown in the margin. Since *Bi*has only one successor, *Bj*, the transformation retargets the edges that enter *Bi*to *Bj*and deletes *Bi*from *Bj*’s set of predecessors. This simplifies the graph. It should also speed up execution. In the original graph, the paths through *Bi*needed two control-flow operations to reach *Bj*. In the transformed graph, those paths use one operation to reach *Bj*.
**3.** *Combine Blocks* If *Clean* finds a block *Bi*that ends in a jump to *Bj* and *Bj*has only one predecessor, it can combine the two blocks, as shown in the margin. This situation can arise in several ways. Another transformation might eliminate other edges that entered *Bj*, or *Bi*and *Bj*might be the result of folding a redundant branch (described previously). In either case, the two blocks can be combined into a single block. This eliminates the jump at the end of *Bi*.
**4.** *Hoist a Branch* If *Clean* finds a block *Bi*that ends with a jump to an empty block *Bj*and *Bj*ends with a branch, *Clean* can replace the block-ending jump in *Bi*with a copy of the branch from *Bj*. In effect, this hoists the branch into *Bi*, as shown in the margin. This situation arises when other passes eliminate the operations in *Bj*, leaving a jump to a branch. The transformed code achieves the same effect with just a branch. This adds an edge to the cfg. Notice that *Bi*cannot be empty, or else empty block removal would have eliminated it. Similarly, *Bi*cannot be *Bj*’s sole predecessor, or else *Clean* would have combined the two blocks. (After hoisting, *Bj*still has at least one predecessor.)
*Bi* ⇒

*B B* *j j* Remove an Empty Block

*Bi* ⇒ *Bi* *Bj* *Bj* Combine Blocks

*BiBi* ⇒

*BjBj*

Hoist a Branch

##### 548 CHAPTER 10 Scalar Optimizations

Some bookkeeping is required to implement these transformations. Some of the modifications are trivial. To fold a redundant branch in a program represented with iloc and a graphical cfg, *Clean* simply overwrites the block-ending branch with a jump and adjusts the successor and predeces- sor lists of the blocks. Others are more difficult. Merging two blocks may involve allocating space for the merged block, copying the operations into the new block, adjusting the predecessor and successor lists of the new block and its neighbors in the cfg, and discarding the two original blocks.

*Clean* applies these four transformations in a systematic fashion. It traverses Many compilers and assemblers have included an the graph in postorder, so that*Bi*’s successors are simplified before*Bi*, unless ad hoc pass that eliminates a jump to a jump or a the successor lies along a back edge with respect to the postorder number- jump to a branch. *Clean*achieves the same ing. In that case, *Clean* will visit the predecessor before the successor. This effect in a systematic way. is unavoidable in a cyclic graph. Simplifying successors before predeces- sors reduces the number of times that the implementation must move some edges.

In some situations, more than one of the transformations may apply. Careful analysis of the various cases leads to the order shown in Figure 10.2, which corresponds to the order in which they are presented in this section. The algorithm uses a series of *if* statements rather than an *if-then-else* to let it apply multiple transformations in a single visit to a block.

*Clean()* *while the CFG keeps changing* *compute postorder* *OnePass()*

*OnePass()* *for each block i, in postorder* *if i ends in a conditional branch then*

|if i ends|in a conditional||branch then|||||
|---|---|---|---|---|---|---|---|
|if|both targets replace|are identical the branch|then with a jump|||/* case|1 */|
|if i ends|in a jump|to j then||||||
|if|i is empty replace|then transfers|to i with|transfers|to j|/* case|2 */|
|if|j has only combine|one predecessor i and j|then|||/* case|3 */|
|if|j is empty overwrite|and ends i’s jump|in a conditional with a copy|branch of j’s|then branch|/* case|4 */|

n **FIGURE 10.2** The Algorithm for *Clean*.

*Eliminating Useless and Unreachable Code*

**10.2**
**549**

If the cfg contains back edges, then a pass of *Clean* may create addi- tional opportunities—namely, unprocessed successors along the back edges. These, in turn, may create other opportunities. For this reason, *Clean* repeats the transformation sequence iteratively until the cfg stops changing. It must compute a new postorder numbering between calls to *OnePass* because each pass changes the underlying graph. Figure 10.2 shows pseudo-code for *Clean*.

*Clean* cannot, by itself, eliminate an empty loop. Consider the cfg shown in the margin. Assume that block *B*2is empty. None of *Clean*’s transformations can eliminate *B₂* because the branch that ends *B₂* is not redundant. *B₂* does not end with a jump, so *Clean* cannot combine it with *B*3. Its predecessor ends with a branch rather than a jump, so *Clean* can neither combine *B*2with *B₁* nor fold its branch into *B₁*.

However, cooperation between *Clean* and *Dead* can eliminate the empty loop. *Dead* used control dependence to mark useful branches. If *B*1and *B*3 contain useful operations, but *B*2does not, then the *Mark* pass in *Dead* will decide that the branch ending *B₂* is not useful because *B₂* 2*=* rdf(*B₃*). Because the branch is useless, the code that computes the branch condition is also useless. Thus, *Dead* eliminates all of the operations in *B₂* and converts the branch that ends it into a jump to its closest useful postdominator, *B*3. This eliminates the original loop and produces the cfg labelled “After Dead” in the margin.

In this form, *Clean* folds *B*2into *B*1, to produce the cfg labelled “Remove *B*2” in the margin. This action also makes the branch at the end of *B*1redun- dant. *Clean* rewrites it with a jump, producing the cfg labelled “Fold the Branch” in the margin. At this point, if*B*1is*B*3’s sole remaining predecessor, *Clean* coalesces the two blocks into a single block.

This cooperation is simpler and more effective than adding a transformation to *Clean* that handles empty loops. Such a transformation might recognize

|a branch from B|to itself and, for an empty B||, rewrite it with a jump to|||
|---|---|---|---|---|---|
|the branch’s other target. The problem lies in determining when B|||||is truly|
|empty. If B|contains no operations other than the branch, then the code that|||||

a branch from *Bi*to itself and, for an empty *Bi*, rewrite it with a jump to *i* *i* computes the branch condition must lie outside the loop. Thus, the trans- formation is safe only if the self-loop never executes. Reasoning about the number of executions of the self-loop requires knowledge about the run- time value of the comparison, a task that is, in general, beyond a compiler’s ability. If the block contains operations, but only operations that control the branch, then the transformation would need to recognize the situation with pattern matching. In either case, this new transformation would be more

? *B*1

? ? *B₂*

^ ? *B₃* ? Original CFG

? *B*1

? *B*2

^ ? *B₃* ? After Dead

? *B*1

^ ? *B*3 ? Remove *B*2

? *B*1

? *B₃* ? Fold the Branch

##### 550 CHAPTER 10 Scalar Optimizations

complex than the four included in *Clean*. Relying on the combination of *Dead* and *Clean* achieves the appropriate result in a simpler, more modular fashion.

10.2.3 **Eliminating Unreachable Code** Sometimes the cfg contains code that is unreachable. The compiler should find unreachable blocks and remove them. A block can be unreachable for two distinct reasons: there may be no path through the cfg that leads to the block, or the paths that reach the block may not be executable—for example, guarded by a condition that always evaluates to false. The former case is easy to handle. The compiler can perform a simple mark-
If the source language allows arithmetic on code sweep-style reachability analysis on the cfg. First, it initializes a mark on pointers or labels, the compiler must preserve all each block to the value “unreachable.” Next, it starts with the entry and blocks. Otherwise, it can limit the preserved set marks each cfg node that it can reach as “reachable.” If all branches and to blocks whose labels are referenced. jumps are unambiguous, then all unmarked blocks can be deleted. With ambiguous branches or jumps, the compiler must preserve any block that the branch or jump can reach. This analysis is simple and inexpensive. It can be done during traversals of the cfg for other purposes or during cfg construction itself.

Handling the second case is harder. It requires the compiler to reason about the values of expressions that control branches. Section 10.7.1 presents an algorithm that finds some blocks that are unreachable because the paths leading to them are not executable.

##### SECTION REVIEW

Code transformations often create useless or unreachable code. To determine precisely which operations are dead, however, requires global analysis. Many transformations simply leave the dead operations in the IR form of the code and rely on separate, specialized transformations, such as *Dead* and *Clean*, to remove them. Thus, most optimizing compilers include a set of transformations to excise dead code. Often, these passes run several times during the transformation sequence.

The three transformations presented in this chapter perform a thorough job of eliminating useless and unreachable code. The underlying analysis, however, can limit the ability of these transformations to prove that code is dead. The use of pointer-based values can prevent the compiler from determining that a value is unused. Conditional branches can occur in places where the compiler cannot detect the fact that they always take the same path; Section 10.8 presents an algorithm that partially addresses this problem.

**10.3** *Code Motion* **551**
##### Review Questions

**1.** Experienced programmers often question the need for useless code elimination. They seem certain that they do not write code that is
##### Hint: Write down the code to access A[i,j]

useless or unreachable. What transformations from Chapter 8 might where A is dimensioned A[1:N,1:M]. create useless code?

**2.** How might the compiler, or the linker, detect and eliminate unreach- able procedures? What benefits might accrue from using your technique?
10.3 **CODE MOTION** Moving a computation to a point where it executes less frequently than it executed in its original position should reduce the total operation count of the running program. The first transformation presented in this section, *lazy* *code motion*, uses code motion to speed up execution. Because loops tend to execute many more times than the code that surrounds them, much of the work in this area has focused on moving loop-invariant expressions out of loops. Lazy code motion performs loop-invariant code motion. It extends the notions originally formulated in the available expressions data-flow problem to include operations that are redundant along some, but not all, paths. It inserts code to make them redundant on all paths and removes the newly redundant expression. Some compilers, however, optimize for other criteria. If the compiler is con- cerned about the size of the executable code, it can perform code motion to reduce the number of copies of a specific operation. The second trans- formation presented in this section, *hoisting*, uses code motion to reduce duplication of instructions. It discovers cases in which inserting an opera- tion makes several copies of the same operation redundant without changing the values computed by the program.
10.3.1 **Lazy Code Motion** Lazy code motion (lcm) uses data-flow analysis to discover both operations that are candidates for code motion and locations where it can place those operations. The algorithm operates on the ir form of the program and its cfg, rather than on ssa form. The algorithm use three different sets of data- flow equations and derives additional sets from those results. It produces, for each edge in the cfg, a set of expressions that should be evaluated along that edge and, for each node in the cfg, a set of expressions whose upward- exposed evaluations should be removed from the corresponding block. A simple rewriting strategy interprets these sets and modifies the code.

##### 552 CHAPTER 10 Scalar Optimizations

b ← b+1 b ← b+1 a ← b × c a ← b × c a ← b × c

⇒ a ← b × c a ← b × c

(a) Partially Redundant (b) Redundant
b ← b+1

|b ← b+1||||a ← b × c|
|---|---|---|---|---|
|a ← b × c||⇒||a ← b × c|

b ← b+1 a ← b × c

(c) Partially Redundant (d) Redundant
n **FIGURE 10.3** Converting Partial Redundancies into Redundancies.

**Redundant** lcm combines code motion with elimination of both redundant and partially An expression*e*is*redundant*at*p*if it has already redundant computations. Redundancy was introduced in the context of local been evaluated on every path that leads to*p*. and superlocal value numbering in Section 8.4.1. A computation is *partially* **Partially redundant** *redundant* at point *p* if it occurs on some, but not all, paths that reach *p* and An expression*e*is*partially redundant*at*p*if it none of its constituent operands changes between those evaluations and *p*. occurs on some, but not all, paths that reach*p*.

Figure 10.3 shows two ways that an expression can be partially redundant.

In Figure 10.3a, a b × c occurs on one path leading to the merge point but not on the other. To make the second computation redundant, lcm inserts an evaluation of a b × c on the other path as shown in Figure 10.3b. In Figure 10.3c, a b × c is redundant along the loop’s back edge but not along the edge entering the loop. Inserting an evaluation of a b × c before the loop makes the occurrence inside the loop redundant, as shown in Figure 10.3d. By making the loop-invariant computation redundant and eliminating it, lcm moves it out of the loop, an optimization called *loop-* *invariant code motion* when performed by itself.

The fundamental ideas that underlie lcm were introduced in Section 9.2.4. lcm computes both available expressions and anticipable expressions. Next, lcm uses the results of these analyses to annotate each cfg edge h*i*, *j*i with a set Earliest(*i*, *j*) that contains the expressions for which this edge is the *ear-* In this context, *earliest*means the position in the *liest legal placement*. lcm then solves a third data-flow problem to find *later* CFG closest to the entry node.*placements*, that is, situations where evaluating an expression after its ear- liest placement has the same effect. Later placements are desirable because they can shorten the lifetimes of values defined by the inserted evaluations. Finally, lcm computes its final products, two sets Insert and Delete, that guide its code-rewriting step.

**10.3** *Code Motion* **553**
##### Code Shape

lcm relies on several implicit assumptions about the shape of the code. Textually identical expressions always define the same name. Thus, each instance of ri + rjalways targets the same rk. Thus, the algorithm can use rk as a proxy for ri + rj. This naming scheme simplifies the rewriting step; Notice that these rules are consistent with the the optimizer can simply replace a redundant evaluation of ri + rjwith a register-naming rules described in Section 5.4.2. copy from rk, rather create a new temporary name and insert copies into that name after each prior evaluation.

lcm moves expression evaluations, not assignments. The naming discipline requires a second rule for program variables because they receive the values of different expressions. Thus, program variables are set by register-to- register copy operations. A simple way to divide the name space between variables and expressions is to require that variables have lower subscripts than any expression, and that in any operation other than a copy, the defined register’s subscript must be larger than the subscripts of the operation’s argu- ments. Thus, in ri + rj) rk, i *<* k and j *<* k. The example in Figure 10.4 has this property.

These naming rules allow the compiler to easily separate variables from expressions, shrinking the domain of the sets manipulated in the data-flow equations. In Figure 10.4, the variables are r₂, r₄, and r₈, each of which is defined by a copy operation. All the other names, r₁, r₃, r₅, r₆, r₇, r₂₀,

)

|B1: loadI|1|r1|||
|---|---|---|---|---|
|i2i|r1|r2|r 1 ,r 3 ,r 5|,r 6,|
|loadAI|r0, @m|r3|r 7 ,r 20 ,r|21|
|i2i|r3|r4|||
|cmp LT|r2, r4|r5|||
|cbr|r5|B3, B3|||
|B2: mult|r17, r18|r20|||
|add|r19, r20|r21|B1||
|i2i|r21|r8|||
|addI|r2, 1|r6|B2||
|i2i|r6|r2|||
|cmp GT|r2, r4|r7|||
|cbr B3: ... n FIGURE 10.4|r7|B3, B2|B3||

) ) ) )

(b) Set of Expressions
!

) ) ) ) ) ) !

(a) A Simple Loop (c) Its CFG
##### Example for Lazy Code Motion.

##### 554 CHAPTER 10 Scalar Optimizations

and r₂₁, represent expressions. The following table shows the local infor- mation for the blocks in the example:

***B*** **1*B*2*B*3** DEEXPR fr1,r3,r5g fr7,r20,r21g; UEEXPR fr1,r3g fr6,r20,r21g; EXPRKILL fr5,r6,r7g fr5,r6,r7g;

DEExpr(*b*) is the set of downward-exposed expressions in block *b*, UEExpr(*b*) is the set of upward-exposed expressions in *b*, and ExprKill(*b*) is the set of expressions killed by some operation in *b*. We will assume, for simplicity, that the sets for *B*3are all empty.

##### Available Expressions

The first step in lcm computes available expressions, in a manner similar to that defined in Section 9.2.4. lcm needs availability at the end of the block, so it computes AvailOut rather than AvailIn. An expression *e* is available on exit from block *b* if, along every path from *n*0to *b*, *e* has been evaluated and none of its arguments has been subsequently defined.

##### lcm computes AvailOut as follows:

AvailOut(*n*0) D;

AvailOut(*n*) Df *all expressions* g, 8*n* 6D *n*0

and then iteratively evaluates the following equation until it reaches a fixed point: \ AvailOut*.n/* D*.*DEExpr*.m/* [*.*AvailOut*.m/* \ ExprKill*.m///* *m*2*preds.n/*

For the example in Figure 10.4, this process produces the following sets:

***B*** **1*B*2*B*3** AVAILOUT fr1,r3,r5g fr1,r3,r7,r20,r21g

lcm uses the AvailOut sets to help determine possible placements for an expression in the cfg. If an expression *e*2 AvailOut(*b*), the compiler could place an evaluation of *e* at the end of block *b* and obtain the result pro- duced by its most recent evaluation on any control-flow path from *n* to *b*.

**10.3** *Code Motion* **555**
If *e* 2*=* AvailOut(*b*), then one of *e*’s constituent subexpressions has been modified since *e*’s most recent evaluation and an evaluation at the end of block *b* would possibly produce a different value. In this light, AvailOut() sets tell the compiler how far forward in the cfg it can move the evaluation of *e*, ignoring any uses of *e*.

##### Anticipable Expressions

To capture information for backward motion of expressions, lcm computes anticipability. Recall, from Section 9.2.4, that an expression is anticipable at point *p* if and only if it is computed on every path that leaves *p* and pro- duces the same value at each of those computations. Because lcm needs information about the anticipable expressions at both the start and the end of each block, we have refactored the equation to introduce a set AntIn(*n*) which holds the set of anticipable expressions for the entrance of the block corresponding to node *n* in the cfg. lcm initializes the AntOut sets as follows:

AntOut(*nf*) D; AntOut(*n*) Df *all expressions* g, 8*n* 6D *nf*

Next, it iteratively computes AntIn and AntOut sets for each block until the process reaches a fixed point.

##### AntIn.m/ D UEExpr.m/[.AntOut.m/ \ ExprKill.m//

\ AntOut*.n/* D AntIn*.m/*, *n* 6D *n f* *m* 2*succ.n/*

For the example, this process produces the following sets:

***B*** **1*B*2*B*3** ANTIN fr1,r3g fr20,r21g; ANTOUT;;;

AntOut provides information about the safety of hoisting an evaluation to either the start or the end of the current block. If *x*2 AntOut(*b*), then the compiler can place an evaluation of *x* at the end of *b*, with two guarantees. First, the evaluation at the end of *b* will produce the same value as the next evaluation of *x* along any execution path in the procedure. Second, along any execution path leading out of*b*, the program will evaluate*x*before redefining any of its arguments.

##### 556 CHAPTER 10 Scalar Optimizations

##### Earliest Placement

Given solutions to availability and anticipability, the compiler can deter- mine, for each expression, the earliest point in the program at which it can evaluate the expression. To simplify the equations, lcm assumes that it will place the evaluation on a cfg edge rather than at the start or end of a specific block. Computing an edge placement lets the compiler defer the decision to place the evaluation at the end of the edge’s source, at the start of its sink, or in a new block in the middle of the edge. (See the discussion of critical edges in Section 9.3.5.)

For a cfg edge h*i*, *j*i, an expression *e* is in Earliest(*i*, *j*) if and only if the compiler can legally move *e* to h*i*, *j*i, and cannot move it to any earlier edge in the cfg. The Earliest equation encodes this condition as the intersection of three terms:

Earliest(*i*, *j*) D AntIn(*j*) \ AvailOut*.i/* \ (ExprKill(*i*) [ AntOut*.i/*)

These terms define an earliest placement for *e* as follows:

**1.** *e*2 AntIn(*j*) means that the compiler can safely move *e* to the head of *j*. The anticipability equations ensure that *e* will produce the same value as its next evaluation on any path leaving *j* and that each of those paths evaluates *e*.
**2.** *e* 2*=* AvailOut(*i*) shows that no prior computation of *e* is available on exit from *i*. Were *e*2 AvailOut(*i*), inserting *e* on h*i*, *j*i would be redundant.
**3.** The third condition encodes two cases. If *e* 2 ExprKill(*i*), the compiler cannot move *e* through block *i* because of a definition in *i*. If *e* 2*=* AntOut(*i*), the compiler cannot move *e* into *i* because *e* 2*=* AntIn(*k*) for some edge h*i*,*k*i. If either is true, then *e* can move no further than h*i*, *j*i. The cfg’s entry node,*n*0presents a special case. lcm cannot move an expres- sion earlier than *n*0, so it can ignore the third term in the equation for Earliest(*n*0,*k*), for any *k*. The Earliest sets for the continuing example are as follows:
h***B*1,*B*2**i h***B*1,*B*3**i h***B*2,*B*2**i h***B*2,*B*3**i

EARLIEST fr<u>20</u>,r<u>21</u>g;;;

##### Later Placement

The final data-flow problem in lcm determines when an earliest placement can be deferred to a later point in the cfg while achieving the same effect.

**10.3** *Code Motion* **557**
Later analysis is formulated as a forward data-flow problem on the cfg with a set LaterIn(*n*) associated with each node and another set Later(*i*, *j*) associated with each edge h*i*, *j*i. lcm initializes the LaterIn sets as follows:

LaterIn(*n*0) D;

LaterIn(*n*) Df *all expressions* g, 8 *n* 6D*n*0

Next, it iteratively computes LaterIn and Later sets for each block. The computation halts when it reaches a fixed point.

\ LaterIn*. j/* D Later*.i*, *j/*, *j* 6D *n*0 *i*2*pred. j/*

Later*.i*, *j/* D Earliest*.i*, *j/* [*.*LaterIn*.i/* \ UEExpr*.i//*, *i* 2 *pred. j/*

As with availability and anticipability, these equations have a unique fixed point solution.

An expression *e*2 LaterIn(*k*) if and only if every path that reaches *k* includes an edge h*p*,*q*i such that *e*2 Earliest(*p*,*q*), and the path from *q* to *k* neither redefines *e*’s operands nor contains an evaluation of *e* that an earlier placement of *e* would anticipate. The Earliest term in the equa- tion for Later ensures that Later(*i*, *j*) includes Earliest(*i*, *j*). The rest of that equation puts *e* into Later(*i*, *j*) if *e* can be moved forward from *i* (*e*2 LaterIn(*i*)) and a placement at the entry to *i* does not anticipate a use in *i* (*e* 2*=* UEExpr(*i*)).

Given Later and LaterIn sets,*e*2 LaterIn(*i*) implies that the compiler can move the evaluation of *e* forward through *i* without losing any benefit—that is, there is no evaluation of *e* in *i* that an earlier evaluation would anticipate, and *e*2 Later(*i*, *j*) implies that the compiler can move an evaluation of *e* in *i* into *j*.

For the ongoing example, these equations produce the following sets:

***B*** **1*B*2*B*3**h***B*1,*B*2**i h***B*1,*B*3**i h***B*2,*B*2**i h***B*2,*B*3**i LATERIN;;; LATER fr<u>20</u>,r<u>21</u>g;;;

##### Rewriting the Code

The final step in performing lcm is to rewrite the code so that it cap- italizes on the knowledge derived from the data-flow computations. To drive the rewriting process, lcm computes two additional sets, Insert and Delete.

##### 558 CHAPTER 10 Scalar Optimizations

The Insert set specifies, for each edge, the computations that lcm should insert on that edge.

##### Insert.i, j/ D Later.i, j/ \ LaterIn. j/

If *i* has only one successor, lcm can insert the computations at the end of *i*. If *j* has only one predecessor, it can insert the computations at the entry of *j*. If neither condition applies, the edge h*i*, *j*i is a critical edge and the com- piler should split it by inserting a block in the middle of the edge to evaluate the expressions in Insert(*i*, *j*).

The Delete set specifies, for a block, which computations lcm should delete from the block.

##### Delete.i/ D UEExpr.i/ \ LaterIn.i/, i 6D n0

Delete(*n*0) is empty, of course, since no block precedes *n*0. If *e*2 Delete(*i*), then the first computation of *e* in *i* is redundant after all the insertions have been made. Any subsequent evaluation of *e* in *i* that has upward-exposed uses—that is, the operands are not defined between the start of *i* and the evaluation—can also be deleted. Because all evaluations of *e* define the same name, the compiler need not rewrite subsequent refer- ences to the deleted evaluation. Those references will simply refer to earlier evaluations of *e* that lcm has proven to produce the same result.

For our example, the Insert and Delete sets are simple.

h***B*1,*B*2**i h***B*1,*B*3**i h***B*2,*B*2**i h***B*2,*B*3**i ***B*1*B*2*B*3**

INSERT fr<u>20</u>, r<u>21</u>g;;; DELETE; fr<u>20</u>, r<u>21</u>g;

The compiler interprets the Insert and Delete sets and rewrites the code as shown in Figure 10.5. lcm deletes the expressions that define r₂₀ and r₂₁ from *B*2and inserts them on the edge from *B*1to *B*2.

Since*B*1has two successors and*B*2has two predecessors, h*B*1,*B*2i is a critical edge. Thus, lcm splits the edge, creating a new block *B*2*a*to hold the inserted computations of r₂₀ and r₂₁. Splitting h*B*1,*B*2i adds an extra jump to the code. Subsequent work in code generation will almost certainly implement the jump in *B*2*a*as a fall through, eliminating any cost associated with it.

**Coalescing** Notice that lcm leaves the copy defining r₈ in *B*2. lcm moves expressions, A pass that determines when a register to not assignments. (Recall that r₈ is a variable, not an expression.) If the copy register copy can be safely eliminated and the is unnecessary, subsequent copy coalescing, either in the register allocator source and destination names combined. or as a standalone pass, should discover that fact and eliminate the copy operation.

**10.3** *Code Motion* **559**
) r

|B1: loadI|1|1||
|---|---|---|---|
|loadAI r0, @m||2||
|cmp LT|r1, r2|3||
|cbr|r3|2a, B3||
||||B1|
|B2a: mult|r17, r18 ) r20|||
|add|r19, r20 ) r21|||
|jump||2|B2a|
|B2: i2i|r21|8||
|addI|r1, 1|4|B2|
|i2i|r4|1||
|cbr cmp GT B3: :::|rr1, r2 r5|5 3,B2|B3|

) r ) r ! B

! B ) r ) r ) r ) r ! B

(a) The Transformed Code (b) Its CFG
n **FIGURE 10.5** Example after Lazy Code Motion.

10.3.2 **Code Hoisting** Code motion techniques can also be used to reduce the size of the com- piled code. A transformation called *code hoisting* provides one direct way of accomplishing this goal. It uses the results of anticipability analysis in a particularly simple way. If an expression *e*2 AntOut(b), for some block *b*, that means that *e* is eval- uated along every path that leaves *b* and that evaluating *e* at the end of *b* would make the first evaluation along each path redundant. (The equations for AntOut ensure that none of *e*’s operands is redefined between the end of *b* and the next evaluation of *e* along each path leaving *b*.) To reduce code size, the compiler can insert an evaluation of *e* at the end of *b* and replace the first occurrence of *e* on each path leaving *b* with a reference to the previ- ously computed value. The effect of this transformation is to replace multiple copies of the evaluation of *e* with a single copy, reducing the overall number of operations in the compiled code. To replace those expressions directly, the compiler would need to locate them. It could insert*e*, then solve another data-flow problem, proving that the path from *b* to some evaluation of *e* is clear of definitions for *e*’s operands. Alternatively, it could traverse each of the paths leaving *b* to find the first block where *e* is defined—by looking in the block’s UEExpr set. Each of these approaches seems complicated. A simpler approach has the compiler visit each block *b* and insert an evalua- tion of *e* at the end of *b*, for every expression *e*2 AntOut(*b*). If the compiler

##### 560 CHAPTER 10 Scalar Optimizations

uses a uniform discipline for naming, as suggested in the discussion of lcm, then each evaluation will define the appropriate name. Subsequent appli- cation of lcm or superlocal value numbering will then remove the newly redundant expressions.

##### SECTION REVIEW

Compilers perform code motion for two primary reasons. Moving an operation to a point where it executes fewer times than it would in its original position should reduce execution time. Moving an operation to a point where one instance can cover multiple paths in the CFG should reduce code size. This section presented an example of each.

LCM is a classic example of a data-flow driven global optimization. It identifies redundant and partially redundant expressions, computes the best place for those expressions, and moves them. By definition, a loop-invariant expression is either redundant or partially redundant; LCM moves a large class of loop invariant expressions out of loops. Hoisting takes a much simpler approach; it finds operations that are redundant on every path leaving some point p and replaces all the redundant occurrences with a single instance at p. Thus, hoisting is usually performed to reduce code size.

##### Review Questions

**1.** Hoisting discovers the situation when some expression *e* exists along
The common implementation of sinking is called each path that leaves point *p* and each of those occurrences can *cross jumping*. be replaced safely with an evaluation of *e* at *p*. Formulate the sym- metric and equivalent optimization, *code sinking*, that discovers when multiple expression evaluations can safely be moved forward in the code—from points that precede *p* to *p*.

**2.** Consider what would happen if you apply your code-sinking transfor- mation during the linker, when all the code for the entire application is present. What effect might it have on procedure linkage code?
10.4 **SPECIALIZATION** In most compilers, the shape of the ir program is determined by the front end, before any detailed analysis of the code. Of necessity, this produces general code that works in any context that the running program might encounter. With analysis, however, the compiler can often learn enough to narrow the contexts in which the code must operate. This creates the oppor- tunity for the compiler to specialize the sequence of operations in ways that capitalize on its knowledge of the context in which the code will execute.

**10.4** *Specialization* **561**
Major techniques that perform specialization appear in other sections of this book. Constant propagation, described in Sections 9.3.6 and 10.8, ana- lyzes a procedure to discover values that always have the same value; it then folds those values directly into the computation. Interprocedural constant propagation, introduced in Section 9.4.2, applies the same ideas at the whole-program scope. Operator strength reduction, presented in Section 10.4, replaces inductive sequences of expensive computations with equivalent sequences of faster operations. Peephole optimization, covered in Section 11.5, uses pattern matching over short instruction sequences to find local improvement. Value numbering, explained in Section 8.4.1 and 8.5.1, systematically simplifies the ir form of the code by applying algebraic iden- tities and local constant folding. Each of these techniques implements a form of specialization.

Optimizing compilers rely on these general techniques to improve code. In addition, most optimizing compilers contain specialization techniques that specifically target properties of the source languages or applications that the compiler writer expects to encounter. The rest of this section presents three such techniques that target specific inefficiencies at procedure calls: tail-call optimization, leaf-call optimization, and parameter promotion.

10.4.1 **Tail-Call Optimization** When the last action that a procedure takes is a call, we refer to that call as a tail call. The compiler can specialize tail calls to their contexts in ways that eliminate much of the overhead from the procedure linkage. To understand how the opportunity for improvement arises, consider what happens when *o* calls *p* and *p* calls *q*. When *q* returns, it executes its epilogue sequence and jumps back to *p*’s postreturn sequence. Execution continues in *p* until *p* returns, at which point *p* executes its epilogue sequence and jumps to *o*’s postreturn sequence. If the call from*p*to*q*is a tail call, then no useful computation occurs between the postreturn sequence and the epilogue sequence in *p*. Thus, any code that preserves and restores *p*’s state, beyond what is needed for the return from *p* to *o*, is useless. A standard linkage, as described in Section 6.5, spends much of its effort to preserve state that is useless in the context of a tail call. At the call from *p* to *q*, the minimal precall sequence must evaluate the actual parameters at the call from *p* to *q* and adjust the access links or the display if necessary. It need not preserve any caller-saves registers, because they cannot be live. It need not allocate a new ar, because *q* can use *p*’s ar. It must leave intact the context created for a return to *o*, namely the return address and caller’s arp that *o* passed to *p* and any callee-saves registers that

##### 562 CHAPTER 10 Scalar Optimizations

*p* preserved by writing them into the ar. (That context will cause the epi- logue code for *q* to return control directly to *o*.) Finally, the precall sequence must jump to a tailored prologue sequence for *q*.

In this scheme, *q* must execute a custom prologue sequence to match the minimal precall sequence in *p*. It only saves those parts of *p*’s state that allow a return to *o*. The precall sequence does not preserve callee-saves registers, for two reasons. First, the values from *p* in those registers are no longer live. Second, the values that *p* left in the ar’s register-save area are needed for the return to *o*. Thus, the prologue sequence in *q* should initialize local variables and values that *q* needs; it should then branch into the code for *q*.

With these changes to the precall sequence in *p* and the prologue sequence in *q*, the tail call avoids preserving and restoring *p*’s state and eliminates much of the overhead of the call. Of course, once the precall sequence in *p* has been tailored in this way, the postreturn and epilogue sequences are unreachable. Standard techniques such as *Dead* and *Clean* will not discover that fact, because they assume that the interprocedural jumps to their labels are executable. As the optimizer tailors the call, it can eliminate these dead sequences.

With a little care, the optimizer can arrange for the operations in the tailored prologue for *q* to appear as the last operations in its more general prologue. In this scheme, the tail call from *p* to *q* simply jumps to a point farther into the prologue sequence than would a normal call from some other routine.

If the tail call is a self-recursive call—that is, *p* and *q* are the same procedure—then tail-call optimization can produce particularly efficient code. In a tail recursion, the entire precall sequence devolves to argument evaluation and a branch back to the top of the routine. An eventual return out of the recursion requires one branch, rather than one branch per recursive invocation. The resulting code rivals a traditional loop for efficiency.

10.4.2 **Leaf-Call Optimization** Some of the overhead involved in a procedure call arises from the need to prepare for calls that the callee might make. A procedure that makes no calls, called a leaf procedure, creates opportunities for specialization. The compiler can easily recognize the opportunity; the procedure calls no other procedures.
The other reason to store the return address is to allow a debugger or a performance monitor to During translation of a leaf procedure, the compiler can avoid inserting oper- unwind the call stack. When such tools are in use, ations whose sole purpose is to set up for subsequent calls. For example, the compiler should leave the save operation the procedure prologue code may save the return address from a register intact. into a slot in the ar. That action is unnecessary unless the procedure itself makes another call. If the register that holds the return address is needed

**10.4** *Specialization* **563**
for some other purpose, the register allocator can spill the value. Similarly, if the implementation uses a display to provide addressability for nonlocal variables, as described in Section 6.4.3, it can avoid the display update in the prologue sequence.

The register allocator should try to use caller-saves registers before callee- saves registers in a leaf procedure. To the extent that it can leave callee-saves registers untouched, it can avoid the save and restore code for them in the prologue and epilogue. In small leaf procedures, the compiler may be able to avoid all use of callee-saves registers. If the compiler has access to both the caller and the callee, it can do better; for leaf procedures that need fewer registers than the caller-save set includes, it can avoid some of the register saves and restores in the caller as well.

In addition, the compiler can avoid the runtime overhead of activation-record allocation for leaf procedures. In an implementation that heap allocates ars, that cost can be significant. In an application with a single thread of control, the compiler can allocate statically the ar of any leaf procedure. A more aggressive compiler might allocate one static ar that is large enough to work for any leaf procedure and have all the leaf procedures share that ar.

If the compiler has access to both the leaf procedure and its callers, it can allocate space for the leaf procedure’s ar in each of its callers’ ars. This scheme amortizes the cost of ar allocation over at least two calls—the invo- cation of the caller and the call to the leaf procedure. If the caller invokes the leaf procedure multiple times, the savings are multiplied.

10.4.3 **Parameter Promotion** Ambiguous memory references prevent the compiler from keeping values in registers. Sometimes, the compiler can prove that an ambiguous value has just one corresponding memory location through detailed analysis of pointer values or array subscript values, or special case analysis. In these cases, it can rewrite the code to move that value into a scalar local variable, where the register allocator can keep it in a register. This kind of transformation is often called *promotion*. The analysis to promote array references or pointer-**Promotion** based references is beyond the scope of this book. However, a simpler case A category of transformations that move an can illustrate these transformations equally well. ambiguous value into a local scalar name to
##### expose it to register allocation

Consider the code generated for an ambiguous call-by-reference parame- ter. Such parameters can arise in many ways. The code might pass the same actual parameter in two distinct parameter slots, or it might pass a global variable as an actual parameter. Unless the compiler performs interprocedural analysis to rule out those possibilities, it must treat all reference parameters as potentially ambiguous. Thus, every use of the parameter requires a load and every definition requires a store.

##### 564 CHAPTER 10 Scalar Optimizations

If the compiler can prove that the actual parameter must be unambiguous in the callee, it can promote the parameter’s value into a local scalar value, which allows the callee to keep it in a register. If the actual parameter is not modified by the callee, the promoted parameter can be passed by value. If the callee modifies the actual parameter and the result is live in the caller, then the compiler must use value-result semantics to pass the promoted parameter (see Section 6.4.1).

To apply this transformation to a procedure *p*, the optimizer must identify all of the call sites that can invoke *p*. It can either prove that the transformation applies at all of those call sites or it can clone *p* to create a copy that han- dles the promoted values (see Section 10.6.2). Parameter promotion is most attractive in a language that uses call-by-reference binding.

##### SECTION REVIEW

##### Specialization includes many effective techniques to tailor general-

purpose computations to their detailed contexts. Other chapters and sections present powerful global and regional specialization techniques, such as constant propagation, peephole optimization, and operator strength reduction.

This section focused on optimizations that the compiler can apply to the code entailed in a procedure call. Tail-call optimization is a valuable tool that converts tail recursion to a form that rivals conventional iteration for efficiency; it applies to nonrecursive tail calls as well. Leaf procedures offer special opportunities for improvement because the callee can omit major portions of the standard linkage sequence. Parameter promotion is one example of a class of important transformations that remove inefficiencies related to ambiguous references.

##### Review Questions

**1.** Many compilers include a simple form of strength reduction, in which individual operations that have one constant-valued operand are replaced by more efficient, less general operations. The classic exam- ple is replacing an integer multiply of a positive number by a series of shifts and adds. How might you fold that transformation into local value numbering?
**2.** Inline substitution might be an alternative to the procedure-call opti- mizations in this section. How might you apply inline substitution in each case? How might the compiler choose the more profitable alternative?

**10.5** *Redundancy Elimination* **565**
10.5 **REDUNDANCY ELIMINATION** A computation *x* C *y* is redundant at some point *p* in the code if, along every path that reaches *p*, *x* C *y* has already been evaluated and *x* and *y* have not been modified since the evaluation. Redundant computations typically arise as artifacts of translation or optimization. We have already presented three effective techniques for redundancy elimi- nation: local value numbering (lvn) in Section 8.4.1, superlocal value num- bering (svn) in Section 8.5.1, and lazy code motion (lcm) in Section 10.3.1. These algorithms cover the span from simple and fast (lvn) to complex and comprehensive (lcm). While all three methods differ in the scope that they cover, the primary distinction between them lies in the method that they use to establish that two values are identical. The next section explores this issue in detail. The second section presents one more version of value numbering, a dominator-based technique.
10.5.1 **Value Identity versus Name Identity** lvn introduced a simple mechanism to prove that two expressions had the same value. lvn relies on two principles. It assigns each value a unique iden- tifying number—its value number. It assumes that two expressions produce the same value if they have the same operator and their operands have the same value numbers. These simple rules allow lvn to find a broad class of redundant operations—any operation that produces a pre-existing value number is redundant. With these rules, lvn can prove that *2* C *a* has the same value as *a* C *2* or as *2* C *b* when *a* and *b* have the same value number. It cannot prove that *a* C *a* and *2 a* have the same value because they have different operators. Similarly, it cannot prove the *a* C *0* and *a* have the same value. Thus, we extend lvn with algebraic identities that can handle the well-defined cases not covered by the original rule. The table in Figure 8.3 on page 424 shows the range of identities that lvn can handle. By contrast, lcm relies on names to prove that two values have the same number. If lcm sees *a* C *b* and *a* C *c*, it assumes that they have different values because *b* and *c* have different names. It has relies on a lexi- cal comparison—name identity. The underlying data-flow analyses cannot directly accommodate the notion of value identity; data-flow problems oper- ate a predefined name space and propagate facts about those names over the cfg. The kind of ad hoc comparisons used in lvn do not fit into the data-flow framework. As described in Section 10.6.4, one way to improve the effectiveness of lcm is to encode value identity into the name space of the code before

##### 566 CHAPTER 10 Scalar Optimizations

applying lcm. lcm recognizes redundancies that neither lvn nor svn can find. In particular, it finds redundancies that lie on paths through join points in the cfg, including those that flow along loop-closing branches, and it finds partial redundancies. On the other hand, both lvn and svn find value-based redundancies and simplifications that lcm cannot find. Thus, encoding value identity into the name space allows the compiler to take advantage of the strengths of both approaches.

10.5.2 **Dominator-based Value Numbering**
*B₀* Chapter 8 presented both local value numbering (lvn) and its extension ? to extended basic blocks (ebbs), called superlocal value numbering (svn). *B₁* While svn discovers more redundancies than lvn, it still misses some @R opportunities because it is limited to ebbs. Recall that the svn algorithm *B*2*B*3 propagates information along each path through an ebb. For example, in the @R *B₄* cfg fragment shown in the margin, svn will process the paths (*B*0,*B*1,*B*2) ? and (*B₀*,*B₁*,*B₃*). Thus, it optimizes both *B₂* and *B₃* in the context of the pre- fix path (*B*0,*B*1). Because *B*4forms its own degenerate ebb, svn optimizes *B*4without prior context.

From an algorithmic point of view, svn begins each block with a table that includes the results of all predecessors on its ebb path. Block *B*4has no pre- decessors, so it begins with no prior context. To improve on that situation,

|we must answer the question: on what state could B|||||rely? B|cannot rely||
|---|---|---|---|---|---|---|---|
||||||4|4||
||||2|3||||
||4|4||||0|1|
|||||4||||
|2 3|4||||0|1||
||||||1|||
||4|2|3|||||
|4|||||||1|
||4||||||1|

on values computed in either *B* or *B*, since neither lies on every path that reaches *B*. By contrast, *B* can rely on values computed in *B* and *B*, since they occur on every path that reaches *B*. Thus, we might extend value num- bering for *B* with information about computations in *B* and *B*. We must, however, account for the impact of assignments in the intervening blocks, *B* or *B*.

Consider an expression, *x* C *y*, that occurs at the end of *B* and again at the start of *B*. If neither *B* or *B* redefines *x* or *y*, then the evaluation of *x* C *y* in *B* is redundant and the optimizer can reuse the value computed in *B*. On the other hand, if either of those blocks redefines *x* or *y*, then the evaluation of *x* C *y* in *B* computes a distinct value from the evaluation in *B* and the evaluation is not redundant.

Fortunately, the ssa name space encodes precisely this distinction. In ssa, a name that is used in some block *Bi*can only enter *Bi*in one of two ways. Either the name is defined by a-function at the top of *Bi*, or it is defined in some block that dominates *Bi*. Thus, an assignment to *x* in either *B* or *B* creates a new name for *x* and forces the insertion of a-function for *x* at the head of *B*. That-function creates a new ssa name for *x* and the renaming process changes the ssa name used in the subsequent computation

**10.5** *Redundancy Elimination* **567**
of *x* C *y*. Thus, ssa form encodes the presence or absence of an intervening assignment in *B*2or *B*3directly into the names used in the expression. Our algorithm can rely on ssa names to avoid this problem.

The other major question that we must answer before we can extend svn to larger regions is, given a block such as *B*4, how do we locate the most recent predecessor with information that the algorithm can use? Dominance infor- mation, discussed at length in Sections 9.2.1 and 9.3.2, captures precisely this effect. Dom(*B*4

|) DfB ,B ,B|g. B ’s immediate dominator, defined as||
|---|---|---|
|0 1|4 4||
|4 4||4 1|
||0|4|

the node in (Dom(*B*) -*B*) that is closest to *B*, is *B*, the last node that occurs on all path from the entry node *B* to *B*.

The dominator-based value numbering technique (dvnt) builds on the ideas behind svn. It uses a scoped hash table to hold value numbers. dvnt opens a new scope for each block and discards that scope when they are no longer needed. dvnt actually uses ssa names as value numbers; thus the value num- ber for an expression *aibj*is the ssa name defined in the first evaluation of *ai j k i j*

|b. (That is, if the first evaluation occurs in t||a|b, then the|
|---|---|---|---|
|i j||k i|j|
||i j k|||

value number for *a b* is *t*.)

Figure 10.6 shows the algorithm. It takes the form of a recursive procedure

that the optimizer invokes on a procedure’s entry block. It follows both the cfg for the procedure, represented by the dominator tree, and the flow of values in the ssa form. For each block *B*, dvnt takes three steps: it processes the-functions in *B*, if any exist, it value numbers the assignments, and it propagates information into *B*’s successors and recurs on *B*’s children in the dominator tree.

##### Process the-Functions in B

dvnt must assign each-function *p* a value number. If *p* is meaningless— that is, all its arguments have the same value number—dvnt sets its value number to the value number for one of its arguments and deletes *p*. If *p* is redundant—that is, it produces the same value number as another -function in *B*—dvnt assigns *p* the same value number as the-function that it duplicates. dvnt then deletes *p*.

Otherwise, the-function computes a new value. Two cases arise. The argu- ments to *p* have value numbers, but the specific combination of arguments have not been seen before in this block, or one or more of *p*’s arguments has no value number. The latter case can arise from a back edge in the cfg.

##### Process the Assignments in B

dvnt iterates over the assignments in *B* and processes them in a manner analogous to lvn and svn. One subtlety arises from the use of ssa names as Recall, from the SSA construction, that value numbers. When the algorithm encounters a statement *x y op z*, it uninitialized names are not allowed.

##### 568 CHAPTER 10 Scalar Optimizations

*procedure DVNT(B)* *allocate a new scope for B*

|allocate|a new scope|for B||||
|---|---|---|---|---|---|
|for each|-function|of the form|‘‘n|(...)’’|in B|
|if p is|meaningless|or redundant|then|||
|VN[n]|the|value number|for p|||
|remove else|p|||||
|VN[n]|n|||||
|Add|p to the|hash table||||
|for each|assignment|a of the|form ‘‘x|y op|z’’ in B|
|overwrite|y with|VN[y]||||
|overwrite|z with|VN[z]||||
|let expr|‘‘y|op z’’||||
|if expr|can be|simplified|to expr0|then||
|replace|a with|‘‘x|expr0|||
|expr|expr0|||||
|if expr|has a value|number|v in the|hash table|then|
|VN[x]|v|||||
|remove else|statement|a||||
|VN[x]|x|||||
|add|expr to|the hash table|with|value number|x|
|for each|successor|s of B||||
|adjust|the-function|inputs|in s|||
|for each DVNT(c)|child c of|B in the|dominator|tree||
|deallocate|the scope|for B||||

n **FIGURE 10.6** Dominator-based Value Numbering Technique.

can simply replace *y* with *VN[y]* because the name in *VN[y]* holds the same value as *y*.

##### Propagate Information to B’s Successors

Once dvnt has processed all the-functions and assignments in *B*, it visits each of *B*’s cfg successors *s* and updates function arguments that cor- respond to values flowing across the edge (*B*,*s*). It records the current value number for the argument in the-function by overwriting the argument’s ssa name. (Notice the similarity between this step and the corresponding step in the renaming phase of the ssa construction.) Next, the algorithm recurs on *B*’s children in the dominator tree. Finally, it deallocates the hash table scope that it used for *B*.

**10.6** *Enabling Other Transformations* **569**
This recursion scheme causes dvnt to follow a preorder walk on the dom-*B₀* inator tree, which ensures that the appropriate tables have been constructed? before it visits a block. This order can produce a counterintuitive traversal; *B₁*

for the cfg in the margin, the algorithm could visit *B₄* before either *B₂* or *B₂* @R *B₃* *B₃*. Since the only facts that the algorithm can use in *B₄* are those discovered @R processing *B*0and *B*1, the relative ordering of *B*2, *B*3, and *B*4is not only *B₄* unspecified, it is also irrelevant.?

##### SECTION REVIEW

Redundancy elimination operates on the assumption that it is faster to reuse a value than to recompute it. Building on that assumption, these methods identify as many redundant computations as possible and eliminate duplicate computation. The two primary notions of equivalence used by these transformations are value identity and name identity. These different tests for identity produce different results.

Both value numbering and LCM eliminate redundant computation. LCM eliminates redundant and partially redundant expression evaluation; it does not eliminate assignments. Value numbering does not recognize partial redundancies, but it can eliminate assignments. Some compilers use a value-based technique, such as DVNT, to discover redundancy and then encode that information into the name space for a name-based transformation such as LCM. In practice, that approach combines the strength of both ideas.

##### Review Questions

**1.** The DVNT algorithm resembles the renaming phase of the SSA con- struction algorithm. Can you reformulate the renaming phase so that it performs value numbering as it renames values? What impact would this change have on the size of the SSA form for a procedure?
**2.** The DVNT algorithm does not propagate a value along a loop-closing edge—a back edge in the call graph. LCM will propagate information along such edges. Write several examples of redundant expressions that a true “global” technique such as LCM can find that DVNT cannot.
10.6 **ENABLING OTHER TRANSFORMATIONS** Often, an optimizer includes passes whose primary purpose is to create or expose opportunities for other transformations. In some cases, a transforma- tion changes the shape of the code to make it more amenable to optimization. In other cases, the transformation creates a point in the code where spe- cific conditions hold that make another transformation safe. By directly

##### 570 CHAPTER 10 Scalar Optimizations

*B₀* ?? *B₁* @R *B*2*B*5 B @R B*B₆ B₈* B @R B*B₇* BN *B*3 ?

|, say B|||,B i and|
|---|---|---|---|
|7 7a 8 7b|||6 7a|
|7a|7b 7a|7b||
|6|8|7b||
||6 8|||

*B*4

creating the necessary code shape, these enabling transformations reduce the sensitivity of the optimizer to the shape of the input code.

Several enabling transformations are described in other parts of the book. Both loop unrolling (Section 8.5.2) and inline substitution (Section 8.7.1) obtain most of their benefits by creating context for other optimization. (In each case, the transformation does eliminate some overhead, but the larger effect comes from subsequent application of other optimizations.) The tree-height balancing algorithm (Section 8.4.2) does not eliminate any operations, but it creates a code shape that can produce better results from instruction scheduling. This section presents four enabling transformations: *superblock cloning*, *procedure cloning*, *loop unswitching*, and *renaming*.

10.6.1 **Superblock Cloning** Often, the optimizer’s ability to transform the code is limited by path- specific information in the code. Imagine using svn on the cfg shown in the margin. The fact that blocks *B₃* and *B₇* have multiple predeces- sors may limit the optimizer’s ability to improve code in those blocks. If, for example, block *B₆* assigned x the value 7 and block *B₈* assigned x the value 13, a use of x in *B₇* would appear to receive the value ?, even though the value is known and predictable along each path leading to *B₇*. In such circumstances, the compiler can clone blocks to create code that is better suited for the transformation. In this case, it might create two copies of *B* and *B*, and redirect the incoming edges as h*B*
7*b* h*B*,*B* i. With this change, the optimizer could propagate the value 7 for x into *B* and the value 13 for x into *B*.

As an additional benefit, since *B* and *B* both have unique predeces- sors, the compiler can actually merge the blocks to create a single block from *B* and *B*7*a*and another from *B* and *B*. This transformation elimi- nates the block-ending jump in *B* and *B* and, potentially, allows for further improvement in optimization and in instruction scheduling.

An issue in this kind of cloning is, when should the compiler stop cloning? One cloning technique, called *superblock cloning*, is widely used to cre- ate additional context for instruction scheduling inside loops. In superblock cloning, the optimizer starts with a loop head—the entry to a loop—and clones each path until it reaches a backward branch.

Applying this technique to the example cfg produces the modified cfg shown in the margin. *B* is the loop header. Each of the nodes in the loop body has a unique predecessor. If the compiler applies a superlocal

##### Backward branch

##### a CFG edge whose destination has a lower

##### depth-first number than its source, with respect

##### to some depth-first traversal of the CFG

**10.6** *Enabling Other Transformations* **571**
optimization (one based on extended basic blocks), every path that it finds *B₀*

will encompass a single iteration of the loop body. (To find longer paths, ??? *B*

|1||
|---|---|
|a||
|a|b|
|3b|3c|

the optimizer would need to unroll the loop so that superblock cloning @R encompassed multiple iterations.) *B₂ B₅* *B₃* @R Superblock cloning can improve the results of optimization in three principal C*B₆ B₈*6 ways. C *B* *B⁷* *B* *B⁷* C

**1.** *It creates longer blocks* Longer blocks let local optimization handle C more context. In the case of value numbering, the superlocal and CW ?
*B* + 4 dominator versions are as strong as the local version. For some techniques, however, this is not the case. For instruction scheduling, for example, superlocal and dominator versions are weaker than the local method. In that case, cloning, followed by local optimization, can produce better code.

**2.** *It eliminates branches* Combining two blocks eliminates a branch between them. Branches take time to execute. They also disrupt some of the performance-critical mechanisms in the processor, such as instruction fetching and many of the pipelined functions. The net effect of removing branches is to shorten execution time, by eliminating operations and by making hardware mechanisms for predicting behavior more effective.
**3.** *It creates points where optimization can occur* When cloning eliminates a control-flow merge point, it creates new points in the program where the compiler can derive more precise knowledge about the runtime context. The transformed code may present opportunities for specialization and redundancy elimination that exist nowhere in the original code. Of course, cloning has costs, too. It creates multiple copies of individual operations, which leads to larger code. The larger code may run more quickly because it avoids some end-of-block jumps. It may run more slowly if its size causes additional instruction cache misses. In applications where the user cares more about code space than runtime speed, superblock cloning may be counterproductive.
10.6.2 **Procedure Cloning** Inline substitution, described in Section 8.7.1 on page 458, has effects sim- ilar to superblock cloning. For a call from *p* to *q*, it creates a unique copy of *q* and merges it with the call site in *p*. The same effects that arise with superblock cloning arise with inline substitution, including specialization to a particular context, elimination of some control-flow operations, and increased code size.

Scalar Optimizations **572 CHAPTER 10**

if

||||(x > y)|then||
|---|---|---|---|---|---|
|i = 1 to|n||do i =|1 to n||
|if (x >|y)||a(i)|= b(i)|* x|
|then|a(i) = b(i)|* x||||
|else|a(i) = b(i)|* y|do i = a(i)|1 to n = b(i)|* y|

do

else

*main* =? Z Z~ *P₀ P₁ P₂* Z Z~ ?= *P₃* Original Call Graph

(a) Original Loop (b) Unswitched Version
n **FIGURE 10.7** Unswitching a Short Loop.

In some cases, the compiler can achieve some of the benefits of inline substi- tution with less code growth by cloning the procedure. The idea is analogous to the block cloning that occurs in superblock cloning. The compiler creates multiple copies of the callee and assigns some of the calls to each instance of the clone.

Careful assignment of calls to clones can create situations where every call has a similar context for optimization. Consider, for example, the simple call graph shown in the margin. Assume that *P*3is a library routine whose behavior depends strongly on one of its input parameters; for a value of one, the compiler can generate code that provides efficient memory access, while for other values, it produces much larger, slower code. Further, assume that *P*0and *P*1both pass it the value 1, while *P*2passes it the value 17.

Constant propagation across the call graph does not help here because it must compute the parameter as 1 ^ 1 ^ 17 D?. With constant propagation alone, the compiler must still generate the fully general code for *P*3. Procedure cloning can create a place where the parameter is always 1; *P*3*a*in the graph in the margin. The call that inhibits optimization, (*P*2,*P*3) in the original call graph, is assigned to *P*3*b*. The compiler can generate optimized code for *P*3*a* and the general code for *P*3*b*.

10.6.3 **Loop Unswitching** Loop unswitching hoists loop-invariant control-flow operations out of a loop. If the predicate in an if-then-else construct is loop invariant, then the compiler can rewrite the loop by pulling the if-then-else out of the loop and generating a tailored copy of the loop inside each half of the new if-then-else. Figure 10.7 shows this transformation for a short loop. Unswitching is an enabling transformation; it allows the compiler to tailor loop bodies in ways that are otherwise hard to achieve. After unswitching, the remaining loops contain less control flow. They execute fewer branches and other operations to support those branches. This can lead to better scheduling, better register allocation, and faster execution. If the original
*main* =? Z Z~ *P*0*P*1*P*2 AAU? *P₃aP₃b* After Cloning *P₃*

**10.6** *Enabling Other Transformations* **573**
loop contained loop-invariant code that was inside the if-then-else, then lcm could not move it out of the loop. After unswitching, lcm easily finds and removes such redundancies.

Unswitching also has a simple, direct effect that can improve a program: it moves the branching logic that governs the loop-invariant conditional out of the loop. Moving control flow out of loops is difficult. Techniques based on data-flow analysis, like lcm, have trouble moving such constructs because the transformation modifies the cfg on which the analysis relies. Techniques based on value numbering can recognize cases where the predicates control- ling if-then-else constructs are identical, but typically cannot remove the construct from a loop.

10.6.4 **Renaming** Most scalar transformations rewrite or reorder the operations in the code. We have seen, at several points in the text, that the choice of names can either obscure or expose opportunities for improvement. For example, in lvn, converting the names in a block to the ssa name space exposed some opportunities for reuse that would otherwise be difficult to capture. For many transformations, careful construction of the “right” name space can expose additional opportunities, either by making more facts visible to analysis or by avoiding some of the side effects that arise from reuse of storage. As an example, consider lcm. Because it relies on data-flow analysis to identify opportunities, the analysis relies on a notion of lexical identity— redundant operations must have the same operation and their operands must have the same names. Thus, lcm cannot discover that *x* C *x* and *2 x* have the same value, or that *x* C *x* and *x* C *y* have the same value when *x* D *y*. To improve the results of lcm, the compiler can encode value identity into the name space before it applies lcm. The compiler would use a value-based redundancy technique, such as dvnt, and then rewrite the name space so that equivalent values share the same name. By encoding value identity into lexical identity, the compiler exposes more redundancy to lcm and makes it more effective. In a similar way, names matter to instruction scheduling. In a scheduler, names encode the data dependences that constrain the placement of opera- tions in the scheduled code. When the reuse of a name reflects the actual flow of values, that reuse provides critical information required for correct- ness. If reuse of a name occurs because a prior pass has compressed the name space, then the reuse may unnecessarily constrain the schedule. For example, the register allocator places distinct values into the same physical The illusion of a constraint introduced by naming register to improve register utilization. If the compiler performs allocation is often called*false sharing*.

##### 574 CHAPTER 10 Scalar Optimizations

before scheduling, the allocator can introduce apparent constraints on the scheduler that are not required by the original code.

Renaming is a subtle issue. Individual transformations can benefit from name spaces with different properties. Compiler writers have long recog- nized that moving and rewriting operations can improve programs. In the same way, they should recognize that renaming can improve optimizer effectiveness. As ssa has shown, the compiler need not be bound by the name space introduced by the programmer or by the compiler’s front end. Renaming is a fertile ground for future work.

##### SECTION REVIEW

As we saw in Chapter 7, the shape of the IR for a procedure has an effect on the code that the compiler can generate for it. The techniques discussed in this section create opportunities for other optimizations by changing the shape of the code. They use replication, selective rewriting, and renaming to create places in the code that are amenable to improvement by specific transformations.

Cloning, at the block level or the procedure level, achieves its effects by eliminating the deleterious effects that occur at control-flow merge points. As it eliminates edges, in either the CFG or the call graph, cloning also creates opportunities to merge code. Loop unswitching performs specialized code motion of control structures, but its primary benefit derives from creating simpler loops that do not contain conditional control flow. This latter benefit improves results from transformations that range from LCM to instruction scheduling. Renaming is a powerful idea with widespread application; the specific case of encoding value identity into lexical identity has proven itself in several well-known compilers.

##### Review Questions

**1.** Superblock cloning creates new opportunities for other optimizations. Consider tree-height balancing. How much can superblock cloning help? Can you envision a transformation to follow superblock cloning that would expose more opportunities for tree-height balancing? For SVN, how might the results of using SVN after cloning compare to the results of running LCM on the same code?
**2.** Procedure cloning attacks some of the same inefficiencies as inline substitution. Is there a role for both of these transformations in a single compiler? What are the potential benefits and risks of each transformation? How might a compiler chose between them?

**10.7** *Advanced Topics* **575**
##### THE SSA GRAPH

In some algorithms, viewing the SSA form of the code as a graph simplifies either the discussion or the implementation. The algorithm for strength reduction interprets the SSA form of the code as a graph.

In SSA form, each name has a unique definition, so that a name specifies a particular operation in the code that computed its value. Each use of a name occurs in a specific operation, so the use can be interpreted as a chain from the use to its definition. Thus, a simple lookup table that maps names to the operations that define them creates a chain from each use to the corresponding definition. Mapping a definition to the operations that use it is slightly more complex. However, this map can easily be constructed during the renaming phase of the SSA construction.

We draw SSA graphs with edges that run from a use to its corresponding definition. This indicates the relationship implied by the SSA names. The compiler needs to traverse the edges in both directions. Strength reduction moves, primarily, from uses to definitions. The SCCP algorithm transmits values from definitions to uses. The compiler writer can easily add the data structures needed to allow traversal in both directions.

10.7 **ADVANCED TOPICS** Most of the examples in this chapter have been chosen to illustrate a spe- cific effect that the compiler can use to speed up the executable code. Sometimes, performing two optimizations together can produce results that cannot be obtained with any combination of applying them separately. The next subsection shows one such example: combining constant propagation with unreachable code elimination. Section 10.7.2 presents a second, more complex example of specialization: operator strength reduction with linear function test replacement. The algorithm that we present, *OSR*, is simpler than previous algorithms because it relies on properties of ssa form. Finally, Section 10.7.3 discusses some of the issues that arise in choosing a specific application order for the optimizer’s set of transformations.
10.7.1 **Combining Optimizations** Sometimes, reformulating two distinct optimizations in a unified framework and solving them jointly can produce results that cannot be obtained by any combination of the optimizations run separately. As an example, con- sider the sparse simple constant propagation (sscp) algorithm described in Section 9.3.6. It assigns a lattice value to the result of each operation in the

##### 576 CHAPTER 10 Scalar Optimizations

ssa form of the program. When it halts, it has tagged every definition with a lattice value that is either >, ?, or a constant. A definition can have the value > only if it relies on an uninitialized variable or it occurs in an unreachable block.

sscp assigns a lattice value to the operand used by a conditional branch. If the value is ?, then either branch target is reachable. If the value is neither ? nor >, then the operand must have a known value and the compiler can rewrite the branch with a jump to one of its two targets, simplifying the cfg. Since this removes an edge from the cfg, it may make the block that was the branch target unreachable. Constant propagation can ignore any effects of an unreachable block. sscp has no mechanism to take advantage of this knowledge.

We can extend the sscp algorithm to capitalize on these observations. The resulting algorithm, called *sparse conditional constant propagation* (sccp), appears in Figures 10.8, 10.9, and 10.10.

In concept, sccp operates in a straightforward way. It initializes the data structures. It iterates over two graphs, the cfg and the ssa graph. It propagates reachability information on the cfg and value information on the ssa graph. It halts when the value information reaches a fixed point; because the constant propagation lattice is so shallow, it halts quickly. Combining these two kinds of information, sccp can discover both unreachable code and constant values that the compiler simply could not discover with any combination of the sscp and unreachable code elimination.

To simplify the explanation of sccp, we assume that each block in the cfg represents just one statement, plus some optional-functions. A cfg node with a single predecessor holds either an assignment statement or a conditional branch. A cfg node with multiple predecessors holds a set of -functions, followed by an assignment or a conditional branch.

In detail, sccp is much more complex than either sscp or unreachable code elimination. Using two graphs introduces additional bookkeeping. Making the flow of values depend on reachability introduces additional work to the algorithm. The result is a powerful but complex algorithm.

The algorithm proceeds as follows. It initializes each *Value* field to > and marks each cfg edge as “unexecuted.” It initializes two worklists, one for cfg edges and the other for ssa graph edges. The cfg worklist receives the set of edges that leave the procedure’s entry node, *n*. The ssa worklist receives the empty set.

**10.7** *Advanced Topics* **577**

|CFGWorkList|f edges|leaving|n0 g||
|---|---|---|---|---|
|SSAWorkList|;||||
|for each edge mark e|e in the as unexecuted|CFG|||
|for each def|and each|use, x,|in the procedure||
|Value(x)|>||||
|while (CFGWorkList if CFGWorkList|6D; 6D;|or SSAWorkList then||6D ;)|
|remove|an edge|e = (m,n)|from CFGWorkList||
|if if SSAWorkList|is marked mark e as EvaluateAllPhisInBlock((m,n)) if no other if n else 6D;|as unexecuted executed edge is an assignment EvaluateAssign(n) let o be add (n,o) EvaluateConditional(n) then|then entering n’s CFG to CFGWorkList|n is marked successor|
|remove|an edge|e = (s,d)|from SSAWorkList||
|c|CFG node|that uses|d||
|if n FIGURE 10.8|edge entering if d is then else if EvaluateAssign(c) else EvaluateConditional(c)|c a function EvaluatePhi((s,d)) c is an assignment|is marked argument|as executed then|

*e*

*as executed then*

*any then*

##### Sparse Conditional Constant Propagation.

After the initialization phase, the algorithm repeatedly picks an edge from one of the two worklists and processes that edge. For a cfg edge (*m*,*n*), sccp In this discussion, a block is*reachable*if and only determines if the edge is marked as executed. If (*m*,*n*) is so marked, sccp if some CFG edge that enters it is marked as takes no further action for (*m*,*n*). If (*m*,*n*) is marked as unexecuted, then executable. sccp marks it as executed and evaluates all of the-functions at the start of block *n*. Next, sccp determines if block *n* has been previously entered along another edge. If it has not, then sccp evaluates the assignment or conditional branch in *n*. This processing may add edges to either worklist.

##### 578 CHAPTER 10 Scalar Optimizations

*EvaluateAssign(m)*

||/* m|is a CFG|node */||
|---|---|---|---|---|
|for each|value y used|by the|expression|in m|
|let|be the|SSA edge|that supplies|y|
|Value(y)|Value(x)||||
|let d be if Value(d)|the name of 6D ? then|the value|produced|by m|
|v|evaluation|of m over|lattice|values|
|if v|6D Value(d) Value(d) for every add (d,u)|then v SSA edge to SSAWorklist /* m is|(d,u) a CFG node|*/|
|let (s,d) if Value(d)|be the SSA 6D ? then|edge referenced||in m|
|if Value(d)|6D Value(s)|then|||
||Value(d) if Value(d) for each add|Value(s) = ? then CFG edge (m,n) to|(m,n) CFGWorkList||
||else let (m,n) add (m,n)|be the matches Value(d) to CFGWorkList|CFG edge|that|

*(x,y)*

*EvaluateConditional(m)*

n **FIGURE 10.9** Evaluating Assignments and Conditionals.

For an ssa edge, the algorithm first checks if the destination block is reachable. If the block is reachable, sccp calls one of *EvaluatePhi*, *EvaluateAssign*, or *EvaluateConditional*, based on the kind of opera- tion that uses the ssa name. When sccp must evaluate an assignment or a conditional over the lattice of values, it follows the same scheme used in sscp, discussed in Section 9.3.6 on page 515. Each time the lattice value for a definition changes, all the uses of that name are added to the ssa worklist.

Because sccp only propagates values into blocks that it has already proved executable, it avoids processing unreachable blocks. Because each value propagation step is guarded by a test on the executable flag for the entering edge, values from unreachable blocks do not flow out of those blocks. Thus, values from unreachable blocks have no role in setting the lattice values in other blocks.

After the propagation step, a final pass is required to replace operations that have operands with *Value* tags other than ?. It can specialize many of these

**10.7** *Advanced Topics* **579**

|EvaluatePhi((s,d))|/*|(s,d) is|an SSA graph|edge|*/|
|---|---|---|---|---|---|
|let p be EvaluateOperands(p) EvaluateResult(p)|the function|that|uses d|||
|EvaluateAllPhisInBlock((m,n))|||/* (m,n)|a CFG|edge */|
|for each EvaluateOperands(p)|function|p in block|n|||
|for each|function|p in block|n|||
|Evaluate EvaluateOperands(phi)|Result(p)|||||
|let x be if Value(x)|the name 6D ?|defined then|by function|phi||
|for EvaluateResult(phi)|each parameter let c be let (x,y) if c is marked then|p of the CFG edge be the SSA as Value(y)|function corresponding edge ending executed Value(x)|phi to in p|p|
|let x be if Value(x)|the name 6D ?|defined then|by function|phi||
|v if|evaluation Value(x) 6D Value(x) for each add|of phi v then v SSA graph (x,y) to|over lattice edge (x,y) SSAWorkList|values||

*is*

n **FIGURE 10.10** Evaluating Functions.

operations. It should also rewrite branches that have known outcomes with the appropriate jump operations. Later passes can remove the unreachable code (see Section 10.2). The algorithm cannot rewrite the code until the propagation completes.

##### Subtleties in Evaluating and Rewriting Operations

Some subtle issues arise in modeling individual operations. For example, if the algorithm encounters a multiply operation with operands > and ?, it might conclude that the operation produces ?. Doing so, however, is pre- mature. Subsequent analysis might lower the > to the constant 0, so that the multiply produces a value of 0. If sccp uses the rule >?!?, it intro- duces the potential for nonmonotonic behavior—the multiply’s value might

##### 580 CHAPTER 10 Scalar Optimizations

follow the sequence >, ?, 0, which would increase the running time of sccp. Equally important, it might incorrectly drive other values to ? and cause sccp to miss opportunities for improvement.

To address this, sccp should use three rules for multiplies that involve ?, as follows: >?!>,?!? for 6D> and 6D 0, and 0 ?! 0. This same effect occurs for any operation for which the value of one argument can completely determine the result. Other examples include a shift by more than the word length, a logical and with zero, and a logical or with all ones.

Some rewrites have unforeseen consequences. For example, replacing 4 *s*, for nonnegative *s*, with a shift replaces a commutative operation with a noncommutative operation. If the compiler subsequently tries to rearrange expressions using commutativity, this early rewrite forecloses an opportu- nity. This kind of interaction can have noticeable effects on code quality. To choose when the compiler should convert 4 *s* into a shift, the compiler writer must consider the order in which optimizations will be applied.

##### Effectiveness

sccp can find constants that the sscp algorithm cannot. Similarly, it can discover unreachable code that no combination of the algorithms in Section 10.2 can discover. It derives its power from combining reachabil- ity analysis with the propagation of lattice values. It can eliminate some cfg edges because the lattice values are sufficient to determine which path a branch takes. It can ignore ssa edges that arise from unreachable opera- tions (by initializing those definitions to >) because those operations will be evaluated if the block becomes marked as reachable. The power of sccp arises from the interplay between these analyses—constant propagation and reachability.

If reachability did not affect the final lattice values, then the same effects could be achieved by performing constant propagation (and rewriting constant-valued branches as jumps) followed by unreachable-code elimina- tion. If constant propagation played no role in reachability, then the same effects could be achieved by the other order—unreachable-code elimination followed by constant propagation. The power of sccp to find simplifica- tions beyond those combinations comes precisely from the fact that the two optimizations are interdependent.

10.7.2 **Strength Reduction** Operator strength reduction is a transformation that replaces a repeated series of expensive (“strong”) operations with a series of inexpensive (“weak”) operations that compute the same values. The classic example

**10.7** *Advanced Topics* **581**
)

|loadI|0|rs₀||||
|---|---|---|---|---|---|
|loadI|1|ri₀|loadI|0|rs₀|
|loadI|100|r100|loadI|@a|rt₆|
|l1: phi|ri₀, ri₂|ri₁|addI|rt₆, 396|rlim|
|phi|rs₀, rs₂|ri₁|l1: phi|rt₆, rt₈|rt₇|
|subI|ri₁, 1|r1|phi|rs₀, rs₂|rs₁|
|multI|r1, 4|r2|load|rt₇|r4|
|addI|r2, @a|r3|add|rs₁, r4|rs₂|
|load|r3|r4|addI|rt₇, 4|rt₈|
|add|rs₁, r4|rs₂|cmp LE|rt₈, rlim|r5|
|addI|ri₁, 1|rs₂|cbr|r5|l1, l2|
|cmp LE|ri₂ ,r100|r5|l2: ...|||
|cbr l2: ...|r5|l1, l2||||

)) )) )) )) )) )) )) )) )) )! ) !

(a) Original Code (b) Strength-Reduced Code
n **FIGURE 10.11** Strength Reduction Example.

replaces integer multiplications based on a loop index with equivalent addi- tions. This particular case arises routinely from the expansion of array and structure addresses in loops. Figure 10.11a shows the iloc that might be generated for the following loop:

sum 0 for i 1 to 100 sum sum + a(i)

The code is in semipruned ssa form; the purely local values (r₂, r₂, r₃, and r₄) have neither subscripts nor-functions. Notice how the reference to a(i) expands to four operations—the subI, multI, and addI that compute (i-1) × 4 - @a and the load that defines r4.

For each iteration, this sequence of operations computes the address of a(i) from scratch as a function of the loop index variable i. Consider the sequences of values taken on by ri1, r₁, r₂, and r₃.

ri₁: f 1, 2, 3,..., 100 g r1: f 0, 1, 2,..., 99 g r2: f 0, 4, 8,..., 396 g r3: f @a, @a+4, @a+8,..., @a+396 g

The values in r₁, r₂, and r₃ exist solely to compute the address for the load operation. If the program computed each value of r₃ from the preceding one, it could eliminate the operations that define r₁ and r₂. Of course, r₃ would

##### 582 CHAPTER 10 Scalar Optimizations

then need an initialization and an update. This would make it a nonlocal name, so it would also need a-function at both l₁ and l₂.

Figure 10.11b shows the code after strength reduction, linear-function test

replacement, and dead-code elimination. It computes those values formerly in r₃ directly into rt7and uses rt7in the load operation. The end-of-loop test, which used r₁ in the original code, has been modified to use rt8. This makes the computations of r₁, r₂, r₃, ri0, ri1, and ri2all dead. They have been removed to produce the final code. Now, the loop contains just five operations, ignoring-functions, while the original code contained eight. (In translating from ssa form back to executable code, the-functions become copy operations that the register allocator can usually remove.)

If the multI operation is more expensive than an addI, the savings will be larger. Historically, the high cost of multiplication justified strength reduc- tion. However, even if multiplication and addition have equal costs, the strength-reduced form of the loop may be preferred because it creates a better code shape for later transformations and for code generation. In partic- ular, if the target machine has an autoincrement addressing mode, then the addI operation in the loop can be folded into the memory operation. This option simply does not exist for the original multiply.

The rest of this section presents a simple algorithm for strength reduction, which we call *OSR*, followed by a scheme for linear function test replace- ment that shifts end-of-loop tests away from variables that would otherwise be dead. *OSR* operates on the ssa form of the code, considered as a graph.

Figure 10.12 shows the code for our example, alongside its ssa graph.

##### Background

Strength reduction looks for contexts in which an operation, such as a multi- ply, executes inside a loop and its operands are (1) a value that does not vary **Region constant** in that loop, called a *region constant*, and (2) a value that varies systemati- A value that does not vary within a given loop is a cally from iteration to iteration, called an *induction variable*. When it finds *region constant*for that loop. this situation, it creates a new induction variable that computes the same **Induction variable** sequence of values as the original multiplication in a more efficient way. A value that increases or decreases by a constant The restrictions on the form of the multiply operation’s operands ensure that amount in each iteration of a loop is an*induction* this new induction variable can be computed using additions, rather than *variable*. multiplications. x c × i We call an operation that can be reduced in this way a *candidate operation*. x i × c To simplify the presentation of *OSR*, we consider only candidate operations x c + i that have one of the five forms shown in the margin, where c is a region x i + c x i-cconstant and i is an induction variable. The key to finding and reducing can- Candidate Operations didate operations is efficient identification of region constants and induction

**10.7** *Advanced Topics* **583**

||||1 ri₀||rs 0|
|---|---|---|---|---|---|
|loadI|0|rs₀||||
|loadI|1|ri₀|φ|1|rs φ|
|loadI|100|r100|ri-|4||
|l1: phi|ri₀, ri₂|ri₁|r 1|||
|phi|rs₀, rs₂|ri₁||×|@a|
|subI|ri₁, 1|r1|r2|||
|multI|r1, 4|r2||r 3 +||
|addI|r2, @a|r3|1||load|
|load|r3|r4||r4||
|add|rs₁, r4|rs₂|+|100|+|
|addI|ri₁, 1|rs₂|ri|r100|rs₂|
|cmp LE|ri₂ ,r100|r5|r5 ≤|l1 l2||
|cbr|r5|l1, l2||cbr||
|l2: ...|||pc|||

0 ) ) 1

)1 ) ) ) ) ) ) )
)2 ) !
(a) Example in ILOC SSA Form (b) Corresponding SSA Graph
n **FIGURE 10.12** Relating SSA in ILOC to the SSA Graph.

variables. An operation is a candidate if and only if it has one of these forms, including the restrictions on operands.

A region constant can either be a literal constant, such as 10, or a loop- invariant value, that is, one not modified inside the loop. With the code in ssa form, the compiler can determine if an argument is loop invariant by checking the location of its sole definition—its definition must dominate the entry to the loop that defines the induction variable. *OSR* can check both of these conditions in constant time. Performing lcm and constant propagation before strength reduction may expose more region constants.

Intuitively, an induction variable is a variable whose values in the loop form an arithmetic progression. For the purposes of this algorithm, we can use a much more specific and restricted definition: an induction variable is a strongly connected component (scc) of the ssa graph in which each opera- tion that updates its value is one of (1) an induction variable plus a region constant, (2) an induction variable minus a region constant, (3) a-function, or (4) a register-to-register copy from another induction variable. While this definition is much less general than conventional definitions, it is sufficient to enable the *OSR* algorithm to find and reduce candidate operations. To identify induction variables, *OSR* finds sccs in the ssa graph and iterates over them to determine if each operation in the scc is of one of these four types.

##### 584 CHAPTER 10 Scalar Optimizations

Because *OSR* defines induction variables in the ssa graph and region con- stants relative to a loop in the cfg, the test to determine if a value is constant relative to the loop containing a specific induction variable is complicated. Consider an operation *o* of the form x i × c, where i is an induction variable. For *o* to be a candidate for strength reduction, c must be a region constant with respect to the outermost loop in which i varies. To test whether c has this property, *OSR* must relate the scc for i in the ssa graph back to a loop in the cfg.

*OSR* finds the ssa graph node with the lowest reverse postorder number in the scc defining i. It considers this node to be the header of the scc and records that fact in the header field of each node of the scc. (Any node in the ssa graph that is not part of an induction variable has its header field set to *null*.) In ssa form, the induction variable’s header is the-function at the start of the outermost loop in which it varies. In an operation x i × c, where i is an induction variable, c is a region constant if the cfg block that contains its definition dominates the cfg block that contains i’s header. This condition ensures that c is invariant in the outermost loop in which i varies. To perform this test, the ssa construction must produce a map from each ssa node to the cfg block where it originated.

The header field plays a critical role in determining whether or not an opera- tion can be strength reduced. When *OSR* encounters an operation x y × z, it can determine if y is an induction variable by following the ssa graph edge to y’s definition and inspecting its header field. A *null* header field indicates that y is not an induction variable. If both y and z have *null* header fields, the operation cannot be strength reduced.

If one of y or z has a non-*null* header field, then *OSR* uses that header field to determine if the other operand is a region constant. Assume y’s header is not *null*. To find the cfg block for the entry to the outermost loop where y varies, *OSR* consults the ssa-to-cfg map, indexed by y’s header. If the cfg block containing z’s definition dominates the cfg block of y’s header, then z is a region constant relative to the induction variable y.

##### The Algorithm

To perform strength reduction, *OSR* must examine each operation and determine if one of its operands is an induction variable and the other is a region constant. If the operation meets these criteria, *OSR* can reduce it by creating a new induction variable that computes the needed val- ues and replacing the operation with a register-to-register copy from this new induction variable. (It should avoid creating duplicate induction variables.)

**10.7** *Advanced Topics* **585**
*OSR(G) Process(N)*

|nextNum|0||if N has only|one member|n||
|---|---|---|---|---|---|---|
|while there DFS(n) DFS(n) n.Num|is an nextNum++|unvisited|then if else ClassifyIV(N)|n is a candidate then Replace(n,iv,rc) else n.Header||operation null|
|n.Visited|true||||||
|n.Low|n.Num||IsIV true||||
|push(n)|||for each node|n 2 N|||
|for each|operand|o of n|if n is|not a valid|update|for|
|if o.Visited|=|false then|an|induction|variable||
|DFS(o)|||then IsIV|false|||
|n.Low|min(n.Low,o.Low)||if IsIV then||||
|if o.Num|< n.Num|and|header|n 2 N|with the||
|o|is on the|stack||lowest RPO|number||
|then|n.Low|min(n.Low,o.Num)|for each|node n 2|N||
|if n.Low|= n.Num|then|n.Header|header|||
|SCC|;||else||||
|until|x = n do||for each|node n 2|N||
|x|pop()||if n is|a candidate|operation||
|SCC|SCC|[ f x g|then|Replace(n,iv,rc)|||
|Process(SCC) n FIGURE 10.13|||else|n.Header|null||

*nextNum 0 if N has only one member n* *n* 2 *G*

*ClassifyIV(N)*

##### Operator Strength Reduction Algorithm.

Based on the preceding discussion, we know that *OSR* can identify induction variables by finding sccs in the ssa graph. It can discover a region constant by examining the value’s definition. If the definition results from an immedi- ate operation, or its cfg block dominates the cfg block of the induction variable’s header, then the value is a region constant. The key is putting these ideas together into an efficient algorithm.

*OSR* uses Tarjan’s strongly connected region finder to drive the entire pro- cess. As shown in Figure 10.13, *OSR* takes an ssa graph as its argument and repeatedly applies the strongly connected region finder, *DFS*, to it. (This process stops when *DFS* has visited every node in *G*.)

*DFS* performs a depth-first search of the ssa graph. It assigns each node a number, corresponding to the order in which it visits the node. It pushes each node onto a stack and labels the node with the lowest depth-first number on a node that can be reached from its children. When it returns from processing the children, if the lowest node reachable from *n* has *n*’s number, then *n* is

##### 586 CHAPTER 10 Scalar Optimizations

the header of an scc. *DFS* pops nodes off the stack until it reaches *n*; all of those nodes are members of the scc.

*DFS* removes sccs from the stack in an order that simplifies the rest of *OSR*. When an scc is popped from the stack and passed to *Process*, *DFS* has already visited all of its children in the ssa graph. If we interpret the ssa graph so that its edges run from uses to definitions, as shown in the ssa graph in Figure 10.12, then candidate operations are encountered only after their operands have been passed to *Process*. When *Process* encounters an operation that is a candidate for strength reduction, its operands have already been classified. Thus, *Process* can examine operations, identify candidates, x c × i and invoke *Replace* to rewrite them in strength-reduced form during the x i × c depth-first search. x c + i x i + c *DFS* passes each scc to *Process*. If the scc consists of a single node*n* that has x i-c the form of a candidate operation, shown in the margin, *Process* passes *n* to Candidate Operations *Replace*, along with its induction variable, *iv*, and its region constant, *rc*. *Replace* rewrites the code, as described in the next section. If the scc con- tains multiple nodes, *Process* passes the scc to *ClassifyIV* to determine When *Process*identifies*n*as a candidate whether or not it is an induction variable. operation, it finds both the induction variable, *iv*and the region constant, *rc*. *ClassifyIV* examines each node in the scc to check it against the set of valid updates for an induction variable. If all the updates are valid, the scc is an induction variable, and *Process* sets each node’s header field to contain the node in the scc with the lowest reverse postorder number. If the scc is not an induction variable, *ClassifyIV* revisits each node in the scc to test it as a candidate operation, either passing it to *Replace* or setting its header to show that it is not an induction variable.

##### Rewriting the Code

The remaining piece of *OSR* implements the rewriting step. Both *Process* and *ClassifyIV* call *Replace* to perform the rewrite. Figure 10.14 shows the code for *Replace* and its support functions *Reduce* and *Apply*.

*Replace* takes three arguments, an ssa graph node *n*, an induction variable *iv*, and a region constant *rc*. The latter two are operands to *n*. *Replace* calls *Reduce* to rewrite the operation represented by *n*. Next, it replaces *n* with a copy operation from the result produced by *Replace*. It sets *n*’s header field, and returns.

*Reduce* and *Apply* do most of the work. They use a hash table to avoid inserting duplicate operations. Since *OSR* works on ssa names, a single global hash table suffices. It can be initialized in *OSR* before the first call to *DFS*. *Insert* adds entries to the hash table; *Lookup* queries the table.

**10.7** *Advanced Topics* **587**

|Replace(n,|iv, rc)|||o1,|o2)|||
|---|---|---|---|---|---|---|---|
|result|Reduce(n.op,|iv,|rc)|Lookup(op,||o1, o2)||
|replace|n with a|copy from|result|result is|‘‘not found’’|then||
|n.header|iv.header|||if o1 is|an induction|variable||
|Reduce(op,iv,rc)||||and|o2 is a|region constant||
|result|Lookup(op,|iv,|rc)|then|result|Reduce(op,|o1, o2)|
|if result|is ‘‘not|found’’|then|else if|o2 is an|induction|variable|
|result|NewName( )||||and o1 is|a region|constant|
|Insert(op,|iv,|rc,result)||then|result|Reduce(op,|o2, o1)|
|newDef|Clone(iv,|result)||else||||
|newDef.header||iv.header||result|NewName( )|||
|for|each operand|o of|newDef|Insert(op,|o1,|o2,result)||
|if|o.header then rewrite Reduce(op,|D iv.header o with|o, rc)|Find definitions Create|block b ‘‘op o1,|dominated of o1 and o2 result’’|by the o2|
|else return n FIGURE 10.14|if op newDef.op then replace Apply(op, result|is or is o with o,|rc)|at header result|the end to null|of b and|set its|

*Apply(op,* *result* *if*

)

*return*

##### Algorithm for the Rewriting Step.

The plan for *Reduce* is simple. It takes an opcode and its two operands and either creates a new induction variable to replace the computation or returns the name of an induction variable previously created for the same combi- nation of opcode and operands. It consults the hash table to avoid duplicate work. If the desired induction variable is not in the hash table, it creates the induction variable in a two-step process. First, it calls *Clone* to copy the def- inition for *iv*, the induction variable in the operation being reduced. Next, it recurs on the operands of this new definition.

These operands fall into two categories. If the operand is defined inside the scc, it is part of *iv*, so *Reduce* recurs on that operand. This forms the new induction variable by cloning its way around the scc of the original induction variable *iv*. An operand defined outside the scc must be either the initial value of *iv* or a value by which *iv* is incremented. The initial value must be a -function argument from outside the scc; *Reduce* calls *Apply* on each such argument. *Reduce* can leave an induction-variable increment alone, unless the candidate operation is a multiply. For a multiply, *Reduce* must compute a new increment as the product of the old increment and the original region constant *rc*. It invokes *Apply* to generate this computation.

##### 588 CHAPTER 10 Scalar Optimizations

*Apply* takes an opcode and two operands, locates an appropriate point in the code, and inserts that operation. It returns the new ssa name for the result of that operation. A few details need further explanation. If this new operation is, itself, a candidate, *Apply* invokes *Reduce* to handle it. Otherwise, *Apply* gets a new name, inserts the operation, and returns the result. (If both *o1* and *o2* are constant, *Apply* can evaluate the operation and insert an immediate load.) It locates an appropriate block for the new operation using dominance information. Intuitively, the new operation must go into a block dominated by the blocks that define its operands. If one operand is a constant, *Apply* can duplicate the constant in the block that defines the other operand. Otherwise, both operands must have definitions that dominate the header block, and one must dominate the other. *Apply* can insert the operation immediately after this later definition.

##### Back to the Example

Consider what happens when *OSR* encounters the example in Figure 10.12. Assume that it begins with the node labelled rs2and that it visits left children before right children. It recurs down the chain of operations that define r₄, r3, r2, r1, and ri₁. At ri1, it recurs on ri2and then ri0. It finds the two single-node sccs that contain the literal constant one. Neither is a candidate, so *Process* marks them as noninduction variables by setting their headers to *null*.

The first nontrivial scc that *DFS* discovers contains ri1and ri2. All the operations are valid updates for an induction variable, so *ClassifyIV* marks each node as an induction variable by setting its header field to point to the node with the lowest depth-first number in the scc—the node for ri1.

Now, *DFS* returns to the node for r₁. Its left child is an induction variable and its right child is a region constant, so it invokes *Reduce* to create an induction variable. In this case, r₁ is ri1- 1, so the induction variable has an initial value equal to one less than the initial value of the old induction variable, or zero. The increment is the same. Figure 10.15 shows the scc that *Reduce* and *Apply* create, under the label “for r₁.” Finally, the definition of r₁ is replaced with a copy operation, r₁ rt₁. The copy operation is marked as an induction variable.

Next, *DFS* discovers the scc that consists of the node labelled r₂. *Process* discovers that it is a candidate because its left operand (the copy that now defines r₁) is an induction variable and its right operand is a region constant. *Process* invokes *Replace* to create an induction variable that has the value

**10.7** *Advanced Topics* **589**

||1|1|4|4|
|---|---|---|---|---|
|+||++ + +|||
|ri₂|≤ l1l|rt₂|rt₅|rt₈|
|r5|2||||
||pc||||
|n FIGURE 10.15 r1 × 4. Reduce and Apply clone the induction variable for r₁, adjust the||SSA|||

|i|for r1|for r2|for r3|sum|
|---|---|---|---|---|
|1|0|0|@a|0|
|ri₀|rt₀|rt₃|rt₆|rs₀|
|φ||||φ|
|ri₁|rt₁|rt₄|rt₇|rs₁|

rs₂

##### Transformed Graph for the Example.

increment since the operation is a multiply, and add a copy to r₂.

*DFS* next passes the node for r₃ to *Process*. This creates another induction variable with @a as its initial value and copies its value to r₃.

*Process* handles the load, followed by the scc that computes the sum. It finds that none of these operations are candidates.

Finally, *OSR* invokes *DFS* on the unvisited node for the cbr. *DFS* visits the comparison, the previously marked induction variable, and the constant 100. No further reductions occur.

The ssa graph in Figure 10.15 shows all of the induction variables created by this process. The induction variables labelled “for r₁” and “for r₂” are dead. The induction variable for i would be dead, except that the end-of- loop test still uses it. To eliminate this induction variable, the compiler can apply linear-function test replacement to transfer the test to the induction variable for r₃.

##### Linear-Function Test Replacement

Strength reduction often eliminates all uses of an induction variable, except for an end-of-loop test. In that case, the compiler may be able to rewrite the end-of-loop test to use another induction variable found in the loop. If the compiler can remove this last use, it can eliminate the original

##### 590 CHAPTER 10 Scalar Optimizations

induction variable as dead code. This transformation is called linear-function test replacement (lftr).

To perform lftr, the compiler must (1) locate comparisons that rely on otherwise unneeded induction variables, (2) locate an appropriate new induction variable that the comparison could use, (3) compute the correct region constant for the rewritten test, and (4) rewrite the code. Having lftr cooperate with *OSR* can simplify all of these tasks to produce a fast, effective transformation.

The operations that lftr targets compare the value of an induction vari- able against a region constant. *OSR* examines each operation in the program to determine if it is a candidate for strength reduction. It can easily and inexpensively build a list of all the comparison operations that involve induction variables. After *OSR* finishes its work, lftr should revisit each of these comparisons. If the induction-variable argument of a comparison was strength reduced by *OSR*, lftr should retarget the comparison to use the new induction variable.

To facilitate this process, *Reduce* can record the arithmetic relationship it uses to derive each new induction variable. It can insert a special lftr edge from each node in the original induction variable to the correspond- ing node in its reduced counterpart and label it with the operation and region constant of the candidate operation responsible for creating that induction variable. Figure 10.16 shows the ssa graph with these additional edges in black. The sequence of reductions in the example create a chain of labelled edges. Starting from the original induction variable, we find the labels -1, x4, and +@a.

When lftr finds a comparison that should be replaced, it can follow the edges from its induction-variable argument to the final induction variable that resulted from a chain of one or more reductions. The comparison should use this induction variable with an appropriate new region constant.

The labels on the lftr edges describe the transformation that must be applied to the original region constant to derive the new region constant. In the example, the trail of edges leads from ri2to rt8and produces the value (100 - 1) × 4 + @a for the transformed test. Figure 10.16 shows the edges and the rewritten test.

This version of lftr is simple, efficient, and effective. It relies on close collaboration with *OSR* to identify comparisons that might be retargeted and to record the reductions as it applies them. Using these two data structures, lftr can find comparisons to retarget, find the appropriate place to retarget

**10.7** *Advanced Topics* **591**

|1 ri₀|0 rt₀|0 rt₃|@a rt₆||rs₀ 0|
|---|---|---|---|---|---|
|φφφφ-1|× 4|+@a|||φ|
|ri₁|rt₁ copy r1|rt₄ copy r2|rt₇ r3|copy|rs₁|
|||||load||
|1|1|4|4|r4||
|+-1|+ × 4|+ +@a|+||+|
|ri₂|rt₂|rt₅|rt r5 ≤ pc|l1 l 2 cbr|rs₂|
||LFTR|||||

n **FIGURE 10.16** Example after.

them, and find the necessary transformation for the comparison’s constant argument.

10.7.3 **Choosing an Optimization Sequence** The effectiveness of an optimizer on any given code depends on the **Optimization sequence** sequence of optimizations that it applies to the code—both the specific trans-a set of optimizations and an order for their formations that it uses and the order in which it applies them. Traditional application optimizing compilers have offered the user the choice of several sequences (e.g. -O, -O1, -O2,... ). Those sequences provide a tradeoff between compile time and the amount of optimization that the compiler attempts. Increased optimization effort, however, does not guarantee improvement. The optimization sequence problem arises because the effectiveness of any given transformation depends on several factors.
**1.** Does the opportunity that the transformation targets appear in the code? If not, the transformation cannot improve the code.
**2.** Has a prior transformation hidden or obscured that opportunity? For example, the optimization of algebraic identities in lvn can convert 2 × a into a shift operation, which replaces a commutative operation with a faster non-commutative optimization. Any transformation that needs commutativity to effect its improvement might see opportunities vanish from prior application of lvn.
**3.** Has any other transformation already eliminated the inefficiency? Transformations have overlapping and idiosyncratic effects; for example, lvn achieves some of the effects of global constant

##### 592 CHAPTER 10 Scalar Optimizations

propagation and loop unrolling achieves effects similar to superblock cloning. The compiler writer might include both transformations for their nonoverlapping effects.

The interactions between transformations makes it difficult to predict the improvement from the application of any single transformation or any sequence of transformations.

Some research compilers attempt to discover good optimization sequences. The approaches vary in granularity and in technique. The various systems have looked for sequences at the block level, at the source-file level, and at the whole-program level. Most of these systems have used some kind of search over the space of optimization sequences.

The space of potential optimization sequences is huge. For example, if the compiler chooses a sequence of length 10 from a pool of 15 transformations, 15 it has 10 possible sequences that it can generate—an impractically large number for the compiler to explore. Thus, compilers that search for good sequences use heuristic techniques to sample smaller portions of the search space. In general, these techniques fall into three categories: (1) genetic algorithms adapted to act as intelligent searches, (2) randomized search algo- rithms, and (3) statistical machine learning techniques. All three approaches have shown promise.

Despite the huge size of the search spaces, well-tuned search algorithms In this context, a*good*sequence is one that can find good optimization sequences with 100 to 200 probes of the search produces results within 5% of the best results. space. While that number is not yet practical, further refinement may reduce the number of probes to a practical level.

One interesting application of these techniques is to derive the sequences used by the compiler’s command line flags, such as -O2. The compiler writer can use an ensemble of representative applications to discover good gen- eral sequences and then apply those sequences as the compiler’s default sequences. A more aggressive approach, used in several systems, is to derive a handful of good sequences for different application ensembles and have the compiler try each of those sequences and retain the best result.

10.8 **SUMMARY AND PERSPECTIVE** The design and implementation of an optimizing compiler is a complex undertaking. This chapter has introduced a conceptual framework for think- ing about transformations—the taxonomy of effects. Each category in the taxonomy is represented by several examples, either in this chapter or elsewhere in the book.

##### Chapter Notes 593

The challenge for the compiler writer is to select a set of transformations that work well together to produce good code—code that meets the user’s needs. The specific transformations implemented in a compiler determine, to a large extent, the kinds of programs for which it will produce good code.

n **CHAPTER NOTES** While the algorithms presented in this chapter are modern, many of the basic ideas were well known in the 1960s and 1970s. Dead-code elimina- tion, code motion, strength reduction, and redundancy elimination are all described by Allen [11] and by Cocke and Schwartz [91]. A number of sur- vey papers provide overviews of the state of the field at different points in time [16, 28, 30, 316]. Books by Morgan [268] and Muchnick [270] both discuss the design, structure, and implementation of optimizing com- pilers. Wolfe [352] and Allen and Kennedy [20] focus on dependence-based analysis and transformations.

*Dead* implements a mark-sweep style of dead-code elimination that was introduced by Kennedy [215, 217]. It is reminiscent of the Schorr-Waite marking algorithm [309]. *Dead* is specifically adapted from the work of Cytron et al. [110, Section 7.1]. *Clean* was developed and implemented in 1992 by Rob Shillner [254].

lcm improves on Morel and Renvoise’s classic algorithm for partial redun- dancy elimination [267]. That paper inspired many improvements, includ- ing [81, 130, 133, 321]. Knoop, Ruthing, and Steffen’s R lcm [225] improved code placement; the formulation in Section 10.3 uses equations from Drech- sler and Stadel [134]. Bodik, Gupta, and Soffa combined this approach with replication to find and remove all redundant code [43]. The dvnt algorithm is due to Briggs [53]. It has been implemented in a number of compilers.

Hoisting appears in the Allen-Cocke catalogue as a technique for reduc- ing code space [16]. The formulation using anticipability appears in several places, including Fischer and LeBlanc [147]. Sinking or cross-jumping is described by Wulf et al. [356].

Both peephole optimization and tail-recursion elimination date to the early 1960s. Peephole optimization was first described by McKeeman [260]. Tail- recursion elimination is older; folklore tells that McCarthy described it at the chalkboard during a talk in 1963. Steele’s thesis [323] is a classic reference for tail-recursion elimination.

Superblock cloning was introduced by Hwu et al. [201]. Loop optimizations such as unswitching and unrolling have been studied extensively [20, 28]; Kennedy used unrolling to avoid copy operations at the end of a loop [214].

##### 594 CHAPTER 10 Scalar Optimizations

Cytron, Lowrey, and Zadeck present an interesting alternative to unswitch- ing [111]. McKinley et al. give practical insight into the impact of memory optimizations on performance [94, 261].

Combining optimizations, as in sccp, often leads to improvements that can- not be obtained by independent application of the original optimizations. Value numbering combines redundancy elimination, constant propagation, and simplification of algebraic identities [53]. lcm combines elimina- tion of redundancies and partial redundancies with code motion [225]. Click and Cooper [86] combine Alpern’s partitioning algorithm [21] with sccp [347]. Many authors have combined register allocation and instruction scheduling [48, 163, 269, 276, 277, 285, 308].

The sccp algorithm is due to Wegman and Zadeck [346, 347]. Their work clarified the distinction between optimistic and pessimistic algorithms; Click discusses the same issue from a set-building perspective [84].

Operator strength reduction has a rich history. One family of strength- reduction algorithms developed out of work by Allen, Cocke, and Kennedy [19, 88, 90, 216, 256]. The *OSR* algorithm is in this family [107]. Another family of algorithms grew out of the data-flow approach to opti- mization exemplified by the lcm algorithm; a number of sources give techniques in this family [127, 129, 131, 178, 209, 220, 226]. The version of *OSR* in Section 10.7.2 only reduces multiplications. Allen et al. show the reduction sequences for many other operators [19]; extending *OSR* to handle these cases is straightforward. A weaker form of strength reduction rewrites integer multiplies with faster operations [243].

n **EXERCISES** Section 10.1 **1.** One of the primary functions of an optimizer is to remove overhead that the compiler introduced during the translation from source language into ir.

**a.** Give four examples of inefficiencies that you would expect an optimizer to improve, along with the source-language constructs that give rise to them.
**b.** Give four examples of inefficiencies that you would expect an optimizer to miss, even though they can be improved. Explain why an optimizer would have difficulty improving them.
Section 10.2 **2.** Figure 10.1 shows the algorithm for *Dead*. The marking pass is a classic fixed-point computation.

**a.** Explain why this computation terminates.
**b.** Is the fixed-point that it finds unique? Prove your answer.
**c.** Derive a tight time bound for the algorithm.

##### Exercises 595

**3.** Consider the algorithm *Clean* from Section 10.2. It removes useless control flow and simplifies the cfg.
**a.** Why does the algorithm terminate?
**b.** Give an overall time bound for the algorithm.
**4.** lcm uses data-flow analysis to find redundancy and to perform code Section 10.3 motion. Thus, it relies on a lexical notion of identity to find redundancy—two expressions can only be redundant if the data-flow analysis maps them to the same internal name. By contrast, value numbering computes identity based on values.
**a.** Give an example of a redundant expression that lcm will discover but a value-based algorithm (say a global version of value numbering) will not.
**b.** Give an example of a redundant expression that lcm will not discover but a value-based algorithm will.
**5.** Redundancy elimination has a variety of effects on the code that the compiler generates.
**a.** How does lcm affect the demand for registers in the code being transformed? Justify your answer.
**b.** How does lcm affect the size of the code generated for a procedure? (You can assume that demand for registers is unchanged.)
**c.** How does hoisting affect the demand for registers in the code being transformed? Justify your answer.
**d.** How does hoisting affect the size of the code generated for a procedure? (Use the same assumptions.)
**6.** A simple form of operator strength reduction replaces a single Section 10.4 instance of an expensive operation with a sequence of operations that are less expensive to execute. For example, some integer multiply operations can be replaced with a sequence of shifts and adds.
**a.** What conditions must hold to let the compiler safely replace an integer operation x y × z with a single shift operation?
**b.** Sketch an algorithm that replaces a multiplication of a known constant and an unsigned integer with a sequence of shifts and adds in cases where the constant is not a power of two.
**7.** Both tail-call optimization and inline substitution attempt to reduce the overhead caused by the procedure linkage.
**a.** Can the compiler inline a tail call? What obstacles arise? How might you work around them?
**b.** Contrast the code produced from your modified inlining scheme with that produced by tail-call optimization.

##### 596 CHAPTER 10 Scalar Optimizations

Section 10.5 **8.** A compiler can find and eliminate redundant computations in many different ways. Among these are dvnt and lcm.

**a.** Give two examples of redundancies eliminated by dvnt that cannot be found bylcm.
**b.** Give an example that lcm finds that is missed by dvnt.
Section 10.6 **9.** Develop an algorithm to rename the value in a procedure to that encodes value identity into variable names.

**10.** Superblock cloning can cause significant code growth.
**a.** How might the compiler mitigate code growth in superblock
Hint: Think back to the block-placement cloning while retaining as much of the benefit as possible? algorithm in Chapter 8. **b.** What problems might arise if the optimizer allowed superblock cloning to continue across a loop-closing branch? Contrast your approach with loop unrolling.

#### Chapter 11

