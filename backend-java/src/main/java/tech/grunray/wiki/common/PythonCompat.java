package tech.grunray.wiki.common;

import java.math.BigInteger;
import java.util.Iterator;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

import com.fasterxml.jackson.databind.JsonNode;

/** 复刻 Flask 代码里依赖 Python 内置语义的几处转换。 */
public final class PythonCompat {

    private PythonCompat() {
    }

    /**
     * Python {@code int(s)}：允许首尾空白、正负号、数字间单个下划线、任意 Unicode 十进制数字。
     * 不合法时返回 empty。
     */
    public static Optional<BigInteger> parseInt(String raw) {
        if (raw == null) {
            return Optional.empty();
        }
        String s = raw.strip();
        if (s.isEmpty()) {
            return Optional.empty();
        }
        int i = 0;
        boolean negative = false;
        if (s.charAt(0) == '+' || s.charAt(0) == '-') {
            negative = s.charAt(0) == '-';
            i = 1;
        }
        if (i >= s.length()) {
            return Optional.empty();
        }
        StringBuilder digits = new StringBuilder();
        boolean prevUnderscore = true;
        while (i < s.length()) {
            int cp = s.codePointAt(i);
            if (cp == '_') {
                if (prevUnderscore) {
                    return Optional.empty();
                }
                prevUnderscore = true;
            } else if (Character.getType(cp) == Character.DECIMAL_DIGIT_NUMBER) {
                digits.append(Character.digit(cp, 10));
                prevUnderscore = false;
            } else {
                return Optional.empty();
            }
            i += Character.charCount(cp);
        }
        if (prevUnderscore) {
            return Optional.empty();
        }
        BigInteger value = new BigInteger(digits.toString());
        return Optional.of(negative ? value.negate() : value);
    }

    /** Python {@code str.isspace} 的单字符判断（含 U+00A0、U+3000 等，比 HTML 空白宽）。 */
    public static boolean isSpace(int cp) {
        return switch (cp) {
            case '\t', '\n', 0x0B, 0x0C, '\r', 0x1C, 0x1D, 0x1E, 0x1F, ' ', 0x85, 0xA0, 0x1680,
                    0x2028, 0x2029, 0x202F, 0x205F, 0x3000 -> true;
            default -> cp >= 0x2000 && cp <= 0x200A;
        };
    }

    /** Python {@code str.lstrip()}。 */
    public static String lstrip(String s) {
        int i = 0;
        while (i < s.length() && isSpace(s.codePointAt(i))) {
            i += Character.charCount(s.codePointAt(i));
        }
        return s.substring(i);
    }

    /** Python {@code str.strip()}。 */
    public static String strip(String s) {
        String left = lstrip(s);
        int end = left.length();
        while (end > 0) {
            int cp = left.codePointBefore(end);
            if (!isSpace(cp)) {
                break;
            }
            end -= Character.charCount(cp);
        }
        return left.substring(0, end);
    }

    /** Python {@code str(x)}，x 为 {@code json.loads} 得到的值。 */
    public static String str(JsonNode node) {
        if (node == null || node.isNull()) {
            return "None";
        }
        if (node.isTextual()) {
            return node.textValue();
        }
        return repr(node);
    }

    private static String repr(JsonNode node) {
        if (node == null || node.isNull()) {
            return "None";
        }
        if (node.isBoolean()) {
            return node.booleanValue() ? "True" : "False";
        }
        if (node.isTextual()) {
            return quote(node.textValue());
        }
        if (node.isIntegralNumber()) {
            return node.bigIntegerValue().toString();
        }
        if (node.isNumber()) {
            return floatRepr(node.doubleValue());
        }
        if (node.isArray()) {
            StringBuilder sb = new StringBuilder("[");
            Iterator<JsonNode> it = node.elements();
            while (it.hasNext()) {
                sb.append(repr(it.next()));
                if (it.hasNext()) {
                    sb.append(", ");
                }
            }
            return sb.append(']').toString();
        }
        StringBuilder sb = new StringBuilder("{");
        Iterator<Map.Entry<String, JsonNode>> it = node.fields();
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            sb.append(quote(e.getKey())).append(": ").append(repr(e.getValue()));
            if (it.hasNext()) {
                sb.append(", ");
            }
        }
        return sb.append('}').toString();
    }

    private static String quote(String s) {
        boolean useDouble = s.indexOf('\'') >= 0 && s.indexOf('"') < 0;
        char q = useDouble ? '"' : '\'';
        StringBuilder sb = new StringBuilder().append(q);
        for (char c : s.toCharArray()) {
            switch (c) {
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                case '\r' -> sb.append("\\r");
                case '\t' -> sb.append("\\t");
                default -> {
                    if (c == q) {
                        sb.append('\\').append(c);
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append(q).toString();
    }

    private static String floatRepr(double d) {
        if (Double.isNaN(d)) {
            return "nan";
        }
        if (Double.isInfinite(d)) {
            return d > 0 ? "inf" : "-inf";
        }
        if (d == Math.rint(d) && Math.abs(d) < 1e16) {
            return String.format(Locale.ROOT, "%.1f", d);
        }
        String s = Double.toString(d);
        if (s.contains("E")) {
            String[] parts = s.split("E");
            int exp = Integer.parseInt(parts[1]);
            String mantissa = parts[0].endsWith(".0") ? parts[0].substring(0, parts[0].length() - 2) : parts[0];
            return mantissa + "e" + (exp < 0 ? "-" : "+") + String.format(Locale.ROOT, "%02d", Math.abs(exp));
        }
        return s;
    }
}
