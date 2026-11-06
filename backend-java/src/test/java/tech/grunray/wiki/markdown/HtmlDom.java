package tech.grunray.wiki.markdown;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Attribute;
import org.jsoup.nodes.Element;
import org.jsoup.nodes.Node;
import org.jsoup.nodes.TextNode;

/**
 * 把 HTML 规范成可比较的字符串：属性排序、实体解码；{@code <pre>} 里逐字保留，
 * 其余文本把连续空白折成一个空格，并去掉块级标签与 {@code <br>} 两侧的空白（浏览器渲染不受影响）。
 */
final class HtmlDom {

    private static final Set<String> BLOCK = Set.of(
            "p", "div", "ul", "ol", "li", "table", "thead", "tbody", "tr", "th", "td",
            "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "hr", "br", "body");
    private static final Pattern WS = Pattern.compile("[ \\t\\n\\r\\f]+");
    private static final Pattern AROUND_BLOCK = Pattern.compile(
            " ?(</?(?:" + String.join("|", BLOCK) + ")(?: [^>]*)?/?>) ?");

    private HtmlDom() {
    }

    static String canonical(String html) {
        Element body = Jsoup.parseBodyFragment(html).body();
        StringBuilder sb = new StringBuilder();
        walk(body, false, sb);
        String s = sb.toString();
        String prev;
        do {
            prev = s;
            s = AROUND_BLOCK.matcher(s).replaceAll("$1");
        } while (!s.equals(prev));
        return s;
    }

    private static void walk(Node node, boolean inPre, StringBuilder sb) {
        if (node instanceof TextNode t) {
            String text = t.getWholeText();
            if (inPre) {
                sb.append(escapePre(text));
            } else {
                sb.append(escape(WS.matcher(text).replaceAll(" ")));
            }
            return;
        }
        if (!(node instanceof Element e)) {
            return;
        }
        String tag = e.normalName();
        sb.append('<').append(tag);
        List<Attribute> attrs = new ArrayList<>();
        e.attributes().forEach(attrs::add);
        attrs.sort((a, b) -> a.getKey().compareTo(b.getKey()));
        for (Attribute a : attrs) {
            sb.append(' ').append(a.getKey()).append("=\"").append(escape(a.getValue())).append('"');
        }
        sb.append('>');
        boolean pre = inPre || tag.equals("pre");
        for (Node child : e.childNodes()) {
            walk(child, pre, sb);
        }
        sb.append("</").append(tag).append('>');
    }

    private static String escape(String s) {
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;");
    }

    /** pre 内空白换成可见记号，避免被块级空白清理误伤。 */
    private static String escapePre(String s) {
        return escape(s).replace("\n", "⏎").replace(" ", "·").replace("\t", "⇥");
    }

    /** 第一处不同附近的上下文，便于看测试失败原因。 */
    static String firstDifference(String expected, String actual) {
        int n = Math.min(expected.length(), actual.length());
        int i = 0;
        while (i < n && expected.charAt(i) == actual.charAt(i)) {
            i++;
        }
        int from = Math.max(0, i - 120);
        return "@" + i + "\n  python: …" + expected.substring(from, Math.min(expected.length(), i + 160))
                + "\n  java:   …" + actual.substring(from, Math.min(actual.length(), i + 160));
    }
}
