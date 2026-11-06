package tech.grunray.wiki.post;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

/**
 * Flask {@code keywords_match.py}：子串、不区分大小写、词之间 AND。
 * 同分时 {@code published_at} 升序，NULL 视为最早（API_CONTRACT §4.2，允许的修正）。
 */
public final class PostSearch {

    private PostSearch() {
    }

    public static List<String> splitTerms(String q) {
        String text = q == null ? "" : q.strip();
        if (text.isEmpty()) {
            return List.of();
        }
        List<String> out = new ArrayList<>();
        for (String part : text.split("\\s+")) {
            if (!part.isEmpty()) {
                out.add(part);
            }
        }
        return out;
    }

    public static boolean passes(List<String> terms, String title, String summary, List<String> keywords) {
        if (terms.isEmpty()) {
            return false;
        }
        String titleL = lower(title);
        String summaryL = lower(summary);
        for (String term : terms) {
            String tl = term.toLowerCase(Locale.ROOT);
            boolean ok = titleL.contains(tl) || summaryL.contains(tl) || inKeywords(tl, keywords);
            if (!ok) {
                return false;
            }
        }
        return true;
    }

    public static double score(List<String> terms, String title, String summary, List<String> keywords, int views) {
        double s = Math.log(Math.max(0, views) + 1.0);
        String titleL = lower(title);
        String summaryL = lower(summary);
        for (String term : terms) {
            String tl = term.toLowerCase(Locale.ROOT);
            if (titleL.contains(tl)) {
                s += 10;
            }
            if (summaryL.contains(tl)) {
                s += 3;
            }
            if (inKeywords(tl, keywords)) {
                s += 6;
            }
        }
        return s;
    }

    public static List<PostRow> rank(List<PostRow> rows, List<String> terms, PostJson json) {
        record Hit(double score, int views, LocalDateTime publishedAt, PostRow row) {
        }
        List<Hit> hits = new ArrayList<>();
        for (PostRow row : rows) {
            List<String> keywords = keywords(json, row);
            if (!passes(terms, row.title(), row.summary(), keywords)) {
                continue;
            }
            hits.add(new Hit(
                    score(terms, row.title(), row.summary(), keywords, row.views()),
                    row.views(),
                    row.publishedAt(),
                    row));
        }
        hits.sort(Comparator
                .comparingDouble(Hit::score).reversed()
                .thenComparing(Comparator.comparingInt(Hit::views).reversed())
                .thenComparing(Hit::publishedAt, Comparator.nullsFirst(Comparator.naturalOrder())));
        return hits.stream().map(Hit::row).toList();
    }

    /** 与当前文章 tags 的交集个数降序、views 降序、published_at 升序（NULL 最早）。 */
    public static List<PostRow> related(PostRow current, List<PostRow> others, PostJson json, int limit) {
        List<String> mine = keywords(json, current);
        record Hit(int overlap, int views, LocalDateTime publishedAt, PostRow row) {
        }
        List<Hit> hits = new ArrayList<>();
        for (PostRow row : others) {
            if (row.slug().equals(current.slug())) {
                continue;
            }
            List<String> theirs = keywords(json, row);
            int overlap = 0;
            for (String tag : mine) {
                if (theirs.contains(tag)) {
                    overlap++;
                }
            }
            hits.add(new Hit(overlap, row.views(), row.publishedAt(), row));
        }
        hits.sort(Comparator
                .comparingInt(Hit::overlap).reversed()
                .thenComparing(Comparator.comparingInt(Hit::views).reversed())
                .thenComparing(Hit::publishedAt, Comparator.nullsFirst(Comparator.naturalOrder())));
        if (hits.size() > limit) {
            hits = hits.subList(0, limit);
        }
        return hits.stream().map(Hit::row).toList();
    }

    private static List<String> keywords(PostJson json, PostRow row) {
        Object tags = json.toJson(row).get("tags");
        if (tags instanceof List<?> list) {
            List<String> out = new ArrayList<>();
            for (Object item : list) {
                out.add(String.valueOf(item));
            }
            return out;
        }
        return List.of();
    }

    private static boolean inKeywords(String termLower, List<String> keywords) {
        for (String keyword : keywords) {
            if (keyword.toLowerCase(Locale.ROOT).contains(termLower)) {
                return true;
            }
        }
        return false;
    }

    private static String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }
}
