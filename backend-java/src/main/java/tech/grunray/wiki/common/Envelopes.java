package tech.grunray.wiki.common;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

/**
 * Flask 的两种信封（API_CONTRACT §1.1）：失败时 A 给 {@code data:[]}，B 给 {@code data:null}；
 * 失败 {@code code} 恒为 1，靠 HTTP 状态区分。
 */
public final class Envelopes {

    private Envelopes() {
    }

    public static Map<String, Object> ok(Object data) {
        return body(0, data, "");
    }

    public static Map<String, Object> okWithMessage(Object data, String message) {
        return body(0, data, message);
    }

    /** read_api 的 media/list、filmfeed、music 与 {@code /api/posts} 参数错误。 */
    public static ResponseEntity<Map<String, Object>> errorA(String message, HttpStatus status) {
        return ResponseEntity.status(status).body(body(1, List.of(), message));
    }

    /** 其余 Blueprint。 */
    public static ResponseEntity<Map<String, Object>> errorB(String message, HttpStatus status) {
        return ResponseEntity.status(status).body(body(1, null, message));
    }

    public static ResponseEntity<Map<String, String>> notFound() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "not_found"));
    }

    private static Map<String, Object> body(int code, Object data, String message) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("code", code);
        out.put("data", data);
        out.put("message", message);
        return out;
    }
}
