export interface SemanticSymbol {
  name: string;
  kind: string;
  type: string;
  scope: string;
  modifiers?: string;
  lexicalLevel?: number;
  category?: string;
  returnType?: string;
  parameters?: string;
}

export interface TypeResolutionEntry {
  symbol: string;
  source: string;
  resolved: boolean;
  fqn?: string;
  type?: string;
  kind?: string;
  returnType?: string;
}

export interface TypeCheckEntry {
  check: string;
  result: 'pass' | 'fail' | 'unknown';
  location: string;
  line: number;
  column: number;
  method?: string;
  variable?: string;
  symbol?: string;
  declaredType?: string;
  returnType?: string;
  targetType?: string;
  initType?: string;
  argumentTypes?: unknown[];
}

export interface SemanticError {
  message: string;
  line: number;
  column: number;
  severity: 'ERROR' | 'WARNING';
  checkId: number;
}
