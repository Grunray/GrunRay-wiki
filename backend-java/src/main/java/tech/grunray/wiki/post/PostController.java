package tech.grunray.wiki.post;

import java.math.BigInteger;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;

import jakarta.servlet.http.HttpServletRequest;
import tech.grunray.wiki.common.ContentFiles;
import tech.grunray.wiki.common.Envelopes;
import tech.grunray.wiki.common.PythonCompat;
import tech.grunray.wiki.markdown.MarkdownRenderer;

/**
 * 文章读接口（API_CONTRACT #7–#10）。查询参数一律用 {@link HttpServletRequest#getParameter}：
 * 同名参数重复时取第一个，与 Flask {@code request.args.get} 一致。
 */
@RestController
@RequestMapping("/api/posts")
public class PostController {

    private static final Set<String> TRUTHY_HTML = Set.of("1", "true", "yes");

    private final PostRepository repo;
    private final PostJson json;
    private final ContentFiles files;
    private final MarkdownRenderer markdown;

    public PostController(PostRepository repo, PostJson json, ContentFiles files, MarkdownRenderer markdown) {
        this.repo = repo;
        this.json = json;
        this.files = files;
        this.markdown = markdown;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        String typeParam = request.getParameter("type");
        String projectId = request.getParameter("project_id");
        String categoryParam = request.getParameter("category_id");

        BigInteger categoryId = null;
        if (categoryParam != null && !categoryParam.strip().isEmpty()) {
            Optional<BigInteger> parsed = PythonCompat.parseInt(categoryParam);
            if (parsed.isEmpty()) {
                return Envelopes.errorA("invalid category_id", HttpStatus.BAD_REQUEST);
            }
            categoryId = parsed.get();
        }

        List<Map<String, Object>> out = new ArrayList<>();
        for (PostRow row : repo.findAll()) {
            if (typeParam != null && !typeParam.isEmpty()) {
                Integer want = PostJson.FRONT_TO_TYPE.get(typeParam);
                if (want == null || row.type() != want) {
                    continue;
                }
            }
            if (projectId != null && !projectId.isEmpty()) {
                JsonNode pid = json.extra(row).get("project_id");
                if (row.type() != 1 || pid == null || !pid.isTextual() || !pid.textValue().equals(projectId)) {
                    continue;
                }
            }
            if (categoryId != null && !BigInteger.valueOf(row.categoryId()).equals(categoryId)) {
                continue;
            }
            out.add(json.toJson(row));
        }
        return ResponseEntity.ok(Map.of("posts", out));
    }

    @GetMapping("/latest-updated")
    public Map<String, Object> latestUpdated() {
        return Map.of("posts", repo.findLatestUpdated().stream().map(json::toJson).toList());
    }

    @GetMapping("/random-recommend")
    public ResponseEntity<?> randomRecommend() {
        return repo.findRandom()
                .<ResponseEntity<?>>map(row -> ResponseEntity.ok(Map.of("post", json.toJson(row))))
                .orElseGet(Envelopes::notFound);
    }

    @GetMapping("/{slug}")
    public ResponseEntity<?> detail(@PathVariable String slug, HttpServletRequest request) {
        Optional<PostRow> found = repo.findBySlug(slug);
        if (found.isEmpty()) {
            return Envelopes.notFound();
        }
        PostRow row = found.get();
        Map<String, Object> data = json.toJson(row);
        String body = files.readMarkdown(row.mdUrl());
        data.put("body", body);
        String html = request.getParameter("html");
        if (html != null && TRUTHY_HTML.contains(html.toLowerCase(Locale.ROOT))) {
            data.put("body_html", markdown.render(body));
        }
        return ResponseEntity.ok(data);
    }

    @GetMapping("/{slug}/related")
    public ResponseEntity<?> related(@PathVariable String slug, HttpServletRequest request) {
        Optional<PostRow> found = repo.findBySlug(slug);
        if (found.isEmpty()) {
            return Envelopes.notFound();
        }
        int limit = relatedLimit(request.getParameter("limit"));
        List<PostRow> others = repo.findAll().stream().filter(row -> !row.slug().equals(found.get().slug())).toList();
        List<Map<String, Object>> posts = PostSearch.related(found.get(), others, json, limit).stream()
                .map(json::toJson)
                .toList();
        return ResponseEntity.ok(Map.of("posts", posts));
    }

    private static int relatedLimit(String raw) {
        if (raw == null) {
            return 5;
        }
        Optional<BigInteger> parsed = PythonCompat.parseInt(raw);
        if (parsed.isEmpty()) {
            return 5;
        }
        int value = parsed.get().intValue();
        return Math.max(1, Math.min(20, value));
    }
}
