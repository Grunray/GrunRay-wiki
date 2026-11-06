package tech.grunray.wiki.post;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

class PostJsonTest {

    private final ObjectMapper mapper = new ObjectMapper();
    private final PostJson json = new PostJson(mapper);

    private static PostRow row(String legacyId, int type, int pinnedOrder, String cover, String keywords, String extra,
            LocalDateTime publishedAt) {
        return new PostRow(42, legacyId, "slug", "标题", "posts/slug.md", null, keywords, 3, type, 0,
                LocalDateTime.of(2026, 10, 5, 9, 30), publishedAt, "", true, pinnedOrder, cover, extra);
    }

    @Test
    void articleFieldsMatchFlask() {
        Map<String, Object> out = json.toJson(row(null, 0, 0, "", "[\"契约\", 7]", null,
                LocalDateTime.of(2026, 10, 1, 8, 0)));
        assertThat(out).containsOnlyKeys("id", "slug", "locale", "title", "summary", "published_at", "updated_at",
                "tags", "category_id", "pinned", "pinned_order", "type");
        assertThat(out).containsEntry("id", "42")
                .containsEntry("locale", "zh")
                .containsEntry("summary", "")
                .containsEntry("published_at", "2026-10-01T08:00:00.000Z")
                .containsEntry("updated_at", "2026-10-05T09:30:00.000Z")
                .containsEntry("category_id", 3)
                .containsEntry("pinned", true)
                .containsEntry("pinned_order", 9999)
                .containsEntry("tags", List.of("契约", "7"))
                .containsEntry("type", "article");
    }

    @Test
    void emptyPublishedAtIsEmptyString() {
        Map<String, Object> out = json.toJson(row("legacy-1", 0, 5, "/c.png", null, "not json", null));
        assertThat(out).containsEntry("id", "legacy-1")
                .containsEntry("published_at", "")
                .containsEntry("pinned_order", 5)
                .containsEntry("cover", "/c.png")
                .containsEntry("tags", List.of());
    }

    @Test
    void algorithmAndProjectNoteExtras() {
        JsonNode algo = mapper.valueToTree(json.toJson(row(null, 2, 1, null, "[]", "{\"difficulty\":\"普及\",\"oj\":null}", null)));
        assertThat(algo.get("type").asText()).isEqualTo("algorithm");
        assertThat(algo.get("difficulty").asText()).isEqualTo("普及");
        assertThat(algo.get("oj").isNull()).isTrue();
        assertThat(algo.get("series").isNull()).isTrue();

        Map<String, Object> note = json.toJson(row(null, 1, 1, null, "[]", "{\"project_id\":\"proj-a\"}", null));
        assertThat(note).containsEntry("type", "project_note").containsKeys("project_id", "role", "feature_key");

        Map<String, Object> unknown = json.toJson(row(null, 9, 1, null, "[]", null, null));
        assertThat(unknown).containsEntry("type", "article");
    }
}
