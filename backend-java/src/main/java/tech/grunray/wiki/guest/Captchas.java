package tech.grunray.wiki.guest;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.ThreadLocalRandom;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpSession;

/** 留言 / 友链共用的加法验证码。答错也作废。 */
@Component
public class Captchas {

    private final int ttlSec;

    public Captchas(@Value("${MESSAGE_CAPTCHA_TTL_SEC:300}") int ttlSec) {
        this.ttlSec = ttlSec;
    }

    public Map<String, String> issue(HttpSession session, String key) {
        int a = ThreadLocalRandom.current().nextInt(1, 21);
        int b = ThreadLocalRandom.current().nextInt(1, 21);
        String id = OauthIds.random();
        Map<String, Object> stored = new LinkedHashMap<>();
        stored.put("id", id);
        stored.put("answer", Integer.toString(a + b));
        stored.put("expires", Instant.now().getEpochSecond() + ttlSec);
        session.setAttribute(key, stored);
        return Map.of("captchaId", id, "question", a + " + " + b + " = ?");
    }

    public String verify(HttpSession session, String key, Object id, Object answer) {
        if (id == null || answer == null || String.valueOf(answer).strip().isEmpty()) {
            return "请完成验证码";
        }
        @SuppressWarnings("unchecked")
        Map<String, Object> stored = (Map<String, Object>) session.getAttribute(key);
        session.removeAttribute(key);
        if (stored == null) {
            return "验证码已过期，请刷新后重试";
        }
        long expires = ((Number) stored.get("expires")).longValue();
        if (Instant.now().getEpochSecond() > expires) {
            return "验证码已过期，请刷新后重试";
        }
        if (!stored.get("id").equals(String.valueOf(id))) {
            return "验证码无效，请刷新后重试";
        }
        if (!stored.get("answer").equals(String.valueOf(answer).strip())) {
            return "验证码答案错误";
        }
        return null;
    }
}
