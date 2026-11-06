package tech.grunray.wiki.post;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class PostRepository {

    private static final String COLUMNS = """
            SELECT id, legacy_id, slug, title, md_url, summary, keywords, category_id, type,
                   views, created_at, updated_at, published_at, locale, pinned, pinned_order, cover, extra
            FROM post
            """;

    private final JdbcClient jdbc;

    public PostRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** 无发布时间的排最后（API_CONTRACT #7）。 */
    public List<PostRow> findAll() {
        return jdbc.sql(COLUMNS + "ORDER BY published_at IS NULL, published_at DESC, id DESC")
                .query(PostRepository::map)
                .list();
    }

    private static final String VISIBLE = """
             WHERE type <> 1 OR EXISTS (
                SELECT 1 FROM wiki_project wp
                WHERE wp.public_id = JSON_UNQUOTE(JSON_EXTRACT(post.extra, '$.project_id'))
                  AND wp.status <> 2
            )
            """;

    public List<PostRow> findLatestUpdated() {
        return jdbc.sql(COLUMNS + VISIBLE + "ORDER BY COALESCE(updated_at, published_at, created_at) DESC, id DESC LIMIT 3")
                .query(PostRepository::map)
                .list();
    }

    public Optional<PostRow> findRandom() {
        return jdbc.sql(COLUMNS + VISIBLE + "ORDER BY RAND() LIMIT 1").query(PostRepository::map).optional();
    }

    /** 与 Flask 相同的 {@code WHERE slug = ?}：大小写与尾部空格按库排序规则（utf8mb4_unicode_ci）比较。 */
    public Optional<PostRow> findBySlug(String slug) {
        List<PostRow> rows = jdbc.sql(COLUMNS + "WHERE slug = ?").param(slug).query(PostRepository::map).list();
        return rows.stream().findFirst();
    }

    private static PostRow map(ResultSet rs, int rowNum) throws SQLException {
        return new PostRow(
                rs.getLong("id"),
                rs.getString("legacy_id"),
                rs.getString("slug"),
                rs.getString("title"),
                rs.getString("md_url"),
                rs.getString("summary"),
                rs.getString("keywords"),
                rs.getInt("category_id"),
                rs.getInt("type"),
                rs.getInt("views"),
                rs.getObject("updated_at", LocalDateTime.class),
                rs.getObject("published_at", LocalDateTime.class),
                rs.getString("locale"),
                rs.getInt("pinned") != 0,
                rs.getInt("pinned_order"),
                rs.getString("cover"),
                rs.getString("extra"));
    }
}
