# Compiler Visualizer

---

## ၁။ ပါဝင်သော လုပ်ဆောင်ချက်များ

၁။ Java ကုဒ်များကို ရေးသားနိုင်သော ခေတ်မီ Code Editor ပါဝင်ပြီး Compile နှင့် Execute လုပ်နိုင်ပါသည်။
၂။ ရေးသားထားသော ကုဒ်ကို Lexing → Parsing → AST → Semantic → Bytecode အဆင့်များအလိုက် ခွဲခြမ်းစိတ်ဖြာပြီး အဆင့်တိုင်းကို မြင်သာအောင် ပြသပေးပါသည်။
၃။ Token များ၊ AST သစ်ပင်များနှင့် Symbol Table များကို ဂရပ်ပုံစံများဖြင့် အလွယ်တကူ ကြည့်ရှုနိုင်ပါသည်။
၄။ Compiler ၏ အလယ်အဆင့်ဖြစ်သော CFG၊ Dominator Tree၊ SSA နှင့် Data Flow တို့ကို လေ့လာနိုင်ပါသည်။
၅။ Bytecode Listing၊ Stack Machine နှင့် Execution Flow တို့ကို ပြသပေးသော ကဏ္ဍများ ပါဝင်ပါသည်။
၆။ ပရိုဂရမ်၏ လုပ်ဆောင်ချက်ကို အဆင့်တစ်ဆင့်ချင်း ခြေရာခံကြည့်ရှုနိုင်သော Execution ကဏ္ဍ ပါဝင်ပါသည်။
၇။ နမူနာကုဒ် (Sample Code) တစ်ချက်နှိပ် ထည့်သွင်းနိုင်သော လုပ်ဆောင်ချက်နှင့် အကောင့်ဖြင့် ကုဒ်များကို သိမ်းဆည်းနိုင်သော စနစ်များ ပါဝင်ပါသည်။

---

## ၂။ Project လမ်းညွှန်

၁။ Landing page တွင် Compiler ၏ လုပ်ဆောင်ချက်များကို မိတ်ဆက်ပြသထားပါသည်။
၂။ Visualize ကဏ္ဍမှ Lexical၊ Syntax နှင့် Semantic အဆင့်များကို တစ်ခုချင်း လေ့လာနိုင်ပါသည်။
၃။ Optimizer ကဏ္ဍတွင် CFG နှင့် Data Flow လုပ်ဆောင်ချက်များကို ကြည့်ရှုနိုင်ပါသည်။
၄။ Code Generation ကဏ္ဍမှ TAC နှင့် Basic Block များကို လေ့လာနိုင်ပါသည်။
၅။ Bytecode ကဏ္ဍတွင် JVM Instruction များကို အသေးစိတ် ကြည့်ရှုနိုင်ပါသည်။
၆။ Pipeline ကဏ္ဍတွင် Compiler လုပ်ငန်းစဉ်တစ်ခုလုံးကို 3D ပုံစံဖြင့် လှည့်ပတ်ကြည့်ရှုနိုင်ပါသည်။
၇။ Editor ကဏ္ဍတွင် Java ကုဒ်ရေးသား၍ Compile နှင့် Execute ကို ချက်ချင်း စမ်းသပ်နိုင်ပါသည်။

---

## ၃။ ရည်ရွယ်ချက်

၁။ Compiler ၏ လုပ်ဆောင်ပုံကို ကျောင်းသားများ အလွယ်တကူ နားလည်စေရန် ရည်ရွယ်ပါသည်။
၂။ ရေးသားထားသော Java ကုဒ်ကို Compiler က မည်သို့ စက်ဘာသာသို့ ပြောင်းလဲကြောင်း မြင်သာစေလိုပါသည်။
၃။ စာသင်ခန်းတွင် သီအိုရီသက်သက် သင်ကြားရသော Compiler ဘာသာရပ်ကို လက်တွေ့ကျကျ လေ့လာနိုင်စေလိုပါသည်။
၄။ Lexing၊ Parsing နှင့် Semantic Analysis အဆင့်များကို Visualization ဖြင့် ရှင်းလင်းစွာ နားလည်စေရန် ရည်ရွယ်ပါသည်။
၅။ Optimizer နှင့် Code Generation အဆင့်များ၏ နောက်ကွယ် လုပ်ငန်းစဉ်များကို ထင်ရှားစေလိုပါသည်။
၆။ Compiler ကို စတင်လေ့လာနေသူများအတွက် အထောက်အကူဖြစ်စေမည့် Learning Tool တစ်ခု ဖြစ်စေရန် ရည်ရွယ်ပါသည်။
၇။ နည်းပညာဖြင့် ပညာရေးကို ပိုမိုထိရောက်အောင် ပံ့ပိုးပေးနိုင်ရန် အဓိက ရည်ရွယ်ပါသည်။

---

## ၄။ အကျဉ်းချုပ်

၁။ Compiler Visualizer သည် Java Compiler ၏ လုပ်ငန်းစဉ်များကို မြင်သာအောင် ပြသပေးသော Web Application တစ်ခု ဖြစ်ပါသည်။
၂။ သုံးစွဲသူ ရေးသားသော Java ကုဒ်ကို အဆင့်ဆင့် ခွဲခြမ်းစိတ်ဖြာပြီး ရလဒ်တိုင်းကို ပြသပေးပါသည်။
၃။ React ဖြင့် တည်ဆောက်ထားသော ခေတ်မီ User Interface ပါဝင်ပါသည်။
၄။ Spring Boot ဖြင့် တည်ဆောက်ထားသော Backend သည် ကုဒ်များကို အမှန်တကယ် Compile လုပ်ပေးပါသည်။
၅။ D3.js နှင့် Three.js နည်းပညာများဖြင့် 2D နှင့် 3D Visualization များကို ဖန်တီးထားပါသည်။
၆။ အကောင့်စနစ်ဖြင့် မိမိ၏ ကုဒ်များကို သိမ်းဆည်းနိုင်ပြီး မြန်မာ၊ အင်္ဂလိပ် နှစ်ဘာသာဖြင့် အသုံးပြုနိုင်ပါသည်။
၇။ အကျဉ်းချုပ်အားဖြင့် ဤစနစ်သည် Compiler ပညာရပ်ကို လွယ်ကူစွာ လေ့လာနိုင်သော Learning Platform တစ်ခု ဖြစ်ပါသည်။

description

Ever wondered what happens between javac and your output? Compiler Visualizer breaks the Java compilation pipeline into interactive steps: lexical analysis, parsing into an AST, semantic analysis with symbol tables, CFG-based optimization, bytecode generation, and execution. Write code in the browser editor, hit Compile, and explore each phase as an animated D3.js visualization — perfect for students learning how compilers really work.

---

## ၅။ အကျိုးကျေးဇူးများ

၁။ Compiler ၏ ရှုပ်ထွေးသော သီအိုရီများကို မြင်သာထင်သာသော ပုံစံဖြင့် နားလည်စေပါသည်။
၂။ အဆင့်တစ်ဆင့်ချင်း ပြသပေးသောကြောင့် သင်ယူမှုကို ပိုမိုလွယ်ကူစေပါသည်။
၃။ Compiler ဘာသာရပ် သင်ကြားသော ဆရာများအတွက် စာသင်ခန်းသုံး အထောက်အကူပြု ကိရိယာအဖြစ် အသုံးပြုနိုင်ပါသည်။
၄။ ကျောင်းသားများအတွက် သီအိုရီနှင့် လက်တွေ့ကို ချိတ်ဆက်ပေးသော ပေါင်းကူးတံတားသဖွယ် ဖြစ်ပါသည်။
၅။ Java ကုဒ်များကို လက်တွေ့ Compile လုပ်ပေးသောကြောင့် ရလဒ်များကို အမှန်တကယ် စမ်းသပ်ကြည့်ရှုနိုင်ပါသည်။
၆။ 3D Pipeline ကြည့်ရှုမှုကြောင့် Compiler ၏ လုပ်ငန်းစဉ်တစ်ခုလုံးကို ခြုံငုံသိမြင်နိုင်ပါသည်။
၇။ မည်သည့် Software ထည့်သွင်းစရာမလိုဘဲ Browser တစ်ခုဖြင့် နေရာမရွေး လေ့လာနိုင်ပါသည်။

---

## ၆။ နည်းပညာဆိုင်ရာ လုပ်ငန်းစဉ်များ

၁။ သုံးစွဲသူသည် Monaco Editor တွင် Java ကုဒ်ကို ရေးသားပြီး Compile & Execute ခလုတ်ကို နှိပ်လိုက်ပါသည်။
၂။ ရေးသားထားသော ကုဒ်ကို Frontend မှ Axios ဖြင့် POST /api/compile လိပ်စာမှတစ်ဆင့် Spring Boot Backend သို့ ပို့ဆောင်ပါသည်။
၃။ Backend တွင် JavaLexer က Token များကို ထုတ်လုပ်ပြီး JavaParser က AST သစ်ပင်ကို တစ်ပြိုင်နက်တည်း (CompletableFuture) ဖြင့် တည်ဆောက်ပါသည်။
၄။ ထို့နောက် Symbol Table တည်ဆောက်ခြင်း၊ CFG ထုတ်လုပ်ခြင်းနှင့် Code Generation အဆင့်များကို ဆက်လက် လုပ်ဆောင်ပါသည်။
၅။ javac ဖြင့် ကုဒ်ကို အမှန်တကယ် Compile လုပ်ပြီး javap ဖြင့် Bytecode များကို ပြန်လည်ထုတ်ယူကာ ပရိုဂရမ်ကို Execute လုပ်၍ Output ကို ဖမ်းယူပါသည်။
၆။ Backend သည် Token များ၊ AST၊ Symbol Table၊ Bytecode နှင့် Output အားလုံးပါဝင်သော ရလဒ်ကို JSON Response အဖြစ် Frontend သို့ ပြန်လည်ပို့ပေးပါသည်။
၇။ Frontend သည် ရရှိလာသော ဒေတာများကို CompileContext တွင် သိမ်းဆည်းပြီး D3.js နှင့် Three.js တို့ဖြင့် Visualize စာမျက်နှာများပေါ်တွင် မြင်သာအောင် ပြသပေးပါသည်။

---

*UTYCC 13th Batch - IST Major - Innovative Project Exhibition 2026*
