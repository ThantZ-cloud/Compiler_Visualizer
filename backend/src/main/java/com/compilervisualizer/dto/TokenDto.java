package com.compilervisualizer.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TokenDto {

    private int index;
    private String category;  // KEYWORD, IDENTIFIER, LITERAL, OPERATOR, SEPARATOR, COMMENT, WHITESPACE
    private String type;      // specific type: "IF", "INT_LITERAL", "PLUS", "LPAREN", etc.
    private String value;
    private int line;
    private int column;
    private int endLine;
    private int endColumn;
    private int length;
}
