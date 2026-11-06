package tech.grunray.wiki.common;

import java.io.IOException;
import java.util.List;

import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpServletResponseWrapper;

/**
 * 对齐 flask-cors（API_CONTRACT §1.2）：只包 {@code /api/*}；不带 Origin 时仍回排序后的第一个 origin；
 * 不允许的 Origin 不带头。{@code Vary: Origin} 追加在已有 Vary 之后。
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class FlaskCorsFilter extends OncePerRequestFilter {

    private final AppProperties props;

    public FlaskCorsFilter(AppProperties props) {
        this.props = props;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (path == null || !path.startsWith("/api/")) {
            chain.doFilter(request, response);
            return;
        }
        String origin = request.getHeader("Origin");
        List<String> allowed = props.corsOriginList();
        boolean listed = origin != null && allowed.contains(origin);
        boolean blocked = origin != null && !listed;
        String echoed = listed ? origin : props.corsFallbackOrigin();

        if (!blocked && "OPTIONS".equalsIgnoreCase(request.getMethod())
                && request.getHeader("Access-Control-Request-Method") != null) {
            apply(response, echoed, true);
            response.setStatus(HttpServletResponse.SC_OK);
            return;
        }

        HttpServletResponse wrapped = blocked ? response : new VaryAppender(response);
        if (!blocked) {
            apply(wrapped, echoed, listed);
        }
        chain.doFilter(request, wrapped);
    }

    private static void apply(HttpServletResponse response, String origin, boolean credentials) {
        if (origin != null && !origin.isEmpty()) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        }
        if (credentials) {
            response.setHeader("Access-Control-Allow-Credentials", "true");
        }
        response.addHeader("Vary", "Origin");
    }

    /** 后写入的 {@code Vary: Accept} 仍把 Origin 留在末尾，得到 {@code Accept, Origin}。 */
    private static final class VaryAppender extends HttpServletResponseWrapper {
        private VaryAppender(HttpServletResponse response) {
            super(response);
        }

        @Override
        public void setHeader(String name, String value) {
            super.setHeader(name, rewrite(name, value));
        }

        @Override
        public void addHeader(String name, String value) {
            if ("Vary".equalsIgnoreCase(name)) {
                super.setHeader(name, rewrite(name, currentVary(value)));
                return;
            }
            super.addHeader(name, value);
        }

        private String currentVary(String extra) {
            String existing = getHeader("Vary");
            if (existing == null || existing.isBlank()) {
                return extra;
            }
            if (extra == null || extra.isBlank() || existing.toLowerCase().contains(extra.toLowerCase())) {
                return existing;
            }
            return existing + ", " + extra;
        }

        private static String rewrite(String name, String value) {
            if (!"Vary".equalsIgnoreCase(name) || value == null) {
                return value;
            }
            if (value.toLowerCase().contains("origin")) {
                return value;
            }
            return value.isBlank() ? "Origin" : value + ", Origin";
        }
    }
}
