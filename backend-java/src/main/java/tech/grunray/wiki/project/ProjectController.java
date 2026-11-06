package tech.grunray.wiki.project;

import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import tech.grunray.wiki.common.Envelopes;
import tech.grunray.wiki.project.ProjectJson.ProjectRow;

/** 项目列表与详情（API_CONTRACT #17 #18）。 */
@RestController
public class ProjectController {

    private static final String COLUMNS = """
            SELECT public_id, slug, locale, title, summary, tags, status, featured, year,
                   start_date, end_date, github_url, demo_url, layout, related_posts_json
            FROM wiki_project
            """;

    private final JdbcClient jdbc;
    private final ProjectJson json;

    public ProjectController(JdbcClient jdbc, ProjectJson json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @GetMapping("/api/projects")
    public Map<String, Object> list(HttpServletRequest request) {
        String raw = request.getParameter("include_archived");
        if (raw == null) {
            raw = "true";
        }
        boolean includeArchived = switch (raw.toLowerCase(Locale.ROOT)) {
            case "1", "true", "yes" -> true;
            default -> false;
        };
        String sql = COLUMNS + " WHERE status <> 2";
        if (!includeArchived) {
            sql += " AND status <> 1";
        }
        sql += " ORDER BY start_date IS NULL, start_date DESC, id DESC";
        List<Map<String, Object>> projects = jdbc.sql(sql).query(ProjectController::map).list().stream()
                .map(json::toListJson)
                .toList();
        return Map.of("projects", projects);
    }

    @GetMapping("/api/projects/{slug}")
    public ResponseEntity<?> detail(@PathVariable String slug) {
        ProjectRow row = jdbc.sql(COLUMNS + " WHERE slug = ? LIMIT 1")
                .param(slug)
                .query(ProjectController::map)
                .optional()
                .orElse(null);
        if (row == null || row.status() == 2) {
            return Envelopes.notFound();
        }
        return ResponseEntity.ok(json.toDetailJson(row));
    }

    private static ProjectRow map(java.sql.ResultSet rs, int n) throws java.sql.SQLException {
        int featuredRaw = rs.getInt("featured");
        Boolean featured = rs.wasNull() ? null : featuredRaw != 0;
        int yearRaw = rs.getInt("year");
        Integer year = rs.wasNull() ? null : yearRaw;
        return new ProjectRow(
                rs.getString("public_id"),
                rs.getString("slug"),
                rs.getString("locale"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getString("tags"),
                rs.getInt("status"),
                featured,
                year,
                rs.getObject("start_date", LocalDate.class),
                rs.getObject("end_date", LocalDate.class),
                rs.getString("github_url"),
                rs.getString("demo_url"),
                rs.getString("layout"),
                rs.getString("related_posts_json"));
    }
}
