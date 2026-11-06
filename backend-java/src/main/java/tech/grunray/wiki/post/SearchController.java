package tech.grunray.wiki.post;

import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;

/** {@code GET /api/search}（API_CONTRACT #11）。 */
@RestController
public class SearchController {

    private final PostRepository repo;
    private final PostJson json;

    public SearchController(PostRepository repo, PostJson json) {
        this.repo = repo;
        this.json = json;
    }

    @GetMapping("/api/search")
    public Map<String, Object> search(HttpServletRequest request) {
        String q = request.getParameter("q");
        if (q == null) {
            q = "";
        }
        List<String> terms = PostSearch.splitTerms(q);
        if (terms.isEmpty()) {
            return Map.of("query", q, "results", List.of());
        }
        List<Map<String, Object>> results = PostSearch.rank(repo.findAll(), terms, json).stream()
                .map(json::toJson)
                .toList();
        return Map.of("query", q, "results", results);
    }
}
