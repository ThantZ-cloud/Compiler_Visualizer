import type { CodeGenerationData, TacInstruction, BasicBlockInfo } from '../../types';

export const CODEGEN_TRYIT_PRESETS = [
  'int a = b * 2 + c * d;',
  'int x = a + b * c;',
  'if (a > 10) a = a - 1;',
  'int s = 0; for (int i=0;i<n;i++) s += a[i];',
] as const;

function mkInstr(line: number, op: string, result: string | null, arg1: string | null, operator: string | null, arg2: string | null, target: string | null, comment: string | null): TacInstruction {
  return { line, op, result, arg1, operator, arg2, target, comment, sourceLine: 0 };
}

export function buildCodegenTryItData(code: string): CodeGenerationData {
  const isBranch = code.includes('if (');
  const isLoop = code.includes('for (');

  let instructions: TacInstruction[];
  let basicBlocks: BasicBlockInfo[];

  if (code.includes('b * 2 + c * d')) {
    instructions = [
      mkInstr(0, 'method_start', 'TryIt.main', 'TryIt', null, null, null, null),
      mkInstr(1, 'binary', 't1', 'b', '*', '2', null, 'b * 2'),
      mkInstr(2, 'binary', 't2', 'c', '*', 'd', null, 'c * d'),
      mkInstr(3, 'binary', 't3', 't1', '+', 't2', null, 't1 + t2'),
      mkInstr(4, 'assign', 'a', 't3', null, null, null, 'a = t3'),
      mkInstr(5, 'return', null, null, null, null, null, null),
      mkInstr(6, 'method_end', 'TryIt.main', null, null, null, null, null),
    ];
    basicBlocks = [
      { id: 0, label: 'B0', type: 'entry', instructions: [0,1,2,3,4,5], edges: [] },
    ];
  } else if (code.includes('a + b * c')) {
    instructions = [
      mkInstr(0, 'method_start', 'TryIt.main', 'TryIt', null, null, null, null),
      mkInstr(1, 'binary', 't1', 'b', '*', 'c', null, 'b * c'),
      mkInstr(2, 'binary', 't2', 'a', '+', 't1', null, 'a + t1'),
      mkInstr(3, 'assign', 'x', 't2', null, null, null, 'store'),
      mkInstr(4, 'return', null, null, null, null, null, null),
      mkInstr(5, 'method_end', 'TryIt.main', null, null, null, null, null),
    ];
    basicBlocks = [{ id: 0, label: 'B0', type: 'entry', instructions: [0,1,2,3,4], edges: [] }];
  } else if (isBranch) {
    instructions = [
      mkInstr(0, 'method_start', 'TryIt.main', 'TryIt', null, null, null, null),
      mkInstr(1, 'binary', 't1', 'a', '>', '10', null, 'a > 10'),
      mkInstr(2, 'iffalse', null, 't1', null, null, 'L1', 'branch'),
      mkInstr(3, 'binary', 't2', 'a', '-', '1', null, 'a - 1'),
      mkInstr(4, 'assign', 'a', 't2', null, null, null, null),
      mkInstr(5, 'label', 'L1', null, null, null, null, null),
      mkInstr(6, 'return', null, null, null, null, null, null),
      mkInstr(7, 'method_end', 'TryIt.main', null, null, null, null, null),
    ];
    basicBlocks = [
      { id: 0, label: 'B0', type: 'entry', instructions: [0,1,2], edges: [{ targetBlockId: 1, kind: 'fallthrough', label: 'true' }, { targetBlockId: 2, kind: 'branch', label: 'false' }] },
      { id: 1, label: 'B1', type: 'then', instructions: [3,4], edges: [{ targetBlockId: 2, kind: 'goto', label: null }] },
      { id: 2, label: 'B2', type: 'exit', instructions: [5,6], edges: [] },
    ];
  } else if (isLoop) {
    instructions = [
      mkInstr(0, 'method_start', 'TryIt.main', 'TryIt', null, null, null, null),
      mkInstr(1, 'assign', 's', '0', null, null, null, null),
      mkInstr(2, 'assign', 'i', '0', null, null, null, null),
      mkInstr(3, 'label', 'L0', null, null, null, null, null),
      mkInstr(4, 'binary', 't1', 'i', '<', 'n', null, null),
      mkInstr(5, 'iffalse', null, 't1', null, null, 'L1', null),
      mkInstr(6, 'binary', 't2', 'a', '[]', 'i', null, 'a[i]'),
      mkInstr(7, 'binary', 't3', 's', '+', 't2', null, null),
      mkInstr(8, 'assign', 's', 't3', null, null, null, null),
      mkInstr(9, 'binary', 't4', 'i', '+', '1', null, null),
      mkInstr(10, 'assign', 'i', 't4', null, null, null, null),
      mkInstr(11, 'goto', null, null, null, null, 'L0', null),
      mkInstr(12, 'label', 'L1', null, null, null, null, null),
      mkInstr(13, 'return', null, null, null, null, null, null),
      mkInstr(14, 'method_end', 'TryIt.main', null, null, null, null, null),
    ];
    basicBlocks = [
      { id: 0, label: 'B0', type: 'entry', instructions: [0,1,2], edges: [{ targetBlockId: 1, kind: 'goto', label: null }] },
      { id: 1, label: 'B1', type: 'loop_header', instructions: [3,4,5], edges: [{ targetBlockId: 2, kind: 'fallthrough', label: 'true' }, { targetBlockId: 3, kind: 'branch', label: 'false' }] },
      { id: 2, label: 'B2', type: 'loop_body', instructions: [6,7,8,9,10,11], edges: [{ targetBlockId: 1, kind: 'loop_back', label: null }] },
      { id: 3, label: 'B3', type: 'exit', instructions: [12,13], edges: [] },
    ];
  } else {
    // generic fallback: single assign
    instructions = [
      mkInstr(0, 'method_start', 'TryIt.main', 'TryIt', null, null, null, null),
      mkInstr(1, 'assign', 'x', '1', null, null, null, null),
      mkInstr(2, 'return', null, null, null, null, null, null),
      mkInstr(3, 'method_end', 'TryIt.main', null, null, null, null, null),
    ];
    basicBlocks = [{ id: 0, label: 'B0', type: 'entry', instructions: [0,1,2], edges: [] }];
  }

  return {
    className: 'TryIt',
    packageName: '',
    instructions,
    basicBlocks,
    totalInstructions: instructions.length,
    totalBlocks: basicBlocks.length,
    totalEdges: basicBlocks.reduce((a, b) => a + b.edges.length, 0),
  };
}
