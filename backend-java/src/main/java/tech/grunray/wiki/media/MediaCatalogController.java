package tech.grunray.wiki.media;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import tech.grunray.wiki.common.Dates;
import tech.grunray.wiki.common.Envelopes;
import tech.grunray.wiki.common.PythonCompat;

/** 媒体列表、胶片栏、曲目（API_CONTRACT #14–#16），失败走信封 A。 */
@RestController
public class MediaCatalogController {

    private static final String FILMFEED = "film/homeView/right_panel";

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;

    public MediaCatalogController(JdbcClient jdbc, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.mapper = mapper;
    }

    @GetMapping("/api/media/list")
    public ResponseEntity<?> list(HttpServletRequest request) {
        Page page = page(request, 20);
        if (page == null) {
            return Envelopes.errorA("invalid page/size", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        String type = param(request, "type").toLowerCase();
        String tag = param(request, "tag");
        String article = request.getParameter("article_id");
        String folder = param(request, "folder").replaceAll("^/+|/+$", "");
        List<String> where = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (!type.isEmpty()) {
            where.add("type = ?");
            args.add(type);
        }
        if (article != null && !article.isBlank()) {
            var parsed = PythonCompat.parseInt(article);
            if (parsed.isEmpty()) {
                return Envelopes.errorA("invalid article_id", org.springframework.http.HttpStatus.BAD_REQUEST);
            }
            where.add("article_id = ?");
            args.add(parsed.get().longValue());
        }
        if (!tag.isEmpty()) {
            where.add("JSON_SEARCH(tags, 'one', ?) IS NOT NULL");
            args.add(tag);
        }
        if (!folder.isEmpty()) {
            where.add("url LIKE ?");
            args.add("/api/media/files/" + folder + "/%");
        }
        String sql = "SELECT id, url, type, title, article_id, tags, created_at FROM media"
                + (where.isEmpty() ? "" : " WHERE " + String.join(" AND ", where))
                + " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?";
        args.add(page.size());
        args.add(page.offset());
        List<Map<String, Object>> rows = query(sql, args, true);
        return ResponseEntity.ok(Envelopes.ok(rows));
    }

    @GetMapping("/api/media/list/filmfeed")
    public ResponseEntity<?> filmfeed(HttpServletRequest request) {
        Page page = page(request, 50);
        if (page == null) {
            return Envelopes.errorA("invalid page/size", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        String sql = """
                SELECT id, url, type, title, article_id, tags, created_at
                FROM media
                WHERE url LIKE ?
                ORDER BY created_at DESC, id DESC
                LIMIT ? OFFSET ?
                """;
        List<Map<String, Object>> rows = query(sql, List.of("/api/media/files/" + FILMFEED + "/%", page.size(), page.offset()), true);
        return ResponseEntity.ok(Envelopes.ok(rows));
    }

    @GetMapping("/api/music/tracks")
    public ResponseEntity<?> tracks(HttpServletRequest request) {
        Page page = page(request, 50);
        if (page == null) {
            return Envelopes.errorA("invalid page/size", org.springframework.http.HttpStatus.BAD_REQUEST);
        }
        String tag = param(request, "tag");
        String postId = request.getParameter("post_id");
        List<String> where = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (postId != null && !postId.isBlank()) {
            var parsed = PythonCompat.parseInt(postId);
            if (parsed.isEmpty()) {
                return Envelopes.errorA("invalid post_id", org.springframework.http.HttpStatus.BAD_REQUEST);
            }
            where.add("post_id = ?");
            args.add(parsed.get().longValue());
        }
        if (!tag.isEmpty()) {
            where.add("JSON_SEARCH(tags, 'one', ?) IS NOT NULL");
            args.add(tag);
        }
        String sql = """
                SELECT id, url, title, artist, duration_sec, post_id, tags, sort_order, created_at, updated_at
                FROM music_track
                """
                + (where.isEmpty() ? "" : " WHERE " + String.join(" AND ", where))
                + " ORDER BY sort_order ASC, id ASC LIMIT ? OFFSET ?";
        args.add(page.size());
        args.add(page.offset());
        List<Map<String, Object>> rows = query(sql, args, false);
        return ResponseEntity.ok(Envelopes.ok(rows));
    }

    private List<Map<String, Object>> query(String sql, List<Object> args, boolean media) {
        var spec = jdbc.sql(sql);
        for (Object arg : args) {
            spec = spec.param(arg);
        }
        return spec.query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("url", rs.getString("url"));
            if (media) {
                row.put("type", rs.getString("type"));
                row.put("title", rs.getString("title"));
                long article = rs.getLong("article_id");
                row.put("article_id", rs.wasNull() ? null : article);
                row.put("tags", tags(rs.getString("tags")));
                row.put("created_at", Dates.sql(rs.getObject("created_at", LocalDateTime.class)));
            } else {
                row.put("title", rs.getString("title"));
                row.put("artist", rs.getString("artist"));
                int duration = rs.getInt("duration_sec");
                row.put("duration_sec", rs.wasNull() ? null : duration);
                long post = rs.getLong("post_id");
                row.put("post_id", rs.wasNull() ? null : post);
                row.put("tags", tags(rs.getString("tags")));
                row.put("sort_order", rs.getInt("sort_order"));
                row.put("created_at", Dates.sql(rs.getObject("created_at", LocalDateTime.class)));
                row.put("updated_at", Dates.sql(rs.getObject("updated_at", LocalDateTime.class)));
            }
            return row;
        }).list();
    }

    private List<Object> tags(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        try {
            JsonNode node = mapper.readTree(raw);
            if (!node.isArray()) {
                return List.of();
            }
            List<Object> out = new ArrayList<>();
            node.forEach(item -> out.add(mapper.convertValue(item, Object.class)));
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    private static Page page(HttpServletRequest request, int defaultSize) {
        try {
            int p = Math.max(1, parse(request.getParameter("page"), 1));
            int size = Math.max(1, Math.min(100, parse(request.getParameter("size"), defaultSize)));
            return new Page(size, (p - 1L) * size);
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static int parse(String raw, int fallback) {
        if (raw == null || raw.isBlank()) {
            return fallback;
        }
        return Integer.parseInt(raw.strip());
    }

    private static String param(HttpServletRequest request, String name) {
        String value = request.getParameter(name);
        return value == null ? "" : value.strip();
    }

    private record Page(int size, long offset) {
    }
}
