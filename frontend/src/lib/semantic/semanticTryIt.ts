export const SEMANTIC_TRYIT_PRESETS = [
  'int x = 1;\n{ int y = x; }',
  'int x = 1;\nString s = 1; // type error',
  'class A { int x; void m() { int y = x; } }',
  'int a = b * 2 + c;',
] as const;

function nextId() {
  let id = 0;
  return () => id++;
}

export function buildSemanticTryItData(code: string): string {
  const hasError = code.includes('String s = 1') || code.includes('String s=1');
  const hasShadow = code.includes('{') && code.includes('int y');
  const hasClass = code.includes('class');
  const next = nextId();
  const packageNode: any = {
    name: '(default package)',
    kind: 'package',
    scopeId: next(),
    children: [],
  };

  if (hasClass) {
    const className = (code.match(/class\s+(\w+)/) || (['','A'] as unknown as RegExpMatchArray))[1];
    const classNode: any = { name: className, kind: 'class', scopeId: next(), children: [] };
    const methodNode: any = { name: 'm()', kind: 'method', returnType: 'void', modifiers: '', scopeId: next(), children: [] };
    methodNode.children.push({ name: 'x', kind: 'variable', type: 'int', scopeId: next() });
    if (hasShadow) {
      const block: any = { name: '{ block }', kind: 'block', scopeId: next(), children: [{ name: 'y', kind: 'variable', type: 'int', scopeId: next() }] };
      methodNode.children.push(block);
    }
    if (hasError) {
      methodNode.children.push({ name: 's', kind: 'variable', type: 'String', scopeId: next() });
    }
    classNode.children.push(methodNode);
    packageNode.children.push(classNode);
  } else {
    // simple script level - fake a class wrapper for visualization
    const fakeClass: any = { name: 'TryIt', kind: 'class', scopeId: next(), children: [] };
    const fakeMethod: any = { name: 'main()', kind: 'method', returnType: 'void', scopeId: next(), children: [] };
    // parse simple var decls like "int x = 1;"
    const decls = [...code.matchAll(/(int|String|boolean|double)\s+(\w+)\s*(=\s*[^;]+)?;/g)];
    for (const m of decls) {
      const type = m[1];
      const name = m[2];
      fakeMethod.children.push({ name, kind: 'variable', type, scopeId: next() });
    }
    if (decls.length === 0) {
      fakeMethod.children.push({ name: 'x', kind: 'variable', type: 'int', scopeId: next() });
    }
    if (hasShadow && !hasClass) {
      const block: any = { name: '{ block }', kind: 'block', scopeId: next(), children: [{ name: 'y', kind: 'variable', type: 'int', scopeId: next() }] };
      fakeMethod.children.push(block);
    }
    fakeClass.children.push(fakeMethod);
    packageNode.children.push(fakeClass);
  }

  const symbols: any[] = [];
  function collect(n: any, path: string) {
    const cur = path ? `${path}.${n.name}` : n.name;
    if (['variable','parameter','field','method'].includes(n.kind)) {
      symbols.push({ name: n.name, kind: n.kind, type: n.type || n.returnType || '', scope: path, modifiers: n.modifiers || '' });
    }
    (n.children || []).forEach((c: any) => collect(c, cur));
  }
  collect(packageNode, '');

  const typeResolution = [
    { symbol: 'System', resolved: true, fqn: 'java.lang.System', kind: 'class' },
    { symbol: 'System.out', resolved: true, fqn: 'java.lang.System.out', type: 'java.io.PrintStream', kind: 'field' },
  ];
  if (code.includes('System.out.println')) {
    typeResolution.push({ symbol: 'System.out.println', resolved: true, fqn: 'java.io.PrintStream.println(String)', type: 'void', kind: 'method' });
  }

  const typeChecks: any[] = [];
  const errors: any[] = [];
  if (hasError) {
    typeChecks.push({ check: 'variable_declaration', variable: 's', declaredType: 'String', initType: 'int', initValue: '1', result: 'fail', location: '2:12', line: 2, column: 12 });
    errors.push({ message: 'Incompatible types: String cannot be converted from int', line: 2, column: 12, severity: 'ERROR', checkId: 0 });
  } else if (code.includes('int x')) {
    typeChecks.push({ check: 'variable_declaration', variable: 'x', declaredType: 'int', initType: 'int', initValue: '1', result: 'pass', location: '1:1', line: 1, column: 1 });
  }

  const root: any = {
    scopeTree: packageNode,
    symbols,
    typeResolution,
    typeChecks,
    errors,
    package: '(default package)',
    imports: [],
    types: [],
  };
  return JSON.stringify(root);
}
