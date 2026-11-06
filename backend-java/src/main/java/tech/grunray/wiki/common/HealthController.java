package tech.grunray.wiki.common;

import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    /** 部署探活：不查库（API_CONTRACT #6）。 */
    @GetMapping("/api/health")
    public Map<String, Boolean> health() {
        return Map.of("ok", true);
    }
}
