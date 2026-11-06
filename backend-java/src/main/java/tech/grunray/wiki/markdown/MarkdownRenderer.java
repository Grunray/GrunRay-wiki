package tech.grunray.wiki.markdown;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.stereotype.Component;

import com.vladsch.flexmark.ast.Code;
import com.vladsch.flexmark.ast.Heading;
import com.vladsch.flexmark.ast.HtmlEntity;
import com.vladsch.flexmark.ast.Image;
import com.vladsch.flexmark.ast.IndentedCodeBlock;
import com.vladsch.flexmark.ast.OrderedList;
import com.vladsch.flexmark.ast.Paragraph;
import com.vladsch.flexmark.ast.Text;
import com.vladsch.flexmark.ext.tables.TableCell;
import com.vladsch.flexmark.ext.tables.TableRow;
import com.vladsch.flexmark.ext.tables.TablesExtension;
import com.vladsch.flexmark.html.AttributeProvider;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.html.IndependentAttributeProviderFactory;
import com.vladsch.flexmark.html.renderer.AttributablePart;
import com.vladsch.flexmark.html.renderer.LinkResolverContext;
import com.vladsch.flexmark.html.renderer.NodeRenderer;
import com.vladsch.flexmark.html.renderer.NodeRenderingHandler;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.parser.ParserEmulationProfile;
import com.vladsch.flexmark.util.ast.Node;
import com.vladsch.flexmark.util.data.MutableDataSet;
import com.vladsch.flexmark.util.html.MutableAttributes;

import tech.grunray.wiki.common.PythonCompat;
import tech.grunray.wiki.markdown.highlight.CodeHilite;
import tech.grunray.wiki.markdown.highlight.LexerRegistry;

/**
 * Flask {@code app/markdown_util.py#render_markdown_to_html} 的 Java 版：
 * Python-Markdown 3（fenced_code、codehilite、tables、nl2br、~~删除线~~）+ Pygments 2。
 * 输出以 DOM 等价为验收口径（见 backend-java 的 MarkdownSnapshotTest）。
 */
@Component
public class MarkdownRenderer {

    /** Python-Markdown {@code FencedBlockPreprocessor.FENCED_BLOCK_RE}（MULTILINE | DOTALL）。 */
    private static final Pattern FENCED_BLOCK = Pattern.compile(
            "(?<fence>^(?:~{3,}|`{3,}))[ ]*"
                    + "((\\{(?<attrs>[^\\n]*)\\})|"
                    + "(\\.?(?<lang>[\\w#.+-]*)[ ]*)?"
                    + "(hl_lines=(?<quot>\"|')(?<hllines>.*?)\\k<quot>[ ]*)?)"
                    + "\\n"
                    + "(?<code>.*?)(?<=\\n)"
                    + "\\k<fence>[ ]*$",
            Pattern.MULTILINE | Pattern.DOTALL | Pattern.UNIX_LINES | Pattern.UNICODE_CHARACTER_CLASS);

    private static final Pattern SPACE_ONLY_LINE = Pattern.compile("(?<=\\n) +\\n");
    private static final String STX = "\u0002";
    private static final String ETX = "\u0003";
    private static final Pattern PLACEHOLDER = Pattern.compile("\u0002grunray:(\\d+)\u0003");

    private final CodeHilite hilite;
    private final Parser parser;
    private final HtmlRenderer renderer;

    public MarkdownRenderer() {
        this(new CodeHilite(LexerRegistry.loadDefault()));
    }

    MarkdownRenderer(CodeHilite hilite) {
        this.hilite = hilite;
        MutableDataSet options = new MutableDataSet();
        // Python-Markdown：子列表要缩进满 4 格；不足 4 格、或换了列表符号，都算同一列表的下一项
        options.setFrom(ParserEmulationProfile.FIXED_INDENT);
        options.set(Parser.LISTS_ITEM_TYPE_MISMATCH_TO_NEW_LIST, false);
        options.set(Parser.LISTS_ITEM_TYPE_MISMATCH_TO_SUB_LIST, false);
        options.set(Parser.LISTS_DELIMITER_MISMATCH_TO_NEW_LIST, false);
        options.set(Parser.LISTS_ORDERED_ITEM_DOT_ONLY, true);
        // 隔空行接上的项与它前一项包 <p>，同一块里后续项仍紧凑（OListProcessor 的 looselist 状态）
        options.set(Parser.LISTS_LOOSE_WHEN_PREV_HAS_TRAILING_BLANK_LINE, true);
        options.set(Parser.EXTENSIONS, List.of(TablesExtension.create(), StrikethroughExtension.create()));
        // 围栏由 extractFences 按 Python 的正则预先取走；剩下的（如缩进的围栏）Python 当普通文本
        options.set(Parser.FENCED_CODE_BLOCK_PARSER, false);
        options.set(Parser.HEADING_NO_ATX_SPACE, true);
        options.set(HtmlRenderer.SOFT_BREAK, "<br />\n");
        options.set(TablesExtension.MIN_SEPARATOR_DASHES, 1);
        options.set(TablesExtension.APPEND_MISSING_COLUMNS, true);
        options.set(TablesExtension.DISCARD_EXTRA_COLUMNS, true);
        options.set(TablesExtension.HEADER_SEPARATOR_COLUMN_MATCH, false);
        this.parser = Parser.builder(options).build();
        this.renderer = HtmlRenderer.builder(options)
                .nodeRendererFactory(opts -> new CodeBlockRenderer())
                .attributeProviderFactory(new IndependentAttributeProviderFactory() {
                    @Override
                    public AttributeProvider apply(LinkResolverContext context) {
                        return new PythonMarkdownAttributes();
                    }
                })
                .build();
    }

    public String render(String markdown) {
        List<String> stash = new ArrayList<>();
        String text = normalizeWhitespace(markdown == null ? "" : markdown);
        text = extractFences(text, stash);
        Node document = parser.parse(text);
        stripParagraphStarts(document);
        String html = renderer.render(document);
        html = restore(html, stash);
        return html.strip();
    }

    /**
     * Python-Markdown {@code ParagraphProcessor} 对段落做 {@code block.lstrip()}：段首的 U+00A0、U+3000
     * 等 Unicode 空白也会被去掉，CommonMark 只去空格和 Tab。
     */
    private static void stripParagraphStarts(Node document) {
        List<Paragraph> paragraphs = new ArrayList<>();
        for (Node node : document.getDescendants()) {
            if (node instanceof Paragraph p) {
                paragraphs.add(p);
            }
        }
        for (Paragraph paragraph : paragraphs) {
            Node child = paragraph.getFirstChild();
            while (child instanceof Text text) {
                String original = text.getChars().toString();
                String stripped = PythonCompat.lstrip(original);
                if (!stripped.isEmpty()) {
                    if (stripped.length() != original.length()) {
                        text.setChars(text.getChars().subSequence(original.length() - stripped.length()));
                    }
                    break;
                }
                Node next = child.getNext();
                child.unlink();
                child = next;
            }
        }
    }

    /** Python-Markdown {@code NormalizeWhitespace} 预处理。 */
    static String normalizeWhitespace(String source) {
        String s = source.replace(STX, "").replace(ETX, "");
        s = s.replace("\r\n", "\n").replace('\r', '\n') + "\n\n";
        s = expandTabs(s, 4);
        return SPACE_ONLY_LINE.matcher(s).replaceAll("\n");
    }

    /** Python {@code str.expandtabs}：列号遇到换行归零。 */
    static String expandTabs(String s, int size) {
        if (s.indexOf('\t') < 0) {
            return s;
        }
        StringBuilder sb = new StringBuilder(s.length() + 16);
        int col = 0;
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c == '\t') {
                int spaces = size - (col % size);
                sb.append(" ".repeat(spaces));
                col += spaces;
            } else {
                sb.append(c);
                col = (c == '\n' || c == '\r') ? 0 : col + 1;
            }
        }
        return sb.toString();
    }

    private String extractFences(String text, List<String> stash) {
        int index = 0;
        while (true) {
            Matcher m = FENCED_BLOCK.matcher(text);
            if (!m.find(index)) {
                return text;
            }
            String lang = null;
            if (m.group("attrs") != null) {
                // {.lang} 属性写法：取第一个 .class 作语言
                Matcher cls = Pattern.compile("\\.([\\w#.+-]+)").matcher(m.group("attrs"));
                if (cls.find()) {
                    lang = cls.group(1);
                }
            } else if (m.group("lang") != null && !m.group("lang").isEmpty()) {
                lang = m.group("lang");
            }
            String placeholder = STX + "grunray:" + stash.size() + ETX;
            stash.add(hilite.hilite(m.group("code"), lang, false));
            text = text.substring(0, m.start()) + "\n" + placeholder + "\n" + text.substring(m.end());
            index = m.start() + 1 + placeholder.length();
        }
    }

    /** Python-Markdown {@code RawHtmlPostprocessor}：独占段落的占位符连 {@code <p>} 一起替换。 */
    private static String restore(String html, List<String> stash) {
        if (stash.isEmpty()) {
            return html;
        }
        for (int i = 0; i < stash.size(); i++) {
            String placeholder = STX + "grunray:" + i + ETX;
            html = html.replace("<p>" + placeholder + "</p>", stash.get(i));
        }
        return PLACEHOLDER.matcher(html).replaceAll(mr -> Matcher.quoteReplacement(stash.get(Integer.parseInt(mr.group(1)))));
    }

    /** Python-Markdown 序列化器 {@code _escape_cdata}：已是实体的 {@code &} 不再转义，引号原样。 */
    private static final Pattern BARE_AMP = Pattern.compile("&(?!(?:#[0-9]+|#x[0-9a-f]+|[0-9a-z]+);)",
            Pattern.CASE_INSENSITIVE);

    static String escapeCdata(CharSequence text) {
        String s = text.toString();
        if (s.indexOf('&') >= 0) {
            s = BARE_AMP.matcher(s).replaceAll("&amp;");
        }
        return s.replace("<", "&lt;").replace(">", "&gt;");
    }

    /**
     * 让输出贴近 Python-Markdown 的序列化：缩进代码块走 codehilite（HiliteTreeprocessor 处理所有
     * {@code <pre><code>}）；文本与行内代码按 {@link #escapeCdata} 转义、实体原样保留；表格每格一行。
     */
    private final class CodeBlockRenderer implements NodeRenderer {
        @Override
        public Set<NodeRenderingHandler<?>> getNodeRenderingHandlers() {
            return Set.of(
                    new NodeRenderingHandler<>(IndentedCodeBlock.class, (node, context, html) -> {
                        String code = node.getContentChars().normalizeEOL();
                        html.line();
                        html.raw(hilite.hilite(code, null, true));
                        html.line();
                    }),
                    new NodeRenderingHandler<>(Text.class, (node, context, html) ->
                            html.raw(escapeCdata(node.getChars().unescapeNoEntities()))),
                    new NodeRenderingHandler<>(HtmlEntity.class, (node, context, html) ->
                            html.raw(node.getChars())),
                    // BacktickInlineProcessor：code_escape(m.group('code').strip())
                    new NodeRenderingHandler<>(Code.class, (node, context, html) -> {
                        html.raw("<code>");
                        html.raw(escapeCdata(PythonCompat.strip(node.getText().toString())));
                        html.raw("</code>");
                    }),
                    new NodeRenderingHandler<>(TableRow.class, (node, context, html) -> {
                        html.line();
                        html.raw("<tr>");
                        html.line();
                        for (Node cell = node.getFirstChild(); cell != null; cell = cell.getNext()) {
                            context.render(cell);
                            html.line();
                        }
                        html.raw("</tr>");
                        html.line();
                    }));
        }
    }

    /** Python-Markdown 的属性写法：表格对齐用 style，有序列表不带 start，标题不带 id。 */
    private static final class PythonMarkdownAttributes implements AttributeProvider {
        @Override
        public void setAttributes(Node node, AttributablePart part, MutableAttributes attributes) {
            if (node instanceof TableCell cell) {
                attributes.remove("align");
                if (cell.getAlignment() != null) {
                    String align = switch (cell.getAlignment()) {
                        case LEFT -> "left";
                        case CENTER -> "center";
                        case RIGHT -> "right";
                        default -> null;
                    };
                    if (align != null) {
                        attributes.replaceValue("style", "text-align: " + align + ";");
                    }
                }
            } else if (node instanceof OrderedList) {
                attributes.remove("start");
            } else if (node instanceof Heading) {
                attributes.remove("id");
            } else if (node instanceof Image) {
                // ElementTree 序列化按属性名排序：alt、src、title
                Map<String, String> sorted = new TreeMap<>();
                for (String key : List.copyOf(attributes.keySet())) {
                    sorted.put(key, attributes.getValue(key));
                    attributes.remove(key);
                }
                sorted.forEach(attributes::addValue);
            }
        }
    }
}
