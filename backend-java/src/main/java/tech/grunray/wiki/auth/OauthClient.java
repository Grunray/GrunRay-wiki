package tech.grunray.wiki.auth;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Duration;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Flask {@code auth_oauth.py}。{@code oauth-http-base} 非空时把外呼改写到模拟服务。 */
@Component
public class OauthClient {

    private static final List<String[]> REWRITE = List.of(
            new String[] {"https://github.com/", "/github/"},
            new String[] {"https://api.github.com/", "/github-api/"},
            new String[] {"https://oauth2.googleapis.com/", "/google-oauth2/"},
            new String[] {"https://www.googleapis.com/", "/googleapis/"});

    private final ObjectMapper mapper;
    private final String rewriteBase;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(20)).build();

    public OauthClient(ObjectMapper mapper, @Value("${grunray.oauth-http-base:}") String rewriteBase) {
        this.mapper = mapper;
        this.rewriteBase = rewriteBase == null ? "" : rewriteBase.replaceAll("/+$", "");
    }

    public String githubAuthorize(String clientId, String redirectUri, String state) {
        return "https://github.com/login/oauth/authorize?" + form(Map.of(
                "client_id", clientId,
                "redirect_uri", redirectUri,
                "scope", "read:user user:email",
                "state", state));
    }

    public String googleAuthorize(String clientId, String redirectUri, String state) {
        return "https://accounts.google.com/o/oauth2/v2/auth?" + form(Map.of(
                "client_id", clientId,
                "redirect_uri", redirectUri,
                "response_type", "code",
                "scope", "openid email profile",
                "state", state,
                "access_type", "online",
                "prompt", "select_account"));
    }

    public Map<String, Object> githubUser(String clientId, String secret, String code, String redirectUri) throws Exception {
        JsonNode token = postForm("https://github.com/login/oauth/access_token", Map.of(
                "client_id", clientId,
                "client_secret", secret,
                "code", code,
                "redirect_uri", redirectUri));
        String access = text(token, "access_token");
        if (access.isEmpty()) {
            throw new IllegalStateException("github_token_failed");
        }
        JsonNode profile = getJson("https://api.github.com/user", Map.of(
                "Authorization", "Bearer " + access,
                "User-Agent", "GrunRay-wiki-message-auth"));
        String email = text(profile, "email");
        if (email.isEmpty()) {
            email = primaryEmail(access);
        }
        String login = text(profile, "login");
        if (login.isEmpty()) {
            login = "github-user";
        }
        String name = text(profile, "name");
        if (name.isEmpty()) {
            name = login;
        }
        String id = text(profile, "id");
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("provider", "github");
        user.put("id", id.isEmpty() ? login : id);
        user.put("login", login);
        user.put("name", name);
        user.put("email", email.isEmpty() ? null : email);
        user.put("avatar_url", emptyToNull(text(profile, "avatar_url")));
        String html = text(profile, "html_url");
        user.put("profile_url", html.isEmpty() ? "https://github.com/" + login : html);
        return user;
    }

    public Map<String, Object> googleUser(String clientId, String secret, String code, String redirectUri) throws Exception {
        JsonNode token = postForm("https://oauth2.googleapis.com/token", Map.of(
                "client_id", clientId,
                "client_secret", secret,
                "code", code,
                "grant_type", "authorization_code",
                "redirect_uri", redirectUri));
        String access = text(token, "access_token");
        if (access.isEmpty()) {
            throw new IllegalStateException("google_token_failed");
        }
        JsonNode profile = getJson("https://www.googleapis.com/oauth2/v2/userinfo", Map.of(
                "Authorization", "Bearer " + access));
        String email = text(profile, "email");
        String name = text(profile, "name");
        if (name.isEmpty()) {
            name = email.contains("@") ? email.substring(0, email.indexOf('@')) : "Google User";
        }
        String id = text(profile, "id");
        if (id.isEmpty()) {
            id = text(profile, "sub");
        }
        if (id.isEmpty()) {
            id = "google-user";
        }
        Map<String, Object> user = new LinkedHashMap<>();
        user.put("provider", "google");
        user.put("id", id);
        user.put("login", email.isEmpty() ? name : email);
        user.put("name", name);
        user.put("email", email.isEmpty() ? null : email);
        user.put("avatar_url", emptyToNull(text(profile, "picture")));
        user.put("profile_url", emptyToNull(text(profile, "link")));
        return user;
    }

    public static String newState() {
        byte[] buf = new byte[24];
        new SecureRandom().nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    private String primaryEmail(String access) {
        try {
            JsonNode emails = getJson("https://api.github.com/user/emails", Map.of(
                    "Authorization", "Bearer " + access,
                    "User-Agent", "GrunRay-wiki-message-auth"));
            if (!emails.isArray()) {
                return "";
            }
            for (JsonNode item : emails) {
                if (item.path("primary").asBoolean(false)) {
                    return text(item, "email");
                }
            }
        } catch (Exception ignored) {
            return "";
        }
        return "";
    }

    private JsonNode postForm(String url, Map<String, String> fields) throws Exception {
        HttpRequest request = HttpRequest.newBuilder(URI.create(rewrite(url)))
                .timeout(Duration.ofSeconds(20))
                .header("Content-Type", "application/x-www-form-urlencoded")
                .header("Accept", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(form(fields)))
                .build();
        HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("oauth http " + response.statusCode());
        }
        return mapper.readTree(response.body());
    }

    private JsonNode getJson(String url, Map<String, String> headers) throws Exception {
        HttpRequest.Builder builder = HttpRequest.newBuilder(URI.create(rewrite(url)))
                .timeout(Duration.ofSeconds(20))
                .header("Accept", "application/json")
                .GET();
        headers.forEach(builder::header);
        HttpResponse<String> response = http.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new IllegalStateException("oauth http " + response.statusCode());
        }
        return mapper.readTree(response.body());
    }

    private String rewrite(String url) {
        if (rewriteBase.isEmpty()) {
            return url;
        }
        for (String[] pair : REWRITE) {
            if (url.startsWith(pair[0])) {
                return rewriteBase + pair[1] + url.substring(pair[0].length());
            }
        }
        throw new IllegalStateException("拒绝外呼未知地址");
    }

    private static String form(Map<String, String> fields) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> entry : fields.entrySet()) {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8));
            sb.append('=');
            sb.append(URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8));
        }
        return sb.toString();
    }

    private static String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        if (value == null || value.isNull()) {
            return "";
        }
        return value.asText();
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }
}
