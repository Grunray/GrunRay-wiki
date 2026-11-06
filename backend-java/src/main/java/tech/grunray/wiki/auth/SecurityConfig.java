package tech.grunray.wiki.auth;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.WebSecurityCustomizer;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.firewall.FirewalledRequest;
import org.springframework.security.web.firewall.HttpFirewall;
import org.springframework.security.web.firewall.RequestRejectedException;
import org.springframework.security.web.firewall.StrictHttpFirewall;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 保留匿名访问（未登录由各接口回信封 401，不跳登录页）。
 * CSRF：可读 Cookie {@code XSRF-TOKEN}，写请求带回 {@code X-XSRF-TOKEN}（API_CONTRACT §6 #14）。
 * 不用 XOR 掩码，这样前端和契约测试可以直接抄 Cookie。
 */
@Configuration
public class SecurityConfig {

    @Bean
    SecurityFilterChain security(HttpSecurity http) throws Exception {
        CookieCsrfTokenRepository cookies = CookieCsrfTokenRepository.withHttpOnlyFalse();
        CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
        handler.setCsrfRequestAttributeName(null);
        http.csrf(csrf -> csrf.csrfTokenRepository(cookies).csrfTokenRequestHandler(handler))
                // 默认 DENY 会让项目详情里的同源 demo iframe 变成空白。Flask 不发这个头。
                .headers(headers -> headers.frameOptions(frame -> frame.sameOrigin()))
                .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .addFilterAfter(new CsrfCookieFilter(), CsrfFilter.class);
        return http.build();
    }

    /**
     * 默认防火墙会直接 400 掉带 {@code ..} 或编码斜杠的媒体路径。
     * 放行后由 {@code MediaFiles} 拒绝并回 HTML 404，和 Flask 一样不读出目录外的文件。
     */
    @Bean
    HttpFirewall httpFirewall() {
        StrictHttpFirewall strict = new StrictHttpFirewall();
        strict.setAllowUrlEncodedSlash(true);
        return new HttpFirewall() {
            @Override
            public FirewalledRequest getFirewalledRequest(HttpServletRequest request) {
                try {
                    return strict.getFirewalledRequest(request);
                } catch (RequestRejectedException ex) {
                    return new FirewalledRequest(request) {
                        @Override
                        public void reset() {
                            // 没有包一层，无需复位
                        }
                    };
                }
            }

            @Override
            public HttpServletResponse getFirewalledResponse(HttpServletResponse response) {
                return strict.getFirewalledResponse(response);
            }
        };
    }

    @Bean
    WebSecurityCustomizer webSecurityCustomizer(HttpFirewall httpFirewall) {
        return web -> web.httpFirewall(httpFirewall);
    }
}
