package tech.grunray.wiki.common;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/** 绑定 {@link AppProperties}。CORS 在 {@link FlaskCorsFilter}。 */
@Configuration
@EnableConfigurationProperties(AppProperties.class)
public class WebConfig {

    /** 让 {@code %2F} 进入控制器，媒体路径穿越才能回 404 而不是 Tomcat 400。 */
    @Bean
    TomcatServletWebServerFactory tomcat() {
        TomcatServletWebServerFactory factory = new TomcatServletWebServerFactory();
        factory.addConnectorCustomizers(connector -> connector.setEncodedSolidusHandling("decode"));
        return factory;
    }
}
