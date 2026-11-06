package tech.grunray.wiki.xiqi;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * 站长 import Markdown，对齐 Flask {@code xiqi_md_write.py} 与关于页校验。
 */
final class XiqiMarkdown {

    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter SQL = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Pattern EMAIL = Pattern.compile("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$");
    private static final Set<String> TIERS = Set.of("gold", "silver", "bronze");
    private static final String QUOTE_CHARS = "\":\n#[]{}&*!|>%@`'";

    private XiqiMarkdown() {
    }

    static String nowStamp() {
        return LocalDateTime.now().withNano(0).format(ISO);
    }

    static LocalDateTime parseCreated(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String raw = text.strip().replace("Z", "");
        for (DateTimeFormatter formatter : List.of(SQL, ISO)) {
            try {
                return LocalDateTime.parse(raw, formatter);
            } catch (DateTimeParseException ignored) {
                // 两种格式都试过再判失败
            }
        }
        return null;
    }

    static String extractSummary(String body) {
        String text = body == null ? "" : body.strip();
        if (text.isEmpty()) {
            return "";
        }
        for (String raw : text.split("\\R")) {
            String line = raw.strip();
            if (line.isEmpty() || line.startsWith("#") || line.startsWith("![")) {
                continue;
            }
            line = line.replaceAll("!\\[[^\\]]*\\]\\([^)]+\\)", "");
            line = line.replaceAll("\\[([^\\]]+)\\]\\([^)]+\\)", "$1");
            line = line.replaceAll("[*_`>#]", "").strip();
            if (!line.isEmpty()) {
                return line.length() > 280 ? line.substring(0, 280) : line;
            }
        }
        return text.length() > 280 ? text.substring(0, 280) : text;
    }

    static String fragment(String publicId, String mood, String status, String createdAt, List<Map<String, String>> images,
            int coverIndex, String body) {
        List<String> lines = new ArrayList<>();
        lines.add("---");
        lines.add("public_id: " + yamlScalar(publicId));
        lines.add("mood: " + mood);
        lines.add("status: " + status);
        lines.add("created_at: '" + createdAt + "'");
        imageLines(lines, images);
        lines.add("cover_index: " + coverIndex);
        lines.add("---");
        lines.add("");
        lines.add(rstrip(body));
        lines.add("");
        return String.join("\n", lines);
    }

    static String recommend(String publicId, String category, int rating, String title, String status, String createdAt,
            String url, String summary, List<Map<String, String>> images, int coverIndex, String body) {
        List<String> lines = new ArrayList<>();
        lines.add("---");
        lines.add("public_id: " + yamlScalar(publicId));
        lines.add("category: " + category);
        lines.add("rating: " + rating);
        lines.add("title: " + yamlScalar(title));
        lines.add("status: " + status);
        lines.add("created_at: '" + createdAt + "'");
        if (url != null && !url.isBlank()) {
            lines.add("url: " + yamlScalar(url));
        }
        if (summary != null && !summary.isBlank()) {
            lines.add("summary: " + yamlScalar(summary.strip()));
        }
        imageLines(lines, images);
        lines.add("cover_index: " + coverIndex);
        lines.add("---");
        lines.add("");
        lines.add(rstrip(body));
        lines.add("");
        return String.join("\n", lines);
    }

    static String page(String page, String heroUrl, String heroAlt, String status, String note) {
        List<String> lines = new ArrayList<>();
        lines.add("---");
        lines.add("page: " + page);
        lines.add("hero_image_url: " + yamlScalar(heroUrl == null ? "" : heroUrl));
        lines.add("hero_image_alt: " + yamlScalar(heroAlt == null ? "" : heroAlt));
        lines.add("status: " + status);
        lines.add("---");
        lines.add("");
        if (note != null && !note.isBlank()) {
            lines.add(note.strip());
            lines.add("");
        }
        return String.join("\n", lines);
    }

    /** @return 错误文案；通过时为 null，正文在 {@link #aboutMarkdown} */
    static String aboutError(Map<String, Object> body) {
        String alias = text(body.get("alias"));
        if (alias.isEmpty()) {
            return "缺少必填字段 alias: resume.md";
        }
        String gender = first(body, "genderAge", "gender_age");
        if (gender.isEmpty()) {
            return "缺少必填字段 gender_age: resume.md";
        }
        String email = text(body.get("email"));
        if (email.isEmpty()) {
            return "缺少必填字段 email: resume.md";
        }
        if (!EMAIL.matcher(email).matches()) {
            return "email 格式无效: resume.md";
        }
        String intro = text(body.get("intro"));
        if (intro.isEmpty()) {
            return "缺少必填字段 intro: resume.md";
        }
        String privateError = privateHtml(intro, "intro");
        if (privateError != null) {
            return privateError;
        }
        Object awards = body.get("awards");
        if (awards != null && !(awards instanceof List<?>)) {
            return "awards 必须是列表: resume.md";
        }
        if (awards instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                if (!(list.get(i) instanceof Map<?, ?> award)) {
                    return "awards[" + i + "] 必须是对象: resume.md";
                }
                if (text(award.get("id")).isEmpty()) {
                    return "缺少必填字段 awards[" + i + "].id: resume.md";
                }
                if (text(award.get("label")).isEmpty()) {
                    return "缺少必填字段 awards[" + i + "].label: resume.md";
                }
                String tier = text(award.get("tier")).toLowerCase(Locale.ROOT);
                if (!TIERS.contains(tier)) {
                    return "awards[" + i + "].tier 必须是 ['bronze', 'gold', 'silver'] 之一: resume.md";
                }
            }
        }
        String section = sectionError(body.get("education"), "education",
                List.of("schoolPublic", "schoolRaw", "degree", "major", "period", "rankRaw"),
                List.of("school_public", "school_raw", "degree", "major", "period", "rank_raw"));
        if (section != null) {
            return section;
        }
        section = sectionError(body.get("internship"), "internship",
                List.of("companyPublic", "companyRaw", "role", "period", "summaryRaw"),
                List.of("company_public", "company_raw", "role", "period", "summary_raw"));
        if (section != null) {
            return section;
        }
        section = sectionError(body.get("club"), "club",
                List.of("namePublic", "nameRaw", "role", "period", "summaryRaw"),
                List.of("name_public", "name_raw", "role", "period", "summary_raw"));
        if (section != null) {
            return section;
        }
        Object certs = body.get("certificates");
        if (certs != null && !(certs instanceof List<?>)) {
            return "certificates 必须是列表: resume.md";
        }
        if (certs instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                if (text(list.get(i)).isEmpty()) {
                    return "缺少必填字段 certificates[" + i + "]: resume.md";
                }
            }
        }
        return null;
    }

    static String aboutMarkdown(Map<String, Object> body, String status) {
        List<String> lines = new ArrayList<>();
        lines.add("---");
        lines.add("status: " + status);
        lines.add("alias: " + yamlScalar(text(body.get("alias"))));
        lines.add("gender_age: " + yamlScalar(first(body, "genderAge", "gender_age")));
        lines.add("email: " + yamlScalar(text(body.get("email"))));
        String intro = text(body.get("intro"));
        if (intro.contains("\n")) {
            lines.add("intro: |");
            for (String line : intro.split("\\R", -1)) {
                lines.add("  " + line);
            }
        } else {
            lines.add("intro: " + yamlScalar(intro));
        }
        lines.add("awards:");
        Object awards = body.get("awards");
        if (awards instanceof List<?> list) {
            for (Object item : list) {
                if (item instanceof Map<?, ?> award) {
                    lines.add("  - id: " + yamlScalar(text(award.get("id"))));
                    lines.add("    label: " + yamlScalar(text(award.get("label"))));
                    lines.add("    tier: " + text(award.get("tier")).toLowerCase(Locale.ROOT));
                }
            }
        }
        sectionLines(lines, "education", body.get("education"),
                List.of("school_public", "school_raw", "degree", "major", "period", "rank_raw"),
                List.of("schoolPublic", "schoolRaw", "degree", "major", "period", "rankRaw"));
        sectionLines(lines, "internship", body.get("internship"),
                List.of("company_public", "company_raw", "role", "period", "summary_raw"),
                List.of("companyPublic", "companyRaw", "role", "period", "summaryRaw"));
        sectionLines(lines, "club", body.get("club"),
                List.of("name_public", "name_raw", "role", "period", "summary_raw"),
                List.of("namePublic", "nameRaw", "role", "period", "summaryRaw"));
        lines.add("certificates:");
        Object certs = body.get("certificates");
        if (certs instanceof List<?> list) {
            for (Object item : list) {
                String cert = text(item);
                if (!cert.isEmpty()) {
                    lines.add("  - " + yamlScalar(cert));
                }
            }
        }
        lines.add("---");
        lines.add("");
        String note = text(body.get("note"));
        if (!note.isEmpty()) {
            lines.add(note);
            lines.add("");
        }
        return String.join("\n", lines);
    }

    private static void imageLines(List<String> lines, List<Map<String, String>> images) {
        if (images == null || images.isEmpty()) {
            lines.add("images: []");
            return;
        }
        lines.add("images:");
        for (Map<String, String> image : images) {
            lines.add("  - url: " + yamlScalar(image.getOrDefault("url", "")));
            lines.add("    alt: " + yamlScalar(image.getOrDefault("alt", "")));
        }
    }

    private static void sectionLines(List<String> lines, String name, Object raw, List<String> yamlKeys, List<String> camelKeys) {
        lines.add(name + ":");
        Map<String, String> values = sectionValues(raw, camelKeys, yamlKeys);
        for (int i = 0; i < yamlKeys.size(); i++) {
            lines.add("  " + yamlKeys.get(i) + ": " + yamlScalar(values.getOrDefault(yamlKeys.get(i), "")));
        }
    }

    private static String sectionError(Object raw, String name, List<String> camelKeys, List<String> yamlKeys) {
        if (raw == null) {
            raw = Map.of();
        }
        if (!(raw instanceof Map<?, ?>)) {
            return name + " 必须是对象: resume.md";
        }
        Map<String, String> values = sectionValues(raw, camelKeys, yamlKeys);
        for (int i = 0; i < yamlKeys.size(); i++) {
            String value = values.getOrDefault(yamlKeys.get(i), "");
            if (value.isEmpty()) {
                return "缺少必填字段 " + name + "." + yamlKeys.get(i) + ": resume.md";
            }
            String privateError = privateHtml(value, name + "." + yamlKeys.get(i));
            if (privateError != null) {
                return privateError;
            }
        }
        return null;
    }

    private static Map<String, String> sectionValues(Object raw, List<String> camelKeys, List<String> yamlKeys) {
        Map<String, String> values = new LinkedHashMap<>();
        if (!(raw instanceof Map<?, ?> map)) {
            return values;
        }
        for (int i = 0; i < yamlKeys.size(); i++) {
            String camel = camelKeys.get(i);
            String snake = yamlKeys.get(i);
            String value = text(map.get(camel));
            if (value.isEmpty()) {
                value = text(map.get(snake));
            }
            values.put(snake, value);
        }
        return values;
    }

    private static String privateHtml(String text, String field) {
        String lower = text.toLowerCase(Locale.ROOT);
        if (!lower.contains("xiqi-private") && !lower.contains("data-xiqi-private")) {
            return null;
        }
        boolean tag = Pattern.compile("<\\s*xiqi-private\\s+label=", Pattern.CASE_INSENSITIVE).matcher(text).find();
        boolean div = Pattern.compile("data-xiqi-private", Pattern.CASE_INSENSITIVE).matcher(text).find();
        if (!tag && !div) {
            return field + " 含 xiqi-private 相关文本但格式无效: resume.md";
        }
        if (tag && !Pattern.compile("</xiqi-private>", Pattern.CASE_INSENSITIVE).matcher(text).find()) {
            return field + " 的 <xiqi-private> 标签未闭合: resume.md";
        }
        if (div && !lower.contains("</div>")) {
            return field + " 的 data-xiqi-private div 未闭合: resume.md";
        }
        return null;
    }

    static String yamlScalar(String value) {
        String text = value == null ? "" : value;
        if (text.startsWith("'") || text.contains(":") || text.startsWith(" ") || text.endsWith(" ")) {
            return yamlQuote(text);
        }
        return text;
    }

    private static String yamlQuote(String value) {
        if (value.isEmpty()) {
            return "''";
        }
        for (int i = 0; i < value.length(); i++) {
            if (QUOTE_CHARS.indexOf(value.charAt(i)) >= 0) {
                return "\"" + value.replace("\\", "\\\\").replace("\"", "\\\"") + "\"";
            }
        }
        return value;
    }

    private static String rstrip(String value) {
        if (value == null) {
            return "";
        }
        int end = value.length();
        while (end > 0 && (value.charAt(end - 1) == ' ' || value.charAt(end - 1) == '\n' || value.charAt(end - 1) == '\r'
                || value.charAt(end - 1) == '\t')) {
            end--;
        }
        return value.substring(0, end);
    }

    private static String first(Map<String, Object> body, String camel, String snake) {
        String value = text(body.get(camel));
        return value.isEmpty() ? text(body.get(snake)) : value;
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).strip();
    }
}
