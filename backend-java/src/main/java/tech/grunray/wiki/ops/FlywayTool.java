package tech.grunray.wiki.ops;

import java.sql.Connection;
import java.sql.SQLException;
import java.util.Set;

import org.flywaydb.core.Flyway;

/**
 * 手动迁移入口。普通启动不会调用这里。
 * 只接受回环地址上的两个隔离库。
 */
public final class FlywayTool {

    private static final Set<String> ALLOWED = Set.of("grunray_wiki_flyway_empty", "grunray_wiki_flyway_baseline");

    private FlywayTool() {
    }

    public static void main(String[] args) throws SQLException {
        String command = env("GRUNRAY_FLYWAY_COMMAND", "migrate");
        String host = env("MYSQL_HOST", "127.0.0.1");
        String port = env("MYSQL_PORT", "3306");
        String database = env("MYSQL_DATABASE", "");
        String user = env("MYSQL_USER", "root");
        String password = env("MYSQL_PASSWORD", "");
        if (!"127.0.0.1".equals(host) && !"localhost".equals(host) && !"::1".equals(host)) {
            throw new IllegalStateException("拒绝 Flyway：MYSQL_HOST 不是回环地址");
        }
        if (!ALLOWED.contains(database)) {
            throw new IllegalStateException("拒绝 Flyway：当前库是 " + database);
        }
        if (!"migrate".equals(command) && !"baseline".equals(command)) {
            throw new IllegalStateException("GRUNRAY_FLYWAY_COMMAND 只能是 migrate 或 baseline");
        }
        String url = "jdbc:mysql://" + host + ":" + port + "/" + database
                + "?characterEncoding=UTF-8&connectionCollation=utf8mb4_unicode_ci";
        Flyway flyway = Flyway.configure()
                .dataSource(url, user, password)
                .locations("classpath:db/migration")
                .baselineVersion("1")
                .baselineDescription("existing schema without DROP")
                .baselineOnMigrate(false)
                .load();
        try (Connection connection = flyway.getConfiguration().getDataSource().getConnection()) {
            String catalog = connection.getCatalog();
            String jdbc = connection.getMetaData().getURL();
            if (!database.equals(catalog) || jdbc == null || (!jdbc.contains("127.0.0.1") && !jdbc.contains("localhost"))) {
                throw new IllegalStateException("拒绝 Flyway：连到了 " + catalog);
            }
        }
        System.out.println("[flyway] command=" + command + " catalog=" + database);
        if ("baseline".equals(command)) {
            flyway.baseline();
        } else {
            flyway.migrate();
        }
        System.out.println("[flyway] done catalog=" + database);
    }

    private static String env(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.isBlank() ? fallback : value;
    }
}
