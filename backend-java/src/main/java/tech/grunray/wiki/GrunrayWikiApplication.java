package tech.grunray.wiki;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

import tech.grunray.wiki.common.AppProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class GrunrayWikiApplication {

    public static void main(String[] args) {
        SpringApplication.run(GrunrayWikiApplication.class, args);
    }
}
