package tech.grunray.wiki.auth;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/** 站长判定与访客账号 upsert，对齐 {@code site_owner.py} / {@code guest_user_repo.py}。 */
@Service
public class GuestUsers {

    public static final String USER = "message_user";

    private final JdbcClient jdbc;
    private final Set<String> ownerProfiles;
    private final Set<String> ownerGithub;
    private final Set<String> ownerGoogle;

    public GuestUsers(
            JdbcClient jdbc,
            @Value("${MESSAGE_OWNER_PROFILE_URLS:}") String profiles,
            @Value("${MESSAGE_OWNER_GITHUB_IDS:}") String github,
            @Value("${MESSAGE_OWNER_GOOGLE_IDS:}") String google) {
        this.jdbc = jdbc;
        this.ownerProfiles = splitProfiles(profiles);
        this.ownerGithub = split(github);
        this.ownerGoogle = split(google);
    }

    public boolean isSiteOwner(Map<String, Object> user) {
        if (user == null) {
            return false;
        }
        if (ownerProfiles.contains(normalizeProfile(string(user.get("profile_url"))))) {
            return true;
        }
        String provider = string(user.get("provider"));
        String id = string(user.get("id"));
        if ("github".equals(provider) && ownerGithub.contains(id)) {
            return true;
        }
        return "google".equals(provider) && ownerGoogle.contains(id);
    }

    public boolean rowIsOwner(String profileUrl, boolean stored) {
        return stored || ownerProfiles.contains(normalizeProfile(profileUrl));
    }

    public Map<String, Object> upsert(Map<String, Object> profile) {
        jdbc.sql("""
                INSERT INTO guest_user (
                    provider, provider_user_id, login, name, email, avatar_url, profile_url
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    login = VALUES(login),
                    name = VALUES(name),
                    email = VALUES(email),
                    avatar_url = VALUES(avatar_url),
                    profile_url = VALUES(profile_url),
                    updated_at = CURRENT_TIMESTAMP
                """)
                .param(profile.get("provider"))
                .param(string(profile.get("id")))
                .param(profile.get("login"))
                .param(profile.get("name"))
                .param(profile.get("email"))
                .param(profile.get("avatar_url"))
                .param(profile.get("profile_url"))
                .update();
        Map<String, Object> row = jdbc.sql("""
                SELECT id, is_blocked FROM guest_user
                WHERE provider = ? AND provider_user_id = ?
                """)
                .param(profile.get("provider"))
                .param(string(profile.get("id")))
                .query((rs, n) -> {
                    Map<String, Object> out = new LinkedHashMap<>();
                    out.put("guest_user_id", rs.getInt("id"));
                    out.put("is_blocked", rs.getInt("is_blocked") != 0);
                    return out;
                })
                .single();
        Map<String, Object> session = new LinkedHashMap<>();
        session.put("guest_user_id", row.get("guest_user_id"));
        session.put("provider", profile.get("provider"));
        session.put("id", string(profile.get("id")));
        Object login = profile.get("login");
        session.put("login", login == null ? profile.get("name") : login);
        Object name = profile.get("name");
        session.put("name", name == null ? profile.get("login") : name);
        session.put("email", profile.get("email"));
        session.put("avatar_url", profile.get("avatar_url"));
        session.put("profile_url", profile.get("profile_url"));
        return session;
    }

    public boolean blocked(int guestUserId) {
        Integer flag = jdbc.sql("SELECT is_blocked FROM guest_user WHERE id = ?")
                .param(guestUserId)
                .query((rs, n) -> rs.getInt(1))
                .optional()
                .orElse(0);
        return flag != 0;
    }

    static String normalizeProfile(String url) {
        if (url == null || url.isBlank()) {
            return "";
        }
        String raw = url.strip().replaceAll("/+$", "");
        String withScheme = raw.contains("://") ? raw : "https://" + raw;
        try {
            java.net.URI uri = java.net.URI.create(withScheme);
            String host = uri.getHost();
            if (host == null || host.isBlank()) {
                return raw.toLowerCase();
            }
            String path = uri.getPath() == null ? "" : uri.getPath().replaceAll("/+$", "").toLowerCase();
            host = host.toLowerCase();
            return path.isEmpty() ? "https://" + host : "https://" + host + path;
        } catch (IllegalArgumentException e) {
            return raw.toLowerCase();
        }
    }

    private static Set<String> split(String raw) {
        if (raw == null || raw.isBlank()) {
            return Set.of();
        }
        return java.util.Arrays.stream(raw.split(",")).map(String::strip).filter(s -> !s.isEmpty())
                .collect(java.util.stream.Collectors.toSet());
    }

    private static Set<String> splitProfiles(String raw) {
        return split(raw).stream().map(GuestUsers::normalizeProfile).collect(java.util.stream.Collectors.toSet());
    }

    private static String string(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
