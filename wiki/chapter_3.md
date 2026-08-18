## Parsers

n **CHAPTER OVERVIEW** The parser’s task is to determine if the input program, represented by the stream of classified words produced by the scanner, is a valid sentence in the programming language. To do so, the parser attempts to build a derivation for the input program, using a grammar for the programming language.

This chapter introduces context-free grammars, a notation used to specify the syntax of programming languages. It develops several techniques for finding a derivation, given a grammar and an input program.

**Keywords:** Parsing, Grammar, ll(1), lr(1), Recursive Descent

3.1 **INTRODUCTION** Parsing is the second stage of the compiler’s front end. The parser works with the program as transformed by the scanner; it sees a stream of words where each word is annotated with a syntactic category (analogous to its part of speech). The parser derives a syntactic structure for the program, fitting the words into a grammatical model of the source programming language. If the parser determines that the input stream is a valid program, it builds a concrete model of the program for use by the later phases of compilation. If the input stream is not a valid program, the parser reports the problem and appropriate diagnostic information to the user. As a problem, parsing has many similarities to scanning. The formal prob- lem has been studied extensively as part of formal language theory; that work forms the theoretical basis for the practical parsing techniques used in most compilers. Speed matters; all of the techniques that we will study take time proportional to the size of the program and its representation. Low- level detail affects performance; the same implementation tradeoffs arise **Engineering a Compiler**. **DOI: 10.1016/B978-0-12-088478-0.00003-7** Copyright c 2012, Elsevier Inc. All rights reserved.

##### 84 CHAPTER 3 Parsers

in parsing as in scanning. The techniques in this chapter are amenable to implementation as table-driven parsers, direct-coded parsers, and hand- coded parsers. Unlike scanners, where hand-coding is common, tool- generated parsers are more common than hand-coded parsers.

##### Conceptual Roadmap

The primary task of the parser is to determine whether or not the input pro- gram is a syntactically valid sentence in the source language. Before we can build parsers that answer this question, we need both a formal mechanism for specifying the syntax of the source language and a systematic method of determining membership in this formally specified language. By restricting the form of the source language to a set of languages called context-free lan- guages, we can ensure that the parser can efficiently answer the membership question. Section 3.2 introduces context-free grammars (cfgs) as a notation for specifying syntax.

Many algorithms have been proposed to answer the membership question for cfgs. This chapter examines two different approaches to the problem. Section 3.3 introduces top-down parsing in the form of recursive-descent parsers and ll(1) parsers. Section 3.4 examines bottom-up parsing as exemplified by lr(1) parsers. Section 3.4.2 presents the detailed algorithm for generating canonical lr(1) parsers. The final section explores several practical issues that arise in parser construction.

##### Overview

A compiler’s parser has the primary responsibility for recognizing syntax— that is, for determining if the program being compiled is a valid sentence in the syntactic model of the programming language. That model is expressed as a formal grammar *G*; if some string of words *s* is in the language defined by *G* we say that *G derives s*. For a stream of words *s* and a grammar G, the parser tries to build a constructive proof that *s* can be derived in *G*—a **Parsing** process called *parsing*. given a stream*s*of words and a grammar*G*, find a derivation in*G*that produces*s* Parsing algorithms fall into two general categories. Top-down parsers try to match the input stream against the productions of the grammar by pre- dicting the next word (at each point). For a limited class of grammars, such prediction can be both accurate and efficient. Bottom-up parsers work from low-level detail—the actual sequence of words—and accumulate con- text until the derivation is apparent. Again, there exists a restricted class of grammars for which we can generate efficient bottom-up parsers. In prac- tice, these restricted sets of grammars are large enough to encompass most features of interest in programming languages.

**3.2** *Expressing Syntax* **85**
3.2 **EXPRESSING SYNTAX** The task of the parser is to determine whether or not some stream of words fits into the syntax of the parser’s intended source language. Implicit in this description is the notion that we can describe syntax and check it; in practice, we need a notation to describe the syntax of languages that people might use to program computers. In Chapter 2, we worked with one such notation, regular expressions. They provide a concise notation for describing syntax and an efficient mechanism for testing the membership of a string in the language described by an re. Unfortunately, res lack the power to describe the full syntax of most programming languages. For most programming languages, syntax is expressed in the form of a context-free grammar. This section introduces and defines cfgs and explores their use in syntax-checking. It shows how we can begin to encode meaning into syntax and structure. Finally, it introduces the ideas that underlie the efficient parsing techniques described in the following sections.
3.2.1 **Why Not Regular Expressions?** To motivate the use of cfgs, consider the problem of recognizing algebraic expressions over variables and the operators +, -, ×, and ÷. We can define “variable” as any string that matches the re [*a... z*] ([*a... z*] j [*0*.. .*9*]), a simplified, lowercase version of an Algol identifier. Now, we can define an expression as follows: [*a... z*]*.*[*a... z*] j [*0 ::: 9*]*/..*+ j-j × j ÷*/* [*a... z*]*.*[*a... z*] j [*0 ::: 9*]*/ /* This re matches “a + b × c” and “fee ÷ fie × foe”. Nothing about the re suggests a notion of operator precedence; in “a + b × c,” which operator exe- cutes first, the + or the × ? The standard rule from algebra suggests × and ÷ have precedence over + and -. To enforce other evaluation orders, normal algebraic notation includes parentheses. Adding parentheses to the re in the places where they need to appear is somewhat tricky. An expression can start with a ‘(’, so we need the option We will underline ( and ) so that they are visually for an initial (. Similarly, we need the option for a final ). distinct from the ( and ) used for grouping in REs.
( ( j ) [*a... z*] ([*a... z*] j [*0*.. .*9*]) ( (+ j-j × j ÷) [*a... z*] ([*a... z*] j [*0*.. .*9*])) ( ) j )

This re can produce an expression enclosed in parentheses, but not one with internal parentheses to denote precedence. The internal instances of <u>(</u> all occur before a variable; similarly, the internal instances of ) all occur

##### 86 CHAPTER 3 Parsers

##### Context-free grammar

For a language*L*, its CFG defines the sets of strings of symbols that are valid sentences in*L*.

##### Sentence

a string of symbols that can be derived from the rules of a grammar

##### Production

##### Each rule in a CFG is called aproduction.

##### Nonterminal symbol

##### a syntactic variable used in a grammar’s

productions **Terminal symbol** a word that can occur in a sentence A word consists of a lexeme and its syntactic category. Words are represented in a grammar by their syntactic category

after a variable. This observation suggests the following re:

( ( j ) [*a... z*] ([*a... z*] j [*0*.. .*9*]) ( (+ j-j × j ÷) [*a... z*] ([*a... z*] j [*0*.. .*9*]) ( ) j ) )

Notice that we simply moved the final ) inside the closure.

This re matches both “a + b × c” and “( a + b ) × c.” It will match any cor- rectly parenthesized expression over variables and the four operators in the re. Unfortunately, it also matches many syntactically incorrect expressions, such as “a + ( b × c” and “a + b ) × c ).” In fact, we cannot write an re that will match all expressions with balanced parentheses. (Paired constructs, such as begin and end or then and else, play an important role in most programming languages.) This fact is a fundamental limitation of res; the corresponding recognizers cannot count because they have only a finite set of states. The language ( *m* <u>)</u> *n* where *m* D *n* is not regular. In principle, dfas cannot count. While they work well for microsyntax, they are not suitable to describe some important programming language features.

3.2.2 **Context-Free Grammars** To describe programming language syntax, we need a more powerful nota- tion than regular expressions that still leads to efficient recognizers. The traditional solution is to use a context-free grammar (cfg). Fortunately, large subclasses of the cfgs have the property that they lead to efficient recognizers. A context-free grammar, *G*, is a set of rules that describe how to form sen- tences. The collection of sentences that can be derived from *G* is called the *language defined by G*, denoted *G*. The set of languages defined by context- free grammars is called the set of context-free languages. An example may help. Consider the following grammar, which we call *SN*:
*SheepNoise*! baa *SheepNoise* j baa

The first rule, or *production* reads “*SheepNoise* can derive the word baa followed by more *SheepNoise*.” Here *SheepNoise* is a syntactic variable representing the set of strings that can be derived from the grammar. We call such a syntactic variable a *nonterminal symbol*. Each word in the lan- guage defined by the grammar is a *terminal symbol*. The second rule reads “*SheepNoise* can also derive the string baa.”

To understand the relationship between the *SN* grammar and *L*(*SN*), we need to specify how to apply rules in *SN* to derive sentences in *L*(*SN*). To begin, we must identify the *goal symbol* or *start symbol* of *SN*. The goal symbol

**3.2** *Expressing Syntax* **87**
##### BACKUS-NAUR FORM

The traditional notation used by computer scientists to represent a context-free grammar is called *Backus-Naur form*, or BNF. BNF denoted non- terminal symbols by wrapping them in angle brackets, like hSheepNoisei. Terminal symbols were underlined. The symbol ::= means "derives," and the symbol j means "also derives." In BNF, the sheep noise grammar becomes:

##### hSheepNoisei ::= baa hSheepNoisei

j <u>baa</u>

##### This is completely equivalent to our grammar SN.

BNF has its origins in the late 1950s and early 1960s [273]. The syntac- tic conventions of angle brackets, underlining, ::=, and j arose from the limited typographic options available to people writing language descrip- tions. (For example, see David Gries’ book *Compiler Construction for Digital* *Computers*, which was printed entirely on a standard lineprinter [171].) Throughout this book, we use a typographically updated form of BNF. Nonterminals are written in *italics*. Terminals are written in the type- writer font. We use the symbol ! for "derives."

represents the set of all strings in *L*(*SN*). As such, it cannot be one of the words in the language. Instead, it must be one of the nonterminal symbols introduced to add structure and abstraction to the language. Since *SN* has only one nonterminal, *SheepNoise* must be the goal symbol.

|To derive a sentence, we start with a prototype string that contains just the|||Derivation|
|---|---|---|---|
|goal symbol, SheepNoise. We pick a nonterminal symbol,||, in the prototype|a sequence of rewriting steps that begins with|
|string, choose a grammar rule,|!, and rewrite|with. We repeat this|the grammar’s start symbol and ends with a|

##### sentence in the language

rewriting process until the prototype string contains no more nonterminals, at which point it consists entirely of words, or terminal symbols, and is a sentence in the language.

At each point in this derivation process, the string is a collection of terminal or nonterminal symbols. Such a string is called a *sentential form* if it occurs **Sentential form** in some step of a valid derivation. Any sentential form can be derived from a string of symbols that occurs as one step in a the start symbol in zero or more steps. Similarly, from any sentential form valid derivation we can derive a valid sentence in zero or more steps. Thus, if we begin with *SheepNoise* and apply successive rewrites using the two rules, at each step in the process the string is a sentential form. When we have reached the point where the string contains only terminal symbols, the string is a sentence in *L*(*SN*).

##### 88 CHAPTER 3 Parsers

##### CONTEXT-FREE GRAMMARS

Formally, a context-free grammar *G* is a quadruple (*T, NT, S, P*) where:

*T* is the set of terminal symbols, or words, in the language *L*(*G*). Ter- minal symbols correspond to syntactic categories returned by the scanner. *NT* is the set of nonterminal symbols that appear in the productions of *G*. Nonterminals are syntactic variables introduced to provide abstraction and structure in the productions. *S* is a nonterminal designated as the *goal symbol* or *start symbol* of the grammar. *S* represents the set of sentences in *L*(*G*). *P* is the set of productions or rewrite rules in *G*. Each rule in *P* has the form *NT*!*.T* [ *NT/* C; that is, it replaces a single nonterminal with a string of one or more grammar symbols.

The sets *T* and *NT* can be derived directly from the set of productions, *P*. The start symbol may be unambiguous, as in the *SheepNoise* grammar, or it may not be obvious, as in the following grammar:

##### Paren! ( Bracket) Bracket! [ Paren]

##### j () j []

In this case, the choice of start symbol determines the shape of the outer brackets. Using *Paren* as *S* ensures that every sentence has an outermost pair of parentheses, while using *Bracket* forces an outermost pair of square brackets. To allow either, we would need to introduce a new symbol *Start* and the productions *Start*!*Paren* j *Bracket*.

Some tools that manipulate grammars require that *S* not appear on the right-hand side of any production, which makes *S* easy to discover.

To derive a sentence in *SN*, we start with the string that consists of one sym- bol, *SheepNoise*. We can rewrite *SheepNoise* with either rule 1 or rule 2. If we rewrite *SheepNoise* with rule 2, the string becomes baa and has no further opportunities for rewriting. The rewrite shows that baa is a valid sentence in *L*(*SN*). The other choice, rewriting the initial string with rule 1, leads to a string with two symbols: baa *SheepNoise*. This string has one remaining nonterminal; rewriting it with rule 2 leads to the string baa baa, which is a sentence in *L*(*SN*). We can represent these derivations in tabular form:

**Rule Sentential Form Rule Sentential Form**

*SheepNoise SheepNoise* <u>baa</u> baa *SheepNoise* <u>baa baa</u>

Rewrite with Rule 2 Rewrite with Rules 1 Then 2

**3.2** *Expressing Syntax* **89**
As a notational convenience, we will use ! C to mean “derives in one or more steps.” Thus, *SheepNoise*!C baa and *SheepNoise*!C baa baa.

Rule 1 lengthens the string while rule 2 eliminates the nonterminal *Sheep-* *Noise*. (The string can never contain more than one instance of *SheepNoise*.) All valid strings in *SN* are derived by zero or more applications of rule 1, followed by rule 2. Applying rule 1 *k* times followed by rule 2 generates a string with *k* C 1 baas.

3.2.3 **More Complex Examples** The *SheepNoise* grammar is too simple to exhibit the power and complexity of cfgs. Instead, let’s revisit the example that showed the shortcomings of res: the language of expressions with parentheses.
<u>()</u>

|1 Expr|!|Expr|
|---|---|---|
|2|j Expr|Op|
|3|j||
|4 Op|!||
|5|j||
|6|j||
|7|j||

name name + - × ÷

Beginning with the start symbol, *Expr*, we can generate two kinds of sub- terms: parenthesized subterms, with rule 1, or plain subterms, with rule 2. To generate the sentence “(a + b) × c”, we can use the following rewrite sequence (2,6,1,2,4,3), shown on the left. Remember that the grammar deals with syntactic categories, such as name rather than lexemes such as a, b, or c.

*Expr* **Rule Sentential Form** *Expr Op* <name,c> *Expr* 2 *Expr Op* name

|Expr||()|Expr|
|---|---|---|---|
|× name ( Expr ) × name||--||
|( Expr name ) ( Expr + name )|× name × name||<name,b>|
|( name + name )|× name|<name,a>|+|

6 × name-- × 1 2 *Op* *Expr Op* 4 3

Rightmost Derivation of ( a + b ) × c Corresponding Parse Tree

The tree on the right, called a *parse tree*, represents the derivation as a **Parse tree or syntax tree** graph. a graph that represents a derivation

##### 90 CHAPTER 3 Parsers

##### Rightmost derivation

##### a derivation that rewrites, at each step, the

rightmost nonterminal

##### Leftmost derivation

##### a derivation that rewrites, at each step, the

leftmost nonterminal

**Rule**

||name||
|---|---|---|
|( Expr )|name||
|( Expr|name )|name|
|( name|name )|name|
|( name|+ name )|name|
|( name|+ name )|× name|

1 2 3 4 6

This simple cfg for expressions cannot generate a sentence with unbalanced or improperly nested parentheses. Only rule 1 can generate an open paren- thesis; it also generates the matching close parenthesis. Thus, it cannot generate strings such as “a + ( b × c” or “a + b ) × c),” and a parser built from the grammar will not accept the such strings. (The best re in Section 3.2.1 matched both of these strings.) Clearly, cfgs provide us with the ability to specify constructs that res do not.

The derivation of (a + b) × c rewrote, at each step, the rightmost remaining nonterminal symbol. This systematic behavior was a choice; other choices are possible. One obvious alternative is to rewrite the leftmost nonterminal at each step. Using leftmost choices would produce a different deriva- tion sequence for the same sentence. The leftmost derivation of (a + b) × c would be:

*Expr* **Sentential Form** *Expr Op* <name,c> *Expr* *Expr Op* *Op*-- () *Expr* × *Op Op* *Op Op Expr Op* <name,b> *Op*

<name,a> +

Corresponding Parse Tree

The leftmost and rightmost derivations use the same set of rules; they apply those rules in a different order. Because a parse tree represents the rules applied, but not the order of their application, the parse trees for the two derivations are identical.

From the compiler’s perspective, it is important that each sentence in the language defined by a cfg has a unique rightmost (or leftmost) derivation. If multiple rightmost (or leftmost) derivations exist for some sentence, then, at some point in the derivation, multiple distinct rewrites of the rightmost (or leftmost) nonterminal lead to the same sentence. A grammar in which multiple rightmost (or leftmost) derivations exist for a sentence is called an *ambiguous* grammar. An ambiguous grammar can produce multiple deriva- tions and multiple parse trees. Since later stages of translation will associate meaning with the detailed shape of the parse tree, multiple parse trees imply multiple possible meanings for a single program—a bad property for a pro- gramming language to have. If the compiler cannot be sure of the meaning of a sentence, it cannot translate it into a definitive code sequence.

##### Ambiguity

##### A grammarGisambiguousif some sentence in

##### L(G) has more than one rightmost (or leftmost)

derivation.

Leftmost Derivation of ( a + b ) x c

**3.2** *Expressing Syntax* **91**
The classic example of an ambiguous construct in the grammar for a pro- gramming language is the if-then-else construct of many Algol-like languages. The straightforward grammar for if-then-else might be

if *Expr* then *Statement* else *Statement*

|1 Statement|!|
|---|---|
|2|j|
|3|j Assignment|
|4|j... other statements...|

if *Expr* then *Statement*

This fragment shows that the else is optional. Unfortunately, the code fragment

if *Expr*1 then if *Expr*2 then*Assignment*1 else*Assignment₂*

has two distinct rightmost derivations. The difference between them is simple. The first derivation has *Assignment*2controlled by the inner if, so *Assignment*2executes when *Expr*1is true and *Expr*2is false:

*Statement*

if *Expr Statement*

|1then||
|---|---|
|if|2then|

*Expr Statement* else *Statement*

*Assignment*1*Assignment*2

The second derivation associates the else clause with the first if, so that *Assignment*2executes when *Expr*1is false, independent of the value of *Expr*2:

*Statement*

if *Expr*1then *Statement* else *Statement*

if *Expr*2then *Statement Assignment*2

*Assignment*

Clearly, these two derivations produce different behaviors in the compiled code.

##### 92 CHAPTER 3 Parsers

To remove this ambiguity, the grammar must be modified to encode a rule that determines which if controls an else. To fix the if-then-else grammar, we can rewrite it as

if *Expr* then *Statement*

|1 Statement|!|
|---|---|
|2|j|
|3|j Assignment|
|4 WithElse|!|
|5|j Assignment|

if *Expr* then *WithElse* else *Statement*

if *Expr* then *WithElse* else *WithElse*

The solution restricts the set of statements that can occur in the then part of an if-then-else construct. It accepts the same set of sentences as the original grammar, but ensures that each else has an unambiguous match to a specific if. It encodes into the grammar a simple rule—bind each else to the innermost unclosed if. It has only one rightmost derivation for the example.

**Rule Sentential Form**

*Statement* 1 if *Expr* then *Statement* 2 if *Expr* then if *Expr* then *WithElse* else *Statement* 3 if *Expr* then if *Expr* then *WithElse* else *Assignment* <u>5 if Expr then if Expr then Assignment else Assignment</u>

##### The rewritten grammar eliminates the ambiguity.

The if-then-else ambiguity arises from a shortcoming in the original grammar. The solution resolves the ambiguity in a way by imposing a rule that is easy for the programmer to remember. (To avoid the ambiguity entirely, some language designers have restructured the if-then-else con- struct by introducing elseif and endif.) In Section 3.5.3, we will look at other kinds of ambiguity and systematic ways of handling them.

3.2.4 **Encoding Meaning into Structure** The if-then-else ambiguity points out the relationship between mean- ing and grammatical structure. However, ambiguity is not the only situation where meaning and grammatical structure interact. Consider the parse tree that would be built from a rightmost derivation of the simple expression a + b x c.

**3.2** *Expressing Syntax* **93**
**Rule Sentential Form** *Expr*

*Expr* *Expr Op* <name,c> 2 *Expr Op* name 6 *Expr* x name

|x name|||
|---|---|---|
|name|x name|<name,b>|
|+ name|x name||
|name + name|x name|+|

*Expr Op* × 2 *Expr Op* 4 *Expr* <u>3</u> <name,a>

Derivation of a + b x c Corresponding Parse Tree

One natural way to evaluate the expression is with a simple postorder tree- walk. It would first compute a + b and then multiply that result by c to produce the result (a + b) x c. This evaluation order contradicts the classic rules of algebraic precedence, which would evaluate it as a + (b x c). Since the ultimate goal of parsing the expression is to produce code that will imple- ment it, the expression grammar should have the property that it builds a tree whose “natural” treewalk evaluation produces the correct result.

The real problem lies in the structure of the grammar. It treats all of the arithmetic operators in the same way, without any regard for precedence. In the parse tree for (a + b) x c, the fact that the parenthetic subexpression was forced to go through an extra production in the grammar adds a level to the parse tree. The extra level, in turn, forces a postorder treewalk to evaluate the parenthetic subexpression before it evaluates the multiplication.

We can use this effect to encode operator precedence levels into the gram- mar. First, we must decide how many levels of precedence are required. In the simple expression grammar, we have three levels of precedence: highest precedence for ( ), medium precedence for x and ÷, and lowest prece- dence for + and -. Next, we group the operators at distinct levels and use a nonterminal to isolate the corresponding part of the grammar. Figure 3.1

|0 Goal|! Expr||
|---|---|---|
|1 Expr|! Expr|Term|
|2|j Expr|Term|
|3|j Term||
|4 Term|! Term|Factor|
|5|j Term|Factor|
|6|j Factor||
|7 Factor|! Expr||
|8|j||
|9|j||

+ -

x ÷

<u>()</u> num name

n **FIGURE 3.1** The Classic Expression Grammar.

##### 94 CHAPTER 3 Parsers

shows the resulting grammar; it includes a unique start symbol, *Goal*, and a production for the terminal symbol num that we will use in later examples.

In the classic expression grammar, *Expr*, represents the level for + and -, *Term* represents the level for × and ÷, and *Factor* represents the level for (). In this form, the grammar derives a parse tree for a + b x c that is consistent with standard algebraic precedence, as shown below.

*Expr* **Rule Sentential Form**

*Expr Expr* + *Term* 1 *Expr* + *Term*

|+|||
|---|---|---|
|+|x||
|+|x name||
|+|x name||
|+ name|x name||
|+ name|x name||
|+ name|x name|<name,y>|
|name + name|x name||

4 *Expr Term Factor* *Term Term* × *Factor* 6 *Expr Term* 9 *Expr Factor* 9 *Expr Factor Factor* <name,z> 3 *Term* 6 *Factor* <name,x> <u>9</u>

Derivation of a + b x c Corresponding Parse Tree

A postorder treewalk over this parse tree will first evaluate b x c and then add the result to a. This implements the standard rules of arithmetic prece- dence. Notice that the addition of nonterminals to enforce precedence adds interior nodes to the tree. Similarly, substituting the individual operators for occurrences of *Op* removes interior nodes from the tree.

Other operations require high precedence. For example, array subscripts should be applied before standard arithmetic operations. This ensures, for example, that a + b[i] evaluates b[i] to a value before adding it to a, as opposed to treating i as a subscript on some array whose location is computed as a + b. Similarly, operations that change the type of a value, known as *type casts* in languages such as C or Java, have higher prece- dence than arithmetic but lower precedence than parentheses or subscripting operations.

If the language allows assignment inside expressions, the assignment oper- ator should have low precedence. This ensures that the code completely evaluates both the left-hand side and the right-hand side of the assign- ment before performing the assignment. If assignment () had the same precedence as addition, for example, the expression a b + c would assign b’s value to a before performing the addition, assuming a left-to-right evaluation.

**3.2** *Expressing Syntax* **95**
##### CLASSES OF CONTEXT-FREE GRAMMARS AND THEIR PARSERS

We can partition the universe of context-free grammars into a hierarchy based on the difficulty of parsing the grammars. This hierarchy has many levels. This chapter mentions four of them, namely, arbitrary CFGs, LR(1) grammars, LL(1) grammars, and regular grammars (RGs). These sets nest as shown in the diagram.

##### Arbitrary CFGs require more time to

##### parse than the more restricted LR(1) or

LL(1) grammars. For example, Earley’s RG algorithm parses arbitrary CFGs in**O**(*n*

3)
LR(1) time, worst case, where*n*is the number LL(1) of words in the input stream. Of course, the actual running time may be bet- ter. Historically, compiler writers have Context-Free shied away from "universal" techniquesGrammars because of their perceived inefficiency.

The LR(1) grammars include a large subset of the unambiguous CFGs. LR(1) grammars can be parsed, bottom-up, in a linear scan from left to right, look- ing at most one word ahead of the current input symbol. The widespread availability of tools that derive parsers from LR(1) grammars has made LR(1) parsers "everyone’s favorite parsers."

The LL(1) grammars are an important subset of the LR(1) grammars. LL(1) grammars can be parsed, top-down, in a linear scan from left to right, with a one-word lookahead. LL(1) grammars can be parsed with either a hand-coded recursive-descent parser or a generated LL(1) parser. Many programming languages can be written in an LL(1) grammar.

Regular grammars (RGs) are CFGs that generate regular languages. A regu- lar grammar is a CFG where productions are restricted to two forms, either *A*!a or *A*!a*B*, where *A*, *B* 2 *NT* and a 2 *T*. Regular grammars are equiva- lent to regular expressions; they encode precisely those languages that can be recognized by a DFA. The primary use for regular languages in compiler construction is to specify scanners.

Almost all programming-language constructs can be expressed in LR(1) form and, often, in LL(1) form. Thus, most compilers use a fast-parsing algorithm based on one of these two restricted classes of CFG.

3.2.5 **Discovering a Derivation for an Input String** We have seen how to use a cfg *G* as a rewriting system to generate sen- tences that are in *L*(*G*). In contrast, a compiler must infer a derivation for a

##### 96 CHAPTER 3 Parsers

given input string, or determine that no such derivation exists. The process of constructing a derivation from a specific input sentence is called *parsing*.

A parser takes, as input, an alleged program written in some source language.

The parser sees the program as it emerges from the scanner: a stream of words annotated with their syntactic categories. Thus, the parser would see a + b x c as hname,ai + hname,bi x hname,ci. As output, the parser needs to produce either a derivation for the input program or an error message for an invalid program. For an unambiguous language, a parse tree is equivalent to a derivation; thus, we can think of the parser’s output as a parse tree.

It is useful to visualize the parser as building a syntax tree for the input program. The parse tree’s root is known; it represents the grammar’s start symbol. The leaves of the parse tree are known; they must match, in order from left to right, the stream of words returned by the scanner. The hard part of parsing lies in discovering the grammatical connection between the leaves and the root. Two distinct and opposite approaches for constructing the tree suggest themselves:

**1.** *Top-down parsers* begin with the root and grow the tree toward the leaves. At each step, a top-down parser selects a node for some nonterminal on the lower fringe of the tree and extends it with a subtree that represents the right-hand side of a production that rewrites the nonterminal.
**2.** *Bottom-up parsers* begin with the leaves and grow the tree toward the root. At each step, a bottom-up parser identifies a contiguous substring of the parse tree’s upper fringe that matches the right-hand side of some production; it then builds a node for the rule’s left-hand side and connects it into the tree. In either scenario, the parser makes a series of choices about which pro- ductions to apply. Most of the intellectual complexity in parsing lies in the mechanisms for making these choices. Section 3.3 explores the issues and algorithms that arise in top-down parsing, while Section 3.4 examines bottom-up parsing in depth.
3.3 **TOP-DOWN PARSING** A top-down parser begins with the root of the parse tree and systemati- cally extends the tree downward until its leaves match the classified words returned by the scanner. At each point, the process considers a partially built parse tree. It selects a nonterminal symbol on the lower fringe of the tree and extends it by adding children that correspond to the right-hand side of

**3.3** *Top-Down Parsing* **97**
some production for that nonterminal. It cannot extend the frontier from a terminal. This process continues until either

**a.** the fringe of the parse tree contains only terminal symbols, and the input stream has been exhausted, or
**b.** a clear mismatch occurs between the fringe of the partially built parse tree and the input stream. In the first case, the parse succeeds. In the second case, two situations are possible. The parser may have selected the wrong production at some earlier step in the process, in which case it can backtrack, systematically reconsider- ing earlier decisions. For an input string that is a valid sentence, backtracking will lead the parser to a correct sequence of choices and let it construct a correct parse tree. Alternatively, if the input string is not a valid sen- tence, backtracking will fail and the parser should report the syntax error to the user. One key insight makes top-down parsing efficient: *a large subset of the* *context-free grammars can be parsed without backtracking.* Section 3.3.1 shows transformations that can often convert an arbitrary grammar into one suitable for backtrack-free top-down parsing. The two sections that fol- low it introduce two distinct techniques for constructing top-down parsers: hand-coded recursive-descent parsers and generated ll(1) parsers.
Figure 3.2 shows a concrete algorithm for a top-down parser that con-
 structs a leftmost derivation. It builds a parse tree, anchored at the variable *root*. It uses a stack, with access functions *push( )* and *pop( )*, to track the unmatched portion of the fringe. The main portion of the parser consists of a loop that focuses on the left- most unmatched symbol on the partially-built parse tree’s lower fringe. If the focus symbol is a nonterminal, it expands the parse tree downward; it chooses a production, builds the corresponding part of the parse tree, and moves the focus to the leftmost symbol on this new portion of the fringe. If the focus symbol is a terminal, it compares the focus against the next word in the input. A match moves both the focus to the next symbol on the fringe and advances the input stream. If the focus is a terminal symbol that does not match the input, the parser must backtrack. First, it systematically considers alternatives for the most recently chosen rule. If it exhausts those alternatives, it moves back up the parse tree and reconsiders choices at a higher level in the parse tree. If this process fails to match the input, the parser reports a syntax error. Backtrack- ing increases the asymptotic cost of parsing; in practice, it is an expensive way to discover syntax errors.

##### 98 CHAPTER 3 Parsers

*root node for the start symbol, S;* *focus root;* *push(null);* *word NextWord( );*

*while (true) do;* *if (focus is a nonterminal) then begin;* *pick next rule to expand focus ( A*! 1, 2,*:::*, *n);* *build nodes for* 1, 2*:::n as children of focus;* *push( n*, *n* 1, *:::*, 2*);* *focus* 1*;* *end;* *else if (word matches focus) then begin;* *word NextWord( );* *focus pop( )* *end;* *else if (word = eof and focus = null)* *then accept the input and return root;* *else backtrack;* *end;*

n **FIGURE 3.2** A Leftmost, Top-Down Parsing Algorithm.

The implementation of “*backtrack*” is straightforward. It sets *focus* to its parent in the partially-built parse tree and disconnects its children. If an untried rule remains with *focus* on its left-hand side, the parser expands *focus* by that rule. It builds children for each symbol on the right-hand side, pushes those symbols onto the stack in right-to-left order, and sets *focus* To facilitate finding the "next" rule, the parser to point at the first child. If no untried rule remains, the parser moves up can store the rule number in a nonterminal’s another level and tries again. When it runs out of possibilities, it reports a node when it expands that node. syntax error and quits.

When it backtracks, the parser must also rewind the input stream. Fortu- nately, the partial parse tree encodes enough information to make this action efficient. The parser must place each matched terminal in the discarded production back into the input stream, an action it can take as it discon- nects them from the parse tree in a left-to-right traversal of the discarded children.

3.3.1 **Transforming a Grammar for Top-Down Parsing** The efficiency of a top-down parser depends critically on its ability to pick the correct production each time that it expands a nonterminal. If the parser always makes the right choice, top-down parsing is efficient. If it makes poor choices, the cost of parsing rises. For some grammars, the worst case

**3.3** *Top-Down Parsing* **99**
behavior is that the parser does not terminate. This section examines two structural issues with cfgs that lead to problems with top-down parsers and presents transformations that the compiler writer can apply to the grammar to avoid these problems.

##### A Top-Down Parser with Oracular Choice

As an initial exercise, consider the behavior of the parser from Figure 3.2 with the classic expression grammar in Figure 3.1 when applied to the string a + b x c. For the moment, assume that the parser has an oracle that picks the correct production at each point in the parse. With oracular choice, it might proceed as shown in Figure 3.3. The right column shows the input string, with a marker " to indicate the parser’s current position in the string. The symbol ! in the rule column represents a step in which the parser matches a terminal symbol against the input string and advances the input. At each step, the sentential form represents the lower fringe of the partially-built parse tree.

With oracular choice, the parser should take a number of steps proportional to the length of the derivation plus the length of the input. For a + b x c the parser applied eight rules and matched five words.

Notice, however, that oracular choice means inconsistent choice. In both the first and second steps, the parser considered the nonterminal *Expr*. In the first step, it applied rule 1, *Expr*!*Expr*+*Term*. In the second step, it applied rule 3, *Expr*!*Term*. Similarly, when expanding *Term* in an attempt to match a, it applied rule 6, *Term*!*Factor*, but when expanding *Term* to match b,

**Rule**

|Sentential Form||Input||
|---|---|---|---|
|||name +|name x name|
|+||name +|name x name|
|+||name +|name x name|
|+||name +|name x name|
|name +||name +|name x name|
|name +||name +|name x name|
|name +||name +|name x name|
|name +|x|name +|name x name|
|name +|x|name +|name x name|
|name + name|x|name +|name x name|
|name + name|x|name + name|x name|
|name + name|x|name + name|x name|
|name + name|x name|name + name|x name|
|name + name|x name|name + name|x name|

*Expr* " 1 *Expr Term* " 3 *Term Term* " 6 *Factor Term* " 9 *Term* " ! *Term* " ! *Term* " 4 *Term Factor* " 6 *Factor Factor* " 9 *Factor* " ! *Factor* " ! *Factor* " " <u>! "</u>

n **FIGURE 3.3** Leftmost, Top-Down Parse of a+bxc with Oracular Choice.

##### 100 CHAPTER 3 Parsers

it applied rule 4, *Term*!*Term*x*Factor*. It would be difficult to make the top-down parser work with consistent, algorithmic choice when using this version of the expression grammar.

##### Eliminating Left Recursion

One problem with the combination of the classic expression grammar and a leftmost, top-down parser arises from the structure of the grammar. To see the difficulty, consider an implementation that always tries to apply the rules in the order in which they appear in the grammar. Its first several actions would be:

**Rule**

|Sentential Form|Input||
|---|---|---|
||name + name|× name|
|+|name + name|× name|
|+|name + name name + name|× name × name|

*Expr* " 1 *Expr Term* " 1 *Expr Term* + *Term* " <u>1 "</u>

It starts with *Expr* and tries to match a. It applies rule 1 to create the senten- tial form *Expr*+*Term* on the fringe. Now, it faces the nonterminal *Expr* and the input word a, again. By consistent choice, it applies rule 1 to replace *Expr* with *Expr*+*Term*. Of course, it still faces *Expr* and the input word a. With this grammar and consistent choice, the parser will continue to expand the fringe indefinitely because that expansion never generates a leading terminal symbol.

**Left recursion** This problem arises because the grammar uses *left recursion* in productions A rule in a CFG is left recursive if the first symbol 1, 2, 4, and 5. With left-recursion, a top-down parser can loop indefinitely on its right-hand side is the symbol on its without generating a leading terminal symbol that the parser can match (and left-hand side or can derive that symbol. advance the input). Fortunately, we can reformulate a left-recursive grammar The former case is called*direct*left recursion, so that it uses right recursion—any recursion involves the rightmost symbol while the latter case is called*indirect*left in a rule. recursion. The translation from left recursion to right recursion is mechanical. For direct left recursion, like the one shown below to the left, we can rewrite the individual productions to use right recursion, shown on the right. 0 *Fee*! *Fee Fee*! *Fee* 0 0 j *Fee*! *Fee* j 0 The transformation introduces a new nonterminal, *Fee*, and transfers the recursion onto *Fee*. It also adds the rule *Fee*!, where represents the empty string. This*-production* requires careful interpretation in the pars- ing algorithm. To expand the production *Fee*!, the parser simply sets

**3.3** *Top-Down Parsing* **101**
*focus pop( )*, which advances its attention to the next node, terminal or nonterminal, on the fringe.

In the classic expression grammar, direct left recursion appears in the productions for both *Expr* and *Term*.

|Original||Transformed|
|---|---|---|
|! Expr + Term|Expr|! Term Expr⁰|
|j Expr-Term|Expr⁰|! Term Expr⁰|
|j Term||j Term Expr|
|||j|
|! Term x Factor|Term|! Factor Term⁰|
|j Term ÷ Factor|Term|!|
|j Factor||j|

*Expr* + - 0

*Term* 0 0 x *Factor Term₀* ÷ *Factor Term* j

Plugging these replacements back into the classic expression grammar yields a right-recursive variant of the grammar, shown in Figure 3.4. It specifies the same set of expressions as the classic expression grammar.

The grammar in Figure 3.4 eliminates the problem with nontermination. It does not avoid the need for backtracking. Figure 3.5 shows the behavior of the top-down parser with this grammar on the input a + b x c. The example still assumes oracular choice; we will address that issue in the next subsec- tion. It matches all 5 terminals and applies 11 productions—3 more than it did with the left-recursive grammar. All of the additional rule applications involve productions that derive.

This simple transformation eliminates direct left recursion. We must also eliminate indirect left recursion, which occurs when a chain of rules such as !,!, and! creates the situation that!C. Such indirect left recursion is not always obvious; it can be obscured by a long chain of productions.

x

|0 Goal|! Expr|6 Term⁰|!|Factor Term⁰|
|---|---|---|---|---|
|1 Expr|! Term Expr⁰|7|j|Factor Term⁰|
|2 Expr⁰|! Term Expr⁰|8|j||
|3|j Term Expr⁰|9 Factor|!|Expr|
|4|j|10|j||
|5 Term|! Factor Term⁰|11|j||

÷ + -<u>()</u> num name

n **FIGURE 3.4** Right-Recursive Variant of the Classic Expression Grammar.

##### 102 CHAPTER 3 Parsers

**Rule**

|Sentential Form||Input||
|---|---|---|---|
|||name +|name x name|
|0|0 0|name + name +|name x name name x name|
|name|0 0|name +|name x name|
|name||name +|name x name|
|name0||name +|name x name|
|name +|0|name +|name x name|
|name +||name +|name x name|
|name +|0|name +|name x name|
|name + name|0|name +|name x name|
|name + name||name + name|x name|
|name + name|x|name + name|x name|
|name + name|x|name + name|x name|
|name + name|x name|name + name|x name|
|name + name|x name|name + name|x name|
|name + name|x name|name + name|x name|
|name + name|x name|name + name|x name|

*Expr* " 1 *Term Expr* " 5 *Factor Term Expr* " 11 *Term Expr* " ! *Term⁰ Expr⁰* " 8 *Expr* " 2 *Term Expr* " ! *Term Expr⁰* " 5 *Factor Term Expr* 0 " 11 *Term Expr* 0 " ! *Term⁰ Expr⁰* " 6 *Factor Term* 0 *Expr* 0 " ! *Factor Term⁰ Expr⁰* " 11 *Term* 0 *Expr* 0 " ! *Term⁰ Expr⁰* " 8 *Expr* 0 " <u>4 "</u>

n **FIGURE 3.5** Leftmost, Top-Down Parse of a+bxc with the Right-Recursive Expression Grammar.

To convert indirect left recursion into right recursion, we need a more systematic approach than inspection followed by application of our trans- formation. The algorithm in Figure 3.6 eliminates all left recursion from a grammar by thorough application of two techniques: forward substitution to convert indirect left recursion into direct left recursion and rewriting direct left recursion as right recursion. It assumes that the original grammar has no cycles (*A*!C *A*) and no-productions.

The algorithm imposes an arbitrary order on the nonterminals. The outer loop cycles through the nonterminals in this order. The inner loop looks for any production that expands *Ai*into a right-hand side that begins with *Aj*, for *j < i*. Such an expansion may lead to an indirect left recursion. To avoid this, the algorithm replaces the occurrence of *Aj*with all the alternative right-hand sides for *Aj*. That is, if the inner loop discovers a production *Ai*! *Aj*, and *Aj*! 1j 2jj*k*, then the algorithm replaces *Ai*! *Aj*with

|a set of productions A|! 1|j jj|. This process eventually converts|||
|---|---|---|---|---|---|
||i|2|k|||
|||||i||

*i* 2 *k* each indirect left recursion into a direct left recursion. The final step in the outer loop converts any direct left recursion on *A* to right recursion using the simple transformation shown earlier. Because new nonterminals are added at the end and only involve right recursion, the loop can ignore them—they do not need to be checked and converted.

**3.3** *Top-Down Parsing* **103**

|impose an|order on|the nonterminals, A1, A2, :::, An|||
|---|---|---|---|---|
|for i 1|to n do;||||
|for j|1 to i|-1 do;|||
|if end;|9 a production then replace productions|Ai! Aj Ai! Aj|with that expand|one or more Aj|
|rewrite|the productions||to eliminate||
|any end;|direct|left recursion|on|Ai|

n **FIGURE 3.6** Removal of Indirect Left Recursion.

Considering the loop invariant for the outer loop may make this clearer. At *th* the start of the *i* outer loop iteration

8 *k < i, no production expanding Akhas Alin its rhs, for l < k.*

At the end of this process, (*i* D *n*), all indirect left recursion has been elimi- nated through the repetitive application of the inner loop, and all immediate left recursion has been eliminated in the final step of each iteration.

##### Backtrack-Free Parsing

The major source of inefficiency in the leftmost, top-down parser arises from its need to backtrack. If the parser expands the lower fringe with the wrong production, it eventually encounters a mismatch between that fringe and the parse tree’s leaves, which correspond to the words returned by the scanner. When the parser discovers the mismatch, it must undo the actions that built the wrong fringe and try other productions. The act of expanding, retracting, and re-expanding the fringe wastes time and effort.

In the derivation of Figure 3.5, the parser chose the correct rule at each step. With consistent choice, such as considering rules in order of appear- ance in the grammar, it would have backtracked on each name, first trying *Factor*! <u>(</u>*Expr*<u>)</u> and then *Factor*! num before deriving name. Similarly, the expansions by rules 4 and 8 would have considered the other alternatives before expanding to.

For this grammar, the parser can avoid backtracking with a simple modi- fication. When the parser goes to select the next rule, it can consider both the focus symbol and the next input symbol, called the *lookahead sym-* *bol*. Using a one symbol lookahead, the parser can disambiguate all of the **Backtrack-free grammar** choices that arise in parsing the right-recursive expression grammar. Thus, aCFG for which the leftmost, top-down parser can we say that the grammar is *backtrack free* with a lookahead of one symbol. always predict the correct rule with lookahead of at most one word A backtrack-free grammar is also called a *predictive grammar*.

##### 104 CHAPTER 3 Parsers

*for each* 2*.T* [ eof [*/ do;* FIRST*./;* *end;* *for each A* 2 *N T do;* FIRST*. A/*;*;* *end;*

*while.*FIRST *sets are still changing/ do;* *for each p* 2 *P, where p has the form A*! *do;* *if is* 1 2 *:::k, where i* 2 *T* [ *N T, then begin;* *rhs* FIRST*.*1*/* f g*;* *i 1;* *while (* 2 FIRST*.i/ and i k-1) do;* *rhs rhs* [ *(*FIRST*.i*C1*/*f g*/;* *i i + 1;* *end;* *end;* *if i = k and* 2 FIRST*.k/* *then rhs rhs* [ f g*;* FIRST*( A)* FIRST*( A)* [ *rhs;* *end;* *end;*

n **FIGURE 3.7** Computing FIRST Sets for Symbols in a Grammar.

We can formalize the property that makes the right-recursive expression grammar backtrack free. At each point in the parse, the choice of an expan- sion is obvious because each alternative for the leftmost nonterminal leads to a distinct terminal symbol. Comparing the next word in the input stream against those choices reveals the correct expansion.

**FIRST set** The intuition is clear, but formalizing it will require some notation. For each For a grammar symbol, FIRST() is the set of grammar symbol, define the set first*./* as the set of terminal symbols terminals that can appear at the start of a that can appear as the first word in some string derived from. The domain sentence derived from. of first is the set of grammar symbols, *T* [ *N T* [f, eofg and its range is *T* [f, eofg. If is either a terminal,, or eof, then first*./* has exactly one member,. For a nonterminal *A*, first(*A*) contains the complete set of terminal symbols that can appear as the leading symbol in a sentential form derived from *A*. eof occurs implicitly at the end of every sentence in the grammar. Thus, it is in both the Figure 3.7 shows an algorithm that computes the first sets for each sym- domain and range of FIRST. bol in a grammar. As its initial step, the algorithm sets the first sets for the

**3.3** *Top-Down Parsing* **105**
simple cases, terminals,, and eof. For the right-recursive expression gram- mar shown in Figure 3.4 on page 101, that initial step produces the following first sets:

**num name +-× ÷** <u>()</u> **eof**

FIRST num name +-x ÷ <u>()</u> eof

Next, the algorithm iterates over the productions, using the first sets for the right-hand side of a production to derive the first set for the nonterminal on its left-hand side. This process halts when it reaches a fixed point. For the right-recursive expression grammar, the first sets of the nonterminals are:

***Expr Expr’ Term Term’ Factor***

FIRST (, name, num +, -, (, name, num x, ÷, (, name, num

We defined first sets over single grammar symbols. It is convenient to extend that definition to strings of symbols. For a string of symbols, *s* D1 2 3*:::k*, we define first(*s*) as the union of the first sets for 1 ,2,*:::*,*n*, where*n*is the first symbol whose first set does not contain, and 2 first(*s*) if and only if it is in the set for each of the*i*, 1 *i k*. The algorithm in Figure 3.7 computes this quantity into the variable rhs.

Conceptually, first sets simplify implementation of a top-down parser. Con- sider, for example, the rules for *Expr* 0 in the right-recursive expression grammar:

2 *Expr* 0 ! + *Term Expr* 0 3 j-*Term Expr* 0 4 j

When the parser tries to expand an *Expr* 0, it uses the lookahead symbol and the first sets to choose between rules 2, 3, and 4. With a lookahead of +, the parser expands by rule 2 because + is in first(+ *Term Expr* 0 ) and not in first(-*Term Expr* 0 ) or first( ). Similarly, a lookahead of-dictates a choice of rule 3.

Rule 4, the-production, poses a slightly harder problem. first( ) is just f g, which matches no word returned by the scanner. Intuitively, the parser should apply the production when the lookahead symbol is not a member of the first set of any other alternative. To differentiate between legal inputs

##### 106 CHAPTER 3 Parsers

*for each A* 2 *N T do;* FOLLOW*. A/*;*;* *end;* FOLLOW*.S/* feofg*;* *while.*FOLLOW *sets are still changing/ do;* *for each p* 2 *P of the form A*!1 2 *k do;* TRAILER FOLLOW*. A/;* *for i k down to 1 do;* *if i* 2 *N T then begin;* FOLLOW*.i/* FOLLOW*.i/* [ TRAILER*;* *if* 2 FIRST*.i/* *then* TRAILER TRAILER [*.*FIRST*.i/ /;* *else* TRAILER FIRST*.i/;* *end;* *else* TRAILER FIRST*.i/; // is* f *i*g *end;* *end;* *end;*

n **FIGURE 3.8** Computing FOLLOW Sets for Non-Terminal Symbols.

and syntax errors, the parser needs to know which words can appear as the leading symbol after a valid application of rule 4—the set of symbols that 0 can follow an *Expr*. 0 **FOLLOW set** To capture that knowledge, we define the set follow(*Expr*) to contain all For a nonterminal, FOLLOW*./* contains the of the words that can occur to the immediate right of a string derived from set of words that can occur immediately after 0 *Expr*. Figure 3.8 presents an algorithm to compute the follow set for each in a sentence. nonterminal in a grammar; it assumes the existence of first sets. The algo- rithm initializes each follow set to the empty set and then iterates over the productions, computing the contribution of the partial suffixes to the follow set of each symbol in each right-hand side. The algorithm halts when it reaches a fixed point. For the right-recursive expression grammar, the algorithm produces:

***Expr Expr’***

||Term|Term’|Factor|
|---|---|---|---|
|FOLLOW|eof, +, -, )|eof, +, -, )|eof, +, -, x, ÷, )|
||0|||
||||0|
|eof and ), it applies rule 4. Any other symbol causes a syntax error.||||

eof, ) eof, )

0 The parser can use follow(*Expr*) when it tries to expand an *Expr*. If the lookahead symbol is +, it applies rule 2. If the lookahead symbol is -, it applies rule 3. If the lookahead symbol is in follow(*Expr*), which contains

**3.3** *Top-Down Parsing* **107**
Using first and follow, we can specify precisely the condition that makes a grammar backtrack free for a top-down parser. For a production *A*!, C define its augmented first set, first, as follows:

Cfirst*./* if *=*2 first*./* first*. A*!*/* D first*./* [ follow*. A/ otherwise*

Now, a backtrack-free grammar has the property that, for any nonterminal *A* with multiple right-hand sides, *A*!1j2jj*n* C C first*. A*!*i/* \ first*. A*!*j/* D;, 8 1 *i*, *j n*, *i* 6D *j.*

Any grammar that has this property is *backtrack free*.

For the right-recursive expression grammar, only productions 4 and 8 have C first sets that differ from their first sets.

C **Production FIRST set FIRST set**

4 *Expr⁰*! f g f, eof, ) g 8 *Term⁰*! f g f, eof, +, -, ) g

Applying the backtrack-free condition pairwise to each set of alternate right- hand sides proves that the grammar is, indeed, backtrack free.

##### Left-Factoring to Eliminate Backtracking

Not all grammars are backtrack free. For an example of such a gram- mar, consider extending the expression grammar to include function calls, denoted with parentheses, <u>(</u> and<u>)</u>, and array-element references, denoted with square brackets, <u>[</u> and<u>]</u>. To add these options, we replace produc- tion 11, *Factor*! name, with a set of three rules, plus a set of right-recursive rules for argument lists.

11 *Factor*! name 12 j name [ *ArgList*] 13 j name <u>(</u> *ArgList*<u>)</u> 15 *ArgList*! *Expr MoreArgs* 16 *MoreArgs*!, *Expr MoreArgs* 17 j

##### A two-word lookahead would handle this case.

Because productions 11, 12, and 13 all begin with name, they have identical CHowever, for any finite lookahead we can devise first sets. When the parser tries to expand an instance of *Factor* with a a grammar where that lookahead is insufficient. lookahead of name, it has no basis to choose among 11, 12, and 13. The compiler writer can implement a parser that chooses one rule and backtracks when it is wrong. As an alternative, we can transform these productions to C create disjoint first sets.

##### 108 CHAPTER 3 Parsers

The following rewrite of productions 11, 12, and 13 describes the same language but produces disjoint first C sets:

name *Arguments*

|11 Factor|!|
|---|---|
|12 Arguments|!|
|13|j|
|14|j|

[ *ArgList*] ( *ArgList*)

The rewrite breaks the derivation of *Factor* into two steps. The first step matches the common prefix of rules 11, 12, and 13. The second step recog- **Left factoring** nizes the three distinct suffixes: [ *Expr*], ( *Expr*), and. The rewrite adds the process of extracting and isolating common a new nonterminal, *Arguments*, and pushes the alternate suffixes for *Fac-* prefixes in a set of productions *tor* into right-hand sides for *Arguments*. We call this transformation *left* *factoring*.

We can left factor any set of rules that has alternate right-hand sides with a common prefix. The transformation takes a nonterminal and its productions: *A*!*j*

|1 j 2 jj|n j 1 j|2 jj|
|---|---|---|
||i||

where is the common prefix and the ’s represent right-hand sides that do not begin with. The transformation introduces a new nonterminal *B* to represent the alternate suffixes for and rewrites the original productions according to the pattern: *A*! *B* j1 j 2 jj *j* *B*!1 j 2 jj *n* To left factor a complete grammar, we must inspect each nonterminal, dis- cover common prefixes, and apply the transformation in a systematic way. For example, in the pattern above, we must consider factoring the right-hand sides of *B*, as two or more of the*i*’s could share a prefix. The process stops when all common prefixes have been identified and rewritten.

Left-factoring can often eliminate the need to backtrack. However, some context-free languages have no backtrack-free grammar. Given an arbitrary cfg, the compiler writer can systematically eliminate left recursion and use left-factoring to eliminate common prefixes. These transformations may produce a backtrack-free grammar. In general, however, it is undecidable whether or not a backtrack-free grammar exists for an arbitrary context-free language.

3.3.2 **Top-Down Recursive-Descent Parsers** Backtrack-free grammars lend themselves to simple and efficient parsing with a paradigm called *recursive descent*. A recursive-descent parser is

**3.3** *Top-Down Parsing* **109**
##### PREDICTIVE PARSERS VERSUS DFAs

Predictive parsing is the natural extension of DFA-style reasoning to parsers. A DFA transitions from state to state based solely on the next input character. A predictive parser chooses an expansion based on the next word in the input stream. Thus, for each nonterminal in the grammar, there must be a unique mapping from the first word in any acceptable input string to a specific production that leads to a derivation for that string. The real difference in power between a DFA and a predictively parsable gram- mar derives from the fact that one prediction may lead to a right-hand side with many symbols, whereas in a regular grammar, it predicts only a single symbol. This lets predictive grammars include productions such as *p*!(*p*), which are beyond the power of a regular expression to describe. (Recall that a regular expression can recognize (C *6*)C, but this does not specify that the numbers of opening and closing parentheses must match.)

Of course, a hand-coded, recursive-descent parser can use arbitrary tricks to disambiguate production choices. For example, if a particular left-hand side cannot be predicted with a single-symbol lookahead, the parser could use two symbols. Done judiciously, this should not cause problems.

structured as a set of mutually recursive procedures, one for each non- terminal in the grammar. The procedure corresponding to nonterminal *A* recognizes an instance of *A* in the input stream. To recognize a nonterminal *B* on some right-hand side for *A*, the parser invokes the procedure corre- sponding to *B*. Thus, the grammar itself serves as a guide to the parser’s implementation.

Consider the three rules for *Expr* 0 in the right-recursive expression grammar:

**Production FIRST** C

2 *Expr⁰*! + *Term Expr⁰* f + g 3 j-*Term Expr* 0 f-g 4 j f,eof,) g

To recognize instances of *Expr* 0, we will create a routine *EPrime()*. It fol- lows a simple scheme: choose among the three rules (or a syntax error) based on the first C sets of their right-hand sides. For each right-hand side, the code tests directly for any further symbols.

To test for the presence of a nonterminal, say *A*, the code invokes the pro- cedure that corresponds to *A*. To test for a terminal symbol, such as name, it performs a direct comparison and, if successful, advances the input stream

##### 110 CHAPTER 3 Parsers

*EPrime()* */* Expr*0! + *Term Expr*0 j-*Term Expr*0 **/* *if (word =* + *or word =*-*) then begin;* *word NextWord();* *if (Term())* *then return EPrime();* *else return false;* *end;* *else if (word =*<u>)</u> *or word =* eof*) /* Expr*0! **/* *then return true;* *else begin; /** no match **/* *report a syntax error;* *return false;* *end;*

n **FIGURE 3.9** An Implementation of EPrime().

by calling the scanner, *NextWord()*. If it matches an-production, the code does not call *NextWord().* Figure 3.9 shows a straightforward implementa- tion of *EPrime()*. It combines rules 2 and 3 because they both end with the same suffix, *Term Expr* 0.

The strategy for constructing a complete recursive-descent parser is clear. For each nonterminal, we construct a procedure to recognize its alternative right-hand sides. These procedures call one another to recognize nonter- minals. They recognize terminals by direct matching. Figure 3.10 shows a top-down recursive-descent parser for the right-recursive version of the classic expression grammar shown in Figure 3.4 on page 101. The code for similar right-hand sides has been combined.

For a small grammar, a compiler writer can quickly craft a recursive-descent parser. With a little care, a recursive-descent parser can produce accurate, informative error messages. The natural location for generating those mes- sages is when the parser fails to find an expected terminal symbol—inside *EPrime*, *TPrime*, and *Factor* in the example.

3.3.3 **Table-Driven LL(1) Parsers** Following the insights that underlie the first
C sets, we can automatically generate top-down parsers for backtrack-free grammars. The tool constructs first, follow, and first C sets. The first C sets completely dictate the pars- ing decisions, so the tool can then emit an efficient top-down parser. The resulting parser is called an ll(1) parser. The name ll(1) derives from the fact that these parsers scan their input <u>l</u>eft to right, construct a <u>l</u>eftmost

**3.3** *Top-Down Parsing* **111**
*Main( ) TPrime( )* */* Goal*! *Expr */ /* Term*0! x *Factor Term*0 **/* *word NextWord( ); /* Term*0! ÷ *Factor Term*0 **/*

|word|NextWord( );||/* Term 0! ÷ Factor Term 0||*/|
|---|---|---|---|---|---|
|if (Expr( ))|||if (word|= x or word|= ÷ )|
|then|if (word|= eof )|then|begin;||
|then|report|success;|word|NextWord( );||
|else Fail( ) report|Fail( ); syntax error;||if end;|( Factor( ) ) then return else Fail();|TPrime( );|
|attempt|error recovery|or|else if (word|= + word =)|or word = or word =|
|Expr( )|||/ * Term 0!|* /||
|/* Expr ! Term Expr 0 if ( Term( ) ) then else|return EPrime( ); Fail();|*/|then return else Fail(); /* Factor ! ( Expr )|true;|*/|
|EPrime( )|||if (word|= () then|begin;|
|/* Expr 0! + Term Expr 0||*/|word|NextWord( );||
|/* Expr 0! - Term Expr 0||*/|if (not|Expr( ) )||
|if (word then|= + or begin;|word =- )|then|Fail();||
|word|NextWord( );||if (word|6D))||
|if|( Term() ) then return else Fail();|EPrime( );|then word return|Fail(); NextWord( ); true;||
|end;|||end;|||
|else if|(word =|) or word|/* Factor ! num|*/||
|/* Expr 0!|*/||/* Factor ! name|*/||
|then else Term( )|return true; Fail();||else if (word then begin; word|= num word = name ) NextWord( );|or|
|/* Term ! Factor Term 0||*/|return|true;||
|if ( Factor( ) )|||end;|||
|then else n FIGURE 3.10|return TPrime( ); Fail();||else Fail();|||

*exit;*-*or* eof*)*

*Factor( )*

*=* eof*)*

##### Recursive-Descent Parser for Expressions.

##### 112 CHAPTER 3 Parsers

*word NextWord( );* *push* eof *onto Stack;*

|eof onto|Stack;||||
|---|---|---|---|---|
|the start|symbol,|S, onto|Stack;||
|top forever;|of Stack;||||
|if (focus|= eof and|word =|eof)||
|then|report success|and|exit the|loop;|
|else if|(focus 2 T|or focus|= eof)|then begin;|
|if focus|matches|word then|begin;||
|pop|Stack;||||
|word end; else report an error looking for symbol at top of stack; end;|NextWord( );||||
|else begin;|/* focus|is a nonterminal||*/|
|if Table[focus,word]||is|A B1 B2|Bk then|
|pop|Stack;||||
|for end; end;|i k to if (Bi 6D then push|1 by-1 ) Bi onto|do; Stack;||
|else end;|report an|error expanding|focus;||
|focus|top of Stack;||||

*push* *focus* *loop*

! *begin;*

*end;*

(a) The Skeleton LL(1) Parser

||eof +|-×|÷ (|) name|num|
|---|---|---|---|---|---|
|Goal|— —|— —|— 0|— 0|0|
|Expr|— —|— —|— 1|— 1|1|
|Expr|4 2|3 —|— —|4 —|—|
|Term|— —|— —|— 5|— 5|5|
|Term|8 8|8 6|7 —|8 —|—|
|Factor|— —|— —|— 9|— 11|10|

(b) The LL(1) Parse Table for Right-Recursive Expression Grammar
n **FIGURE 3.11** An LL(1) Parser for Expressions.

**3.3** *Top-Down Parsing* **113**
*build and*

|FIRST,|FOLLOW,|FIRSTC|sets;||
|---|---|---|---|---|
|each nonterminal||A do;|||
|for each Table[ A,w] end;|terminal|w do; error;|||
|for each|production|p of|the form|A ! do;|
|for|each terminal Table[ A,w]|w 2 p;|FIRSTC( A|) do;|
||end;||||
|if end; LL|eof 2 FIRSTC( A then Table[ A,eof]|)|p;||

*for*

!

!

*end;*

n **FIGURE 3.12** (1) Table-Construction Algorithm.

derivation, and use a lookahead of 1 symbol. Grammars that work in an ll(1) scheme are often called ll(1) grammars. ll(1) grammars are, by definition, backtrack free.

To build an ll(1) parser, the compiler writer provides a right-recursive, backtrack-free grammar and a *parser generator* constructs the actual parser. **Parser generator** The most common implementation technique for an ll(1) parser genera-a tool that builds a parser from specifications, tor uses a table-driven skeleton parser, such as the one shown at the top of usually a grammar in a BNF-like notation

Figure 3.11. The parser generator constructs the table, *Table*, which cod-Parser generators are also called*compiler*

ifies the parsing decisions and drives the skeleton parser. The bottom of *compilers*.

Figure 3.11 shows the ll(1) table for the right-recursive expression grammar

shown in Figure 3.4 on page 101.

In the skeleton parser, the variable focus holds the next grammar symbol on the partially built parse tree’s lower fringe that must be matched. (*focus* plays the same role in Figure 3.2.) The parse table, *Table*, maps pairs of nonterminals and lookahead symbols (terminals or eof) into productions. Given a nonterminal *A* and a lookahead symbol *w*, *Table[A,w]* specifies the correct expansion.

The algorithm to build *Table* is straightforward. It assumes that first, C follow, and first sets are available for the grammar. It iterates over the grammar symbols and fills in *Table*, as shown in Figure 3.12. If the grammar meets the backtrack free condition (see page 107), the construction will pro- duce a correct table in **O**(j*P*jj*T*j) time, where *P* is the set of productions and *T* is the set of terminals.

If the grammar is not backtrack free, the construction will assign more than one production to some elements of *Table*. If the construction assigns to

##### 114 CHAPTER 3 Parsers

**Input**

|Rule|Stack|||
|---|---|---|---|
|—|||" name + name x name|
|0|||" name + name x name|
|1|Term||" name + name x name|
|5|Term|Factor|" name + name x name|
|11|Term||" name + name x name|
|! 8|Term⁰|||
|2|Term +|||
|!|Term|||
|5|Term|Factor||
|11|Term|||
|!|Term⁰|||
|6|Term|Factor x||
|!|Term⁰ Factor|||
|11|Term|||
|!|Term⁰|||

eof *Goal* eof *Expr* eof *Expr* 0 eof *Expr* 0 0 eof *Expr* 0 0 name eof *Expr⁰* name " + name x name eof *Expr* 0 name " + name x name eof *Expr* 0 name " + name x name eof *Expr⁰* name + " name x name eof *Expr* 0 0 name + " name x name eof *Expr* 0 0 name name + " name x name eof *Expr⁰* name + name " x name eof *Expr* 0 0 name + name " x name eof *Expr⁰* name + name x " name eof *Expr* 0 0 name name + name x " name eof *Expr⁰* name + name x name " 8 eof *Expr* 0 name + name x name " <u>4 eof name + name x name "</u>

n **FIGURE 3.13** Actions of the LL(1) Parser on a + b x c.

*Table[A,w]* multiple times, then two or more alternative right-hand sides for *A* have *w* in their first C sets, violating the backtrack-free condition. The parser generator can detect this situation with a simple test on the two assignments to Table.

The example in Figure 3.13 shows the actions of the ll(1) expression parser for the input string a + b x c. The central column shows the contents of the parser’s stack, which holds the partially completed lower fringe of the parse tree. The parse concludes successfully when it pops *Expr* 0 from the stack, leaving eof exposed on the stack and eof as the next symbol, implicitly, in the input stream.

Now, consider the actions of the ll(1) parser on the illegal input string x + ÷ y, shown in Figure 3.14 on page 115. It detects the syntax error when it attempts to expand a *Term* with lookahead symbol ÷. *Table*[*Term*,÷] contains “—”, indicating a syntax error.

Alternatively, an ll(1) parser generator could emit a direct-coded parser, in the style of the direct-coded scanners discussed in Chapter 2. The parser generator would build first, follow, and first C sets. Next, it would iterate through the grammar, following the same scheme used by the table-construction algorithm in Figure 3.12. Rather than emitting table entries, it would generate, for each nonterminal, a procedure to recognize

**3.3** *Top-Down Parsing* **115**

|Rule|Stack|Input|
|---|---|---|
|—||" name + ÷ name|
|1|Term|" name + ÷ name|
|5|Term Factor|" name + ÷ name|
|11 ! 8 2|Term Term⁰ Term +|" name + ÷ name|
|!|Term||

eof *Goal* eof *Expr*

|0||" name + ÷ name|
|---|---|---|
|eof Expr 0|||
|eof Expr 0|0||
|eof Expr 0|0name||
|eof Expr⁰||name " + ÷ name|
|eof Expr 0||name " + ÷ name|
|eof Expr 0||name " + ÷ name|
|eof Expr⁰||name + " ÷ name|

eof *Expr* 0

*syntax error* *at this point*

n **FIGURE 3.14** Actions of the LL(1) Parser on x + ÷ y.

each of the possible right-hand sides for that nonterminal. This process would be guided by the first C sets. It would have the same speed and local- ity advantages that accrue to direct-coded scanners and recursive-descent parsers, while retaining the advantages of a grammar-generated system, such as a concise, high-level specification and reduced implementation effort.

##### SECTION REVIEW

Predictive parsers are simple, compact, and efficient. They can be implemented in a number of ways, including hand-coded, recursive- descent parsers and generated LL(1) parsers, either table driven or direct coded. Because these parsers know, at each point in the parse, the set of words that can occur as the next symbol in a valid input string, they can produce accurate and useful error messages.

##### Most programming-language constructs can be expressed in a

##### backtrack-free grammar. Thus, these techniques have widespread

application. The restriction that alternate right-hand sides for a nonterminal have disjoint FIRSTC sets does not seriously limit the utility of LL(1) grammars. As we will see in Section 3.5.4, the primary drawback of top-down, predictive parsers lies in their inability to handle left recursion. Left-recursive grammars model the left-to-right associa- tivity of expression operators in a more natural way than right-recursive grammars.

##### Review Questions

**1.** To build an efficient top-down parser, the compiler writer must express the source language in a somewhat constrained form. Explain the restrictions on the source-language grammar that are required to make it amenable to efficient top-down parsing.

##### 116 CHAPTER 3 Parsers

**2.** Name two potential advantages of a hand-coded recursive-descent parser over a generated, table-driven LL(1) parser, and two advantages of the LL(1) parser over the recursive-descent implementation.
3.4 **BOTTOM-UP PARSING** Bottom-up parsers build a parse tree starting from its leaves and working toward its root. The parser constructs a leaf node in the tree for each word returned by the scanner. These leaves form the lower fringe of the parse tree. To build a derivation, the parser adds layers of nonterminals on top of the leaves in a structure dictated by both the grammar and the partially completed lower portion of the parse tree. At any stage in the parse, the partially-completed parse tree represents the state of the parse. Each word that the scanner has returned is represented by a leaf. The nodes above the leaves encode all of the knowledge that the parser has yet derived. The parser works along the upper frontier of this partially- completed parse tree; that frontier corresponds to the current sentential form in the derivation being built by the parser. To extend the frontier upward, the parser looks in the current frontier for a substring that matches the right-hand side of some production *A*!. If it finds in the frontier, with its right end at *k*, it can replace with *A*, to create a new frontier. If replacing with *A* at position *k* is the next step in
**Handle** a valid derivation for the input string, then the pair h*A*!,*k*i is a *handle* in a pair, h*A*!,*k*i, such that appears in the the current derivation and the parser should replace with *A*. This replace- frontier with its right end at position*k*and ment is called a *reduction* because it reduces the number of symbols on the replacing with*A*is the next step in the parse frontier, unless j jD 1. If the parser is building a parse tree, it builds a node **Reduction** for *A*, adds that node to the tree, and connects the nodes representing as reducing the frontier of a bottom-up parser by *A*’s children. *A*! replaces with*A*in the frontier Finding handles is the key issue that arises in bottom-up parsing. The techniques presented in the following sections form a particularly efficient handle-finding mechanism. We will return to this issue periodically through- out Section 3.4. First, however, we will finish our high-level description of bottom-up parsers.

The bottom-up parser repeats a simple process. It finds a handle h*A*!,*k*i on the frontier. It replaces the occurrence of at *k* with *A*. This process continues until either: (1) it reduces the frontier to a single node that repre- sents the grammar’s goal symbol, or (2) it cannot find a handle. In the first case, the parser has found a derivation; if it has also consumed all the words in the input stream (i.e. the next word is eof), then the parse succeeds. In the

**3.4** *Bottom-Up Parsing* **117**
second case, the parser cannot build a derivation for the input stream and it should report that failure.

A successful parse runs through every step of the derivation. When a parse fails, the parser should use the context accumulated in the partial deriva- tion to produce a meaningful error message. In many cases, the parser can recover from the error and continue parsing so that it discovers as many syntactic errors as possible in a single parse (see Section 3.5.1).

The relationship between the derivation and the parse plays a critical role in making bottom-up parsing both correct and efficient. The bottom-up parser works from the final sentence toward the goal symbol, while a derivation starts at the goal symbol and works toward the final sentence. The parser, then, discovers the steps of the derivation in reverse order. For a derivation:

##### Goal D0! D sentence,

|! !|! !||
|---|---|---|
|1 2|n 1 n||
|i i C1||i 1 i|
||i||

the bottom-up parser discovers! before it discovers!. The way that it builds the parse tree forces this order. The parser must add the node for*i*to the frontier before it can match.

The scanner returns classified words in left-to-right order. To reconcile the left-to-right order of the scanner with the reverse derivation constructed by the scanner, a bottom-up parser looks for a rightmost derivation. In a right- most derivation, the leftmost leaf is considered last. Reversing that order leads to the desired behavior: leftmost leaf first and rightmost leaf last.

At each point, the parser operates on the frontier of the partially constructed parse tree; the current frontier is a prefix of the corresponding sentential form in the derivation. Because each sentential form occurs in a rightmost deriva- tion, the unexamined suffix consists entirely of terminal symbols. When the parser needs more right context, it calls the scanner.

With an unambiguous grammar, the rightmost derivation is unique. For a large class of unambiguous grammars,*i* 1can be determined directly from *i* (the parse tree’s upper frontier) and a limited amount of lookahead in the input stream. In other words, given a frontier*i*and a limited number of additional classified words, the parser can find the handle that takes*i*to *i* 1. For such grammars, we can construct an efficient handle-finder, using a technique called lr parsing. This section examines one particular flavor of lr parser, called a *table-driven* lr(1) parser.

An lr(1) parser scans the input from left to right to build a rightmost deriva- tion in reverse. At each step, it makes decisions based on the history of the parse and a lookahead of, at most, one symbol. The name lr(1) derives

##### 118 CHAPTER 3 Parsers

from these properties: <u>l</u>eft-to-right scan, <u>r</u>everse rightmost derivation, and <u>1</u> symbol of lookahead.

Informally, we will say that a language has the lr(1) property if it can be parsed in a single left-to-right scan, to build a reverse-rightmost derivation, using only one symbol of lookahead to determine parsing actions. In prac- tice, the simplest test to determine if a grammar has the lr(1) property is to let a parser generator attempt to build the lr(1) parser. If that process fails, the grammar lacks the lr(1) property. The remainder of this section intro- duces lr(1) parsers and their operation. Section 3.4.2 presents an algorithm to build the tables that encode an lr(1) parser.

3.4.1 **The LR(1) Parsing Algorithm** The critical step in a bottom-up parser, such as a table-driven lr(1) parser, is to find the next handle. Efficient handle finding is the key to efficient bottom- up parsing. An lr(1) parser uses a handle-finding automaton, encoded into two tables, called *Action* and *Goto*. Figure 3.15 shows a simple table-driven lr(1) parser. The skeleton lr(1) parser interprets the *Action* and *Goto* tables to find suc- cessive handles in the reverse rightmost derivation of the input string. When it finds a handle h*A*!,*k*i, it reduces at *k* to *A* in the current sentential form—the upper frontier of the partially completed parse tree. Rather than build an explicit parse tree, the skeleton parser keeps the current upper fron- tier of the partially constructed tree on a stack, interleaved with states from the handle-finding automaton that let it thread together the reductions into a parse. At any point in the parse, the stack contains a prefix of the current frontier. Beyond this prefix, the frontier consists of leaf nodes. The variable *word* holds the first word in the suffix that lies beyond the stack’s contents; it is the *lookahead symbol*.
Using a stack lets the LR(1) parser make the To find the next handle, the lr(1) parser shifts symbols onto the stack until position,*k*, in the handle be constant and the automaton finds the right end of a handle at the stack top. Once it has implicit. a handle, the parser reduces by the production in the handle. To do so, it pops the symbols in from the stack and pushes the corresponding left- hand side, *A*, onto the stack. The *Action* and *Goto* tables thread together shift and reduce actions in a grammar-driven sequence that finds a reverse rightmost derivation, if one exists.

To make this concrete, consider the grammar shown in Figure 3.16a, which describes the language of properly nested parentheses. Figure 3.16b shows the *Action* and *Goto* tables for this grammar. When used with the skeleton lr(1) parser, they create a parser for the parentheses language.

**3.4** *Bottom-Up Parsing* **119**
*push* $*;* *push start state, s*0*;* *word NextWord( );* *while (true) do;* *state top of stack;* *if Action[state,word] = ‘‘reduce A*! *’’ then begin;* *pop* 2 j j *symbols;* *state top of stack;* *push A;* *push Goto[state, A];* *end;* *else if Action[state,word] = ‘‘shift si’’ then begin;* *push word;* *push si;* *word NextWord( );* *end;* *else if Action[state,word] = ‘‘accept’’* *then break;* *else Fail( );* *end;* *report success; /* executed break on ‘‘accept’’ case */*

n **FIGURE 3.15** The Skeleton LR(1) Parser.

To understand the behavior of the skeleton lr(1) parser, consider the sequence of actions that it takes on the input string “<u>()</u>”.

**Iteration State word Stack Handle Action**

*initial* — ( $ 0 *— none —* — (

|1|0|$ 0|— none —|shift 3|
|---|---|---|---|---|
|2|3|$ 0 (3|— none —|shift 7|
|3|7|$ 0 (3)7||reduce 5|
|4|2|$ 0 Pair|2 Pair|reduce 3|
|5|1|$ 0 List|1 List|accept|

<u>)</u> eof ( ) eof eof

The first line shows the parser’s initial state. Subsequent lines show its state at the start of the while loop, along with the action that it takes. At the start of the first iteration, the stack does not contain a handle, so the parser shifts the lookahead symbol, <u>(</u>, onto the stack. From the *Action* table, it knows to shift and move to state 3. At the start of the second iteration, the stack still

##### 120 CHAPTER 3 Parsers

|Action||Table|Goto|Table|
|---|---|---|---|---|
|State eof|(|)|List|Pair|

0 s 3 1 2 1 acc s 3 4 1 *Goal*! *List* 2 r 3 r 3 2 *List*! *List Pair* 3 s 6 s 7 5 3 j *Pair* 4 r 2 r 2 4 *Pair*! <u>(</u> *Pair*<u>)</u> 5 s 8 5 j <u>()</u> 6 s 6 s 10 9 7 r 5 r 5 8 r 4 r 4 9 s 11 10 r 5 <u>11 r 4</u>

(a) Parentheses Grammar (b) *Action* and *Goto* Tables n **FIGURE 3.16** The Parentheses Grammar. does not contain a handle, so the parser shifts<u>)</u> onto the stack to build more context. It moves to state 7. In the third iteration, the situation has changed. The stack contains a han-
In an LR parser, the handle is always positioned at dle, h*Pair*!<u>( )</u> i,*t*, where *t* is the stack top. The *Action* table directs the stacktop and the chain of handles produces a parser to reduce <u>( )</u> to *Pair*. Using the state beneath *Pair* on the stack, 0, and reverse rightmost derivation. *Pair*, the parser moves to state 2 (specified by *Goto[0,Pair]*). In state 2, with *Pair* atop the stack and eof as its lookahead, the parser finds the han- dle h*List*!*Pair*,*t*i and reduces, which leaves the parser in state 1 (specified by *Goto[0,List]*). Finally, in state 1, with *List* atop the stack and eof as its lookahead, the parser discovers the handle h*Goal*!*List*,*t*i. The *Action* table encodes this situation as an *accept* action, so the parse halts.

This parse required two shifts and three reduces. lr(1) parsers take time proportional to the length of the input (one shift per word returned from the scanner) and the length of the derivation (one reduce per step in the derivation). In general, we cannot expect to discover the derivation for a sentence in any fewer steps.

Figure 3.17 shows the parser’s behavior on the input string, “<u>(())()</u>.”

The parser performs six shifts, five reduces, and one accept on this input.

Figure 3.18 shows the state of the partially-built parse tree at the start of

each iteration of the parser’s while loop. The top of each drawing shows an iteration number and a gray bar that contains the partial parse tree’s upper frontier. In the lr(1) parser, this frontier appears on the stack.

**3.4** *Bottom-Up Parsing* **121**
**Iteration State** *word* **Stack Handle Action**

*initial* — ( $ 0 *— none —* — (

|1|0|$ 0||— none —|shift 3|
|---|---|---|---|---|---|
|2|3||||shift 6|
|3|6|$ 0 3(6||— none —|shift 10|
|4|10|$ 0 3(6|10||reduce 5|
|5|5|$ 0 3 Pair|5|— none —|shift 8|
|6|8|$ 0 3 Pair|5 ) 8|Pair|reduce 4|
|7|2|$ 0 Pair 2||Pair|reduce 3|
|8|1|$ 0 List 1||— none —|shift 3|
|9|3|$ 0 List 1 (|3|— none —|shift 7|
|10|7|$ 0 List 1(3|||reduce 5|
|11|4|$ 0 List 1 Pair|4|List Pair|reduce 2|
|12|1 States of the|$ 0 List 1||List|accept|

( (

||$ 0 3||— none —|
|---|---|---|---|
|)|(|||
|)|(|)|( )|
|)|(|||
|( ( ( )|(||()|
|eof eof eof||) 7|( )|
|LR|)) ( ).|||

) (

n **FIGURE 3.17** (1) Parser on <u>( (</u>

##### Handle Finding

The parser’s actions shed additional light on the process of finding handles. Consider the parser’s actions on the string “<u>( )</u>”, as shown in the table on page 119. The parser finds a handle in each of iterations 3, 4, and 5. In itera- tion 3, the frontier of <u>( )</u> clearly matches the right-hand side of production 5. From the *Action* table, we see that a lookahead of either eof or <u>(</u> implies a reduce by production 5. Then, in iteration 4, the parser recognizes that *Pair*, followed by a lookahead of either eof or <u>(</u> constitutes a handle for the reduction by *List*!*Pair*. The final handle of the parse, *List* with lookahead of eof in state 1, triggers the accept action.

To understand how the states preserved on the stack change the parser’s behavior, consider the parser’s actions on our second input string, “( ())(),” as shown in Figure 3.17. Initially, the parser shifts (, (, and ) onto the stack, in iterations 1 to 3. In iteration 4, the parser reduces by production 5; it replaces the top two symbols on the stack, <u>(</u> and<u>)</u>, with *Pair* and moves to state 5.

Between these two examples, the parser recognized the string<u>()</u> at stacktop as a handle three times. It behaved differently in each case, based on the prior left context encoded in the stack. Comparing these three situations exposes how the stacked states control the future direction of the parse.

With the first example, <u>()</u>, the parser was in *s*7with a lookahead of eof when it found the handle. The reduction reveals *s* beneath <u>()</u>, and *Goto[s*,*Pair*] is *s*. In *s*, a lookahead of eof leads to another reduction followed by an accept action. A lookahead of<u>)</u> in *s* produces an error.

##### 122 CHAPTER 3 Parsers

##### 2. ( 10. List ()

? *Pair* P

3. <u>( (</u>)? PPq
<u>(</u> *Pair*<u>)</u> AU

4. ( () <u>()</u>
##### 5. <u>(</u> Pair 11. List Pair

||?|AU|
|---|---|---|
|||()|
|(|)||
|(|)||

AU () *Pair* P )? PPq *Pair*

6. <u>(</u> *Pair*<u>)</u>AU AU <u>()</u>
##### 12. List

PPPq

7. *Pair*)
P )? PPq *List Pair* <u>(</u> *Pair*<u>)</u>

||?|AU|
|---|---|---|
|||()|
|(|)||
|(|)||

AU*Pair* P

<u>()</u>)? PPq
*Pair* AU

8. *List*
? *Pair* P )? PPq 13. *Goal* <u>(</u> *Pair*<u>)</u> ? AU *List* PPPq

<u>()</u>)
*List Pair*

||?|AU|
|---|---|---|
|||()|
|(|)||
|(|)||

##### 9. List <u>(</u>

*Pair* PPPq ?)? *Pair Pair* P )? PPq AU <u>(</u> *Pair*<u>)</u> AU <u>()</u>

n **FIGURE 3.18** The Sequence of Partial Parse Trees Built for <u>(( ))( )</u>.

**3.4** *Bottom-Up Parsing* **123**
The second example, <u>( ())()</u>, encounters a handle for <u>()</u> twice. The first handle occurs in iteration 4. The parser is in *s*10with a lookahead of<u>)</u>. It has previously shifted <u>(</u>, <u>(</u>, and<u>)</u> onto the stack. The *Action* table indi- cates “r 5,” so the parser reduces by *Pair*! <u>()</u>. The reduction reveals *s*3 beneath <u>()</u> and *Goto[s*3,*Pair]* is *s*5, a state in which further<u>)</u>’s are legal. The second time it finds <u>()</u> as a handle occurs in iteration 10. The reduction reveals *s*1beneath <u>()</u> and takes the parser to *s*4. In *s*4, a lookahead of either eof or <u>(</u> triggers a reduction of *List Pair* to *List*, while a lookahead of<u>)</u> is an error.

The *Action* and *Goto* tables, along with the stack, cause the parser to track prior left context and let it take different actions based on that context. Thus, the parser handles correctly each of the three instances in which it found a handle for <u>()</u>. We will revisit this issue when we examine the construction of *Action* and *Goto*.

##### Parsing an Erroneous Input String

To see how an lr(1) parser discovers a syntax error, consider the sequence of actions that it takes on the string “<u>( ))</u>”, shown below:

**Iteration State** *word* **Stack Handle Action**

*initial* — ( $ 0 *— none —* — (

|1|0|$ 0|— none —|shift 3|
|---|---|---|---|---|
|2|3|$ 0(3|— none —|shift 7|
|3|7|$ 0(3|7 — none —|error|

) ))

The first two iterations of the parse proceed as in the first example, “<u>( )</u>”. The parser shifts <u>(</u> and<u>)</u>. In the third iteration of the while loop, it looks at the Action table entry for state 7 and<u>)</u>. That entry contains neither shift, reduce, nor accept, so the parser interprets it as an error.

The lr(1) parser detects syntax errors through a simple mechanism: the corresponding table entry is invalid. The parser detects the error as soon as possible, before reading any words beyond those needed to prove the input erroneous. This property allows the parser to localize the error to a specific point in the input. Using the available context and knowledge of the grammar, we can build lr(1) parsers that provide good diagnostic error messages.

##### Using LR Parsers

The key to lr parsing lies in the construction of the *Action* and *Goto* tables. The tables encode all of the legal reduction sequences that can arise in a

##### 124 CHAPTER 3 Parsers

reverse rightmost derivation for the given grammar. While the number of such sequences is huge, the grammar itself constrains the order in which reductions can occur.

The compiler writer can build *Action* and *Goto* tables by hand. However, the table-construction algorithm requires scrupulous bookkeeping; it is a prime example of the kind of task that should be automated and relegated to a computer. Programs that automate this construction are widely avail- able. The next section presents one algorithm that can be used to construct lr(1) parse tables.

With an lr(1) parser generator, the compiler writer’s role is to define the grammar and to ensure that the grammar has the lr(1) property. In practice, the lr(1) table generator identifies those productions that are ambiguous or that are expressed in a way that requires more than one word of lookahead to distinguish between a shift action and a reduce action. As we study the table-construction algorithm, we will see how those problems arise, how to cure them, and how to understand the kinds of diagnostic information that lr(1) parser generators produce.

##### Using More Lookahead

The ideas that underlie lr(1) parsers actually define a family of parsers that vary in the amount of lookahead that they use. An lr(*k*) parser uses, at most, *k* lookahead symbols. Additional lookahead allows an lr(2) parser to recognize a larger set of grammars than an lr(1) parsing system. Almost paradoxically, however, the added lookahead does not increase the set of languages that these parsers can recognize. lr(1) parsers accept the same set of languages as lr(*k*) parsers for *k >* 1. The lr(1) grammar for a language may be more complex than an lr(*k*) grammar.

3.4.2 **Building LR(1) Tables** To construct *Action* and *Goto* tables, an lr(1) parser generator builds a model of the handle-recognizing automaton and uses that model to fill in the tables. The model, called the *canonical collection of sets of* lr*(1) items*, represents all of the possible states of the parser and the transitions between those states. It is reminiscent of the subset construction from Section 2.4.3. To illustrate the table-construction algorithm, we will use two examples. The first is the parentheses grammar given in Figure 3.16a. It is small enough to use as a running example, but large enough to exhibit some of the complexities of the process.

**3.4** *Bottom-Up Parsing* **125**
##### 1 Goal! List

|2 List|! List Pair|
|---|---|
|3|j Pair|
|4 Pair|! (Pair|
|5|j|

<u>)</u> <u>()</u>

Our second example, in Section 3.4.3, is an abstracted version of the clas- sic if-then-else ambiguity. The table construction fails on this grammar because of its ambiguity. The example highlights the situations that lead to failures in the table-construction process.

##### LR(1) Items

In an lr(1) parser, the *Action* and *Goto* tables encode information about the potential handles at each step in the parse. The table-construction algorithm, therefore, needs a concrete representation for both handles and potential han- dles, and their associated lookahead symbols. We represent each potential handle with an lr(1) item. An lr(1) item [*A*!, a] consists of a pro-**LR(1) item** duction *A*!; a placeholder,, that indicates the position of the stacktop [*A*!, a] where*A*! is a grammar in the production’s right-hand side; and a specific terminal symbol, a, as a production, represents the position of the parser’s stacktop, and a is a terminal symbol in lookahead symbol. the grammar The table-construction algorithm uses lr(1) items to build a model of the sets of valid states for the parser, the canonical collection of sets of lr(1) items. We designate the canonical collection *CC* Dfcc0, cc1, cc2,*:::*, cc*n*g. The algorithm builds *CC* by following possible derivations in the grammar; in the final collection, each set cc*i*in *CC* contains the set of potential han- dles in some possible parser configuration. Before we delve into the table construction, further explanation of lr(1) items is needed.

For a production *A*! and a lookahead symbol a, the placeholder can generate three distinct items, each with its own interpretation. In each case, the presence of the item in some set cc*i*in the canonical collection indicates input that the parser has seen is consistent with the occurrence of an *A* fol- lowed by an a in the grammar. The position of in the item distinguishes between the three cases.

**1.** [*A*!,a] indicates that an *A* would be valid and that recognizing a next would be one step toward discovering an *A*. We call such an item a *possibility*, because it represents a possible completion for the input already seen.
**2.** [*A*!,a] indicates that the parser has progressed from the state [*A*!,a] by recognizing. The is consistent with recognizing

##### 126 CHAPTER 3 Parsers

[*Goal*! *List*,eof] [*Goal*!*List*,eof] [*List*! *List Pair*,eof] [*List*! *List Pair*,<u>(</u>] [*List*!*List Pair*,eof] [*List*!*List Pair*,<u>(</u>] [*List*!*List Pair*,eof] [*List*!*List Pair*,<u>(</u>] [*List*! *Pair*,eof] [*List*! *Pair*,<u>(</u>] [*List*!*Pair* [*List*!*Pair*

|,eof]|,(]||
|---|---|---|
|( Pair ),eof]|( Pair ),)]|( Pair ),(]|
|),eof]|),)]|),(]|
|),eof]|),(]|),)]|
|||)|
|LR|||

(),eof] (),(] (),)]

[*Pair*! [*Pair*! [*Pair*! [*Pair*! ( *Pair*),eof] [*Pair*! ( *Pair*),)] [*Pair*! ( *Pair*),(] [*Pair*! ( *Pair* [*Pair*! ( *Pair* [*Pair*! ( *Pair* [*Pair*! ( *Pair*),eof] [*Pair*! ( *Pair*),)] [*Pair*! ( *Pair*),(] [*Pair*! [*Pair*! [*Pair*! [*Pair*! ( [*Pair*! ( [*Pair*! ( [*Pair*! (),eof] [*Pair*! (),(] [*Pair*! (,)]

n **FIGURE 3.19** (1) Items for the Parentheses Grammar.

an *A*. One valid next step would be to recognize a. We call such an item *partially complete.*

**3.** [*A*!,a] indicates that the parser has found in a context where an *A* followed by an a would be valid. If the lookahead symbol is a, then the item is a handle and the parser can reduce to *A*. Such an item is *complete*. In an lr(1) item, the encodes some local left context—the portions of the production already recognized. (Recall, from the earlier examples, that the states pushed onto the stack encode a summary of the context to the left of the current lr(1) item—in essence, the history of the parse so far.) The lookahead symbol encodes one symbol of legal right context. When the parser finds itself in a state that includes [*A*!,a] with a lookahead of a, it has a handle and should reduce to *A*.
Figure 3.19 shows the complete set of lr(1) items generated by the
 parentheses grammar. Two items deserve particular notice. The first, [*Goal*! *List*,eof], represents the initial state of the parser—looking for a string that reduces to *Goal*, followed by eof. Every parse begins in this state. The second, [*Goal*!*List*,eof], represents the desired final state of the parser—finding a string that reduces to *Goal*, followed by eof. This item represents every successful parse. All of the possible parses result from stringing together parser states in a grammar-directed way, beginning with [*Goal*! *List*,eof] and ending with [*Goal*!*List*,eof].

**3.4** *Bottom-Up Parsing* **127**
##### Constructing the Canonical Collection

To build the canonical collection of sets of lr(1) items, *CC*, a parser gen- erator must start from the parser’s initial state, [*Goal*! *List*,eof], and construct a model of all the potential transitions that can occur. The algo- rithm represents each possible configuration, or state, of the parser as a set of lr(1) items. The algorithm relies on two fundamental operations on these sets of lr(1) items: taking a closure and computing a transition.

n The closure operation completes a state; given some core set of lr(1) items, it adds to that set any related lr(1) items that they imply. For example, anywhere that *Goal*!*List* is legal, the productions that derive a *List* are legal, too. Thus, the item [*Goal*! *List*,eof] implies both [*List*! *List Pair*,eof] and [*List*! *Pair*,eof]. The *closure* procedure implements this function. n To model the transition that the parser would make from a given state on some grammar symbol, *x*, the algorithm computes the set of items that would result from recognizing an *x*. To do so, the algorithm selects the subset of the current set of lr(1) items where precedes *x* and advances the past the *x* in each of them. The *goto* procedure implements this function.

To simplify the task of finding the goal symbol, we require that the grammar have a unique goal symbol that does not appear on the right-hand side of any production. In the parentheses grammar, that symbol is *Goal*.

The item [*Goal*! *List*,eof] represents the parser’s initial state for the parentheses grammar; every valid parse recognizes *Goal* followed by eof. This item forms the core of the first state in *CC*, labelled cc₀. If the grammar has multiple productions for the goal symbol, each of them generates an item in the initial core of cc₀.

***The*** closure ***Procedure*** To compute the complete initial state of the parser, cc₀, from its core, the algorithm must add to the core all of the items implied by the items in the core. Figure 3.20 shows an algorithm for this computation. *Closure* iterates over all the items in set *s*. If the placeholder in an item immediately pre- cedes some nonterminal *C*, then *closure* must add one or more items for each production that can derive *C*. Closure places the at the initial position of each item that it builds this way.

The rationale for *closure* is clear. If [*A*! *C*,a] 2 *s*, then a string that reduces to *C*, followed by a will complete the left context. Recognizing a *C* followed by a should cause a reduction to *A*, since it completes the

##### 128 CHAPTER 3 Parsers

*closure(s)* *while (s is still changing)*

|while|(s is still|changing)|||
|---|---|---|---|---|
|for|each item for each for|[ A! production each b 2 FIRST.a/ s s|C ,a] 2 s C ! [ f[C !|2 P ,b]g|
|return|s||||

n **FIGURE 3.20** The*closure* Procedure.

production’s right-hand side (*C*) and follows it with a valid lookahead symbol.

To build the items for a production *C*!, *closure* inserts the placeholder before and adds the appropriate lookahead symbols—each terminal that can appear as the initial symbol in a. This includes every terminal in In our experience, this use of FIRST( a) is the first*./*. If 2 first*./*, it also includes a. The notation first( a*/* in the point in the process where a human is most to algorithm represents this extension of the first set to a string in this way. If likely make a mistake. is, this devolves into first*.*a*/* Df a g.

For the parentheses grammar, the initial item is [*Goal*! *List*,eof]. Apply- ing *closure* to that set adds the following items:

[*List*!*List Pair*,eof], [*List*!*List Pair*,<u>(</u>], [*List*!*Pair*,eof], [*List*!*Pair*,(], [*Pair*! ( *Pair*),eof], [*Pair*! ( *Pair*),(], [*Pair*! <u>()</u>,eof] [*Pair*! <u>()</u>,<u>(</u>]

These eight items, along with [*Goal*! *List*,eof], constitute set cc₀ in the canonical collection. The order in which *closure* adds the items will depend on how the set implementation manages the interaction between the “*for* *each item*” iterator and the set union in the innermost loop.

*Closure* is another fixed-point computation. The triply-nested loop either adds items to *s* or leaves *s* intact. It never removes an item from *s*. Since the set of lr(1) items is finite, this loop must halt. The triply nested loop looks expensive. However, close examination reveals that each item in *s* needs to be processed only once. A worklist version of the algorithm could capitalize on that fact.

***The*** goto ***Procedure*** The second fundamental operation that the construction uses is the *goto* function. *Goto* takes as input a model of a parser state, represented as a set cc*i*in the canonical collection, and a grammar symbol *x*. It computes, from cc*i*and *x*, a model of the parser state that would result from recognizing an *x* in state *i*.

**3.4** *Bottom-Up Parsing* **129**
*goto(s, x)* *moved*;

|moved|;||||
|---|---|---|---|---|
|for each|item|i 2 s|||
|if|the form moved|of i moved|is [ [ f[|x, a] then x, a]g|
|return|closure(moved)||||

! !

n **FIGURE 3.21** The*goto* Function.

The *goto* function, shown in Figure 3.21, takes a set of lr(1) items *s* and a grammar symbol *x* and returns a new set of lr(1) items. It iterates over the items in *s*. When it finds an item in which the immediately precedes *x*, it creates a new item by moving the rightward past *x*. This new item represents the parser’s configuration after recognizing *x*. *Goto* places these new items in a new set, takes its *closure* to complete the parser state, and returns that new state.

Given the initial set for the parentheses grammar, 8 9 ><[*Goal*!*List*, eof] [*List*!*List Pair*, eof] [*List*!*List Pair*,] >=

|||(|
|---|---|---|
||(|()|

() ( ( ) ( ) (

cc₀ D [*List*!*Pair*, eof] [*List*!*Pair*,] [*Pair*! *Pair*, eof] >: >; [*Pair*! *Pair*,] [*Pair*!, eof] [*Pair*!,]

we can derive the state of the parser after it recognizes an initial <u>(</u> by com- puting *goto*(cc₀,<u>(</u>). The inner loop finds four items that have before <u>(</u>. *Goto* creates a new item for each, with the advanced beyond <u>(</u>. Closure adds two more items, generated from the items with before *Pair*. These items introduce the lookahead symbol<u>)</u>. Thus, *goto*(cc₀,<u>(</u>) returns () [*Pair*! ( *Pair*),eof] [*Pair*! ( *Pair*),(] [*Pair*! (),eof]. [*Pair*! (),(] [*Pair*! ( *Pair*),)] [*Pair*!( ),)]

To find the set of states that derive directly from some state such as cc₀, the algorithm can compute *goto*(cc0,*x*) for each *x* that occurs after a in an item in cc₀. This produces all the sets that are one symbol away from cc₀. To compute the complete canonical collection, we simply iterate this process to a fixed point.

##### The Algorithm

To construct the canonical collection of sets of lr(1) items, the algorithm computes the initial set, cc₀, and then systematically finds all of the sets of lr(1) items that are reachable from cc₀. It repeatedly applies *goto* to the new sets in *CC*; *goto*, in turn, uses *closure*. Figure 3.22 shows the algorithm.

For a grammar with the goal production *S*!*S*, the algorithm begins by initializing *CC* to contain cc₀, as described earlier. Next, it systematically

##### 130 CHAPTER 3 Parsers

cc₀

|closure.f[S⁰!||S, eof]g/|||
|---|---|---|---|---|
|CC f cc0 g|||||
|while (new|sets are|still being|added to|CC)|
|for each|unmarked|set i 2 CC|||
|mark|i as processed||||
|for|each x following temp goto(cci,x) if temp 2 = CC then CC record transition|a CC [ftempg from|in an item i to temp|in i on x|

cc cc cc

cc

n **FIGURE 3.22** The Algorithm to Build *CC*.

extends *CC* by looking for any transition from a state in *CC* to a state not yet in *CC*. It does this constructively, by building each possible state, *temp*, and testing *temp* for membership in *CC*. If *temp* is new, it adds *temp* to *CC*. Whether or not *temp* is new, it records the transition from cc*i*to *temp* for later use in building the parser’s *Goto* table.

To ensure that the algorithm processes each set cc*i*just once, it uses a simple marking scheme. It creates each set in an unmarked condition and marks the set as it is processed. This drastically reduces the number of times that it invokes *goto* and *closure*.

This construction is a fixed-point computation. The canonical collection, *CC*, is a subset of the powerset of the lr(1) items. The while loop is monotonic; it adds new sets to *CC* and never removes them. If the set of lr(1) items has *n* elements, then *CC* can grow no larger than 2 *n* items, so the computation must halt.

This upper bound on the size of *CC* is quite loose. For example, the paren- theses grammar has 33 lr(1) items and produces just 12 sets in *CC*. The upper bound would be 2 33, a much larger number. For more complex gram- mars, j*CC*j is a concern, primarily because the *Action* and *Goto* tables grow with j*CC*j. As described in Section 3.6, both the compiler writer and the parser-generator writer can take steps to reduce the size of those tables.

##### The Canonical Collection for the Parentheses Grammar

As a first complete example, consider the problem of building *CC* for the parentheses grammar. The initial set, cc₀, is computed as *closure.*[*Goal*! *List*,eof]*/*.

**3.4** *Bottom-Up Parsing* **131**

|Iteration|Item|Goal List|Pair (|) eof||
|---|---|---|---|---|---|
|0|cc₀|; cc₁|cc₂ cc₃|;;||
|1|cc₁ cc₂ cc₃|;;;;;;|cc₄ cc₃;; cc₅ cc₆|;;;; cc₇;||
|2|cc₄ cc₅ cc₆ cc₇|;;;;;;;;|;;;; cc₉ cc₆;;|;; cc₈; cc₁₀;;;||
|3|cc₈ cc₉ cc₁₀|;;;;;;|;;;;;;|;; cc₁₁;;;||
|4 Trace of the|cc₁₁ (1) Construction on the Parentheses Grammar.|;;|;;|;;||
|8|||||9|
|<[Goal ! List, eof]||[List ! List Pair, eof]||[List ! List Pair,|] =|
|: [List ! Pair, eof]||[List ! Pair,||] [Pair !|, eof];|
|[Pair !|Pair at the start of its right-hand side, cc₀ contains only|,] [Pair !|, eof]|[Pair !|,]|

n **FIGURE 3.23** LR

|||(|
|---|---|---|
||(|()|

() ( ( ) ( ) (

##### cc₀ D Pair

Since each item has the possibilities. This is appropriate, since it is the parser’s initial state. The first iteration of the *while* loop produces three sets, cc₁, cc₂, and cc₃. All of the other combinations in the first iteration produce empty sets, as indicated in

Figure 3.23, which traces the construction of *CC*.

*goto*(cc₀,*List*) is cc₁. 8 9 < [*Goal*! *List*, eof] [*List*! *List Pair*, eof] [*List*! *List Pair*,]=

|||(|
|---|---|---|
||( ) (||

() () ( ( )

cc₁ D [*Pair*! *Pair*, eof] [*Pair*! *Pair*,] [*Pair*!, eof] :; [*Pair*!,]

cc₁ represents the parser configurations that result from recognizing a *List*. All of the items are possibilities that lead to another pair of parentheses, except for the item [*Goal*! *List*, eof]. It represents the parser’s accept state—a reduction by *Goal*!*List*, with a lookahead of eof.

*goto*(cc₀,*Pair*) is cc₂. n o cc₂ D [*List*! *Pair*, eof] [*List*! *Pair*, <u>(</u>]

cc₂ represents the parser configurations after it has recognized an initial *Pair*. Both items are handles for a reduction by *List*!*Pair*.

##### 132 CHAPTER 3 Parsers

*goto*(cc₀,<u>(</u>) is cc₃. () [*Pair*! *Pair*,] [*Pair*! *Pair*, eof] [*Pair*! *Pair*,]

|( ))|()|() (|
|---|---|---|

()) () () (

cc₃ D [*Pair*!,] [*Pair*!, eof] [*Pair*!,]

cc₃ represents the parser’s configuration after it recognizes an initial <u>(</u>. When the parser enters state 3, it must recognize a matching<u>)</u> at some point in the future.

The second iteration of the *while* loop tries to derive new sets from cc₁, cc₂, and cc₃. Five of the combinations produce nonempty sets, four of which are new.

*goto*(cc₁,*Pair*) is cc₄. n o cc₄ D [*List*! *List Pair*, eof] [*List*! *List Pair*, <u>(</u>]

The left context for this set is cc₁, which represents a state where the parser has recognized one or more occurrences of *List*. When it then recognizes a *Pair*, it enters this state. Both items represent a reduction by *List*!*List Pair*.

*goto*(cc₁,<u>(</u>) is cc₃, which represents the future need to find a matching<u>)</u>.

|goto(cc₃, Pair) is cc₅.|||
|---|---|---|
||()|() (|

n o cc₅ D [*Pair*! *Pair*, eof] [*Pair*! *Pair*,]

cc₅ consists of two partially complete items. The parser has recognized a <u>(</u> followed by a *Pair*; it now must find a matching<u>)</u>. If the parser finds a<u>)</u>, it will reduce by rule 4, *Pair*! <u>(</u> *Pair*<u>)</u>.

*goto*(cc₃,<u>(</u>) is cc₆. () [*Pair*! ( *Pair*), )] [*Pair*! ( *Pair*),)] cc₆ D [*Pair*! <u>( )</u>,<u>)</u>] [*Pair*! <u>()</u>,<u>)</u>]

The parser arrives in cc₆ when it encounters a <u>(</u> and it already has at least one ( on the stack. The items show that either a ( or a ) lead to valid states.

*goto*(cc₃,<u>)</u>) is cc₇. n o cc₇ D [*Pair*! <u>( )</u>, eof] [*Pair*! <u>( )</u>, <u>(</u>]

If, in state 3, the parser finds a<u>)</u>, it takes the transition to cc₇. Both items specify a reduction by *Pair*!<u>( )</u>.

The third iteration of the while loop tries to derive new sets from cc₄, cc₅, cc₆, and cc₇. Three of the combinations produce new sets, while one produces a transition to an existing state.

**3.4** *Bottom-Up Parsing* **133**
*goto*(cc₅,<u>)</u>) is cc₈. n o cc₈ D [*Pair*! ( *Pair*), eof] [*Pair*! ( *Pair*), (]

When it arrives in state 8, the parser has recognized an instance of rule 4, *Pair*! <u>(</u> *Pair*<u>)</u>. Both items specify the corresponding reduction.

*goto*(cc₆,*Pair*) is cc₉. n o cc₉ D [*Pair*! <u>(</u> *Pair*<u>)</u>,<u>)</u>]

In cc₉, the parser needs to find a<u>)</u> to complete rule 4.

*goto*(cc₆,<u>(</u>) is cc₆. In cc₆, another <u>(</u> will cause the parser to stack another state 6 to represent the need for a matching<u>)</u>.

*goto*(cc₆,<u>)</u>) is cc₁₀.

n o cc₁₀ D [*Pair*! <u>( )</u>,<u>)</u>]

This set contains one item, which specifies a reduction to *Pair*.

The fourth iteration of the *while* loop tries to derive new sets from cc₈, cc₉, and cc₁₀. Only one combination creates a nonempty set.

*goto*(cc₉,<u>)</u>) is cc₁₁.

n o cc₁₁ D [*Pair*! <u>(</u> *Pair*<u>)</u>,<u>)</u>]

State 11 calls for a reduction by *Pair*! <u>(</u> *Pair*<u>)</u>.

The final iteration of the while loop tries to derive new sets from cc₁₁. It finds only empty sets, so the construction halts with 12 sets, cc₀ through cc₁₁.

##### Filling in the Tables

Given the canonical collection of sets of lr(1) items for a grammar, the parser generator can fill in the *Action* and *Goto* tables by iterating through *CC* and examining the items in each cc*j*2 *CC*. Each cc*j*becomes a parser state. Its items generate the nonempty elements of one row of *Action*; the corresponding transitions recorded during construction of *CC* specify the nonempty elements of *Goto*. Three cases generate entries in the *Action* table:

##### 134 CHAPTER 3 Parsers

**1.** An item of the form [*A*! c,a] indicates that encountering the terminal symbol c would be a valid next step toward discovering the nonterminal *A*. Thus, it generates a *shift* item on c in the current state. The next state for the recognizer is the state generated by computing goto on the current state with the terminal c. Either or can be.
**2.** An item of the form [*A*!, a] indicates that the parser has recognized a, and if the lookahead is a, then the item is a handle. Thus, it generates a *reduce* item for the production *A*! on a in the current state.
0 0

**3.** An item of the form [*S*!*S*, eof] where *S* is the goal symbol indicates the accepting state for the parser; the parser has recognized an input stream that reduces to the goal symbol and the lookahead symbol is eof. This item generates an *accept* action on eof in the current state.
Figure 3.24 makes this concrete. For an lr(1) grammar, it should uniquely
 define the nonerror entries in the *Action* and *Goto* tables. Notice that the table-filling algorithm essentially ignores items where the precedes a nonterminal symbol. Shift actions are generated when precedes
The table-filling actions can be integrated into a terminal. Reduce and accept actions are generated when is at the right end the construction of *CC*. of the production. What if cc*i*contains an item [*A*!, a], where 2 *N T*? While this item does not generate any table entries itself, its presence in the set forces the *closure* procedure to include items that generate table entries. When *closure* finds a that immediately precedes a nonterminal symbol, it adds productions that have as their left-hand side, with a preceding their right-hand sides. This process instantiates first*./* in cc*i*. The *closure* procedure will find each *x* 2 first*./* and add the items into cc*i*to generate shift items for each *x*.

*for each* cc*i* 2 *CC* *for each item I* 2 cc*i* *if I is* [*A*! c,a*] and goto(*cc*i ,*c*) =* cc*j then* *Action[i,*c*] ‘‘shift j’’* *else if I is* [*A*!, a] *then* *Action[i,*a*] ‘‘reduce A*! *’’* *else if I is* [*S*0!*S*, eof] *then* *Action[i,* eof*] ‘‘accept’’* *for each n* 2 *N T* *if goto(*cc*i ,n) =* cc*j then* *Goto[i,n] j*

n **FIGURE 3.24** LR(1) Table-Filling Algorithm.

**3.4** *Bottom-Up Parsing* **135**
For the parentheses grammar, the construction produces the Action and Goto tables shown in Figure 3.16b on page 120. As we saw, combining the tables with the skeleton parser in Figure 3.15 creates a functional parser for the language.

In practice, an lr(1) parser generator must produce other tables needed by the skeleton parser. For example, when the skeleton parser in Figure 3.15 on page 119 reduces by *A*!, it pops “2 j j” symbols from the stack and pushes *A* onto the stack. The table generator must produce data structures that map a production from the reduce entry in the *Action* table, say *A*!, into both j j and*A*. Other tables, such as a map from the integer representing a grammar symbol into its textual name, are needed for debugging and for diagnostic messages.

##### Handle Finding, Revisited

lr(1) parsers derive their efficiency from a fast handle-finding mechanism embedded in the *Action* and *Goto* tables. The canonical collection, *CC*, rep- resents a handle-finding dfa for the grammar. Figure 3.25 shows the dfa for our example, the parentheses grammar.

How can the lr(1) parser use a dfa to find the handles, when we know that the language of parentheses is not a regular language? The lr(1) parser relies on a simple observation: *the set of handles is finite.* The set of handles The LR(1) parser makes the handle’s position is precisely the set of complete lr(1) items—those with the placeholder implicit, at stacktop. This design decision at the right end of the item’s production. Any language with a finite set of drastically reduces the number of possible handles. sentences can be recognized by a dfa. Since the number of productions and the number of lookahead symbols are both finite, the number of complete items is finite, and the language of handles is a regular language.

When the lr(1) parser executes, it interleaves two kinds of actions: shifts and reduces. The shift actions simulate steps in the handle-finding dfa. The

<u>)</u>

||Pair|-||-|||
|---|---|---|---|---|---|---|
||cc1|cc4 (|cc5|cc8 (|||
|cc0 n FIGURE 3.25|( cc2|cc3 ( )|cc6 ) cc7|cc10|cc9)|cc11|

cc1 cc4 cc5 cc8

*List*@*Pair* @ @R? --*Pair*--

@ @ @ *Pair*@ @ @ @R @R @R

##### Handle-Finding DFA for the Parentheses Grammar.

##### 136 CHAPTER 3 Parsers

parser performs one shift action per word in the input stream. When the handle-finding dfa reaches a final state, the lr(1) parser performs a reduce action. The reduce actions reset the state of the handle-finding dfa to reflect the fact that the parser has recognized a handle and replaced it with a non- terminal. To accomplish this, the parser pops the handle and its state off the stack, revealing an older state. The parser uses that older state, the look- ahead symbol, and the *Goto* table to discover the state in the dfa from which handle-finding should continue.

The reduce actions tie together successive handle-finding phases. The reduc- tion uses left context—the state revealed by the reduction summarizes the prior history of the parse—to restart the handle-finding dfa in a state that reflects the nonterminal that the parser just recognized. For example, in the parse of “<u>(())()</u>”, the parser stacked an instance of state 3 for every <u>(</u> that it encounters. These stacked states allow the algorithm to match up the opening and closing parentheses.

Notice that the handle-finding dfa has transitions on both terminal and non- terminal symbols. The parser traverses the nonterminal edges only on a reduce action. Each of these transitions, shown in gray in Figure 3.25, corre- sponds to a valid entry in the *Goto* table. The combined effect of the terminal and nonterminal actions is to invoke the dfa recursively each time it must recognize a nonterminal.

3.4.3 **Errors in the Table Construction** As a second example of the lr(1) table construction, consider the ambigu- ous grammar for the classic *if-then-else* construct. Abstracting away the details of the controlling expression and all other statements (by treat- ing them as terminal symbols) produces the following four-production grammar:
*Stmt*

|1 Goal|!||
|---|---|---|
|2 Stmt|!|Stmt|
|3|j|Stmt|
|4|j||

if expr then if expr then else *Stmt* assign

It has two nonterminal symbols, *Goal* and *Stmt*, and six terminal symbols, *if*, *expr*, *then*, *else*, *assign*, and the implicit eof.

The construction begins by initializing cc₀ to the item [*Goal*! *Stmt*, eof] and taking its *closure* to produce the first set.

**3.4** *Bottom-Up Parsing* **137**

|Item|Goal Stmt|if expr|then|else|assign|eof|
|---|---|---|---|---|---|---|
|0 cc₀|; cc₁|cc₂;|;|;|cc₃|;|
|1 cc₁|;;|;;|;|;|;|;|
|cc₂|;;|; cc₄|;|;|;|;|
|cc₃|;;|;;|;|;|;|;|
|2 cc₄|;;|;;|cc₅|;|;|;|
|3 cc₅|; cc₆|cc₇;|;|;|cc₈|;|
|4 cc₆|;;|;;|;|cc₉|;|;|
|cc₇|;;|; cc₁₀|;|;|;|;|
|cc₈|;;|;;|;|;|;|;|
|5 cc₉|; cc₁₁|cc₂;|;|;|cc₃|;|
|cc₁₀|;;|;;|cc₁₂|;|;|;|
|6 cc₁₁|;;|;;|;|;|;|;|
|cc₁₂|; cc₁₃|cc₇;|;|;|cc₈|;|
|7 cc₁₃|;;|;;|;|cc₁₄|;|;|
|8 cc₁₄|; cc₁₅|cc₇;|;|;|cc₈|;|
|9 cc₁₅ ( cc₀ D [Goal ! Stmt, eof]|;; Trace of the (1) Construction on the If-Then-Else Grammar.|;;|; [Stmt ! if|;|;|; Stmt, eof]|
|[Stmt ! assign, eof]||[Stmt ! if|||Stmt else|Stmt, eof]|

n **FIGURE 3.26** LR

) expr then expr then

From this set, the construction begins deriving the remaining members of the canonical collection of sets of lr(1) items.

Figure 3.26 shows the progress of the construction. The first iteration exam-

ines the transitions out of cc₀ for each grammar symbol. It produces three new sets for the canonical collection from cc₀: cc₁ for *Stmt*, cc₂ for if, and cc₃ for assign. These sets are: n o cc₁ D [*Goal*! *Stmt*, eof] () [*Stmt*! if expr then *Stmt*, eof], cc₂ D [*Stmt*! if expr then *Stmt* else *Stmt*, eof] n o cc₃ D [*Stmt*! assign, eof]

The second iteration examines transitions out of these three new sets. Only one combination produces a new set, looking at cc₂ with the symbol expr. () [*Stmt*! if expr then *Stmt*, eof], cc₄ D [*Stmt*! if expr then *Stmt* else *Stmt*, eof]

##### 138 CHAPTER 3 Parsers

transitions

|The next|iteration|computes|from|cc₄; it creates|cc₅ as|
|---|---|---|---|---|---|
||8||||9|
||> >[Stmt ! if > >||Stmt, eof],||> > > >|
||> <[Stmt ! if||Stmt else Stmt, eof],||> =|
|cc₅ D|> > > [Stmt ! if >[Stmt ! assign, feof, elseg], > :||||> > > > >;|

*goto*(cc4,then).

expr then expr then expr then *Stmt*, feof, elseg],

[*Stmt*! if expr then *Stmt* else *Stmt*, feof, elseg]

The fourth iteration examines transitions out of cc₅. It creates new sets for *Stmt*, for if, and for assign. () [*Stmt*! if expr then *Stmt*, eof], cc₆ D [*Stmt*! if expr then *Stmt* else *Stmt*, eof] () [*Stmt*! if expr then *Stmt*,feof, elseg], cc₇ D [*Stmt*! if expr then *Stmt* else *Stmt*, feof, elseg]

##### cc₈ Df[Stmt! assign, feof, elseg]g

The fifth iteration examines cc₆, cc₇, and cc₈. While most of the com- binations produce the empty set, two combinations lead to new sets. The transition on else from cc₆ leads to cc₉, and the transition on expr from cc₇ creates cc₁₀.

|8|9|
|---|---|
|> >[Stmt ! if > < cc₉ D [Stmt ! if|Stmt, eof],> > > =|
|> >[Stmt ! if > : [Stmt ! assign, eof]|> >;|
|( [Stmt ! if|)|

expr then *Stmt* else expr then *Stmt*, eof], expr then *Stmt* else *Stmt*, eof],>

expr then *Stmt*, feof, elseg], cc₁₀ D [*Stmt*! if expr then *Stmt* else *Stmt*, feof, elseg]

When the sixth iteration examines the sets produced in the fifth iteration, it creates two new sets, cc₁₁ from cc₉ on *Stmt* and cc₁₂ from cc₁₀ on then. It also creates duplicate sets for cc₂ and cc₃ from cc₉.

cc₁₁ Df[*Stmt*! if expr then *Stmt* else *Stmt*, eof]g 8 9

||8||9|
|---|---|---|---|
||> >[Stmt ! if >|Stmt, feof, elseg],|> > >|
||> > <[Stmt ! if|Stmt else Stmt, feof, elseg],>|> =|
|cc₁₂ D|> > [Stmt ! if > >[Stmt ! if > :||> > > >;|

expr then expr then expr then *Stmt*, feof, elseg], expr then *Stmt* else *Stmt*, feof, elseg], > [*Stmt*! assign, feof, elseg]

**3.4** *Bottom-Up Parsing* **139**
Iteration seven creates cc₁₃ from cc₁₂ on *Stmt*. It recreates cc₇ and cc₈. () [*Stmt*! if expr then *Stmt*, feof, elseg], cc₁₃ D [*Stmt*! if expr then *Stmt* else *Stmt*, feof, elseg]

Iteration eight finds one new set, cc₁₄ from cc₁₃ on the transition for else.

|8|9|
|---|---|
|> >[Stmt ! if > < cc₁₄ D [Stmt ! if|> > =|
|> >[Stmt ! if >|> >|

expr then *Stmt* else *Stmt*, feof, elseg],> expr then *Stmt*, feof, elseg], expr then *Stmt* else *Stmt*, feof, elseg],> :; [*Stmt*! assign, feof, elseg]

Iteration nine generates cc₁₅ from cc₁₄ on the transition for *Stmt*, along with duplicates of cc₇ and cc₈.

cc₁₅Df[*Stmt*! if expr then *Stmt* else *Stmt*, feof, elseg]g

The final iteration looks at cc₁₅. Since the lies at the end of every item in cc₁₅, it can only generate empty sets. At this point, no additional sets of items can be added to the canonical collection, so the algorithm has reached a fixed point. It halts.

The ambiguity in the grammar becomes apparent during the table-filling algorithm. The items in states cc₀ through cc₁₂ generate no conflicts. State cc₁₃ contains four items:

expr then

|1. [Stmt ! if|Stmt|, else]||
|---|---|---|---|
|2. [Stmt ! if|Stmt|, eof]||
|3. [Stmt ! if|Stmt||Stmt, else]|
|4. [Stmt ! if|Stmt||Stmt, eof]|

expr then expr then else expr then else

Item 1 generates a reduce entry for cc₁₃ and the lookahead else. Item 3 generates a shift entry for the same location in the table. Clearly, the table entry cannot hold both actions. This *shift-reduce conflict* indicates that the grammar is ambiguous. Items 2 and 4 generate a similar shift-reduce conflict with a lookahead of eof. When the table-filling algorithm encounters such A typical error message from a parser generator a conflict, the construction has failed. The table generator should report the includes the LR(1) items that generate the problem—a fundamental ambiguity between the productions in the specific conflict; another reason to study the table lr(1) items—to the compiler writer. construction.

In this case, the conflict arises because production 2 in the grammar is a prefix of production 3. The table generator could be designed to resolve this conflict in favor of shifting; that forces the parser to recognize the longer production and binds the else to the innermost if.

##### 140 CHAPTER 3 Parsers

An ambiguous grammar can also produce a *reduce-reduce conflict*. Such a conflict can occur if the grammar contains two productions *A*! and *B*!, with the same right-hand side. If a state contains the items [*A*!,a] and [*B*!,a], then it will generate two conflicting reduce actions for the lookahead a—one for each production. Again, this conflict reflects a fundamental ambiguity in the underlying grammar; the compiler writer must reshape the grammar to eliminate it (see Section 3.5.3).

Since parser generators that automate this process are widely available, the method of choice for determining whether a grammar has the lr(1) property is to invoke an lr(1) parser generator on it. If the process succeeds, the grammar has the lr(1) property.

##### SECTION REVIEW

Exercise 12 shows an LR(1) grammar that has no LR(1) parsers are widely used in compilers built in both industry and equivalent LL(1) grammar. academia. These parsers accept a large class of languages. They use time proportional to the size of the derivation that they construct. Tools that generate an LR(1) parser are widely available in a broad variety of implementation languages.

The LR(1) table-construction algorithm is an elegant application of theory to practice. It systematically builds up a model of the handle-recognizing DFA and then translates that model into a pair of tables that drive the skeleton parser. The table construction is a complex undertaking that requires painstaking attention to detail. It is precisely the kind of task that As a final example, the LR tables for the classic should be automated—parser generators are better at following these expression grammar appear in Figures 3.31 long chains of computations than are humans. That notwithstanding, and 3.32 on pages 151 and 152. a skilled compiler writer should understand the table-construction algorithms because they provide insight into how the parsers work, what kinds of errors the parser generator can encounter, how those errors arise, and how they can be remedied.

##### Review Questions

**1.** Show the steps that the skeleton LR(1) parser, with the tables for the parentheses grammar, would take on the input string “<u>(()())()</u>.”
**2.** Build the LR(1) tables for the *SheepNoise* grammar, given in Section 3.2 2 on page 86, and show the skeleton parser’s actions on the input “baa baa baa.”

**3.5** *Practical Issues* **141**
3.5 **PRACTICAL ISSUES** Even with automatic parser generators, the compiler writer must manage several issues to produce a robust, efficient parser for a real programming language. This section addresses several issues that arise in practice.
3.5.1 **Error Recovery** Programmers often compile code that contains syntax errors. In fact, com- pilers are widely accepted as the fastest way to discover such errors. In this application, the compiler must find as many syntax errors as possible in a single attempt at parsing the code. This requires attention to the parser’s behavior in error states. All of the parsers shown in this chapter have the same behavior when they encounter a syntax error: they report the problem and halt. This behavior prevents the compiler from wasting time trying to translate an incorrect pro- gram. However, it ensures that the compiler finds at most one syntax error per compilation. Such a compiler would make finding all the syntax errors in a file of program text a potentially long and painful process. A parser should find as many syntax errors as possible in each compilation. This requires a mechanism that lets the parser recover from an error by mov- ing to a state where it can continue parsing. A common way of achieving this is to select one or more words that the parser can use to synchronize the input with its internal state. When the parser encounters an error, it discards input symbols until it finds a synchronizing word and then resets its internal state to one consistent with the synchronizing word. In an Algol-like language, with semicolons as statement separators, the semicolon is often used as a synchronizing word. When an error occurs, the parser calls the scanner repeatedly until it finds a semicolon. It then changes state to one that would have resulted from successful recognition of a complete statement, rather than an error. In a recursive-descent parser, the code can simply discard words until it finds a semicolon. At that point, it can return control to the point where the routine that parses statements reports success. This may involve manipulating the runtime stack or using a nonlocal jump like C’s setjmp and longjmp. In an lr(1) parser, this kind of resynchronization is more complex. The parser discards input until it finds a semicolon. Next, it scans backward down the parse stack until it finds a state *s* such that Goto[*s*,*Statement*] is a valid, nonerror entry. The first such state on the stack represents the statement that

##### 142 CHAPTER 3 Parsers

contains the error. The error recovery routine then discards entries on the stack above that state, pushes the state Goto[*s*,*Statement*] onto the stack and resumes normal parsing.

In a table-driven parser, either ll(1) or lr(1), the compiler needs a way of telling the parser generator where to synchronize. This can be done using error productions—a production whose right-hand side includes a reserved word that indicates an error synchronization point and one or more synchronizing tokens. With such a construct, the parser generator can construct error-recovery routines that implement the desired behavior.

Of course, the error-recovery routines should take steps to ensure that the compiler does not try to generate and optimize code for a syntactically invalid program. This requires simple handshaking between the error- recovery apparatus and the high-level driver that invokes the various parts of the compiler.

3.5.2 **Unary Operators** The classic expression grammar includes only binary operators. Algebraic notation, however, includes unary operators, such as unary minus and abso- lute value. Other unary operators arise in programming languages, including autoincrement, autodecrement, address-of, dereference, boolean comple- ment, and typecasts. Adding such operators to the expression grammar requires some care. Consider adding a unary absolute-value operator, k, to the classic expression grammar. Absolute value should have higher precedence than either x or ÷.
*Goal*

|0 Goal|! Expr|||||
|---|---|---|---|---|---|
|1 Expr|! Expr|Term||Expr||
|2|j Expr|Term||||
|3|j Term||Expr|-|Term|
|4 Term|! Term|Value||||
|5|j Term|Value|Term||Value|
|6|j Value|||||
|7 Value|! k Factor||Value||Factor|
|8|j Factor|||||
|9 Factor ! (|Expr|||| Factor||<num,3>|
|10|j|||||
|11|j (a) The Grammar||<name,x> (b) Parse Tree for kx - 3|||

+ -

x ÷

<u>)</u> num name

n **FIGURE 3.27** Adding Unary Absolute Value to the Classic Expression Grammar.

**3.5** *Practical Issues* **143**
However, it needs a lower precedence than *Factor* to force evaluation of par- enthetic expressions before application of k. One way to write this grammar is shown in Figure 3.27. With these additions, the grammar is still lr(1). It lets the programmer form the absolute value of a number, an identifier, or a parenthesized expression.

Figure 3.27b shows the parse tree for the string kx - 3. It correctly shows that

the code must evaluate kx before performing the subtraction. The grammar does not allow the programmer to write kkx, as that makes little mathe- matical sense. It does, however, allow k(kx), which makes as little sense as kkx.

The inability to write kkx hardly limits the expressiveness of the language. With other unary operators, however, the issue seems more serious. For example, a C programmer might need to write **p to dereference a vari- able declared as char**p;. We can add a dereference production for*Value* as well: *Value*! * *Value*. The resulting grammar is still an lr(1) grammar, even if we replace the x operator in *Term*! *Term* x *Value* with *, overload- ing the operator “*” in the way that C does. This same approach works for unary minus.

3.5.3 **Handling Context-Sensitive Ambiguity** Using one word to represent two different meanings can create a syntactic ambiguity. One example of this problem arose in the definitions of several early programming languages, including fortran, pl/i, and Ada. These lan- guages used parentheses to enclose both the subscript expressions of an array reference and the argument list of a subroutine or function. Given a textual reference, such as fee(i,j), the compiler cannot tell if fee is a two-dimensional array or a procedure that must be invoked. Differentiating between these two cases requires knowledge of fee’s declared type. This information is not syntactically obvious. The scanner undoubtedly classi- fies fee as a name in either case. A function call and an array reference can appear in many of the same situations. Neither of these constructs appears in the classic expression grammar. We can add productions that derive them from *Factor*.

|(|)||
|---|---|---|
|num|||
|name|||
|name|(|)|
|name|(|)|

|Factor|!|FunctionReference||
|---|---|---|---|
||j j|ArrayReference Expr||
||j|||
||j|||
|FunctionReference|!||ArgList|
|ArrayReference|!||ArgList|

##### 144 CHAPTER 3 Parsers

Since the last two productions have identical right-hand sides, this grammar is ambiguous, which creates a reduce-reduce conflict in an lr(1) table builder.

Resolving this ambiguity requires extra-syntactic knowledge. In a recursive- descent parser, the compiler writer can combine the code for *FunctionRef-* *erence* and *ArrayReference* and add the extra code required to check the name’s declared type. In a table-driven parser built with a parser generator, the solution must work within the framework provided by the tools.

Two different approaches have been used to solve this problem. The com- piler writer can rewrite the grammar to combine both the function invocation and the array reference into a single production. In this scheme, the issue is deferred until a later step in translation, when it can be resolved with infor- mation from the declarations. The parser must construct a representation that preserves all the information needed by either resolution; the later step will then rewrite the reference to its appropriate form as an array reference or as a function invocation.

Alternatively, the scanner can classify identifiers based on their declared types, rather than their microsyntactic properties. This classification requires some hand-shaking between the scanner and the parser; the coordination is not hard to arrange as long as the language has a define-before-use rule. Since the declaration is parsed before the use occurs, the parser can make its internal symbol table available to the scanner to resolve identifiers into distinct classes, such as variable-name and function-name. The relevant productions become:

|function-name|(|)|
|---|---|---|
|variable-name|(|)|

*FunctionReference*! *ArgList* *ArrayReference*! *ArgList*

Rewritten in this way, the grammar is unambiguous. Since the scanner returns a distinct syntactic category in each case, the parser can distinguish the two cases.

3.5.4 **Left versus Right Recursion** As we have seen, top-down parsers need right-recursive grammars rather than left-recursive ones. Bottom-up parsers can accommodate either left or right recursion. Thus, the compiler writer must choose between left and right recursion in writing the grammar for a bottom-up parser. Several factors play into this decision.

**3.5** *Practical Issues* **145**
##### Stack Depth

In general, left recursion can lead to smaller stack depths. Consider two alter- nate grammars for a simple list construct, shown in Figures 3.28a and 3.28b. (Notice the similarity to the *SheepNoise* grammar.) Using these grammars to produce a five-element list leads to the derivations shown in Figures 3.28c and 3.28d, respectively. An lr(1) parser would construct these sequences in reverse. Thus, if we read the derivation from the bottom line to the top line, we can follow the parsers’s actions with each grammar.

**1.** *Left-recursive grammar* This grammar shifts elt₁ onto its stack and immediately reduces it to *List*. Next, it shifts elt₂ onto the stack and reduces it to *List*. It proceeds until it has shifted each of the five eltis onto the stack and reduced them to *List*. Thus, the stack reaches a maximum depth of two and an average depth of
<u>10</u> 6 D 1 <u>2</u> 3.

**2.** *Right-recursive grammar* This version shifts all five eltis onto its stack. Next, it reduces elt₅ to *List* using rule two, and the remaining *List*! *List* elt *List*! elt *List* j elt j elt
(a) Left-Recursive Grammar (b) Right-Recursive Grammar
*List* *List* elt1 *List* *List* elt5*List*

|elt5||elt1 elt2||
|---|---|---|---|
|elt4 elt5||elt1 elt2|elt3|
|elt3 elt4|elt5|elt1 elt2|elt3 elt4|
|elt2 elt3|elt4 elt5|elt1 elt2|elt3 elt4|
|elt2 elt3|elt4 elt5|elt5||

*List List* *List List* *List* elt1 *List*

(c) Derivation with Left Recursion (d) Derivation with Right Recursion

||elt5|elt1||
|---|---|---|---|
||elt4|elt2||
|elt3|||elt3|
|elt2|||elt4|

elt1 elt5

(e) AST with Left Recursion (f) AST with Right Recursion
n **FIGURE 3.28** Left- and Right-Recursive List Grammars.

##### 146 CHAPTER 3 Parsers

eltis using rule one. Thus, its maximum stack depth will be five and its <u>20 1</u> average will be D 3. 6 3 The right-recursive grammar requires more stack space; its maximum stack depth is bounded only by the length of the list. In contrast, the maximum stack depth with the left-recursive grammar depends on the grammar rather than the input stream.

For short lists, this is not a problem. If, however, the list represents the statement list in a long run of straight-line code, it might have hundreds of elements. In this case, the difference in space can be dramatic. If all other issues are equal, the smaller stack height is an advantage.

##### Associativity

Left recursion naturally produces left associativity, and right recursion nat- urally produces right associativity. In some cases, the order of evaluation **Abstract syntax tree** makes a difference. Consider the abstract syntax trees (asts) for the two five- An AST is a contraction of the parse tree. See element lists, shown in Figures 3.28e and 3.28f. The left-recursive grammar Section 5.2.1 on page 227. reduces elt₁ to a *List*, then reduces *List* elt2, and so on. This produces the ast shown on the left. Similarly, the right-recursive grammar produces the ast shown on the right.

For a list, neither of these orders is obviously incorrect, although the right- recursive ast may seem more natural. Consider, however, the result if we replace the list constructor with arithmetic operations, as in the grammars

*Expr*! *Expr Expr*! *Expr*

|+ Operand|Operand|+|
|---|---|---|
|-Operand|Operand|-|
|Operand 1 + x2 + x3 + x4 + x5|Operand||

j *Expr* j *Expr* j j

For the string x the left-recursive grammar implies a left- to-right evaluation order, while the right-recursive grammar implies a right- to-left evaluation order. With some number systems, such as floating-point arithmetic, these two evaluation orders can produce different results.

Since the mantissa of a floating-point number is small relative to the range of the exponent, addition can become an identity operation with two numbers that are far apart in magnitude. If, for example, x₄ is much smaller than x₅, the processor may compute x₄ + x₅ = x₅ With well-chosen values, this effect can cascade and yield different answers from left-to-right and right-to-left evaluations.

Similarly, if any of the terms in the expression is a function call, then the order of evaluation may be important. If the function call changes the value

**3.6** *Advanced Topics* **147**
of a variable in the expression, then changing the evaluation order might change the result.

In a string with subtractions, such as x1-x2 +x3, changing the evaluation order can produce incorrect results. Left associativity evaluates, in a pos- torder tree walk, to (x1 - x2) + x3, the expected result. Right associativity, on the other hand, implies an evaluation order of x1 - (x2 + x3). The com- piler must, of course, preserve the evaluation order dictated by the language definition. The compiler writer can either write the expression grammar so that it produces the desired order or take care to generate the intermediate representation to reflect the correct order and associativity, as described in Section 4.5.2.

##### SECTION REVIEW

Building a compiler involves more than just transcribing the grammar from some language definition. In writing down the grammar, many choices arise that have an impact on both the function and the utility of the resulting compiler. This section dealt with a variety of issues, ranging from how to perform error recovery through the tradeoff between left recursion and right recursion.

##### Review Questions

**1.** The programming language C uses square brackets to indicate an array subscript and parentheses to indicate a procedure or function argument list. How does this simplify the construction of a parser for C?
**2.** The grammar for unary absolute value introduced a new terminal symbol as the unary operator. Consider adding a unary minus to the classic expression grammar. Does the fact that the same termi- nal symbol occurs as either a unary minus or a binary minus introduce complications? Justify your answer.
3.6 **ADVANCED TOPICS** To build a satisfactory parser, the compiler writer must understand the basics of engineering a grammar and a parser. Given a working parser, there are often ways of improving its performance. This section looks at two specific issues in parser construction. First, we examine transformations on the gram- mar that reduce the length of a derivation to produce a faster parse. These

##### 148 CHAPTER 3 Parsers

*Goal*

|0 Goal|! Expr|||Expr||
|---|---|---|---|---|---|
|1 Expr|! Expr + Term|||||
|2 3|j Expr j Term|Term|Expr|+|Term|
|4 Term|! Term x Factor||||×|
|5 6|j Term j Factor|Factor|Term|Term|Factor|
|7 Factor|! ( Expr )||Factor|Factor|<name,b>|
|8|j|||||
|9 (a) The Classic Expression Grammar|j||<name,a> (b) Parse Tree for a + 2 x b|<name,2>||

-

÷

num name

n **FIGURE 3.29** The Classic Expression Grammar, Revisited.

ideas apply to both top-down and bottom-up parsers. Second, we discuss transformations on the grammar and the *Action* and *Goto* tables that reduce table size. These techniques apply only to lr parsers.

3.6.1 **Optimizing a Grammar** While syntax analysis no longer consumes a major share of compile time, the compiler should not waste undue time in parsing. The actual form of a grammar has a direct effect on the amount of work required to parse it. Both top-down and bottom-up parsers construct derivations. A top-down parser performs an expansion for every production in the derivation. A bottom- up parser performs a reduction for every production in the derivation. A grammar that produces shorter derivations takes less time to parse. The compiler writer can often rewrite the grammar to reduce the parse tree height. This reduces the number of expansions in a top-down parser and the number of reductions in a bottom-up parser. Optimizing the grammar cannot change the parser’s asymptotic behavior; after all, the parse tree must have a leaf node for each symbol in the input stream. Still, reducing the constants in heavily used portions of the grammar, such as the expression grammar, can make enough difference to justify the effort. Consider, again, the classic expression grammar from Section 3.2.4. (The lr(1) tables for the grammar appear in Figures 3.31 and 3.32.) To enforce the desired precedence among operators, we added two nonterminals, *Term* and *Factor*, and reshaped the grammar into the form shown in Figure 3.29a. This grammar produces rather large parse trees, even for simple expressions. For example, the expression a + 2 x b, the parse tree has 14 nodes, as shown

**3.6** *Advanced Topics* **149**
*Goal*

4 *Term*! *Term* x ( *Expr*) *Expr* 5 j *Term* x name 6 j *Term* x num 7 j *Term* ÷ ( *Expr*) *Expr* + *Term* 8 j *Term* ÷ name 9 j *Term* ÷ num *Term Term* × <name,b> 10 j ( *Expr*) 11 j name 12 j num <name,a> <name,2>

(a) New Productions for *Term* (b) Parse Tree for a + 2 x b
n **FIGURE 3.30** Replacement Productions for *Term*.

in Figure 3.29b. Five of these nodes are leaves that we cannot eliminate. (Changing the grammar cannot shorten the input program.)

Any interior node that has only one child is a candidate for optimization. The sequence of nodes *Expr* to *Term* to *Factor* to hname,ai uses four nodes for a single word in the input stream. We can eliminate at least one layer, the layer of *Factor* nodes, by folding the alternative expansions for *Factor* into *Term*, as shown in Figure 3.30a. It multiplies by three the number of alternatives for *Term*, but shrinks the parse tree by one layer, shown in Figure 3.30b.

In an lr(1) parser, this change eliminates three of nine reduce actions, and leaves the five shifts intact. In a top-down recursive-descent parser for an equivalent predictive grammar, it would eliminate 3 of 14 procedure calls.

In general, any production that has a single symbol on its right-hand side can be folded away. These productions are sometimes called *useless pro-* *ductions*. Sometimes, useless productions serve a purpose—making the grammar more compact and, perhaps, more readable, or forcing the deriva- tion to assume a particular shape. (Recall that the simplest of our expression grammars accepts a + 2 x b but does not encode any notion of precedence into the parse tree.) As we shall see in Chapter 4, the compiler writer may include a useless production simply to create a point in the derivation where a particular action can be performed.

Folding away useless productions has its costs. In an lr(1) parser, it can make the tables larger. In our example, eliminating *Factor* removes one col- umn from the Goto table, but the extra productions for *Term* increase the size of *CC* from 32 sets to 46 sets. Thus, the tables have one fewer column, but an extra 14 rows. The resulting parser performs fewer reductions (and runs faster), but has larger tables.

##### 150 CHAPTER 3 Parsers

In a hand-coded, recursive-descent parser, the larger grammar may increase the number of alternatives that must be compared before expanding some left-hand side. The compiler writer can sometimes compensate for the increased cost by combining cases. For example, the code for both nontrivial expansions of *Expr* 0 in Figure 3.10 is identical. The compiler writer could combine them with a test that matches word against either + or -. Alterna- tively, the compiler writer could assign both + and-to the same syntactic category, have the parser inspect the syntactic category, and use the lexeme to differentiate between the two when needed.

3.6.2 **Reducing the Size of LR(1) Tables** Unfortunately, the lr(1) tables generated for relatively small grammars can be large. Figures 3.31 and 3.32 show the canonical lr(1) tables for the classic expression grammar. Many techniques exist for shrinking such tables, including the three approaches to reducing table size described in this section.
##### Combining Rows or Columns

If the table generator can find two rows, or two columns, that are identical, it can combine them. In Figure 3.31, the rows for states 0 and 7 through 10 are identical, as are rows 4, 14, 21, 22, 24, and 25. The table generator can implement each of these sets once, and remap the states accordingly. This would remove nine rows from the table, reducing its size by 28 percent. To use this table, the skeleton parser needs a mapping from a parser state to a row index in the Action table. The table generator can combine identi- cal columns in the analogous way. A separate inspection of the Goto table will yield a different set of state combinations—in particular, all of the rows containing only zeros should condense to a single row.

In some cases, the table generator can prove that two rows or two columns differ only in cases where one of the two has an “error” entry (denoted by a blank in our figures). In Figure 3.31, the columns for eof and for num differ only where one or the other has a blank. Combining such columns produces the same behavior on correct inputs. It does change the parser’s behavior on erroneous inputs and may impede the parser’s ability to provide accurate and helpful error messages.

Combining rows and columns produces a direct reduction in table size. If this space reduction adds an extra indirection to every table access, the cost of those memory operations must trade off directly against the savings in mem- ory. The table generator could also use other techniques to represent sparse matrices—again, the implementor must consider the tradeoff of memory size against any increase in access costs.

**3.6** *Advanced Topics* **151**

|Action Table|||
|---|---|---|
|State eof C (|) num|name|

|0||||||s4||s5|s6|
|---|---|---|---|---|---|---|---|---|---|
|1|acc|s7|s8|||||||
|2|r4|r4|r4|s9|s 10|||||
|3|r7|r7|r7|r7|r7|||||
|4||||||s 14||s 15|s 16|
|5|r9|r9|r9|r9|r9|||||
|6|r 10|r 10|r 10|r 10|r 10|||||
|7||||||s4||s5|s6|
|8||||||s4||s5|s6|
|9||||||s4||s5|s6|
|10||||||s4||s5|s6|
|11||s 21|s 22||||s 23|||
|12||r4|r4|s 24|s 25||r4|||
|13||r7|r7|r7|r7||r7|||
|14||||||s 14||s 15|s 16|
|15||r9|r9|r9|r9||r9|||
|16||r 10|r 10|r 10|r 10||r 10|||
|17|r2|r2|r2|s9|s 10|||||
|18|r3|r3|r3|s9|s 10|||||
|19|r5|r5|r5|r5|r5|||||
|20|r6|r6|r6|r6|r6|||||
|21||||||s 14||s 15|s 16|
|22||||||s 14||s 15|s 16|
|23|r8|r8|r8|r8|r8|||||
|24||||||s 14||s 15|s 16|
|25||||||s 14||s 15|s 16|
|26||s 21|s 22||||s 31|||
|27||r2|r2|s 24|s 25||r2|||
|28||r3|r3|s 24|s 25||r3|||
|29||r5|r5|r5|r5||r5|||
|30||r6|r6|r6|r6||r6|||
|31||r8|r8|r8|r8||r8|||

n **FIGURE 3.31** Action Table for the Classic Expression Grammar.

##### Shrinking the Grammar

In many cases, the compiler writer can recode the grammar to reduce the number of productions it contains. This usually leads to smaller tables. For example, in the classic expression grammar, the distinction between a num- ber and an identifier is irrelevant to the productions for *Goal*, *Expr*, *Term*, and *Factor*. Replacing the two productions *Factor*! num and *Factor*!

##### 152 CHAPTER 3 Parsers

|Goto|Table|
|---|---|
|State Expr Term|Factor|

|Goto|Table|
|---|---|
|State Expr Term|Factor|

|0|1|2|3|16|||
|---|---|---|---|---|---|---|
|1||||17|||
|2||||18|||
|3||||19|||
|4|11|12|13|20|||
|5||||21|27|13|
|6||||22|28|13|
|7||17|3|23|||
|8||18|3|24||29|
|9|||19|25||30|
|10|||20|26|||
|11||||27|||
|12||||28|||
|13||||29|||
|14|26|12|13|30|||
|15||||31|||

n **FIGURE 3.32** *Goto* Table for the Classic Expression Grammar.

name with a single production *Factor*! val shrinks the grammar by a pro- duction. In the *Action* table, each terminal symbol has its own column. Folding num and name into a single symbol, val, removes a column from the *Action* table. To make this work, in practice, the scanner must return the same syntactic category, or word, for both num and name.

Similar arguments can be made for combining x and ÷ into a single ter- minal muldiv, and for combining + and-into a single terminal addsub. Each of these replacements removes a terminal symbol and a production. These three changes produce the reduced expression grammar shown in

Figure 3.33a. This grammar produces a smaller *CC*, removing rows from the

table. Because it has fewer terminal symbols, it has fewer columns as well.

The resulting *Action* and *Goto* tables are shown in Figure 3.33b. The *Action* table contains 132 entries and the *Goto* table contains 66 entries, for a total of 198 entries. This compares favorably with the tables for the original grammar, with their 384 entries. Changing the grammar produced a 48 percent reduction in table size. The tables still contain opportunities for further reductions. For example, rows 0, 6, and 7 in the *Action* table are identical, as are rows 4, 11, 15, and 17. Similarly, the *Goto* table has many

**3.6** *Advanced Topics* **153**

|1 Goal|! Expr|
|---|---|
|2 Expr|! Expr addsub Term|
|3|j Term|
|4 Term|! Term muldiv Factor|
|5|j Factor|
|6 Factor|! ( Expr )|
|7|j|

val

(a) The Reduced Expression Grammar

|Action|Table|Goto|Table|
|---|---|---|---|
|eof addsub muldiv|()|val Expr|Term Factor|

0 s 4 s 5 1 2 3 1 acc s 6 2 r 3 r 3 s 7 3 r 5 r 5 r 5 4 s 11 s 12 8 9 10 5 r 7 r 7 r 7 6 s 4 s 5 13 3 7 s 4 s 5 14 8 s 15 s 16 9 r 3 s 17 r 3 10 r 5 r 5 r 5 11 s 11 s 12 18 9 10 12 r 7 r 7 r 7 13 r 2 r 2 s 7 14 r 4 r 4 r 4 15 s 11 s 12 19 10 16 r 6 r 6 r 6 17 s 11 s 12 20 18 s 15 s 21 19 r 2 s 17 r 2 20 r 4 r 4 r 4 21 r 6 r 6 r 6

(b) *Action* and *Goto* Tables for the Reduced Expression Grammar
n **FIGURE 3.33** The Reduced Expression Grammar and its Tables.

rows that only contain the error entry. If table size is a serious concern, rows and columns can be combined after shrinking the grammar.

Other considerations may limit the compiler writer’s ability to combine pro- ductions. For example, the x operator might have multiple uses that make combining it with ÷ impractical. Similarly, the parser might use separate

##### 154 CHAPTER 3 Parsers

productions to let the parser handle two syntactically similar constructs in different ways.

##### Directly Encoding the Table

As a final improvement, the parser generator can abandon the table- driven skeleton parser in favor of a hard-coded implementation. Each state becomes a small case statement or a collection of if–then–else statements that test the type of the next symbol and either shift, reduce, accept, or report an error. The entire contents of the *Action* and *Goto* tables can be encoded in this way. (A similar transformation for scanners is discussed in Section 2.5.2.)

The resulting parser avoids directly representing all of the “don’t care” states in the *Action* and *Goto* tables, shown as blanks in the figures. This space savings may be offset by larger code size, since each state now includes more code. The new parser, however, has no parse table, performs no table lookups, and lacks the outer loop found in the skeleton parser. While its structure makes it almost unreadable by humans, it should execute more quickly than the corresponding table-driven parser. With appropriate code- layout techniques, the resulting parser can exhibit strong locality in both the instruction cache and the paging system. For example, we should place all the routines for the expression grammar together on a single page, where they cannot conflict with one another.

##### Using Other Construction Algorithms

Several other algorithms to construct lr-style parsers exist. Among these techniques are the slr(1) construction, for simple <u>lr</u>(1), and the lalr(1) construction, for lookahead lr(1). Both of these constructions produce smaller tables than the canonical lr(1) algorithm.

The slr(1) algorithm accepts a smaller class of grammars than the canoni- cal lr(1) construction. These grammars are restricted so that the lookahead symbols in the lr(1) items are not needed. The algorithm uses follow sets to distinguish between cases in which the parser should shift and those in which it should reduce. This mechanism is powerful enough to resolve many grammars of practical interest. By using follow sets, the algorithm elim- inates the need for lookahead symbols. This produces a smaller canonical collection and a table with fewer rows.

The lalr(1) algorithm capitalizes on the observation that some items in the set representing a state are critical and that the remaining ones can be derived from the critical items. The lalr(1) table construction only represents the

**3.7** *Summary and Perspective* **155**
critical items; again, this produces a canonical collection that is equivalent to the one produced by the slr(1) construction. The details differ, but the table sizes are the same.

The canonical lr(1) construction presented earlier in the chapter is the most general of these table-construction algorithms. It produces the largest tables, but accepts the largest class of grammars. With appropriate table reduction techniques, the lr(1) tables can approximate the size of those produced by the more limited techniques. However, in a mildly counterintuitive result, any language that has an lr(1) grammar also has an lalr(1) grammar and an slr(1) grammar. The grammars for these more restrictive forms will be shaped in a way that allows their respective construction algorithms to resolve the situations in which the parser should shift and those in which it should reduce.

3.7 **SUMMARY AND PERSPECTIVE** Almost every compiler contains a parser. For many years, parsing was a subject of intense interest. This led to the development of many different techniques for building efficient parsers. The lr(1) family of grammars includes all of the context-free grammars that can be parsed in a deter- ministic fashion. The tools produce efficient parsers with provably strong error-detection properties. This combination of features, coupled with the widespread availability of parser generators for lr(1), lalr(1), and slr(1) grammars, has decreased interest in other automatic parsing techniques such as operator precedence parsers. Top-down, recursive-descent parsers have their own set of advantages. They are, arguably, the easiest hand-coded parsers to construct. They provide excellent opportunities to detect and repair syntax errors. They are efficient; in fact, a well-constructed top-down, recursive-descent parser can be faster than a table-driven lr(1) parser. (The direct encoding scheme for lr(1) may overcome this speed advantage.) In a top-down, recursive-descent parser, the compiler writer can more easily finesse ambiguities in the source language that might trouble an lr(1) parser—such as a language in which keyword names can appear as identifiers. A compiler writer who wants to construct a hand-coded parser, for whatever reason, is well advised to use the top-down, recursive-descent method. In choosing between lr(1) and ll(1) grammars, the choice becomes one of available tools. In practice, few, if any, programming-language constructs fall in the gap between lr(1) grammars and ll(1) grammars. Thus, start- ing with an available parser generator is always better than implementing a parser generator from scratch.

##### 156 CHAPTER 3 Parsers

More general parsing algorithms are available. In practice, however, the restrictions placed on context-free grammars by the lr(1) and ll(1) classes do not cause problems for most programming languages.

n **CHAPTER NOTES** The earliest compilers used hand-coded parsers [27, 227, 314]. The syn- tactic richness of Algol 60 challenged early compiler writers. They tried a variety of schemes to parse the language; Randell and Russell give a fasci- nating overview of the methods used in a variety of Algol 60 compilers [293, Chapter 1].

Irons was one of the first to separate the notion of syntax from transla- tion [202]. Lucas appears to have introduced the notion of recursive-descent parsing [255]. Conway applies similar ideas to an efficient single-pass compiler for cobol [96].

The ideas behind ll and lr parsing appeared in the 1960s. Lewis and Stearns introduced ll(*k*) grammars [245]; Rosenkrantz and Stearns described their properties in more depth [305]. Foster developed an algorithm to transform a grammar into ll(1) form [151]. Wood formalized the notion of left-factoring a grammar and explored the theoretical issues involved in transforming a grammar to ll(1) form [353, 354, 355].

Knuth laid out the theory behind lr(1) parsing [228]. DeRemer and oth- ers developed techniques, the slr and lalr table-construction algorithms, that made the use of lr parser generators practical on the limited-memory computers of the day [121, 122]. Waite and Goos describe a technique for automatically eliminating useless productions during the lr(1) table- construction algorithm [339]. Penello suggested direct encoding of the tables into executable code [282]. Aho and Ullman [8] is a definitive reference on both ll and lr parsing. Bill Waite provided the example grammar in exercise 3.7.

Several algorithms for parsing arbitrary context-free grammars appeared in the 1960s and early 1970s. Algorithms by Cocke and Schwartz [91], Younger [358], Kasami [212], and Earley [135] all had similar computa- tional complexity. Earley’s algorithm deserves particular note because of its similarity to the lr(1) table-construction algorithm. Earley’s algorithm derives the set of possible parse states at parse time, rather than at runtime, where the lr(1) techniques precompute these in a parser generator. From a high-level view, the lr(1) algorithms might appear as a natural optimization of Earley’s algorithm.

##### Exercises 157

n **EXERCISES**

**1.** Write a context-free grammar for the syntax of regular expressions. Section 3.2
**2.** Write a context-free grammar for the Backus-Naur form (bnf) notation for context-free grammars.
**3.** When asked about the definition of an *unambiguous context-free* *grammar* on an exam, two students gave different answers. The first defined it as “a grammar where each sentence has a unique syntax tree by leftmost derivation.” The second defined it as “a grammar where each sentence has a unique syntax tree by any derivation.” Which one is correct?
**4.** The following grammar is not suitable for a top-down predictive Section 3.3 parser. Identify the problem and correct it by rewriting the grammar. Show that your new grammar satisfies the ll(1) condition. *L*! *R* a *R*! aba *Q*! bbc
j *Q* ba j caba j bc j *R* bc

**5.** Consider the following grammar:
*A*! *B* a *C*! c *B* *B*! dab j *A* c j *C* b

Does this grammar satisfy the ll(1) condition? Justify your answer. If it does not, rewrite it as an ll(1) grammar for the same language.

**6.** Grammars that can be parsed top-down, in a linear scan from left to right, with a *k* word lookahead are called ll(*k*) grammars. In the text, the ll(1) condition is described in terms of first sets. How would you define the first sets necessary to describe an ll(*k*) condition?
**7.** Suppose an elevator is controlled by two commands: " to move the elevator up one floor and # to move the elevator down one floor. Assume that the building is arbitrarily tall and that the elevator starts at floor *x*. Write an ll(1) grammar that generates arbitrary command sequences that (1) never cause the elevator to go below floor *x* and (2) always return the elevator to floor *x* at the end of the sequence. For example, ""## and "#"# are valid command sequences, but "##" and "## are not. For convenience, you may consider a null sequence as valid. Prove that your grammar is ll(1).

##### 158 CHAPTER 3 Parsers

Section 3.4 **8.** Top-down and bottom-up parsers build syntax trees in different orders. Write a pair of programs, TopDown and BottomUp, that take a syntax tree and print out the nodes in order of construction. TopDown should display the order for a top-down parser, while BottomUp should show the order for a bottom-up parser.

**9.** The *ClockNoise* language (*CN*) is represented by the following grammar:
*Goal*! *ClockNoise* *ClockNoise*! *ClockNoise* tick tock j tick tock

**a.** What are the lr(1) items of *CN*?
**b.** What are the first sets of *CN*?
**c.** Construct the Canonical Collection of Sets of lr(1) Items for *CN*.
**d.** Derive the Action and Goto tables.
**10.** Consider the following grammar:
*Start*! *S* *S*! *A* a *A*! *B C* j *B C* f *B*! b *C*! c

**a.** Construct the canonical collection of sets of lr(1) items for this grammar.
**b.** Derive the Action and Goto tables.
**c.** Is the grammar lr(1)?
**11.** Consider a robot arm that accepts two commands: 5 puts an apple in the bag and 4 takes an apple out of the bag. Assume the robot arm starts with an empty bag. A valid command sequence for the robot arm should have no prefix that contains more 4 commands than 5 commands. As examples, 5544 and 545 are valid command sequences, but 5445 and 54544 are not.
**a.** Write an lr(1) grammar that represents all the value command sequences for the robot arm.
**b.** Prove that the grammar is lr(1).

##### Exercises 159

**12.** The following grammar has no known ll(1) equivalent:
0 *Start*! *A* 1 j *B* 2 *A*! ( *A*<u>)</u> 3 j <u>a</u> 4 *B*! ( *B* <u>></u> 5 j <u>b</u>

##### Show that the grammar is lr(1).

**13.** Write a grammar for expressions that can include binary operators (+ Section 3.6 and x), unary minus (-), autoincrement (++), and autodecrement (- -) with their customary precedence. Assume that repeated unary minuses are not allowed, but that repeated autoincrement and autodecrement operators are allowed.
**14.** Consider the task of building a parser for the programming language Section 3.7 Scheme. Contrast the effort required for a top-down recursive-descent parser with that needed for a table-driven lr(1) parser. (Assume that you already have an lr(1) table generator.)
**15.** The text describes a manual technique for eliminating useless productions in a grammar.
**a.** Can you modify the lr(1) table-construction algorithm so that it automatically eliminates the overhead from useless productions?
**b.** Even though a production is syntactically useless, it may serve a practical purpose. For example, the compiler writer might associate a syntax-directed action (see Chapter 4) with the useless production. How should your modified table-construction algorithm handle an action associated with a useless production?

##### This page intentionally left blank

#### Chapter 4

