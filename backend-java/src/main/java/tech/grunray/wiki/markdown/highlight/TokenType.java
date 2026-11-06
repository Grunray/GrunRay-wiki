package tech.grunray.wiki.markdown.highlight;

/** Pygments token 类型：{@code name} 如 {@code Token.Name.Builtin}，{@code css} 为 HTML 类名（Text 为空）。 */
public record TokenType(String name, String css) {

    public static final TokenType TEXT = new TokenType("Token.Text", "");
    public static final TokenType WHITESPACE = new TokenType("Token.Text.Whitespace", "w");
    public static final TokenType ERROR = new TokenType("Token.Error", "err");
}
