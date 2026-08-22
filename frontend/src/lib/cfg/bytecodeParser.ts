/**
 * JVM bytecode parser — parses javap -c output into structured data.
 * From "Engineering a Compiler" Ch 8 — Target Code Generation (JVM).
 */

export interface BytecodeInstruction {
  offset: number;
  opcode: string;
  operands: string;
  rawLine: string;
}

export interface BytecodeMethod {
  name: string;
  access: string;
  instructions: BytecodeInstruction[];
  maxStack: number;
  maxLocals: number;
  patterns: PeepholePattern[];
}

/** Rich opcode metadata for the instruction-selection tooltip (Ch. 11) */
export interface OpcodeDetails {
  description: string;
  category: string;
  pattern: string;
  cost: number;
  example: string;
}

/** A detected peephole-optimization opportunity in a method's bytecode (Ch. 11) */
export interface PeepholePattern {
  id: number;
  type: string;
  startOffset: number;
  endOffset: number;
  description: string;
  replacement: string;
  savings: number;
}

export interface BytecodeClass {
  className: string;
  constantPool: string[];
  methods: BytecodeMethod[];
  rawBytecode: string;
}

/** Parse a single javap bytecode line */
function parseInstructionLine(line: string): BytecodeInstruction | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('Code:') || trimmed.startsWith('StackMapTable:')) {
    return null;
  }

  // Match patterns like: "0: iconst_0" or "1: istore_1" or "3: iload_0" or "5: invokestatic #2"
  const match = trimmed.match(/^(\d+):\s+(\w+)(?:\s+(.*))?$/);
  if (match) {
    return {
      offset: parseInt(match[1]),
      opcode: match[2],
      operands: match[3] || '',
      rawLine: trimmed,
    };
  }

  // Match branch targets like: "8: if_icmpge  16"
  const branchMatch = trimmed.match(/^(\d+):\s+(if\w+|goto|jsr)\s+(\d+)/);
  if (branchMatch) {
    return {
      offset: parseInt(branchMatch[1]),
      opcode: branchMatch[2],
      operands: branchMatch[3],
      rawLine: trimmed,
    };
  }

  return null;
}

/** Parse javap -c output for a method */
function parseMethod(lines: string[], methodName: string): BytecodeMethod {
  const instructions: BytecodeInstruction[] = [];
  let maxStack = 0;
  let maxLocals = 0;
  let access = 'public';

  for (const line of lines) {
    const stackMatch = line.match(/max_stack\s*=\s*(\d+)/i);
    if (stackMatch) maxStack = parseInt(stackMatch[1]);

    const localsMatch = line.match(/max_locals\s*=\s*(\d+)/i);
    if (localsMatch) maxLocals = parseInt(localsMatch[1]);

    if (line.includes('public')) access = 'public';
    else if (line.includes('private')) access = 'private';
    else if (line.includes('static')) access = 'static';

    const instr = parseInstructionLine(line);
    if (instr) instructions.push(instr);
  }

  return {
    name: methodName,
    access,
    instructions,
    maxStack: maxStack || 2,
    maxLocals: maxLocals || 1,
    patterns: detectPeepholePatterns(instructions),
  };
}

/** Parse full javap output into structured bytecode data */
export function parseBytecode(rawBytecode: string): BytecodeClass {
  const lines = rawBytecode.split('\n');
  const methods: BytecodeMethod[] = [];
  const constantPool: string[] = [];
  let className = 'Unknown';
  let currentMethod = '';
  let currentMethodLines: string[] = [];

  for (const line of lines) {
    // Extract class name from "public class ClassName"
    const classMatch = line.match(/class\s+(\w+)/);
    if (classMatch) className = classMatch[1];

    // Extract constant pool entries
    const cpMatch = line.match(/^\s*#\d+\s*=\s*(.+)/);
    if (cpMatch) constantPool.push(cpMatch[1].trim());

    // Detect method start
    const methodMatch = line.match(/(public|private|static|\s)*\s*(\w+)\s*\(/);
    if (methodMatch && line.includes('{')) {
      if (currentMethod && currentMethodLines.length > 0) {
        methods.push(parseMethod(currentMethodLines, currentMethod));
      }
      currentMethod = methodMatch[2];
      currentMethodLines = [line];
    } else if (currentMethod) {
      currentMethodLines.push(line);
      if (line.trim() === '}') {
        methods.push(parseMethod(currentMethodLines, currentMethod));
        currentMethod = '';
        currentMethodLines = [];
      }
    }
  }

  // Handle last method if not closed
  if (currentMethod && currentMethodLines.length > 0) {
    methods.push(parseMethod(currentMethodLines, currentMethod));
  }

  // If no methods parsed, try to parse raw bytecode as flat instruction list
  if (methods.length === 0 && rawBytecode.trim()) {
    const allInstructions: BytecodeInstruction[] = [];
    for (const line of lines) {
      const instr = parseInstructionLine(line);
      if (instr) allInstructions.push(instr);
    }
    if (allInstructions.length > 0) {
      methods.push({
        name: 'main',
        access: 'public static',
        instructions: allInstructions,
        maxStack: 2,
        maxLocals: 1,
        patterns: detectPeepholePatterns(allInstructions),
      });
    }
  }

  return {
    className,
    constantPool,
    methods,
    rawBytecode,
  };
}

/** Get opcode description for tooltip */
export function getOpcodeDescription(opcode: string): string {
  const descriptions: Record<string, string> = {
    'iconst_0': 'Push int 0',
    'iconst_1': 'Push int 1',
    'iconst_2': 'Push int 2',
    'iconst_m1': 'Push int -1',
    'iload_0': 'Load int from local 0',
    'iload_1': 'Load int from local 1',
    'iload_2': 'Load int from local 2',
    'istore_1': 'Store int to local 1',
    'istore_2': 'Store int to local 2',
    'bipush': 'Push byte as int',
    'sipush': 'Push short as int',
    'ldc': 'Push constant from pool',
    'iadd': 'Integer add',
    'isub': 'Integer subtract',
    'imul': 'Integer multiply',
    'idiv': 'Integer divide',
    'irem': 'Integer remainder',
    'ineg': 'Integer negate',
    'if_icmpeq': 'Branch if ints equal',
    'if_icmpne': 'Branch if ints not equal',
    'if_icmpge': 'Branch if int >=',
    'if_icmpgt': 'Branch if int >',
    'if_icmple': 'Branch if int <=',
    'if_icmplt': 'Branch if int <',
    'ifeq': 'Branch if int == 0',
    'ifne': 'Branch if int != 0',
    'ifge': 'Branch if int >= 0',
    'ifgt': 'Branch if int > 0',
    'ifle': 'Branch if int <= 0',
    'iflt': 'Branch if int < 0',
    'goto': 'Unconditional jump',
    'invokestatic': 'Call static method',
    'invokevirtual': 'Call virtual method',
    'invokespecial': 'Call special method',
    'getstatic': 'Get static field',
    'putstatic': 'Set static field',
    'areturn': 'Return reference',
    'ireturn': 'Return int',
    'return': 'Return void',
    'pop': 'Pop top value',
    'dup': 'Duplicate top value',
    'swap': 'Swap top two values',
    'nop': 'No operation',
    'athrow': 'Throw exception',
    'new': 'Create new object',
    'arraylength': 'Get array length',
    'aaload': 'Load reference from array',
    'aastore': 'Store reference to array',
    'iaload': 'Load int from array',
    'iastore': 'Store int to array',
  };
  return descriptions[opcode] || opcode;
}

/** Rich instruction-selection metadata per opcode (Ch. 11 — Instruction Selection) */
const OPCODE_DETAILS: Record<string, OpcodeDetails> = {
  'iconst_0': { description: 'Push int 0', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = 0' },
  'iconst_1': { description: 'Push int 1', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = 1' },
  'iconst_2': { description: 'Push int 2', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = 2' },
  'iconst_3': { description: 'Push int 3', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = 3' },
  'iconst_4': { description: 'Push int 4', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = 4' },
  'iconst_5': { description: 'Push int 5', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = 5' },
  'iconst_m1': { description: 'Push int -1', category: 'Constant', pattern: 'Small integers are encoded directly in the opcode byte — no memory or register operand needed.', cost: 1, example: 'int x = -1' },
  'bipush': { description: 'Push byte as int', category: 'Constant', pattern: 'Constants in [-128, 127] are selected over ldc — a one-byte operand is cheaper than a pool lookup.', cost: 1, example: 'int x = 42' },
  'sipush': { description: 'Push short as int', category: 'Constant', pattern: 'Constants in [-32768, 32767] are selected over ldc — a two-byte operand is cheaper than a pool lookup.', cost: 1, example: 'int x = 1000' },
  'ldc': { description: 'Push constant from pool', category: 'Constant', pattern: 'Only constants too large for bipush/sipush (strings, doubles, big ints) reference the constant pool.', cost: 2, example: 'String s = "hello"' },
  'iload_0': { description: 'Load int from local 0', category: 'Local Load', pattern: 'A value must be moved from a local slot onto the operand stack before an operation can consume it.', cost: 1, example: 'int y = x + 1' },
  'iload_1': { description: 'Load int from local 1', category: 'Local Load', pattern: 'A value must be moved from a local slot onto the operand stack before an operation can consume it.', cost: 1, example: 'int y = x + 1' },
  'iload_2': { description: 'Load int from local 2', category: 'Local Load', pattern: 'A value must be moved from a local slot onto the operand stack before an operation can consume it.', cost: 1, example: 'int y = x + 1' },
  'iload_3': { description: 'Load int from local 3', category: 'Local Load', pattern: 'A value must be moved from a local slot onto the operand stack before an operation can consume it.', cost: 1, example: 'int y = x + 1' },
  'istore_0': { description: 'Store int to local 0', category: 'Local Store', pattern: 'Results are popped from the stack and written back to a local slot — the JVM keeps values in slots, not named registers.', cost: 1, example: 'x = compute()' },
  'istore_1': { description: 'Store int to local 1', category: 'Local Store', pattern: 'Results are popped from the stack and written back to a local slot — the JVM keeps values in slots, not named registers.', cost: 1, example: 'x = compute()' },
  'istore_2': { description: 'Store int to local 2', category: 'Local Store', pattern: 'Results are popped from the stack and written back to a local slot — the JVM keeps values in slots, not named registers.', cost: 1, example: 'x = compute()' },
  'istore_3': { description: 'Store int to local 3', category: 'Local Store', pattern: 'Results are popped from the stack and written back to a local slot — the JVM keeps values in slots, not named registers.', cost: 1, example: 'x = compute()' },
  'iadd': { description: 'Integer add', category: 'Arithmetic', pattern: 'Binary arithmetic pops its two operands from the stack and pushes the result — a stack machine has no explicit destination field.', cost: 1, example: 'c = a + b' },
  'isub': { description: 'Integer subtract', category: 'Arithmetic', pattern: 'Binary arithmetic pops its two operands from the stack and pushes the result — a stack machine has no explicit destination field.', cost: 1, example: 'c = a - b' },
  'imul': { description: 'Integer multiply', category: 'Arithmetic', pattern: 'Binary arithmetic pops its two operands from the stack and pushes the result — a stack machine has no explicit destination field.', cost: 1, example: 'c = a * b' },
  'idiv': { description: 'Integer divide', category: 'Arithmetic', pattern: 'Binary arithmetic pops its two operands from the stack and pushes the result — a stack machine has no explicit destination field.', cost: 1, example: 'c = a / b' },
  'irem': { description: 'Integer remainder', category: 'Arithmetic', pattern: 'Binary arithmetic pops its two operands from the stack and pushes the result — a stack machine has no explicit destination field.', cost: 1, example: 'c = a % b' },
  'ineg': { description: 'Integer negate', category: 'Arithmetic', pattern: 'Unary operations pop one value and push the transformed result.', cost: 1, example: 'c = -a' },
  'if_icmpeq': { description: 'Branch if ints equal', category: 'Branch', pattern: 'A compare-and-branch pops two values; control flows to the target only if the relation holds, otherwise it falls through.', cost: 1, example: 'if (a == b)' },
  'if_icmpne': { description: 'Branch if ints not equal', category: 'Branch', pattern: 'A compare-and-branch pops two values; control flows to the target only if the relation holds, otherwise it falls through.', cost: 1, example: 'if (a != b)' },
  'if_icmpge': { description: 'Branch if int >=', category: 'Branch', pattern: 'A compare-and-branch pops two values; control flows to the target only if the relation holds, otherwise it falls through.', cost: 1, example: 'if (a >= b)' },
  'if_icmpgt': { description: 'Branch if int >', category: 'Branch', pattern: 'A compare-and-branch pops two values; control flows to the target only if the relation holds, otherwise it falls through.', cost: 1, example: 'if (a > b)' },
  'if_icmple': { description: 'Branch if int <=', category: 'Branch', pattern: 'A compare-and-branch pops two values; control flows to the target only if the relation holds, otherwise it falls through.', cost: 1, example: 'if (a <= b)' },
  'if_icmplt': { description: 'Branch if int <', category: 'Branch', pattern: 'A compare-and-branch pops two values; control flows to the target only if the relation holds, otherwise it falls through.', cost: 1, example: 'if (a < b)' },
  'ifeq': { description: 'Branch if int == 0', category: 'Branch', pattern: 'A value is compared with zero by the instruction itself — no separate compare instruction is needed.', cost: 1, example: 'if (x == 0)' },
  'ifne': { description: 'Branch if int != 0', category: 'Branch', pattern: 'A value is compared with zero by the instruction itself — no separate compare instruction is needed.', cost: 1, example: 'if (x != 0)' },
  'ifge': { description: 'Branch if int >= 0', category: 'Branch', pattern: 'A value is compared with zero by the instruction itself — no separate compare instruction is needed.', cost: 1, example: 'if (x >= 0)' },
  'ifgt': { description: 'Branch if int > 0', category: 'Branch', pattern: 'A value is compared with zero by the instruction itself — no separate compare instruction is needed.', cost: 1, example: 'if (x > 0)' },
  'ifle': { description: 'Branch if int <= 0', category: 'Branch', pattern: 'A value is compared with zero by the instruction itself — no separate compare instruction is needed.', cost: 1, example: 'if (x <= 0)' },
  'iflt': { description: 'Branch if int < 0', category: 'Branch', pattern: 'A value is compared with zero by the instruction itself — no separate compare instruction is needed.', cost: 1, example: 'if (x < 0)' },
  'goto': { description: 'Unconditional jump', category: 'Jump', pattern: 'A three-byte branch that always transfers control — used to close loops and skip else branches.', cost: 1, example: 'while (true)' },
  'invokestatic': { description: 'Call static method', category: 'Method Call', pattern: 'The callee is resolved once from the constant pool; the call itself is an indirect invocation resolved at class-load time.', cost: 3, example: 'Math.max(a, b)' },
  'invokevirtual': { description: 'Call virtual method', category: 'Method Call', pattern: 'Virtual dispatch: the target is looked up through the receiver\'s class hierarchy at runtime, not at compile time.', cost: 3, example: 'list.add(x)' },
  'invokespecial': { description: 'Call special method', category: 'Method Call', pattern: 'Non-virtual call (constructors, super, private) — the target is statically known, so no dispatch table lookup occurs.', cost: 2, example: 'new Foo()' },
  'getstatic': { description: 'Get static field', category: 'Field Access', pattern: 'A static field is referenced through the class object in the constant pool.', cost: 2, example: 'System.out' },
  'putstatic': { description: 'Set static field', category: 'Field Access', pattern: 'A static field is referenced through the class object in the constant pool.', cost: 2, example: 'Counter.count = 1' },
  'areturn': { description: 'Return reference', category: 'Return', pattern: 'The return value is popped from the stack and control transfers back to the caller\'s frame.', cost: 1, example: 'return obj' },
  'ireturn': { description: 'Return int', category: 'Return', pattern: 'The return value is popped from the stack and control transfers back to the caller\'s frame.', cost: 1, example: 'return n' },
  'return': { description: 'Return void', category: 'Return', pattern: 'Void methods need no value — the frame is simply popped.', cost: 1, example: 'return;' },
  'pop': { description: 'Pop top value', category: 'Stack Operation', pattern: 'Discards a value whose computation result is unused — a sign the compiler kept a value the source never needed.', cost: 1, example: 'void result discarded' },
  'dup': { description: 'Duplicate top value', category: 'Stack Operation', pattern: 'Copies the top of stack so the same value can be used twice without reloading it from a local.', cost: 1, example: 'a = b = f()' },
  'swap': { description: 'Swap top two values', category: 'Stack Operation', pattern: 'Reorders the two top stack values when an operation needs operands in the opposite order.', cost: 1, example: 'argument reordering' },
  'nop': { description: 'No operation', category: 'Misc', pattern: 'Reserved slot — a peephole optimizer can overwrite nop bytes when patching branches.', cost: 0, example: 'padding' },
  'athrow': { description: 'Throw exception', category: 'Exception', pattern: 'Pops an exception object and transfers control to the nearest matching handler.', cost: 1, example: 'throw new E()' },
  'new': { description: 'Create new object', category: 'Object', pattern: 'Allocates storage for an object; a constructor must be invoked immediately after.', cost: 1, example: 'new Foo()' },
  'arraylength': { description: 'Get array length', category: 'Array', pattern: 'Array length is stored with the array object, so no separate bounds variable is kept.', cost: 1, example: 'arr.length' },
  'aaload': { description: 'Load reference from array', category: 'Array', pattern: 'Indexed addressing: pops the array and index, then pushes the element.', cost: 2, example: 'arr[i]' },
  'aastore': { description: 'Store reference to array', category: 'Array', pattern: 'Indexed addressing: pops the array, index, and value, then writes the element.', cost: 2, example: 'arr[i] = obj' },
  'iaload': { description: 'Load int from array', category: 'Array', pattern: 'Indexed addressing: pops the array and index, then pushes the element.', cost: 2, example: 'arr[i]' },
  'iastore': { description: 'Store int to array', category: 'Array', pattern: 'Indexed addressing: pops the array, index, and value, then writes the element.', cost: 2, example: 'arr[i] = x' },
};

/** Derive generic details for opcodes without a hand-written entry */
function defaultOpcodeDetails(opcode: string): OpcodeDetails {
  let category = 'Misc';
  const pattern = 'This instruction has no specific pattern note.';
  const cost = 1;
  if (opcode.startsWith('if') || opcode === 'goto' || opcode === 'jsr') category = 'Branch';
  else if (opcode.startsWith('invoke')) category = 'Method Call';
  else if (opcode.includes('load')) category = 'Local Load';
  else if (opcode.includes('store')) category = 'Local Store';
  else if (opcode.startsWith('const') || opcode === 'bipush' || opcode === 'sipush' || opcode === 'ldc') category = 'Constant';
  else if (opcode.includes('return')) category = 'Return';
  else if (opcode === 'pop' || opcode === 'dup' || opcode === 'swap') category = 'Stack Operation';
  return { description: opcode, category, pattern, cost, example: '' };
}

/** Get rich instruction-selection metadata for the hover tooltip */
export function getOpcodeDetails(opcode: string): OpcodeDetails {
  return OPCODE_DETAILS[opcode] || defaultOpcodeDetails(opcode);
}

/** Load/store slot index parsed from an opcode like "iload_2" or "iload" with operand "2" */
function slotOf(instr: BytecodeInstruction): number | null {
  const m = instr.opcode.match(/(?:load|store)_(\d+)$/);
  if (m) return parseInt(m[1], 10);
  if (instr.opcode === 'iload' || instr.opcode === 'istore' || instr.opcode === 'aload' || instr.opcode === 'astore') {
    const n = parseInt(instr.operands, 10);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

/**
 * Detect peephole-optimization opportunities in a straight-line instruction
 * sequence (Ch. 11.5 — Peephole Optimization). Each pattern is a short window
 * of code that a compiler's peephole pass could replace with a cheaper sequence.
 */
export function detectPeepholePatterns(instructions: BytecodeInstruction[]): PeepholePattern[] {
  const patterns: PeepholePattern[] = [];
  const byOffset = new Map<number, number>();
  instructions.forEach((instr, i) => byOffset.set(instr.offset, i));
  let id = 0;

  for (let i = 0; i < instructions.length; i++) {
    const cur = instructions[i];
    const next = instructions[i + 1];

    if (!next) break;

    // 1. Unnecessary goto: branch targets the immediately following instruction
    if (cur.opcode === 'goto' && next.offset === parseInt(cur.operands, 10)) {
      patterns.push({
        id: id++,
        type: 'Unnecessary Goto',
        startOffset: cur.offset,
        endOffset: cur.offset,
        description: `goto ${cur.operands} jumps to the very next instruction — the branch is dead weight.`,
        replacement: 'Delete the goto entirely',
        savings: 3,
      });
      continue;
    }

    // 2. Redundant load: same local loaded twice in a row (could use dup)
    const slotA = slotOf(cur);
    const slotB = slotOf(next);
    if (slotA !== null && slotA === slotB && cur.opcode.includes('load') && next.opcode.includes('load')) {
      patterns.push({
        id: id++,
        type: 'Redundant Load',
        startOffset: cur.offset,
        endOffset: next.offset,
        description: `${cur.opcode}; ${next.opcode} loads the same slot twice — the value is already on top of the stack.`,
        replacement: 'dup',
        savings: 1,
      });
      continue;
    }

    // 3. Store-then-reload: value is stored and immediately loaded back
    if (slotA !== null && slotA === slotB && cur.opcode.includes('store') && next.opcode.includes('load')) {
      patterns.push({
        id: id++,
        type: 'Store-Load',
        startOffset: cur.offset,
        endOffset: next.offset,
        description: `${cur.opcode}; ${next.opcode} writes a value to slot ${slotA} then reads it right back — the value never left the stack.`,
        replacement: 'Keep the value on the stack',
        savings: 2,
      });
      continue;
    }

    // 4. Duplicate constant: same constant pushed twice in a row
    const constPattern = /^(iconst_[0-5]|iconst_m1|bipush|sipush)$/;
    if (constPattern.test(cur.opcode) && cur.opcode === next.opcode && cur.operands === next.operands) {
      patterns.push({
        id: id++,
        type: 'Duplicate Constant',
        startOffset: cur.offset,
        endOffset: next.offset,
        description: `${cur.opcode} ${cur.operands} pushes the same constant twice — the second push could reuse the first.`,
        replacement: 'dup',
        savings: 1,
      });
      continue;
    }
  }

  return patterns;
}
