## Data-Flow Analysis

n **CHAPTER OVERVIEW** Compilers analyze the ir form of the program being compiled to identify opportunities where the code can be improved and to prove the safety and profitability of transformations that might improve the code. Data-flow anal- ysis is the classic technique for compile-time program analysis. It allows the compiler to reason about the runtime flow of values in the program.

This chapter explores iterative data-flow analysis, which uses a simple fixed- point algorithm. From the basics of data-flow analysis, it builds up the construction of static single-assignment (ssa) form, illustrates the use of ssa form, and introduces interprocedural analysis.

**Keywords:** Data-flow Analysis, ssa Form, Dominance, Constant Propa- gation

9.1 **INTRODUCTION** As we saw in Chapter 8, optimization is the process of analyzing a program and transforming it in ways that improve its runtime behavior. Before the compiler can improve the code, it must locate points in the program where changing the code is likely to improve it, *and* the compiler must prove that changing the code at those points is safe. Both of these tasks require a deeper understanding of the code than the compiler’s front end typically derives. To gather the information needed to locate opportunities for optimization and to justify those optimizations, compilers use some form of static analysis. In general, static analysis involves compile-time reasoning about the run- time flow of values. This chapter explores techniques that compilers use to analyze programs in support of optimization. It presents data-flow analy- sis at a deeper level than provided in Chapter 8. Next, Section 9.3 presents **Engineering a Compiler**. **DOI: 10.1016/B978-0-12-088478-0.00009-8** Copyright c 2012, Elsevier Inc. All rights reserved.

##### 476 CHAPTER 9 Data-Flow Analysis

algorithms for the construction and destruction of static single-assignment form. Section 9.4 discusses issues in whole-program analysis. The advanced topics section presents further material on computing dominance and a discussion of graph reducibility.

##### Conceptual Roadmap

Compilers use static analysis to determine where optimizing transformations can be safely and profitably applied. In Chapter 8, we saw that optimiza- tions operate on different scopes, from local to interprocedural. In general, a transformation needs analytical information that covers at least as large a scope as the transformation; that is, a local optimization needs at least local information, while a whole-procedure, or global, optimization needs global information.

Static analysis generally begins with control-flow analysis—analyzing the ir form of the code to understand the flow of control between operations. The result of control-flow analysis is a control-flow graph. Next, compilers analyze the details of how values flow through the code. They use the result- ing information to find opportunities for improvement and to prove the safety of transformations. The optimization community developed global data-flow analysis to answer these questions.

Static single assignment form is an intermediate representation that unifies the results of control-flow analysis and data-flow analysis in a single sparse data structure. It has proven useful in both analysis and transformation and has become a standard representation used in both research and production compilers.

##### Overview

Chapter 8 introduced the subject of analysis and transformation of pro- grams by examining local methods, regional methods, global methods, and interprocedural methods. Value numbering is algorithmically simple, even though it achieves complex effects; it finds redundant expressions, sim- plifies code based on algebraic identities and zero, and propagates known constant values. In contrast, finding an uninitialized variable is conceptually simple but requires that the compiler analyze the entire procedure to track definitions and uses.

The difference between these two problems lies in the kinds of control flows that each method must understand. Local and superlocal value numbering **Join point** only deal with subsets of the cfg that form trees. To identify an uninitialized In a CFG, a*join point*is a node that has multiple variable, the compiler must reason about the entire cfg, including cycles predecessors. and *join points*, both of which complicate the analysis. In general, methods

**9.2** *Iterative Data-Flow Analysis* **477**
that restrict themselves to control-flow graphs that can be expressed as trees are amenable to online solutions, while those that must deal with cycles in the cfg require offline solutions—the entire analysis must complete before rewriting can begin.

Static, or compile-time, analysis is a collection of techniques that compil- ers use to prove the safety and profitability of a potential transformation. Static analysis over single blocks or trees of blocks is typically straightfor- ward. This chapter focuses on global analysis, where the cfg can contain both cycles and join points. It will mention several problems in interproce- dural analysis; these problems operate over the program’s call graph or some related graph. To perform interprocedural analysis, the compiler must have access to information about other procedures in the program.

In simple cases, static analysis can produce precise results—the compiler can know exactly what will happen when the code executes. If the com- piler can derive precise information, it might replace the runtime evaluation of an expression or function with an immediate load of the result. On the other hand, if the code reads values from any external source, involves even modest amounts of control flow, or encounters any ambiguous memory ref- erences (from pointers, array references, or call-by-reference parameters), then static analysis becomes much harder and the results of the analysis are less precise.

This chapter begins by examining classic problems in data-flow analysis. We focus on an iterative algorithm for solving these problems because it is simple, robust, and easy to understand. Section 9.3 presents an algorithm for constructing a static single-assignment form for a procedure. The con- struction relies heavily on results from data-flow analysis. The “Advanced Topics” section explores the notion of flow-graph reducibility, presents a faster approach to calculating dominators, and provides an introduction to interprocedural data-flow analysis.

9.2 **ITERATIVE DATA-FLOW ANALYSIS** Compilers use data-flow analysis, a collection of techniques for compile- time reasoning about the runtime flow of values, to locate opportunities for optimization and to prove the safety of specific transformations. As we saw with live analysis in Section 8.6.1, problems in data-flow analysis take the form of a set of simultaneous equations defined over sets associated with the nodes and edges of a graph that represents the code being analyzed. Live analysis is formulated as a global data-flow problem that operates on the control-flow graph (cfg) of a procedure.

##### 478 CHAPTER 9 Data-Flow Analysis

##### Dominance

##### In a flow graph with entry nodeb0, nodebi

##### dominatesnodebj, writtenbi bj, if and only if

*bi* lies on every path from*b*0 to*bj*. By definition, *bi bi*.

*B₀* ?? *B₁*

*B₂ B₅* @R

B @R B*B₆ B₈* B @R B*B₇* BN *B*3 ? *B*4

In this section, we will explore the properties of global data-flow problems and their solutions in more depth than was possible in Chapter 8. We will focus on one specific solution technique: an iterative fixed-point algorithm. It has the twin advantages of simplicity and robustness. As an initial example, we will examine the computation of dominance information. When we need a more complex example, we will return to consideration of LiveOut sets.

9.2.1 **Dominance** Many optimization techniques must reason about the structural properties of the underlying code and its control-flow graph. A key tool that compil- ers use to reason about the shape and structure of the cfg is the notion of *dominators*. As we will see, dominators play a key role in the construction of static single-assignment form. While many algorithms have been pro- posed to compute dominance information, an extremely simple data-flow problem will suffice to annotate each node *bi*in the cfg, which represents a basic block, with a set Dom(*bi*) that contains the names of all nodes that dominate *bi*. To make this notion of dominance concrete, consider the node *B₆* in the cfg shown in the margin. (Note that this cfg differs slightly from the example in Chapter 8.) Nodes *B₀*, *B₁*, *B₅*, and *B₆* all lie on every path from *B₀* to *B₆*, so Dom(*B₆*) is f*B₀*, *B₁*, *B₅*, *B₆*g. The full set of Dom sets for the cfg are as follows: ***B*** **0*B*1*B*2*B*3*B*4*B*5*B*6*B*7*B*8** f0g f0,1g f0,1,2g f0,1,3g f0,1,3,4g f0,1,5g f0,1,5,6g f0,1,5,7g f0,1,5,8g To compute these sets, the compiler can solve the following data-flow problem:
0 1 \ Dom*.n/* Df*n*g[ @ Dom*.m/*A *m* 2*preds.n/*

with the initial conditions that Dom(*n*0) Df*n*0g, and 8*n* 6D *n*0, Dom(*n*) D*N*, where *N* is the set of all nodes in the cfg. These equations concisely cap- ture the notion of dominance. Given an arbitrary flow graph—that is, a directed graph with a single entry and a single exit—the equations will cor- rectly compute the Dom set for each node. Because they compute Dom(*n*) as a function of *n*’s predecessors, denoted *preds*(*ni*), these equations form a forward data-flow problem.

**DOM(*n*)**

**9.2** *Iterative Data-Flow Analysis* **479**

|n jN j|-1||
|---|---|---|
|Dom(0)|f0g||
|for i|1 to n||
|Dom(i)|N||
|changed while (changed)|true||
|changed|false||
|for i|1 to|n T|
|temp|fig [|(j 2preds.i /|
|if|temp 6D Dom(i) changed|Dom(i) then temp true|

Dom*( j ))*

n **FIGURE 9.1** Iterative Solver for Dominance.

To use the equations, the compiler can use the same three-step procedure used for live analysis in Section 8.6.1. It must (1) build a cfg, (2) gather initial information for each block, and (3) solve the equations to produce the Dom sets for each block. For Dom, step 2 is trivial. Recall that the equations for LiveOut used two sets per block: UEVar(*b*) and VarKill(*b*). Since dominance deals only with the structure of the graph and not with the behav- ior of the code in each block, the only local information needed for a block *bi*is its name, *i*.

Figure 9.1 shows a round-robin iterative solver for the dominance equations.

It considers the nodes in order by their cfg name, *B*0, *B*1, *B*2, and so on. It initializes the Dom set for each node, then repeatedly recomputes those Dom sets until they stop changing. It produces the following values in the Dom sets for our example:

|||||DOM(|n)||||
|---|---|---|---|---|---|---|---|---|
|B 0|B 1|B 2|B 3|B 4|B 5|B 6|B 7|B 8|

— f0g *N N N N N N N N* 1 f0g f0,1g f0,1,2g f0,1,2,3g f0,1,2,3,4g f0,1,5g f0,1,5,6g f0,1,5,6,7g f0,1,5,8g 2 f0g f0,1g f0,1,2g f0,1,3g f0,1,3,4g f0,1,5g f0,1,5,6g f0,1,5,7g f0,1,5,8g 3 f0g f0,1g f0,1,2g f0,1,3g f0,1,3,4g f0,1,5g f0,1,5,6g f0,1,5,7g f0,1,5,8g

The first column shows the iteration number; the row marked with a dash shows the initial values for the Dom sets. The first iteration computes correct Dom sets for any node with a single path from *B*, but computes overly large Dom sets for *B*

|, B, and B|. In the second iteration, the smaller Dom set for|
|---|---|
|3 4|7|
||3|

*B* corrects the set for *B*, which, in turn shrinks Dom(*B*). Similarly, the set

##### 480 CHAPTER 9 Data-Flow Analysis

for *B*8corrects the set for *B*7. The third iteration is required to recognize that the algorithm has reached a fixed point. Note that the final Dom sets agree with our earlier table.

Three critical questions arise regarding this solution procedure. First, does the algorithm halt? It iterates until the Dom sets stop changing, so the argu- ment for termination is not obvious. Second, does it produce correct Dom sets? The answer is critical if we are to use Dom sets in optimization. Finally, how fast is the solver? Compiler writers should avoid algorithms that are unnecessarily slow.

##### Termination

Iterative calculation of the Dom sets halts because the sets that approximate Dom shrink monotonically throughout the computation. The algorithm ini- tializes the Dom set for *n*0to f0g, for the entry node *n*0, and it initializes all the other Dom sets to *N*, the set of all nodes. A Dom set can be no smaller than one node name and can be no larger than j*N*j. Careful reasoning about the while loop shows that a Dom set, say Dom(*ni*), cannot grow from itera- tion to iteration. Either it shrinks, as the Dom set of one of its predecessors shrinks, or it remains unchanged.

The while loop halts as soon as it makes a pass over the nodes in which no Dom set changes. Since the Dom sets can only change by shrinking and the Dom sets are bounded in size, the while loop must eventually halt. When it halts, it has found a fixed point for this particular instance of the Dom computation.

##### Correctness

Recall the definition of a dominator. Node *ni*dominates *nj*if every path from the entry node *n*0to *nj*contains *ni*. Dominance is a property of paths in the cfg.

Dom(*nj*) contains *i* if and only if *i* 2 Dom(*nk*) for all *k* 2 *preds*( *j*), or if *i* D *j*. The algorithm computes Dom(*nj*) as the intersection of the Dom sets of all *nj*’s predecessors, plus *nj*itself. How does this local computation over indi- vidual edges relate to the dominance property defined over all paths through the cfg?

**Meet operator** The Dom sets computed by the iterative algorithm form a fixed-point solu- In the theory of data-flow analysis, the*meet* tion to the equations for dominance. The theory of iterative data-flow *operator*is used to combine facts at the analysis, which is beyond the scope of this text, assures us that a fixed point confluence of two paths. exists for these particular equations and that the fixed point is unique [210]. The all-paths solution of the definition is also a fixed-point for the equa- tions, called the *meet-over-all-paths* solution. The uniqueness of the fixed

**9.2** *Iterative Data-Flow Analysis* **481**
point guarantees that the solution found by the iterative algorithm is the meet-over-all-paths solution.

##### Efficiency

The uniqueness of the fixed-point solution to the Dom equations for a spe- cific cfg ensures that the solution is independent of the order in which the solver computes those sets. Thus, the compiler writer is free to choose an order of evaluation that improves the analyzer’s running time.

A *reverse postorder* (rpo) traversal of the graph is particularly effective for the iterative algorithm. A postorder traversal visits as many of a node’s children as possible, in a consistent order, before visiting the node. (In a cyclic graph, a node’s child may also be its ancestor.) An rpo traversal is the opposite—it visits as many of a node’s predecessors as possible before visiting the node itself. A node’s rpo number is simply j*N*jC 1 minus its postorder number, where *N* is the set of nodes in the graph. Most inter- esting graphs will have multiple reverse postorder numberings; from the perspective of the iterative algorithm, they are equivalent.

For a forward data-flow problem, such as Dom, the iterative algorithm should use an rpo computed on the cfg. For a backward data-flow prob- lem, such as LiveOut, the algorithm should use an rpo computed on the *reverse* cfg.

To see the impact of ordering, consider the impact of an rpo traversal on our example Dom computation. One rpo numbering for the example cfg is:

***B*** **0*B*1*B*2*B*3*B*4*B*5*B*6*B*7*B*8** **RPO(*n*)** 0 1 6 7 8 2 4 5 3

Visiting the nodes in this order produces the following iterations and values:

4 @ @R 2 3 @ @R 1 Postorder

1 @ 3 @R 2

@ @R 4 Reverse Postorder

##### Postorder number

Label the nodes in the graph with their visitation order in a postorder traversal.

##### Reverse CFG

The CFG with its edges reversed; the compiler may need to add a unique exit node so that the reverse CFG has a unique entry node.

|||DOM(|n)|
|---|---|---|---|
|B₀ B₁|B₂ B₃|B₄|B₅ B₆ B₇ B₈|

— f0g *N N N N N N N* 1 2

Working in rpo, the algorithm computes accurate Dom sets for this graph on the first iteration and halts after the second iteration. Using rpo, the algo- rithm halts in two passes over the graph rather than three. As we shall see, it does not compute accurate Dom sets in the first pass for all graphs.

*B*0 ?? *B₁* @R *B*2*B*5 B @R B*B*6*B*8 B @R *N* B *B₇* BN *B*3 ? *B*4

f0g f0,1g f0,1,2g f0,1,3g f0,1,3,4g f0,1,5g f0,1,5,6g f0,1,5,7g f0,1,5,8g f0g f0,1g f0,1,2g f0,1,3g f0,1,3,4g f0,1,5g f0,1,5,6g f0,1,5,7g f0,1,5,8g

##### 482 CHAPTER 9 Data-Flow Analysis

*B₀* As a second example, consider the cfg shown in the margin. Its structure is S more complex than the earlier cfg. It has two loops, (*B₂*,*B₃*) and (*B₃*,*B₄*), / SSw with multiple entries. In particular, (*B₂*,*B₃*) has entries from both (*B₀*,*B₁*,*B₂*) *B*1*B*5 S and (*B₀*,*B₅*,*B₃*), while (*B₃*,*B₄*) has entries from (*B₀*,*B₅*,*B₃*) and (*B₀*,*B₅*,*B₄*). ? / SSw This property makes the graph more difficult to analyze (see Section 9.5.1). *B₂*<u>-</u>*B₃*<u>-</u>*B₄* To apply the iterative algorithm, we need a reverse postorder numbering. One rpo numbering for this cfg is:

***B*** **0*B*1*B*2*B*3*B*4*B*5** **RPO(*n*)** 0 2 3 4 5 1

With this rpo numbering, the algorithm executes the following iterations:

|||DOM(|n)|||
|---|---|---|---|---|---|
|B 0|B 1|B 2|B 3|B 4|B 5|

— f0g *N N N N N* 1 f0g f0,1g f0,1,2g f0,3g f0,4g f0,5g

|1|f0g|f0,1g|f0,1,2g|f0,3g|f0,4g|f0,5g|
|---|---|---|---|---|---|---|
|2|f0g|f0,1g|f0,2g|f0,3g|f0,4g|f0,5g|
|3|f0g|f0,1g|f0,2g|f0,3g|f0,4g|f0,5g|

The algorithm requires two iterations to compute the correct Dom sets. The final iteration recognizes that the computation has reached a fixed point.

The dominance calculation relies only on the structure of the graph. It ignores the behavior of the code in any of the cfg’s blocks. As such, it might be considered a form of control-flow analysis. Most data-flow prob- lems involve reasoning about the behavior of the code and the flow of data between operations. As an example of this kind of calculation, we will revisit the analysis of live variables.

9.2.2 **Live-Variable Analysis** In Section 8.6.1, we used the results of live analysis to identify uninitialized variables. Compilers use live information for many other purposes, such as register allocation and construction of some variants of ssa form. We formulated live analysis as a global data-flow problem with the equation:
[ LiveOut*.n/* D*.*UEVar*.m/* [*.*LiveOut*.m/* \ VarKill*.m///* *m succ.n/*

and the initial condition that LiveOut(*n*) D;, 8*n*.

**9.2** *Iterative Data-Flow Analysis* **483**
##### NAMING SETS IN DATA-FLOW EQUATIONS

In writing the data-flow equations for classic problems, we have renamed many of the sets that contain local information. The original papers used more intuitive set names. Unfortunately, those names clash with each other across problems. For example, available expressions, live variables, reach- ing definitions, and anticipable expressions all use some notion of a *kill* set. These four problems, however, are defined over three distinct domains: expressions (AVAILOUT and ANTOUT), definition points (REACHES), and vari- ables (LIVEOUT). Thus, using a single set name, such as KILL or KILLED, leads to confusion across problems.

The names that we have adopted encode both the domain and a hint as to the set’s meaning. Thus, VARKILL(*n*) contains the set of variables killed in block *n*, while EXPRKILL(*n*) contains the set of expressions killed in the same block. Similarly, UEVAR(*n*) contains the set of upward-exposed variables in block *n*, while UEEXPR(*n*) contains the set of upward-exposed expressions. While these names are somewhat awkward, they make explicit the distinction between the notion of kill used in available expressions (EXPRKILL) and the one used in reaching definitions (DEFKILL).

Comparing the equations for LiveOut and Dom reveals differences between the problems. LiveOut is a backward data-flow problem, in that LiveOut(*n*) is computed as a function of the information known on entry to each of *n*’s successors in the cfg. Dom is a forward data-flow problem, in that Dom(*n*) is computed as a function of the information known at the end of each of *n*’s predecessors in the cfg. LiveOut looks for a future use on *any path* in the cfg; thus, it joins information from multiple paths with the union operator. Dom looks for predecessors that lie on *all paths* from the entry node; thus it joins information from multiple paths with the intersec- tion operator. Finally, LiveOut reasons about the effects of operations. For this reason, it uses the block-specific constant sets UEVar and VarKill that are derived from the code for each block. By contrast, Dom only deals with the cfg’s structure. Accordingly, its block-specific constant set contains only the name of the block.

Despite these differences, the framework for solving an instance of LiveOut is the same as for an instance of Dom. The compiler must:

**1.** Perform control-flow analysis to build a cfg, as in Figure 5.6 on page 241.
**2.** Compute the values of the initial sets, as in Figure 8.14a on page 447.
**3.** Apply the iterative algorithm, as in Figure 8.14b on page 447.

##### 484 CHAPTER 9 Data-Flow Analysis

|B|||B|
|---|---|---|---|
|0: i|1|return|0|
|1: a||5: a|1|
|c||d||
|(a|c)|(a||
|b c||d||
|d||b||
|y|a + b|8: c||
|z|c + d||3|
|i|i + 1|||
|(i|100)||4|

##### ! B₁ B₄:

?? *B B B* @R *<*! *B₂*,*B₅* d)! *B₆*,*B₈ B₂ B₅* *B₂*: *B₆*: B @R ! *B₇* B*B₆ B₈* B @R ! *B₃ B₇*: *B₇* ! *B₃* B *B₃*:BN *B* *B* ! *B₇* ! *B₁*,*B₄* *B* ?

(a) Code for the Basic Blocks (b) Control-Flow Graph ***B*** **0*B*1*B*2*B*3*B*4*B*5*B*6*B*7*B*8**
**UEVAR**;;; fa,b,c,d,ig ;;;;; **VARKILL** fig fa,cg fb,c,dg fy,z,ig<u>;</u> fa,dg fdg fbg fcg

(c) Initial Information
n **FIGURE 9.2** Live Analysis Example.

To see the issues that arise in solving instances of LiveOut, consider the example in Figure 9.2. It fleshes out the example cfg that we have used throughout this chapter. Figure 9.2a shows code for each basic block.

Figure 9.2b shows the cfg and Figure 9.2c shows the UEVar and VarKill

sets for each block.

Figure 9.3 shows the progress of the iterative solver on the example from

Figure 9.2, using the same rpo that we used in the Dom computation,

namely *B*0, *B*1, *B*5, *B*8, *B*6, *B*7, *B*2, *B*3, *B*4. Although the equations for LiveOut are more complex than those for Dom, the arguments for termi- nation, correctness, and efficiency are similar to those for the dominance equations.

##### Termination

Recall that in DOM the sets shrink monotonically. Iterative live-variable analysis halts because the sets grow monotonically. Each time that the algorithm evaluates the LiveOut equation at a node in the cfg, that LiveOut set either grows or it remains the same. The equation cannot shrink the LiveOut set. On each iteration, one or more LiveOut sets grows in size, unless they all remain unchanged. Once the complete set of LiveOut sets remain unchanged in one iteration, they will not change in subsequent iterations. It will have reached a fixed point.

**9.2** *Iterative Data-Flow Analysis* **485**

||||||LIVEOUT(n)||||
|---|---|---|---|---|---|---|---|---|
|B 0|B 1|B 2|B 3|B 4|B 5|B 6|B 7|B 8|

—;;;;;;;;; 1;; fa,b,c,d,ig;;;; fa,b,c,d,ig; 2; fa,ig fa,b,c,d,ig fig;; fa,c,d,ig fa,b,d,c,ig fa,c,d,ig 3 fig fa,ig fa,b,c,d,ig fig; fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig

|3 fig|fa,ig|fa,b,c,d,ig fig|;|fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig||||
|---|---|---|---|---|---|---|---|
|4 fig fa,c,ig fa,b,c,d,ig fig|||;|fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig||||
|5 fig fa,c,ig fa,b,c,d,ig fig|||;|fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig||||

n **FIGURE 9.3** Progress of the Iterative Live Solver on the Example From Figure 9.2.

We know that the algorithm will reach a fixed point because the LiveOut sets are finite. The size of any LiveOut set is bounded by the number of variables, j*V*j; any LiveOut set is either *V* or a proper subset of *V*. In the *V* is fa, b, c, d, i, y, zg in the code from worst case, one LiveOut set would grow by one element in each iteration; Figure 9.2. j*V*j is seven. that behavior would halt after *n* j*V*j iterations, where *n* is the number of nodes in the cfg.

This property, the termination of the iterative algorithm because of the com- bination of monotonicity and the finite number of possible values for the underlying sets, is often called the *finite descending chain property*. In the dominance problem, the Dom sets shrink monotonically and the Dom sets are bounded by the number of nodes in the cfg. That combination, monotonicity and bounded size, again guarantees termination.

##### Correctness

Iterative live analysis is correct if and only if it finds all the variables that satisfy the definition of liveness at the end of each block. Recall the defini- tion: A variable *v* is *live* at point *p* if and only if there is a path from *p* to a use of *v* along which *v* is not redefined. Thus, liveness is defined in terms of paths in the cfg. A path that contains no definitions of *v* must exist from *p* to a use of *v*. We call such a path a *v*-clear path.

LiveOut(*n*) should contain *v* if and only if *v* is live at the end of block *n*. To form LiveOut(*n*), the iterative solver computes the contribution to LiveOut(*n*) of each successor of *n* in the cfg. It combines these contribu- tions using union because *v* 2 LiveOut*.n/* if *v* is live on *any* path leaving *n*. How does this local computation over individual edges relate to liveness defined over all paths?

The LiveOut sets computed by the iterative solver are a fixed-point solu- tion to the live equations. Again, the theory of iterative data-flow analysis

##### 486 CHAPTER 9 Data-Flow Analysis

##### STATIC ANALYSIS VERSUS DYNAMIC ANALYSIS

The notion of static analysis leads directly to the question, What about dynamic analysis? By definition, static analysis tries to estimate, at compile time, what will happen at runtime. In many situations, the compiler cannot tell what will happen, even though the answer might be obvious with knowledge of one or more runtime values.

##### Consider, for example, the C fragment

x = y * z + 12; *p = 0; q = y * z + 13;

It contains a redundant expression, y * z, if and only if p does not contain the address of either y or z. At compile time, the value of p and the address of y and z may be unknown. At runtime, they are known and can be tested. Testing these values at runtime would allow the code to avoid recomputing y * z, where compile-time analysis might be unable to answer the question.

However, the cost of testing whether p == &y or p == &z or neither and acting on the result is likely to exceed the cost of recomputing y * z. For dynamic analysis to make sense, it must be a priori profitable—that is, the savings must exceed the cost of the analysis. This happens in some cases; in most cases, it does not. In contrast, the cost of static analysis can be amortized over multiple runs of the executable code, so it is more attractive, in general.

assures us that these particular equations have a unique fixed point [210]. The uniqueness of the fixed point guarantees that the fixed-point solution computed by the iterative algorithms is identical to the meet-over-all-paths solution called for by the definition.

##### Efficiency

It is tempting to think that RPO on the reverse CFG For a backward problem, such as LiveOut, the solver should use an rpo is equivalent to reverse preorder on the CFG. traversal on the reverse cfg, as shown in Figure 9.4. The iterative evaluation See Exercise 4 at the end of the chapter for a shown earlier used rpo on the cfg. For the example cfg, one rpo on the counter-example. reverse cfg is

***B B B B B B B B B***

**RPO(*n*)**

**9.2** *Iterative Data-Flow Analysis* **487**
*for i 0 to* j*N* j*-1* LiveOut*( i )*; *changed true* *while (changed)* *changed false* *for i 1 to* j*N* j*-1* *j RPO[i] // Computed on reverse CFG* S LiveOut*(j) k*2*succ(j)* UEVar*(k)* [ *(*LiveOut*(k)* \ VarKill*(k) )* *if* LiveOut*( j ) has changed then* *changed true*

n **FIGURE 9.4** Round-Robin, Reverse Postorder Solver for LIVEOUT.

||||||LIVEOUT(n)||||
|---|---|---|---|---|---|---|---|---|
|B 0|B 1|B 2|B 3|B 4|B 5|B 6|B 7|B 8|

—;;;;;;;;; 1 fig fa,c,ig fa,b,c,d,ig;; fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig 2 fig fa,c,ig fa,b,c,d,ig fig; fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig 3 fig fa,c,ig fa,b,c,d,ig fig; fa,c,d,ig fa,c,d,ig fa,b,c,d,ig fa,c,d,ig

n **FIGURE 9.5** Iterations of Live Analysis Using RPO on the Reverse CFG.

Visiting the nodes in rpo on the reverse cfg produces the iterations shown in Figure 9.5. Now, the algorithm halts in three iterations, rather than the five iterations required with a traversal ordered by rpo on the cfg. Comparing this table against the earlier computation, we can see why. On the first itera- tion, the algorithm computed correct LiveOut sets for all nodes except *B*3. It took a second iteration for *B*3because of the back edge—the edge from *B*3to *B*1. The third iteration is needed to recognize that the algorithm has reached its fixed point.

9.2.3 **Limitations on Data-Flow Analysis** There are limits to what a compiler can learn from data-flow analysis. In some cases, the limits arise from the assumptions underlying the analysis. In other cases, the limits arise from features of the language being analyzed. To make informed decisions, the compiler writer must understand what data- flow analysis can do and what it cannot do.

##### 488 CHAPTER 9 Data-Flow Analysis

x f(17) *B*0x f(17) (y*<*x) if (y *<* x) then

|if (y|x)|then||||
|---|---|---|---|---|---|
|z|x +|3||1 z|x + 3|
|x|0||2 x|0||

<u>?</u> *B* ? *B*

(a) Simple If-Then Construct (b) Corresponding Control-Flow Graph
n **FIGURE 9.6** Control Flow Limits the Precision of Data-Flow Analysis.

When it computes the LiveOut set for a node *n* in the cfg, the iterative algo- rithm uses the sets LiveOut, UEVar, and VarKill for all of *n*’s successors in the cfg. This implicitly assumes that execution can reach all of those suc- cessors; in practice, one or more of them may not be reachable. Consider the code fragment shown in Figure 9.6 along with its cfg.

The assignment to x in *B*0is live because of the use of x in *B*1. The assign- ment to x in *B*2kills the value set in *B*0. If *B*1cannot execute, then x’s value from *B*0is not live past the comparison with y, and x 2*=* LiveOut(*B*0). If the compiler can prove that the test (y *<* x) is always false, then control will never transfer to block *B*1and the assignment to z will never execute. If the call to f has no side effects, the entire statement in *B*0is useless and need not be executed. Since the test’s result is known, the compiler can completely eliminate both blocks *B*0and *B*1.

The equations for LiveOut, however, take the union over all successors of the block, not just the block’s executable successors. Thus, the analyzer computes LiveOut(*B*0) as S UEVar*.B₁/* [*.*LiveOut*.B₁/*\ VarKill*.B₁//*

##### UEVar.B₂/ [.LiveOut.B₂/\ VarKill.B₂//

Data-flow analysis assumes that all paths through the cfg are feasible. Thus, the information that they compute summarizes the possible data-flow events, assuming that each path can be taken. This limits the precision of the result- ing information; we say that the information is precise “up to symbolic execution.” With this assumption, x 2 LiveOut(*B*0) and both *B*0and *B*1 must be preserved.

Another way that imprecision creeps into the results of data-flow analy- sis comes from the treatment of arrays, pointers, and procedure calls. An array reference, such as A[i,j,k], refers to a single element of A. How- ever, without analysis that reveals the values of i, j, and k, the compiler cannot tell which element of A is being accessed. For this reason, compilers have traditionally lumped together all references to an array A. Thus, a use

**9.2** *Iterative Data-Flow Analysis* **489**
of A[x,y,z] counts as a use of A, and a definition of A[c,d,e] counts as a definition of A.

Some care must be taken, however, to avoid making too strong an infer- ence. The compiler, knowing that its information on arrays is imprecise, must interpret that information conservatively. Thus, if the goal of the anal- ysis is to determine where a value is no longer live (that is, the value must have been killed), a definition of A[i,j,k] does not kill the value of A. If the goal is to recognize where a value *might* not survive, then a definition of A[i,j,k] *might* define any element of A.

Pointers add another level of imprecision to the results of static analysis. Explicit arithmetic on pointers makes matters worse. Without an analysis that specifically tracks the values of pointers, the compiler must interpret an assignment to a pointer-based variable as a potential definition for every variable that the pointer might reach. Type safety can limit the set of objects potentially defined by an assignment through a pointer; a pointer declared as pointing to an object of type *t* can only be used to modify objects of type *t*. Without analysis of pointer values or a guarantee of type safety, assignment to a pointer-based variable can force the analyzer to assume that every vari- able has been modified. In practice, this effect often prevents the compiler from keeping the value of a pointer-based variable in a register across any pointer-based assignment. Unless the compiler can specifically prove that the pointer used in the assignment cannot refer to the memory location cor- responding to the enregistered value, it cannot safely keep the value in a register.

The complexity of analyzing pointer use leads many compilers to avoid keeping values in registers if they can be the target of a pointer. Usually, some variables can be exempted from this treatment—such as a local vari- able whose address has never been explicitly taken. The alternative is to per- form data-flow analysis aimed at disambiguating pointer-based references— reducing the set of possible variables that a pointer might reference at each point in the code. If the program can pass pointers as parameters or use them as global variables, pointer disambiguation becomes inherently inter- procedural.

Procedure calls provide a final source of imprecision. To understand the data flow in the current procedure, the compiler must know what the callee can do to each variable that is accessible to both caller and callee. The callee may, in turn, call other procedures that have their own potential side effects.

Unless the compiler computes accurate summary information for each procedure call, it must estimate their worst-case behavior. While the specific

##### 490 CHAPTER 9 Data-Flow Analysis

assumptions vary from problem to problem, the general rule is to assume that the callee both uses and modifies every variable that it can address and that call-by-reference parameters create ambiguous references. Since few procedures exhibit this behavior, this assumption typically overestimates the effects of a call and introduces further imprecision into the results of data-flow analysis.

9.2.4 **Other Data-Flow Problems** Compilers use data-flow analyses to prove the safety of applying transforma- tions in particular situations. Thus, many distinct data-flow problems have been proposed, each to drive a particular optimization.
##### Available Expressions

To identify redundant expressions, the compiler can compute information about the *availability* of expressions. An expression *e* is *available* at point *p* in a procedure if and only if on every path from the procedure’s entry to *p*, *e* is evaluated and none of its constituent subexpressions is redefined between that evaluation and *p*. This analysis annotates each node *n* in the cfg with a set AvailIn(*n*), which contains the names of all expressions in the procedure that are available on entry to the block corresponding to *n*. To compute AvailIn, the compiler initially sets

##### AvailIn.n0/ D;

##### AvailIn.n/ Dfall expressionsg, 8n 6D n0

##### Next, it solves the following equations:

\ AvailIn*.n/* D*.*DEExpr*.m/* [*.*AvailIn*.m/* \ ExprKill*.m///* *m*2*preds.n/*

Here, DEExpr(*n*) is the set of downward exposed expressions in *n*. An expression *e* 2 DEExpr(*n*) if and only if block *n* evaluates *e* and none of *e*’s operands is defined between the last evaluation of *e* in *n* and the end of *n*. ExprKill(*n*) contains all those expressions that are “killed” by a defi- nition in *n*. An expression is killed if one or more of its operands are redefined in the block. Note that the equation defines a forward data-flow problem.

An expression *e* is available on entry to *n* if and only if it is available on exit from each of *n*’s predecessors in the cfg. As the equation states, an expression *e* is available on exit from some block *m* if one of two conditions

**9.2** *Iterative Data-Flow Analysis* **491**
holds: either *e* is downward exposed in *m*, or it is available on entry to *m* and is not killed in *m*.

AvailIn sets can be used to perform global redundancy elimination, some- times called *global common subexpression elimination*. Perhaps the simplest way to achieve this effect is to compute AvailIn sets for each block and use them in local value numbering (see Section 8.4.1). The compiler can simply initialize the hash table for a block *b* to AvailIn(*b*) before value numbering*b*. Lazy code motion is a stronger form of common subexpression elimination that also uses availability (see Section 10.3.1).

##### Reaching Definitions

In some cases, the compiler needs to know where an operand was defined. If multiple paths in the cfg lead to the operation, then multiple definitions may provide the value of the operand. To find the set of definitions that reach a block, the compiler can compute *reaching definitions*. The domain of Reaches is the set of definitions in the procedure. A definition *d* of some variable *v reaches* operation *i* if and only if *i* reads the value of *v* and there exists a path from *d* to *i* that does not define *v*.

The compiler annotates each node *n* in the cfg with a set Reaches*.n/*, computed as a forward data-flow problem:

Reaches(*n*) D;, 8*n* [ Reaches*.n/* D*.*DEDef*.m/*[*.*Reaches*.m/* \ DefKill*.m///* *m* 2*preds.n/*

DEDef*.m/* is the set of downward-exposed definitions in *m*: those defini- tions in *m* for which the defined name is not subsequently redefined in *m*. DefKill*.m/* contains *all* the definition points that are obscured by a defini- tion of the same name in *m*; *d* 2 DefKill*.m/* if <u>d</u> defines some name *v* and *m* contains a definition that also defines *v*. Thus DefKill*.m/* consists of the definition points that are not obscured in *m*.

DEDef and DefKill are both defined over the set of definition points, but computing each of them requires a mapping from names (variables and compiler-generated temporaries) to definition points. Thus, gathering the ini- tial information for reaching definitions is more complex than it is for live variables.

##### Anticipable Expressions

An expression *e* is considered *anticipable*, or *very busy*, on exit from block *b* if and only if (1) every path that leaves *b* evaluates and subsequently uses *e*, and (2) evaluating *e* at the end of *b* would produce the same result as

##### 492 CHAPTER 9 Data-Flow Analysis

##### IMPLEMENTING DATA-FLOW FRAMEWORKS

The equations for many global data-flow problems show a striking similar- ity. For example, available expressions, live variables, reaching definitions, and anticipable expressions all have propagation functions of the form *f*(*x*) D *c₁ op₁* (*x op₂ c₂*) where *c₁* and *c₂* are constants determined by the actual code and *op₁* and *op₂* are standard set operations such as [ and \. This similarity shows up in the problem descriptions. It should also show up in their implementations.

The compiler writer can easily abstract away the details in which these problems differ and implement a single, parameterized analyzer. The analyzer needs functions to compute *c₁* and *c₂*, implementations of the operators, and an indication of the problem’s direction. In return, it produces the desired data-flow information.

This implementation strategy encourages code reuse. It hides the low-level details of the solver. At the same time, it creates a situation in which the compiler writer can profitably invest effort in optimizing the implemen- tation. For example, a scheme that allows the framework to implement *f*(*x*) D *c₁ op₁* (*x op₂ c₂*) as a single function may outperform an implemen- tation that uses *f₁*(*x*) D *c₁ op₁ x* and *f₂*(*x*) D *x op₁ c₂* and computes *f*(*x*) as *f₁*(*f₂*(*x*)). This scheme lets all the client transformations benefit from optimizing set representations and operator implementations.

the first evaluation of *e* along each of those paths. The term “anticipable” derives from the second condition, which implies that an evaluation of *e* at *b* anticipates the subsequent evaluations along all paths. The set of expressions anticipable on output from a block can be computed as a backward data-flow problem on the cfg. The domain of the problem is the set of expressions.

AntOut(*nf*) D;

AntOut(*n*) Df *all expressions* g, 8*n* 6D *nf* \ AntOut*.n/* D*.*UEExpr*.m/*[*.*AntOut*.m/* \ ExprKill*.m///* *m* 2*succ.n/*

Here UEExpr*.m/* is the set of upward-exposed expressions—those used in *m* before they are killed. ExprKill*.m/* is the set of expressions defined in *m*; it is the same set that appears in the equations for available expressions.

The results of anticipability analysis are used in code motion both to decrease execution time, as in lazy code motion, and to shrink the size of the compiled code, as in code hoisting. Both transformations are discussed in Section 10.3.

**9.2** *Iterative Data-Flow Analysis* **493**
##### Interprocedural Summary Problems

When analyzing a single procedure, the compiler must account for the impact of each procedure call. In the absence of specific information about the call, the compiler must make worst-case assumptions that account for all the possible actions of the callee, or any procedures that it, in turn, calls. These worst-case assumptions can seriously degrade the quality of the global data-flow information. For example, the compiler must assume that the callee modifies every variable that it can access; this assumption essen- tially stops the propagation of facts across a call site for all global variables, module-level variables, and call-by-reference parameters.

To limit such impact, the compiler can compute summary information on each call site. The classic summary problems compute the set of variables that might be modified as a result of the call and that might be used as a result of the call. The compiler can then use these computed summary sets in place of its worst case assumptions.

The *interprocedural may modify problem* annotates each call site with a set of names that the callee, and procedures it calls, might modify. May modify is one of the simplest problems in interprocedural analysis, but it can have a significant impact on the quality of information produced by other analyses, such as global constant propagation. May modify is posed as a set of data- flow equations over the program’s call graph that annotate each procedure with a MayMod set.

0 1 [ MayMod*. p/* D LocalMod*. p/* [ @ *unbinde.*MayMod*.q//*A *e*D*. p*,*q/*

where *e* D*. p*,*q/* is an edge from *p* to *q* in the call graph. The function **Flow insensitive** *unbinde*maps one set of names into another. For a call-graph edge *e*D (*p*,*q*), This formulation of MAYMOD ignores control flow *unbinde*(*x*) maps each name in *x* from the name space of *q* to the name space inside procedures. Such a formulation is said to be*flow insensitive*. of *p*, using the bindings at the specific call site that corresponds to *e*. Finally, LocalMod(*p*) contains all the names modified locally in *p* that are visible outside *p*. It is computed as the set of names defined in *p* minus any names that are strictly local to *p*.

To solve for MayMod, the compiler can set MayMod(*p*) to LocalMod(*p*), for all procedures *p*, and then iteratively evaluate the equation for MayMod until it reaches a fixed point. Given the MayMod sets for each procedure, the compiler can compute the set of names that might be modified at a spe- cific call, *e*D (*p*,*q*), by computing a set *S* as *unbinde*(MayMod(*q*)) and then adding to *S* any names that are aliased inside procedure *p* to names in *S*.

##### 494 CHAPTER 9 Data-Flow Analysis

The compiler can also compute information on what variables might be ref- erenced as a result of executing a procedure call, the *interprocedural may* *reference problem*. The equations to annotate each procedure *p* with a set MayRef(*p*) are similar to the equations for MayMod.

##### SECTION REVIEW

##### Iterative data-flow analysis works by repeatedly re-evaluating the

data-flow equation at each node in the underlying graph until the sets defined by the equations reach a fixed point. Many data-flow problems have a unique fixed point, which ensures a correct solution indepen- dent of the evaluation order evaluation, and the finite descending chain property, which guarantees termination independent of the evaluation order. Since the analyzer can choose any order, it should choose one that produces rapid termination. For most forward data-flow problems, that order is reverse postorder; for most backward problems, that order is reverse postorder on the reverse CFG. These orders force the iterative algorithm to evaluate as many predecessors (for forward problems) or successors (for backward problems) as possible before it evaluates a node *n*.

Many data-flow problems appear in the literature and in modern compilers. Examples include live analysis, used in register allocation; availability and anticipability, used in redundancy elimination and code motion; and interprocedural summary information, used to sharpen the results of single-procedure data-flow analysis. SSA form, described in the next section, provides a unifying structure that encodes both data-flow information, such as reaching definitions, and control-flow informa- tion, such as dominance. Many modern compilers use SSA form as an alternative to solving multiple distinct data-flow problems.

##### Review Questions

*B₀* S **1.** Compute DOM sets for the CFG shown in the margin, evaluating the / SSw nodes in the order f*B₄*, *B₂*, *B₁*, *B₅*, *B₃*, *B₀*g. Explain why this calcula- *B₁ B₅* tion takes a different number of iterations than the version shown on S page 482. ? / SSw *B₂*<u>-</u>*B₃*<u>-</u>*B₄* **2.** Before a compiler can compute interprocedural data-flow informa- tion, it must build a call graph for the program. Just as ambiguous jumps complicate CFG construction, so too can ambiguous calls com- plicate call-graph construction. What language features might lead to an ambiguous call site—one where the compiler was uncertain as to the identify of the callee?

**9.3** *Static Single-Assignment Form* **495**
9.3 **STATIC SINGLE-ASSIGNMENT FORM** Over time, many different data-flow problems have been formulated. If each transformation uses its own idiosyncratic analysis, the amount of time and effort spent implementing, debugging, and maintaining the analysis passes can grow unreasonably large. To limit the number of analyses that the com- piler writer must implement and that the compiler must run, it is desirable to use a single analysis to perform multiple transformations. One strategy for implementing such a “universal” analysis involves building a variant form of the program that encodes both data flow and control flow directly in the ir. ssa form, introduced in Sections 5.4.2 and 8.5.1, has this property. It can serve as the basis for a large set of transformations. From a single implementation that translates the code into ssa form, a compiler can perform many of the classic scalar optimizations. Consider the various uses of the variable x in the code fragment shown in
Figure 9.7a. The gray lines show which definitions can reach each use of x.

Figure 9.7b shows the same fragment, rewritten to convert x to ssa form.
 Definitions of x have been renamed, with subscripts, to ensure that each definition has a unique ssa name. For simplicity, we have left the references to other variables unchanged. The ssa form of the code includes new assignments (to x₃, x₅, and x₆) that reconcile the distinct ssa names for x with the uses of x (in the assignments to s and z). These assignments ensure that, along each edge in the cfg, the current value of x has been assigned a unique name, independent of which path brought control to the edge. The right sides of these assign- ments contain a special function, a-function, that combines the values from distinct edges. A-function takes as arguments the ssa names for the values associated with each edge that enters the block. When control enters a block, all the -functions in the block execute, concurrently. They evaluate to the argu- ment that corresponds to the edge along which control entered the block. Notationally, we write the arguments left-to-right to correspond to the edges left-to-right. On the printed page, this is easy. In an implementation, it requires some bookkeeping. The ssa construction inserts-functions after each point in the cfg where multiple paths converge—each join point. At join points, distinct ssa names must be reconciled to a single name. After the entire procedure has been converted to ssa form, two rules hold: (1) each definition in the proce- dure creates a unique name, and (2) each use refers to a single definition.

##### 496 CHAPTER 9 Data-Flow Analysis

x0 ← 17 - 4 x ← 17 - 4 x1 ← a+b

x ← a+b x2 ← y-z x ← y-z x3 ←*φ*(x2,x0)

x4 ← 13 x ← 13

x5 ←*φ*(x4,x3) z ← x × q z ← x5 × q

s ← w-x x6 ←*φ*(x1,x5) s ← w-x6

(a) Original Code Fragment (b) With x in SSA Form
n **FIGURE 9.7** SSA: Encoding Control Flow into Data Flow.

To transform a procedure into ssa form, the compiler must insert the appro- priate-functions for each variable into the code, and it must rename variables with subscripts to make the two rules hold. This simple, two-step plan produces the basic ssa construction algorithm.

9.3.1 **A Simple Method for Building SSA Form** To construct the ssa form of a program, the compiler must insert-functions at join points in the cfg, and it must rename variables and temporary values to conform with the rules that govern the ssa name space. The algorithm follows this outline:
**1.** *Inserting-functions* At the start of each block that has multiple predecessors, insert a-function, such as y (y,y), for every name y that the code either defines or uses in the current procedure. The -function should have one argument for each predecessor block in the cfg. This rule inserts a-function in every case where one is needed. It also inserts many extraneous-functions. The algorithm can insert the-functions in arbitrary order. The definition of-functions requires that all the-functions at the top of a block execute concurrently—that is, they all read their input parameters simultaneously, then write their output values simultaneously. This lets the algorithm avoid many minor details that an ordering might introduce.

**9.3** *Static Single-Assignment Form* **497**
**2.** *Renaming* After-functions have been inserted, the compiler can compute reaching definitions (see Section 9.2.4). Because the inserted-functions are also definitions, they ensure that only one definition reaches any use. Next, the compiler can rename each use, both the variables and the temporaries, to reflect the definition that reaches it. The compiler must sort out the definitions that reach each-function and make the names correspond to the paths along which they reach the block that contains the-function. While conceptually simple, this task requires some bookkeeping. This algorithm constructs a correct ssa form for the program. Each vari- able is defined exactly once, and each reference uses the name of a distinct definition. However, it produces ssa form that has, potentially, many more -functions than necessary. The extra-functions are problematic. They decrease the precision of some kinds of analysis when performed over ssa form. They occupy space, so the compiler wastes memory representing -functions that are either redundant (that is, xj(xi, xi)) or are not live. They increase the cost of any algorithm that uses the resulting ssa form, since it must traverse all the extraneous-functions. We call this version of ssa *maximal* ssa *form*. To build ssa form with fewer -functions requires more work; in particular, the compiler must analyze the code to determine where potentially distinct values converge in the cfg. This computation relies on the dominance information described in Section 9.2.1. The next three subsections present, in detail, an algorithm to build *semipruned* ssa *form*—a version with fewer-functions. Section 9.3.2 shows how dominance information introduced in Section 9.2.1 can be used to compute *dominance frontiers* to guide insertion of-functions. Section 9.3.3 gives an algorithm to insert-functions, and Section 9.3.4 shows how to rewrite variable names to complete the construction of ssa form. Section 9.3.5 discusses the difficulties that can arise in converting the code back into an executable form.
9.3.2 **Dominance Frontiers** The primary problem with maximal ssa form is that it contains too many -functions. To reduce their number, the compiler must determine more carefully where they are required. The key to placing-functions lies in understanding which variables need a-function at each join point. To solve this problem efficiently and effectively, the compiler can turn the question around. It can determine, for each block *i*, the set of blocks that will need a

##### 498 CHAPTER 9 Data-Flow Analysis

-function for any definition in block *i*. Dominance plays a critical role in this computation.

Consider a definition in node *n* of the cfg. That value could potentially reach every node *m* where *n* 2 Dom(*m*) without need for a-function, since every path that reaches *m* passes through *n*. The only way that the value does not reach *m* is if another definition of the same name intervenes—that is, it occurs in some node *p* between *n* and *m*. In this case, the definition in *n* does not force the presence of a-function; instead, the redefinition in *p* does.

A definition in node *n* forces a-function at join points that lie just out- side the region of the cfg that *n* dominates. More formally, a definition in node *n* forces a corresponding-function at any join point *m* where (1) *n* dominates a predecessor of *m* (*q* 2 *preds*(*m*) and *n* 2 Dom(*q*)), and (2) *n* **Strict dominance** does not *strictly dominate m*. (Using strict dominance rather than dominance *a*strictly dominates*b*if and only if allows a-function at the start of a single-block loop. In that case,*n* D *m*, and *a* 2 DOM(*b*) f*b*g.*m* 2*=* Dom(*n*) f*n*g.) We call the collection of nodes *m* that have this property with respect to *n* the *dominance frontier* of *n*, denoted df(*n*).

Informally, df(*n*) contains the first nodes reachable from *n* that *n* does not dominate, on each cfg path leaving *n*. In the cfg of our continuing exam-

3. On every

|ple, B dominates B|, B|, and B, but does not dominate B|
|---|---|---|
|5|6|7 8|
||5 3||
|5|3||

path leaving *B*, *B* is the first node that *B*5does not dominate. Thus, df(*B*) Df*B* g.

##### Dominator Trees

Before giving an algorithm to compute dominance frontiers, we must intro- **Dominator tree** duce one further notion, the *dominator tree*. Given a node *n* in a flow graph, a tree that encodes the dominance information the set of nodes that strictly dominate *n* is given by (Dom(*n*) *n*). The node for a flow graph in that set that is closest to *n* is called *n*’s immediate dominator, denoted IDom(*n*). The entry node of the flow graph has no immediate dominator.

The dominator tree of a flow graph contains every node of the flow graph. Its edges encode the IDom sets in a simple way. If *m* is IDom(*n*), then the dominator tree has an edge from *m* to *n*. The dominator tree for our example cfg appears in the margin. Notice that *B*6, *B*7, and *B*8are all children of *B*5, even though *B*7is not an immediate successor of *B*5in the cfg.

The dominator tree compactly encodes both the IDom information and the complete Dom sets for each node. Given a node *n* in the dominator tree, IDom(*n*) is just its parent in the tree. The nodes in Dom(*n*) are exactly the nodes that lie on the path from the root of the dominator tree to *n*,

**9.3** *Static Single-Assignment Form* **499**

|for all nodes,|n, in|the cfg|||
|---|---|---|---|---|
|df(n)|;||||
|for all nodes,|n, in|the cfg|||
|if n has|multiple|predecessors|then||
|for|each predecessor runner while runner df(runner) runner|p 6D IDom(n) IDom(runner)|p of n df(runner)|[ fng|

n **FIGURE 9.8** Algorithm for Computing Dominance Frontiers.

inclusive of both the root and *n*. From the tree, we can read the follow- ing sets:

***B₀ B₁ B₂ B₃ B₄ B₅ B₆ B₇ B₈***

**DOM** f0g f0,1g f0,1,2g f0,1,3g f0,1,3,4g f0,1,5g f0,1,5,6g f0,1,5,7g f0,1,5,8g **IDOM** — 0 1 1 3 1 5 5 5

These Dom sets match those computed earlier;—indicates an undefined value.

##### Computing Dominance Frontiers

To make-insertion efficient, we need to calculate the dominance frontier for each node in the flow graph. We could formulate a data-flow problem to compute df(*n*) for each *n* in the graph. Using both the dominator tree and the cfg, we can formulate a simple and direct algorithm, shown in Figure 9.8. Since only nodes that are join points in the cfg can be members of a domi- nance frontier, we first identify all of the join points in the graph. For a join point *j*, we examine each of its cfg predecessors.

The algorithm is based on three observations. First, nodes in a df set must be join points in the graph. Second, for a join point *j*, each predecessor *k* of *j* must have *j* 2 df(*k*), since *k* cannot dominate *j* if *j* has more than one predecessor. Finally, if *j* 2 df(*k*) for some predecessor *k*, then *j* must also be in df(*l*) for each *l* 2 Dom(*k*), unless *l* 2 Dom(*j*).

The algorithm follows these observations. It locates nodes *j* that are join points in the cfg. Then, for each predecessor *p* of *j*, it walks up the dominator tree from *p* until it finds a node that dominates *j*. From the second and third

*B₀* ?? *B*1 @R *B*2*B*5 B @R B*B*6*B*8 B @R B*B₇* BN *B*3

*B* ? 4

The Example CFG

*B*0 ? *B₁* H Hj *B₂ B₅* H Hj *B₆ B₈* ? *B₇* R *B*3 ? *B*4

Its Dominator Tree

##### 500 CHAPTER 9 Data-Flow Analysis

observations in the preceding paragraph, *j* belongs in df(*l*) for each node *l* that the algorithm traverses in this dominator-tree walk, except for the final node in the walk, since that node dominates *j*. A small amount of bookkeep- ing is needed to ensure that any *n* is added to a node’s dominance frontier only once.

To see how this works, consider again the example cfg and its dominance tree. The analyzer examines the nodes in some order, looking for nodes with multiple predecessors. Assuming that it takes the nodes in name order, it

|finds the join points as B||, then B, then B|.|||
|---|---|---|---|---|---|
|||1 3|7|||
|1||0||0|1|
|||||3|1|
||3|1|1|1|0|
|3||2|3|2|1|
||3|||7|3 7|
|||3|5||1|
|7||6|7|6|5|
||7|||8|7 8|

**1.** *B* For cfg-predecessor *B*, the algorithm finds that *B* is IDom(*B*), so it never enters the while loop. For cfg-predecessor *B*, it adds *B* to df(*B*) and advances to *B*. It adds *B* to df(*B*) and advances to *B*, where it halts.
**2.** *B* For cfg-predecessor *B*, it adds *B* to df(*B*), advances to *B* which is IDom(*B*), and halts. For cfg-predecessor *B*, it adds *B* to df(*B*) and advances to *B*5. It adds *B* to df(*B*) and advances to *B*, where it halts.
**3.** *B* For cfg-predecessor *B*, it adds *B* to df(*B*), advances to *B* which is IDom(*B*), and halts. For cfg-predecessor *B*, it adds *B* to df(*B*) and advances to *B*5, where it halts. Accumulating these results, we obtain the following dominance frontiers: ***B*** **0*B*1*B*2*B*3*B*4*B*5*B*6*B*7*B*8** **DF**<u>;</u> f*B₁*g f*B₃*g f*B₁*g<u>;</u> f*B₃*g f*B₇*g f*B₃*g f*B₇*g
9.3.3 **Placing-Functions** The naive algorithm placed a-function for every variable at the start of every join node. With dominance frontiers, the compiler can determine more precisely where-functions might be needed. The basic idea is simple. A definition of x in block *b* forces a-function at every node in df(*b*). Since that-function is a new definition of x, it may, in turn, force the insertion of additional-functions. The compiler can further narrow the set of-functions that it inserts. A vari- able that is only live within a single block can never have a live-function. To apply this observation, the compiler can compute the set of names that

**9.3** *Static Single-Assignment Form* **501**
*Globals*; *Initialize all the Blocks sets to*;

|Initialize|all the|Blocks sets|to;|||||||
|---|---|---|---|---|---|---|---|---|---|
|for each|block b|||||||||
|VarKill|;||||each name|x 2 Globals||||
|for|each operation assume that if y 2 = VarKill|i in opi is ‘‘x then|b, in order y|op z’’|WorkList for each for|Blocks(x) block b each block|2 WorkList d in df(b)|||
||Globals if z 2 = VarKill|Globals then|[ fyg|||if d has insert|no-function a-function|for x for x in|then d|
||Globals|Globals|[ fzg|||WorkList|WorkList|[ fdg||
||VarKill|VarKill [ fxg||||||||
||Blocks(x)|Blocks(x)|[ fbg|||||||

*for*

(a) Finding Global Names (b) Rewriting the Code
n **FIGURE 9.9**-Function Insertion.

are live across multiple blocks—a set that we will call the *global names*. It The word*global*is used here to mean of interest can insert-functions for those names and ignore any name that is not in that across the entire procedure. set. (This restriction distinguishes semipruned ssa form from other varieties of ssa form.)

The compiler can find the global names cheaply. In each block, it looks for names with upward-exposed uses—the UEVar set from the live-variables calculation. Any name that appears in one or more LiveOut sets must be in the UEVar set of some block. Taking the union of all the UEVar sets gives the compiler the set of names that are live on entry to one or more blocks and, hence, live in multiple blocks.

The algorithm, shown in Figure 9.9a, is derived from the obvious algo- rithm for computing UEVar. It constructs a single set, *Globals*, where the LiveOut computation must compute a distinct set for each block. As it builds the *Globals* set, it also constructs, for each name, a list of all blocks that contain a definition of that name. These block lists serve as an initial worklist for the-insertion algorithm.

The algorithm for inserting-functions is shown in Figure 9.9b. For each global name *x*, it initializes *WorkList* with *Blocks(x)*. For each block *b* on the *WorkList*, it inserts-functions at the head of every block *d* in *b*’s domi- nance frontier. Since all the-functions in a block execute concurrently, by definition, the algorithm can insert them at the head of *d* in any order. After

##### 502 CHAPTER 9 Data-Flow Analysis

*B*0: i 1 *B*4: return ! *B₁ B₀* *B₅*: a

|||a|
|---|---|---|
|a||d|
|c||(a|
|(a|c)|d|
|b|||
|c||b|
|d|||
|y|a + b|c|
|z|c + d||
|i|i + 1||
|(i|100)||

*B₁*:??

d)! *B₆*,*B₈ B₁*
*<*! *B₂*,*B₅ B₆*: @R *B₂*:! *B₇ B₂ B₅* *B₇*:B @R ! *B₃ B₆ B₈* ! *B₃*B *B₈*:B @R *B₃*:! *B₇* B*B*7 BN ! *B₁*,*B₄ B₃* ?

(a) Code for the Basic Blocks *B*4
(b) Control-Flow Graph

|B B B B B B B B B 0 1 2 3 4 5 6 7 DF; f B₁ g f B₃ g f B₁ g; f B₃ g f B₇ g f B₃ g f|8 B₇ g|
|---|---|
|(c) Dominance Frontiers in the CFG||
|a b c d i y z Blocks f1,5g f2,7g f1,2,8g f2,5,6g f0,3g f3g f3g||
 *B*0 ? *B*1 HHj *B₂ B₅* HHj *B*6*B*8 ? *B*7 R *B*3 ? *B*4
(d) *Blocks* Sets for Each Name (e) Dominator Tree
n **FIGURE 9.10** Example SSA for-function Insertion.

adding a-function for *x* to *d*, the algorithm adds *d* to the *WorkList* to reflect the new assignment to *x* in *d*.

##### Example

Figure 9.10 recaps our running example. Panel a shows the code; panel b

shows the cfg; panel c shows the dominance frontiers for each block; and panel e shows the dominator tree built from the cfg.

The first step in the-function insertion algorithm finds global names and computes the *Blocks* set for each name. For the code in Figures 9.10a, the global names are fa,b,c,d,ig. Figure 9.10d shows the *Blocks* sets. Notice that the algorithm creates *Blocks* sets for y and z, even though they are not in *Globals*. Separating the computation of *Globals* from that of

**9.3** *Static Single-Assignment Form* **503**
*B*0: i 1 ! *B₁ B₃*: a (a,a) *B*1: a (a,a) b (b,b)

|1: a|(a,a)|b|(b,b)|||
|---|---|---|---|---|---|
|b|(b,b)|c|(c,c)|6: d||
|c|(c,c)|d|(d,d)|||
|d|(d,d)|y|a + b|7: c|(c,c)|
|i|(i,i)|z|c + d|d|(d,d)|
|a c||i (i|i + 1 100)|b||
|(a|c)|return||c||
|b||a||||
|c||d||||
|d n FIGURE 9.11 Blocks would avoid instantiating these extra sets, at the cost of another pass||(a|d)|||

*B* ! *B₇* *B*

##### ! B₁,B₄! B₃

*<*! *B₂*,*B₅ B₄*: *B₈*: *B₂*: *B₅*:! *B₇*

##### ! B₆,B₈

##### ! B₃

##### Example Code with-Functions, Before Renaming.

##### over the code.

The-function rewrite algorithm works on a name-by-name basis. Consider its actions for the variable a in the example. It initializes the worklist to *Blocks(*a*)*, which contains*B*1and*B*5. The definition in*B*1causes it to insert a-function at the start of each block in df(*B*1) Df*B*1g. This action also

|enters B back into the worklist. Next, it removes B|||from the worklist and||
|---|---|---|---|---|
|1|||5||
|||5|3|3|
|3|3||||
||1|3||1|

1 5 inserts a-function in each block of df(*B*) Df*B* g. The insertion at *B* also places *B* on the worklist. When *B* comes off the worklist, it tries to add a -function in *B*1, because *B* 2 df*.B /*. The algorithm notices that *B* already has that-function, so it does not perform an insertion. Thus, pro- cessing of a halts with an empty worklist. The algorithm follows the same logic for each name in *Globals*, to produce the following insertions:

**a b c d i**

**-functions** f*B*1,*B*3g f*B*1,*B*3g f*B*1,*B*3,*B*7g f*B*1,*B*3,*B*7g f*B*1g

The resulting code appears in Figure 9.11.

Limiting the algorithm to global names lets it avoid inserting dead -functions for x and y in block *B*1. (*B*12 df*.B*3) and *B*3contains defini- tions of both x and y.) However, the distinction between local names and global names is not sufficient to avoid all dead-functions. For example, the -function for b in *B* is not live because b is redefined before its value is used. To avoid inserting these-functions, the compiler can construct

##### 504 CHAPTER 9 Data-Flow Analysis

##### THE DIFFERENT FLAVORS OF SSA FORM

Several distinct flavors of SSA form have been proposed in the literature. The flavors differ in their criteria for inserting-functions. For a given program, they can produce different sets of-functions.

*Minimal SSA* inserts a-function at any join point where two distinct definitions for the same original name meet. This is the minimal number consistent with the definition of SSA. Some of those-functions, however, may be dead; the definition says nothing about the values being live when they meet.

*Pruned SSA* adds a liveness test to the-insertion algorithm to avoid adding dead-functions. The construction must compute LIVEOUT sets, so the cost of building pruned SSAs is higher than that of building minimal SSA.

*Semipruned SSA* is a compromise between minimal SSAs and pruned SSAs. Before inserting-functions, the algorithm eliminates any names that are not live across a block boundary. This can shrink the name space and reduce the number of-functions without the overhead of computing LIVEOUT sets. This is the algorithm given in Figure 9.9.

Of course, the number of-functions depends on the specific pro- gram being converted into SSA form. For some programs, the reductions obtained by semipruned SSAs and pruned SSAs are significant. Shrinking the SSA form can lead to faster compilation, since passes that use SSA form then operate on programs that contain fewer operations—and fewer -functions.

LiveOut sets and add a test based on liveness to the inner loop of the -insertion algorithm. That modification causes the algorithm to produce *pruned* ssa *form*.

##### Efficiency Improvements

To improve efficiency, the compiler should avoid two kinds of duplication. First, the algorithm should avoid placing any block on the worklist more than once per global name. It can keep a checklist of blocks that have already been processed. Since the algorithm must reset the checklist for each global name, the implementation should use a sparse set or a similar structure (see Appendix B.2.3).

Second, a given block can be in the dominance frontier of multiple nodes that appear on the *WorkList*. As shown in the figure, the algorithm must search the block to look for a pre-existing-function. To avoid this search, the

**9.3** *Static Single-Assignment Form* **505**
compiler can maintain a checklist of blocks that already contain-functions for *x*. This takes a single sparse set, reinitialized along with *WorkList*.

9.3.4 **Renaming** In the description of maximal ssa form, we stated that renaming vari- ables was conceptually straightforward. The details, however, require some explanation. In the final ssa form, each global name becomes a base name, and individual definitions of that base name are distinguished by the addition of a numerical subscript. For a name that corresponds to a source-language variable, say x, the algorithm uses x as the base name. Thus, the first definition of x that the renaming algorithm encounters will be named x₀ and the second will be x₁. For a compiler-generated temporary, the algorithm must generate a distinct base name. The algorithm, shown in Figure 9.12, renames both definitions and uses in a preorder walk over the procedure’s dominator tree. In each block, it first renames the values defined by-functions at the head of the block, then it visits each operation in the block, in order. It rewrites the operands with cur- rent ssa names, then it creates a new ssa name for the result of the operation. This latter act makes the new name current. After all the operations in the block have been rewritten, the algorithm rewrites the appropriate-function parameters in each cfg successor of the block, using the current ssa names. Finally, it recurs on any children of the block in the dominator tree. When it returns from those recursive calls, it restores the set of current ssa names to the state that existed before the current block was visited. To manage this process, the algorithm uses a counter and a stack for each global name. A global name’s stack holds the subscript of the name’s current ssa name. At each definition, the algorithm generates a new subscript for the targeted name by pushing the value of its current counter onto the stack and incrementing the counter. Thus, the value on top of the stack for *n* is always the subscript of *n*’s current ssa name. As the final step in processing a block, the algorithm pops all the names generated in that block off their respective stacks to restore the names that held at the end of that block’s immediate dominator. Those names may be needed to process the block’s remaining siblings in the dominator tree. The stack and the counter serve distinct and separate purposes. As control in the algorithm moves up and down the dominator tree, the stack is managed to simulate the lifetime of the most recent definition in the current block.

##### 506 CHAPTER 9 Data-Flow Analysis

|for each|global name|i|Rename(b)|||||
|---|---|---|---|---|---|---|---|
|counter[i]|0||for each|-function|in b, ‘‘x|.|/’’|
|stack[i]|;||rewrite|x as|NewName(x)|||
|Rename(n0)|||for each rewrite rewrite rewrite for each|operation y with z with x as successor|‘‘x y subscript subscript NewName(x) of b in|op z’’ top(stack[y]) top(stack[z]) the cfg|in b|
|NewName(n)|||fill|in-function|parameters|||
|i counter[n] counter[n]|counter[n] + 1||for each Rename(s)|successor|s of b in|the dominator||
|push i|onto stack[n]||for each|operation|‘‘x y|op z’’|in b|
|return n FIGURE 9.12|‘‘ni’’||and pop(stack[x])|each-function|‘‘x|.|/’’|

*tree*

##### Renaming After-Insertion.

The counter, on the other hand, grows monotonically to ensure that each successive definition receives a unique ssa name.

Figure 9.12 summarizes the algorithm. It initializes the stacks and counters,

then calls *Rename* on the root of the dominator tree—the entry node of the cfg. *Rename* rewrites the block and recurs on successors in the dominator tree. To finish with the block, *Rename* pops any names that were pushed onto stacks while processing the block. The function *NewName* manipulates the counters and stacks to create new ssa names as needed.

One final detail remains. At the end of block *b*, *Rename* must rewrite -function parameters in each of *b*’s cfg successors. The compiler must assign an ordinal parameter slot in those-functions for *b*. When we draw the ssa form, we always assume a left-to-right order that matches the left- to-right order in which the edges are drawn. Internally, the compiler can number the edges and parameter slots in any consistent fashion that pro- duces the desired result. This requires cooperation between the code that builds the ssa form and the code that builds the cfg. (For example, if the cfg implementation uses a list of edges leaving each block, the order of that list can determine the mapping.)

##### Example

To finish the continuing example, let’s apply the renaming algorithm to the code in Figure 9.11. Assume that a₀, b₀, c₀, and d₀ are defined on entry to

*B*. Figure 9.13 shows the states of the counters and stacks for global names at various points during the process.

**9.3** *Static Single-Assignment Form* **507**
i

|a|b|c|d|
|---|---|---|---|
|a0|b0|c0|d0|

|a|b|c|d|i|
|---|---|---|---|---|
|a0|b0|c0|d0|i0|
|||||1|
|a|b|c|d|i|
|a0|b0|c0|d0|i0|
|a1|b1|c1|d1|i1|
|a2|b2|c2|d2||
|||c3|||
||||2||
|a|b|c|d|i|
|a0|b0|c0|d0|i0|
|a1|b1|c1|d1|i1|
|a2|b3|c2|d3|i2|
|a3||c4|||
||||3||
|a|b|c|d|i|
|a0|b0|c0|d0|i0|
|a1|b1|c1|d1|i1|
|a2 a4||c2|d4||
||||6||
|a|b|c|d|i|
|a0|b0|c0|d0|i0|
|a1|b1|c1|d1|i1|
|a2 a4||c2|d4||
|||||8|

Counters 1 1 1 1 0 Counters 1 1 1 1 1 Stacks Stacks

(a) Initial Condition, Before *B*0(b) On Entry to *B*
Counters 3 3 4 3 2

|a b|c d|i|
|---|---|---|
|a0 b0|c0 d0|i0|
|a1 b1|c1 d1|i1|
|a2|c2||
|||2|

Counters 3 2 3 2 2 Stacks Stacks

(c) On Entry to *B* (d) End of *B*
Counters 4 4 5 4 3

|a|b|c|d|i|
|---|---|---|---|---|
|a0|b0|c0|d0|i0|
|a1|b1|c1|d1|i1|
|a2||c2|||
|||||3|

Stacks

|Counters|3 3|4 3|2|
|---|---|---|---|
|Stacks|(e) On Entry to B|||
|Counters|4 4|5 4|3|
|Stacks|(g) On Entry to B|||
|Counters|5 4|5 6|3|

(f) At End of *B*
Counters 5 4 5 5 3

|a b|c d|i|
|---|---|---|
|a0 b0|c0 d0|i0|
|a1 b1|c1 d1|i1|
|a2|c2||
|||5|
|a b|c d|i|
|a0 b0|c0 d0|i0|
|a1 b1|c1 d1|i1|
|a2 a4|c2 d4||
|||7|

Stacks

(h) Entry to *B*
Counters 5 5 6 7 32 Stacks Stacks

(i) Entry to *B* (j) On Entry to *B*
n **FIGURE 9.13** States in the Renaming Example.

##### 508 CHAPTER 9 Data-Flow Analysis

The algorithm makes a preorder walk over the dominator tree, which corresponds to visiting the nodes in ascending order by name, *B*0through *B*8. The initial configuration of the stacks and counters appears in

Figure 9.13a. As the algorithm proceeds through the blocks, it takes the

following actions:

n *Block B*0This block contains only one operation. *Rename* rewrites i with i₀, increments the counter, and pushes i0onto the stack for i. Next, it visits *B*0’s cfg-successor, *B*1, and rewrites the-function parameters that correspond to *B*0with their current names: a₀, b₀, c₀, d0, and i0. It then recurs on *B*0’s child in the dominator tree, *B*1. After that, it pops the stack for i and returns. n *Block B*1 *Rename* enters *B*1with the state shown in Figure 9.13b. It rewrites the-function targets with new names, a₁, b₁, c₁, d₁, and i₁. Next, it creates new names for the definitions of a and c and rewrites them. It rewrites the uses of a and c in the comparison. Neither of *B*1’s cfg successors have-functions, so it recurs on *B*1’s dominator-tree children, *B*2, *B*3, and *B*5. Finally, it pops the stacks and returns. n *Block B*2 *Rename* enters *B*2with the state shown in Figure 9.13c. This block has no-functions to rewrite. *Rename* rewrites the definitions of b, c, and d, creating a new ssa name for each. It then rewrites -function parameters in *B*2’s cfg successor, *B*3. Figure 9.13d shows the stacks and counters just before they are popped. Finally, it pops the stacks and returns. n *Block B*3 *Rename* enters *B*3with the state shown in Figure 9.13e. Notice that the stacks have been popped to their state when *Rename* entered *B*2, but the counters reflect the names created inside *B*2. In *B*3, *Rename* rewrites the-function targets, creating new ssa names for each. Next, it rewrites each assignment in the block, using current ssa names for the uses and then creating new ssa names for the definition. (Since y and z are not global names, it leaves them intact.) *B*3has two cfg successors, *B*1and *B*4. In *B*1, it rewrites the -function parameters that correspond to the edge from *B*3, using the stacks and counters shown in Figure 9.13f. *B*4has no-functions. Next, *Rename* recurs on *B*3’s dominator-tree child, *B*4. When that call returns, *Rename* pops the stacks and returns. n *Block B*4This block just contains a return statement. It has no -functions, definitions, uses, or successors in either the cfg or the dominator tree. Thus, *Rename* performs no actions and leaves the stacks and counters unchanged.

**9.3** *Static Single-Assignment Form* **509**
*B*0: i0 1 ! *B₁ B₃*: a (a,a) 3 2 4 *B*1: a1 (a0,a3) b (b,b)

|1: a1|(a0,a3)|b 3|(b 2 ,b 4)|||
|---|---|---|---|---|---|
|b1|(b0,b3)|c 4|(c 3 ,c5)|6: d5||
|c1|(c0,c4)|d 3|(d 2 ,d 6)|||
|d1|(d0,d3)|y|a 3 + b 3|7: c5|(c 2 ,c 6)|
|i1|(i0,i2)|z|c 4 + d 3|d 6|(d5,d 4)|
|a2 c2||i 2 (i 2|i 1 + 1 100)|b 4||
|(a2|c2)|return||c 6||
|b2||a 4||||
|c3||d 4||||
|d2 n FIGURE 9.14||(a 4|d 4)|||

3 2 4 *B* ! *B₇* *B*

##### ! B₁,B₄! B₃

*<*! *B₂*,*B₅ B₄*: *B₈*: *B₂*: *B₅*:! *B₇*

##### ! B₆,B₈

##### ! B₃

##### Example after Renaming.

n *Block B*5After *B*4, *Rename* pops through *B*3back to *B*1. With the stacks as shown in Figure 9.13g, it recurs down into *B*1’s final dominator-tree child, *B*5. *B*5has no-functions. *Rename* rewrites the two assignment statements and the expression in the conditional, creating new ssa names as needed. Neither of *B*5’s cfg successors has-functions. *Rename* next recurs on *B*5’s dominator-tree children, *B*6, *B*7, and *B*8. Finally, it pops the stacks and returns. n *Block B*6 *Rename* enters *B*6with the state shown in Figure 9.13h. *B*6has no-functions. *Rename* rewrites the assignment to d, generating the new ssa name d₅. Next, it visits the-functionsin *B*6’s cfg successor *B*7. It rewrites the-function arguments that correspond to the path from *B*6with their current names, c₂ and d₅. Since *B*6has no dominator-tree children, it pops the stack for d and returns. n *Block B*7 *Rename* enters *B*7with the state shown in Figure 9.13i. It first renames the-function targets with new ssa names, c₅ and d₆. Next, it rewrites the assignment to b with new ssa name b₄. It then rewrites the -function arguments in *B*7’s cfg successor, *B*3, with their current names. Since *B*7has no dominator-tree children, it pops the stacks and returns. n *Block B*8 *Rename* enters *B*8with the state shown in Figure 9.13j. *B*8has no-functions. *Rename* rewrites the assignment to c with new ssa name c6. It examines *B*8’s cfg successor, *B*7and rewrites the corresponding -function arguments with their current names, c₆ and d₄. Since *B*8has no dominator-tree children, it pops the stacks and returns.

Figure 9.14 shows the code after *Rename* halts.

##### 510 CHAPTER 9 Data-Flow Analysis

##### A Final Improvement

A clever implementation of *NewName* can reduce the time and the space expended on stack manipulation. The primary use of the stacks is to reset the name space on exit from a block. If a block redefines the same base name several times, *NewName* only needs to keep the most recent name. This happened with a and c in block *B*1of the example. *NewName* may overwrite the same stack slot multiple times within a single block.

This makes the maximum stack sizes predictable; no stack can be larger than the depth of the dominator tree. It lowers the overall space requirements, avoids the need for overflow tests on each push, and decreases the number of push and pop operations. It requires another mechanism for determining which stacks to pop on exit from a block. *NewName* can thread together the stack entries for a block. *Rename* can use the thread to pop the appropriate stacks.

9.3.5 **Translation Out of SSA Form** Because modern processors do not implement-functions, the compiler needs to translate ssa form back into executable code. From the examples, it is tempting to believe that the compiler can just drop the subscripts from the ssa names, revert to base names, and delete the-functions. If the com- piler simply builds ssa form and converts it back into executable code, this approach will work. If, however, the code has been rearranged or values have been renamed, this approach can produce incorrect code. As an example, we saw in Section 8.4.1 that using ssa names could allow local value numbering (lvn) to discover and eliminate more redundancies. **Before LVN After LVN Before LVN After LVN** a x + y a x + y a0 x0 + y0 a0 x0 + y0 b x + y b a b0 x0 + y0 b0 a0

|b x + y|b a|b0 x0 + y0|b0 a0|
|---|---|---|---|
|a 17|a 17|a1 17|a1 17|
|c x + y|c x + y|c0 x0 + y0 SSA Name Space|c0 a0|
 Original Name Space The table on the left shows a four-operation block and the results that lvn produces when it uses the code’s own name space. The table on the right shows the same example using the ssa name space. Because the ssa name space gives a₀ a distinct name from a₁, lvn can replace the evaluation of x0 + y0 in the final operation with a reference to a0.

**9.3** *Static Single-Assignment Form* **511**

|B||B|||||
|---|---|---|---|---|---|---|
|0: i0|1|3: y|a3 +|b3|||
|a1|a0|z|c4 +|d3|||
|b1|b0|i2|i1|+ 1|||
|c1|c0|(i2|100)||||
|d1|d0|4: return|||8: c6||
|i1|i0|5: a4 d4|||c5 d6|c6 d4|
|a2||(a4|d4)||||
|c2||6: d5|||9: a1|a3|
|(a2|c2)|c5|c2||b1|b3|
|2: b2||d6|d5||c1|c4|
|c3|||||d1|d3|
|d2||7: b4|||i1|i2|
|a3|a2|a3|a4||||
|b3|b2|b3|b4||||
|c4|c3|c4|c5||||
|d3|d2|d3|d6||||

##### ! B₉,B₄

*B B* *B* ! *B₁* *B₁*:! *B₆*,*B₈*! *B₇* *B B* *<*! *B₂*,*B₅* *B* ! *B₇* *B* ! *B₁*

##### ! B₃! B₃

n **FIGURE 9.15** Example after Copy Insertion to Eliminate-functions.

Notice, however, that simply dropping the subscripts on variable names produces incorrect code, since c receives the value 17. More aggressive transformations, such as code motion and copy folding, can rewrite the ssa form in ways that introduce more subtle problems.

To avoid such problems, the compiler can keep the ssa name space intact and replace each-function with a set of copy operations—one along each incoming edge. For a-function xi(xj, xk), the compiler should insert xi xj along the edge carrying the value xj and xi xk along the edge carrying xk.

Figure 9.15 shows the running example after-functions have been replaced

with copy operations. The four-functions that were in *B*3have been replaced with a set of four copies in each of *B*2and *B*7. Similarly, the two -functions in *B*7induce a pair of copies in each of *B*6and *B*8. In both these cases, the compiler can insert the copies into the predecessor blocks.

The-functions in *B*1reveal a more complicated situation. The compiler can insert copies directly into its predecessor *B*0, but not into its predecessor If the names defined by the copies are not LIVEIN *B*3. Since *B*3has multiple successors, inserting copies for the-functions in*B*4, then the copies would be harmless. The from *B*1 3compiler’s strategy, however, must work if the

|at the end of B|would also cause them to execute along the path|||||
|---|---|---|---|---|---|
|1|3|||||
|3 4||||IVE N||
||||3 1|||
|||3 1||||

##### names are L I.

from *B* to *B*, where they are not necessary and might produce incorrect results. To remedy this problem, the compiler can split the edge (*B*, *B*), insert a new block between *B* and *B*, and place the copies in that new

##### 512 CHAPTER 9 Data-Flow Analysis

block. The new block is labelled *B*9in Figure 9.15. After copy insertion, the example appears to have many superfluous copies. Fortunately, the compiler can remove most, if not all, of these copies with subsequent optimizations, such as copy folding (see Section 13.4.6).

##### Critical edge

We call an edge such as (*B*3, *B*1) a *critical edge*. When the compiler inserts In a CFG, an edge whose source has multiple a block in the middle of a critical edge, it *splits* the critical edge. Some successors and whose sink has multiple transformations on ssa form assume that the compiler splits all critical edges predecessors is called a*critical edge*. before it applies the transformation.

In out-of-ssa translation, the compiler can split critical edges to create loca- tions for the necessary copy operations. This transformation cures most of the problems that arise during out-of-ssa translation. However, two more subtle problems can arise. The first, which we call the lost-copy problem, arises from a combination of aggressive program transformations and unsplit critical edges. The second, which we call the swap problem, arises from an interaction of some aggressive program transformations and the detailed definition of ssa form.

##### The Lost-Copy Problem

Many ssa-based algorithms require that critical edges be split. Sometimes, however, the compiler cannot, or should not, split critical edges. For exam- ple, if the critical edge is the closing branch of a heavily executed loop, adding a block with one or more copy operations and a jump may have an adverse impact on execution speed. Similarly, adding blocks and edges in the late stages of compilation can interfere with regional scheduling, with register allocation, and with optimizations such as code placement.

The lost-copy problem arises from the combination of copy folding and criti- cal edges that cannot be split. Figure 9.16 shows an example. Panel a shows the original code—a simple loop. In panel b, the compiler has converted the loop into ssa form and folded the copy from i to y, replacing the sole use of y with a reference to i₁. Panel c shows the code produced by straightforward copy insertion into the-function’s predecessor blocks. This code assigns the wrong value to z₀. The original code assigns z₀ the second to last value of i; the code in panel c assigns z₀ the last value of i. With the critical edge split, as in panel d, copy insertion produces the correct behavior. However, it adds a jump to every iteration of the loop.

The combination of an unsplit critical edge and copy folding creates the lost copy. Copy folding eliminated the assignment y i by folding i1 into the reference to y in the block that follows the loop. Thus, copy folding extended the lifetime of i₁. Then, the copy-insertion algorithm replaced the

**9.3** *Static Single-Assignment Form* **513**
i ← 1 i0 ← 1 i0 ← 1 i1 ← i0

|y ← i|i1 ← φ (i0,i2)|i2 ← i1 + 1|
|---|---|---|
|i ← i+1|i2 ← i1 +1|i1 ← i2|

z ← y+ ... z0 ← i1 +... z0 ← i1 +...

(a) Original Code (b) SSA Form, (c) Copies Inserted

|(a) Original Code||(b) SSA Form,||(c) Copies Inserted|
|---|---|---|---|---|
||i0 ← 1 i1 ← i0|Copies Folded|i0 ← 1 i1 ← i0|Incorrectly|

i2 ← i1 +1 i2 ← i1 +1 t ← i1 i1 ← i2 i1 ← i2

z0 ← i1 +... z0 ← t+ ...

(d) Critical Edge Split (e) Copies Inserted
Correctly

n **FIGURE 9.16** An Example of the Lost-Copy Problem.

-function at the top of the loop body with a copy operation in each of that block’s predecessors. This inserts the copy i₁ i2 at the bottom of the block—at a point where i₁ is still live.

The compiler can avoid the lost-copy problem by checking the liveness of the target name for each copy that it tries to insert during out-of-ssa trans- lation. When it discovers a copy target that is live, it must preserve the live value in a temporary name and rewrite subsequent uses to refer to the tem- porary name. This rewriting step can be done with an algorithm modelled on the renaming step of the ssa construction algorithm. Figure 9.16e shows the code that this approach produces.

##### The Swap Problem

The swap problem arises from the definition of-function execution. When a block executes, all of its-functions execute concurrently before any other statement in the block. That is, all the-functions simultaneously read their

##### 514 CHAPTER 9 Data-Flow Analysis

...

|||x0 ←|
|---|---|---|
|x ←||y0 ←|
|y ←|x0 ← y0 ←|x1 ← x0 y1 ← y0|
|t ← x|||
|x ← y|x1 ← φ (x0,y1)|x1 ← y1|
|y ← t|y1← φ (y0,x1)|y1 ← x1|

......
......
...

(a) Original Code (b) SSA Form, (c) After Naive
Copies Folded Copy Insertion

n **FIGURE 9.17** An Example of the Swap Problem.

appropriate input parameters and then simultaneously redefine their target values.

Figure 9.17 shows a simple example of the swap problem. Panel a shows the

original code, a simple loop that swaps the values of x and y. Panel b shows the code after conversion to ssa form and aggressive copy folding. In this form, with the rules for evaluating-functions, the code retains its original meaning. When the loop body executes, the-function parameters are read before any of the-function targets are defined. On the first iteration, it reads x0 and y₀ before defining x₁ and y₁. On subsequent iterations, the loop body reads x₁ and y₁ before redefining them. Panel c shows the same code, after the naive copy-insertion algorithm has run. Because copies execute sequentially, rather than concurrently, both x₁ and y₁ receive the same value, an incorrect outcome.

At first glance, it might appear that splitting the back edge—a critical edge— helps. However, splitting the edge simply places the same two copies, in the same order, in another block. The straightforward fix for this problem is to adopt a two-stage copy protocol. The first stage copies each of the -function arguments to its own temporary name, simulating the behavior of the original-functions. The second state then copies those values to the -function targets.

Unfortunately, this solution doubles the number of copy operations required to translate out of ssa form. In the code from Figure 9.17a, it would require four assignments: *s y*1, *t x*1, *x*1*s*, and *y*1*t*. All of these assign- ments execute on each iteration of the loop. To avoid this loss of efficiency, the compiler should attempt to minimize the number of copies that it inserts.

In fact, the swap problem can arise without a cycle of copies; all it takes is a set of-functions that have, as inputs, variables defined as outputs

**9.3** *Static Single-Assignment Form* **515**
The minimal code for the example would use one extra copy; it is similar to the code in

Figure 9.17a.

of other-functions in the same block. In the acyclic case, in which -functions reference the results of other-functions in the same block, the compiler can avoid the problem by carefully ordering the inserted copies.

To solve this problem, in general, the compiler can detect cases in which -functions reference the targets of other-functions in the same block. For each cycle of references, it must insert a copy to a temporary that breaks the cycle. Then, it can schedule the copies to respect the dependences implied by the-functions.

9.3.6 **Using SSA Form** A compiler uses ssa form because it improves the quality of analysis, the quality of optimization, or both. To see how analysis over ssa form differs from the classical data-flow analysis techniques presented in Section 9.2, consider performing global constant propagation on ssa form, using an algorithm called sparse simple constant propagation (sscp). In the sscp algorithm, the compiler annotates each ssa name with a value. The set of possible values forms a *semilattice*. A semilattice consists of a set *L* of values and a meet operator, ^. The meet operator must be idempotent, commutative, and associative; it imposes an order on the elements of *L* as follows:
*a b* if and only if *a* ^ *b* = *b*, and *a > b* if and only if *a b* and *a* 6D *b*

A semilattice has a bottom element, ?, with the properties that

8 *a* 2 *L*, *a* ^? =?, and 8 *a* 2 *L*, *a*?.

Some semilattices also have a top element, >, with the properties that

8 *a* 2 *L*, *a* ^> = *a* and 8 *a* 2 *L*, > *a*.

In constant propagation, the structure of the semilattice used to model pro- gram values plays a critical role in the algorithm’s runtime complexity. The semilattice for a single ssa name appears in the margin. It consists of >, ?, and an infinite set of distinct constant values. For any two constants, *ci*and *cj*, *ci*^ *cj*D?.

In sscp, the algorithm initializes the value associated with each ssa name to >, which indicates that the algorithm has no knowledge of the ssa name’s value. If the algorithm subsequently discovers that ssa name *x* has the known

##### Semilattice

a set*L*and a*meet*operator ^ such that, 8 *a, b*, and*c* 2 *L*,

1. *a* ^ *a* = *a*,
2. *a* ^ *b* = *b* ^ *a*, and
3. *a*^ (*b* ^ *c*) = (*a* ^ *b*) ^*c* Compilers use semilattices to model the data domains of analysis problems.
⊥

… *c c c c c* … *i j k l m*

⊥ Semilattice for Constant Propagation

##### 516 CHAPTER 9 Data-Flow Analysis

*// Initialization Phase* *WorkList*; *for each SSA name n* *initialize Value(n) by rules specified in the text*

|initialize|Value(n)|by rules|specified|in the|text|||
|---|---|---|---|---|---|---|---|
|if Value(n)|6D >|then||||||
|WorkList||WorkList|[ fng|||||
|// Propagation|Phase|-Iterate|to a fixed|point||||
|while (WorkList|6D ;)|||||||
|remove|some n from|WorkList||// Pick|an arbitrary|name||
|for each|operation|op that|uses n|||||
|let|m be the|SSA name|that op defines|||||
|if n FIGURE 9.18|Value(m) t Value(m) Value(m) if Value(m) then|6D ? then result 6D t WorkList|of interpreting WorkList|// Recompute op [ fmg|and over lattice|test for values|change|

##### Sparse Simple Constant Propagation Algorithm.

constant value *ci*, it models that knowledge by assigning *Value(x)* the semi- lattice element *ci*. If it discovers that *x* has a changing value, it models that fact with the value ?.

The algorithm for sscp, shown in Figure 9.18, consists of an initialization phase and a propagation phase. The initialization phase iterates over the ssa names. For each ssa name *n*, it examines the operation that defines *n* and sets *Value(n)* according to a simple set of rules. If *n* is defined by a -function, sscp sets *Value(n)* to >. If *n*’s value is a known constant *ci*, sscp sets *Value(n)* to *ci*. If *n*’s value cannot be known—for example, it is defined by reading a value from external media—sscp sets *Value(n)* to ?. Finally, if *n*’s value is not known, sscp sets *Value(n)* to >. If *Value(n)* is not >, the algorithm adds *n* to the worklist.

The propagation phase is straightforward. It removes an ssa name *n* from the worklist. The algorithm examines each operation *op* that uses *n*, where *op* defines some ssa name *m*. If *Value(m)* has already reached ?, then no further evaluation is needed. Otherwise, it models the evaluation of *op* by interpreting the operation over the lattice values of its operands. If the result is lower in the lattice than *Value(m)*, it lowers *Value(m)* accordingly and adds *m* to the worklist. The algorithm halts when the worklist is empty.

**9.3** *Static Single-Assignment Form* **517**
Interpreting an operation over lattice values requires some care. For a >^*x* D *x* 8 *x* -function, the result is simply the meet of the lattice values of all the?^ *x* D? 8 *x* -function’s arguments; the rules for meet are shown in the margin, in *ci* ^ *cj* D *ci* if *ci* D *cj* order of precedence. For other kinds of operations, the compiler must apply *ci* ^ *cj* D? if *ci* 6D *cj* operator-specific knowledge. If any operand has the lattice value >, the eval-Rules for Meet uation returns >. If none of the operands has the value >, the model should produce an appropriate value.

For each value-producing operation in the ir, sscp needs a set of rules that model the operands’ behavior. Consider the operation *a* × *b*. If *a*D 4 and *b*D 17, the model should produce the value 68 for *a* × *b*. However, if *a*D?, the model should produce ? for any value of *b* except 0. Because *a* × *0* D *0*, independent of *a*’s value, *a* × *0* should produce the value 0.

##### Complexity

The propagation phase of sscp is a classic fixed-point scheme. The argu- ments for termination and complexity follow from the length of descend- ing chains through the lattice that it uses to represent values, shown in

Figure 9.18. The *Value* associated with any ssa name can have one of three

initial values—>, some constant*ci*other than > or ?, or ?. The propagation phase can only lower its value. For a given ssa name, this can happen at most twice—from > to *ci*to ?. sscp adds an ssa name to the worklist only when its value changes, so each ssa name appears on the worklist at most twice. sscp evaluates an operation when one of its operands is removed from the worklist. Thus, the total number of evaluations is at most twice the number of uses in the program.

##### Optimism: The Role of Top

The sscp algorithm differs from the data-flow problems in Section 9.2 in that it initializes unknown values to the lattice element >. In the lattice for constant values, > is a special value that represents a lack of knowledge about the ssa name’s value. This initialization plays a critical role in constant propagation; it allows values to propagate into cycles in the graph, which are caused by loops in the cfg.

Because it initializes unknown values to >, rather than ?, it can propagate some values into cycles in the graph—loops in the cfg. Algorithms that begin with the value >, rather than ?, are often called *optimistic* algorithms. The intuition behind this term is that initialization to > allows the algo- rithm to propagate information into a cyclic region, optimistically assuming that the value along the back edge will confirm this initial propagation. An initialization to ?, called *pessimistic*, disallows that possibility.

##### 518 CHAPTER 9 Data-Flow Analysis

|Time||||Lattice Values|||
|---|---|---|---|---|---|---|
|Step|x 0|Pessimistic x 1|x 2|x 0|x 1|Optimistic x2|

|x0|← 17|
|---|---|
|x1|← φ (x0,x2)|
|x2|← x1 +i 12|

0 17? ? 17 > > 1 17? ? 17 17 17 C i<u>12</u>

(a) The Code Fragment (b) Results of Pessimistic and Optimistic Analyses n **FIGURE 9.19** Optimistic Constant Example. To see this, consider the ssa fragment in Figure 9.19. If the algorithm pes- simistically initializes x₁ and x₂ to ?, it will not propagate the value 17 into the loop. When it evaluates the-function for x₁, it computes 17 ^? to yield ?. With x₁ set to ?, x₂ also gets set to ?, even if i₁₂ has a known value, such as 0. If, on the other hand, the algorithm optimistically initializes unknown values to >, it can propagate the value of x₀ into the loop. When it computes a value for x₁, it evaluates 17 ^> and assigns the result, 17, to x₁. Since x₁’s value has changed, the algorithm places x₁ on the worklist. The algorithm then reevaluates the definition of x₂. If, for example, i₁₂ has the value 0, then this assigns x₂ the value 17 and adds x₂ to the worklist. When it reevaluates the-function, it computes 17 ^ 17 and proves that x₁ is 17. Consider what would happen if i₁₂ has the value 2, instead. Then, when sscp evaluates x1 + i12, it assigns x₂ the value 19. Now, x₁ gets the value 17 ^ 19, or ?. This, in turn, propagates back to x₂, producing the same final result as the pessimistic algorithm.
##### The Value of SSA Form

In the sscp algorithm, ssa form leads to a simple and efficient algorithm. To see this point, consider a classic data-flow approach to constant propagation. It would associate a set ConstantsIn with each block in the code, define an equation to compute ConstantsIn(*bi*) as a function of the ConstantsOut sets of *bi*’s predecessors, and define a procedure for interpreting the code in a block to derive ConstantsOut(*bi*) from ConstantsIn(*bi*). In contrast, the algorithm in Figure 9.18 is relatively simple. It still has an idiosyncratic mechanism for interpreting operations, but otherwise it is a simple iterative fixed-point algorithm over a particularly shallow lattice.

In ssa form, the propagation step is sparse; it only evaluates expressions of lattice values at operations (and-functions) that use those values. Equally important, assigning values to individual ssa names makes the optimistic initialization natural rather than contrived and complicated. In short, ssa

**9.4** *Interprocedural Analysis* **519**
leads to an efficient, understandable sparse algorithm for global constant propagation.

##### SECTION REVIEW

SSA form encodes information about both data flow and control flow in a conceptually simple intermediate form. To make use of SSA, the compiler must first transform the code into SSA form. This section focused on the algorithms needed to build *semipruned* SSA *form*. The construction is a two step process. The first step inserts-functions into the code at join points where distinct definitions can converge. The algorithm relies heavily on dominance frontiers for efficiency. The second step creates the SSA name space by adding subscripts to the original base names during a systematic traversal of the entire procedure.

##### Because modern machines do not directly implement-functions, the

compiler must translate code out of SSA form before it can execute. Transformation of the code while in SSA form can complicate out-of-SSA translation. Section 9.3.5 examined both the "lost copy problem" and the "swap problem" and described approaches for handling them. Finally, Section 9.3.6 showed an algorithm that performs global constant propagation over the SSA form.

##### Review Questions

**1.** Maximal SSA form includes useless-functions that define nonlive values and redundant-functions that merge identical values (e.g. x8 (x7, x7)). How does the semipruned SSA construction deal with these unneeded-functions?
**2.** Assume that your compiler’s target machine implements swap

|||r1,r2,|
|---|---|---|
||r1 r2|r2 r1.|
 an operation that simultaneously performs and What impact would the swap operation have on out-of-SSA transla- tion? swap can be implemented with the three operation sequence:

|r1|r1 + r2|
|---|---|
|r2|r1 - r2|
|r1|r1 - r2|
 What would be the advantages and disadvantages of using this implementation of swap in out-of-SSA translation?
9.4 **INTERPROCEDURAL ANALYSIS** The inefficiencies introduced by procedure calls appear in two distinct forms: loss of knowledge in single-procedure analysis and optimization that

##### 520 CHAPTER 9 Data-Flow Analysis

arises from the presence of a call site in the region being analyzed and transformed and specific overhead introduced to maintain the abstractions inherent in the procedure call. Interprocedural analysis was introduced to address the former problem. We saw, in Section 9.2.4, how the compiler can compute sets that summarize the side effects of a call site. This section explores more complex issues in interprocedural analysis.

9.4.1 **Call-Graph Construction** The first problem that the compiler must address in interprocedural anal- ysis is the construction of a call graph. In the simplest case, in which every procedure call invokes a procedure named by a literal constant, as in “call foo(x, y, z)”, the problem is straightforward. The compiler cre- ates a call-graph node for each procedure in the program and adds an edge to the call graph for each call site. This process takes time proportional to the number of procedures and the number of call sites in the program; in practice, the limiting factor will be the cost of scanning procedures to find the call sites.
Source language features can make call-graph construction much harder.
 Even fortran and c programs have complications. For example, consider the small c program shown in Figure 9.20a. Its precise call graph is shown in
Figure 9.20b. The following subsections outline the language features that
 complicate call-graph construction.
##### Procedure-Valued Variables

If the program uses procedure-valued variables, the compiler must analyze the code to estimate the set of potential callees at each call site that invokes a procedure-valued variable. To begin, the compiler can construct the graph specified by the calls that use explicit literal constants. Next, it can track the propagation of functions as values around this subset of the call graph, adding edges as indicated.

In SSCP, initialize function-valued formals with The compiler can use a simple analog of global constant propagation to known constant values. Actuals with the known transfer function values from a procedure’s entry to the call sites that use values reveal where functions are passed them, using set union as its meet operation. To improve its efficiency, it can through. construct expressions for each parameter-valued variable used in a procedure (see the discussion of jump functions in Section 9.4.2).

As the code in Figure 9.20a shows, a straightforward analysis may overes- timate the set of call-graph edges. The code calls compose to compute a(c) and b(d). A simple analysis, however, will conclude that the formal parame- ter g in compose can receive either c or d, and that, as a result, the program

**9.4** *Interprocedural Analysis* **521**
int compose( int f(), int g()) f return f(g); g int a( int z()) f return z(); g int b( int z()) f return z(); g int c() f return...; g int d() f return...; g int main(int argc, char *argv[])f return compose(a,c) + compose(b,d); g

(a) Example C Program
n **FIGURE 9.20** Building a Call Graph with Function-Valued Parameters.

main

? compose @ @R a b

?? c d

(b) Precise Call Graph main ? compose @
@R a b H ? H H? c Hj d

avoid adding spurious edges such as (a,d) or (b,c).

##### Contextually-Resolved Names

receiver and the state of the inheritance hierarchy.

each procedure or method that might be invoked.

(c) Approximate Call Graph
might compose any of a(c), a(d), b(c), or b(d), as shown in Figure 9.20c. To build the precise call graph, it must track sets of parameters that are passed together, along the same path. The algorithm could then consider each set independently to derive the precise graph. Alternatively, it might tag each value with the path that the values travel and use the path information to

Some languages allow programmers to use names that are resolved by con- text. In object-oriented languages with an inheritance hierarchy, the binding of a method name to a specific implementation depends on the class of the

If the inheritance hierarchy and all the procedures are fixed at the time of analysis, then the compiler can use interprocedural analysis of the class structure to narrow the set of methods that can be invoked at any given call site. The call-graph constructor must include an edge from that call site to

##### 522 CHAPTER 9 Data-Flow Analysis

Dynamic linking, used in some operating systems For a language that allows the program to import either executable code or to reduce virtual memory requirements, new class definitions at runtime, the compiler must construct a conservative introduces similar complications. If the compiler call graph that reflects the complete set of potential callees at each call site. cannot determine what code will execute, it One way to accomplish that goal is to construct a node in the call graph that cannot construct a complete call graph. represents unknown procedures and endow it with worst-case behavior; its MayMod and MayRef sets should be the complete set of visible names.

Analysis that reduces the number of call sites that can name multiple pro- cedures can improve the precision of the call graph by reducing the number of spurious edges—edges for calls that cannot occur at runtime. Of equal or greater importance, any call sites that can be narrowed to a single callee can be implemented with a simple call; those with multiple callees may require run- time lookups for the dispatch of the call (see Section 6.3.3). Runtime lookups to support dynamic dispatch are much more expensive than a direct call.

##### Other Language Issues

In intraprocedural analysis, we assume that the control-flow graph has a sin- gle entry and a single exit; we add an artificial exit node if the procedure has multiple returns. In interprocedural analysis, language features can create the same kinds of problems.

For example, Java has both initializers and finalizers. The Java virtual machine invokes a class initializer after it loads and verifies the class; it invokes an object initializer after it allocates space for the object but before it returns the object’s hashcode. Thread start methods, finalizers, and destruc- tors also have the property that they execute without an explicit call in the source program.

The call-graph builder must pay attention to these procedures. Initializers may be connected to sites that create objects; finalizers might be connected to the call-graph’s entry node. The specific connections will depend on the language definition and the analysis being performed. MayMod analysis, for example, might ignore them as irrelevant, while interprocedural constant propagation needs information from initialization and start methods.

9.4.2 **Interprocedural Constant Propagation** Interprocedural constant propagation tracks known constant values of global variables and parameters as they propagate around the call graph, both through procedure bodies and across call-graph edges. The goal of inter- procedural constant propagation is to discover situations where a procedure always receives a known constant value or where a procedure always returns a known constant value. When the analysis discovers such a constant, it can specialize the code for that value.

**9.4** *Interprocedural Analysis* **523**
Conceptually, interprocedural constant propagation consists of three sub- problems: discovering an initial set of constants, propagating known con- stant values around the call graph, and modelling transmission of values through procedures.

##### Discovering an Initial Set of Constants

The analyzer must identify, at each call site, which actual parameters have known constant values. A wide range of techniques are possible. The sim- plest method is to recognize literal constant values used as parameters. A more effective and expensive technique might use a full-fledged global constant propagation step (see Section 9.3.6) to identify constant-valued parameters.

##### Propagating Known Constant Values around the Call Graph

Given an initial set of constants, the analyzer propagates the constant val- ues across call-graph edges and through the procedures from entry to each call site in the procedure. This portion of the analysis resembles the iterative data-flow algorithms from Section 9.2. This problem can be solved with the iterative algorithm, but the algorithm can require significantly more itera- tions than it would for simpler problems such as live variables or available expressions.

##### Modeling Transmission of Values through Procedures

Each time it processes a call-graph node, the analyzer must determine how the constant values known at the procedure’s entry affect the set of constant values known at each call site. To do so, it builds a small model for each actual parameter, called a *jump function*. A call site *s* with *n* parameters has a vector of jump functions, *Js*Dh*Jsa*, *Jsb*, *Jsc*,... ,*Jsn*i, where *a* is the first formal parameter in the callee, *b* is the second, and so on. Each jump function, *Jsx*, relies on the values of some subset of the formal parameters to the procedure *p* that contains *s*; we denote that set as *Support(Jsx)*.

For the moment, assume that *Jsx*consists of an expression tree whose leaves are all formal parameters of the caller or literal constants. We require that *Jsx*return > if *Value*(*y*) is > for any *y* 2 *Support*(*Jsx*).

##### The Algorithm

Figure 9.21 shows a simple algorithm for interprocedural constant propa-

gation across the call graph. It is similar to the sscp algorithm presented in Section 9.3.6.

The algorithm associates a field *Value*(*x*) with each formal parameter *x* of each procedure *p*. (It assumes unique, or fully qualified, names for each

##### 524 CHAPTER 9 Data-Flow Analysis

*// Phase 1: Initializations* *Build all jump functions and Support mappings*

|Build all|jump functions|and|Support|mappings||||
|---|---|---|---|---|---|---|---|
|Worklist||||||||
|for each procedure||p in the|program|||||
|for each|formal|parameter|f to|p||||
|Value(f)||>|||// Optimistic|initial|value|
|Worklist||Worklist|[ f f g|||||
|for each call|site|s in the|program|||||
|for each|formal|parameter|f that|receives|a value|at s||
|Value(f)||Value(f)|^ Jsf||// Initial|constants|factor|
|// Phase 2:|Iterate|to a fixed|point|||||
|while (Worklist|6D|||||||
|pick parameter|f|from Worklist|||// Pick|an arbitrary|parameter|
|let p be|the procedure|declaring||f||||
|// Update|the Value|of each|parameter||that depends|on f||
|for each t|call site Value(x)|s in|p and parameter||x such|that f 2 Support(Jsx)||
|Value(x)||Value(x)|^ Jsx||// Compute|new value||
|if|(Value(x) then Worklist|< t)|Worklist|[ f x g||||
|// Post-process|Val|sets to|produce|CONSTANTS||||
|for each procedure CONSTANTS(p)||p||||||
|for each|formal|parameter|f to|p||||
|if|(Value(f) then Value(f)|D >)|?|||||
|if n FIGURE 9.21|(Value(f) then CONSTANTS(p)|6D ?)|CONSTANTS(p)||[ fhf, Value(f)ig|||

;

*in to Jsf*

;*)*

;

##### Iterative Interprocedural Constant Propagation Algorithm.

formal parameter.) The initialization phase optimistically sets all the *Value* fields to >. Next, it iterates over each actual parameter *a* at each call site *s* in the program, updates the *Value* field of *a*’s corresponding formal parameter *f* to *Value*( *f*) ^ *Jsf*, and adds *f* to the worklist. This step factors the initial set of constants represented by the jump functions into the *Value* fields and sets the worklist to contain all of the formal parameters.

The second phase repeatedly selects a formal parameter from the worklist and propagates it. To propagate formal parameter *f* of procedure *p*, the analyzer finds each call site *s* in *p* and each formal parameter *x* (which

**9.4** *Interprocedural Analysis* **525**
corresponds to an actual parameter of call site *s*) such that *f* 2 *Support*(*Jsx*). It evaluates *Jsx*and combines it with *Value*(*x*). If that changes *Value*(*x*), it adds *x* to the worklist. The worklist should be implemented with a data struc- ture, such as a sparse set, that only allows one copy of *x* in the worklist (see Section B.2.3).

The second phase terminates because each *Value* set can take on at most three lattice values: >, some *ci*, and ?. A variable *x* can only enter the worklist when its initial *Value* is computed or when its *Value* changes. Each variable *x* can appear on the worklist at most three times. Thus, the total number of changes is bounded and the iteration halts. After the second phase halts, a post-processing step constructs the sets of constants known on entry to each procedure.

##### Jump Function Implementation

Implementations of jump functions range from simple static approximations that do not change during analysis, through small parameterized models, to more complex schemes that perform extensive analysis at each jump- function evaluation. In any of these schemes, several principles hold. If the analyzer determines that parameter *x* at call site *s* is a known constant *c*, then *Jsx*D *c* and *Support*(*Jsx*)D;. If *y* 2 *Support*(*Jsx*) and *Value*(*y*) D>, For example, *Support*(*Jsx*) might contain a value *x x* read from a file, so *Jsx* D?. then *Js*D>. If the analyzer determines that the value of *Js*cannot be determined, then *Jsx*D?.

The analyzer can implement *Jsx*in many ways. A simple implementation might only propagate a constant if *x* is the ssa name of a formal parameter in the procedure containing *s*. (Similar functionality can be obtained using Reaches information from Section 9.2.4.) A more complex scheme might build expressions composed of ssa names of formal parameters and literal constants. An effective and expensive technique would be to run the sscp algorithm on demand to update the values of jump functions.

##### Extending the Algorithm

The algorithm shown in Figure 9.21 only propagates constant-valued actual parameters forward along call-graph edges. We can extend it, in a straight- forward way, to handle both returned values and variables that are global to a procedure.

Just as the algorithm builds jump functions to model the flow of values from caller to callee, it can construct *return jump functions* to model the values returned from callee to caller. Return jump functions are particularly impor- tant for routines that initialize values, whether filling in a common block in fortran or setting initial values for an object or class in Java. The algo- rithm can treat return jump functions in the same way that it handled ordinary

##### 526 CHAPTER 9 Data-Flow Analysis

jump functions; the one significant complication is that the implementation must avoid creating cycles of return jump functions that diverge (e.g. for a tail-recursive procedure).

To extend the algorithm to cover a larger class of variables, the compiler can simply extend the vector of jump functions in an appropriate way. Expanding the set of variables will increase the cost of analysis, but two factors mitigate the cost. First, in jump-function construction, the analyzer can notice that many of those variables do not have a value that can be modelled easily; it can map those variables onto a universal jump function that returns ? and avoid placing them on the worklist. Second, for the variables that might have constant values, the structure of the lattice ensures that they will be on the worklist at most twice. Thus, the algorithm should still run quickly.

##### SECTION REVIEW

Compilers perform interprocedural analysis to capture the behavior of all the procedures in the program and to bring that knowledge to bear on optimization within individual procedures. To perform interprocedural analysis, the compiler needs access to all of the code in the program. A typical interprocedural problem requires the compiler to build a call graph (or some analog), to annotate it with information derived directly from the individual procedures, and to propagate that information around the graph.

The results of interprocedural information are applied directly in intra- procedural analysis and optimization. For example, MAYMOD and MAYREF sets can be used to mitigate the impact of a call site on global data- flow analyses, or to avoid the necessity for-functions after a call site. Information from interprocedural constant propagation can be used to initialize a global algorithm, such as SSCP or SCCP.

##### Review Questions

**1.** What features of modern software might complicate interprocedural analysis?
**2.** How might the analyzer incorporate MAYMOD information into inter- procedural constant propagation? What effect would you expect it to have?
9.5 **ADVANCED TOPICS** Section 9.2 focused on iterative data-flow analysis. The text emphasizes the iterative approach because it is simple, robust, and efficient. Other

**9.5** *Advanced Topics* **527**
approaches to data-flow analysis tend to rely heavily on structural properties of the underlying graph. Section 9.5.1 discusses flow-graph reducibility—a critical property for most of the structural algorithms.

Section 9.5.2 revisits the iterative dominance framework from Section 9.2.1. The simplicity of that framework makes it attractive; however, more special- ized and complex algorithms have significantly lower asymptotic complexi- ties. In this section, we introduce a set of data structures that make the simple iterative technique competitive with the fast dominator algorithms for flow graphs of up to several thousand nodes.

9.5.1 **Structural Data-Flow Algorithms and** **Reducibility** In Chapters 8 and 9, we present the iterative algorithm because it works, in general, on any set of well-formed equations on any graph. Other data-flow analysis algorithms exist; many of these work by deriving a simple model of the control-flow structure of the code being analyzed and using that model to solve the equations. Often, that model is built by finding a sequence of trans- formations to the graph that reduce its complexity—by combining nodes or edges in carefully defined ways. This graph-reduction process lies at the heart of almost every data-flow algorithm *except* the iterative algorithm. Noniterative data-flow algorithms typically work by applying a series of transformations to a flow graph; each transformation selects a subgraph and replaces it by a single node to represent the subgraph. This creates a series of derived graphs in which each graph differs from its predecessor in the series by the effect of a single transformation step. As the analyzer trans- forms the graph, it computes data-flow sets for the new representer nodes in each successive derived graph. These sets summarize the replaced sub- graph’s effects. The transformations reduce well-behaved graphs to a single node. The algorithm then reverses the process, going from the final derived graph, with its single node, back to the original flow graph. As it expands the graph back to its original form, the analyzer computes the final data-flow sets for each node. In essence, the reduction phase gathers information from the entire graph **Reducible graph** and consolidates it, while the expansion phase propagates the effects in the A flow graph is*reducible*if the two consolidated set back out to the nodes of the original graph. Any graph for transformations,*T*1 and*T*2, will reduce it to a
single node. If that process fails, the graph is which such a reduction phase succeeds is deemed *reducible*. If the graph *irreducible*. cannot be reduced to a single node, it is *irreducible*. Other tests for reducibility exist. For example, if

Figure 9.22 shows a pair of transformations that can be used to test reducibil-

##### the iterative DOM framework, using an RPO

ity and to build a structural data-flow algorithm. *T* removes a self loop, traversal order, needs more than two iterations an edge that runs from a node back to itself. The figure shows *T* applied over a graph, that graph is irreducible.

##### 528 CHAPTER 9 Data-Flow Analysis

*a a a* *a* ⇒ ⇒ *b b b*

*T*1(*b*) *T*2(*a*,*b*) n **FIGURE 9.22** Transformations*T*1 and*T*2.

to *b*, denoted *T*1(*b*). *T*2folds a node *b* that has exactly one predecessor *a* back into *a*; it removes the edge h*a*, *b*i, and makes *a* the source of any edges that originally left *b*. If this leaves multiple edges from *a* to some node *n*, it consolidates those edges. Figure 9.22 shows *T*2applied to *a* and *b*, denoted *T*2(*a*, *b*). Any graph that can be reduced to a single node by repeated application of *T*1and *T*2is deemed reducible. To understand how this works, consider the cfg from our continuing example. Figure 9.23a shows one sequence of applications of *T*1and *T*2that reduces it to a single-

|node graph. It applies T||until no more opportunities exist: T|||(B, B ),|
|---|---|---|---|---|---|
|||2|||2 1 2|
|2 5 6|2 5 8|2 5 7|2 1 5|2 1 3||
|1 1|||2 0|2 0|4|

2 2 1 2 *T* (*B*, *B*), *T* (*B*, *B*), *T* (*B*, *B*), *T* (*B*, *B*), and *T* (*B*, *B*). Next, it uses *T* (*B*) to remove the loop, followed by *T* (*B*, *B*1) and *T* (*B*, *B*) to com- plete the reduction. Since the final graph is a single node, the original graph is reducible.

Other application orders also reduce the graph. For example, if we start with *T*2(*B*1, *B*5), it leads to a different series of transformations. *T*1and *T*2have the finite Church-Rosser property, which ensures that the final result is inde- pendent of the order of application and that the sequence terminates. Thus, the analyzer can apply *T*1and *T*2opportunistically—finding places in the graph where one of them applies and using it.

Figure 9.23b shows what can happen when we apply *T*1and *T*2to a

graph with multiple-entry loops. The analyzer uses *T*2(*B*0, *B*1) followed by *T*2(*B*0, *B*5). At that point, however, no remaining node or pair of nodes is a candidate for either *T*1or *T*2. Thus, the analyzer cannot reduce the graph any further. (No other order will work either.) The graph is not reducible to a single node; it is irreducible.

The failure of *T*1and *T*2to reduce this graph arises from a fundamental property of the graph. The graph is irreducible because it contains a loop, or cycle, that has edges that enter it at different nodes. In terms of the source language, the program that generated the graph has a loop with multiple entries. We can see this in the graph; consider the cycle formed by *B* and *B*.

|It has edges entering it from B|, B, and B|. Similarly, the cycle formed by||
|---|---|---|---|
||1 4|5||
|3 4|2|5||

*B* and *B* has edges that enter it from *B* and *B*.

**9.5** *Advanced Topics* **529**

|B|B|B|
|---|---|---|
|0|0|0|
|1|1|1|
|2 5|5|5|

?? *B B* H Hj HHj *B B B* A*B₆* H Hj *B₈* *T₂* *B₆* H Hj *B₈* A HHj)HHj A*B₇ B₇* AU R

|B|B|B|
|---|---|---|
|3|3|3|
|4|4|4|

?? *B B*

? *B* H Hj *B* *T₂*HHj *B₈* )R *B₇* R ? *B*

|B|B|B|
|---|---|---|
|0|0|0|
|1|1|1|
|5|5||
|2 7|2|2|
|3|3|3|
|4|4|4|

?? *B B* H Hj HHj *B B* *T T* )?) *B* R R *B B* ?? *B B*

*B*0*B*0

*T₂*?? *T₁*? *T₂* ) *B₁*) *B₁*) ?? *B*4*B*4

*B*0*B*0 + Q Qs *T₂* QQs *T₂* *B₁ B₅*) *B₅*) ? @R @R *B₂*-*B₃*-*B₄ B₂*-*B₃*-*B₄*

(b) An Irreducible Graph
n **FIGURE 9.23** Reduction Sequences for Example Graphs.

##### tions like T1and T2

modify the graph by splitting one or more nodes,

? *B*

*T* )

? *B* ? *B*

*B₀ T₂*

? ) *B₀* *B₄*

*B*0 C@ C @ CW @R *B₂*-*B₃*-*B₄*

##### or use an iterative

(a) Example CFG from Figure 9.2
Irreducibility poses a serious problem for algorithms built on transforma-. If the reduction sequence cannot complete, pro- ducing a single-node graph, then the method must either report failure,

approach to solve the system on the reduced graph. In general, the methods

##### 530 CHAPTER 9 Data-Flow Analysis

based on structurally reducing the flow graph are limited to reducible graphs. The iterative algorithm, in contrast, works correctly on an irreducible graph.

*B₀* To transform an irreducible graph to a reducible graph, the analyzer can + Q Qs split one or more nodes. The simplest split for the example graph, shown in

|B|B|||
|---|---|---|---|
|1|5|||
|||4|2 4|
|||3 2|3 4|
|20|40|||

the margin, clones *B*2and *B* to create *B* 0 and *B* 0, respectively. The ana- ? @R<u>-</u> *B₂ B₃ B₄* lyzer then retargets the edges (*B*, *B*) and (*B*, *B*) to form a complex loop, @R@I f*B₃*,*B₂*0,*B₄*0g. The new loop has a single entry, through *B₃*. *B B* This transformation creates a reducible graph that executes the same Irreducible Graph sequence of operations as the original graph. Paths that, in the original After Node Splitting

|graph, entered B||from either B|or B|now execute as prologues to the loop|
|---|---|---|---|---|
||3||2|4|
|3 2 3|4|2|4||

f*B*, *B* 0, *B* 0g. Both *B* and *B* have unique predecessors in the new graph. *B* has multiple predecessors, but it is the sole entry to the loop and the loop is reducible. Thus, node splitting produced a reducible graph, at the cost of cloning two nodes.

Both folklore and published studies suggest that irreducible graphs rarely arise in global data-flow analysis. The rise of structured programming in the 1970s made programmers much less likely to use arbitrary transfers of control, like a goto statement. Structured loop constructs, such as do, for, while, and until loops, cannot produce irreducible graphs. However, trans- ferring control out of a loop (for example, C’s break statement) creates a cfg that is irreducible to a backward analysis. (Since the loop has multiple exits, the reverse cfg has multiple entries.) Similarly, irreducible graphs may arise more often in interprocedural analysis due to mutually recursive subrou- tines. For example, the call graph of a hand-coded, recursive-descent parser is likely to have irreducible subgraphs. Fortunately, an iterative analyzer can handle irreducible graphs correctly and efficiently.

9.5.2 **Speeding up the Iterative Dominance** **Framework** The iterative framework for computing dominance is particularly simple. Where most data-flow problems have equations involving several sets, the equations for Dom involve computing a pairwise intersection over Dom sets and adding a single element to those sets. The simple nature of these equa- tions presents an opportunity to use a particularly simple data-structure to improve the speed of the Dom calculation. The iterative Dom framework uses a discrete Dom set at each node. We can reduce the amount of space required by the Dom sets by observing that

**9.5** *Advanced Topics* **531**
*B₀* ?? *B*1 @R *B*2*B*5 B @R *B B* B6 8 B @R B*B₇* BN *B*3 ? *B* 4

The Example CFG

the same information can be represented with a single fact at each node, its immediate dominator, or IDom. From the IDoms for the nodes, the compiler can compute all the other dominance information that it needs.

Recall our example cfg from Section 9.2.1, repeated in the margin with its dominator tree. Its IDom sets are as follows:

***B₀ B₁ B₂ B₃ B₄ B₅ B₆ B₇ B₈***

**IDOM(*n*)?** 0 1 1 3 1 5 5 5

Notice that the dominator tree and the IDoms are isomorphic. IDom(*b*) is just *b*’s predecessor in the dominator tree. The root of the dominator tree has no predecessor; accordingly, its IDom set is undefined.

The compiler can read a graph’s Dom sets from its dominator tree. For a node *n*, its Dom set can be read as the set of nodes that lie on the path from *n* to the root of the dominator tree, inclusive of the end points. In the example, the dominator-tree path from *B*

|to B consists of (B|, B, B|, B ), which|
|---|---|---|
|7 1 7|7 5 1|0|

matches the set computed for Dom(*B*) in Section 9.2.1.

Thus, we can use the IDom sets as a proxy for the Dom sets, provided we can provide efficient methods to initialize the sets and to intersect them. To handle the initializations, we will reformulate the iterative algorithm slightly. To intersect two Dom sets from their IDom sets, we will use the algorithm shown in procedure *Intersect* at the bottom of Figure 9.24. It relies on two critical facts.

**1.** When the algorithm walks the path from a node to the root to recreate a Dom set, it encounters the nodes in a consistent order. The intersection of two Dom sets is simply the common suffix of the labels on the paths from the nodes to the root.
**2.** The algorithm must be able to recognize the common suffix. It starts at the two nodes whose sets are being intersected, *i* and *j*, and walks upward from each toward the root. If we name the nodes by their rpo numbers, then a simple comparison will let the algorithm discover the nearest common ancestor—the IDom of *i* and *j*. The *Intersect* algorithm in Figure 9.24 is a variant of the classic “two finger” algorithm. It uses two pointers to trace paths upward through the tree. When they agree, they both point to the node representing the result of the intersection.
*B₀* ? *B₁* H Hj *B₂ B₅* *B₆* H Hj *B₈* ? *B*7 R *B₃* ? *B*4

Its Dominator Tree

##### 532 CHAPTER 9 Data-Flow Analysis

*for all nodes, b // initialize the dominators array* *IDoms[b] Undefined* *IDoms[b*0*] b*0 *Changed true* *while (Changed)* *Changed false* *for all nodes, b, in reverse postorder (except root)* *NewIDom first (processed) predecessor of b // pick one* *for all other predecessors, p, of b* *if IDoms[p]* 6D *Undefined // i.e., Doms[p] already calculated* *then NewIdom Intersect(p, NewIdom)* *if IDoms[b]* 6D *NewIdom then* *IDoms[b] NewIdom* *Changed true*

*Intersect( i, j )* *finger1 i* *finger2 j* *while (finger1* 6D *finger2)* *while (RPO(finger1) > RPO(finger2))* *finger1 = IDoms[finger1]* *while (RPO(finger2) > RPO(finger1))* *finger2 = IDoms[finger2]* *return finger1*

n **FIGURE 9.24** The Modified Iterative Dominator Algorithm.

The top of Figure 9.24 shows a reformulated iterative algorithm that avoids the issue of initializing the IDom sets and uses the *Intersect* algorithm. It The algorithm assigns IDOM(b₀) the value b₀ to keeps the IDom information in an array, *IDoms*. It initializes the IDom entry simplify the rest of the algorithm. for the root, b₀, to itself. It then processes the nodes in reverse postorder. In computing intersections, it ignores predecessors whose IDoms have not yet been computed.

To see how the algorithm operates, consider the graph in Figure 9.25a.

Figure 9.25b shows an rpo for this graph that illustrates the problems caused

by irreducibility. Using this order, the algorithm miscomputes the IDoms of *B*, and *B* in the first iteration. It takes two iterations for the algorithm to correct those IDoms, and a final iteration to recognize that the IDoms have stopped changing.

**9.6** *Summary and Perspective* **533**
*B*0 Q + QQs *B*1*B*5

|IDOM(|n)||
|---|---|---|
|B₀ B₁ B₂|B₃|B₄ B₅|

@ ? <u>@R</u> *B₂*-*B₃*-*B₄*

(a) An Irreducible Graph
— 0**?????** 1 0 0 0 5 5 0 2 0 0 0 0 5 0 ***B*** **0*B*1*B*2*B*3*B*4*B*5** 3 0 0 0 0 0 0 **RPO(*n*)** 0 1 5 4 3 2 4 0 0 0 0 0 0

(b) A Worst-Case RPO (c) Progress of the IDOM Computation
n **FIGURE 9.25** A Graph with a More Complex Shape.

This improved algorithm runs quickly. It has a small memory footprint. On any reducible graph, it halts in two passes: the first pass computes the correct IDom sets and the second pass confirms that no changes occur. An irre- ducible graph will take more than two passes. In fact, the algorithm provides a rapid test for reducibility—if any IDom entry changes in the second pass, the graph is irreducible.

9.6 **SUMMARY AND PERSPECTIVE** Most optimization tailors general-case code to the specific context that occurs in the compiled code. The compiler’s ability to tailor code is often limited by its lack of knowledge about the program’s range of runtime behaviors. Data-flow analysis allows the compiler to model the runtime behavior of a program at compile time and to draw important, specific knowledge out of the models. Many data-flow problems have been proposed; this chapter presented several of them. Many of those problems have properties that lead to efficient analyses. In particular, problems that can be expressed in iterative frameworks have efficient solutions using simple iterative solvers. ssa form is an intermediate form that encodes both data-flow information and control-dependence information into the name space of the program. Working with ssa form often simplifies both analysis and transformation. Many modern transformations rely on the ssa form of the code.

##### 534 CHAPTER 9 Data-Flow Analysis

n **CHAPTER NOTES** Credit for the first data-flow analysis is usually given to Vyssotsky at Bell Labs in the early 1960s [338]. Earlier work, in the original fortran com- piler, included the construction of a control-flow graph and a Markov-style analysis over the cfg to estimate execution frequencies [26]. This analyzer, built by Lois Haibt, might be considered a data-flow analyzer.

Iterative data-flow analysis has a long history in the literature. Among the seminal papers on this topic are Kildall’s 1973 paper [223], work by Hecht and Ullman [186], and two papers by Kam and Ullman [210, 211]. The treatment in this chapter follows Kam’s work.

This chapter focuses on iterative data-flow analysis. Many other algo- rithms for solving data-flow problems have been proposed [218]. The interested reader should explore the structural techniques, including inter- val analysis [17, 18, 62]; *T*1-*T*2analysis [336, 185]; the Graham-Wegman algorithm [168, 169]; balanced-tree, path-compression algorithm [330, 331]; graph grammars [219]; and the partitioned-variable technique [359].

Dominance has a long history in the literature. Prosser introduced domi- nance in 1959 but gave no algorithm to compute dominators [290]. Lowry and Medlock describe the algorithm used in their compiler [252]; it takes at least *O.N* 2 */* time, where *N* is the number of statements in the procedure. Several authors developed faster algorithms based on removing nodes from the cfg [8, 3, 291]. Tarjan proposed an *O.N* log*N* C *E /* algorithm based on depth-first search and union find [329]. Lengauer and Tarjan improved this time bound [244], as did others [180, 23, 61]. The data-flow formulation for dominators is taken from Allen [12, 17]. The fast data structures for itera- tive dominance are due to Harvey [100]. The algorithm in Figure 9.8 is from Ferrante, Ottenstein, and Warren [145].

The ssa construction is based on the seminal work by Cytron et al. [110]. It, in turn, builds on work by Shapiro and Saint [313]; by Reif [295, 332]; and by Ferrante, Ottenstein, and Warren [145]. The algorithm in Section 9.3.3 builds semipruned ssa form [49]. The details of the renaming algorithm and the algorithm for reconstructing executable code are described by Briggs et al. [50]. The complications introduced by critical edges have long been recognized in the literature of optimization [304, 133, 128, 130, 225]; it should not be surprising that they also arise in the translation from ssa back into executable code. The sparse simple constant algorithm, sscp, is due to Reif and Lewis [296]. Wegman and Zadeck reformulate sscp to use ssa form [346, 347].

##### Exercises 535

The ibm pl/i optimizing compiler was one of the earliest systems to per- form interprocedural data-flow analysis [322]. A large body of literature has emerged on side-effect analysis [34, 32, 102, 103]. The interprocedural constant propagation algorithm is from Torczon’s thesis and subsequent papers [68, 172, 263]; both Cytron and Wegman suggested other approaches to the problem [111, 347]. Burke and Torczon [64] formulated an analy- sis that determines which modules in a large program must be recompiled in response to a change in a program’s interprocedural information. Pointer analysis is inherently interprocedural; a growing body of literature describes that problem [348, 197, 77, 238, 80, 123, 138, 351, 312, 190, 113, 191]. Ayers, Gottlieb, and Schooler described a practical system that analyzed and optimized a subset of the entire program [25].

n **EXERCISES**

**1.** The algorithm for live analysis in Figure 9.2 initializes the LiveOut Section 9.2 set of each block to. Are other initializations possible? Do they change the result of the analysis? Justify your answer.
**2.** In live-variable analysis, how should the compiler treat a block containing a procedure call? What should the block’s UEVar set contain? What should its VarKill set contain?
**3.** In the computation of available expressions, the initialization sets
AvailIn(*n*0) D;, and AvailIn(*n*) Df*all expressions*g, 8*n* 6D *n*0 Construct a small example program that shows why the latter initialization is necessary. What happens on your example if the AvailIn sets are uniformly initialized to ;?

**4.** For each of the following control-flow graphs:

|B||B|
|---|---|---|
|0||0|
|1|2|1|
|3 4|5|2|
|6|7|3 6|
|8|9|4 7|
|10||5 8|

Q + Qs?? *B B B* Q ?? + Qs? *B B B B* QQs ? + + 3 ?6 *B B B B* ???6?6 *B B B B* Q Qs +?6?6 *B B B*

(a) Multiple Loops (b) Doubled Loop Body

##### 536 CHAPTER 9 Data-Flow Analysis

**a.** Compute reverse postorder numberings for the cfg and the reverse cfg.
**b.** Compute reverse preorder on the cfg.
**c.** Is reverse preorder on the cfg equivalent to postorder on the reverse cfg?
Section 9.3 **5.** Consider the three control-flow graphs shown below.

<u>-</u> *B*0

|||B||B|
|---|---|---|---|---|
|1||0||0|
|||2||2|
|||3||3|
|||4|5||
|||6|||
|7|||||
|8|9|8||12|

*B* 0 0 @ @R?*B₁* + *B* ? *B* ?? *B₂*H ?*B* ? *B* ? HHj *B₇* *B₃* Q Q Q @ @R *B* ? + Qs *B* ? *B₄* + Qs *B₅ B₈* + Qs *B₉* *B₄ B₅* Q Q @ @R *B* ? Qs *B₆* + Qs *B₁₀* + *B₆* Q H ? Qs *B₇* H Hj *B₁₁* *B* @ @R *B* ? *B* ? *B B* ???

(a) (b) (c)
**a.** Compute the dominator trees for cfgs a, b, and c.
**b.** Compute the dominance frontiers for nodes 3 and 5 of cfg a, nodes 4 and 5 of cfg b, and nodes 3 and 11 of cfg c.
**6.** Translate the code shown in Figure 9.26 to ssa form. Show only the final code, after both-insertion and renaming.
**7.** Consider the set of all blocks that receive a-function because of an assignment x... in some block *b*. The algorithm in Figure 9.9 inserts a-function in each block in df(*b*). Each of those blocks is added to the worklist; they, in turn, can add nodes in their df sets to the worklist. The algorithm uses a checklist to avoid adding a block to the worklist more than once. Call the set of all these blocks df
C

(*b*).
We can define df C

(*b*) as the limit of the sequence
df1(*b*) D df(*b*)

|df (b) D df|(b) [||df (x)|
|---|---|---|---|
|2|1|x 2DF₁.b/|1|
|3|2|x 2DF₂.b/|2|
|i|i 1|x 2DF|.b/ i 1|

2 1 *x*2DF₁*.b/* 1 df (*b*) D df (*b*) [ df (*x*)

df (*b*) D df (*b*) [*i*df (*x*)

##### Exercises 537

|B₀|Y|||
|---|---|---|---|
|a|= k + 2|||
|c|= d-b|||
|d|= a + b|||
|f = b-d|2 f =|i-d||
|k = d >> 2|e =|k >> 2||
|e = c + a|b =|a + f||
|3 d|= b * 2|4 d =|b + 1|
|g|= 2 * 2 5 i = c =|i + 1 d >> 4||
|6 k|= a-e|||
|f|= e + k|||
|d|= c + b|||

HHj *B*1*B*

H <u>Hj</u> *B B*

HHj *B*

R *B*

n **FIGURE 9.26** CFG for Problem 6.

Using these extended sets, *DF* C *.b/*, leads to a simpler algorithm for inserting-functions.

**a.** Develop an algorithm for computing *DF*
C *.b/*.

**b.** Develop an algorithm for inserting-functions using these *DF*
C sets.

**c.** Compare the overall cost of your algorithm, including the computation of *DF*
C sets, to the cost of the-insertion algorithm given in Section 9.3.3.

**8.** The maximal ssa construction is both simple and intuitive. However, it can insert many more-functions than the semipruned algorithm. In particular, it can insert both redundant-functions (xi(xj,xj)) and dead-functions—where the result is never used.
**a.** Propose a method for detecting and removing the extra-functions that the maximal construction inserts.
**b.** Can your method reduce the set of-functions to just those that the semipruned construction inserts?
**c.** Contrast the asymptotic complexity of your method against that of the semipruned construction.
**9.** Dominance information and ssa form allow us to improve the superlocal value numbering algorithm (svn) from Section 8.5.1. Assume the code is in ssa form.
**a.** For each node in the cfg with multiple predecessors, svn begins with an empty hash table. For such a block, *bi*, can you use

##### 538 CHAPTER 9 Data-Flow Analysis

dominance information to select a block whose facts must hold on entry to *bi*?

**b.** On what properties of ssa form does this algorithm rely?
**c.** Assuming that the code is already in ssa form, with dominance information available, what is the extra cost of this dominator-based value numbering?
Section 9.4 **10.** For each of the following control-flow graphs, show whether or not it is reducible:

**B₀* ?K*B₀* *B₁* Q <u>-</u>?II + Qs ?

|||B|||B|B|
|---|---|---|---|---|---|---|
|0||0||2|1|2|
|1|2|1|2|3|3||
|3|4|3|4|4|4||

*B* *B* Q Q Q + Qs?+ Qs ? ? Qs + *B B B B* *B* *B* P P ? )PPPq??)PPPq? ? ? *B B B B* *B* *B*

(a) (b) (c) (d)
**11.** Prove that the following definition of a reducible graph is equivalent to the definition that uses the transformations *T₁* and *T₂*: “A graph *G* is reducible if and only if for each cycle in *G*, there exists a node *n* in the cycle with the property that *n* dominates every node in that cycle.”
**12.** Show a sequence of reductions, using *T*1and *T*2, that reduce the following graph:
*B*

|0||
|---|---|
|1|5|
|2 3|4|
|2|4|

+ Q Qs *B B* ? @R<u>-</u> *B B B* @R@I *B* 0 *B* 0

#### Chapter 10

