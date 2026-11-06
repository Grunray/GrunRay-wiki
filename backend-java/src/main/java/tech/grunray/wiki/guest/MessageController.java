package tech.grunray.wiki.guest;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import tech.grunray.wiki.auth.GuestUsers;
import tech.grunray.wiki.common.Dates;
import tech.grunray.wiki.common.Envelopes;

/** 留言公开列表、发布、回复与站长审核。 */
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private static final String CAPTCHA = "message_captcha";
    private static final String COLS = """
            SELECT id, public_id, parent_id, guest_user_id, author_name, avatar_url,
                   provider, profile_url, content, status, is_owner, created_at
            FROM guest_message
            """;

    private final JdbcClient jdbc;
    private final GuestUsers users;
    private final Captchas captchas;
    private final RateLimits rates;
    private final ContentRules rules;
    private final OwnerMail mail;
    private final boolean autoPublish;
    private final int adminPageSize;

    public MessageController(
            JdbcClient jdbc,
            GuestUsers users,
            Captchas captchas,
            RateLimits rates,
            ContentRules rules,
            OwnerMail mail,
            @Value("${MESSAGE_AUTO_PUBLISH:false}") boolean autoPublish,
            @Value("${MESSAGE_ADMIN_PAGE_SIZE:30}") int adminPageSize) {
        this.jdbc = jdbc;
        this.users = users;
        this.captchas = captchas;
        this.rates = rates;
        this.rules = rules;
        this.mail = mail;
        this.autoPublish = autoPublish;
        this.adminPageSize = adminPageSize;
    }

    @GetMapping("/captcha")
    public Map<String, Object> captcha(HttpServletRequest request) {
        return Envelopes.ok(captchas.issue(request.getSession(true), CAPTCHA));
    }

    @GetMapping
    public ResponseEntity<?> list(HttpServletRequest request) {
        String sort = sort(request.getParameter("sort"));
        int[] page = page(request, 20);
        if (page == null) {
            return Envelopes.errorB("分页参数无效", HttpStatus.BAD_REQUEST);
        }
        int total = count("status = 1 AND parent_id IS NULL");
        List<Map<String, Object>> tops = query(COLS + " WHERE status = 1 AND parent_id IS NULL ORDER BY created_at "
                + sort + ", id " + sort + " LIMIT ? OFFSET ?", List.of(page[1], (page[0] - 1L) * page[1]));
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> top : tops) {
            List<Map<String, Object>> replies = query(
                    COLS + " WHERE parent_id = ? AND status = 1 ORDER BY created_at ASC, id ASC",
                    List.of(top.get("id")));
            items.add(toMessage(top, replies));
        }
        return ResponseEntity.ok(Envelopes.ok(pageBody(items, total, page)));
    }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody(required = false) Map<String, Object> body, HttpServletRequest request) {
        Map<String, Object> user = user(request);
        if (user == null) {
            return Envelopes.errorB("请先登录后再留言", HttpStatus.UNAUTHORIZED);
        }
        body = body == null ? Map.of() : body;
        String captchaError = captchas.verify(request.getSession(true), CAPTCHA, body.get("captchaId"), body.get("captchaAnswer"));
        if (captchaError != null) {
            return Envelopes.errorB(captchaError, HttpStatus.BAD_REQUEST);
        }
        String limited = rates.checkMessageIp(request);
        if (limited != null) {
            return Envelopes.errorB(limited, HttpStatus.TOO_MANY_REQUESTS);
        }
        Object raw = body.get("content");
        if (!(raw instanceof String text)) {
            return Envelopes.errorB("请填写留言内容", HttpStatus.BAD_REQUEST);
        }
        String content = rules.validate(text);
        if (content == null || "len".equals(content) || "word".equals(content)) {
            return Envelopes.errorB(rules.messageFor(content), HttpStatus.BAD_REQUEST);
        }
        int guestId = ((Number) user.get("guest_user_id")).intValue();
        String hourly = rates.checkHourly(guestId);
        if (hourly != null) {
            return Envelopes.errorB(hourly, HttpStatus.TOO_MANY_REQUESTS);
        }
        if (users.blocked(guestId)) {
            return Envelopes.errorB("您的账号已被限制留言", HttpStatus.FORBIDDEN);
        }
        int status = autoPublish ? 1 : 0;
        boolean owner = users.isSiteOwner(user);
        String publicId = UUID.randomUUID().toString();
        jdbc.sql("""
                INSERT INTO guest_message (
                    public_id, parent_id, guest_user_id, author_name, avatar_url,
                    provider, profile_url, content, status, is_owner
                ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
                """)
                .param(publicId)
                .param(guestId)
                .param(user.get("name"))
                .param(user.get("avatar_url"))
                .param(user.get("provider"))
                .param(user.get("profile_url"))
                .param(content)
                .param(status)
                .param(owner ? 1 : 0)
                .update();
        rates.recordMessageIp(request);
        rates.recordHourly(guestId);
        if (!owner) {
            mail.schedule("新留言", content);
        }
        if (status != 1) {
            return ResponseEntity.ok(Envelopes.okWithMessage(null, "留言已提交，等待审核"));
        }
        return ResponseEntity.ok(Envelopes.okWithMessage(toMessage(one(publicId), List.of()), "留言发布成功"));
    }

    @PostMapping("/{publicId}/reply")
    public ResponseEntity<?> reply(@PathVariable String publicId, @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        Map<String, Object> user = user(request);
        if (user == null) {
            return Envelopes.errorB("请先登录后再回复", HttpStatus.UNAUTHORIZED);
        }
        body = body == null ? Map.of() : body;
        Object raw = body.get("content");
        if (!(raw instanceof String)) {
            return Envelopes.errorB("请填写回复内容", HttpStatus.BAD_REQUEST);
        }
        String limited = rates.checkReplyIp(request);
        if (limited != null) {
            return Envelopes.errorB(limited, HttpStatus.TOO_MANY_REQUESTS);
        }
        String content = rules.validate((String) raw);
        if (content == null || "len".equals(content) || "word".equals(content)) {
            return Envelopes.errorB(rules.messageFor(content), HttpStatus.BAD_REQUEST);
        }
        int guestId = ((Number) user.get("guest_user_id")).intValue();
        if (users.blocked(guestId)) {
            return Envelopes.errorB("您的账号已被限制留言", HttpStatus.FORBIDDEN);
        }
        Map<String, Object> parent = top(publicId);
        if (parent == null) {
            return Envelopes.errorB("留言不存在", HttpStatus.NOT_FOUND);
        }
        if (((Number) parent.get("status")).intValue() != 1) {
            return Envelopes.errorB("仅可对已发布的留言回复", HttpStatus.BAD_REQUEST);
        }
        boolean owner = users.isSiteOwner(user);
        jdbc.sql("""
                INSERT INTO guest_message (
                    public_id, parent_id, guest_user_id, author_name, avatar_url,
                    provider, profile_url, content, status, is_owner
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
                """)
                .param(UUID.randomUUID().toString())
                .param(parent.get("id"))
                .param(guestId)
                .param(user.get("name"))
                .param(user.get("avatar_url"))
                .param(user.get("provider"))
                .param(user.get("profile_url"))
                .param(content)
                .param(owner ? 1 : 0)
                .update();
        rates.recordReplyIp(request);
        if (!owner) {
            mail.schedule("新回复", content);
        }
        List<Map<String, Object>> replies = query(
                COLS + " WHERE parent_id = ? AND status = 1 ORDER BY created_at ASC, id ASC",
                List.of(parent.get("id")));
        return ResponseEntity.ok(Envelopes.okWithMessage(toMessage(parent, replies), "回复成功"));
    }

    @GetMapping("/admin")
    public ResponseEntity<?> admin(HttpServletRequest request) {
        ResponseEntity<?> denied = ownerOnly(request);
        if (denied != null) {
            return denied;
        }
        String statusName = request.getParameter("status");
        int status = switch (statusName == null ? "pending" : statusName.strip().toLowerCase()) {
            case "published" -> 1;
            case "hidden" -> 2;
            case "rejected" -> 3;
            default -> 0;
        };
        String sort = sort(request.getParameter("sort"));
        int[] page = page(request, adminPageSize);
        if (page == null) {
            return Envelopes.errorB("分页参数无效", HttpStatus.BAD_REQUEST);
        }
        page[1] = Math.min(page[1], 50);
        int total = count("status = " + status + " AND parent_id IS NULL");
        List<Map<String, Object>> rows = query(COLS + " WHERE status = ? AND parent_id IS NULL ORDER BY created_at "
                + sort + ", id " + sort + " LIMIT ? OFFSET ?", List.of(status, page[1], (page[0] - 1L) * page[1]));
        List<Map<String, Object>> items = new ArrayList<>();
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = toMessage(row, List.of());
            item.put("status", ((Number) row.get("status")).intValue());
            items.add(item);
        }
        return ResponseEntity.ok(Envelopes.ok(pageBody(items, total, page)));
    }

    @PatchMapping("/admin/{publicId}")
    public ResponseEntity<?> moderate(@PathVariable String publicId, @RequestBody(required = false) Map<String, Object> body,
            HttpServletRequest request) {
        ResponseEntity<?> denied = ownerOnly(request);
        if (denied != null) {
            return denied;
        }
        Object action = body == null ? null : body.get("action");
        if (!(action instanceof String text) || text.isBlank()) {
            return Envelopes.errorB("请指定审核动作 action", HttpStatus.BAD_REQUEST);
        }
        Map<String, Object> row = top(publicId);
        if (row == null) {
            return Envelopes.errorB("留言不存在", HttpStatus.BAD_REQUEST);
        }
        int next = nextStatus(((Number) row.get("status")).intValue(), text.strip().toLowerCase());
        if (next < 0) {
            return Envelopes.errorB(statusMessage(next), HttpStatus.BAD_REQUEST);
        }
        jdbc.sql("UPDATE guest_message SET status = ? WHERE public_id = ?").param(next).param(publicId).update();
        Map<String, Object> updated = top(publicId);
        Map<String, Object> item = toMessage(updated, List.of());
        item.put("status", next);
        return ResponseEntity.ok(Envelopes.okWithMessage(item, "操作成功"));
    }

    @DeleteMapping("/admin/{publicId}")
    public ResponseEntity<?> delete(@PathVariable String publicId, HttpServletRequest request) {
        ResponseEntity<?> denied = ownerOnly(request);
        if (denied != null) {
            return denied;
        }
        Map<String, Object> row = top(publicId);
        if (row == null) {
            return Envelopes.errorB("留言不存在", HttpStatus.BAD_REQUEST);
        }
        jdbc.sql("DELETE FROM guest_message WHERE id = ?").param(row.get("id")).update();
        return ResponseEntity.ok(Envelopes.okWithMessage(null, "留言已删除"));
    }

    @PostMapping("/admin/{publicId}/block")
    public ResponseEntity<?> block(@PathVariable String publicId, HttpServletRequest request) {
        ResponseEntity<?> denied = ownerOnly(request);
        if (denied != null) {
            return denied;
        }
        Map<String, Object> row = top(publicId);
        if (row == null) {
            return Envelopes.errorB("留言不存在", HttpStatus.BAD_REQUEST);
        }
        if (users.rowIsOwner(string(row.get("profile_url")), ((Number) row.get("is_owner")).intValue() != 0)) {
            return Envelopes.errorB("无法拉黑站长", HttpStatus.BAD_REQUEST);
        }
        Object guest = row.get("guest_user_id");
        if (guest == null) {
            return Envelopes.errorB("该留言未关联登录用户，无法拉黑", HttpStatus.BAD_REQUEST);
        }
        int guestId = ((Number) guest).intValue();
        jdbc.sql("UPDATE guest_user SET is_blocked = 1 WHERE id = ?").param(guestId).update();
        jdbc.sql("UPDATE guest_message SET status = 2 WHERE guest_user_id = ? AND parent_id IS NULL AND status = 1")
                .param(guestId).update();
        jdbc.sql("UPDATE guest_message SET status = 3 WHERE guest_user_id = ? AND parent_id IS NULL AND status = 0")
                .param(guestId).update();
        return ResponseEntity.ok(Envelopes.okWithMessage(null, "已拉黑该用户"));
    }

    private ResponseEntity<?> ownerOnly(HttpServletRequest request) {
        Map<String, Object> user = user(request);
        if (user == null) {
            return Envelopes.errorB("请先登录", HttpStatus.UNAUTHORIZED);
        }
        if (!users.isSiteOwner(user)) {
            return Envelopes.errorB("需要站长权限", HttpStatus.FORBIDDEN);
        }
        return null;
    }

    @SuppressWarnings("unchecked")
    private static Map<String, Object> user(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session == null) {
            return null;
        }
        Map<String, Object> user = (Map<String, Object>) session.getAttribute(GuestUsers.USER);
        if (user == null || user.get("guest_user_id") == null) {
            return null;
        }
        return user;
    }

    private Map<String, Object> toMessage(Map<String, Object> row, List<Map<String, Object>> replies) {
        Map<String, Object> item = base(row);
        List<Map<String, Object>> nested = new ArrayList<>();
        for (Map<String, Object> reply : replies) {
            nested.add(base(reply));
        }
        item.put("replies", nested);
        return item;
    }

    private Map<String, Object> base(Map<String, Object> row) {
        Map<String, Object> item = new LinkedHashMap<>();
        item.put("id", row.get("public_id"));
        item.put("author", row.get("author_name"));
        item.put("avatarUrl", row.get("avatar_url"));
        item.put("provider", row.get("provider"));
        item.put("profileUrl", row.get("profile_url"));
        item.put("isOwner", users.rowIsOwner(string(row.get("profile_url")), ((Number) row.get("is_owner")).intValue() != 0));
        item.put("content", row.get("content"));
        item.put("createdAt", Dates.isoLocal((LocalDateTime) row.get("created_at")));
        return item;
    }

    private static Map<String, Object> pageBody(List<Map<String, Object>> items, int total, int[] page) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("items", items);
        data.put("total", total);
        data.put("page", page[0]);
        data.put("size", page[1]);
        return data;
    }

    private int nextStatus(int current, String action) {
        return switch (action) {
            case "approve" -> (current == 0 || current == 2) ? 1 : -2;
            case "reject" -> current == 0 ? 3 : -3;
            case "hide" -> current == 1 ? 2 : -4;
            case "restore" -> current == 2 ? 1 : -5;
            default -> -1;
        };
    }

    private static String statusMessage(int code) {
        return switch (code) {
            case -2 -> "当前状态无法通过审核";
            case -3 -> "仅待审核留言可拒绝";
            case -4 -> "仅已发布留言可隐藏";
            case -5 -> "仅已隐藏留言可恢复";
            default -> "未知的审核动作";
        };
    }

    private Map<String, Object> top(String publicId) {
        List<Map<String, Object>> rows = query(COLS + " WHERE public_id = ? AND parent_id IS NULL", List.of(publicId));
        return rows.isEmpty() ? null : rows.get(0);
    }

    private Map<String, Object> one(String publicId) {
        return query(COLS + " WHERE public_id = ?", List.of(publicId)).get(0);
    }

    private int count(String where) {
        Long n = jdbc.sql("SELECT COUNT(*) FROM guest_message WHERE " + where).query(Long.class).single();
        return n == null ? 0 : n.intValue();
    }

    private List<Map<String, Object>> query(String sql, List<Object> args) {
        var spec = jdbc.sql(sql);
        for (Object arg : args) {
            spec = spec.param(arg);
        }
        return spec.query((rs, n) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", rs.getLong("id"));
            row.put("public_id", rs.getString("public_id"));
            long parent = rs.getLong("parent_id");
            row.put("parent_id", rs.wasNull() ? null : parent);
            long guest = rs.getLong("guest_user_id");
            row.put("guest_user_id", rs.wasNull() ? null : guest);
            row.put("author_name", rs.getString("author_name"));
            row.put("avatar_url", rs.getString("avatar_url"));
            row.put("provider", rs.getString("provider"));
            row.put("profile_url", rs.getString("profile_url"));
            row.put("content", rs.getString("content"));
            row.put("status", rs.getInt("status"));
            row.put("is_owner", rs.getInt("is_owner"));
            row.put("created_at", rs.getObject("created_at", LocalDateTime.class));
            return row;
        }).list();
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

    private static String sort(String raw) {
        return "oldest".equals(raw == null ? "" : raw.strip().toLowerCase()) ? "ASC" : "DESC";
    }

    private static String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
