package tech.grunray.wiki.auth;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import tech.grunray.wiki.common.Envelopes;

/** {@code /api/auth/*}，路径与回跳规则对齐 Flask {@code auth_api.py}。 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final String STATE = "oauth_state";
    private static final String RETURN_TO = "oauth_return_to";
    private static final Pattern SAFE = Pattern.compile("^/[a-zA-Z0-9/_\\-?=&%.]*$");

    private final OauthClient oauth;
    private final GuestUsers users;
    private final String githubId;
    private final String githubSecret;
    private final String googleId;
    private final String googleSecret;
    private final String publicBase;
    private final String frontendOrigin;

    public AuthController(
            OauthClient oauth,
            GuestUsers users,
            @Value("${GITHUB_CLIENT_ID:}") String githubId,
            @Value("${GITHUB_CLIENT_SECRET:}") String githubSecret,
            @Value("${GOOGLE_CLIENT_ID:}") String googleId,
            @Value("${GOOGLE_CLIENT_SECRET:}") String googleSecret,
            @Value("${OAUTH_PUBLIC_BASE:http://localhost:5173}") String publicBase,
            @Value("${FRONTEND_ORIGIN:http://localhost:5173}") String frontendOrigin) {
        this.oauth = oauth;
        this.users = users;
        this.githubId = githubId;
        this.githubSecret = githubSecret;
        this.googleId = googleId;
        this.googleSecret = googleSecret;
        this.publicBase = strip(publicBase);
        this.frontendOrigin = strip(frontendOrigin);
    }

    @GetMapping("/providers")
    public Map<String, Object> providers() {
        Map<String, Boolean> data = new LinkedHashMap<>();
        data.put("github", !githubId.isBlank() && !githubSecret.isBlank());
        data.put("google", !googleId.isBlank() && !googleSecret.isBlank());
        return Envelopes.ok(data);
    }

    @GetMapping("/me")
    public Map<String, Object> me(HttpSession session) {
        @SuppressWarnings("unchecked")
        Map<String, Object> user = (Map<String, Object>) session.getAttribute(GuestUsers.USER);
        if (user == null) {
            return Envelopes.ok(null);
        }
        Map<String, Object> payload = new LinkedHashMap<>(user);
        payload.put("isSiteOwner", users.isSiteOwner(user));
        return Envelopes.ok(payload);
    }

    @PostMapping("/logout")
    public Map<String, Object> logout(HttpSession session) {
        session.removeAttribute(GuestUsers.USER);
        return Envelopes.ok(true);
    }

    @GetMapping("/github")
    public ResponseEntity<Void> github(HttpServletRequest request) {
        return start("github", request);
    }

    @GetMapping("/google")
    public ResponseEntity<Void> google(HttpServletRequest request) {
        return start("google", request);
    }

    @GetMapping("/github/callback")
    public ResponseEntity<Void> githubCallback(HttpServletRequest request) {
        return finish("github", request);
    }

    @GetMapping("/google/callback")
    public ResponseEntity<Void> googleCallback(HttpServletRequest request) {
        return finish("google", request);
    }

    private ResponseEntity<Void> start(String provider, HttpServletRequest request) {
        String returnTo = safeReturn(request.getParameter("return_to"));
        HttpSession session = request.getSession(true);
        session.setAttribute(RETURN_TO, returnTo);
        String state = OauthClient.newState();
        session.setAttribute(STATE, state);
        boolean github = "github".equals(provider);
        if (github && (githubId.isBlank() || githubSecret.isBlank())) {
            return redirect(returnTo, Map.of("auth_error", "github_not_configured"));
        }
        if (!github && (googleId.isBlank() || googleSecret.isBlank())) {
            return redirect(returnTo, Map.of("auth_error", "google_not_configured"));
        }
        String callback = publicBase + "/api/auth/" + provider + "/callback";
        String url = github
                ? oauth.githubAuthorize(githubId, callback, state)
                : oauth.googleAuthorize(googleId, callback, state);
        return ResponseEntity.status(HttpStatus.FOUND).location(java.net.URI.create(url)).build();
    }

    private ResponseEntity<Void> finish(String provider, HttpServletRequest request) {
        HttpSession session = request.getSession(true);
        String returnTo = stringAttr(session, RETURN_TO, "/messages");
        session.removeAttribute(RETURN_TO);
        Object expected = session.getAttribute(STATE);
        session.removeAttribute(STATE);
        String state = request.getParameter("state");
        if (expected == null || !expected.equals(state)) {
            return redirect(returnTo, Map.of("auth_error", "invalid_state"));
        }
        String error = request.getParameter("error");
        if (error != null && !error.isEmpty()) {
            return redirect(returnTo, Map.of("auth_error", error));
        }
        String code = request.getParameter("code");
        if (code == null || code.isEmpty()) {
            return redirect(returnTo, Map.of("auth_error", "missing_code"));
        }
        String callback = publicBase + "/api/auth/" + provider + "/callback";
        try {
            Map<String, Object> profile = "github".equals(provider)
                    ? oauth.githubUser(githubId, githubSecret, code, callback)
                    : oauth.googleUser(googleId, googleSecret, code, callback);
            session.setAttribute(GuestUsers.USER, users.upsert(profile));
        } catch (Exception e) {
            return redirect(returnTo, Map.of("auth_error", provider + "_failed"));
        }
        return redirect(returnTo, Map.of("auth", "success"));
    }

    private ResponseEntity<Void> redirect(String path, Map<String, String> extra) {
        String target = frontendOrigin + path;
        if (!extra.isEmpty()) {
            target += (path.contains("?") ? "&" : "?") + form(extra);
        }
        return ResponseEntity.status(HttpStatus.FOUND).location(java.net.URI.create(target)).build();
    }

    static String safeReturn(String raw) {
        if (raw == null || raw.isBlank()) {
            return "/messages";
        }
        String path = raw.strip();
        if (!path.startsWith("/") || path.startsWith("//") || !SAFE.matcher(path).matches()) {
            return "/messages";
        }
        return path;
    }

    private static String form(Map<String, String> fields) {
        StringBuilder sb = new StringBuilder();
        fields.forEach((k, v) -> {
            if (!sb.isEmpty()) {
                sb.append('&');
            }
            sb.append(URLEncoder.encode(k, StandardCharsets.UTF_8));
            sb.append('=');
            sb.append(URLEncoder.encode(v, StandardCharsets.UTF_8));
        });
        return sb.toString();
    }

    private static String stringAttr(HttpSession session, String key, String fallback) {
        Object value = session.getAttribute(key);
        return value == null ? fallback : String.valueOf(value);
    }

    private static String strip(String value) {
        String s = value == null ? "" : value;
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }
}
