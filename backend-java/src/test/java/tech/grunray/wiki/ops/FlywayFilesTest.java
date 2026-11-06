package tech.grunray.wiki.ops;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.nio.file.Files;
import java.nio.file.Path;

import org.junit.jupiter.api.Test;

class FlywayFilesTest {

    @Test
    void startupProfilesDoNotMigrate() throws Exception {
        String app = Files.readString(Path.of("src/main/resources/application.yml"));
        String prod = Files.readString(Path.of("src/main/resources/application-prod.yml"));
        String contract = Files.readString(Path.of("src/main/resources/application-contract.yml"));
        assertTrue(app.contains("flyway:") && app.contains("enabled: false"));
        assertTrue(prod.contains("flyway:") && prod.contains("enabled: false"));
        assertTrue(contract.contains("flyway:") && contract.contains("enabled: false"));
    }

    @Test
    void baselineSqlHasNoDrop() throws Exception {
        String sql = Files.readString(Path.of("src/main/resources/db/migration/V1__baseline.sql")).toUpperCase();
        assertFalse(sql.contains("DROP TABLE"));
        assertFalse(sql.contains("DROP DATABASE"));
        assertTrue(sql.contains("CREATE TABLE `POST`") || sql.contains("CREATE TABLE `post`".toUpperCase()));
        assertTrue(sql.contains("FRAGMENT"));
        assertTrue(sql.contains("XIQI_ABOUT"));
    }
}
