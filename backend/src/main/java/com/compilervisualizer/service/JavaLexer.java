package com.compilervisualizer.service;

import com.compilervisualizer.dto.TokenDto;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Hand-written lexer for Java source code.
 * Produces a flat list of tokens covering every character in the source.
 */
public class JavaLexer {

    private static final Set<String> KEYWORDS = Set.of(
        "abstract", "assert", "boolean", "break", "byte", "case", "catch", "char",
        "class", "const", "continue", "default", "do", "double", "else", "enum",
        "extends", "final", "finally", "float", "for", "goto", "if", "implements",
        "import", "instanceof", "int", "interface", "long", "native", "new",
        "package", "private", "protected", "public", "return", "short", "static",
        "strictfp", "super", "switch", "synchronized", "this", "throw", "throws",
        "transient", "try", "void", "volatile", "while",
        // literals used as keywords in type positions
        "var", "record", "sealed", "permits", "non-sealed", "yield"
    );

    private static final Set<String> BOOLEAN_LITERALS = Set.of("true", "false");
    private static final Set<String> NULL_LITERAL = Set.of("null");

    private static final Map<String, String> TWO_CHAR_OPERATORS;
    private static final Map<String, String> ONE_CHAR_OPERATORS;
    private static final Map<String, String> SEPARATORS;

    static {
        TWO_CHAR_OPERATORS = new HashMap<>();
        TWO_CHAR_OPERATORS.put("==", "EQ");
        TWO_CHAR_OPERATORS.put("!=", "NE");
        TWO_CHAR_OPERATORS.put("<=", "LE");
        TWO_CHAR_OPERATORS.put(">=", "GE");
        TWO_CHAR_OPERATORS.put("&&", "AND");
        TWO_CHAR_OPERATORS.put("||", "OR");
        TWO_CHAR_OPERATORS.put("<<", "LSHIFT");
        TWO_CHAR_OPERATORS.put(">>", "RSHIFT");
        TWO_CHAR_OPERATORS.put(">>>", "URSHIFT");
        TWO_CHAR_OPERATORS.put("+=", "PLUS_ASSIGN");
        TWO_CHAR_OPERATORS.put("-=", "MINUS_ASSIGN");
        TWO_CHAR_OPERATORS.put("*=", "MULT_ASSIGN");
        TWO_CHAR_OPERATORS.put("/=", "DIV_ASSIGN");
        TWO_CHAR_OPERATORS.put("%=", "MOD_ASSIGN");
        TWO_CHAR_OPERATORS.put("&=", "AND_ASSIGN");
        TWO_CHAR_OPERATORS.put("|=", "OR_ASSIGN");
        TWO_CHAR_OPERATORS.put("^=", "XOR_ASSIGN");
        TWO_CHAR_OPERATORS.put("->", "ARROW");
        TWO_CHAR_OPERATORS.put("::", "METHOD_REF");

        ONE_CHAR_OPERATORS = new HashMap<>();
        ONE_CHAR_OPERATORS.put("+", "PLUS");
        ONE_CHAR_OPERATORS.put("-", "MINUS");
        ONE_CHAR_OPERATORS.put("*", "STAR");
        ONE_CHAR_OPERATORS.put("/", "SLASH");
        ONE_CHAR_OPERATORS.put("%", "MOD");
        ONE_CHAR_OPERATORS.put("&", "AMP");
        ONE_CHAR_OPERATORS.put("|", "PIPE");
        ONE_CHAR_OPERATORS.put("^", "CARET");
        ONE_CHAR_OPERATORS.put("~", "TILDE");
        ONE_CHAR_OPERATORS.put("!", "BANG");
        ONE_CHAR_OPERATORS.put("<", "LT");
        ONE_CHAR_OPERATORS.put(">", "GT");
        ONE_CHAR_OPERATORS.put("=", "ASSIGN");

        SEPARATORS = new HashMap<>();
        SEPARATORS.put("(", "LPAREN");
        SEPARATORS.put(")", "RPAREN");
        SEPARATORS.put("{", "LBRACE");
        SEPARATORS.put("}", "RBRACE");
        SEPARATORS.put("[", "LBRACKET");
        SEPARATORS.put("]", "RBRACKET");
        SEPARATORS.put(";", "SEMICOLON");
        SEPARATORS.put(",", "COMMA");
        SEPARATORS.put(".", "DOT");
        SEPARATORS.put(":", "COLON");
        SEPARATORS.put("@", "AT");
        SEPARATORS.put("...", "ELLIPSIS");
    }

    private final String source;
    private final List<TokenDto> tokens = new ArrayList<>();
    private int pos;
    private int line = 1;
    private int column = 1;
    private int tokenIndex;

    public JavaLexer(String source) {
        this.source = source;
    }

    public List<TokenDto> tokenize() {
        while (pos < source.length()) {
            char c = source.charAt(pos);

            if (c == '\n' || c == '\r') {
                emitWhitespace(c);
            } else if (c == ' ' || c == '\t') {
                emitWhitespace(c);
            } else if (c == '/' && peek() == '/') {
                emitSingleLineComment();
            } else if (c == '/' && peek() == '*') {
                emitMultiLineComment();
            } else if (c == '"') {
                emitStringLiteral();
            } else if (c == '\'') {
                emitCharLiteral();
            } else if (c == '0' && (peek() == 'x' || peek() == 'X')) {
                emitHexLiteral();
            } else if (Character.isDigit(c) || (c == '.' && Character.isDigit(peek()))) {
                emitNumericLiteral();
            } else if (Character.isJavaIdentifierStart(c)) {
                emitIdentifier();
            } else if (isOperatorStart(c)) {
                emitOperator();
            } else if (isSeparator(c)) {
                emitSeparator(c);
            } else {
                // unknown character — emit as-is
                addToken("SEPARATOR", "UNKNOWN", String.valueOf(c), line, column, line, column + 1);
                advance();
            }
        }
        return tokens;
    }

    // --- Whitespace ---

    private void emitWhitespace(char c) {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        while (pos < source.length()) {
            char ch = source.charAt(pos);
            if (ch == ' ' || ch == '\t' || ch == '\n' || ch == '\r') {
                sb.append(ch);
                advance();
            } else {
                break;
            }
        }
        addToken("WHITESPACE", "WHITESPACE", sb.toString(), startLine, startCol, line, column);
    }

    // --- Comments ---

    private void emitSingleLineComment() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        while (pos < source.length() && source.charAt(pos) != '\n') {
            sb.append(source.charAt(pos));
            advance();
        }
        addToken("COMMENT", "LINE_COMMENT", sb.toString(), startLine, startCol, line, column);
    }

    private void emitMultiLineComment() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        sb.append(source.charAt(pos)); advance(); // /
        sb.append(source.charAt(pos)); advance(); // *
        while (pos < source.length()) {
            if (source.charAt(pos) == '*' && peek() == '/') {
                sb.append(source.charAt(pos)); advance(); // *
                sb.append(source.charAt(pos)); advance(); // /
                break;
            }
            sb.append(source.charAt(pos));
            advance();
        }
        addToken("COMMENT", "BLOCK_COMMENT", sb.toString(), startLine, startCol, line, column);
    }

    // --- String Literal ---

    private void emitStringLiteral() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        sb.append(source.charAt(pos)); advance(); // opening "
        while (pos < source.length()) {
            char c = source.charAt(pos);
            if (c == '\\') {
                sb.append(c); advance();
                if (pos < source.length()) {
                    sb.append(source.charAt(pos)); advance();
                }
            } else if (c == '"') {
                sb.append(c); advance();
                break;
            } else {
                sb.append(c);
                advance();
            }
        }
        addToken("LITERAL", "STRING_LITERAL", sb.toString(), startLine, startCol, line, column);
    }

    // --- Char Literal ---

    private void emitCharLiteral() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        sb.append(source.charAt(pos)); advance(); // opening '
        while (pos < source.length()) {
            char c = source.charAt(pos);
            if (c == '\\') {
                sb.append(c); advance();
                if (pos < source.length()) {
                    sb.append(source.charAt(pos)); advance();
                }
            } else if (c == '\'') {
                sb.append(c); advance();
                break;
            } else {
                sb.append(c);
                advance();
            }
        }
        addToken("LITERAL", "CHAR_LITERAL", sb.toString(), startLine, startCol, line, column);
    }

    // --- Numeric Literals ---

    private void emitNumericLiteral() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        boolean isFloat = false;

        while (pos < source.length() && Character.isDigit(source.charAt(pos))) {
            sb.append(source.charAt(pos)); advance();
        }

        // decimal part
        if (pos < source.length() && source.charAt(pos) == '.') {
            isFloat = true;
            sb.append(source.charAt(pos)); advance();
            while (pos < source.length() && Character.isDigit(source.charAt(pos))) {
                sb.append(source.charAt(pos)); advance();
            }
        }

        // exponent
        if (pos < source.length() && (source.charAt(pos) == 'e' || source.charAt(pos) == 'E')) {
            isFloat = true;
            sb.append(source.charAt(pos)); advance();
            if (pos < source.length() && (source.charAt(pos) == '+' || source.charAt(pos) == '-')) {
                sb.append(source.charAt(pos)); advance();
            }
            while (pos < source.length() && Character.isDigit(source.charAt(pos))) {
                sb.append(source.charAt(pos)); advance();
            }
        }

        // suffix
        if (pos < source.length()) {
            char c = source.charAt(pos);
            if (c == 'f' || c == 'F' || c == 'd' || c == 'D') {
                isFloat = true;
                sb.append(c); advance();
            } else if (c == 'l' || c == 'L') {
                sb.append(c); advance();
            }
        }

        String type = isFloat ? "FLOAT_LITERAL" : "INT_LITERAL";
        addToken("LITERAL", type, sb.toString(), startLine, startCol, line, column);
    }

    private void emitHexLiteral() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        sb.append(source.charAt(pos)); advance(); // 0
        sb.append(source.charAt(pos)); advance(); // x/X
        while (pos < source.length() && (Character.isDigit(source.charAt(pos))
               || "abcdefABCDEF".indexOf(source.charAt(pos)) >= 0)) {
            sb.append(source.charAt(pos)); advance();
        }
        // optional suffix
        if (pos < source.length()) {
            char c = source.charAt(pos);
            if (c == 'l' || c == 'L') {
                sb.append(c); advance();
            }
        }
        addToken("LITERAL", "HEX_LITERAL", sb.toString(), startLine, startCol, line, column);
    }

    // --- Identifier / Keyword ---

    private void emitIdentifier() {
        int startLine = line, startCol = column;
        StringBuilder sb = new StringBuilder();
        while (pos < source.length() && Character.isJavaIdentifierPart(source.charAt(pos))) {
            sb.append(source.charAt(pos));
            advance();
        }
        String value = sb.toString();

        if (KEYWORDS.contains(value)) {
            addToken("KEYWORD", value.toUpperCase(), value, startLine, startCol, line, column);
        } else if (BOOLEAN_LITERALS.contains(value)) {
            addToken("LITERAL", "BOOLEAN_LITERAL", value, startLine, startCol, line, column);
        } else if (NULL_LITERAL.contains(value)) {
            addToken("LITERAL", "NULL_LITERAL", value, startLine, startCol, line, column);
        } else {
            addToken("IDENTIFIER", "IDENTIFIER", value, startLine, startCol, line, column);
        }
    }

    // --- Operators ---

    private boolean isOperatorStart(char c) {
        return ONE_CHAR_OPERATORS.containsKey(String.valueOf(c))
            || c == '&' || c == '|' || c == '<' || c == '>';
    }

    private void emitOperator() {
        int startLine = line, startCol = column;
        char c = source.charAt(pos);

        // check three-char operators (>>>)
        if (pos + 2 < source.length()) {
            String three = source.substring(pos, pos + 3);
            if (TWO_CHAR_OPERATORS.containsKey(three)) {
                addToken("OPERATOR", TWO_CHAR_OPERATORS.get(three), three, startLine, startCol, line, column + 3);
                advance(); advance(); advance();
                return;
            }
        }

        // check two-char operators
        if (pos + 1 < source.length()) {
            String two = source.substring(pos, pos + 2);
            if (TWO_CHAR_OPERATORS.containsKey(two)) {
                addToken("OPERATOR", TWO_CHAR_OPERATORS.get(two), two, startLine, startCol, line, column + 2);
                advance(); advance();
                return;
            }
        }

        // single-char operator
        String one = String.valueOf(c);
        String type = ONE_CHAR_OPERATORS.getOrDefault(one, "UNKNOWN");
        addToken("OPERATOR", type, one, startLine, startCol, line, column + 1);
        advance();
    }

    // --- Separators ---

    private boolean isSeparator(char c) {
        return SEPARATORS.containsKey(String.valueOf(c));
    }

    private void emitSeparator(char c) {
        int startLine = line, startCol = column;
        String one = String.valueOf(c);

        // check ... (ellipsis)
        if (c == '.' && pos + 2 < source.length() && source.charAt(pos + 1) == '.' && source.charAt(pos + 2) == '.') {
            addToken("SEPARATOR", "ELLIPSIS", "...", startLine, startCol, line, column + 3);
            advance(); advance(); advance();
            return;
        }

        String type = SEPARATORS.get(one);
        addToken("SEPARATOR", type, one, startLine, startCol, line, column + 1);
        advance();
    }

    // --- Helpers ---

    private char peek() {
        return pos + 1 < source.length() ? source.charAt(pos + 1) : '\0';
    }

    private void advance() {
        if (pos < source.length()) {
            if (source.charAt(pos) == '\n') {
                line++;
                column = 1;
            } else {
                column++;
            }
            pos++;
        }
    }

    private void addToken(String category, String type, String value,
                           int startLine, int startCol, int endLine, int endCol) {
        tokens.add(TokenDto.builder()
            .index(tokenIndex++)
            .category(category)
            .type(type)
            .value(value)
            .line(startLine)
            .column(startCol)
            .endLine(endLine)
            .endColumn(endCol)
            .length(value.length())
            .build());
    }
}
