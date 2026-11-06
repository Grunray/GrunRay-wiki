package tech.grunray.wiki.markdown.highlight;

import java.util.List;
import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Python-Markdown {@code codehilite}（{@code guess_lang=False}、{@code cssclass=codehilite}、{@code wrapcode=True}）
 * 加 Pygments {@code HtmlFormatter} 的输出。不认识的语言按 Pygments 的 text 输出（无高亮）。
 */
public final class CodeHilite {

    private static final Logger log = LoggerFactory.getLogger(CodeHilite.class);

    /** codehilite {@code _parseHeader}：首行 {@code :::lang} 或 {@code #!lang}。 */
    private static final Pattern HEADER = Pattern.compile(
            "(?:(?:^::+)|(?<shebang>^[#]!))(?<path>(?:/\\w+)*[/ ])?(?<lang>[\\w#.+-]*)\\s*"
                    + "(hl_lines=(?<quot>\"|')(?<hllines>.*?)\\k<quot>)?",
            Pattern.UNICODE_CHARACTER_CLASS);

    private final LexerRegistry lexers;

    public CodeHilite(LexerRegistry lexers) {
        this.lexers = lexers;
    }

    /**
     * @param shebang 缩进代码块为 true（解析首行语言头），围栏代码块为 false
     */
    public String hilite(String src, String lang, boolean shebang) {
        String code = stripNewlines(src);
        if (lang == null && shebang) {
            int nl = code.indexOf('\n');
            String first = nl < 0 ? code : code.substring(0, nl);
            String rest = nl < 0 ? "" : code.substring(nl + 1);
            Matcher m = HEADER.matcher(first);
            if (m.find()) {
                lang = m.group("lang").toLowerCase(Locale.ROOT);
                if (m.group("path") != null) {
                    rest = code;
                } else if (m.group("shebang") != null) {
                    // Python 此时会打开行号（表格布局）；Java 未实现，按无行号输出
                    log.warn("codehilite shebang line numbers are not supported: {}", first);
                }
                code = stripNewlines(rest);
            }
        }
        RegexLexer lexer = lexers.byAlias(lang).orElse(null);
        if (lexer == null && lang != null && !lang.isEmpty() && !lang.equalsIgnoreCase("text")) {
            log.debug("no lexer for language '{}', rendering as text", lang);
        }
        String text = preprocess(code);
        List<RegexLexer.Token> tokens = lexer == null
                ? List.of(new RegexLexer.Token(TEXT, text))
                : lexer.tokens(text);
        return "<div class=\"codehilite\"><pre><span></span><code>" + formatLines(tokens) + "</code></pre></div>\n";
    }

    static final RegexLexer.TokenType TEXT = new RegexLexer.TokenType("Token.Text", "");

    /** {@code Lexer._preprocess_lexer_input}：去 BOM、统一换行、{@code strip('\n')}、补结尾换行。 */
    static String preprocess(String text) {
        if (text.startsWith("\uFEFF")) {
            text = text.substring(1);
        }
        text = text.replace("\r\n", "\n").replace('\r', '\n');
        text = stripNewlines(text);
        if (!text.endsWith("\n")) {
            text += "\n";
        }
        return text;
    }

    static String stripNewlines(String s) {
        int start = 0;
        int end = s.length();
        while (start < end && s.charAt(start) == '\n') {
            start++;
        }
        while (end > start && s.charAt(end - 1) == '\n') {
            end--;
        }
        return s.substring(start, end);
    }

    /** {@code HtmlFormatter._format_lines}：同类相邻 token 合并成一个 span，跨行的 span 在行尾闭合。 */
    static String formatLines(List<RegexLexer.Token> tokens) {
        StringBuilder out = new StringBuilder();
        StringBuilder line = new StringBuilder();
        String lspan = "";
        for (RegexLexer.Token token : tokens) {
            String css = token.type().css();
            String cspan = css.isEmpty() ? "" : "<span class=\"" + css + "\">";
            String[] parts = escape(token.value()).split("\n", -1);
            for (int i = 0; i < parts.length - 1; i++) {
                String part = parts[i];
                if (!line.isEmpty()) {
                    if (!lspan.equals(cspan) && !part.isEmpty()) {
                        line.append(lspan.isEmpty() ? "" : "</span>").append(cspan).append(part)
                                .append(cspan.isEmpty() ? "" : "</span>").append('\n');
                    } else {
                        line.append(part).append(lspan.isEmpty() ? "" : "</span>").append('\n');
                    }
                    out.append(line);
                    line.setLength(0);
                } else if (!part.isEmpty()) {
                    out.append(cspan).append(part).append(cspan.isEmpty() ? "" : "</span>").append('\n');
                } else {
                    out.append('\n');
                }
            }
            String last = parts[parts.length - 1];
            if (!line.isEmpty() && !last.isEmpty()) {
                if (!lspan.equals(cspan)) {
                    line.append(lspan.isEmpty() ? "" : "</span>").append(cspan).append(last);
                    lspan = cspan;
                } else {
                    line.append(last);
                }
            } else if (!last.isEmpty()) {
                line.setLength(0);
                line.append(cspan).append(last);
                lspan = cspan;
            }
        }
        if (!line.isEmpty()) {
            line.append(lspan.isEmpty() ? "" : "</span>").append('\n');
            out.append(line);
        }
        return out.toString();
    }

    private static String escape(String s) {
        StringBuilder sb = new StringBuilder(s.length() + 16);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '&' -> sb.append("&amp;");
                case '<' -> sb.append("&lt;");
                case '>' -> sb.append("&gt;");
                case '"' -> sb.append("&quot;");
                case '\'' -> sb.append("&#39;");
                default -> sb.append(c);
            }
        }
        return sb.toString();
    }
}
