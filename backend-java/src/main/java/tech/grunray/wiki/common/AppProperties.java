package tech.grunray.wiki.common;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 与 Flask {@code app/config.py} 同名的配置项。相对路径按进程工作目录解析（Flask 按 backend/ 解析），
 * 生产环境请传绝对路径。不读 {@code backend/.env}。
 */
@ConfigurationProperties(prefix = "grunray")
public record AppProperties(
        String contentRoot,
        String corsOrigins,
        String frontendOrigin,
        String siteUrl,
        String siteTitle,
        String siteDescription,
        String siteLogoUrl) {

    public AppProperties {
        contentRoot = blankTo(contentRoot, "content");
        corsOrigins = corsOrigins == null ? "" : corsOrigins;
        frontendOrigin = blankTo(frontendOrigin, "http://localhost:5173");
        siteUrl = siteUrl == null || siteUrl.isBlank() ? frontendOrigin : siteUrl;
        siteTitle = blankTo(siteTitle, "GrunRay");
        siteDescription = siteDescription == null ? "" : siteDescription;
        siteLogoUrl = siteLogoUrl == null ? "" : siteLogoUrl.trim();
    }

    public Path contentRootPath() {
        return Path.of(contentRoot).toAbsolutePath().normalize();
    }

    public List<String> corsOriginList() {
        return Arrays.stream(corsOrigins.split(",")).map(String::strip).filter(s -> !s.isEmpty()).toList();
    }

    /** flask-cors {@code always_send}：不带 Origin 时回排序后的第一个。 */
    public String corsFallbackOrigin() {
        return corsOriginList().stream().sorted().findFirst().orElse("");
    }

    public String siteOrigin() {
        return stripSlash(siteUrl);
    }

    /** 与 {@code Config.friends_site_logo_absolute} 一致。 */
    public String siteLogoAbsolute() {
        if (siteLogoUrl.isEmpty()) {
            return stripSlash(frontendOrigin) + "/favicon.jpg";
        }
        if (siteLogoUrl.startsWith("http://") || siteLogoUrl.startsWith("https://")) {
            return siteLogoUrl;
        }
        String path = siteLogoUrl.startsWith("/") ? siteLogoUrl : "/" + siteLogoUrl;
        return stripSlash(frontendOrigin) + path;
    }

    private static String blankTo(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }

    private static String stripSlash(String value) {
        String s = value == null ? "" : value;
        while (s.endsWith("/")) {
            s = s.substring(0, s.length() - 1);
        }
        return s;
    }
}
