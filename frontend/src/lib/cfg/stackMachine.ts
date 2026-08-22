/**
 * JVM stack machine simulator.
 * From "Engineering a Compiler" Ch 8 — Target Code Generation (JVM stack architecture).
 */

import type { BytecodeInstruction } from './bytecodeParser';

/** JVM instruction byte-widths — needed for correct PC advancement. */
function instructionSize(opcode: string): number {
  if (opcode === 'iinc') return 3;
  if (/^invoke/.test(opcode) || /^getstatic|^putstatic|^getfield|^putfield|^new|^checkcast|^instanceof|^multianewarray$/.test(opcode)) return 3;
  if (opcode === 'invokedynamic') return 5;
  if (opcode === 'bipush' || opcode === 'ldc' || opcode === 'ldc2_w') return 2;
  if (opcode === 'sipush') return 3;
  if (/^[ilfdab](load|store)$/.test(opcode)) return 2;
  if (/^(if|goto|jsr)/.test(opcode) || opcode === 'goto' || opcode === 'jsr') return 3;
  return 1;
}

export interface StackState {
  stack: (number | string)[];
  locals: (number | string)[];
  pc: number;
  output: string[];
}

export interface ExecutionStep {
  pc: number;
  opcode: string;
  operands: string;
  beforeStack: (number | string)[];
  afterStack: (number | string)[];
  locals: (number | string)[];
  liveLocals: number[];
  description: string;
  changed: boolean;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  finalState: StackState;
  totalSteps: number;
  maxPressure: number;
}

/** Create initial stack state */
function initialState(maxLocals: number = 1): StackState {
  return {
    stack: [],
    locals: Array(maxLocals).fill(0),
    pc: 0,
    output: [],
  };
}

/**
 * Backward liveness analysis (Ch. 13 — Register Allocation).
 * Returns, for every instruction index, the set of local slots that are
 * live AFTER that instruction executes (values needed by some later use).
 * The size of these sets is the register pressure at that point.
 */
export function computeLiveness(instructions: BytecodeInstruction[]): Map<number, Set<number>> {
  const pcToIndex = new Map<number, number>();
  instructions.forEach((instr, i) => pcToIndex.set(instr.offset, i));

  const liveIn = new Map<number, Set<number>>();
  const liveOut = new Map<number, Set<number>>();
  instructions.forEach((_, i) => {
    liveIn.set(i, new Set());
    liveOut.set(i, new Set());
  });

  const isStore = (opcode: string) => /^[ilfdab]?store_\d$/.test(opcode) || /^[ilfdab]store$/.test(opcode);
  const isLoad = (opcode: string) => /^[ilfdab]?load_\d$/.test(opcode) || /^[ilfdab](lload|aload|fload|dload|load)$/.test(opcode) || opcode === 'iinc';
  const slotFrom = (opcode: string, operands: string): number | null => {
    const m = opcode.match(/(?:load|store)_(\d+)$/);
    if (m) return parseInt(m[1], 10);
    if (opcode === 'iinc') {
      const n = parseInt(operands, 10);
      return Number.isNaN(n) ? null : n;
    }
    if (/^[ilfdab](load|store)$/.test(opcode)) {
      const n = parseInt(operands, 10);
      return Number.isNaN(n) ? null : n;
    }
    return null;
  };
  const usesLocal = (instr: BytecodeInstruction): number | null =>
    isLoad(instr.opcode) ? slotFrom(instr.opcode, instr.operands) : null;
  const definesLocal = (instr: BytecodeInstruction): number | null =>
    isStore(instr.opcode) ? slotFrom(instr.opcode, instr.operands) : null;

  const successors = (i: number): number[] => {
    const instr = instructions[i];
    const succ: number[] = [];
    const parsedTarget = instr.operands ? parseInt(instr.operands, 10) : NaN;
    if (!Number.isNaN(parsedTarget) && (instr.opcode === 'goto' || instr.opcode.startsWith('if'))) {
      const t = pcToIndex.get(parsedTarget);
      if (t !== undefined && t !== i) succ.push(t);
    }
    const unconditional = instr.opcode === 'goto' || instr.opcode === 'athrow' || instr.opcode.includes('return');
    if (!unconditional && i + 1 < instructions.length) succ.push(i + 1);
    return succ;
  };

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = instructions.length - 1; i >= 0; i--) {
      const instr = instructions[i];
      // liveOut[i] = union of liveIn over all successors
      const after = new Set<number>();
      for (const s of successors(i)) {
        for (const v of liveIn.get(s)!) after.add(v);
      }
      // liveIn[i] = use[i] ∪ (liveOut[i] − def[i])
      const before = new Set(after);
      const def = definesLocal(instr);
      if (def !== null) before.delete(def);
      const use = usesLocal(instr);
      if (use !== null) before.add(use);

      const prev = liveOut.get(i)!;
      if (after.size !== prev.size || [...after].some(v => !prev.has(v))) {
        liveOut.set(i, after);
        changed = true;
      }
      liveIn.set(i, before);
    }
  }

  return liveOut;
}

/** Execute bytecode and produce step-by-step trace */
export function simulateExecution(
  instructions: BytecodeInstruction[],
  maxLocals: number = 4,
  maxSteps: number = 200,
): ExecutionTrace {
  const state = initialState(maxLocals);
  const steps: ExecutionStep[] = [];
  const pcMap = new Map<number, number>(); // offset → index in instructions
  instructions.forEach((instr, i) => pcMap.set(instr.offset, i));

  const liveOut = computeLiveness(instructions);
  let maxPressure = 0;
  const stepRecord = (instrIdx: number, beforeStack: (number | string)[], description: string, changed: boolean): ExecutionStep => {
    const liveAfter = [...(liveOut.get(instrIdx) ?? new Set<number>())].sort((a, b) => a - b);
    maxPressure = Math.max(maxPressure, liveAfter.length);
    return {
      pc: instructions[instrIdx].offset,
      opcode: instructions[instrIdx].opcode,
      operands: instructions[instrIdx].operands,
      beforeStack,
      afterStack: [...state.stack],
      locals: [...state.locals],
      liveLocals: liveAfter,
      description,
      changed,
    };
  };

  let stepsExecuted = 0;

  while (stepsExecuted < maxSteps) {
    const instrIdx = pcMap.get(state.pc);
    if (instrIdx === undefined || instrIdx >= instructions.length) break;

    const instr = instructions[instrIdx];
    const beforeStack = [...state.stack];
    let description: string;
    let changed = false;

    switch (instr.opcode) {
      // Push constants
      case 'iconst_0': case 'iconst_1': case 'iconst_2':
      case 'iconst_3': case 'iconst_4': case 'iconst_5':
        state.stack.push(parseInt(instr.opcode.slice(-1)));
        description = `Push ${instr.opcode.slice(-1)} onto stack`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      case 'iconst_m1':
        state.stack.push(-1);
        description = 'Push -1 onto stack';
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      case 'bipush':
        state.stack.push(parseInt(instr.operands) || 0);
        description = `Push ${instr.operands} onto stack`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      case 'sipush':
        state.stack.push(parseInt(instr.operands) || 0);
        description = `Push ${instr.operands} onto stack`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      case 'ldc':
        description = `Load constant ${instr.operands}`;
        state.stack.push(instr.operands);
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;

      // Load/Store locals
      case 'iload_0': case 'iload_1': case 'iload_2': case 'iload_3': {
        const loadIdx = parseInt(instr.opcode.slice(-1));
        state.stack.push(state.locals[loadIdx] ?? 0);
        description = `Load local[${loadIdx}] = ${state.locals[loadIdx] ?? 0}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }
      case 'istore_0': case 'istore_1': case 'istore_2': case 'istore_3': {
        const storeIdx = parseInt(instr.opcode.slice(-1));
        const val = state.stack.pop() ?? 0;
        state.locals[storeIdx] = val;
        description = `Store ${val} to local[${storeIdx}]`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }

      // Arithmetic
      case 'iadd': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const result = (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0);
        state.stack.push(result);
        description = `${a} + ${b} = ${result}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }
      case 'isub': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const result = (typeof a === 'number' ? a : 0) - (typeof b === 'number' ? b : 0);
        state.stack.push(result);
        description = `${a} - ${b} = ${result}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }
      case 'imul': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const result = (typeof a === 'number' ? a : 0) * (typeof b === 'number' ? b : 0);
        state.stack.push(result);
        description = `${a} * ${b} = ${result}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }
      case 'idiv': {
        const b = state.stack.pop() ?? 1;
        const a = state.stack.pop() ?? 0;
        const result = Math.trunc((typeof a === 'number' ? a : 0) / (typeof b === 'number' ? b : 1));
        state.stack.push(result);
        description = `${a} / ${b} = ${result}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }
      case 'ineg': {
        const a = state.stack.pop() ?? 0;
        const result = -(typeof a === 'number' ? a : 0);
        state.stack.push(result);
        description = `-${a} = ${result}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }

      // Branch instructions
      case 'ifeq': case 'ifne': case 'ifge': case 'ifgt': case 'ifle': case 'iflt': {
        const a = state.stack.pop() ?? 0;
        const target = parseInt(instr.operands);
        let branch = false;
        switch (instr.opcode) {
          case 'ifeq': branch = a === 0; break;
          case 'ifne': branch = a !== 0; break;
          case 'ifge': branch = (typeof a === 'number' ? a : 0) >= 0; break;
          case 'ifgt': branch = (typeof a === 'number' ? a : 0) > 0; break;
          case 'ifle': branch = (typeof a === 'number' ? a : 0) <= 0; break;
          case 'iflt': branch = (typeof a === 'number' ? a : 0) < 0; break;
        }
        state.pc = branch ? target : instr.offset + instructionSize(instr.opcode);
        description = `${instr.opcode} ${a} → ${branch ? `goto ${target}` : 'fall through'}`;
        changed = true;
        break;
      }
      case 'if_icmpeq': case 'if_icmpne': case 'if_icmpge': case 'if_icmpgt': case 'if_icmple': case 'if_icmplt': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const target = parseInt(instr.operands);
        let branch = false;
        switch (instr.opcode) {
          case 'if_icmpeq': branch = a === b; break;
          case 'if_icmpne': branch = a !== b; break;
          case 'if_icmpge': branch = (typeof a === 'number' ? a : 0) >= (typeof b === 'number' ? b : 0); break;
          case 'if_icmpgt': branch = (typeof a === 'number' ? a : 0) > (typeof b === 'number' ? b : 0); break;
          case 'if_icmple': branch = (typeof a === 'number' ? a : 0) <= (typeof b === 'number' ? b : 0); break;
          case 'if_icmplt': branch = (typeof a === 'number' ? a : 0) < (typeof b === 'number' ? b : 0); break;
        }
        state.pc = branch ? target : instr.offset + instructionSize(instr.opcode);
        description = `${a} ${instr.opcode.replace('if_icmp', '')} ${b} → ${branch ? `goto ${target}` : 'fall through'}`;
        changed = true;
        break;
      }
      case 'goto':
        state.pc = parseInt(instr.operands);
        description = `Unconditional goto ${instr.operands}`;
        changed = true;
        break;

      // Stack manipulation
      case 'pop':
        state.stack.pop();
        description = 'Pop top value';
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      case 'dup': {
        const top = state.stack[state.stack.length - 1];
        state.stack.push(top);
        description = `Duplicate ${top}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        changed = true;
        break;
      }

      // Method calls (simplified)
      case 'invokestatic': case 'invokevirtual': case 'invokespecial':
        description = `Call ${instr.operands}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        break;

      // Return
      case 'ireturn': case 'areturn': {
        const retVal = state.stack.pop();
        state.output.push(String(retVal));
        description = `Return ${retVal}`;
        state.pc = instr.offset + instructionSize(instr.opcode);
        stepsExecuted++;
        steps.push(stepRecord(instrIdx, beforeStack, description, true));
        // Execution ends on return
        return {
          steps,
          finalState: { ...state },
          totalSteps: stepsExecuted,
          maxPressure,
        };
      }
      case 'return':
        description = 'Return void';
        state.pc = instr.offset + instructionSize(instr.opcode);
        stepsExecuted++;
        steps.push(stepRecord(instrIdx, beforeStack, description, true));
        return {
          steps,
          finalState: { ...state },
          totalSteps: stepsExecuted,
          maxPressure,
        };

      // Default: skip unknown instructions
      default:
        description = instr.opcode;
        state.pc = instr.offset + instructionSize(instr.opcode);
        break;
    }

    steps.push(stepRecord(instrIdx, beforeStack, description, changed));

    stepsExecuted++;
  }

  return {
    steps,
    finalState: state,
    totalSteps: stepsExecuted,
    maxPressure,
  };
}
