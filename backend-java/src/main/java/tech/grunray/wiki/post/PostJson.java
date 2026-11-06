package tech.grunray.wiki.post;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.NullNode;

import tech.grunray.wiki.common.PythonCompat;

/** Flask {@code app/serialize.py#row_to_post}（API_CONTRACT §1.8 Post）。 */
@Component
public class PostJson {

    /** DB type → 前端 type；未知值按 article。 */
    static final Map<Integer, String> TYPE_TO_FRONT = Map.of(0, "article", 1, "project_note", 2, "algorithm");
    static final Map<String, Integer> FRONT_TO_TYPE = Map.of("article", 0, "project_note", 1, "algorithm", 2);

    /** 库内时间无时区，直接拼 {@code .000Z}，不换算（API_CONTRACT §1.4）。 */
    private static final DateTimeFormatter ISO_Z = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss'.000Z'");

    private final ObjectMapper mapper;

    public PostJson(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public Map<String, Object> toJson(PostRow row) {
        List<String> tags = new ArrayList<>();
        JsonNode keywords = parseJson(row.keywords());
        if (keywords != null && keywords.isArray()) {
            keywords.forEach(k -> tags.add(PythonCompat.str(k)));
        }
        JsonNode extra = extra(row);
        String frontType = TYPE_TO_FRONT.getOrDefault(row.type(), "article");

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", isEmpty(row.legacyId()) ? Long.toString(row.id()) : row.legacyId());
        out.put("slug", row.slug());
        out.put("locale", isEmpty(row.locale()) ? "zh" : row.locale());
        out.put("title", row.title());
        out.put("summary", row.summary() == null ? "" : row.summary());
        out.put("published_at", isoZ(row.publishedAt()));
        out.put("updated_at", isoZ(row.updatedAt()));
        out.put("tags", tags);
        out.put("category_id", row.categoryId());
        out.put("pinned", row.pinned());
        out.put("pinned_order", row.pinnedOrder() == 0 ? 9999 : row.pinnedOrder());
        out.put("type", frontType);
        if (!isEmpty(row.cover())) {
            out.put("cover", row.cover());
        }
        if (frontType.equals("algorithm")) {
            for (String key : List.of("difficulty", "oj", "problem_id", "series")) {
                out.put(key, extraValue(extra, key));
            }
        } else if (frontType.equals("project_note")) {
            for (String key : List.of("project_id", "role", "feature_key")) {
                out.put(key, extraValue(extra, key));
            }
        }
        return out;
    }

    /** {@code extra} 解析为对象；不是 JSON 对象时视为空对象。 */
    public JsonNode extra(PostRow row) {
        JsonNode node = parseJson(row.extra());
        return node != null && node.isObject() ? node : mapper.createObjectNode();
    }

    private static JsonNode extraValue(JsonNode extra, String key) {
        JsonNode v = extra.get(key);
        return v == null ? NullNode.getInstance() : v;
    }

    private JsonNode parseJson(String raw) {
        if (raw == null) {
            return null;
        }
        try {
            return mapper.readTree(raw);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    private static String isoZ(LocalDateTime dt) {
        return dt == null ? "" : ISO_Z.format(dt);
    }

    private static boolean isEmpty(String s) {
        return s == null || s.isEmpty();
    }
}
