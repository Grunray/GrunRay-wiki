package tech.grunray.wiki.feed;

import java.io.IOException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletResponse;
import tech.grunray.wiki.common.AppProperties;
import tech.grunray.wiki.common.Dates;

/** {@code /}、RSS、sitemap、robots（API_CONTRACT #1–#4）。 */
@RestController
public class FeedController {

    private static final List<String[]> STATIC_PAGES = List.of(
            new String[] {"/", "daily", "1.0"},
            new String[] {"/blog", "daily", "0.9"},
            new String[] {"/projects", "weekly", "0.9"},
            new String[] {"/fragments", "daily", "0.7"},
            new String[] {"/recommend", "weekly", "0.6"},
            new String[] {"/friends", "weekly", "0.5"},
            new String[] {"/about", "monthly", "0.6"},
            new String[] {"/messages", "weekly", "0.4"},
            new String[] {"/legal", "yearly", "0.3"},
            new String[] {"/design", "monthly", "0.3"});

    private final JdbcClient jdbc;
    private final AppProperties props;
    private final ObjectMapper mapper;

    public FeedController(JdbcClient jdbc, AppProperties props, ObjectMapper mapper) {
        this.jdbc = jdbc;
        this.props = props;
        this.mapper = mapper;
    }

    @GetMapping("/")
    public java.util.Map<String, String> index() {
        return java.util.Map.of(
                "service", "GrunRay wiki API",
                "content_root", props.contentRootPath().toString());
    }

    @GetMapping("/rss.xml")
    public void rss(HttpServletResponse response) throws IOException {
        write(response, "application/rss+xml; charset=utf-8", rssXml(visiblePosts(50)));
    }

    @GetMapping("/sitemap.xml")
    public void sitemap(HttpServletResponse response) throws IOException {
        write(response, "application/xml; charset=utf-8", sitemapXml());
    }

    @GetMapping("/robots.txt")
    public void robots(HttpServletResponse response) throws IOException {
        String origin = props.siteOrigin();
        String body = "User-agent: *\nAllow: /\nDisallow: /api/\n"
                + (origin.isEmpty() ? "" : "Sitemap: " + origin + "/sitemap.xml\n");
        write(response, "text/plain; charset=utf-8", body);
    }

    private static void write(HttpServletResponse response, String contentType, String body) throws IOException {
        byte[] bytes = body.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        response.setStatus(200);
        response.setHeader("Content-Type", contentType);
        response.setContentLength(bytes.length);
        response.getOutputStream().write(bytes);
    }

    private String rssXml(List<PostRef> posts) {
        String origin = props.siteOrigin();
        String home = origin.isEmpty() ? "/" : origin;
        String feed = origin.isEmpty() ? "/rss.xml" : origin + "/rss.xml";
        String title = xml(props.siteTitle());
        String desc = xml(props.siteDescription());
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n");
        sb.append("  <channel>\n");
        sb.append("    <title>").append(title).append("</title>\n");
        sb.append("    <link>").append(xml(home)).append("</link>\n");
        sb.append("    <description>").append(desc).append("</description>\n");
        sb.append("    <language>zh-CN</language>\n");
        sb.append("    <atom:link href=\"").append(xml(feed)).append("\" rel=\"self\" type=\"application/rss+xml\" />\n");
        String logo = props.siteLogoAbsolute();
        if (!logo.isEmpty()) {
            sb.append("    <image><url>").append(xml(logo)).append("</url><title>").append(title)
                    .append("</title><link>").append(xml(home)).append("</link></image>\n");
        }
        if (!posts.isEmpty()) {
            String built = Dates.rfc1123Utc(posts.get(0).publishedAt());
            if (!built.isEmpty()) {
                sb.append("    <lastBuildDate>").append(built).append("</lastBuildDate>\n");
            }
        }
        for (PostRef post : posts) {
            if (post.slug() == null || post.slug().isBlank()) {
                continue;
            }
            String link = origin.isEmpty() ? "/blog/" + post.slug() : origin + "/blog/" + post.slug();
            String itemTitle = (post.title() == null || post.title().isBlank()) ? post.slug() : post.title().strip();
            sb.append("    <item>\n");
            sb.append("      <title>").append(xml(itemTitle)).append("</title>\n");
            sb.append("      <link>").append(xml(link)).append("</link>\n");
            sb.append("      <guid isPermaLink=\"true\">").append(xml(link)).append("</guid>\n");
            String summary = plain(post.summary());
            if (!summary.isEmpty()) {
                sb.append("      <description>").append(xml(summary)).append("</description>\n");
            }
            String pub = Dates.rfc1123Utc(post.publishedAt());
            if (!pub.isEmpty()) {
                sb.append("      <pubDate>").append(pub).append("</pubDate>\n");
            }
            sb.append("      <category>").append(xml(post.frontType())).append("</category>\n");
            sb.append("    </item>\n");
        }
        sb.append("  </channel>\n</rss>\n");
        return sb.toString();
    }

    private String sitemapXml() {
        String origin = props.siteOrigin();
        Set<String> hidden = Set.copyOf(jdbc.sql("SELECT public_id FROM wiki_project WHERE status = 2")
                .query(String.class).list());
        StringBuilder sb = new StringBuilder();
        sb.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        sb.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (String[] page : STATIC_PAGES) {
            sb.append(url(loc(origin, page[0]), "", page[1], page[2]));
        }
        List<PostRef> posts = jdbc.sql("""
                SELECT slug, type, published_at, updated_at, extra
                FROM post
                WHERE published_at IS NOT NULL
                ORDER BY published_at DESC, id DESC
                LIMIT 1000
                """).query((rs, n) -> new PostRef(
                rs.getString("slug"),
                "",
                null,
                rs.getInt("type"),
                rs.getObject("published_at", LocalDateTime.class),
                rs.getObject("updated_at", LocalDateTime.class),
                rs.getString("extra"))).list();
        for (PostRef post : posts) {
            if (post.slug() == null || post.slug().isBlank()) {
                continue;
            }
            if (post.type() == 1 && hidden.contains(projectId(post.extra()))) {
                continue;
            }
            LocalDateTime last = post.updatedAt() != null ? post.updatedAt() : post.publishedAt();
            String lastmod = last == null ? "" : last.toLocalDate().toString();
            sb.append(url(loc(origin, "/blog/" + post.slug().strip()), lastmod, "weekly", "0.8"));
        }
        List<ProjectRef> projects = jdbc.sql("""
                SELECT slug, start_date FROM wiki_project
                WHERE status != 2
                ORDER BY start_date IS NULL, start_date DESC
                """).query((rs, n) -> new ProjectRef(rs.getString("slug"), rs.getObject("start_date", LocalDate.class))).list();
        for (ProjectRef project : projects) {
            if (project.slug() == null || project.slug().isBlank()) {
                continue;
            }
            String lastmod = project.start() == null ? "" : project.start().toString();
            sb.append(url(loc(origin, "/projects/" + project.slug().strip()), lastmod, "monthly", "0.7"));
        }
        sb.append("</urlset>\n");
        return sb.toString();
    }

    private List<PostRef> visiblePosts(int limit) {
        Set<String> hidden = Set.copyOf(jdbc.sql("SELECT public_id FROM wiki_project WHERE status = 2")
                .query(String.class).list());
        List<PostRef> rows = jdbc.sql("""
                SELECT slug, title, summary, type, published_at, updated_at, extra
                FROM post
                WHERE published_at IS NOT NULL
                ORDER BY published_at DESC, id DESC
                LIMIT ?
                """).param(Math.max(limit * 3, limit)).query((rs, n) -> new PostRef(
                rs.getString("slug"),
                rs.getString("title"),
                rs.getString("summary"),
                rs.getInt("type"),
                rs.getObject("published_at", LocalDateTime.class),
                rs.getObject("updated_at", LocalDateTime.class),
                rs.getString("extra"))).list();
        List<PostRef> out = new ArrayList<>();
        for (PostRef row : rows) {
            if (row.type() == 1 && hidden.contains(projectId(row.extra()))) {
                continue;
            }
            out.add(row);
            if (out.size() >= limit) {
                break;
            }
        }
        return out;
    }

    private String projectId(String extra) {
        if (extra == null || extra.isBlank()) {
            return "";
        }
        try {
            JsonNode node = mapper.readTree(extra);
            JsonNode id = node.get("project_id");
            return id == null || id.isNull() ? "" : id.asText().strip();
        } catch (Exception e) {
            return "";
        }
    }

    private static String url(String loc, String lastmod, String freq, String priority) {
        StringBuilder sb = new StringBuilder();
        sb.append("  <url>\n    <loc>").append(loc).append("</loc>\n");
        if (!lastmod.isEmpty()) {
            sb.append("    <lastmod>").append(lastmod).append("</lastmod>\n");
        }
        sb.append("    <changefreq>").append(freq).append("</changefreq>\n");
        sb.append("    <priority>").append(priority).append("</priority>\n  </url>\n");
        return sb.toString();
    }

    private static String loc(String origin, String path) {
        return xml((origin.isEmpty() ? "" : origin) + path);
    }

    private static String plain(String summary) {
        if (summary == null) {
            return "";
        }
        return summary.strip().replaceAll("\\s+", " ");
    }

    private static String xml(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private record PostRef(
            String slug,
            String title,
            String summary,
            int type,
            LocalDateTime publishedAt,
            LocalDateTime updatedAt,
            String extra) {
        String frontType() {
            return switch (type) {
                case 1 -> "project_note";
                case 2 -> "algorithm";
                default -> "article";
            };
        }
    }

    private record ProjectRef(String slug, LocalDate start) {
    }
}
