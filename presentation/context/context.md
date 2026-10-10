#slide 1
##title - Compiler Visualizer
Presented by Group 9

#slide 2
##projects members
1.Mg Thant Zin Htun ( Leader ) 
    -3IST-2
    telegram-@ThantZ44
    email-thantz6745@gmail.com

2.Mg Phyo Lin Mg
    -3IST-69
    telegram-@Lyd_mai
    email-phyolinn5423@gmail.com

3.Ma Phyo Thin Kyi (Co-Leader)
    -3IST-6
    telegram-@isagi_11_2005
    email-phyothinkyi.mt@gmail.com

4.Ma Lynn Latt Nwe
    -3IST-4
    telegram-@L23232525
    email-yinthetnwe23@gmail.com

5.Ma Hmone Hmone Smile
    -3IST-65
    telegram-@Emiko205
    email-s06398475@gmail.com

#slide 3
##contents
1. Introduction
2. Objective
3. Technology Stack
4. ER Diagram
5. State Diagram (how compiler works step by step)
6. Limitation
7. Future Plan
8. Conclusion
9. Thank You, Q & A

#slide 4
##Introduction
Online compilers and javac alone give only output or errors. Students never see how Java code becomes tokens, trees, symbol tables, or bytecode. Compiler Visualizer fixes this: write Java in the Monaco editor at web browser, click Compile, and explore every phase — lexing, parsing, AST, semantic analysis, CFG/optimizer, codegen, bytecode, execution — with interactive D3 and 3D views in English or Myanmar.

#slide 5
##Objective
1. Make every Java compile phase visible step by step (lexing → execution) instead of output-only.
2. Teach front end / optimizer / back end structure using real, runnable Java code.
3. Label every visualization with the algorithm that built it (e.g. Maximal-Munch, Shift-Reduce, Graph Coloring).
4. Let users compile once and explore anywhere across all visualize panels.
5. Support learning in both English and Myanmar (full i18n).
6. Provide interactive D3.js views (tokens, AST, symbol table, CFG) plus a 3D pipeline overview.
7. Enable authenticated saved-code snippets so students revisit examples anytime (JWT + database).
8. Understanding compiling techniques course easily with this project.

#slide 6
##Technology Stack
- frontend -> React 19 + Typescript + Vite, Tailwind CSS v4, Monaco editor, D3.js, Three.js, i18next(en/my)
- backend -> Spring Boot 3.2, Java 17, JavaParser, JWT + Spring Security, Javac, Javap, JavaLexer
- database -> Sqlite in developement, MySQL in production, JPA
- tools -> Maven, VS code, Git, Github, ESLint, Vercel(frontend), Render(backend)

#slide 7
##ER diagram
Two tables only. users(id PK, username UNIQUE, email UNIQUE, passwordHash, createdAt, updatedAt) 1—N saved_code(id PK, user_id FK to users.id, title, sourceCode TEXT, createdAt, updatedAt). Mermaid: users ||--o{ saved_code : owns. Compile results are ephemeral and never stored.

#slide 8
##State Diagram
How compiler works step by step: Write Java -> see lexing -> parsing -> AST -> semantic analysis -> CFG/optimizer -> codegen -> bytecode -> execution, step by step. 

#slide 9
##Limitation
- java code only
- single file
- require JDK on server
- error messages are javac raw
- web app need internet

#slide 10
##Future plan
- multi-file project support
- more visulization steps
- error message show exactly
- full myanmar coverage
- desktop & mobile application

#slide 11
##Conclusion
Compiler Visualizer turns a black-box javac run into an explorable pipeline: one Java file in, tokens, AST, symbol table, optimizer graphs, and bytecode out — each view labeled with its algorithm and explorable in English or Myanmar. It proves the full front end to back end flow works end to end, from editor to execution.

#slide 12
##Thank You, Q & A
Thank You. Q & A — questions 