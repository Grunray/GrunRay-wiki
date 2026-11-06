package tech.grunray.wiki.project;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import tech.grunray.wiki.common.Dates;

/** Flask {@code project_serialize.row_to_project} 与详情的 related_posts 合并。 */
@Service
public class ProjectJson {

    private static final Map<Integer, String> STATUS = Map.of(0, "published", 1, "archived", 2, "hidden");

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;

    public ProjectJson(JdbcClient jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    public Map<String, Object> toListJson(ProjectRow row) {
        Map<String, Object> out = base(row);
        JsonNode related = parse(row.relatedPostsJson());
        if (related != null && related.isArray() && !related.isEmpty()) {
            List<Object> items = new ArrayList<>();
            related.forEach(node -> {
                if (node.isObject()) {
                    items.add(mapper.convertValue(node, Map.class));
                }
            });
            if (!items.isEmpty()) {
                out.put("related_posts_json", items);
            }
        }
        return out;
    }

    public Map<String, Object> toDetailJson(ProjectRow row) {
        Map<String, Object> out = base(row);
        out.put("related_posts", mergeRelated(row.publicId(), parse(row.relatedPostsJson())));
        return out;
    }

    private Map<String, Object> base(ProjectRow row) {
        JsonNode tagsNode = parse(row.tags());
        List<String> tags = new ArrayList<>();
        if (tagsNode != null && tagsNode.isArray()) {
            tagsNode.forEach(n -> tags.add(n.isNull() ? "None" : n.asText()));
        }
        JsonNode layoutNode = parse(row.layout());
        List<Object> layout = new ArrayList<>();
        if (layoutNode != null && layoutNode.isArray()) {
            layoutNode.forEach(n -> layout.add(mapper.convertValue(n, Object.class)));
        }
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", row.publicId());
        out.put("slug", row.slug());
        out.put("locale", row.locale() == null || row.locale().isEmpty() ? "zh" : row.locale());
        out.put("title", row.title());
        out.put("summary", row.summary() == null ? "" : row.summary());
        out.put("tags", tags);
        out.put("status", STATUS.getOrDefault(row.status(), "published"));
        out.put("layout", layout);
        if (row.featured() != null) {
            out.put("featured", row.featured());
        }
        if (row.year() != null) {
            out.put("year", row.year());
        }
        if (row.startDate() != null) {
            out.put("start_date", Dates.isoDate(row.startDate()));
        }
        if (row.endDate() != null) {
            out.put("end_date", Dates.isoDate(row.endDate()));
        }
        if (row.githubUrl() != null && !row.githubUrl().isEmpty()) {
            out.put("github_url", row.githubUrl());
        }
        if (row.demoUrl() != null && !row.demoUrl().isEmpty()) {
            out.put("demo_url", row.demoUrl());
        }
        return out;
    }

    private List<Map<String, Object>> mergeRelated(String publicId, JsonNode raw) {
        List<Map<String, Object>> manual = new ArrayList<>();
        if (raw != null && raw.isArray()) {
            for (JsonNode item : raw) {
                if (!item.isObject()) {
                    continue;
                }
                String slug = text(item, "slug").strip();
                if (slug.isEmpty()) {
                    continue;
                }
                String label = null;
                if (item.hasNonNull("label")) {
                    String text = item.get("label").asText().strip();
                    if (!text.isEmpty()) {
                        label = text;
                    }
                }
                boolean pinned = item.path("pinned").asBoolean(false);
                PostHit hit = findPost(slug);
                Map<String, Object> entry = new LinkedHashMap<>();
                entry.put("slug", slug);
                entry.put("title", hit == null ? "" : hit.title());
                entry.put("label", label);
                entry.put("pinned", pinned);
                entry.put("source", "manual");
                entry.put("published_at", hit == null ? "" : Dates.sql(hit.publishedAt()));
                manual.add(entry);
            }
        }
        List<Map<String, Object>> auto = new ArrayList<>();
        List<PostHit> notes = jdbc.sql("""
                SELECT slug, title, published_at
                FROM post
                WHERE type = 1
                  AND JSON_UNQUOTE(JSON_EXTRACT(extra, '$.project_id')) = ?
                ORDER BY published_at IS NULL, published_at DESC, id DESC
                """)
                .param(publicId)
                .query((rs, n) -> new PostHit(rs.getString("slug"), rs.getString("title"),
                        rs.getObject("published_at", LocalDateTime.class)))
                .list();
        for (PostHit note : notes) {
            boolean seen = manual.stream().anyMatch(m -> note.slug().equals(m.get("slug")))
                    || auto.stream().anyMatch(m -> note.slug().equals(m.get("slug")));
            if (seen) {
                continue;
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("slug", note.slug());
            entry.put("title", note.title() == null ? "" : note.title());
            entry.put("label", null);
            entry.put("pinned", false);
            entry.put("source", "auto");
            entry.put("published_at", Dates.sql(note.publishedAt()));
            auto.add(entry);
        }
        manual.sort(Comparator.comparingInt(m -> Boolean.TRUE.equals(m.get("pinned")) ? 0 : 1));
        auto.sort(Comparator.comparing((Map<String, Object> m) -> String.valueOf(m.get("published_at"))).reversed());
        List<Map<String, Object>> merged = new ArrayList<>(manual);
        merged.addAll(auto);
        return merged;
    }

    private PostHit findPost(String slug) {
        return jdbc.sql("SELECT title, published_at FROM post WHERE slug = ? LIMIT 1")
                .param(slug)
                .query((rs, n) -> new PostHit(slug, rs.getString("title"), rs.getObject("published_at", LocalDateTime.class)))
                .optional()
                .orElse(null);
    }

    private JsonNode parse(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return mapper.readTree(raw);
        } catch (Exception e) {
            return null;
        }
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText();
    }

    private record PostHit(String slug, String title, LocalDateTime publishedAt) {
    }

    public record ProjectRow(
            String publicId,
            String slug,
            String locale,
            String title,
            String summary,
            String tags,
            int status,
            Boolean featured,
            Integer year,
            LocalDate startDate,
            LocalDate endDate,
            String githubUrl,
            String demoUrl,
            String layout,
            String relatedPostsJson) {
    }
}
