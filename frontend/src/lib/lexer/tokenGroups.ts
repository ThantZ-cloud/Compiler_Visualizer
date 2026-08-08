import type { Token } from '../../types';

// ── Token Group Definitions ──
// 8 grouped categories for a clean NFA diagram

export interface TokenGroupDef {
  name: string;
  /** Display regex pattern (educational, simplified) */
  regexPattern: string;
  /** Hex color for visualization */
  color: string;
  /** Token types from backend that belong to this group */
  matches: (tokenType: string) => boolean;
}

export const TOKEN_GROUP_DEFS: TokenGroupDef[] = [
  {
    name: 'KEYWORD',
    regexPattern: '\\b(public|class|static|void|int|if|else|for|while|return|new|this|import|package|private|protected|final|extends|implements|interface|enum|try|catch|finally|throw|throws|switch|case|break|continue|default|boolean|char|double|float|long|short|byte|null|true|false|instanceof|super|abstract|synchronized|volatile|transient|native|strictfp|assert|goto|const|do)\\b',
    color: '#FF00FF',
    matches: (t) => {
      const keywords = ['KEYWORD', 'RESERVED', 'PRIMITIVE_TYPE'];
      return keywords.some(k => t.toUpperCase().includes(k));
    },
  },
  {
    name: 'IDENTIFIER',
    regexPattern: '[a-zA-Z_$][a-zA-Z0-9_$]*',
    color: '#00FF88',
    matches: (t) => {
      const idents = ['IDENTIFIER', 'NAME', 'ID'];
      return idents.some(k => t.toUpperCase() === k) || t.toUpperCase() === 'IDENTIFIER';
    },
  },
  {
    name: 'STRING',
    regexPattern: '"[^"]*"',
    color: '#FFB000',
    matches: (t) => {
      const strings = ['STRING', 'STRING_LITERAL', 'CHAR_LITERAL', 'CHAR'];
      return strings.some(k => t.toUpperCase().includes(k));
    },
  },
  {
    name: 'NUMBER',
    regexPattern: '[0-9]+(\\.[0-9]+)?([eE][+-]?[0-9]+)?',
    color: '#00D4FF',
    matches: (t) => {
      const nums = ['NUMBER', 'INT_LITERAL', 'LONG_LITERAL', 'DOUBLE_LITERAL', 'FLOAT_LITERAL', 'DECIMAL'];
      return nums.some(k => t.toUpperCase().includes(k));
    },
  },
  {
    name: 'OPERATOR',
    regexPattern: '==|!=|<=|>=|&&|\\|\\||[-+*/=<>&|!^%~?:]',
    color: '#FF3366',
    matches: (t) => {
      const ops = ['OPERATOR', 'OP', 'ASSIGN', 'ARITHMETIC', 'LOGICAL', 'BITWISE', 'RELATIONAL'];
      return ops.some(k => t.toUpperCase().includes(k));
    },
  },
  {
    name: 'SEPARATOR',
    regexPattern: '[(){};,.\\[\\]@]',
    color: '#8888AA',
    matches: (t) => {
      const seps = ['SEPARATOR', 'DELIMITER', 'BRACE', 'BRACKET', 'PAREN', 'SEMICOLON', 'COMMA', 'DOT', 'AT'];
      return seps.some(k => t.toUpperCase().includes(k));
    },
  },
  {
    name: 'WHITESPACE',
    regexPattern: '\\s+',
    color: '#555570',
    matches: (t) => {
      const ws = ['WHITESPACE', 'SPACE', 'NEWLINE', 'TAB'];
      return ws.some(k => t.toUpperCase().includes(k));
    },
  },
  {
    name: 'COMMENT',
    regexPattern: '//.*|/\\*[\\s\\S]*\\*/',
    color: '#262638',
    matches: (t) => {
      const comments = ['COMMENT', 'LINE_COMMENT', 'BLOCK_COMMENT', 'JAVADOC'];
      return comments.some(k => t.toUpperCase().includes(k));
    },
  },
];

/**
 * Analyze tokens from the backend and produce grouped token data.
 * Returns groups with `found` and `count` populated.
 */
export function analyzeTokenGroups(tokens: Token[]): TokenGroupDef[] {
  return TOKEN_GROUP_DEFS.map(def => {
    const matchingTokens = tokens.filter(t => def.matches(t.type));
    return {
      ...def,
      found: matchingTokens.length > 0,
      count: matchingTokens.length,
    };
  });
}

/**
 * Given a token type string, find which group it belongs to.
 */
export function findTokenGroup(tokenType: string): TokenGroupDef | null {
  return TOKEN_GROUP_DEFS.find(def => def.matches(tokenType)) ?? null;
}
