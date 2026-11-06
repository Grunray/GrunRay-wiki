package tech.grunray.wiki.media;

import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@RestController
public class MediaFileController {

    private final MediaFiles files;

    public MediaFileController(MediaFiles files) {
        this.files = files;
    }

    @GetMapping("/api/media/files/**")
    public void file(HttpServletRequest request, HttpServletResponse response) throws IOException {
        String uri = URLDecoder.decode(request.getRequestURI(), StandardCharsets.UTF_8);
        String marker = "/api/media/files/";
        int at = uri.indexOf(marker);
        String relative = at < 0 ? "" : uri.substring(at + marker.length());
        files.serve(relative, request, response);
    }
}
