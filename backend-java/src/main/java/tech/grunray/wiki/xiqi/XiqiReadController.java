package tech.grunray.wiki.xiqi;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;
import org.yaml.snakeyaml.Yaml;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import tech.grunray.wiki.auth.GuestUsers;
import tech.grunray.wiki.common.ContentFiles;
import tech.grunray.wiki.common.Dates;
import tech.grunray.wiki.common.Envelopes;
import tech.grunray.wiki.markdown.MarkdownRenderer;

/** 碎念、推荐、栖息页、关于、此刻的公开读（API_CONTRACT #19–#24、#47）。 */
@RestController
public class XiqiReadController {

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final ContentFiles files;
    private final MarkdownRenderer markdown;
    private final GuestUsers users;

    public XiqiReadController(JdbcClient jdbc, ObjectMapper mapper, ContentFiles files, MarkdownRenderer markdown, GuestUsers users) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.files = files;
        this.markdown = markdown;
        this.users = users;
    }

    @GetMapping("/api/fragments")
    public ResponseEntity<?> fragments(HttpServletRequest request) {
        Page page = page(request, 50, 50);
        if (page == null) {
            return Envelopes.errorB("invalid page/size", HttpStatus.BAD_REQUEST);
        }
        String mood = lowerOrNull(request.getParameter("mood"));
        String sort = sort(request.getParameter("sort"));
        return ResponseEntity.ok(Envelopes.ok(list("fragment", mood, null, null, sort, page, true)));
    }

    @GetMapping("/api/fragments/{publicId}")
    public ResponseEntity<?> fragment(@PathVariable String publicId) {
        Map<String, Object> row = one("""
                SELECT public_id, mood, status, md_url, images, cover_index, summary, created_at
                FROM fragment WHERE public_id = ?
                """, publicId);
        if (row == null || !"published".equals(row.get("status"))) {
            return Envelopes.errorB("not_found", HttpStatus.NOT_FOUND);
        }
        String body = files.readMarkdown(String.valueOf(row.get("md_url")));
        Map<String, Object> data = fragmentItem(row);
        data.put("body", body);
        data.put("bodyHtml", markdown.render(body));
        List<Map<String, String>> images = images(row.get("images"));
        if (!images.isEmpty()) {
            data.put("images", images);
            data.put("coverIndex", coverIndex(row, images.size()));
        }
        return ResponseEntity.ok(Envelopes.ok(data));
    }

    @GetMapping("/api/recommendations")
    public ResponseEntity<?> recommendations(HttpServletRequest request) {
        String category = lowerOrNull(request.getParameter("category"));
        if (category != null && !category.equals("software") && !category.equals("opensource") && !category.equals("anime")) {
            return Envelopes.errorB("invalid category", HttpStatus.BAD_REQUEST);
        }
        Integer rating = null;
        String ratingRaw = request.getParameter("rating");
        if (ratingRaw != null && !ratingRaw.isBlank()) {
            try {
                rating = Integer.parseInt(ratingRaw.strip());
            } catch (NumberFormatException e) {
                rating = -1;
            }
            if (rating < 1 || rating > 5) {
                return Envelopes.errorB("invalid rating", HttpStatus.BAD_REQUEST);
            }
        }
        Page page = page(request, 50, 50);
        if (page == null) {
            return Envelopes.errorB("invalid page/size", HttpStatus.BAD_REQUEST);
        }
        return ResponseEntity.ok(Envelopes.ok(list("xiqi_recommend", null, category, rating, sort(request.getParameter("sort")), page, false)));
    }

    @GetMapping("/api/recommendations/{publicId}")
    public ResponseEntity<?> recommendation(@PathVariable String publicId) {
        Map<String, Object> row = one("""
                SELECT public_id, category, rating, title, status, md_url, images, cover_index, summary, url, created_at
                FROM xiqi_recommend WHERE public_id = ?
                """, publicId);
        if (row == null || !"published".equals(row.get("status"))) {
            return Envelopes.errorB("not_found", HttpStatus.NOT_FOUND);
        }
        String body = files.readMarkdown(String.valueOf(row.get("md_url")));
        Map<String, Object> data = recommendItem(row);
        data.put("body", body);
        data.put("bodyHtml", markdown.render(body));
        List<Map<String, String>> images = images(row.get("images"));
        if (!images.isEmpty()) {
            data.put("images", images);
            data.put("coverIndex", coverIndex(row, images.size()));
        }
        return ResponseEntity.ok(Envelopes.ok(data));
    }

    @GetMapping("/api/xiqi/pages/{page}")
    public Map<String, Object> page(@PathVariable String page) {
        String name = page.strip().toLowerCase(Locale.ROOT);
        Map<String, Object> row = one("""
                SELECT page, hero_image_url, hero_image_alt, status, updated_at
                FROM xiqi_page WHERE page = ?
                """, name);
        Map<String, Object> data = new LinkedHashMap<>();
        if (row == null || !"published".equals(row.get("status"))) {
            data.put("page", name);
            data.put("heroImageUrl", null);
            data.put("heroImageAlt", "");
            data.put("status", "published");
            data.put("updatedAt", null);
        } else {
            Object hero = row.get("hero_image_url");
            data.put("page", row.get("page"));
            data.put("heroImageUrl", hero == null || String.valueOf(hero).isEmpty() ? null : hero);
            Object alt = row.get("hero_image_alt");
            data.put("heroImageAlt", alt == null ? "" : alt);
            data.put("status", row.get("status"));
            data.put("updatedAt", Dates.isoLocal((LocalDateTime) row.get("updated_at")));
        }
        return Envelopes.ok(data);
    }

    @GetMapping("/api/xiqi/about")
    public Map<String, Object> about() {
        Map<String, Object> row = one("SELECT status, md_url, updated_at FROM xiqi_about WHERE id = 1", null);
        if (row == null || !"published".equals(row.get("status"))) {
            return Envelopes.ok(null);
        }
        String text = files.readMarkdown(String.valueOf(row.get("md_url")));
        Map<String, Object> profile = AboutProfile.parse(text);
        if (profile == null) {
            return Envelopes.ok(null);
        }
        profile.put("updatedAt", Dates.isoLocal((LocalDateTime) row.get("updated_at")));
        return Envelopes.ok(profile);
    }

    @GetMapping("/api/site/now")
    public Map<String, Object> siteNow() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("doing", null);
        data.put("reading", null);
        data.put("updatedAt", null);
        try {
            Map<String, Object> row = one("SELECT doing, reading, updated_at FROM site_now WHERE id = 1", null);
            if (row != null) {
                data.put("doing", emptyToNull(row.get("doing")));
                data.put("reading", emptyToNull(row.get("reading")));
                data.put("updatedAt", row.get("updated_at") == null ? null : Dates.sql((LocalDateTime) row.get("updated_at")));
            }
        } catch (RuntimeException ignored) {
            // 表不存在时与 Flask 一样返回空对象
        }
        return Envelopes.ok(data);
    }

    @PutMapping("/api/site/now")
    public ResponseEntity<?> saveSiteNow(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        @SuppressWarnings("unchecked")
        Map<String, Object> user = session == null ? null : (Map<String, Object>) session.getAttribute(GuestUsers.USER);
        if (user == null || user.get("guest_user_id") == null) {
            return Envelopes.errorB("请先登录", HttpStatus.UNAUTHORIZED);
        }
        if (!users.isSiteOwner(user)) {
            return Envelopes.errorB("需要站长权限", HttpStatus.FORBIDDEN);
        }
        body = body == null ? Map.of() : body;
        String doing;
        String reading;
        try {
            doing = nowField(body.get("doing"), "doing");
            reading = nowField(body.get("reading"), "reading");
        } catch (IllegalArgumentException e) {
            return Envelopes.errorB(e.getMessage(), HttpStatus.BAD_REQUEST);
        }
        jdbc.sql("""
                INSERT INTO site_now (id, doing, reading)
                VALUES (1, ?, ?)
                ON DUPLICATE KEY UPDATE doing = VALUES(doing), reading = VALUES(reading)
                """).param(doing).param(reading).update();
        Map<String, Object> row = one("SELECT doing, reading, updated_at FROM site_now WHERE id = 1", null);
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("doing", emptyToNull(row.get("doing")));
        data.put("reading", emptyToNull(row.get("reading")));
        data.put("updatedAt", Dates.sql((LocalDateTime) row.get("updated_at")));
        return ResponseEntity.ok(Envelopes.okWithMessage(data, "已更新此刻状态"));
    }

    private static String nowField(Object raw, String field) {
        String text = raw == null ? "" : String.valueOf(raw);
        text = text.replaceAll("<[^>]+>", "").strip();
        if (text.length() > 200) {
            throw new IllegalArgumentException(field + " 最多 200 字");
        }
        return text;
    }

    private Map<String, Object> list(String table, String mood, String category, Integer rating, String sort, Page page, boolean fragment) {
        List<String> where = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        where.add("status = 'published'");
        if (mood != null) {
            where.add("mood = ?");
            args.add(mood);
        }
        if (category != null) {
            where.add("category = ?");
            args.add(category);
        }
        if (rating != null) {
            where.add("rating = ?");
            args.add(rating);
        }
        String whereSql = String.join(" AND ", where);
        Long total = count(table, whereSql, args);
        String cols = fragment
                ? "public_id, mood, summary, images, cover_index, created_at"
                : "public_id, category, rating, title, summary, url, images, cover_index, created_at";
        String order = "oldest".equals(sort) ? "ASC" : "DESC";
        var spec = jdbc.sql("SELECT " + cols + " FROM " + table + " WHERE " + whereSql
                + " ORDER BY created_at " + order + ", id " + order + " LIMIT ? OFFSET ?");
        for (Object arg : args) {
            spec = spec.param(arg);
        }
        spec = spec.param(page.size()).param(page.offset());
        List<Map<String, Object>> items = spec.query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("public_id", rs.getString("public_id"));
            row.put("summary", rs.getString("summary"));
            row.put("images", rs.getString("images"));
            row.put("cover_index", rs.getInt("cover_index"));
            row.put("created_at", rs.getObject("created_at", LocalDateTime.class));
            if (fragment) {
                row.put("mood", rs.getString("mood"));
                return fragmentItem(row);
            }
            row.put("category", rs.getString("category"));
            row.put("rating", rs.getInt("rating"));
            row.put("title", rs.getString("title"));
            row.put("url", rs.getString("url"));
            return recommendItem(row);
        }).list();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", items);
        data.put("total", total == null ? 0 : total.intValue());
        data.put("page", page.page());
        data.put("size", page.size());
        return data;
    }

    private Long count(String table, String whereSql, List<Object> args) {
        var spec = jdbc.sql("SELECT COUNT(*) FROM " + table + " WHERE " + whereSql);
        for (Object arg : args) {
            spec = spec.param(arg);
        }
        return spec.query(Long.class).single();
    }

    private Map<String, Object> fragmentItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("public_id"));
        item.put("content", row.get("summary") == null ? "" : row.get("summary"));
        item.put("mood", row.get("mood"));
        item.put("createdAt", Dates.isoLocal((LocalDateTime) row.get("created_at")));
        cover(item, row);
        return item;
    }

    private Map<String, Object> recommendItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("public_id"));
        item.put("category", row.get("category"));
        item.put("title", row.get("title"));
        item.put("rating", row.get("rating"));
        item.put("summary", row.get("summary") == null ? "" : row.get("summary"));
        item.put("createdAt", Dates.isoLocal((LocalDateTime) row.get("created_at")));
        Object url = row.get("url");
        if (url != null && !String.valueOf(url).isEmpty()) {
            item.put("url", url);
        }
        cover(item, row);
        return item;
    }

    private void cover(Map<String, Object> item, Map<String, Object> row) {
        List<Map<String, String>> images = images(row.get("images"));
        if (images.isEmpty()) {
            return;
        }
        int idx = Math.max(0, Math.min(coverIndex(row, images.size()), images.size() - 1));
        Map<String, String> cover = images.get(idx);
        if (cover.get("url") != null && !cover.get("url").isEmpty()) {
            item.put("imageUrl", cover.get("url"));
        }
        if (cover.get("alt") != null && !cover.get("alt").isEmpty()) {
            item.put("imageAlt", cover.get("alt"));
        }
    }

    private int coverIndex(Map<String, Object> row, int size) {
        Object raw = row.get("cover_index");
        int idx = raw instanceof Number n ? n.intValue() : 0;
        return Math.max(0, Math.min(idx, Math.max(0, size - 1)));
    }

    private List<Map<String, String>> images(Object raw) {
        if (raw == null) {
            return List.of();
        }
        try {
            JsonNode node = raw instanceof String s ? mapper.readTree(s) : mapper.valueToTree(raw);
            if (!node.isArray()) {
                return List.of();
            }
            List<Map<String, String>> out = new ArrayList<>();
            for (JsonNode item : node) {
                if (!item.isObject() || !item.hasNonNull("url")) {
                    continue;
                }
                Map<String, String> image = new LinkedHashMap<>();
                image.put("url", item.get("url").asText());
                image.put("alt", item.path("alt").asText(""));
                out.add(image);
            }
            return out;
        } catch (Exception e) {
            return List.of();
        }
    }

    private Map<String, Object> one(String sql, String param) {
        var spec = jdbc.sql(sql);
        if (param != null) {
            spec = spec.param(param);
        }
        List<Map<String, Object>> rows = spec.query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            var meta = rs.getMetaData();
            for (int i = 1; i <= meta.getColumnCount(); i++) {
                String label = meta.getColumnLabel(i);
                Object value = switch (label) {
                    case "created_at", "updated_at" -> rs.getObject(i, LocalDateTime.class);
                    case "rating", "cover_index" -> rs.getInt(i);
                    default -> rs.getString(i);
                };
                row.put(label, value);
            }
            return row;
        }).list();
        return rows.isEmpty() ? null : rows.get(0);
    }

    private static Page page(HttpServletRequest request, int defaultSize, int max) {
        try {
            int p = Math.max(1, parse(request.getParameter("page"), 1));
            int size = Math.max(1, Math.min(max, parse(request.getParameter("size"), defaultSize)));
            return new Page(p, size, (p - 1L) * size);
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

    private static String sort(String raw) {
        String value = raw == null ? "newest" : raw.strip().toLowerCase(Locale.ROOT);
        return "oldest".equals(value) ? "oldest" : "newest";
    }

    private static String lowerOrNull(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        return raw.strip().toLowerCase(Locale.ROOT);
    }

    private static String emptyToNull(Object value) {
        if (value == null) {
            return null;
        }
        String text = String.valueOf(value).strip();
        return text.isEmpty() ? null : text;
    }

    private record Page(int page, int size, long offset) {
    }

    /** 公开关于页：只取 front matter，不下发 *_raw。解析失败当空。 */
    static final class AboutProfile {
        private AboutProfile() {
        }

        @SuppressWarnings("unchecked")
        static Map<String, Object> parse(String markdown) {
            if (markdown == null || !markdown.startsWith("---")) {
                return null;
            }
            int end = markdown.indexOf("\n---", 3);
            if (end < 0) {
                return null;
            }
            Object loaded = new Yaml().load(markdown.substring(3, end));
            if (!(loaded instanceof Map<?, ?> meta)) {
                return null;
            }
            Map<String, Object> map = (Map<String, Object>) meta;
            if (blank(map.get("alias"))) {
                return null;
            }
            Map<String, Object> out = new LinkedHashMap<>();
            out.put("alias", str(map.get("alias")));
            out.put("genderAge", str(map.get("gender_age")));
            out.put("email", str(map.get("email")));
            out.put("intro", str(map.get("intro")));
            out.put("awards", awards(map.get("awards")));
            out.put("education", section(map.get("education"),
                    "school_public", "schoolPublic", "degree", "degree", "major", "major", "period", "period"));
            out.put("internship", section(map.get("internship"),
                    "company_public", "companyPublic", "role", "role", "period", "period"));
            out.put("club", section(map.get("club"),
                    "name_public", "namePublic", "role", "role", "period", "period"));
            out.put("certificates", strings(map.get("certificates")));
            return out;
        }

        private static List<Map<String, String>> awards(Object raw) {
            if (!(raw instanceof List<?> list)) {
                return List.of();
            }
            List<Map<String, String>> out = new ArrayList<>();
            for (Object item : list) {
                if (!(item instanceof Map<?, ?> map)) {
                    continue;
                }
                Map<String, String> award = new LinkedHashMap<>();
                award.put("id", str(map.get("id")));
                award.put("label", str(map.get("label")));
                award.put("tier", str(map.get("tier")));
                out.add(award);
            }
            return out;
        }

        private static Map<String, String> section(Object raw, String... pairs) {
            Map<?, ?> map = raw instanceof Map<?, ?> m ? m : Map.of();
            Map<String, String> out = new LinkedHashMap<>();
            for (int i = 0; i < pairs.length; i += 2) {
                out.put(pairs[i + 1], str(map.get(pairs[i])));
            }
            return out;
        }

        private static List<String> strings(Object raw) {
            if (!(raw instanceof List<?> list)) {
                return List.of();
            }
            List<String> out = new ArrayList<>();
            for (Object item : list) {
                String text = str(item);
                if (!text.isEmpty()) {
                    out.add(text);
                }
            }
            return out;
        }

        private static boolean blank(Object value) {
            return str(value).isEmpty();
        }

        private static String str(Object value) {
            return value == null ? "" : String.valueOf(value).strip();
        }
    }
}
