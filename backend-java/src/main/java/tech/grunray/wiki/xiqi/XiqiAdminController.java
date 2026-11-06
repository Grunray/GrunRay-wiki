package tech.grunray.wiki.xiqi;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import tech.grunray.wiki.auth.GuestUsers;
import tech.grunray.wiki.common.AppProperties;
import tech.grunray.wiki.common.ContentFiles;
import tech.grunray.wiki.common.Dates;
import tech.grunray.wiki.common.Envelopes;

/**
 * 站长碎念 / 推荐 / 页面 / 关于的读取、上传与导入。
 * 碎念 {@code publicId} 含 {@code ..} 或非法字符时拒绝写入；入库失败不留下新文件。
 */
@RestController
public class XiqiAdminController {

    private static final Set<String> MOODS = Set.of("daily", "flash", "rant", "sketch");
    private static final Set<String> STATUSES = Set.of("draft", "hidden", "published");
    private static final Set<String> PAGE_STATUSES = Set.of("hidden", "published");
    private static final Set<String> PAGES = Set.of("about", "fragments", "recommend");
    private static final Set<String> CATEGORIES = Set.of("anime", "opensource", "software");
    private static final Set<String> EXTS = Set.of(".jpg", ".jpeg", ".png", ".webp", ".gif");
    private static final DateTimeFormatter ISO = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final String ID_RE = "[A-Za-z0-9_-]{8,64}";

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final GuestUsers users;
    private final AppProperties props;
    private final ContentFiles files;

    public XiqiAdminController(JdbcClient jdbc, ObjectMapper mapper, GuestUsers users, AppProperties props, ContentFiles files) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.users = users;
        this.props = props;
        this.files = files;
    }

    @GetMapping("/api/xiqi/admin/fragments")
    public ResponseEntity<?> fragments(HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        String status = statusArg(request);
        if (status != null && !STATUSES.contains(status)) {
            return Envelopes.errorB("status 必须是 ['draft', 'hidden', 'published']", HttpStatus.BAD_REQUEST);
        }
        return ResponseEntity.ok(Envelopes.ok(adminList("fragment", status, null, request, true)));
    }

    @GetMapping("/api/xiqi/admin/fragments/{publicId}")
    public ResponseEntity<?> fragment(@org.springframework.web.bind.annotation.PathVariable String publicId, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        Map<String, Object> row = one("""
                SELECT public_id, mood, status, md_url, images, cover_index, summary, created_at
                FROM fragment WHERE public_id = ?
                """, publicId);
        if (row == null) {
            return Envelopes.errorB("not_found", HttpStatus.NOT_FOUND);
        }
        Map<String, Object> data = fragmentView(row);
        data.put("body", files.readMarkdown(String.valueOf(row.get("md_url"))));
        data.put("bodyHtml", "");
        data.put("status", row.get("status"));
        return ResponseEntity.ok(Envelopes.ok(data));
    }

    @GetMapping("/api/xiqi/admin/recommendations")
    public ResponseEntity<?> recommendations(HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        String status = statusArg(request);
        if (status != null && !STATUSES.contains(status)) {
            return Envelopes.errorB("status 必须是 ['draft', 'hidden', 'published']", HttpStatus.BAD_REQUEST);
        }
        String category = blankToNull(request.getParameter("category"));
        return ResponseEntity.ok(Envelopes.ok(adminList("xiqi_recommend", status, category, request, false)));
    }

    @GetMapping("/api/xiqi/admin/recommendations/{publicId}")
    public ResponseEntity<?> recommendation(@org.springframework.web.bind.annotation.PathVariable String publicId, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        Map<String, Object> row = one("""
                SELECT public_id, category, rating, title, status, md_url, images, cover_index, summary, url, created_at
                FROM xiqi_recommend WHERE public_id = ?
                """, publicId);
        if (row == null) {
            return Envelopes.errorB("not_found", HttpStatus.NOT_FOUND);
        }
        Map<String, Object> data = recommendView(row);
        data.put("body", files.readMarkdown(String.valueOf(row.get("md_url"))));
        data.put("bodyHtml", "");
        data.put("status", row.get("status"));
        return ResponseEntity.ok(Envelopes.ok(data));
    }

    @PostMapping(value = "/api/xiqi/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam(required = false) String scope, @RequestParam(required = false) MultipartFile file,
            @RequestParam(required = false) String alt, HttpServletRequest request) {
        return saveUpload(scope, file, alt, request, true);
    }

    @PostMapping(value = "/api/fragments/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFragments(@RequestParam(required = false) MultipartFile file, HttpServletRequest request) {
        return saveUpload("fragments", file, "", request, true);
    }

    @PostMapping(value = "/api/recommendations/media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadRecommendations(@RequestParam(required = false) MultipartFile file, HttpServletRequest request) {
        return saveUpload("recommendations", file, "", request, true);
    }

    @PostMapping(value = "/api/xiqi/hero-media", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> hero(@RequestParam(required = false) String page, @RequestParam(required = false) MultipartFile file,
            HttpServletRequest request) {
        String name = page == null ? "" : page.strip().toLowerCase(Locale.ROOT);
        if (!PAGES.contains(name)) {
            return Envelopes.errorB("page 必须是 ['about', 'fragments', 'recommend']", HttpStatus.BAD_REQUEST);
        }
        ResponseEntity<?> saved = saveUpload("pages/" + name, file, "", request, true);
        if (saved.getStatusCode().is2xxSuccessful() && saved.getBody() instanceof Map<?, ?> envelope) {
            @SuppressWarnings("unchecked")
            Map<String, Object> body = (Map<String, Object>) envelope;
            if (body.get("data") instanceof Map<?, ?> data) {
                Map<String, Object> copy = new LinkedHashMap<>();
                data.forEach((k, v) -> copy.put(String.valueOf(k), v));
                copy.put("page", name);
                return ResponseEntity.ok(Envelopes.ok(copy));
            }
        }
        return saved;
    }

    @PostMapping("/api/fragments/import-file")
    public ResponseEntity<?> importFragmentFile(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        return writeFragment(body == null ? Map.of() : body, false);
    }

    @PostMapping("/api/fragments/import-db")
    public ResponseEntity<?> importFragmentDb(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        return writeFragment(body == null ? Map.of() : body, true);
    }

    @PostMapping("/api/recommendations/import-file")
    public ResponseEntity<?> importRecommendFile(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        return writeRecommend(body == null ? Map.of() : body, false);
    }

    @PostMapping("/api/recommendations/import-db")
    public ResponseEntity<?> importRecommendDb(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        return writeRecommend(body == null ? Map.of() : body, true);
    }

    @PostMapping("/api/xiqi/pages/import-file")
    public ResponseEntity<?> importPage(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        body = body == null ? Map.of() : body;
        String page = text(body.get("page")).toLowerCase(Locale.ROOT);
        if (!PAGES.contains(page)) {
            return Envelopes.errorB("page 必须是 ['about', 'fragments', 'recommend']", HttpStatus.BAD_REQUEST);
        }
        String status = text(body.get("status"));
        if (status.isEmpty()) {
            status = "published";
        }
        if (!PAGE_STATUSES.contains(status)) {
            return Envelopes.errorB("status 必须是 ['hidden', 'published']", HttpStatus.BAD_REQUEST);
        }
        String hero = text(body.get("heroImageUrl"));
        if (hero.isEmpty()) {
            hero = text(body.get("hero_image_url"));
        }
        String alt = body.containsKey("heroImageAlt") ? text(body.get("heroImageAlt")) : text(body.get("hero_image_alt"));
        Path file = importRoot().resolve("xiqi").resolve("pages").resolve(page + ".md");
        write(file, XiqiMarkdown.page(page, hero, alt, status, text(body.get("note"))));
        return ResponseEntity.ok(Envelopes.okWithMessage(result(page, rel(file), "python scripts/xiqi_tools/import_xiqi.py pages"),
                "已保存至 import，请运行 python scripts/xiqi_tools/import_xiqi.py pages"));
    }

    @PostMapping("/api/xiqi/about/import-file")
    public ResponseEntity<?> importAbout(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        ResponseEntity<?> denied = owner(request);
        if (denied != null) {
            return denied;
        }
        body = body == null ? Map.of() : body;
        String status = text(body.get("status"));
        if (status.isEmpty()) {
            status = "published";
        }
        if (!PAGE_STATUSES.contains(status)) {
            return Envelopes.errorB("status 必须是 ['hidden', 'published']", HttpStatus.BAD_REQUEST);
        }
        String problem = XiqiMarkdown.aboutError(body);
        if (problem != null) {
            return Envelopes.errorB(problem, HttpStatus.BAD_REQUEST);
        }
        Path file = importRoot().resolve("xiqi").resolve("about").resolve("resume.md");
        write(file, XiqiMarkdown.aboutMarkdown(body, status));
        String rel = rel(file);
        return ResponseEntity.ok(Envelopes.okWithMessage(
                result("resume", rel, "python scripts/xiqi_tools/import_xiqi.py about"),
                "已保存至 import，请运行 python scripts/xiqi_tools/import_xiqi.py about"));
    }

    private ResponseEntity<?> writeFragment(Map<String, Object> body, boolean intoDb) {
        String mood = text(body.get("mood"));
        if (mood.isEmpty()) {
            mood = "daily";
        }
        if (!MOODS.contains(mood)) {
            return Envelopes.errorB("mood 必须是 ['daily', 'flash', 'rant', 'sketch']", HttpStatus.BAD_REQUEST);
        }
        String status = text(body.get("status"));
        if (status.isEmpty()) {
            status = "draft";
        }
        if (!STATUSES.contains(status)) {
            return Envelopes.errorB("status 必须是 ['draft', 'hidden', 'published']", HttpStatus.BAD_REQUEST);
        }
        String markdown = text(body.get("bodyMarkdown")).isEmpty() ? text(body.get("body")) : text(body.get("bodyMarkdown"));
        if (markdown.isEmpty()) {
            return Envelopes.errorB("正文不能为空", HttpStatus.BAD_REQUEST);
        }
        Integer cover = integer(body.get("coverIndex"), body.containsKey("coverIndex") || body.containsKey("cover_index"));
        if (cover == null && (body.containsKey("coverIndex") || body.containsKey("cover_index"))) {
            return Envelopes.errorB("coverIndex 必须是整数", HttpStatus.BAD_REQUEST);
        }
        String id = text(body.get("publicId"));
        if (id.isEmpty()) {
            id = "frag-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + UUID.randomUUID().toString().substring(0, 8);
        }
        if (!id.matches(ID_RE)) {
            return Envelopes.errorB("public_id 仅允许 8–64 位字母数字、下划线、连字符: '" + id + "'", HttpStatus.BAD_REQUEST);
        }
        List<Map<String, String>> images = images(body.get("images"));
        int coverIndex = cover == null ? 0 : cover;
        if (!images.isEmpty() && (coverIndex < 0 || coverIndex >= images.size())) {
            coverIndex = 0;
        }
        String createdText = createdText(body);
        LocalDateTime created = XiqiMarkdown.parseCreated(createdText);
        if (created == null) {
            return Envelopes.errorB("created_at 时间格式无效: " + id + ".md", HttpStatus.BAD_REQUEST);
        }
        Path dir = importRoot().resolve("xiqi").resolve("fragments");
        Path file = dir.resolve(id + ".md").normalize();
        if (!file.startsWith(dir)) {
            return Envelopes.errorB("public_id 不能包含路径", HttpStatus.BAD_REQUEST);
        }
        write(file, XiqiMarkdown.fragment(id, mood, status, createdText, images, coverIndex, markdown));
        Map<String, Object> data = result(id, rel(file), "python scripts/xiqi_tools/import_xiqi.py fragments");
        if (!intoDb) {
            return ResponseEntity.ok(Envelopes.okWithMessage(data, "已保存至 import，请运行 python scripts/xiqi_tools/import_xiqi.py fragments"));
        }
        try {
            String summary = XiqiMarkdown.extractSummary(markdown);
            Path content = props.contentRootPath().resolve("xiqi").resolve("fragments").resolve(id + ".md");
            write(content, markdown.strip() + "\n");
            jdbc.sql("""
                    INSERT INTO fragment (public_id, mood, status, md_url, images, cover_index, summary, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE mood = VALUES(mood), status = VALUES(status), md_url = VALUES(md_url),
                        images = VALUES(images), cover_index = VALUES(cover_index), summary = VALUES(summary), created_at = VALUES(created_at)
                    """)
                    .param(id).param(mood).param(status).param("xiqi/fragments/" + id + ".md")
                    .param(mapper.writeValueAsString(images)).param(coverIndex).param(summary)
                    .param(created).update();
        } catch (RuntimeException | IOException e) {
            try {
                Files.deleteIfExists(file);
            } catch (IOException ignored) {
                // 补偿失败只留在日志里，接口仍返回失败
            }
            return Envelopes.errorB("写入数据库失败", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        data.put("imported", true);
        return ResponseEntity.ok(Envelopes.okWithMessage(data, "已写入数据库"));
    }

    private ResponseEntity<?> writeRecommend(Map<String, Object> body, boolean intoDb) {
        String id = text(body.get("publicId"));
        if (!id.isEmpty() && !id.matches(ID_RE)) {
            return Envelopes.errorB("public_id 仅允许 8–64 位字母数字、下划线、连字符: '" + id + "'", HttpStatus.BAD_REQUEST);
        }
        if (id.isEmpty()) {
            id = "rec-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-" + UUID.randomUUID().toString().substring(0, 8);
        }
        String title = text(body.get("title"));
        if (title.isEmpty()) {
            return Envelopes.errorB("title 不能为空", HttpStatus.BAD_REQUEST);
        }
        String category = text(body.get("category"));
        if (category.isEmpty()) {
            category = "software";
        }
        if (!CATEGORIES.contains(category)) {
            return Envelopes.errorB("category 必须是 ['anime', 'opensource', 'software']", HttpStatus.BAD_REQUEST);
        }
        Integer rating;
        if (!body.containsKey("rating") || body.get("rating") == null) {
            rating = 5;
        } else if (body.get("rating") instanceof Number number) {
            rating = number.intValue();
        } else {
            return Envelopes.errorB("rating 必须是 1–5 的整数", HttpStatus.BAD_REQUEST);
        }
        if (rating < 1 || rating > 5) {
            return Envelopes.errorB("rating 必须是 1–5", HttpStatus.BAD_REQUEST);
        }
        String markdown = text(body.get("bodyMarkdown"));
        if (markdown.isEmpty()) {
            return Envelopes.errorB("正文不能为空", HttpStatus.BAD_REQUEST);
        }
        String url = text(body.get("url"));
        if (!url.isEmpty() && !url.matches("(?i)^https?://.+")) {
            return Envelopes.errorB("url 须为 http:// 或 https://", HttpStatus.BAD_REQUEST);
        }
        String status = text(body.get("status"));
        if (status.isEmpty()) {
            status = "draft";
        }
        if (!STATUSES.contains(status)) {
            return Envelopes.errorB("status 必须是 ['draft', 'hidden', 'published']", HttpStatus.BAD_REQUEST);
        }
        String createdText = createdText(body);
        LocalDateTime created = XiqiMarkdown.parseCreated(createdText);
        if (created == null) {
            return Envelopes.errorB("created_at 时间格式无效: " + id + ".md", HttpStatus.BAD_REQUEST);
        }
        List<Map<String, String>> images = images(body.get("images"));
        Integer cover = integer(body.get("coverIndex"), body.containsKey("coverIndex") || body.containsKey("cover_index"));
        int coverIndex = cover == null ? 0 : cover;
        if (!images.isEmpty() && (coverIndex < 0 || coverIndex >= images.size())) {
            coverIndex = 0;
        }
        String givenSummary = text(body.get("summary"));
        String summary = givenSummary.isEmpty() ? XiqiMarkdown.extractSummary(markdown) : givenSummary;
        Path file = importRoot().resolve("xiqi").resolve("recommendations").resolve(id + ".md");
        write(file, XiqiMarkdown.recommend(id, category, rating, title, status, createdText, url, givenSummary, images, coverIndex, markdown));
        Map<String, Object> data = result(id, rel(file), "python scripts/xiqi_tools/import_xiqi.py recommendations");
        if (!intoDb) {
            return ResponseEntity.ok(Envelopes.ok(data));
        }
        try {
            Path content = props.contentRootPath().resolve("xiqi").resolve("recommendations").resolve(id + ".md");
            write(content, markdown.strip() + "\n");
            var spec = jdbc.sql("""
                    INSERT INTO xiqi_recommend (public_id, category, rating, title, status, md_url, images, cover_index, summary, url, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE category = VALUES(category), rating = VALUES(rating), title = VALUES(title),
                        status = VALUES(status), md_url = VALUES(md_url), images = VALUES(images),
                        cover_index = VALUES(cover_index), summary = VALUES(summary), url = VALUES(url), created_at = VALUES(created_at)
                    """)
                    .param(id).param(category).param(rating).param(title).param(status)
                    .param("xiqi/recommendations/" + id + ".md").param(mapper.writeValueAsString(images)).param(coverIndex)
                    .param(summary);
            if (url.isEmpty()) {
                spec.param(null, java.sql.Types.VARCHAR);
            } else {
                spec.param(url);
            }
            spec.param(created).update();
        } catch (RuntimeException | IOException e) {
            try {
                Files.deleteIfExists(file);
            } catch (IOException ignored) {
                // 同上
            }
            return Envelopes.errorB("写入数据库失败", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        data.put("imported", true);
        return ResponseEntity.ok(Envelopes.okWithMessage(data, "已写入数据库"));
    }

    private ResponseEntity<?> saveUpload(String scope, MultipartFile file, String alt, HttpServletRequest request, boolean checkOwner) {
        if (checkOwner) {
            ResponseEntity<?> denied = owner(request);
            if (denied != null) {
                return denied;
            }
        }
        String name = scope == null ? "" : scope.strip().replaceAll("^/+|/+$", "");
        Path dir;
        String urlPrefix;
        if ("fragments".equals(name)) {
            dir = props.contentRootPath().resolve("media").resolve("xiqi").resolve("fragments");
            urlPrefix = "/api/media/files/xiqi/fragments/";
        } else if ("recommendations".equals(name)) {
            dir = props.contentRootPath().resolve("media").resolve("xiqi").resolve("recommendations");
            urlPrefix = "/api/media/files/xiqi/recommendations/";
        } else if (name.startsWith("pages/")) {
            String page = name.substring("pages/".length());
            if (!PAGES.contains(page)) {
                return Envelopes.errorB("未知页面 scope: '" + name + "'", HttpStatus.BAD_REQUEST);
            }
            dir = props.contentRootPath().resolve("media").resolve("xiqi").resolve("pages").resolve(page);
            urlPrefix = "/api/media/files/xiqi/pages/" + page + "/";
        } else {
            return Envelopes.errorB("未知 media scope: '" + name + "'", HttpStatus.BAD_REQUEST);
        }
        if (file == null || file.isEmpty() || file.getOriginalFilename() == null || file.getOriginalFilename().isBlank()) {
            return Envelopes.errorB("缺少 file 字段", HttpStatus.BAD_REQUEST);
        }
        String original = file.getOriginalFilename();
        int dot = original.lastIndexOf('.');
        String ext = dot < 0 ? "" : original.substring(dot).toLowerCase(Locale.ROOT);
        if (!EXTS.contains(ext)) {
            return Envelopes.errorB("不支持的文件类型: " + ext, HttpStatus.BAD_REQUEST);
        }
        String saved = UUID.randomUUID().toString().replace("-", "") + ext;
        try {
            Files.createDirectories(dir);
            file.transferTo(dir.resolve(saved));
        } catch (IOException e) {
            return Envelopes.errorB("上传失败", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("url", urlPrefix + saved);
        data.put("alt", alt == null ? "" : alt.strip());
        return ResponseEntity.ok(Envelopes.ok(data));
    }

    private Map<String, Object> adminList(String table, String status, String category, HttpServletRequest request, boolean fragment) {
        int page = 1;
        int size = 50;
        try {
            if (request.getParameter("page") != null) {
                page = Math.max(1, Integer.parseInt(request.getParameter("page").strip()));
            }
            if (request.getParameter("size") != null) {
                size = Math.max(1, Math.min(100, Integer.parseInt(request.getParameter("size").strip())));
            }
        } catch (NumberFormatException e) {
            page = 1;
            size = 50;
        }
        String sort = "oldest".equalsIgnoreCase(request.getParameter("sort") == null ? "" : request.getParameter("sort").strip()) ? "ASC" : "DESC";
        List<String> where = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (status != null) {
            where.add("status = ?");
            args.add(status);
        }
        if (category != null) {
            where.add("category = ?");
            args.add(category.toLowerCase(Locale.ROOT));
        }
        String whereSql = where.isEmpty() ? "1=1" : String.join(" AND ", where);
        var count = jdbc.sql("SELECT COUNT(*) FROM " + table + " WHERE " + whereSql);
        for (Object arg : args) {
            count = count.param(arg);
        }
        int total = count.query(Long.class).single().intValue();
        String cols = fragment
                ? "public_id, mood, summary, images, cover_index, created_at, status"
                : "public_id, category, rating, title, summary, url, images, cover_index, created_at, status";
        var spec = jdbc.sql("SELECT " + cols + " FROM " + table + " WHERE " + whereSql
                + " ORDER BY created_at " + sort + ", id " + sort + " LIMIT ? OFFSET ?");
        for (Object arg : args) {
            spec = spec.param(arg);
        }
        List<Map<String, Object>> items = spec.param(size).param((page - 1L) * size).query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("public_id", rs.getString("public_id"));
            row.put("summary", rs.getString("summary"));
            row.put("images", rs.getString("images"));
            row.put("cover_index", rs.getInt("cover_index"));
            row.put("created_at", rs.getObject("created_at", LocalDateTime.class));
            row.put("status", rs.getString("status"));
            if (fragment) {
                row.put("mood", rs.getString("mood"));
                Map<String, Object> item = fragmentView(row);
                item.put("status", row.get("status"));
                return item;
            }
            row.put("category", rs.getString("category"));
            row.put("rating", rs.getInt("rating"));
            row.put("title", rs.getString("title"));
            row.put("url", rs.getString("url"));
            Map<String, Object> item = recommendView(row);
            item.put("status", row.get("status"));
            return item;
        }).list();
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", items);
        data.put("total", total);
        data.put("page", page);
        data.put("size", size);
        return data;
    }

    private Map<String, Object> fragmentView(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("public_id"));
        item.put("content", row.get("summary") == null ? "" : row.get("summary"));
        item.put("mood", row.get("mood"));
        item.put("createdAt", Dates.isoLocal((LocalDateTime) row.get("created_at")));
        return item;
    }

    private Map<String, Object> recommendView(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("public_id"));
        item.put("category", row.get("category"));
        item.put("title", row.get("title"));
        item.put("rating", row.get("rating"));
        item.put("summary", row.get("summary") == null ? "" : row.get("summary"));
        item.put("createdAt", Dates.isoLocal((LocalDateTime) row.get("created_at")));
        if (row.get("url") != null && !String.valueOf(row.get("url")).isEmpty()) {
            item.put("url", row.get("url"));
        }
        return item;
    }

    private Map<String, Object> one(String sql, String id) {
        List<Map<String, Object>> rows = jdbc.sql(sql).param(id).query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            var meta = rs.getMetaData();
            for (int i = 1; i <= meta.getColumnCount(); i++) {
                String label = meta.getColumnLabel(i);
                Object value = "created_at".equals(label) ? rs.getObject(i, LocalDateTime.class)
                        : "cover_index".equals(label) || "rating".equals(label) ? rs.getInt(i) : rs.getString(i);
                row.put(label, value);
            }
            return row;
        }).list();
        return rows.isEmpty() ? null : rows.get(0);
    }

    private ResponseEntity<?> owner(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        @SuppressWarnings("unchecked")
        Map<String, Object> user = session == null ? null : (Map<String, Object>) session.getAttribute(GuestUsers.USER);
        if (user == null || user.get("guest_user_id") == null) {
            return Envelopes.errorB("请先登录", HttpStatus.UNAUTHORIZED);
        }
        if (!users.isSiteOwner(user)) {
            return Envelopes.errorB("需要站长权限", HttpStatus.FORBIDDEN);
        }
        return null;
    }

    private Path importRoot() {
        return props.contentRootPath().getParent().resolve("import");
    }

    private static String rel(Path file) {
        Path importDir = file;
        while (importDir != null && !importDir.getFileName().toString().equals("import")) {
            importDir = importDir.getParent();
        }
        if (importDir == null) {
            return file.getFileName().toString();
        }
        return importDir.relativize(file).toString().replace('\\', '/');
    }

    private static void write(Path file, String text) {
        try {
            Files.createDirectories(file.getParent());
            Files.writeString(file, text);
        } catch (IOException e) {
            throw new IllegalStateException(e);
        }
    }

    private static Map<String, Object> result(String id, String path, String command) {
        Map<String, Object> data = new LinkedHashMap<>();
        if ("resume".equals(id)) {
            data.put("path", path);
        } else if (PAGES.contains(id)) {
            data.put("page", id);
            data.put("path", path);
            data.put("importCommand", command);
        } else {
            data.put("publicId", id);
            data.put("path", path);
            data.put("importCommand", command);
        }
        return data;
    }

    @SuppressWarnings("unchecked")
    private static List<Map<String, String>> images(Object raw) {
        if (!(raw instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, String>> out = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map && map.get("url") != null) {
                Map<String, String> image = new LinkedHashMap<>();
                image.put("url", String.valueOf(map.get("url")));
                image.put("alt", map.get("alt") == null ? "" : String.valueOf(map.get("alt")));
                out.add(image);
            }
        }
        return out;
    }

    private static Integer integer(Object raw, boolean present) {
        if (!present || raw == null) {
            return raw == null && !present ? 0 : null;
        }
        if (raw instanceof Number number) {
            return number.intValue();
        }
        return null;
    }

    private static String text(Object value) {
        return value == null ? "" : String.valueOf(value).strip();
    }

    private static String statusArg(HttpServletRequest request) {
        String status = request.getParameter("status");
        if (status == null || status.isBlank() || "all".equalsIgnoreCase(status.strip())) {
            return null;
        }
        return status.strip().toLowerCase(Locale.ROOT);
    }

    private static String createdText(Map<String, Object> body) {
        String raw = text(body.get("createdAt"));
        if (raw.isEmpty()) {
            raw = text(body.get("created_at"));
        }
        return raw.isEmpty() ? XiqiMarkdown.nowStamp() : raw;
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.strip().toLowerCase(Locale.ROOT);
    }
}
