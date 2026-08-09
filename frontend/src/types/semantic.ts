export interface SemanticSymbol {
  name: string;
  kind: string;
  type: string;
  scope: string;
  modifiers?: string;
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
  [key: string]: any;
}

export interface SemanticError {
  message: string;
  line: number;
  column: number;
  severity: 'ERROR' | 'WARNING';
  checkId: number;
}
