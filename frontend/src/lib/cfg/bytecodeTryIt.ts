/* eslint-disable @typescript-eslint/no-explicit-any */
export const BYTECODE_TRYIT_PRESETS = [
  'int add(int a,int b){return a+b;}',
  'int mul(int a,int b){return a*b;}',
  'int max(int a,int b){if(a>b) return a; else return b;}',
  'void loop(){int s=0; for(int i=0;i<10;i++) s+=i;}',
] as const;

export function buildBytecodeTryItData(code: string): { bytecode: string; methodsCount: number } {
  const isAdd = code.includes('return a+b') || code.includes('return a + b');
  const isMul = code.includes('return a*b') || code.includes('return a * b');
  const isMax = code.includes('if(a>b)') || code.includes('if (a > b)');
  const isLoop = code.includes('for(');

  if (isAdd) {
    return {
      bytecode: `Classfile TryIt\n  minor version: 0\n  major version: 61\n\npublic int add(int,int);\n  Code:\n   0: iload_1\n   1: iload_2\n   2: iadd\n   3: ireturn`,
      methodsCount: 1,
    };
  }
  if (isMul) {
    return {
      bytecode: `Classfile TryIt\npublic int mul(int,int);\n  Code:\n   0: iload_1\n   1: iload_2\n   2: imul\n   3: ireturn`,
      methodsCount: 1,
    };
  }
  if (isMax) {
    return {
      bytecode: `Classfile TryIt\npublic int max(int,int);\n  Code:\n   0: iload_1\n   1: iload_2\n   2: if_icmple     7\n   5: iload_1\n   6: ireturn\n   7: iload_2\n   8: ireturn`,
      methodsCount: 1,
    };
  }
  if (isLoop) {
    return {
      bytecode: `Classfile TryIt\npublic void loop();\n  Code:\n   0: iconst_0\n   1: istore_1\n   2: iconst_0\n   3: istore_2\n   4: iload_2\n   5: bipush        10\n   7: if_icmpge     20\n  10: iload_1\n  11: iload_2\n  12: iadd\n  13: istore_1\n  14: iinc          2, 1\n  17: goto          4\n  20: return`,
      methodsCount: 1,
    };
  }
  return {
    bytecode: `Classfile TryIt\npublic void main();\n  Code:\n   0: iconst_1\n   1: istore_1\n   2: return`,
    methodsCount: 1,
  };
}
