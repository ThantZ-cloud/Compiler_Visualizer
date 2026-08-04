// Shared pastel light syntax palette for tokens across every visualization
// (token charts, token flow, AST canvas, studio reveal views). Soft-cool tones
// chosen to stay legible on white cards.

const TOKEN_COLORS: Record<string, string> = {
  KEYWORD: '#0F766E',          // soft teal
  TYPE: '#0E7490',             // teal-cyan
  IDENTIFIER: '#6366F1',       // indigo (variables)
  STRING_LITERAL: '#8B5CF6',   // muted purple
  CHAR_LITERAL: '#8B5CF6',
  INTEGER_LITERAL: '#059669',  // soft green
  LONG_LITERAL: '#059669',
  FLOAT_LITERAL: '#059669',
  DOUBLE_LITERAL: '#059669',
  BOOLEAN_LITERAL: '#DB2777',  // muted pink
  NULL_LITERAL: '#DB2777',
  SEPARATOR: '#64748B',        // cool gray
  OPERATOR: '#64748B',
  WHITESPACE: '#94A3B8',
  LINE_COMMENT: '#94A3B8',
  BLOCK_COMMENT: '#94A3B8',
  JAVADOC_COMMENT: '#94A3B8',
  ANNOTATION: '#D97706',       // amber
};

const DEFAULT_COLOR = '#6366F1';

export function getTokenColor(type: string): string {
  const upper = type.toUpperCase();
  for (const [key, color] of Object.entries(TOKEN_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return DEFAULT_COLOR;
}
