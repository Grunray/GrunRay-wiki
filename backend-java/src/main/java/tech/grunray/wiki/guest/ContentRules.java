package tech.grunray.wiki.guest;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** 留言 / 友链正文校验。 */
@Component
public class ContentRules {

    private static final List<Pattern> DANGER = List.of(
            Pattern.compile("<\\s*script", Pattern.CASE_INSENSITIVE),
            Pattern.compile("<\\s*iframe", Pattern.CASE_INSENSITIVE),
            Pattern.compile("javascript\\s*:", Pattern.CASE_INSENSITIVE),
            Pattern.compile("on\\w+\\s*=", Pattern.CASE_INSENSITIVE),
            Pattern.compile("data\\s*:\\s*text/html", Pattern.CASE_INSENSITIVE));
    private static final Pattern TAG = Pattern.compile("<[^>]+>");

    private final int min;
    private final int max;
    private final List<String> words;

    public ContentRules(
            @Value("${MESSAGE_MIN_LENGTH:2}") int min,
            @Value("${MESSAGE_MAX_LENGTH:500}") int max,
            @Value("${MESSAGE_SENSITIVE_WORDS_PATH:}") String wordsPath) {
        this.min = min;
        this.max = max;
        this.words = load(wordsPath);
    }

    public String validate(String raw) {
        String text = raw.strip();
        if (dangerous(text)) {
            return null;
        }
        String stripped = TAG.matcher(text).replaceAll("");
        if (!stripped.equals(text) && dangerous(stripped)) {
            return null;
        }
        text = stripped.strip();
        if (text.length() < min || text.length() > max) {
            return "len";
        }
        String lower = text.toLowerCase(Locale.ROOT);
        for (String word : words) {
            if (!word.isEmpty() && lower.contains(word)) {
                return "word";
            }
        }
        return text;
    }

    /** 去掉普通标签；危险片段返回 null。不做长度和敏感词检查。 */
    public String stripHtml(String raw) {
        String text = raw == null ? "" : raw.strip();
        if (dangerous(text)) {
            return null;
        }
        String stripped = TAG.matcher(text).replaceAll("");
        if (!stripped.equals(text) && dangerous(stripped)) {
            return null;
        }
        return stripped.strip();
    }

    public String sensitiveHit(String text) {
        if (text == null || text.isEmpty()) {
            return null;
        }
        String lower = text.toLowerCase(Locale.ROOT);
        for (String word : words) {
            if (!word.isEmpty() && lower.contains(word)) {
                return "内容含有不允许的词语，请修改后重试";
            }
        }
        return null;
    }

    public String messageFor(String marker) {
        if (marker == null) {
            return "内容包含不允许的 HTML 或脚本";
        }
        if ("len".equals(marker)) {
            return "内容长度需在 " + min + "–" + max + " 字之间";
        }
        if ("word".equals(marker)) {
            return "内容含有不允许的词语，请修改后重试";
        }
        return marker;
    }

    private static boolean dangerous(String text) {
        for (Pattern pattern : DANGER) {
            if (pattern.matcher(text).find()) {
                return true;
            }
        }
        return false;
    }

    private static List<String> load(String path) {
        if (path == null || path.isBlank()) {
            return List.of();
        }
        try {
            return Files.readAllLines(Path.of(path)).stream()
                    .map(String::strip)
                    .filter(line -> !line.isEmpty() && !line.startsWith("#"))
                    .map(line -> line.toLowerCase(Locale.ROOT))
                    .toList();
        } catch (Exception e) {
            return List.of();
        }
    }
}
