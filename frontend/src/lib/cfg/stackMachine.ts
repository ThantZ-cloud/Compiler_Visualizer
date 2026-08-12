/**
 * JVM stack machine simulator.
 * From "Engineering a Compiler" Ch 8 — Target Code Generation (JVM stack architecture).
 */

import type { BytecodeInstruction } from './bytecodeParser';

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
  description: string;
  changed: boolean;
}

export interface ExecutionTrace {
  steps: ExecutionStep[];
  finalState: StackState;
  totalSteps: number;
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

  let stepsExecuted = 0;

  while (stepsExecuted < maxSteps) {
    const instrIdx = pcMap.get(state.pc);
    if (instrIdx === undefined || instrIdx >= instructions.length) break;

    const instr = instructions[instrIdx];
    const beforeStack = [...state.stack];
    let description = '';
    let changed = false;

    switch (instr.opcode) {
      // Push constants
      case 'iconst_0': case 'iconst_1': case 'iconst_2':
      case 'iconst_3': case 'iconst_4': case 'iconst_5':
        state.stack.push(parseInt(instr.opcode.slice(-1)));
        description = `Push ${instr.opcode.slice(-1)} onto stack`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      case 'iconst_m1':
        state.stack.push(-1);
        description = 'Push -1 onto stack';
        state.pc = instr.offset + 1;
        changed = true;
        break;
      case 'bipush':
        state.stack.push(parseInt(instr.operands) || 0);
        description = `Push ${instr.operands} onto stack`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      case 'sipush':
        state.stack.push(parseInt(instr.operands) || 0);
        description = `Push ${instr.operands} onto stack`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      case 'ldc':
        description = `Load constant ${instr.operands}`;
        state.stack.push(instr.operands);
        state.pc = instr.offset + 1;
        changed = true;
        break;

      // Load/Store locals
      case 'iload_0': case 'iload_1': case 'iload_2': case 'iload_3':
        const loadIdx = parseInt(instr.opcode.slice(-1));
        state.stack.push(state.locals[loadIdx] ?? 0);
        description = `Load local[${loadIdx}] = ${state.locals[loadIdx] ?? 0}`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      case 'istore_0': case 'istore_1': case 'istore_2': case 'istore_3':
        const storeIdx = parseInt(instr.opcode.slice(-1));
        const val = state.stack.pop() ?? 0;
        state.locals[storeIdx] = val;
        description = `Store ${val} to local[${storeIdx}]`;
        state.pc = instr.offset + 1;
        changed = true;
        break;

      // Arithmetic
      case 'iadd': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const result = (typeof a === 'number' ? a : 0) + (typeof b === 'number' ? b : 0);
        state.stack.push(result);
        description = `${a} + ${b} = ${result}`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      }
      case 'isub': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const result = (typeof a === 'number' ? a : 0) - (typeof b === 'number' ? b : 0);
        state.stack.push(result);
        description = `${a} - ${b} = ${result}`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      }
      case 'imul': {
        const b = state.stack.pop() ?? 0;
        const a = state.stack.pop() ?? 0;
        const result = (typeof a === 'number' ? a : 0) * (typeof b === 'number' ? b : 0);
        state.stack.push(result);
        description = `${a} * ${b} = ${result}`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      }
      case 'idiv': {
        const b = state.stack.pop() ?? 1;
        const a = state.stack.pop() ?? 0;
        const result = Math.trunc((typeof a === 'number' ? a : 0) / (typeof b === 'number' ? b : 1));
        state.stack.push(result);
        description = `${a} / ${b} = ${result}`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      }
      case 'ineg': {
        const a = state.stack.pop() ?? 0;
        const result = -(typeof a === 'number' ? a : 0);
        state.stack.push(result);
        description = `-${a} = ${result}`;
        state.pc = instr.offset + 1;
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
        state.pc = branch ? target : instr.offset + 1;
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
        state.pc = branch ? target : instr.offset + 1;
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
        state.pc = instr.offset + 1;
        changed = true;
        break;
      case 'dup': {
        const top = state.stack[state.stack.length - 1];
        state.stack.push(top);
        description = `Duplicate ${top}`;
        state.pc = instr.offset + 1;
        changed = true;
        break;
      }

      // Method calls (simplified)
      case 'invokestatic': case 'invokevirtual': case 'invokespecial':
        description = `Call ${instr.operands}`;
        state.pc = instr.offset + 1;
        break;

      // Return
      case 'ireturn': case 'areturn': {
        const retVal = state.stack.pop();
        state.output.push(String(retVal));
        description = `Return ${retVal}`;
        state.pc = instr.offset + 1;
        stepsExecuted++;
        steps.push({
          pc: instr.offset,
          opcode: instr.opcode,
          operands: instr.operands,
          beforeStack,
          afterStack: [...state.stack],
          locals: [...state.locals],
          description,
          changed: true,
        });
        // Execution ends on return
        return {
          steps,
          finalState: { ...state },
          totalSteps: stepsExecuted,
        };
      }
      case 'return':
        description = 'Return void';
        state.pc = instr.offset + 1;
        stepsExecuted++;
        steps.push({
          pc: instr.offset,
          opcode: instr.opcode,
          operands: instr.operands,
          beforeStack,
          afterStack: [...state.stack],
          locals: [...state.locals],
          description,
          changed: true,
        });
        return {
          steps,
          finalState: { ...state },
          totalSteps: stepsExecuted,
        };

      // Default: skip unknown instructions
      default:
        description = instr.opcode;
        state.pc = instr.offset + 1;
        break;
    }

    steps.push({
      pc: instr.offset,
      opcode: instr.opcode,
      operands: instr.operands,
      beforeStack,
      afterStack: [...state.stack],
      locals: [...state.locals],
      description,
      changed,
    });

    stepsExecuted++;
  }

  return {
    steps,
    finalState: state,
    totalSteps: stepsExecuted,
  };
}
