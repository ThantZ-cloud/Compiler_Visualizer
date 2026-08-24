/* eslint-disable @typescript-eslint/no-explicit-any */
import type { CfgMethod } from '../../types';

export const CFG_TRYIT_PRESETS = [
  'int s=0; for(int i=0;i<n;i++) s+=a[i];',
  'if (x>0) y=1; else y=2;',
  'while(n>0) n--;',
  'int max = a>b?a:b;',
] as const;

export function buildCfgTryItData(code: string): { methods: CfgMethod[]; cfgJson: string } {
  const isLoop = code.includes('for(') || code.includes('while(');
  const isBranch = code.includes('if (');
  const isMax = code.includes('a>b?a:b');

  let method: CfgMethod;
  if (isLoop) {
    method = {
      name: 'main',
      declaringType: 'TryIt',
      returnType: 'void',
      kind: 'method',
      parameters: [],
      blocks: [
        { id: 0, label: 'entry', type: 'entry', statements: ['s=0','i=0'] },
        { id: 1, label: 'loop.cond', type: 'condition', statements: ['i < n'] },
        { id: 2, label: 'loop.body', type: 'body', statements: ['s += a[i]','i++'] },
        { id: 3, label: 'exit', type: 'exit', statements: ['return'] },
      ],
      edges: [
        { from: 0, to: 1, label: '' },
        { from: 1, to: 2, label: 'true' },
        { from: 1, to: 3, label: 'false' },
        { from: 2, to: 1, label: 'loop' },
      ],
    };
  } else if (isBranch) {
    method = {
      name: 'main',
      declaringType: 'TryIt',
      returnType: 'void',
      kind: 'method',
      parameters: [],
      blocks: [
        { id: 0, label: 'entry', type: 'entry', statements: ['x>0?'] },
        { id: 1, label: 'then', type: 'then', statements: ['y=1'] },
        { id: 2, label: 'else', type: 'else', statements: ['y=2'] },
        { id: 3, label: 'exit', type: 'exit', statements: ['return'] },
      ],
      edges: [
        { from: 0, to: 1, label: 'true' },
        { from: 0, to: 2, label: 'false' },
        { from: 1, to: 3, label: '' },
        { from: 2, to: 3, label: '' },
      ],
    };
  } else if (isMax) {
    method = {
      name: 'max',
      declaringType: 'TryIt',
      returnType: 'int',
      kind: 'method',
      parameters: ['int a','int b'],
      blocks: [
        { id: 0, label: 'entry', type: 'entry', statements: ['a>b?'] },
        { id: 1, label: 'then', type: 'then', statements: ['return a'] },
        { id: 2, label: 'else', type: 'else', statements: ['return b'] },
      ],
      edges: [
        { from: 0, to: 1, label: 'true' },
        { from: 0, to: 2, label: 'false' },
      ],
    };
  } else {
    method = {
      name: 'main',
      declaringType: 'TryIt',
      returnType: 'void',
      kind: 'method',
      parameters: [],
      blocks: [
        { id: 0, label: 'B0', type: 'entry', statements: [code.slice(0, 30)] },
        { id: 1, label: 'B1', type: 'exit', statements: ['return'] },
      ],
      edges: [{ from: 0, to: 1, label: '' }],
    };
  }

  const cfgJson = JSON.stringify({ methods: [method] });
  return { methods: [method], cfgJson };
}
