package com.compilervisualizer.service;

/**
 * Minimal JSON string escaping for values embedded into hand-built JSON documents
 * (AST / symbol table / CFG error payloads). Escapes backslash, quote, and control
 * characters so embedded newlines and tabs cannot break the surrounding JSON.
 */
final class JsonEscape {

    private JsonEscape() {}

    static String escape(String value) {
        if (value == null) return "";
        StringBuilder sb = new StringBuilder(value.length() + 16);
        for (int i = 0; i < value.length(); i++) {
            char c = value.charAt(i);
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '"' -> sb.append("\\\"");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                case '\b' -> sb.append("\\b");
                case '\f' -> sb.append("\\f");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.toString();
    }

    /** Builds a JSON error object: {"error": "<escaped message>"}. */
    static String errorJson(String message) {
        return "{\"error\": \"" + escape(message) + "\"}";
    }
}