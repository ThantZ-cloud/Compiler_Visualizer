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
