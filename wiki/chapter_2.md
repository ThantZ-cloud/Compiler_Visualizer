## Scanners

n **CHAPTER OVERVIEW** The scanner’s task is to transform a stream of characters into a stream of words in the input language. Each word must be classified into a syntactic category, or “part of speech.” The scanner is the only pass in the compiler to touch every character in the input program. Compiler writers place a pre- mium on speed in scanning, in part because the scanner’s input is larger, in some measure, than that of any other pass, and, in part, because highly efficient techniques are easy to understand and to implement.

This chapter introduces regular expressions, a notation used to describe the valid words in a programming language. It develops the formal mech- anisms to generate scanners from regular expressions, either manually or automatically.

**Keywords:** Scanner, Finite Automaton, Regular Expression, Fixed Point

2.1 **INTRODUCTION** Scanning is the first stage of a three-part process that the compiler uses to understand the input program. The scanner, or lexical analyzer, reads a stream of characters and produces a stream of words. It aggregates charac- ters to form words and applies a set of rules to determine whether or not each word is legal in the source language. If the word is valid, the scanner assigns it a syntactic category, or part of speech. The scanner is the only pass in the compiler that manipulates every charac- ter of the input program. Because scanners perform a relatively simple task, grouping characters together to form words and punctuation in the source language, they lend themselves to fast implementations. Automatic tools for scanner generation are common. These tools process a mathematical **Engineering a Compiler**. **DOI: 10.1016/B978-0-12-088478-0.00002-5** Copyright c 2012, Elsevier Inc. All rights reserved.

##### 26 CHAPTER 2 Scanners

description of the language’s lexical syntax and produce a fast recognizer. Alternatively, many compilers use hand-crafted scanners; because the task is simple, such scanners can be fast and robust.

##### Conceptual Roadmap

This chapter describes the mathematical tools and programming techniques that are commonly used to construct scanners—both generated scanners and hand-crafted scanners. The chapter begins, in Section 2.2, by introduc- **Recognizer** ing a model for *recognizers*, programs that identify words in a stream of a program that identifies specific words in a characters. Section 2.3 describes *regular expressions*, a formal notation for stream of characters specifying syntax. In Section 2.4, we show a set of constructions to convert a regular expression into a recognizer. Finally, in Section 2.5 we present three different ways to implement a scanner: a table-driven scanner, a direct-coded scanner, and a hand-coded approach.

Both generated and hand-crafted scanners rely on the same underlying tech- niques. While most textbooks and courses advocate the use of generated scanners, most commercial compilers and open-source compilers use hand- crafted scanners. A hand-crafted scanner can be faster than a generated scanner because the implementation can optimize away a portion of the over- head that cannot be avoided in a generated scanner. Because scanners are simple and they change infrequently, many compiler writers deem that the performance gain from a hand-crafted scanner outweighs the convenience of automated scanner generation. We will explore both alternatives.

##### Overview

A compiler’s scanner reads an input stream that consists of characters and produces an output stream that contains words, each labelled with its **Syntactic category** *syntactic category*—equivalent to a word’s part of speech in English. To a classification of words according to their accomplish this aggregation and classification, the scanner applies a set of grammatical usage rules that describe the lexical structure of the input programming language, **Microsyntax** sometimes called its *microsyntax*. The microsyntax of a programming lan- the lexical structure of a language guage specifies how to group characters into words and, conversely, how to separate words that run together. (In the context of scanning, we consider punctuation marks and other symbols as words.)

Western languages, such as English, have simple microsyntax. Adjacent alphabetic letters are grouped together, left to right, to form a word. A blank space terminates a word, as do most nonalphabetic symbols. (The word-building algorithm can treat a hyphen in the midst of a word as if it were an alphabetic character.) Once a group of characters has been aggregated together to form a potential word, the word-building algorithm can determine its validity with a dictionary lookup.

**2.2** *Recognizing Words* **27**
Most programming languages have equally simple microsyntax. Characters are aggregated into words. In most languages, blanks and punctuation marks terminate a word. For example, Algol and its descendants define an *identifier* as a single alphabetic character followed by zero or more alphanumeric char- acters. The identifier ends with the first nonalphanumeric character. Thus, fee and f1e are valid identifiers, but 12fum is not. Notice that the set of valid words is specified by rules rather than by enumeration in a dictionary.

In a typical programming language, some words, called *keywords* or *res-***Keyword** *erved words*, match the rule for an identifier but have special meanings. Both a word that is reserved for a particular syntactic while and static are keywords in both C and Java. Keywords (and punc-purpose and, thus, cannot be used as an identifier tuation marks) form their own syntactic categories. Even though static matches the rule for an identifier, the scanner in a C or Java compiler would undoubtedly classify it into a category that has only one element, the key- word static. To recognize keywords, the scanner can either use dictionary lookup or encode the keywords directly into its microsyntax rules.

The simple lexical structure of programming languages lends itself to effi- cient scanners. The compiler writer starts from a specification of the lan- guage’s microsyntax. She either encodes the microsyntax into a notation accepted by a scanner generator, which then constructs an executable scan- ner, or she uses that specification to build a hand-crafted scanner. Both generated and hand-crafted scanners can be implemented to require just **O**(1) time per character, so they run in time proportional to the number of characters in the input stream.

2.2 **RECOGNIZING WORDS** The simplest explanation of an algorithm to recognize words is often a character-by-character formulation. The structure of the code can provide some insight into the underlying problem. Consider the problem of recog- nizing the keyword new. Assuming the presence of a routine *NextChar* that returns the next character, the code might look like the fragment shown in
Figure 2.1. The code tests for n followed by e followed by w. At each step,
 failure to match the appropriate character causes the code to reject the string and “try something else.” If the sole purpose of the program was to recog- nize the word new, then it should print an error message or return failure. Because scanners rarely recognize only one word, we will leave this “error path” deliberately vague at this point. The code fragment performs one test per character. We can represent the code fragment using the simple transition diagram shown to the right of the code. The transition diagram represents a recognizer. Each circle represents an abstract state in the computation. Each state is labelled for convenience.

##### 28 CHAPTER 2 Scanners

*c NextChar();* *if (c* = ‘n’) ? *then begin;* *s*0

|c|NextChar();||0|
|---|---|---|---|
|if (c|= ‘e’)||n|
|then end;|begin; c NextChar(); if (c then else|= ‘w’) report success; try something else;|1 e 2 w|
|else end; else try something else;|try something else;||3|

*c NextChar();*

? *s*

? *s*

? *s*

n **FIGURE 2.1** Code Fragment to Recognize "new".

The initial state, or start state, is *s₀*. We will always label the start state as *si* *s₀*. State *s₃* is an accepting state; the recognizer reaches *s₃* only when the input is new. Accepting states are drawn with double circles, as shown in the margin. The arrows represent transitions from state to state based on the input character. If the recognizer starts in *s₀* and reads the characters n, e, and w, the transitions take us to *s₃*. What happens on any other input, such as n, o, and t? The n takes the recognizer to *s₁*. The o does not match the edge leaving *s₁*, so the input word is not new. In the code, cases that do not match new *try something else*. In the recognizer, we can think of this action as a transition to an error state. When we draw the transition diagram of a recognizer, we usually omit transitions to the error state. Each state has a transition to the error state on each unspecified input.

Using this same approach to build a recognizer for while would produce the following transition diagram:

while *s*0*s*1*s*2*s*3*s*4*s*5

If it starts in *s₀* and reaches *s₅*, it has identified the word while. The corresponding code fragment would involve five nested *if-then-else* constructs.

To recognize multiple words, we can create multiple edges that leave a given state. (In the code, we would begin to elaborate the *do something else* paths.)

**2.2** *Recognizing Words* **29**
One recognizer for both new and not might be

<u>w</u> *s₂*<u>-</u>*s₃* e3 <u>-</u>*s₀*<u>-n</u> *s₁* Q oQs<u>t</u> *s₄*<u>-</u>*s₅*

The recognizer uses a common test for n that takes it from *s₀* to *s₁*, n e denoted *s₀*! *s₁*. If the next character is e, it takes the transition *s₁*! *s₂*. o If, instead, the next character is o, it makes the move *s₁*! *s₄*. Finally, a w w t in *s₂*, causes the transition *s₂*! *s₃*, while a t in *s₄* produces *s₄*! *s₅*. State *s₃* indicates that the input was new while *s₅* indicates that it was not. The recognizer takes one transition per input character.

We can combine the recognizer for new or not with the one for while by merging their initial states and relabeling all the states.

<u>w</u> *s₂*<u>-</u>*s₃* e 3

|n|||
|---|---|---|
|w|o4|t5|

<u>-</u>*s₀*<u>-n</u> *s₁* Q J Qs *s*<u>-</u>*s* J J JJ^ h i l e *s₆*-*s₇*-*s₈*-*s₉*-*s₁₀*

State *s₀* has transitions for n and w. The recognizer has three accepting states, *s₃*, *s₅*, and *s₁₀*. If any state encounters an input character that does not match one of its transitions, the recognizer moves to an error state.

2.2.1 **A Formalism for Recognizers** Transition diagrams serve as abstractions of the code that would be required to implement them. They can also be viewed as formal mathematical obj-**Finite automaton** ects, called *finite automata*, that specify recognizers. Formally, a finite a formalism for recognizers that has a finite set of automaton (fa) is a five-tuple (*S*,*6*,, *s₀*, *SA*), where states, an alphabet, a transition function, a start
##### state, and one or more accepting states

n *S* is the finite set of states in the recognizer, along with an error state *se*. n *6* is the finite alphabet used by the recognizer. Typically,*6* is the union of the edge labels in the transition diagram.

##### 30 CHAPTER 2 Scanners

n*.s*,*c/* is the recognizer’s transition function. It maps each state *s* 2 *S*

|and each character c 2 6 into some next state. In state s||with input|
|---|---|---|
|character c, the fa takes the transition s s₀ 2 S is the designated start state.|! .s, c/.||
|S is the set of accepting states, S|S. Each state in S|appears as a|

*i* *c* *i i* n n*A A A* double circle in the transition diagram.

As an example, we can cast the fa for *new*or*not* or*while* in the formalism as follows:

##### S Dfs0,s1,s2,s3,s4,s5,s6,s7,s8,s9,s10,seg

*6* Dfe, h, i, l, n, o, t, wg ( n w e o w ) *s* 0! *s*1, *s*0! *s*6, *s*1! *s*2, *s*1! *s*4, *s*2! *s*3, D

||t|h|i|l|e|
|---|---|---|---|---|---|
||||||10|
|0 0||||||
|3|5 10|||||
||||i|||
|e|e|||||

*s* 4 !*s*5,*s*6 !*s*7,*s*7 !*s*8,*s*8 !*s*9,*s*9 !*s*

##### s D s

##### SA Dfs, s, s g

For all other combinations of state *s* and input character *c*, we define *.si*,*c/* D *s*, where *s* is the designated error state. This quintuple is equiv- alent to the transition diagram; given one, we can easily re-create the other. The transition diagram is a picture of the corresponding fa.

An fa accepts a string *x* if and only if, starting in *s₀*, the sequence of char- acters in the string takes the fa through a series of transitions that leaves it in an accepting state when the entire string has been consumed. This corresponds to our intuition for the transition diagram. For the string new, n e our example recognizer runs through the transitions *s₀*!*s₁*, *s₁*!*s₂*, and w *s₂*!*s₃*. Since *s₃* 2 *SA*, and no input remains, the fa accepts new. For the n input string nut, the behavior is different. On n, the fa takes *s₀*!*s₁*. On u, u it takes *s₁*! *se*. Once the fa enters *se*, it stays in *se*until it exhausts the input stream.

More formally, if the string *x* is composed of characters *x₁ x₂ x₃ ::: xn*, then the fa*.S*,*6*,,*s₀*, *SA/* accepts *x* if and only if

*..:::...s*0, *x*1*/*, *x*2*/*, *x*3*/:::*, *xn* 1*/*, *xn/* 2 *SA*.

Intuitively, this definition corresponds to a repeated application of to a pair composed of some state *s S* and an input symbol *xi*. The base case, (*s*, *x*), represents the fa’s initial transition, out of the start state, *s*, on the character *x*. The state produced by (*s*, *x*) is then used as input, along with *x*, to to produce the next state, and so on, until all the input has been

**2.2** *Recognizing Words* **31**
consumed. The result of the final application of is, again, a state. If that state is an accepting state, then the fa accepts *x*1*x*2*x*3... *xn*.

Two other cases are possible. The fa might encounter an error while processing the string—that is, some character *xj*might take it into the error state *se*. This condition indicates a lexical error; the string *x*1*x*2*x*3... *xj*is not a valid prefix for any word in the language accepted by the fa. The fa can also discover an error by exhausting its input and terminating in a nonaccepting state other than *se*. In this case, the input string is a proper pre- fix of some word accepted by the fa. Again, this indicates an error. Either kind of error should be reported to the end user.

In any case, notice that the fa takes one transition for each input character. Assuming that we can implement the fa efficiently, we should expect the recognizer to run in time proportional to the length of the input string.

2.2.2 **Recognizing More Complex Words** The character-by-character model shown in the original recognizer for not extends easily to handle arbitrary collections of fully specified words. How could we recognize a number with such a recognizer? A specific number, such as 113.4, is easy.

|13|1||‘.’|4||
|---|---|---|---|---|---|
|0|1|2|3|4|5|

*s s s s s s*

To be useful, however, we need a transition diagram (and the correspond- ing code fragment) that can recognize any number. For simplicity’s sake, let’s limit the discussion to unsigned integers. In general, an integer is either zero, or it is a series of one or more digits where the first digit is from one to nine, and the subsequent digits are from zero to nine. (This definition rules out leading zeros.) How would we draw a transition diagram for this definition?

0…9 0…9 0…9 0…9 …

|s|s|s|s|
|---|---|---|---|
|1…9 00|2 3|4|5|
||1|||
|0||||

2 3 4 5 1…9 *s*

*s*

The transition *s₀*!*s₁* handles the case for zero. The other path, from *s₀* to *s₂*, to *s₃*, and so on, handles the case for an integer greater than zero. This path, however, presents several problems. First, it does not end, violating the stipulation that *S* is finite. Second, all of the states on the path beginning with *s₂* are equivalent, that is, they have the same labels on their output transitions and they are all accepting states.

##### 32 CHAPTER 2 Scanners

|char|NextChar( );|||||
|---|---|---|---|---|---|
|state|s0;|||S Dfs0, s1, s2, seg||
|while (char|6D eof|and state|6D se) do|6 Df0, 1, 2, 3, 4, 5, 6, 7, 8, 9g||
|state|(state,char);|||8|9|
|char|NextChar( );|||> < s0 ! 0 s1,|s0 1-9 ! s2> =|
|end;||||D > :s2 ! s2, 0-9|s1 ! se; 0-9 >|
|if (state|2 SA)|||||
|then|report acceptance;|||SA Dfs1, s2g||
|else n FIGURE 2.2|report failure;|||||

##### A Recognizer for Unsigned Integers.

This fa recognizes a class of strings with a common property: they are all unsigned integers. It raises the distinction between the class of strings and the text of any particular string. The class “unsigned integer” is a syntactic **Lexeme** category, or part of speech. The text of a specific unsigned integer, such as the actual text for a word recognized by an FA 113, is its *lexeme*.

We can simplify the fa significantly if we allow the transition diagram to have cycles. We can replace the entire chain of states beginning at *s*2with a single transition from *s*2back to itself:

*s* 2 0…9 1…9 *s* 0 0 *s* 1

This cyclic transition diagram makes sense as an fa. From an implemen- tation perspective, however, it is more complex than the acyclic transition diagrams shown earlier. We cannot translate this directly into a set of nested *if-then-else* constructs. The introduction of a cycle in the transition graph creates the need for cyclic control flow. We can implement this with a *while* loop, as shown in Figure 2.2. We can specify efficiently using a table:

**0 1 2 3 4 5 6 7 8 9 Other**

|s|s|s|s|s|s|s|s|s|s|s|s|
|---|---|---|---|---|---|---|---|---|---|---|---|
|0|1|2|2|2|2|2|2|2|2|2|e|
|1|e|e|e|e|e|e|e|e|e|e|e|
|2|2|2|2|2|2|2|2|2|2|2|e|
|e|e|e|e|e|e|e|e|e|e|e|e|

***s** s s s s s s s s s s s* ***s** s s s s s s s s s s s* ***s** s s s s s s s s s s s*

Changing the table allows the same basic code skeleton to implement other recognizers. Notice that this table has ample opportunity for compression.

**2.2** *Recognizing Words* **33**
The columns for the digits 1 through 9 are identical, so they could be represented once. This leaves a table with three columns: 0, 1*:::* 9, and *other*. Close examination of the code skeleton shows that it reports failure as soon as it enters *se*, so it never references that row of the table. The implementa- tion can elide the entire row, leaving a table with just three rows and three columns.

We can develop similar fas for signed integers, real numbers, and complex numbers. A simplified version of the rule that governs identifier names ina…z, A…Z, Algol-like languages, such as C or Java, might be: *an identifier consists of* 0…9 *an alphabetic character followed by zero or more alphanumeric characters*. *s₀ s₁* a…z, This definition allows an infinite set of identifiers, but can be specified withA…Z the simple two-state fa shown to the left. Many programming languages extend the notion of “alphabetic character” to include designated special characters, such as the underscore.

fas can be viewed as specifications for a recognizer. However, they are not particularly concise specifications. To simplify scanner implementation, we need a concise notation for specifying the lexical structure of words, and a way of turning those specifications into an fa and into code that imple- ments the fa. The remaining sections of this chapter develop precisely those ideas.

##### SECTION REVIEW

A character-by-character approach to scanning leads to algorithmic clar- ity. We can represent character-by-character scanners with a transition diagram; that diagram, in turn, corresponds to a finite automaton. Small sets of words are easily encoded in acyclic transition diagrams. Infinite sets, such as the set of integers or the set of identifiers in an Algol-like language, require cyclic transition diagrams.

##### Review Questions

Construct an FA to accept each of the following languages:

**1.** A six-character identifier consisting of an alphabetic character fol- lowed by zero to five alphanumeric characters
**2.** A string of one or more pairs, where each pair consists of an open parenthesis followed by a close parenthesis
**3.** A Pascal comment, which consists of an open brace, f, followed by zero or more characters drawn from an alphabet,, followed by a close brace, g

##### 34 CHAPTER 2 Scanners

2.3 **REGULAR EXPRESSIONS** The set of words accepted by a finite automaton, *F*, forms a language, denoted *L.F /*. The transition diagram of the fa specifies, in precise detail, that language. It is not, however, a specification that humans find intuitive. For any fa, we can also describe its language using a notation called a *reg-* *ular expression* (re). The language described by an re is called a *regular* *language*. Regular expressions are equivalent to the fas described in the previous section. (We will prove this with a construction in Section 2.4.) Simple recognizers have simple re specifications. n The language consisting of the single word new can be described by an re written as *new*. Writing two characters next to each other implies that they are expected to appear in that order. n The language consisting of the two words new or while can be written as *new* or *while*. To avoid possible misinterpretation of *or*, we write this using the symbol j to mean *or*. Thus, we write the re as *new* j *while*. n The language consisting of new or not can be written as *new* j *not*. Other res are possible, such as *n(ew*j*ot)*. Both res specify the same pair of words. The re *n(ew*j*ot)* suggests the structure of the fa that we drew earlier for these two words.
*s₂*<u>-</u> <u>w</u> *s₃* e3 <u>-</u>*s₀*<u>-n</u> *s₁* Q oQs *s₄*<u>-</u> <u>t</u> *s₅*

To make this discussion concrete, consider some examples that occur in most programming languages. Punctuation marks, such as colons, semicolons, commas, and various brackets, can be represented by their character rep- resentations. Their res have the same “spelling” as the punctuation marks themselves. Thus, the following res might occur in the lexical specification for a programming language:

##### :;? D> () {} []

##### Similarly, keywords have simple res.

##### if while this integer instanceof

To model more complex constructs, such as integers or identifiers, we need a notation that can capture the essence of the cyclic edge in an fa.

**2.3** *Regular Expressions* **35**
The fa for an unsigned integer, shown at the left, has three states: an initial 0…9 state *s₀*, an accepting state *s₁* for the unique integer zero, and another accept- *s*2 1…9 ing state *s₂* for all other integers. The key to this fa’s power is the transition from *s₂* back to itself that occurs on each additional digit. State *s₂* folds the *s₀* 0 specification back on itself, creating a rule to derive a new unsigned integer *s*1 from an existing one: add another digit to the right end of the existing num- ber. Another way of stating this rule is: *an unsigned integer is either a zero,* *or a nonzero digit followed by zero or more digits.* To capture the essence of this fa, we need a notation for this notion of “zero or more occurrences” of an re. For the re *x*, we write this as *x*, with the meaning “zero or more occurrences of *x*.” We call the * operator *Kleene closure*, or *closure* for short. Using the closure operator, we can write an re for this fa:

*0* j*.1*j *2* j *3* j *4* j *5* j *6* j *7* j *8* j*9/* (*0* j *1* j *2* j *3* j *4* j *5* j *6* j *7* j *8* j *9*).

2.3.1 **Formalizing the Notation** To work with regular expressions in a rigorous way, we must define them more formally. An re describes a set of strings over the characters contained in some alphabet,*6*, augmented with a character that represents the empty string. We call the set of strings a *language*. For a given re, *r*, we denote the language that it specifies as *L.r/*. An re is built up from three basic operations:
**1.** *Alternation* The alternation, or union, of two sets of strings, *R* and *S*, denoted *R* j *S*, is f*x* j *x* 2 *R* or *x* 2 *S*g.
**2.** *Concatenation* The concatenation oftwo sets *R* and *S*, denoted *RS*, contains all strings formed by prepending an element of *R* onto one from *S*, or f*x y* j *x* 2 *R* and *y* 2 *S*g.
S1 *i*

**3.** *Closure* The Kleene closure of a set *R*, denoted *R*, is*i*D 0*R*. This is just the union of the concatenations of *R* with itself, zero or more times. For convenience, we sometimes use a notation for *finite closure*. The nota-**Finite closure** *i*For any integer*i*, the RE *Ri* designates one to*i* tion *R* denotes from one to *i* occurrences of *R*. A finite closure can be always be replaced with an enumeration of the possibilities; for example, occurrences of*R*. 3 C *R* is just (*R* j*R R*j*R R R*). The *positive closure*, denoted *R*, is just *R R* **Positive closure**
C denotes one or more occurrences of and consists of one or more occurrences of *R*. Since all these closures can The RE *R R*, S1 be rewritten with the three basic operations, we ignore them in the discussion often written as*i*D1*Ri*. that follows.

Using the three basic operations, alternation, concatenation, and Kleene closure, we can define the set of res over an alphabet as follows:

**1.** If *a*, then *a* is also an re denoting the set containing only *a*.
**2.** If *r* and *s* are res, denoting sets *L.r/* and *L*(*s*), respectively, then

##### 36 CHAPTER 2 Scanners

##### REGULAR EXPRESSIONS IN VIRTUAL LIFE

Regular expressions are used in many applications to specify patterns in character strings. Some of the early work on translating REs into code was done to provide a flexible way of specifying strings in the "find" command of a text editor. From that early genesis, the notation has crept into many different applications.

Unix and other operating systems use the asterisk as a wildcard to match substrings against file names. Here, is a shorthand for the RE *6*, speci- fying zero or more characters drawn from the entire alphabet of legal characters. (Since few keyboards have a *6* key, the shorthand has stayed with us.) Many systems use ? as a wildcard that matches a single character.

The grep family of tools, and their kin in non-Unix systems, implement regular expression pattern matching. (In fact, grep is an acronym for global regular-expression pattern match and print.)

Regular expressions have found widespread use because they are easily written and easily understood. They are one of the techniques of choice when a program must recognize a fixed vocabulary. They work well for languages that fit within their limited rules. They are easily translated into an executable form, and the resulting recognizer is fast.

*r* j *s* is an re denoting the union, or alternation, of *L.r/* and *L.s/*, *rs* is an re denoting the concatenation of *L.r/* and *L.s/*, respectively, and *r* is an re denoting the Kleene closure of *L.r /*.

**3.** is an re denoting the set containing only the empty string. To eliminate any ambiguity, parentheses have highest precedence, followed by closure, concatenation, and alternation, in that order. As a convenient shorthand, we will specify ranges of characters with the first and the last element connected by an ellipsis, “... ”. To make this abbreviation stand out, we surround it with a pair of square brackets. Thus, [*0... 9*] represents the set of decimal digits. It can always be rewritten as
*.0*j *1* j *2* j *3* j *4* j *5* j *6* j *7* j *8* j*9/*.
2.3.2 **Examples** The goal of this chapter is to show how we can use formal techniques to automate the construction of high-quality scanners and how we can encode the microsyntax of programming languages into that formalism. Before pro- ceeding further, some examples from real programming languages are in order.

**2.3** *Regular Expressions* **37**
**1.** The simplified rule given earlier for identifiers in Algol-like languages, an alphabetic character followed by zero or more alphanumeric characters, is just ([*A... Z*] j [*a... z*]) ([*A... Z*] j [*a... z*] j [*0... 9*]). Most languages also allow a few special characters, such as the underscore ( ), the percent sign (%), or the ampersand (&), in identifiers. If the language limits the maximum length of an identifier, we can use the appropriate finite closure. Thus, identifiers limited to six characters
5 might be specified as ([*A... Z*] j [*a... z*]) ([*A... Z*] j [*a... z*] j [*0... 9*]). If we had to write out the full expansion of the finite closure, the re would be much longer.

**2.** An unsigned integer can be described as either zero or a nonzero digit followed by zero or more digits. The re *0*j [*1... 9*] [*0... 9*] is more concise. In practice, many implementations admit a larger class of
C strings as integers, accepting the language [*0... 9*].

**3.** Unsigned real numbers are more complex than integers. One possible re might be (*0*j [*1... 9*] [*0... 9*])( j. [*0... 9*] ) The first part is just the re for an integer. The rest generates either the empty string or a decimal point followed by zero or more digits. Programming languages often extend real numbers to scientific notation, as in (*0*j [*1... 9*] [*0... 9*] ) ( j. [*0... 9*] ) *E* ( jCj) (*0*j [*1... 9*] [*0... 9*] */*. This re describes a real number, followed by an E, followed by an integer to specify the exponent.
**4.** Quoted character strings have their own complexity. In most languages, **Complement operator** any character can appear inside a string. While we can write an re for The notation ^*c*specifies the set f*6 c*g, strings using only the basic operators, it is our first example where a the complement of*c*with respect to*6*. complement operator simplifies the re. Using complement, a character Complement has higher precedence than string in c or Java can be described as “ (ˆ”) ”., j, or C. c and c++ do not allow a string to span multiple lines in the source code—that is, if the scanner reaches the end of a line while inside a **Escape sequence** string, it terminates the string and issues an error message. If we Two or more characters that the scanner represent newline with the escape sequence \n, in the c style, then the translates into another character. Escape
##### sequences are used for characters that lack a

re “ ( ˆ(” j \n) ) ” will recognize a correctly formed string and will take glyph, such as newline or tab, and for ones that an error transition on a string that includes a newline. occur in the syntax, such as an open or close

**5.** Comments appear in a number of forms. c++ and Java offer the
quote. programmer two ways of writing a comment. The delimiter // indicates a comment that runs to the end of the current input line. The re for this style of comment is straightforward: // (ˆ\n) \n, where \n represents the newline character. Multiline comments in c, c++, and Java begin with the delimiter /* and end with */. If we could disallow * in a comment, the re would be

##### 38 CHAPTER 2 Scanners

simple: /* (ˆ*)*/. With *, the re is more complex: /* ( ˆ* j *C ˆ/) */. An fa to implement this re follows.

||^*|*|
|---|---|---|
|//|**||
|0|1 2 ^(*|/)|3|

*s s s s s*4

The correspondence between the re and this fa is not as obvious as it was in the examples earlier in the chapter. Section 2.4 presents constructions that automate the construction of an fa from an re. The complexity of the re and fa for multiline comments arises from the use of multi-character delimiters. The transition from *s*2to *s*3encodes the fact that the recognizer has seen a * so that it can handle either the appearance of a / or the lack thereof in the correct manner. In contrast, Pascal uses single-character comment delimiters: f and g, so a Pascal comment is just f*ˆ*g g.

Trying to be specific with an re can also lead to complex expressions. Con- sider, for example, that the register specifier in a typical assembly language consists of the letter r followed immediately by a small integer. In iloc, which admits an unlimited set of register names, the re might be *r*[*0... 9*] C, with the following fa:

|||0…9|
|---|---|---|
|r|0…9||
|0|1|2|

*s s s*

This recognizer accepts r29, and rejects s29. It also accepts r99999, even though no currently available computer has 100,000 registers.

On a real computer, however, the set of register names is severely limited— say, to 32, 64, 128, or 256 registers. One way for a scanner to check validity of a register name is to convert the digits into a number and test whether or not it falls into the range of valid register numbers. The alternative is to adopt a more precise re specification, such as:

*r*( [*0... 2*] ([*0... 9*] j) j [*4... 9*] j (*3* (*0* j *1* j)) )

This re specifies a much smaller language, limited to register numbers 0 to 31 with an optional leading 0 on single-digit register names. It accepts

**2.3** *Regular Expressions* **39**
r0, r00, r01, and r31, but rejects r001, r32, and r99999. The corresponding fa looks like:

||0…9||
|---|---|---|
||2|3|
|0…2|||
|r|3 0,1||
|0 1|5|6|
|4…9|||
||4||

*s s*

*s s s s*

*s*

Which fa is better? They both make a single transition on each input charac- ter. Thus, they have the same cost, even though the second fa checks a more complex specification. The more complex fa has more states and transitions, so its representation requires more space. However, their operating costs are the same.

This point is critical: the cost of operating an fa is proportional to the length of the input, not to the length or complexity of the re that generates the fa. More complex res may produce fas with more states that, in turn, need more space. The cost of generating an fa from an re may also rise with increased complexity in the re. But, the cost of fa operation remains one transition per input character.

Can we improve our description of the register specifier? The previous re is both complex and counterintuitive. A simpler alternative might be:

*r0*j*r00*j*r1*j*r01*j*r2*j*r02*j*r3*j*r03*j*r4*j*r04*j*r5*j*r05*j*r6*j*r06*j*r7*j*r07*j *r8*j*r08*j*r9*j*r09*j*r10*j*r11*j*r12*j*r13*j*r14*j*r15*j*r16*j*r17*j*r18*j*r19*j*r20*j *r21*j*r22*j*r23*j *r24*j*r25*j*r26*j*r27*j*r28*j*r29*j*r30*j*r31*

This re is conceptually simpler, but much longer than the previous version. The resulting fa still requires one transition per input symbol. Thus, if we can control the growth in the number of states, we might prefer this ver- sion of the re because it is clear and obvious. However, when our processor suddenly has 256 or 384 registers, enumeration may become tedious, too.

2.3.3 **Closure Properties of REs** Regular expressions and the languages that they generate have been the sub-**Regular languages** ject of extensive study. They have many interesting and useful properties. Any language that can be specified by a regular Some of these properties play a critical role in the constructions that build expression is called a*regular language*. recognizers from res.

##### 40 CHAPTER 2 Scanners

##### PROGRAMMING LANGUAGES VERSUS NATURAL LANGUAGES

Lexical analysis highlights one of the subtle ways in which programming languages differ from natural languages, such as English or Chinese. In natural languages, the relationship between a word’s representation—its spelling or its pictogram—and its meaning is not obvious. In English, *are* is a verb while*art*is a noun, even though they differ only in the final character. Furthermore, not all combinations of characters are legitimate words. For example, *arz* differs minimally from *are* and *art*, but does not occur as a word in normal English usage.

A scanner for English could use FA-based techniques to recognize potential words, since all English words are drawn from a restricted alphabet. After that, however, it must look up the prospective word in a dictionary to determine if it is, in fact, a word. If the word has a unique part of speech, dictionary lookup will also resolve that issue. However, many English words can be classified with several parts of speech. Examples include *buoy* and *stress*; both can be either a noun or a verb. For these words, the part of speech depends on the surrounding context. In some cases, understanding the grammatical context suffices to classify the word. In other cases, it requires an understanding of meaning, for both the word and its context.

In contrast, the words in a programming language are almost always specified lexically. Thus, any string in [*1... 9*][*0... 9*] is a positive integer. The RE [*a... z*]([*a... z*]j[*0... 9*]) defines a subset of the Algol identifiers; *arz*, *are* and *art* are all identifiers, with no lookup needed to establish the fact. To be sure, some identifiers may be reserved as keywords. However, these exceptions can be specified lexically, as well. No context is required.

This property results from a deliberate decision in programming lan- guage design. The choice to make spelling imply a unique part of speech simplifies scanning, simplifies parsing, and, apparently, gives up little in the expressiveness of the language. Some languages have allowed words with dual parts of speech—for example, PL/I has no reserved keywords. The fact that more recent languages abandoned the idea suggests that the complications outweighed the extra linguistic flexibility.

Regular expressions are closed under many operations—that is, if we apply the operation to an re or a collection of res, the result is an re. Obvious examples are concatenation, union, and closure. The concatenation of two res *x* and *y* is just *xy*. Their union is *x* j *y*. The Kleene closure of *x* is just *x*. From the definition of an re, all of these expressions are also res. These closure properties play a critical role in the use of res to build scan- ners. Assume that we have an re for each syntactic category in the source language, *a*, *a*, *a*,..., *an*. Then, to construct an re for all the valid words in the language, we can join them with alternation as *a* j *a* j *a* j... j*an*. Since res are closed under union, the result is an re. Anything that we can

**2.3** *Regular Expressions* **41**
do to an re for a single syntactic category will be equally applicable to the re for all the valid words in the language.

Closure under union implies that any finite language is a regular language. We can construct an re for any finite collection of words by listing them in a large alternation. Because the set of res is closed under union, that alternation is an re and the corresponding language is regular.

Closure under concatenation allows us to build complex res from sim- pler ones by concatenating them. This property seems both obvious and unimportant. However, it lets us piece together res in systematic ways. Clo- sure ensures that *ab* is an re as long as both *a* and *b* are res. Thus, any techniques that can be applied to either *a* or *b* can be applied to *ab*; this includes constructions that automatically generate a recognizer from res.

Regular expressions are also closed under both Kleene closure and the finite closures. This property lets us specify particular kinds of large, or even infinite, sets with finite patterns. Kleene closure lets us specify infinite sets with concise finite patterns; examples include the integers and unbounded- length identifiers. Finite closures let us specify large but finite sets with equal ease.

The next section shows a sequence of constructions that build an fa to rec- ognize the language specified by an re. Section 2.6 shows an algorithm that goes the other way, from an fa to an re. Together, these constructions establish the equivalence of res and fas. The fact that res are closed under alternation, concatenation, and closure is critical to these constructions.

The equivalence between res and fas also suggests other closure properties. For example, given a complete fa, we can construct an fa that recognizes all **Complete FA** words *w* that are not in *L.*fa*/*, called the complement of *L.*fa*/*. To build this an FA that explicitly includes all error transitions new fa for the complement, we can swap the designation of accepting and nonaccepting states in the original fa. This result suggests that res are closed under complement. Indeed, many systems that use res include a complement operator, such as the ˆ operator in lex.

##### SECTION REVIEW

Regular expressions are a concise and powerful notation for specifying the microsyntax of programming languages. REs build on three basic operations over finite alphabets: alternation, concatenation, and Kleene closure. Other convenient operators, such as finite closures, positive closure, and complement, derive from the three basic operations. Regular expressions and finite automata are related; any RE can be realized in an FA and the language accepted by any FA can be described with RE. The next section formalizes that relationship.

##### 42 CHAPTER 2 Scanners

##### Review Questions

**1.** Recall the RE for a six-character identifier, written using a finite closure.
([*A... Z*] j [*a... z*]) ([*A... Z*] j [*a... z*] j [*0... 9*])5 Rewrite it in terms of the three basic RE operations: alternation, concatenation, and closure.

**2.** In PL/I, the programmer can insert a quotation mark into a string by writing two quotation marks in a row. Thus, the string The quotation mark, ", should be typeset in italics
##### would be written in a PL/I program as

"The quotation mark, "", should be typeset in italics."

Design an RE and an FA to recognize PL/I strings. Assume that strings begin and end with quotation marks and contain only symbols drawn from an alphabet, designated as *6*. Quotation marks are the only special case.

2.4 **FROM REGULAR EXPRESSION TO SCANNER** The goal of our work with finite automata is to automate the derivation of executable scanners from a collection of res. This section develops the constructions that transform an re into an fa that is suitable for direct imple- mentation and an algorithm that derives an re for the language accepted by an fa. Figure 2.3 shows the relationship between all of these constructions. To present these constructions, we must distinguish between *deterministic* fas, or dfas, and *nondeterministic* fas, or nfas, in Section 2.4.1. Next,
Kleene’s Construction

Code for a scanner RE DFA Minimization DFA

Thompson’s Subset Construction Construction NFA

n **FIGURE 2.3** The Cycle of Constructions.

**2.4** *From Regular Expression to Scanner* **43**
we present the construction of a deterministic fa from an re in three steps. Thompson’s construction, in Section 2.4.2, derives an nfa from an re. The subset construction, in Section 2.4.3, builds a dfa that simulates an nfa. Hopcroft’s algorithm, in Section 2.4.4, minimizes a dfa. To establish the equivalence of res and dfas, we also need to show that any dfa is equiv- alent to an re; Kleene’s construction derives an re from a dfa. Because it does not figure directly into scanner construction, we defer that algorithm until Section 2.6.1.

2.4.1 **Nondeterministic Finite Automata** Recall from the definition of an re that we designated the empty string,, as an re. None of the fas that we built by hand included, but some of the res did. What role does play in an fa? We can use transitions on to combine fas and form fas for more complex res. For example, assume that we have fas for the res *m* and *n*, called fa

||and fa|, respectively.||
|---|---|---|---|
||m|n||
|m||n||
|0|1|0|1|

*s s s s*

We can build an fa for *mn* by adding a transition on from the accepting**-transition** state of fa*m*to the initial state of fa*n*, renumbering the states, and using fa*n*’s a transition on the empty string,, that does accepting state as the accepting state for the new fa. not advance the input

|m||n||
|---|---|---|---|
|0|1|2|3|

*s s s s*

With an-transition, the definition of acceptance must change slightly to allow one or more-transitions between any two characters in the input string. For example, in *s₁*, the fa takes the transition *s₁*!*s₂* without con- suming any input character. This is a minor change, but it seems intuitive. Inspection shows that we can combine *s₁* and *s₂* to eliminate the-transition.

m n *s*0*s*1*s*2

Merging two fas with an-transition can complicate our model of how fas work. Consider the fas for the languages *a* and *ab*.

a

||a|b||
|---|---|---|---|
|0|0|1|2|

a b *s s s s*

##### 44 CHAPTER 2 Scanners

We can combine them with an-transition to form an fa for *a ab*.

a ab

||ab||
|---|---|---|
|0|1|2|

*s s s s*3

The transition, in effect, gives the fa two distinct transitions out of *s₀* a on the letter a. It can take the transition *s₀*!*s₀*, or the two transitions a *s₀*!*s₁* and *s₁*!*s₂*. Which transition is correct? Consider the strings aab a

|||a|
|---|---|---|
|a|b|a|
|b|||

and ab. The dfa should accept both strings. For aab, it should move *s₀*!*s₀*, *s₀*!*s₁*, *s₁*!*s₂*, and *s₂*!*s₃*. For ab, it should move *s₀*!*s₁*, *s₁*!*s₂*, and *s₂*!*s₃*.

**Nondeterministic FA** As these two strings show, the correct transition out of *s₀* on a depends on an FA that allows transitions on the empty string, the characters that follow the a. At each step, an fa examines the current, and states that have multiple transitions on character. Its state encodes the left context, that is, the characters that it has the same character already processed. Because the fa must make a transition before examining the next character, a state such as *s₀* violates our notion of the behavior of a sequential algorithm. An fa that includes states such as *s₀* that have multiple transitions on a single character is called a *nondeterministic finite automaton* **Deterministic FA** (nfa). By contrast, an fa with unique character transitions in each state is A DFA is an FA where the transition function is called a *deterministic finite automaton* (dfa). single-valued. DFAs do not allow-transitions. To make sense of an nfa, we need a set of rules that describe its behavior. Historically, two distinct models have been given for the behavior of an nfa.

**1.** Each time the nfa must make a nondeterministic choice, it follows the transition that leads to an accepting state for the input string, if such a transition exists. This model, using an omniscient nfa, is appealing because it maintains (on the surface) the well-defined accepting mechanism of the DFA. In essence, the nfa guesses the correct transition at each point.
**2.** Each time the nfa must make a nondeterministic choice, the nfa clones itself to pursue each possible transition. Thus, for a given input character, the nfa is in a specific set of states, taken across all of its clones. In this model, the nfa pursues all paths concurrently. At any point, we call the specific set of states in which the nfa is active
**Configuration of an NFA** its *configuration*. When the nfa reaches a configuration in which it has the set of concurrently active states of an NFA exhausted the input and one or more of the clones has reached an accepting state, the nfa accepts the string.

In either model, the nfa*.S*,,,*s₀*, *SA/* accepts an input string *x₁ x₂ x₃ ::: xk* if and only if there exists at least one path through the transition diagram that starts in *s₀* and ends in some *skSA*such that the edge labels along the path

**2.4** *From Regular Expression to Scanner* **45**
match the input string. (Edges labelled with are omitted.) In other words, *th* the *i* edge label must be *xi*. This definition is consistent with either model of the nfa’s behavior.

##### Equivalence of NFAs and DFAs

nfas and dfas are equivalent in their expressive power. Any dfa is a special case of an nfa. Thus, an nfa is at least as powerful as a dfa. Any nfa can be simulated by a dfa—a fact established by the subset construction in Section 2.4.3. The intuition behind this idea is simple; the construction is a little more complex.

Consider the state of an nfa when it has reached some point in the input string. Under the second model of nfa behavior, the nfa has some finite set of operating clones. The number of these configurations can be bounded; for each state, the configuration either includes one or more clones in that *n* state or it does not. Thus, an nfa with *n* states produces at most j*6*j configurations.

To simulate the behavior of the nfa, we need a dfa with a state for each configuration of the nfa. As a result, the dfa may have exponentially more states than the nfa. While *SDFA*, the set of states in the dfa, might be large, **Powerset of *N*** *N* it is finite. Furthermore, the dfa still makes one transition per input symbol. the set of all subsets of*N*, denoted 2 Thus, the dfa that simulates the nfa still runs in time proportional to the length of the input string. The simulation of an nfa on a dfa has a potential space problem, but not a time problem.

Since nfas and dfas are equivalent, we can construct a dfa for *a ab*:

||a||
|---|---|---|
|a|b||
|0|1|2|

*s s s*

It relies on the observation that *a ab* specifies the same set of words as *aa b*.

2.4.2 **Regular Expression to NFA:** **Thompson’s Construction** The first step in moving from an re to an implemented scanner must derive an nfa from the re. *Thompson’s construction* accomplishes this goal in a straightforward way. It has a template for building the nfa that corresponds to a single-letter re, and a transformation on nfas that models the effect of each basic re operator: concatenation, alternation, and closure. Figure 2.4

##### 46 CHAPTER 2 Scanners

*s* *i* a *s* *jsk* b *s* *l*

(a) NFA for “*a*” (b) NFA for “*b*”
*s* *i* a *s* *j* *s* *i* a *s* *jsk* b *s* *lsmsn* *s* *k* b *s* *l*

(c) NFA for “*ab*” (d) NFA for “*a* | *b*” *s*
*psi* a *s* *jsq*

(e) NFA for “*a**”
n **FIGURE 2.4** Trivial NFAs for Regular Expression Operators.

shows the trivial nfas for the res *a* and *b*, as well as the transformations to form nfas for the res *ab*, *a*j*b*, and *a* from the nfas for *a* and *b*. The transformations apply to arbitrary nfas.

The construction begins by building trivial nfas for each character in the input re. Next, it applies the transformations for alternation, concatena- tion, and closure to the collection of trivial nfas in the order dictated by precedence and parentheses. For the re *a*(*b*j*c*), the construction would first build nfas for *a*, *b*, and *c*. Because parentheses have highest precedence, it next builds the nfa for the expression enclosed in parentheses, *b*j*c*. Clo- sure has higher precedence than concatenation, so it next builds the closure, (*b*j*c*). Finally, it concatenates the nfa for *a* to the nfa for (*b*j*c*).

The nfas derived from Thompson’s construction have several specific prop- erties that simplify an implementation. Each nfa has one start state and one accepting state. No transition, other than the initial transition, enters the start state. No transition leaves the accepting state. An-transition always connects two states that were, earlier in the process, the start state and the accepting state of nfas for some component res. Finally, each state has at most two entering and two exiting-moves, and at most one entering and one exiting move on a symbol in the alphabet. Together, these properties simplify the representation and manipulation of the nfas. For example, the construction only needs to deal with a single accepting state, rather than iterating over a set of accepting states in the nfa.

**2.4** *From Regular Expression to Scanner* **47**

|a||b||c||
|---|---|---|---|---|---|
|0|1|2|3|4|5|

*s s s s s s*

(a) NFAs for “*a*”, “*b*”, and “*c*”
b *s*2*s*3

*s*6*s*7 c *s*4*s*5

(b) NFA for “*b* | *c*” b *s*2*s*3
*s*8*s*6*s*7*s*9 c *s*4*s*5

(c) NFA for “(*b* | *c*) ”
b *s*2*s*3

a *s*0*s*1*s*8*s*6*s*7*s*9 c *s*4*s*5

(d) NFA for “*a*(*b* | *c*) ”
n **FIGURE 2.5** Applying Thompson’s Construction to*a*(*b*j*c*).

b,c

Figure 2.5 shows the nfa that Thompson’s construction builds for *a*(*b*j*c*).

It has many more states than the dfa that a human would likely produce, a *s*0*s*1 shown at left. The nfa also contains many-moves that are obviously unneeded. Later stages in the construction will eliminate them.

2.4.3 **NFA to DFA: The Subset Construction** Thompson’s construction produces an nfa to recognize the language spec- ified by an re. Because dfa execution is much easier to simulate than nfa execution, the next step in the cycle of constructions converts the nfa built

##### 48 CHAPTER 2 Scanners

##### REPRESENTING THE PRECEDENCE OF OPERATORS

Thompson’s construction must apply its three transformations in an order that is consistent with the precedence of the operators in the regular expression. To represent that order, an implementation of Thompson’s construction can build a tree that represents the regular expression and its internal precedence. The RE *a*(*b*j*c*) produces the following *tree*:

+

*a* *

|

*b c*

where + represents concatenation, j represents alternation, and * repre- sents closure. The parentheses are folded into the structure of the tree and, thus, have no explicit representation.

The construction applies the individual transformations in a postorder walk over the tree. Since transformations correspond to operations, the pos- torder walk builds the following sequence of NFAs: *a*, *b*, *c*, *b*j*c*, (*b*j*c*), and, finally, *a*(*b*j*c*). Chapters 3 and 4 show how to build expression trees.

by Thompson’s construction into a dfa that recognizes the same language. The resulting dfas have a simple execution model and several efficient implementations. The algorithm that constructs a dfa from an nfa is called the *subset construction*.

The subset construction takes as input an nfa,*.N*,*6*,*N*,*n₀*, *NA/*. It produces a dfa,*.D*,*6*,*D*,*d₀*, *DA/*. The nfa and the dfa use the same alphabet, *6*. The dfa’s start state, *d*0, and its accepting states, *DA*, will emerge from the construction. The complex part of the construction is the derivation of the set of dfa states *D* from the nfa states *N*, and the derivation of the dfa transition function*D*.

The algorithm, shown in Figure 2.6, constructs a set *Q* whose elements, *qi* *N* **Valid configuration** are each a subset of *N*, that is, each *qi*2 2. When the algorithm halts, each configuration of an NFA that can be *qi*2 *Q* corresponds to a state, *di*2 *D*, in the dfa. The construction builds the reached by some input string elements of *Q* by following the transitions that the nfa can make on a given input. Thus, each *qi*represents a valid configuration of the nfa.

The algorithm begins with an initial set, *q*, that contains *n* and any states in the nfa that can be reached from *n* along paths that contain only

**2.4** *From Regular Expression to Scanner* **49**
*q* 0*-closure(*f*n*0g*);* *Q q*0*;* *WorkList* f*q*0g*;*

|WorkList|fq0g;|||
|---|---|---|---|
|while (WorkList 6D; )||do||
|remove|q from|WorkList;||
|for each|character|c 2 6|do|
|t|-closure(Delta(q, c));|||
|T[q, c]|t;|||
|if end; end;|t 2 = Q then add t to|Q and|to WorkList;|

n **FIGURE 2.6** The Subset Construction.

-transitions. Those states are equivalent since they can be reached without consuming input.

To construct *q*0from *n*0, the algorithm computes-*closure(n₀)*. It takes, as input, a set *S* of nfa states. It returns a set of nfa states constructed from *S* as follows:-*closure* examines each state *si*2 *S* and adds to *S* any state reachable by following one or more-transitions from *si*. If *S* is the set of states reachable from *n*0by following paths labelled with abc, then -*closure(S)* is the set of states reachable from *n*0by following paths labelled abc. Initially, *Q* has only one member, *q*0and the *WorkList* contains *q*0.

The algorithm proceeds by removing a set *q* from the worklist. Each *q* rep- resents a valid configuration of the original nfa. The algorithm constructs, for each character *c* in the alphabet *6*, the configuration that the nfa would reach if it read *c* while in configuration *q*. This computation uses a function *Delta(q*,*c)* that applies the nfa’s transition function to each element of *q*. It returns [*s*2*q* *iN* *.s,c/*.

The while loop repeatedly removes a configuration *q* from the worklist and uses *Delta* to compute its potential transitions. It augments this computed configuration with any states reachable by following-transitions, and adds any new configurations generated in this way to both *Q* and the worklist. When it discovers a new configuration *t* reachable from *q*on character *c*, the algorithm records that transition in the table *T*. The inner loop, which iterates over the alphabet for each configuration, performs an exhaustive search.

Notice that *Q* grows monotonically. The while loop adds sets to *Q* but never removes them. Since the number of configurations of the nfa is bounded and

##### 50 CHAPTER 2 Scanners

each configuration only appears once on the worklist, the while loop must halt. When it halts, *Q* contains all of the valid configurations of the nfa and *T* holds all of the transitions between them.

*Q* can become large—as large as j2 *N* j distinct states. The amount of nonde- terminism found in the nfa determines how much state expansion occurs. Recall, however, that the result is a dfa that makes exactly one transition per input character, independent of the number of states in the dfa. Thus, any expansion introduced by the subset construction does not affect the running time of the dfa.

##### From Q to D

When the subset construction halts, it has constructed a model of the desired dfa, one that simulates the original nfa. Building the dfa from *Q* and *T* is

|straightforward. Each q|2 Q needs a state d|2 D to represent it. If q|
|---|---|---|
|tains an accepting state of the nfa, then d||is an accepting state of the dfa.|
|We can construct the transition function, the mapping from q|to d. Finally, the state constructed from q₀ becomes|, directly from T by observing|

*i i i*con- *i* *D* *i i* *d₀*, the initial state of the dfa.

##### Example

Consider the nfa built for *a*(*b*j*c*) in Section 2.4.2 and shown in Figure 2.7a, with its states renumbered. The table in Figure 2.7b sketches the steps that the subset construction follows. The first column shows the name of the set in *Q* being processed in a given iteration of the while loop. The second column shows the name of the corresponding state in the new dfa. The third column shows the set of nfa states contained in the current set from *Q*. The final three columns show results of computing the-*closure* of *Delta* on the state for each character in *6*.

##### The algorithm takes the following steps:

**1.** The initialization sets *q*

|to -closure(fn||g), which is just n|. The first|
|---|---|---|---|
|0|0||0|
||0|||
||0||0|
|||1||
||2 3|||
|||2||
||2|3||
|||3||
|2|3|||
 iteration computes-*closure(Delta(q*,a*))*, which contains six nfa states, and-*closure(Delta(q*,b*))* and-*closure(Delta(q*,c*))*, which are empty.
**2.** The second iteration of the while loop examines *q*. It produces two configurations and names them *q* and *q*.
**3.** The third iteration of the while loop examines *q*. It constructs two configurations, which are identical to *q* and *q*.
**4.** The fourth iteration of the while loop examines *q*. Like the third iteration, it reconstructs *q* and *q*.
Figure 2.7c shows the resulting dfa; the states correspond to the dfa states
 from the table and the transitions are given by the *Delta* operations that

**2.4** *From Regular Expression to Scanner* **51**
b *n*4*n*5

a

|n|n|n n||
|---|---|---|---|
|0|1|2 3||
||||c|
||||6 7|
|||*||

0 1 2 3*n*8*n*9

*n n*

(a) NFA for “*a*(*b* | *c*) ” (With States Renumbered)

|Set|DFA|NFA||-closure(Delta(q,*))||
|---|---|---|---|---|---|
|Name|States|States|a|b|c|

*n*1, *n*2, *n*3,

|q|d|n||– none –|– none –|
|---|---|---|---|---|---|
|0|0|0|4 6 9|||
|||1 2 3||5 8 9|7 8 9|
|1|1|4 6 9||3 4 6|3 4 6|
|||5 8 9||||
|2|2|3 4 6||2|3|
|||7 8 9||||
|3|3|3 4 6||2|3|

0 0 0 *n*4, *n*6, *n*9 *n*, *n*, *n*, *n*, *n*, *n*, *n*, *n*, *n*, *q d – none –* *n*, *n*, *n n*, *n*, *n n*, *n*, *n* *n*, *n*, *n*, *q d – none – q q* *n*, *n*, *n* *n*, *n*, *n*, *q d – none – q q* *n*, *n*, *n*

(b) Iterations of the Subset Construction
*d*

||b2|b|
|---|---|---|
|0a|1c b c3|c|

*d d*

*d*

(a) Resulting DFA
n **FIGURE 2.7** Applying the Subset Construction to the NFA from Figure 2.5.

generate those states. Since the sets *q*1, *q*2and *q*3all contain *n*9(the accepting state of the nfa), all three become accepting states in the dfa.

##### Fixed-Point Computations

The subset construction is an example of a *fixed-point computation*, a par- ticular style of computation that arises regularly in computer science. These

##### 52 CHAPTER 2 Scanners

##### Monotone function

computations are characterized by the iterated application of a monotone a function*f* on domain*D*is*monotone*if, function to some collection of sets drawn from a domain whose structure is 8 *x*, *y*2 *D*, *x y*)*f* (*x*) *f* (*y*) known. These computations terminate when they reach a state where further iteration produces the same answer—a “fixed point” in the space of succes- sive iterates. Fixed-point computations play an important and recurring role in compiler construction.

Termination arguments for fixed-point algorithms usually depend on known 2 *N* properties of the domain. For the subset construction, the domain *D* is 2, since *Q* Df*q*0, *q*1, *q*2,..., *qk*g where each *qi*2 2 *N*. Since *N* is finite, 2 *N* and 2 *N* 2 are also finite. The while loop adds elements to *Q*; it cannot remove an element from *Q*. We can view the while loop as a monotone increasing function *f*, which means that for a set *x*, *f* (*x*) *x*. (The comparison operator is.) Since *Q* can have at most j2 *N* j distinct elements, the while loop can iterate at most j2 *N* j times. It may, of course, reach a fixed point and halt more quickly than that.

##### Computing-closure Offline

An implementation of the subset construction could compute-*closure()* by following paths in the transition graph of the nfa as needed. Figure 2.8 shows another approach: an offline algorithm that computes-*closure(*f*n*g*)* for each state *n* in the transition graph. The algorithm is another example of a fixed-point computation.

For the purposes of this algorithm, consider the transition diagram of the nfa as a graph, with nodes and edges. The algorithm begins by creating a set *E* for each node in the graph. For a node *n*, *E.n/* will hold the current

|for each|state n 2 N|do|
|---|---|---|
|E(n) end;|fng;||
|WorkList|N;||
|while (WorkList 6D;)||do|
|remove|n from S WorkList;||
|t fng [ if t 6D E(n) then|n!p 2 begin; E(n) t;|E( p);|
|end; end;|WorkList|WorkList|

*N*

[ f*m* j *m*!*n* 2 *N*g*;*

n **FIGURE 2.8** An Offline Algorithm for-closure.

**2.4** *From Regular Expression to Scanner* **53**
approximation to-*closure(n)*. Initially, the algorithm sets *E.n/* to f*n*g, for each node *n*, and places each node on the worklist.

Each iteration of the while loop removes a node *n* from the worklist, finds Using a bit-vector set for the worklist can ensure all of the-transitions that leave *n*, and adds their targets to *E.n/*. If that that the algorithm does not have duplicate computation changes *E.n/*, it places *n*’s predecessors along-transitions on copies of a node’s name on the worklist. the worklist. (If *n* is in the-closure of its predecessor, adding nodes to *E.n/* See Appendix B.2. must also add them to the predecessor’s set.) This process halts when the worklist becomes empty.

The termination argument for this algorithm is more complex than that for the algorithm in Figure 2.6. The algorithm halts when the worklist is empty. Initially, the worklist contains every node in the graph. Each iteration removes a node from the worklist; it may also add one or more nodes to the worklist.

The algorithm only adds a node to the worklist if the *E* set of its successor changes. The *E.n/* sets increase monotonically. For a node *x*, its successor *y* along an-transition can place *x* on the worklist at most j*E. y/*jj*N*j times, in the worst case. If *x* has multiple successors *yi*along-transitions, each of them can place *x* on the worklist j*E. yi/*jj*N*j times. Taken over the entire graph, the worst case behavior would place nodes on the worklist *k* j*N* j times, where *k* is the number of-transitions in the graph. Thus, the worklist eventually becomes empty and the computation halts.

2.4.4 **DFA to Minimal DFA: Hopcroft’s Algorithm** As a final refinement to the re!dfa conversion, we can add an algorithm to minimize the number of states in the dfa. The dfa that emerges from the subset construction can have a large set of states. While this does not increase the time needed to scan a string, it does increase the size of the recognizer in memory. On modern computers, the speed of memory accesses often governs the speed of computation. A smaller recognizer may fit better into the processor’s cache memory. To minimize the number of states in a dfa,*.D*,*6*,,*d₀*, *DA/*, we need a technique to detect when two states are equivalent—that is, when they pro- duce the same behavior on any input string. The algorithm in Figure 2.9 finds equivalence classes of dfa states based on their behavior. From those equivalence classes, we can construct a minimal dfa. The algorithm constructs a set partition, *P* Df*p₁*,*p₂*,*p₃*,*::: pm*g, of the dfa **Set partition** states. The particular partition, *P*, that it constructs groups together dfa A*set partition*of*S*is a collection of states by their behavior. Two dfa states,*d*, *d p*, have the same behavior in nonempty, disjoint subsets of*S*whose

|i j s|||
|---|---|---|
|c|c||
|i x|j y|i j s|

##### union is exactlyS.

response to all input characters. That is, if *d*! *d*, *d*! *d*, and *d*, *d p*,

##### 54 CHAPTER 2 Scanners

*T* f*DA*, f *D DA*g g*; Split(S)* f *P*; *for each c* 2*6 do* *while (P* 6D *T) do if c splits S into s*1 *and s*2 *P T; then return* f*s*1,*s*2 g*;* *T*;*; end;* *for each set p* 2 *P do return S;* *T T* [ *Split(p);* g *end;* *end;*

n **FIGURE 2.9** DFA Minimization Algorithm.

then *dx*and *dy*must be in the same set *pt*. This property holds for every set *ps*2 *P*, for every pair of states *di*, *dj*2 *ps*, and for every input character, *c*. Thus, the states in *ps*have the same behavior with respect to input characters and the remaining sets in *P*.

To minimize a dfa, each set *ps*2 *P* should be as large as possible, within the constraint of behavioral equivalence. To construct such a partition, the algorithm begins with an initial rough partition that obeys all the proper- ties *except* behavioral equivalence. It then iteratively refines that partition to enforce behavioral equivalence. The initial partition contains two sets, *p₀* D *DA*and *p₁* Df*D DA*g. This separation ensures that no set in the final partition contains both accepting and nonaccepting states, since the algorithm never combines two partitions.

The algorithm refines the initial partition by repeatedly examining each *p* *s*2 *P* to look for states in *ps*that have different behavior for some input string. Clearly, it cannot trace the behavior of the dfa on every string. It can, however, simulate the behavior of a given state in response to a single input character. It uses a simple condition for refining the partition: a symbol *c* 2*6* must produce the same behavior for every state *di*2 *ps*. If it does not, the algorithm splits *ps*around *c*.

This splitting action is the key to understanding the algorithm. For *di*and *d* *j*to remain together in *ps*, they must take equivalent transitions on each *c c*

|character c 2 6. That is, 8 c 2 6, d|||! d and d|! d, where d|, d 2 p|. Any|
|---|---|---|---|---|---|---|
||||i x|j y|x y|t|
|||c|||||
|k|s|k z z|t|||i|
|j||i j||k|||
||||i j|i j|k||

*i x j y x y t* *c* state *d* 2 *p* where *d*! *d*, *d* 2*= p*, cannot remain in the same partition as *d* and *d*. Similarly, if *d* and *d* have transitions on *c* and *d* does not, it cannot remain in the same partition as *d* and *d*.

Figure 2.10 makes this concrete. The states in *p₁* Df*d*, *d*, *d* g are equivalent

if and only if their transitions, 8 *c*, take them to states that are, them- selves, in an equivalence class. As shown, each state has a transition on a: a a a *d* *i* ! *dx*, *dj*! *dy*, and *dk*! *dz*. If *dx*, *dy*, and *dz*are all in the same set in

**2.4** *From Regular Expression to Scanner* **55**
a *d* *idx* a a *dx*

|d|d|d|||||
|---|---|---|---|---|---|---|
|i|x|i||4|2||
||||2||||
|a||a|||a||
|j|y|j|y|j||y|
|a||a|||a||
|k|z|k|z|k||z|
|1|2|1|3|5||3|
||1||1||||

*i x ip p* 4 2 *p*

*d d d d d d*

*d d d d d d*

*p p p p p p*

(a) a Does Not Split *p* (b) a Splits *p* (c) Partitions After Split On a n **FIGURE 2.10** Splitting a Partition around a. the current partition, as shown on the left, then *di*, *dj*, and *dk*should remain together and a does not split *p₁*.

|On the other hand, if d||, d, and d|
|---|---|---|
|a splits p₁. As shown in the center drawing of Figure 2.10, dx 2 p₂ while|||
|y|z||
|4|i|j k|

*x y z*are in two or more different sets, then a splits *p₁*. As shown in the center drawing of Figure 2.10, *dx*2 *p₂* while *d* and *d* 2 *p₃*, so the algorithm must split *p*1and construct two new sets *p* Df*d* g and *p*5Df*d*, *d* g to reflect the potential for different outcomes with strings that begin with the symbol a. The result is shown on the right side of Figure 2.10. The same split would result if state *di*had no transition on a.

To refine a partition *P*, the algorithm examines each *p* 2 *P* and each *c* 2*6*. If *c* splits *p*, the algorithm constructs two new sets from *p* and adds them to *T*. (It could split *p* into more than two sets, all having internally consistent behavior on *c*. However, creating one consistent state and lumping the rest of *p* into another state will suffice. If the latter state is inconsistent in its behavior on *c*, the algorithm will split it in a later iteration.) The algorithm repeats this process until it finds a partition where it can split no sets.

To construct the new dfa from the final partition *p*, we can create a single state to represent each set *p* 2 *P* and add the appropriate transitions between these new representative states. For the state representing *pl*, we add a tran- sition to the state representing *pm*on *c* if some *dj*2 *pl*has a transition on *c* to some *dk*2 *pm*. From the construction, we know that if *dj*has such a transition, so does every other state in *pl*; if this were not the case, the algo- rithm would have split *pl*around *c*. The resulting dfa is minimal; the proof is beyond our scope.

##### Examples

Consider a dfa that recognizes the language *fee* j *fie*, shown in Figure 2.11a. By inspection, we can see that states *s₃* and *s₅* serve the same purpose. Both

##### 56 CHAPTER 2 Scanners

|||e|
|---|---|---|
||e2|3|
|f|||
|0|1 i|e|
||4|5|

*s s*

*s s*

*s s*

(a) DFA for “*fee* | *fie*”

||Current||Examines||
|---|---|---|---|---|
|Step|Partition|Set|Char|Action|

|ffs, s g, fs|, s, s|, s gg|—|—|—|
|---|---|---|---|---|---|
|3 5|0 1 2|4||||
|3 5|0 1 2|4|3 5|||
|3 5|0 1 2|4|0 1 2|4e|2 4|
|3 5|0 1|2 4|0 1|f|1|
|3 5|0 1|2 4||||

1 ff*s*, *s* g, f*s*, *s*, *s*, *s* gg f*s*, *s* g *all none* 2 ff*s*, *s* g, f*s*, *s*, *s*, *s* gg f*s*, *s*, *s*, *s* g *split* f*s*, *s* g 3 ff*s*, *s* g, f*s*, *s* g, f*s*, *s* gg f*s*, *s* g *split* f*s* g 4 ff*s*, *s* g, f*s* g, f*s* g, f*s*, *s* gg *all all none*

(b) Critical Steps in Minimizing the DFA

|f|i,e|e|
|---|---|---|
|0|1|2 3|
 *s s s s*
(c) The Minimal DFA (States Renumbered)
n **FIGURE 2.11** Applying the DFA Minimization Algorithm.

are accepting states entered only by a transition on the letter e. Neither has a transition that leaves the state. We would expect the dfa minimization algorithm to discover this fact and replace them with a single state.

Figure 2.11b shows the significant steps that occur in minimizing this

dfa. The initial partition, shown as step 0, separates accepting states from nonaccepting states. Assuming that the while loop in the algorithm iterates over the sets of *P* in order, and over the characters in *6* Dfe, f, ig in order, then it first examines the set f*s₃*,*s₅*g. Since neither state has an exiting transi- tion, the state does not split on any character. In the second step, it examines f*s₀*,*s₁*,*s₂*,*s₄*g; on the character e, it splits f*s₂*,*s₄*g out of the set. In the third step, it examines f*s₀*,*s₁*g and splits it around the character f. At that point, the partition is ff*s₃*,*s₅*g, f*s₀*g, f*s₁*g, f*s₂*,*s₄*gg. The algorithm makes one final pass over the sets in the partition, splits none of them, and terminates.

To construct the new dfa, we must build a state to represent each set in the final partition, add the appropriate transitions from the original dfa, and designate initial and accepting state(s). Figure 2.11c shows the result for this example.

**2.4** *From Regular Expression to Scanner* **57**
*d*2b *d*2b b b a a *d₀ d*1c b

|d|d|||||
|---|---|---|---|---|---|
|0|1c b c||1|c3|c|
||3|c||2||

0 1c b *p* *d* *d p*

(a) Original DFA (b) Initial Partition
n **FIGURE 2.12** DFA for*a*(*b*j*c*).

As a second example, consider the dfa for *a* (*b* j *c*) produced by Thomp- son’s construction and the subset construction, shown in Figure 2.12a. The first step of the minimization algorithm constructs an initial partition ff*d₀*g, f*d₁*,*d₂*,*d₃*gg, as shown on the right. Since *p₁* has only one state, it cannot be split. When the algorithm examines *p₂*, it finds no transitions on a from any state in *p₂*. For both b and c, each state has a transition back into *p₂*. Thus, no symbol in *6* splits *p₂*, and the final partition is ff*d₀*g, f*d₁*,*d₂*,*d₃*gg. b,c The resulting minimal dfa is shown in Figure 2.12b. Recall that this isa *s*0*s*1 the dfa that we suggested a human would derive. After minimization, the automatic techniques produce the same result.

This algorithm is another example of a fixed-point computation. *P* is finite; at most, it can contain j*D*j elements. The while loop splits sets in *P*, but never combines them. Thus, j*P*j grows monotonically. The loop halts when some iteration splits no sets in *P*. The worst-case behavior occurs when each state in the dfa has different behavior; in that case, the while loop halts when *P* has a distinct set for each *di*2 *D*. This occurs when the algorithm is applied to a minimal dfa.

2.4.5 **Using a DFA as a Recognizer** Thus far, we have developed the mechanisms to construct a dfa implemen- tation from a single re. To be useful, a compiler’s scanner must recognize all the syntactic categories that appear in the grammar for the source lan- guage. What we need, then, is a recognizer that can handle all the res for the language’s microsyntax. Given the res for the various syntactic categories,

|r, r, r,..., r|, we can construct a single re for the entire collection by|
|---|---|
|1 2 3|k|
|1|2 3|
 forming (*r* j *r* j *r* j... j *rk*). If we run this re through the entire process, building an nfa, constructing a dfa to simulate the nfa, minimizing it, and turning that minimal dfa into executable code, the resulting scanner recognizes the next word that matches one of the *ri*’s. That is, when the compiler invokes it on some input, the

##### 58 CHAPTER 2 Scanners

scanner will examine characters one at a time and accept the string if it is in an accepting state when it exhausts the input. The scanner should return both the text of the string and its syntactic category, or part of speech. Since most real programs contain more than one word, we need to transform either the language or the recognizer.

At the language level, we can insist that each word end with some eas- ily recognizable delimiter, like a blank or a tab. This idea is deceptively attractive. Taken literally, it requires delimiters surrounding all operators, as +, -, (, ), and the comma.

At the recognizer level, we can change the implementation of the dfa and its notion of acceptance. To find the longest word that matches one of the res, the dfa should run until it reaches the point where the current state, *s*, has no outgoing transition on the next character. At that point, the implementation must decide which re it has matched. Two cases arise; the first is simple. If *s* is an accepting state, then the dfa has found a word in the language and should report the word and its syntactic category.

If *s* is not an accepting state, matters are more complex. Two cases occur. If the dfa passed through one or more accepting states on its way to *s*, the rec- ognizer should back up to the most recent such state. This strategy matches the longest valid prefix in the input string. If it never reached an accepting state, then no prefix of the input string is a valid word and the recognizer should report an error. The scanners in Section 2.5.1 implement both these notions.

As a final complication, an accepting state in the dfa may represent several accepting states in the original nfa. For example, if the lexical specifi- cation includes res for keywords as well as an re for identifiers, then a keyword such as new might match two res. The recognizer must decide which syntactic category to return: identifier or the singleton category for the keyword new.

Most scanner-generator tools allow the compiler writer to specify a priority among patterns. When the recognizer matches multiple patterns, it returns the syntactic category of the highest-priority pattern. This mechanism resolves the problem in a simple way. The lex scanner generator, distributed with many Unix systems, assigns priorities based on position in the list of res. The first re has highest priority, while the last re has lowest priority.

As a practical matter, the compiler writer must also specify res for parts of the input stream that do not form words in the program text. In most programming languages, blank space is ignored, but every program contains it. To handle blank space, the compiler writer typically includes an re that matches blanks, tabs, and end-of-line characters; the action on accepting

**2.5** *Implementing Scanners* **59**
blank space is to invoke the scanner, recursively, and return its result. If comments are discarded, they are handled in a similar fashion.

##### SECTION REVIEW

Given a regular expression, we can derive a minimal DFA to recognize the language specified by the RE using the following steps: (1) apply Thompson’s construction to build an NFA for the RE; (2) use the subset construction to derive a DFA that simulates the behavior of the RE; and

(3) use Hopcroft’s algorithm to identify equivalent states in the DFA and construct a minimal DFA. This trio of constructions produces an efficient recognizer for any language that can be specified with an RE. Both the subset construction and the DFA minimization algorithm are fixed-point computations. They are characterized by repeated applica- tion of a monotone function to some set; the properties of the domain play an important role in reasoning about the termination and complex- ity of these algorithms. We will see more fixed-point computations in later chapters.
##### Review Questions

**1.** Consider the RE *who* j *what* j *where*. Use Thompson’s construction to build an NFA from the RE. Use the subset construction to build a DFA from the NFA. Minimize the DFA.
##### 2. Minimize the following DFA:

|1h|2e|3r|4e|5|
|---|---|---|---|---|
|t|||||
|h6e|7r|8e|9||

*s s s s s*

*s* 0

*s s s s*

2.5 **IMPLEMENTING SCANNERS** Scanner construction is a problem where the theory of formal languages has produced tools that can automate implementation. For most languages, the compiler writer can produce an acceptably fast scanner directly from a set of regular expressions. The compiler writer creates an re for each syntactic category and gives the res as input to a scanner generator. The generator constructs an nfa for each re, joins them with-transitions, creates a corre- sponding dfa, and minimizes the dfa. At that point, the scanner generator must convert the dfa into executable code.

##### 60 CHAPTER 2 Scanners

*Lexical* Scanner Tables *Patterns* Generator FA Interpreter

n **FIGURE 2.13** Generating a Table-Driven Scanner.

This section discusses three implementation strategies for converting a dfa into executable code: a table-driven scanner, a direct-coded scanner, and a hand-coded scanner. All of these scanners operate in the same manner, by simulating the dfa. They repeatedly read the next character in the input and simulate the dfa transition caused by that character. This process stops when the dfa recognizes a word. As described in the previous section, that occurs when the current state, *s*, has no outbound transition on the current input character.

If *s* is an accepting state, the scanner recognizes the word and returns a lex- eme and its syntactic category to the calling procedure. If *s* is a nonaccepting state, the scanner must determine whether or not it passed through an accept- ing state on the way to *s*. If the scanner did encounter an accepting state, it should roll back its internal state and its input stream to that point and report success. If it did not, it should report the failure.

These three implementation strategies, table driven, direct coded, and hand coded, differ in the details of their runtime costs. However, they all have the same asymptotic complexity—constant cost per character, plus the cost of roll back. The differences in the efficiency of well-implemented scanners change the constant costs per character but not the asymptotic complexity of scanning.

The next three subsections discuss implementation differences between table-driven, direct-coded, and hand-coded scanners. The strategies differ in how they model the dfa’s transition structure and how they simulate its operation. Those differences, in turn, produce different runtime costs. The final subsection examines two different strategies for handling reserved keywords.

2.5.1 **Table-Driven Scanners** The table-driven approach uses a skeleton scanner for control and a set of generated tables that encode language-specific knowledge. As shown in
Figure 2.13, the compiler writer provides a set of lexical patterns, specified

**2.5** *Implementing Scanners* **61**
**r 0, 1, 2,** *:::***, 9 EOF Other** *NextWord()* *state s*0*; Register Digit Other Other* *lexeme ‘‘ ’’;* *clear stack;* The Classifier Table, *CharCat* *push(bad);*

*while (state*6D*se) do* ***Register Digit Other*** *NextChar(char);*

||||s|s|s|s|
|---|---|---|---|---|---|---|
|lexeme|lexeme|+ char;|0|1|e|e|
|if state|2 SA||1|e|2|e|
|then|clear|stack;|2|e|2|e|
|push(state); cat state end;|CharCat[char]; [state,cat];||e|e|e|e|
|while(state|2 = SA|and|0|1|2|e|
|state 6D bad)||do|||||
|state|pop();||||||
|truncate RollBack(); end;|lexeme;||||||
|||||||0…9|
|if state|2 SA|||r|0…9||
|then else n FIGURE 2.14|return Type[state]; return invalid;||0||1|2|

*lexeme lexeme* + *char;* **0** 1 *e e* ***s** s s s* ***s** s s s* ***s** s s s*

The Transition Table,

***s s s s***

*invalid invalid register invalid*

The Token Type Table, *Type*

*s s s*

The Underlying DFA

##### A Table-Driven Scanner for Register Names.

as regular expressions. The scanner generator then produces tables that drive the skeleton scanner.

Figure 2.14 shows a table-driven scanner for the re *r*[0... 9]

C, which was our first attempt at an re for iloc register names. The left side of the figure shows the skeleton scanner, while the right side shows the tables for *r*[0... 9] C and the underlying dfa. Notice the similarity between the code here and the recognizer shown in Figure 2.2 on page 32.

The skeleton scanner divides into four sections: initializations, a scanning loop that models the dfa’s behavior, a roll back loop in case the dfa over- shoots the end of the token, and a final section that interprets and reports the results. The scanning loop repeats the two basic actions of a scanner: read a character and simulate the dfa’s action. It halts when the dfa enters the

##### 62 CHAPTER 2 Scanners

error state, *se*. Two tables, *CharCat* and, encode all knowledge about the dfa. The roll back loop uses a stack of states to revert the scanner to its most recent accepting state.

The skeleton scanner uses the variable *state* to hold the current state of the simulated dfa. It updates *state* using a two-step, table-lookup process. First, it classifies *char* into one of a small set of categories using the *Char-* C *Cat* table. The scanner for *r*[0... 9] has three categories: *Register, Digit*, or *Other*. Next, it uses the current state and the character category as indices into the transition table,.

This two-step translation, character to category, then state and category to new state, lets the scanner use a compressed transition table. The tradeoff between direct access into a larger table and indirect access into the com- pressed table is straightforward.A complete table would eliminate the map- C, the For small examples, such as*r[0... 9]* ping through *CharCat*, but would increase the memory footprint of the table. classifier table is larger than the complete The uncompressed transition table grows as the product of the number of transition table. In a realistically sized example, states in the dfa and the number of characters in *6*; it can grow to the point that relationship should be reversed. where it will not stay in cache.

With a small, compact character set, such as ascii, *CharCat* can be repre- sented as a simple table lookup. The relevant portions of *CharCat* should stay in the cache. In that case, table compression adds one cache reference per input character. As the character set grows (e.g. Unicode), more complex implementations of *CharCat* may be needed. The precise tradeoff between the per-character costs of both compressed and uncompressed tables will depend on properties of both the language and the computer that runs the scanner.

To provide a character-by-character interface to the input stream, the skele- ton scanner uses a macro, *NextChar*, which sets its sole parameter to contain the next character in the input stream. A corresponding macro, *RollBack*, moves the input stream back by one character. (Section 2.5.3 looks at *NextChar* and *RollBack*.)

If the scanner reads too far, *state* will not contain an accepting state at the end of the first while loop. In that case, the second while loop uses the state trace from the stack to roll the state, lexeme, and input stream back to the most recent accepting state. In most languages, the scanner’s over- shoot will be limited. Pathological behavior, however, can cause the scanner to examine individual characters many times, significantly increasing the overall cost of scanning. In most programming languages, the amount of roll back is small relative to the word lengths. In languages where signifi- cant amounts of roll back can occur, a more sophisticated approach to this problem is warranted.

**2.5** *Implementing Scanners* **63**
##### Avoiding Excess Roll Back

Some regular expressions can produce quadratic calls to roll back in the scanner shown in Figure 2.14. The problem arises from our desire to have the scanner return the longest word that is a prefix of the input stream.

Consider the re *ab* j (*ab*) *c*. The corresponding dfa, shown in the margin,? recognizes either *ab* or any number of occurrences of *ab* followed by a *s*0 final *c*. On the input string ababababc, a scanner built from the dfa will read ?a all the characters and return the entire string as a single word. If, however, the *s₁* input is abababab, it must scan all of the characters before it can determine that the longest prefix is ab. On the next invocation, it will scan ababab?b <u>a</u> to return ab. The third call will scan abab to return ab, and the final call *s*3*s*2 will simply return ab without any roll back. In the worst, case, it can spenda 6 ?b?c quadratic time reading the input stream.<u>-c</u> *s*4*s*5

Figure 2.15 shows a modification to the scanner in Figure 2.14 that avoids

this problem. It differs from the earlier scanner in three important ways. First, it has a global counter, *InputPos*, to record position in the input stream. Second, it has a bit-array, *Failed*, to record dead-end transitions as the scanner finds them. *Failed* has a row for each state and a column for each position in the input stream. Third, it has an initialization routine that

*NextWord() while(state* 2*= SA and state* 6D *bad) do* *state s*0*; Failed[state,InputPos] true;* *lexeme ‘‘ ’’;* h*state,InputPos*i *pop();* *clear stack; truncate lexeme;* *push(*h*bad, bad*i*); RollBack();*

*while (state*6D*se) do end;* *NextChar(char); if state* 2 *SA* *InputPos InputPos* + *1; then return TokenType[state];* *lexeme lexeme* + *char; else return bad;* *if Failed[state,InputPos]* *then break;* *if state* 2 *SA InitializeScanner()* *then clear stack; InputPos*=*0;* *push(*h*state,InputPos*i*); for each state s in the DFA do* *cat CharCat[char]; for i* = *0 to* j*input stream*j *do* *state [state,cat]; Failed[s,i] false;* *end; end;* *end;*

n **FIGURE 2.15** The Maximal Munch Scanner.

##### 64 CHAPTER 2 Scanners

must be called before *NextWord()* is invoked. That routine sets *InputPos* to zero and sets *Failed* uniformly to false.

This scanner, called the *maximal munch scanner*, avoids the pathological behavior by marking dead-end transitions as they are popped from the stack. Thus, over time, it records specific h*state*,*input position*i pairs that cannot lead to an accepting state. Inside the scanning loop, the first while loop, the code tests each h*state*,*input position*i pair and breaks out of the scanning loop whenever a failed transition is attempted.

Optimizations can drastically reduce the space requirements of this scheme. (See, for example, Exercise 16 on page 82.) Most programming languages have simple enough microsyntax that this kind of quadratic roll back cannot occur. If, however, you are building a scanner for a language that can exhibit this behavior, the scanner can avoid it for a small additional overhead per character.

##### Generating the Transition and Classifier Tables

Given a dfa, the scanner generator can generate the tables in a straightfor- ward fashion. The initial table has one column for every character in the input alphabet and one row for each state in the dfa. For each state, in order, the generator examines the outbound transitions and fills the row with the appropriate states. The generator can collapse identical columns into a single instance; as it does so, it can construct the character classifier. (Two char- acters belong in the same class if and only if they have identical columns in.) If the dfa has been minimized, no two rows can be identical, so row compression is not an issue.

##### Changing Languages

To model another dfa, the compiler writer can simply supply new tables. Earlier in the chapter, we worked with a second, more constrained spec- ification for iloc register names, given by the re: *r*( [*0... 2*] ([*0... 9*] j) j [*4... 9*] j (*3* (*0* j *1* j)) ). That re gave rise to the following dfa:

*s* 2 0…9 *s* 3 0…2

*s* r *s* 3 *s* 0,1 *s* 0 1 5 6

4…9 *s* 4

Because it has more states and transitions than the re for *r* [*0... 9*] C, we should expect a larger transition table.

**2.5** *Implementing Scanners* **65**

|s|s|s|s|s|s|s|
|---|---|---|---|---|---|---|
|0|1|e|e|e|e|e|
|1|e|2|2|5|4|e|
|2|e|3|3|3|3|e|
|3|e|e|e|e|e|e|
|4|e|e|e|e|e|e|
|5|e|6|e|e|e|e|
|6|e|e|e|e|e|e|
|e|e|e|e|e|e|e|

|r|0,1 2|3 4 ::: 9|Other|
|---|---|---|---|
|s s|s s|s s|s|
|s s|s s|s s|s|
|s s|s s|s s|s|
|s s|s s|s s|s|
|s s|s s|s s|s|
|s s|s s|s s|s|
|s s|s s|s s|s has the following|

As a final example, the minimal dfa for the re *a.b*j*c/* table:

b,c **a b,c Other**

|s|s||||
|---|---|---|---|---|
|0|1|0 1 1 e|e 1|e e|

0 a 1 ***s*** **0***s*1*sese* ***s** s s s*

Minimal DFA Transition Table

The character classifier has three classes: a, b or c, and all other characters.

2.5.2 **Direct-Coded Scanners** To improve the performance of a table-driven scanner, we must reduce the cost of one or both of its basic actions: read a character and compute the next dfa transition. Direct-coded scanners reduce the cost of computing dfa transitions by replacing the explicit representation of the dfa’s state and transition graph with an implicit one. The implicit representation sim- plifies the two-step, table-lookup computation. It eliminates the memory references entailed in that computation and allows other specializations. The resulting scanner has the same functionality as the table-driven scanner, but with a lower overhead per character. A direct-coded scanner is no harder to generate than the equivalent table-driven scanner. The table-driven scanner spends most of its time inside the central while loop; thus, the heart of a direct-coded scanner is an alternate implementa- tion of that while loop. With some detail abstracted, that loop performs the following actions:

||6D|s|
|---|---|---|
|while (state NextChar(char);||e) do|
|cat|CharCat[char];||
|state end;|[state,cat];||

##### 66 CHAPTER 2 Scanners

##### REPRESENTING STRINGS

The scanner classifies words in the input program into a small set of categories. From a functional perspective, each word in the input stream becomes a pair h*word,type*i, where *word* is the actual text that forms the word and *type* represents its syntactic category.

For many categories, having both *word* and *type* is redundant. The words +, ×, and for have only one spelling. For identifiers, numbers, and character strings, however, the compiler will repeatedly use the *word*. Unfortunately, many compilers are written in languages that lack an appropriate representation for the *word* part of the pair. We need a representation that is compact and offers a fast equality test for two words.

A common practice to address this problem has the scanner create a sin- gle hash table (see Appendix B.4) to hold all the distinct strings used in the input program. The compiler then uses either the string’s index in this "string table" or a pointer to its stored image in the string table as a proxy for the string. Information derived from the string, such as the length of a character constant or the value and type of a numerical constant, can be computed once and referenced quickly through the table. Since most computers have storage-efficient representations for integers and point- ers, this reduces the amount of memory used internally in the compiler. By using the hardware comparison mechanisms on the integer or pointer proxies, it also simplifies the code used to compare them.

Notice the variable *state* that explicitly represents the dfa’s current state and the tables *CharCat* and that represent the dfa’s transition diagram.

##### Overhead of Table Lookup

For each character, the table-driven scanner performs two table lookups, one in *CharCat* and another in. While both lookups take **O**(1) time, the table abstraction imposes constant-cost overheads that a direct-coded scan- *th* ner can avoid. To access the *i* element of *CharCat*, the code must compute its address, given by

*@CharCat₀* + *i* × *w*

Detailed discussion of code for array addressing where @CharCat₀ is a constant related to the starting address of *CharCat* starts on page 359 in Section 7.5. in memory and *w* is the number of bytes in each element of *CharCat*. After computing the address, the code must load the data found at that address in memory.

**2.5** *Implementing Scanners* **67**
Because has two dimensions, the address calculation is more complex. For the reference *(state,cat)*, the code must compute

*@* 0 + *(state* × *number of columns in* + *cat)* × *w*

where @0is a constant related to the starting address of in memory and *w* is the number of bytes per element of. Again, the scanner must issue a load operation to retrieve the data stored at this address.

Thus, the table-driven scanner performs two address computations and two load operations for each character that it processes. The speed improvements in a direct-coded scanner come from reducing this overhead.

##### Replacing the Table-Driven Scanner’s While Loop

Rather than represent the current dfa state and the transition diagram explic- itly, a direct-coded scanner has a specialized code fragment to implement each state. It transfers control directly from state-fragment to state-fragment to emulate the actions of the dfa. Figure 2.16 shows a direct-coded scanner

*sinit : lexeme ‘‘ ’’; s*2 *: NextChar(char);* *clear stack; lexeme lexeme* + *char;* *push(bad); if state* 2 *SA* *goto s*0*; then clear stack;* *push(state);* *s* 0 *: NextChar(char);* *lexeme lexeme* + *char; if ‘*0*’ char ‘*9*’* *if state* 2 *SA then goto s*2*;* *then clear stack; else goto sout* *push(state); sout : while (state* 2*= SA and* *if (char = ‘*r*’) state* 6D *bad) do* *then goto s*1*; state pop();* *else goto sout; truncate lexeme;* *RollBack();* *s* 1 *: NextChar(char);* *end;* *lexeme lexeme* + *char;* *if state* 2 *SA if state* 2 *SA* *then clear stack; then return Type[state];* *push(state); else return invalid;* *if (‘*0*’ char ’*9*’)* *then goto s*2*;* *else goto sout;*

n **FIGURE 2.16** A Direct-Coded Scanner for*r*[...]C.

##### 68 CHAPTER 2 Scanners

C for *r* [*0... 9*]; it is equivalent to the table-driven scanner shown earlier in

Figure 2.14.

Consider the code for state *s₁*. It reads a character, concatenates it onto the current word, and advances the character counter. If *char* is a digit, it jumps to state *s₂*. Otherwise, it jumps to state *sout*. The code requires no compli- cated address calculations. The code refers to a tiny set of values that can be kept in registers. The other states have equally simple implementations.

The code in Figure 2.16 uses the same mechanism as the table-driven scan- ner to track accepting states and to roll back to them after an overrun. Because the code represents a specific dfa, we could specialize it further. In particular, since the dfa has just one accepting state, the stack is unneeded and the transitions to *sout* from *s₀* and *s₁* can be replaced with *report* *failure*. In a dfa where some transition leads from an accepting state to a nonaccepting state, the more general mechanism is needed.

A scanner generator can directly emit code similar to that shown in

Figure 2.16. Each state has a couple of standard assignments, followed by

branching logic that implements the transitions out of the state. Unlike the table-driven scanner, the code changes for each set of res. Since that code is generated directly from the res, the difference should not matter to the compiler writer.

Code in the style of Figure 2.16 is often called Of course, the generated code violates many of the precepts of structured *spaghetti code*in honor of its tangled control programming. While small examples may be comprehensible, the code for flow. a complex set of regular expressions may be difficult for a human to fol- low. Again, since the code is generated, humans should not need to read or debug it. The additional speed obtained from direct coding makes it an attractive option, particularly since it entails no extra work for the compiler writer. Any extra work is pushed into the implementation of the scanner generator.

##### Classifying Characters

C The continuing example, *r* [*0... 9*], divides the alphabet of input characters into just four classes. An r falls in class *Register*. The digits 0, 1, 2, 3, 4, 5, 6, 7, 8, and 9 fall in class *Digit*, the special character returned when *NextChar* exhausts its input falls in class *EndOfFile*, and anything else falls in class *Other*.

**Collating sequence** The scanner can easily and efficiently classify a given character, as shown the "sorting order" of the characters in an in Figure 2.16. State *s₀* uses a direct test on ‘r’ to determine if *char* is alphabet, determined by the integers assigned in *Register*. Because all the other classes have equivalent actions in the each character dfa, the scanner need not perform further tests. States *s* and *s* classify

**2.5** *Implementing Scanners* **69**
*char* into either *Digit* or anything else. They capitalize on the fact that the digits 0 through 9 occupy adjacent positions in the ascii collating sequence, corresponding to the integers 48 to 57.

In a scanner where character classification is more involved, the translation- table approach used in the table-driven scanner may be less expensive than directly testing characters. In particular, if a class contains multiple char- acters that do not occupy adjacent slots in the collating sequence, a table lookup may be more efficient than direct testing. For example, a class that contained the arithmetic operators +, -, *, n, and ˆ (43, 45, 42, 48, and 94 in the ascii sequence) would require a moderately long series of com- parisons. Using a translation table, such as *CharCat* in the table-driven example, might be faster than the comparisons if the translation table stays in the processor’s primary cache.

2.5.3 **Hand-Coded Scanners** Generated scanners, whether table-driven or direct-coded, use a small, con- stant amount of time per character. Despite this fact, many compilers use hand-coded scanners. In an informal survey of commercial compiler groups, we found that a surprisingly large fraction used hand-coded scanners. Similarly, many of the popular open-source compilers rely on hand-coded scanners. For example, the *flex* scanner generator was ostensibly built to support the *gcc* project, but *gcc 4.0* uses hand-coded scanners in several of its front ends. The direct-coded scanner reduced the overhead of simulating the dfa; the hand-coded scanner can reduce the overhead of the interfaces between the scanner and the rest of the system. In particular, a careful implementation can improve the mechanisms used to read and manipulate characters on input and the operations needed to produce a copy of the actual lexeme on output.
##### Buffering the Input Stream

While character-by-character i/o leads to clean algorithmic formulations, the overhead of a procedure call per character is significant relative to the cost of simulating the dfa in either a table-driven or a direct-coded scanner. To reduce the i/o cost per character, the compiler writer can use buffered i/o, where each read operation returns a longer string of characters, or buffer, and the scanner then indexes through the buffer. The scanner maintains a pointer into the buffer. Responsibility for keeping the buffer filled and track- ing the current location in the buffer falls to *NextChar*. These operations can

##### 70 CHAPTER 2 Scanners

be performed inline; they are often encoded in a macro to avoid cluttering the code with pointer dereferences and increments.

The cost of reading a full buffer of characters has two components, a large fixed overhead and a small per-character cost. A buffer and pointer scheme amortizes the fixed costs of the read over many single-character fetches. Making the buffer larger reduces the number of times that the scanner incurs this cost and reduces the per-character overhead.

Using a buffer and pointer also leads to a simple and efficient implementa- tion of the *RollBack* operation that occurs at the end of both the generated scanners. To roll the input back, the scanner can simply decrement the input pointer. This scheme works as long as the scanner does not decrement the pointer beyond the start of the buffer. At that point, however, the scanner needs access to the prior contents of the buffer.

**Double buffering** In practice, the compiler writer can bound the roll-back distance that a scan- A scheme that uses two input buffers in a modulo ner will need. With bounded roll back, the scanner can simply use two fashion to provide bounded roll back is often adjacent buffers and increment the pointer in a modulo fashion, as shown called*double buffering*. below:

|Buffer 0|Buffer|1|
|---|---|---|
||Input Pointer||

*0 n-1 n*6*2n-1*

To read a character, the scanner increments the pointer, modulo *2n* and returns the character at that location. To roll back a character, the program decrements the input pointer, modulo *2n*. It must also manage the contents of the buffer, reading additional characters from the input stream as needed.

Both *NextChar* and *RollBack* have simple, efficient implementations, as shown in Figure 2.17. Each execution of *NextChar* loads a character, incre- ments the *Input* pointer, and tests whether or not to fill the buffer. Every *n* characters, it fills the buffer. The code is small enough to be included inline, perhaps generated from a macro. This scheme amortizes the cost of filling the buffer over *n* characters. By choosing a reasonable size for *n*, such as 2048, 4096, or more, the compiler writer can keep the i/o overhead low.

*Rollback* is even less expensive. It performs a test to ensure that the buffer contents are valid and then decrements the input pointer. Again, the implementation is sufficiently simple to be expanded inline. (If we used this implementation of *NextChar* and *RollBack* in the generated scanners, *RollBack* would need to truncate the final character away from *lexeme*.)

**2.5** *Implementing Scanners* **71**

|Char|Buffer[Input];|||Input|0;|||
|---|---|---|---|---|---|---|---|
|Input if (Input then fill|(Input + 1) mod n = begin; Buffer[Input : Input + n - 1];|mod 2n; 0)||Fence fill Buffer[0 : n];|0;|||
|Fence|(Input + n)||mod 2n;|if (Input|= Fence)|||
|end;||||then|signal|roll back|error;|
|return Char;||||Input|(Input - 1)|mod|2n;|

Initialization

Implementing *NextChar* Implementing *RollBack*

n **FIGURE 2.17** Implementing *NextChar*and *RollBack*.

As a natural consequence of using finite buffers, *RollBack* has a limited his- tory in the input stream. To keep it from decrementing the pointer beyond the start of that context, *NextChar* and *RollBack* cooperate. The pointer *Fence* always indicates the start of the valid context. *NextChar* sets *Fence* each time it fills a buffer. *RollBack* checks *Fence* each time it tries to decrement the *Input* pointer.

After a long series of *NextChar* operations, say, more than *n* of them, *Roll-* *Back* can always back up at least *n* characters. However, a sequence of calls to *NextChar* and *RollBack* that work forward and backward in the buffer can create a situation where the distance between *Input* and *Fence* is less than *n*. Larger values of *n* decrease the likelihood of this situation arising. Expected backup distances should be a consideration in selecting the buffer size, *n*.

##### Generating Lexemes

The code shown for the table-driven and direct-coded scanners accumulated the input characters into a string *lexeme*. If the appropriate output for each syntactic category is a textual copy of the lexeme, then those schemes are efficient. In some common cases, however, the parser, which consumes the scanner’s output, needs the information in another form.

For example, in many circumstances, the natural representation for a regis- ter number is an integer, rather than a character string consisting of an ‘r’ and a sequence of digits. If the scanner builds a character representation, then somewhere in the interface, that string must be converted to an inte- ger. A typical way to accomplish that conversion uses a library routine, such as atoi in the standard C library, or a string-based i/o routine, such as

##### 72 CHAPTER 2 Scanners

sscanf. A more efficient way to solve this problem would be to accumulate the integer’s value one digit at a time.

In the continuing example, the scanner could initialize a variable, *RegNum*, to zero in its initial state. Each time that it recognized a digit, it could multiply *RegNum* by 10 and add the new digit. When it reached an accept- ing state, *RegNum* would contain the needed value. To modify the scanner in Figure 2.16, we can delete all statements that refer to *lexeme*, add

|RegNum|0; to sinit, and replace the occurrences of goto s₂ in states||||
|---|---|---|---|---|
|s₁ and s₂ with:|begin;||||
||RegNum goto|RegNum s2;|× 10 + (char|-‘0’);|
||end;||||

where both *char* and *‘0’* are treated as their ordinal values in the ascii collating sequence. Accumulating the value this way likely has lower overhead than building the string and converting it in the accepting state.

For other words, the lexeme is implicit and, therefore, redundant. With singleton words, such as a punctuation mark or an operator, the syntactic category is equivalent to the lexeme. Similarly, many scanners recognize comments and white space and discard them. Again, the set of states that recognize the comment need not accumulate the lexeme. While the individ- ual savings are small, the aggregate effect is to create a faster, more compact scanner.

This issue arises because many scanner generators let the compiler writer specify actions to be performed in an accepting state, but do not allow actions on each transition. The resulting scanners must accumulate a character copy of the lexeme for each word, whether or not that copy is needed. If compile time matters (and it should), then attention to such minor algorithmic details leads to a faster compiler.

2.5.4 **Handling Keywords** We have consistently assumed that keywords in the input language should be recognized by including explicit res for them in the description that generates the dfa and the recognizer. Many authors have proposed an alter- native strategy: having the dfa classify them as identifiers and testing each identifier to determine whether or not it is a keyword. This strategy made sense in the context of a hand-implemented scanner. The additional complexity added by checking explicitly for keywords causes

**2.5** *Implementing Scanners* **73**
a significant expansion in the number of dfa states. This added implementa- tion burden matters in a hand-coded program. With a reasonable hash table (see Appendix B.4), the expected cost of each lookup should be constant. In fact, this scheme has been used as a classic application for *perfect hash-* *ing*. In perfect hashing, the implementor ensures, for a fixed set of keys, that the hash function generates a compact set of integers with no collisions. This lowers the cost of lookup on each keyword. If the table implementation takes into account the perfect hash function, a single probe serves to distinguish keywords from identifiers. If it retries on a miss, however, the behavior can be much worse for nonkeywords than for keywords.

If the compiler writer uses a scanner generator to construct the recognizer, then the added complexity of recognizing keywords in the dfa is handled by the tools. The extra states that this adds consume memory, but not compile time. Using the dfa mechanism to recognize keywords avoids a table lookup on each identifier. It also avoids the overhead of implementing a keyword table and its support functions. In most cases, folding keyword recognition into the dfa makes more sense than using a separate lookup table.

##### SECTION REVIEW

Automatic construction of a working scanner from a minimal DFA is straightforward. The scanner generator can adopt a table-driven approach, wherein it uses a generic skeleton scanner and language- specific tables, or it can generate a direct-coded scanner that threads together a code fragment for each DFA state. In general, the direct-coded approach produces a faster scanner because it has lower overhead per character.

Despite the fact that all DFA-based scanners have small constant costs per characters, many compiler writers choose to hand code a scanner. This approach lends itself to careful implementation of the interfaces between the scanner and the I/O system and between the scanner and the parser.

*s*0

||a b|c|
|---|---|---|
||s s|s|
|1. Given the DFA shown to the left, complete the following: a. Sketch the character classifier that you would use in a table-driven implementation of this DFA. b. Build the transition table, based on the transition diagram and|b c|a|
|your character classifier.|s s|s|

##### Review Questions

1 2 3

|s₄|s₅|s₆|
|---|---|---|
|c|a|b|
|7|8|9|

##### c. Write an equivalent direct-coded scanner.

##### 74 CHAPTER 2 Scanners

**2.** An alternative implementation might use a recognizer for (*a*j*b*j*c*) (*a*j*b*j*c*) (*a*j*b*j*c*), followed by a lookup in a table that contains the three words abc, bca, and cab.
##### a. Sketch the DFA for this language.

**b.** Show the direct-coded scanner, including the call needed to perform keyword lookup.
**c.** Contrast the cost of this approach with those in question 1 above.
**3.** What impact would the addition of transition-by-transition actions have on the DFA-minimization process? (Assume that we have a lin- guistic mechanism of attaching code fragments to the edges in the transition graph.)
2.6 **ADVANCED TOPICS**
2.6.1 **DFA to Regular Expression** The final step in the cycle of constructions, shown in Figure 2.3, is to construct an re from a dfa. The combination of Thompson’s construction and the subset construction provide a constructive proof that dfas are at least as powerful as res. This section presents Kleene’s construction, which builds an re to describe the set of strings accepted by an arbitrary dfa. This algorithm establishes that res are at least as powerful as dfas. Together, they show that res and dfas are equivalent. Consider the transition diagram of a dfa as a graph with labelled edges. The problem of deriving an re that describes the language accepted by the dfa corresponds to a path problem over the dfa’s transition diagram. The set of strings in *L.*dfa*/* consists of the set of edge labels for every path from *d₀* to *di*, 8 *di*2 *DA*. For any dfa with a cyclic transition graph, the set of such paths is infinite. Fortunately, res have the Kleene closure operator to handle this case and summarize the complete set of subpaths created by a cycle.
Figure 2.18 shows one algorithm to compute this path expression. It assumes
 that the dfa has states numbered from 0 to j*D*j 1, with *d₀* as the start state. It generates an expression that represents the labels along all paths between two nodes, for each pair of nodes in the transition diagram. As a final step, it combines the expressions for each path that leaves *d₀* and reaches some accepting state, *di*2 *DA*. In this way, it systematically constructs the path expressions for all paths. The algorithm computes a set of expressions, denoted *R*
*kij*, for all the relevant values of *i*, *j*, and *k*. *R* *kij* is an expression that describes all paths through the transition graph from state *i* to state *j*, without going through a state

**2.6** *Advanced Topics* **75**
*for*

|i = 0 to|jDj 1|||
|---|---|---|---|
|for j =|0 to jDj 1|||
|Rij 1 D f a j|(di, a) D djg|||
|if (i|= j) then|||
|Rij 1 D|Rij 1 j f|g||
|k = 0 to|jDj1|||
|for i =|0 to jD j1|||
|for j|= 0 to|jDj1||
|Rkij D Rkik 1(Rkkk 1)||Rkkj 1|j Rkij 1|
|= j sj2 DA|Rj0Dj j1|||
||DFA.|||

*for*

*L*

n **FIGURE 2.18** Deriving a Regular Expression from a

numbered higher than *k*. Here, *through* means both entering and leaving, so that *R²¹,*16can be nonempty if an edge runs directly from 1 to 16.

1 Initially, the algorithm places all of the direct paths from *i* to *j* in *Rij*, with Traditional statements of this algorithm assume 1 that node names range from 1 to*n*, rather than f g added to *R* if *i* D *j*. Over successive iterations, it builds up longer paths *kij k* 1from 0 to*n* 1. Thus, they place the direct paths to produce *Rij*by adding to *Rij*the paths that pass through *k* on their way0 in*R*. *kij* 1 *ij* from *i* to *j*. Given *R*, the set of paths added by going from *k* 1 to *k* is exactly the set of paths that run from *i* to *k* using no state higher than *k* 1, concatenated with the paths from *k* to itself that pass through no state higher than *k* 1, followed by the paths from *k* to *j* that pass through no state higher than *k* 1. That is, each iteration of the loop on *k* adds the paths that pass *kij* 1 *k* through *k* to each set *R* to produce *Rij*.

*kij* When the *k* loop terminates, the various *R* expressions account for all paths through the graph. The final step computes the set of paths that start with *d₀* and end in some accepting state, *dj*2 *dA*, as the alternation of the path expressions.

2.6.2 **Another Approach to DFA Minimization:** **Brzozowski’s Algorithm** If we apply the subset construction to an nfa that has multiple paths from the start state for some prefix, the construction will group the states involved in those duplicate prefix paths together and will create a single path for that prefix in the dfa. The subset construction always produces dfas that have no duplicate prefix paths. Brzozowski used this observation to devise an alternative dfa minimization algorithm that directly constructs the minimal dfa from an nfa.

##### 76 CHAPTER 2 Scanners

*s₁*- a *s₂*- b *s₃*- c *s₄ s₁* a *s₂* b *s₃* c *s₄* J] J b c b c J *s₀*-*s₅*-*s₆*-*s₇ s₀ s₅ s₆ s₇ s₁₁*

J J]J J J^*s₈*-a *s₉*-d *s₁₀* J *s₈* a *s₉* d *s₁₀*

(a) NFA for *abc* j *bc* j *ad* (b) Reverse the NFA in (a)
*s₁* a *s₂* b *s₃* c *s₁*- a *s₂*- b *s₃* c Qk Q * QkQ

||s||s|
|---|---|---|---|
||11||11|
|a|d|a|d|

11*s*0 11 XXXX *s₈ s₇*+ Xz *s₈*<u>-</u>*s₇*+

(c) Subset the NFA in (b) (d) Reverse the DFA in (c)
*s* 2d a@b ? <u>b</u> <u>@R</u> <u>c</u> *s₀*<u>-</u>*s₃*<u>-</u>*s₁₁*

(e) Subset the NFA in (d) to Produce the Minimal DFA
n **FIGURE 2.19** Minimizing a DFA with Brzozowski’s Algorithm.

For an nfa *n*, let *reverse(n)* be the nfa obtained by reversing the direction of all the transitions, making the initial state into a final state, adding a new initial state, and connecting it to all of the states that were final states in *n*. Further, let *reachable(n)* be a function that returns the set of states and tran- sitions in *n* that are reachable from its initial state. Finally, let *subset(n)* be the dfa produced by applying the subset construction to *n*.

Now, given an nfa *n*, the minimal equivalent dfa is just

*reachable( subset( reverse( reachable( subset( reverse(n))) ))).*

The inner application of *subset* and *reverse* eliminates duplicate suffixes in the original nfa. Next, *reachable* discards any states and transitions that are no longer interesting. Finally, the outer application of the triple, *reachable,* *subset*, and *reverse*, eliminates any duplicate prefixes in the nfa. (Applying *reverse* to a dfa can produce an nfa.)

The example in Figure 2.19 shows the steps of the algorithm on a simple nfa for the re *abc* j *bc* j *ad*. The nfa in Figure 2.19a is similar to the one that Thompson’s construction would produce; we have removed the -transitions that “glue” together the nfas for individual letters. Figure 2.19b

**2.6** *Advanced Topics* **77**
shows the result of applying *reverse* to that nfa. Figure 2.19c depicts the dfa that *subset* constructs from the *reverse* of the nfa. At this point, the algo- rithm applies *reachable* to remove any unreachable states; our example nfa has none. Next, the algorithm applies *reverse* to the dfa, which produces the nfa in Figure 2.19d. Applying *subset* to that nfa produces the dfa in

Figure 2.19e. Since it has no unreachable states, it is the minimal dfa for

*abc* j *bc* j *cd*.

This technique looks expensive, because it applies *subset* twice and we know that *subset* can construct an exponentially large set of states. Studies of the running times of various fa minimization techniques suggest, however, that this algorithm performs reasonably well, perhaps because of specific properties of the nfa produced by the first application of *reachable (subset(* *reverse(n)))*. From a software-engineering perspective, it may be that imple- menting *reverse* and *reachable* is easier than debugging the partitioning algorithm.

2.6.3 **Closure-Free Regular Expressions** One subclass of regular languages that has practical application beyond scanning is the set of languages described by closure-free regular expres- sions. Such res have the form *w₁*j*w₂*j*w₃*j *:::* j *wn*where the individ- ual words, *wi*, are just concatenations of characters in the alphabet, *6*. These res have the property that they produce dfas with acyclic transition graphs. These simple regular languages are of interest for two reasons. First, many pattern recognition problems can be described with a closure-free re. Exam- ples include words in a dictionary, urls that should be filtered, and keys to a hash table. Second, the dfa for a closure-free re can be built in a particularly efficient way. To build the dfa for a closure-free re, begin with a start state *s₀*. To add a word to the existing dfa, the algorithm follows the path for the new word until it either exhausts the pattern or finds a transition to *se*. In the former case, it designates the final state for the new word as an accepting state. In the latter, it adds a path for the new word’s remaining suffix. The resulting dfa can be encoded in tabular form or in direct-coded form (see Section 2.5.2). Either way, the recognizer uses constant time per character in the input stream. In this algorithm, the cost of adding a new word to an existing dfa is proportional to the length of the new word. The algorithm also works incrementally; an application can easily add new words to a dfa that is in use. This property makes the acyclic dfa an interesting alternative for

##### 78 CHAPTER 2 Scanners

implementing a perfect hash function. For a small set of keys, this technique produces an efficient recognizer. As the number of states grows (in a direct- *s₀* coded recognizer) or as key length grows (in a table-driven recognizer), d fQ s +? Qs the implementation may slow down due to cache-size constraints. At some point, the impact of cache misses will make an efficient implementation of a

|s₁|s₅|s₉|
|---|---|---|
|s|s|s|
|s₃|s₇|s₁₁|
|s₄|s₈|s₁₂|

e e emore traditional hash function more attractive than incremental construction ??? of the acyclic dfa. 2 6 10 e e e The dfas produced in this way are not guaranteed to be minimal. Consider ??? the acyclic dfa that it would produce for the res *deed, feed*, and *seed*, shown to the left. It has three distinct paths that each recognize the suffix *eed*. ?d?d?d Clearly, those paths can be combined to reduce the number of states and transitions in the dfa. Minimization will combine states (*s₂*, *s₆*, *s₁₀*), states (*s₃*, *s₇*, *s₁₁*), and states (*s₄*, *s₈*, *s₁₂*) to produce a seven state dfa.

The algorithm builds dfas that are minimal with regard to prefixes of words in the language. Any duplication takes the form of multiple paths for the same suffix.

2.7 **CHAPTER SUMMARY AND PERSPECTIVE** The widespread use of regular expressions for searching and scanning is one of the success stories of modern computer science. These ideas were developed as an early part of the theory of formal languages and automata. They are routinely applied in tools ranging from text editors to web filtering engines to compilers as a means of concisely specifying groups of strings that happen to be regular languages. Whenever a finite collection of words must be recognized, dfa-based recognizers deserve serious consideration. The theory of regular expressions and finite automata has developed techni- ques that allow the recognition of regular languages in time proportional to the length of the input stream. Techniques for automatic derivation of dfas from res and for dfa minimization have allowed the construction of robust tools that generate dfa-based recognizers. Both generated and hand- crafted scanners are used in well-respected modern compilers. In either case, a careful implementation should run in time proportional to the length of the input stream, with a small overhead per character. n **CHAPTER NOTES** Originally, the separation of lexical analysis, or scanning, from syntax anal- ysis, or parsing, was justified with an efficiency argument. Since the cost

##### Chapter Notes 79

of scanning grows linearly with the number of characters, and the constant costs are low, pushing lexical analysis from the parser into a separate scanner lowered the cost of compiling. The advent of efficient parsing tech- niques weakened this argument, but the practice of building scanners persists because it provides a clean separation of concerns between lexical structure and syntactic structure.

Because scanner construction plays a small role in building an actual com- piler, we have tried to keep this chapter brief. Thus, the chapter omits many theorems on regular languages and finite automata that the ambitious reader might enjoy. The many good texts on this subject can provide a much deeper treatment of finite automata and regular expressions, and their many useful properties [194, 232, 315].

Kleene [224] established the equivalence of res and fas. Both the Kleene closure and the dfa to re algorithm bear his name. McNaughton and Yamada showed one construction that relates res to nfas [262]. The construction shown in this chapter is patterned after Thompson’s work [333], which was motivated by the implementation of a textual search command for an early text editor. Johnson describes the first application of this technology to automate scanner construction [207]. The subset construction derives from Rabin and Scott [292]. The dfa minimization algorithm in Section 2.4.4 is due to Hopcroft [193]. It has found application to many different prob- lems, including detecting when two program variables always have the same value [22].

The idea of generating code rather than tables, to produce a direct-coded scanner, appears to originate in work by Waite [340] and Heuring [189]. They report a factor of five improvement over table-driven implementations. Ngassam et al. describe experiments that characterize the speedups possible in hand-coded scanners [274]. Several authors have examined tradeoffs in scanner implementation. Jones [208] advocates direct coding but argues for a structured approach to control flow rather than the spaghetti code shown in Section 2.5.2. Brouwer et al. compare the speed of 12 different scan- ner implementations; they discovered a factor of 70 difference between the fastest and slowest implementations [59].

The alternative dfa minimization technique presented in Section 2.6.2 was described by Brzozowski in 1962 [60]. Several authors have com- pared dfa minimization techniques and their performance [328, 344]. Many authors have looked at the construction and minimization of acyclic dfas [112, 343, 345].

##### 80 CHAPTER 2 Scanners

n **EXERCISES** Section 2.2 **1.** Describe informally the languages accepted by the following fas:

a *s*1 a,b

**a.** *s₀*
a b *s*2 b

*s*

|0 1|0|||
|---|---|---|---|
|1 0||0,1||
|1 2|1|||
|b|a|a|b|
|a|a|b b|a|
|b|||b|

**b.** *s₀ s₃*
*s*

a

**c.** *s₀ s₁ s₂ s₃ s₄ s₅ s₆* a,b
**2.** Construct an fa accepting each of the following languages:
**a.** f*w* 2f*a*, bg j *w* starts with ‘*a*’ and contains ‘*baba*’ as a substringg
**b.** f*w* 2f0, 1g j *w* contains ‘111’ as a substring and does not contain ‘00’ as a substringg
**c.** f*w* 2f*a*, b, cg j in *w* the number of ‘*a*’s modulo 2 is equal to the number of ‘*b*’s modulo 3g
**3.** Create fas to recognize (a) words that represent complex numbers and
(b) words that represent decimal numbers written in scientific notation.
Section 2.3 **4.** Different programming languages use different notations to represent integers. Construct a regular expression for each one of the following:

**a.** Nonnegative integers in c represented in bases 10 and 16.
**b.** Nonnegative integers in vhdl that may include underscores (an underscore cannot occur as the first or last character).
**c.** Currency, in dollars, represented as a positive decimal number rounded to the nearest one-hundredth. Such numbers begin with the character $, have commas separating each group of three digits to the left of the decimal point, and end with two digits to the right of the decimal point, for example, $8,937.43 and $7,777,777.77.
**Hint 5.** Write a regular expression for each of the following languages: Not all the specifications describe regular **a.** Given an alphabet Df0, 1g, L is the set of all strings of

|Not all the specifications describe regular|a. Given an alphabet 6 Df0, 1g, L is the set of all strings of|
|---|---|
|languages.|alternating pairs of 0s and pairs of 1s.|

##### Exercises 81

**b.** Given an alphabet *6* Df0, 1g, L is the set of all strings of 0s and 1s that contain an even number of 0s or an even number of 1s.
**c.** Given the lowercase English alphabet, L is the set of all strings in which the letters appear in ascending lexicographical order.
**d.** Given an alphabet *6* Df*a*, b, c, dg, L is the set of strings *xyzwy*, where *x* and *w* are strings of one or more characters in *6*, *y* is any single character in *6*, and *z* is the character z, taken from outside the alphabet. (Each string xyzwy contains two words *xy* and *wy* built from letters in *6*. The words end in the same letter, *y*. They are separated by *z*.)
**e.** Given an alphabet *6* DfC,,,,*.*, */*, idg, L is the set of algebraic expressions using addition, subtraction, multiplication, division, and parentheses over ids.
**6.** Write a regular expression to describe each of the following programming language constructs:
**a.** Any sequence of tabs and blanks (sometimes called *white space*)
**b.** Comments in the programming language c
**c.** String constants (without escape characters)
**d.** Floating-point numbers
**7.** Consider the three regular expressions: Section 2.4 (*ab* j *ac*) (0 j 1) 1100 1 (01 j 10 j 00) 11
**a.** Use Thompson’s construction to construct an nfa for each re.
**b.** Convert the nfas to dfas.
**c.** Minimize the dfas.
**8.** One way of proving that two res are equivalent is to construct their minimized dfas and then compare them. If they differ only by state names, then the res are equivalent. Use this technique to check the following pairs of res and state whether or not they are equivalent.
**a.** (0 j 1) and (0 j 10 ) C C
**b.** (*ba*) (*a b* j *a*) and (*ba*) *ba* (*b* j)
**9.** In some cases, two states connected by an-move can be combined.
**a.** Under what set of conditions can two states connected by an -move be combined?
**b.** Give an algorithm for eliminating-moves.

##### 82 CHAPTER 2 Scanners

**c.** How does your algorithm relate to the-closure function used to implement the subset construction?
**10.** Show that the set of regular languages is closed under intersection.
**11.** The dfa minimization algorithm given in Figure 2.9 is formulated to enumerate all the elements of *P* and all of the characters in *6* on each iteration of the while loop.
**a.** Recast the algorithm so that it uses a worklist to hold the sets that must still be examined.
**b.** Recast the *Split* function so that it partitions the set around all of the characters in *6*.
**c.** How does the expected case complexity of your modified algorithms compare to the expected case complexity of the original algorithm?
Section 2.5 **12.** Construct a dfa for each of the following c language constructs, and then build the corresponding table for a table-driven implementation for each of them:

**a.** Integer constants
**b.** Identifiers
**c.** Comments
**13.** For each of the dfas in the previous exercise, build a direct-coded scanner.
**14.** This chapter describes several styles of dfa implementations. Another alternative would use mutually recursive functions to implement a scanner. Discuss the advantages and disadvantages of such an implementation.
**15.** To reduce the size of the transition table, the scanner generator can use a character classification scheme. Generating the classifier table, however, seems expensive. The obvious algorithm would require 2
**O***.*j*6*j j*states*j*/* time. Derive an asymptotically faster algorithm for finding identical columns in the transition table.
**16.** Figure 2.15 shows a scheme that avoids quadratic roll back behavior in a scanner built by simulating a dfa. Unfortunately, that scheme requires that the scanner know in advance the length of the input stream and that it maintain a bit-matrix, *Failed*, of size j*states*j × j*input*j. Devise a scheme that avoids the need to know the size of the input stream in advance. Can you use the same scheme to reduce the size of the *Failed* table in cases where the worst case input does not occur?

#### Chapter 3

