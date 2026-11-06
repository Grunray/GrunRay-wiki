package tech.grunray.wiki.guest;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.interceptor.TransactionAspectSupport;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import jakarta.servlet.http.HttpServletRequest;
import tech.grunray.wiki.auth.GuestUsers;
import tech.grunray.wiki.common.AppProperties;
import tech.grunray.wiki.common.Dates;
import tech.grunray.wiki.common.Envelopes;

/** 友链公开列表、申请与站长审核。 */
@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private static final String CAPTCHA = "friend_captcha";
    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private static final String COLS = """
            SELECT id, public_id, name, url, url_normalized, description, avatar_url, cover_url,
                   tags, contact_email, status, sort_order, created_at, updated_at
            FROM friend_link
            """;

    private final JdbcClient jdbc;
    private final ObjectMapper mapper;
    private final GuestUsers users;
    private final Captchas captchas;
    private final RateLimits rates;
    private final ContentRules rules;
    private final OwnerMail mail;
    private final AppProperties props;
    private final boolean autoPublish;
    private final boolean sensitive;
    private final String specialPath;
    private final int adminPageSize;

    public FriendController(
            JdbcClient jdbc,
            ObjectMapper mapper,
            GuestUsers users,
            Captchas captchas,
            RateLimits rates,
            ContentRules rules,
            OwnerMail mail,
            AppProperties props,
            @Value("${FRIEND_AUTO_PUBLISH:false}") boolean autoPublish,
            @Value("${FRIEND_SENSITIVE_WORDS_ENABLED:true}") boolean sensitive,
            @Value("${FRIEND_SPECIAL_LINKS_PATH:}") String specialPath,
            @Value("${FRIEND_ADMIN_PAGE_SIZE:30}") int adminPageSize) {
        this.jdbc = jdbc;
        this.mapper = mapper;
        this.users = users;
        this.captchas = captchas;
        this.rates = rates;
        this.rules = rules;
        this.mail = mail;
        this.props = props;
        this.autoPublish = autoPublish;
        this.sensitive = sensitive;
        this.specialPath = specialPath;
        this.adminPageSize = adminPageSize;
    }

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        int[] page = page(request, 50);
        if (page == null) {
            return Envelopes.errorB("分页参数无效", HttpStatus.BAD_REQUEST);
        }
        String sort = "oldest".equals(param(request, "sort")) ? "ASC" : "DESC";
        int total = count("status = 1");
        List<Map<String, Object>> rows = query(COLS + " WHERE status = 1 ORDER BY sort_order DESC, created_at " + sort
                + ", id " + sort + " LIMIT ? OFFSET ?", List.of(page[1], (page[0] - 1L) * page[1]));
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            items.add(publicItem(row));
        }
        return ResponseEntity.ok(Envelopes.ok(pageBody(items, total, page)));
    }

    @GetMapping("/special")
    public Map<String, Object> special() {
        return Envelopes.ok(Map.of("items", loadSpecial()));
    }

    @GetMapping("/site-profile")
    public Map<String, Object> profile() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("title", props.siteTitle());
        data.put("url", props.siteUrl());
        data.put("logo", props.siteLogoAbsolute());
        data.put("description", props.siteDescription());
        return Envelopes.ok(data);
    }

    @GetMapping("/captcha")
    public Map<String, Object> captcha(HttpServletRequest request) {
        return Envelopes.ok(captchas.issue(request.getSession(true), CAPTCHA));
    }

    @PostMapping("/applications")
    public ResponseEntity<?> apply(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        body = body == null ? Map.of() : body;
        String captchaError = captchas.verify(request.getSession(true), CAPTCHA, body.get("captchaId"), body.get("captchaAnswer"));
        if (captchaError != null) {
            return Envelopes.errorB(captchaError, HttpStatus.BAD_REQUEST);
        }
        String limited = rates.checkFriendIp(request);
        if (limited != null) {
            return Envelopes.errorB(limited, HttpStatus.TOO_MANY_REQUESTS);
        }
        String invalid = validate(body);
        if (invalid != null) {
            return Envelopes.errorB(invalid, HttpStatus.BAD_REQUEST);
        }
        String name = rules.stripHtml(String.valueOf(body.get("siteName")));
        String url = String.valueOf(body.get("siteUrl")).strip();
        String description = rules.stripHtml(String.valueOf(body.get("description")));
        String email = String.valueOf(body.get("contactEmail")).strip();
        String avatar = optionalUrl(body.get("avatarUrl"));
        int status = autoPublish ? 1 : 0;
        String publicId = UUID.randomUUID().toString();
        jdbc.sql("""
                INSERT INTO friend_link (
                    public_id, name, url, url_normalized, description, avatar_url, cover_url, contact_email, status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """)
                .param(publicId).param(name).param(url).param(normalize(url)).param(description)
                .param(avatar).param(avatar).param(email).param(status).update();
        rates.recordFriend(request);
        mail.schedule("友链申请", name + " " + url);
        Map<String, Object> data = Map.of("publicId", publicId);
        String message = status == 1 ? "友链已发布" : "申请已提交，等待审核";
        return ResponseEntity.ok(Envelopes.okWithMessage(data, message));
    }

    @GetMapping("/admin")
    public ResponseEntity<?> admin(HttpServletRequest request) {
        ResponseEntity<?> denied = ownerOnly(request);
        if (denied != null) {
            return denied;
        }
        String statusName = param(request, "status");
        if (statusName.isEmpty()) {
            statusName = "pending";
        }
        String where = "1=1";
        List<Object> args = new ArrayList<>();
        if (!"all".equals(statusName)) {
            int status = switch (statusName) {
                case "published" -> 1;
                case "hidden" -> 2;
                case "rejected" -> 3;
                default -> 0;
            };
            where = "status = ?";
            args.add(status);
        }
        int[] page = page(request, adminPageSize);
        if (page == null) {
            return Envelopes.errorB("分页参数无效", HttpStatus.BAD_REQUEST);
        }
        String sort = "oldest".equals(param(request, "sort")) ? "ASC" : "DESC";
        String order = args.isEmpty()
                ? "status ASC, created_at " + sort + ", id " + sort
                : "created_at " + sort + ", id " + sort;
        int total = args.isEmpty() ? count("1=1") : count("status = " + args.get(0));
        String sql = COLS + " WHERE " + (args.isEmpty() ? "1=1" : "status = ?")
                + " ORDER BY " + order + " LIMIT ? OFFSET ?";
        List<Object> q = new ArrayList<>(args);
        q.add(page[1]);
        q.add((page[0] - 1L) * page[1]);
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : query(sql, q)) {
            items.add(adminItem(row));
        }
        return ResponseEntity.ok(Envelopes.ok(pageBody(items, total, page)));
    }

    @PatchMapping("/admin/{publicId}")
    @Transactional
    public ResponseEntity<?> patch(@PathVariable String publicId, @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<?> denied = ownerOnly(request);
        if (denied != null) {
            return denied;
        }
        body = body == null ? Map.of() : body;
        boolean hasUpdate = body.containsKey("name") || body.containsKey("url") || body.containsKey("description")
                || body.containsKey("avatarUrl") || body.containsKey("contactEmail") || body.containsKey("sortOrder");
        Object action = body.get("action");
        if (!hasUpdate && !(action instanceof String)) {
            return Envelopes.errorB("请指定审核动作 action 或要更新的字段", HttpStatus.BAD_REQUEST);
        }
        Map<String, Object> row = one(publicId);
        if (row == null) {
            return Envelopes.errorB("友链不存在", HttpStatus.BAD_REQUEST);
        }
        if (hasUpdate) {
            String error = applyFields(publicId, row, body);
            if (error != null) {
                return Envelopes.errorB(error, HttpStatus.BAD_REQUEST);
            }
            row = one(publicId);
        }
        if (action instanceof String text && !text.isBlank()) {
            String error = applyAction(publicId, row, text.strip().toLowerCase());
            if (error != null) {
                TransactionAspectSupport.currentTransactionStatus().setRollbackOnly();
                return Envelopes.errorB(error, HttpStatus.BAD_REQUEST);
            }
            row = one(publicId);
        }
        return ResponseEntity.ok(Envelopes.okWithMessage(adminItem(row), "操作成功"));
    }

    private String validate(Map<String, Object> body) {
        String name = rules.stripHtml(string(body.get("siteName")));
        if (name == null) {
            return rules.messageFor(null);
        }
        if (name.isEmpty()) {
            return "请填写站点名称";
        }
        if (name.length() > 64) {
            return "站点名称不能超过 64 个字符";
        }
        String word = sensitive ? rules.sensitiveHit(name) : null;
        if (word != null) {
            return word;
        }
        String url = string(body.get("siteUrl")).strip();
        if (url.isEmpty()) {
            return "请填写站点地址";
        }
        if (url.length() > 512) {
            return "站点地址过长";
        }
        String urlError = urlError(url);
        if (urlError != null) {
            return urlError;
        }
        String desc = rules.stripHtml(string(body.get("description")));
        if (desc == null) {
            return rules.messageFor(null);
        }
        if (desc.isEmpty()) {
            return "请填写站点简介";
        }
        if (desc.length() > 200) {
            return "简介不能超过 200 个字符";
        }
        word = sensitive ? rules.sensitiveHit(desc) : null;
        if (word != null) {
            return word;
        }
        String email = string(body.get("contactEmail")).strip();
        if (email.isEmpty()) {
            return "请填写联系邮箱";
        }
        if (email.length() > 128) {
            return "邮箱过长";
        }
        if (!EMAIL.matcher(email).matches()) {
            return "邮箱格式不正确";
        }
        if (body.get("avatarUrl") != null && !string(body.get("avatarUrl")).isBlank()) {
            String avatar = string(body.get("avatarUrl")).strip();
            if (!avatar.matches("(?i)^https?://.*")) {
                return "头像地址格式不正确，请使用 http:// 或 https://";
            }
        }
        return null;
    }

    private String applyFields(String publicId, Map<String, Object> row, Map<String, Object> body) {
        List<String> sets = new ArrayList<>();
        List<Object> args = new ArrayList<>();
        if (body.containsKey("description")) {
            String desc = rules.stripHtml(string(body.get("description")));
            if (desc == null) {
                return rules.messageFor(null);
            }
            if (desc.isEmpty()) {
                return "请填写站点简介";
            }
            sets.add("description = ?");
            args.add(desc);
        }
        if (body.containsKey("name")) {
            String name = rules.stripHtml(string(body.get("name")));
            if (name == null) {
                return rules.messageFor(null);
            }
            if (name.isEmpty()) {
                return "请填写站点名称";
            }
            sets.add("name = ?");
            args.add(name);
        }
        if (body.containsKey("url")) {
            String url = string(body.get("url")).strip();
            String error = url.isEmpty() ? "请填写站点地址" : urlError(url);
            if (error != null) {
                return error;
            }
            sets.add("url = ?");
            args.add(url);
            String normalized = normalize(url);
            sets.add("url_normalized = ?");
            args.add(normalized);
            row.put("url_normalized", normalized);
            if (((Number) row.get("status")).intValue() == 1) {
                Long conflict = jdbc.sql("""
                        SELECT COUNT(*) FROM friend_link
                        WHERE status = 1 AND url_normalized = ? AND public_id <> ?
                        """).param(normalized).param(publicId).query(Long.class).single();
                if (conflict != null && conflict > 0) {
                    return "该站点 URL 已有已发布友链";
                }
            }
        }
        if (body.containsKey("avatarUrl")) {
            String avatar = string(body.get("avatarUrl")).strip();
            if (avatar.isEmpty()) {
                sets.add("avatar_url = ?");
                args.add(null);
                sets.add("cover_url = ?");
                args.add(null);
            } else if (avatar.length() > 512) {
                return "头像地址过长";
            } else if (!avatar.matches("(?i)^https?://.*")) {
                return "头像地址格式不正确，请使用 http:// 或 https://";
            } else {
                sets.add("avatar_url = ?");
                args.add(avatar);
                sets.add("cover_url = ?");
                args.add(avatar);
            }
        }
        if (body.containsKey("contactEmail")) {
            String email = string(body.get("contactEmail")).strip();
            if (email.isEmpty()) {
                sets.add("contact_email = ?");
                args.add(null);
            } else if (email.length() > 128) {
                return "邮箱过长";
            } else if (!EMAIL.matcher(email).matches()) {
                return "邮箱格式不正确";
            } else {
                sets.add("contact_email = ?");
                args.add(email);
            }
        }
        if (body.containsKey("sortOrder")) {
            Object raw = body.get("sortOrder");
            if (!(raw instanceof Number)) {
                return "排序值无效";
            }
            sets.add("sort_order = ?");
            args.add(((Number) raw).intValue());
        }
        if (sets.isEmpty()) {
            return null;
        }
        args.add(publicId);
        var spec = jdbc.sql("UPDATE friend_link SET " + String.join(", ", sets) + " WHERE public_id = ?");
        for (Object arg : args) {
            spec = arg == null ? spec.param(null, java.sql.Types.VARCHAR) : spec.param(arg);
        }
        spec.update();
        return null;
    }

    private String applyAction(String publicId, Map<String, Object> row, String action) {
        int current = ((Number) row.get("status")).intValue();
        int next = switch (action) {
            case "approve" -> (current == 0 || current == 2) ? 1 : -2;
            case "reject" -> current == 0 ? 3 : -3;
            case "hide" -> current == 1 ? 2 : -4;
            case "restore" -> current == 2 ? 1 : -5;
            default -> -1;
        };
        if (next < 0) {
            return switch (next) {
                case -2 -> "当前状态无法通过审核";
                case -3 -> "仅待审核申请可拒绝";
                case -4 -> "仅已发布友链可隐藏";
                case -5 -> "仅已隐藏友链可恢复";
                default -> "未知的审核动作";
            };
        }
        if (next == 1) {
            Long conflict = jdbc.sql("""
                    SELECT COUNT(*) FROM friend_link
                    WHERE status = 1 AND url_normalized = ? AND public_id <> ?
                    """).param(row.get("url_normalized")).param(publicId).query(Long.class).single();
            if (conflict != null && conflict > 0) {
                return "该站点 URL 已有已发布友链，无法通过审核";
            }
        }
        jdbc.sql("UPDATE friend_link SET status = ? WHERE public_id = ?").param(next).param(publicId).update();
        return null;
    }

    private Map<String, Object> publicItem(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("public_id"));
        item.put("name", row.get("name"));
        item.put("url", row.get("url"));
        item.put("description", row.get("description"));
        if (present(row.get("avatar_url"))) {
            item.put("avatar", row.get("avatar_url"));
        }
        if (present(row.get("cover_url"))) {
            item.put("cover", row.get("cover_url"));
        }
        List<String> tags = tags(row.get("tags"));
        if (tags != null && !tags.isEmpty()) {
            item.put("tags", tags);
        }
        return item;
    }

    private Map<String, Object> adminItem(Map<String, Object> row) {
        Map<String, Object> item = publicItem(row);
        item.put("status", ((Number) row.get("status")).intValue());
        item.put("sortOrder", ((Number) row.get("sort_order")).intValue());
        if (present(row.get("contact_email"))) {
            item.put("contactEmail", row.get("contact_email"));
        }
        item.put("createdAt", Dates.isoLocal((LocalDateTime) row.get("created_at")));
        item.put("updatedAt", Dates.isoLocal((LocalDateTime) row.get("updated_at")));
        return item;
    }

    private List<Map<String, Object>> loadSpecial() {
        if (specialPath == null || specialPath.isBlank()) {
            return List.of();
        }
        try {
            JsonNode root = mapper.readTree(java.nio.file.Files.readString(java.nio.file.Path.of(specialPath)));
            if (!root.isArray()) {
                return List.of();
            }
            List<Map<String, Object>> items = new ArrayList<>();
            for (JsonNode entry : root) {
                String id = entry.path("id").asText("");
                String title = entry.path("title").asText("");
                String url = entry.path("url").asText("");
                if (id.isEmpty() || title.isEmpty() || url.isEmpty()) {
                    continue;
                }
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("id", id);
                item.put("title", title);
                item.put("description", entry.path("description").asText(""));
                item.put("url", url);
                String icon = entry.path("icon").asText("");
                if ("acg-trip".equals(icon) || "travellings".equals(icon)) {
                    item.put("icon", icon);
                }
                items.add(item);
            }
            return items;
        } catch (Exception e) {
            return List.of();
        }
    }

    private ResponseEntity<?> ownerOnly(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null) {
            return Envelopes.errorB("请先登录", HttpStatus.UNAUTHORIZED);
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> user = (Map<String, Object>) session.getAttribute(GuestUsers.USER);
        if (user == null) {
            return Envelopes.errorB("请先登录", HttpStatus.UNAUTHORIZED);
        }
        if (!users.isSiteOwner(user)) {
            return Envelopes.errorB("需要站长权限", HttpStatus.FORBIDDEN);
        }
        return null;
    }

    private Map<String, Object> one(String publicId) {
        List<Map<String, Object>> rows = query(COLS + " WHERE public_id = ?", List.of(publicId));
        return rows.isEmpty() ? null : rows.get(0);
    }

    private int count(String where) {
        Long n = jdbc.sql("SELECT COUNT(*) FROM friend_link WHERE " + where).query(Long.class).single();
        return n == null ? 0 : n.intValue();
    }

    private List<Map<String, Object>> query(String sql, List<Object> args) {
        var spec = jdbc.sql(sql);
        for (Object arg : args) {
            spec = spec.param(arg);
        }
        return spec.query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("public_id", rs.getString("public_id"));
            row.put("name", rs.getString("name"));
            row.put("url", rs.getString("url"));
            row.put("url_normalized", rs.getString("url_normalized"));
            row.put("description", rs.getString("description"));
            row.put("avatar_url", rs.getString("avatar_url"));
            row.put("cover_url", rs.getString("cover_url"));
            row.put("tags", rs.getString("tags"));
            row.put("contact_email", rs.getString("contact_email"));
            row.put("status", rs.getInt("status"));
            row.put("sort_order", rs.getInt("sort_order"));
            row.put("created_at", rs.getObject("created_at", LocalDateTime.class));
            row.put("updated_at", rs.getObject("updated_at", LocalDateTime.class));
            return row;
        }).list();
    }

    private List<String> tags(Object raw) {
        if (!(raw instanceof String text) || text.isBlank()) {
            return null;
        }
        try {
            JsonNode node = mapper.readTree(text);
            if (!node.isArray()) {
                return null;
            }
            List<String> out = new ArrayList<>();
            node.forEach(item -> out.add(item.asText()));
            return out;
        } catch (Exception e) {
            return null;
        }
    }

    private static String urlError(String url) {
        try {
            URI uri = URI.create(url.strip());
            String scheme = uri.getScheme();
            String host = uri.getHost();
            if (scheme == null || host == null || host.isBlank()) {
                return "站点地址格式不正确";
            }
            if (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https")) {
                return "站点地址须为 http:// 或 https://";
            }
            return null;
        } catch (Exception e) {
            return "站点地址格式不正确";
        }
    }

    private static String normalize(String url) {
        try {
            URI uri = URI.create(url.strip());
            if (uri.getScheme() == null || uri.getHost() == null) {
                return null;
            }
            String scheme = uri.getScheme().toLowerCase();
            if (!scheme.equals("http") && !scheme.equals("https")) {
                return null;
            }
            String path = uri.getPath() == null ? "" : uri.getPath().replaceAll("/+$", "");
            String query = uri.getQuery() == null ? "" : "?" + uri.getQuery();
            return scheme + "://" + uri.getHost().toLowerCase() + (uri.getPort() > 0 ? ":" + uri.getPort() : "") + path + query;
        } catch (Exception e) {
            return null;
        }
    }

    private static String optionalUrl(Object raw) {
        if (raw == null || String.valueOf(raw).isBlank()) {
            return null;
        }
        return String.valueOf(raw).strip();
    }

    private static boolean present(Object value) {
        return value != null && !String.valueOf(value).isEmpty();
    }

    private static String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private static String param(HttpServletRequest request, String name) {
        String value = request.getParameter(name);
        return value == null ? "" : value.strip().toLowerCase();
    }

    private static int[] page(HttpServletRequest request, int defaultSize) {
        try {
            int p = Math.max(1, parse(request.getParameter("page"), 1));
            int size = Math.min(50, Math.max(1, parse(request.getParameter("size"), defaultSize)));
            return new int[] {p, size};
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

    private static Map<String, Object> pageBody(List<Map<String, Object>> items, int total, int[] page) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", items);
        data.put("total", total);
        data.put("page", page[0]);
        data.put("size", page[1]);
        return data;
    }
}
