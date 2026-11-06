package tech.grunray.wiki.common;

import java.util.Locale;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Flask 对未知路由 / 405 / 未捕获异常回 HTML 默认页；这里改回信封 B，状态码不变
 * （JAVA_MIGRATION §3「允许的修正」，API_CONTRACT §4.7）。
 */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handle(Exception e) {
        if (e instanceof ErrorResponse er) {
            HttpStatusCode status = er.getStatusCode();
            ResponseEntity<Map<String, Object>> base = Envelopes.errorB(messageFor(status), HttpStatus.valueOf(status.value()));
            return ResponseEntity.status(status).headers(er.getHeaders()).body(base.getBody());
        }
        log.error("unhandled exception", e);
        return Envelopes.errorB("internal_error", HttpStatus.INTERNAL_SERVER_ERROR);
    }

    private static String messageFor(HttpStatusCode status) {
        HttpStatus known = HttpStatus.resolve(status.value());
        if (known == null) {
            return "error";
        }
        return known.name().toLowerCase(Locale.ROOT);
    }
}
