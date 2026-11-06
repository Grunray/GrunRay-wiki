package tech.grunray.wiki.media;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tech.grunray.wiki.common.AppProperties;

/**
 * Flask {@code send_from_directory} + {@code media_webp.maybe_webp_response}。
 * 缺失文件回 HTML 404（API_CONTRACT #13 / R30），不走 JSON 信封。
 */
@Component
public class MediaFiles {

    private static final Set<String> WEBP_EXT = Set.of(".jpg", ".jpeg", ".png");
    private static final DateTimeFormatter HTTP_DATE =
            DateTimeFormatter.RFC_1123_DATE_TIME.withZone(ZoneOffset.UTC);
    private static final Map<String, String> MIME = Map.of(
            ".png", "image/png",
            ".jpg", "image/jpeg",
            ".jpeg", "image/jpeg",
            ".gif", "image/gif",
            ".webp", "image/webp",
            ".mp3", "audio/mpeg",
            ".html", "text/html; charset=utf-8",
            ".js", "application/javascript",
            ".css", "text/css; charset=utf-8",
            ".svg", "image/svg+xml");

    private final Path mediaRoot;

    public MediaFiles(AppProperties props) {
        this.mediaRoot = props.contentRootPath().resolve("media").normalize();
    }

    public void serve(String relative, HttpServletRequest request, HttpServletResponse response) throws IOException {
        if (relative == null || relative.isBlank() || relative.contains("..") || relative.startsWith("/")
                || relative.contains("\\")) {
            htmlNotFound(response);
            return;
        }
        Path src = mediaRoot.resolve(relative).normalize();
        if (!src.startsWith(mediaRoot) || !Files.isRegularFile(src)) {
            htmlNotFound(response);
            return;
        }
        boolean webp = acceptsWebp(request) && WEBP_EXT.contains(ext(relative));
        Path file = src;
        String contentType = mime(relative);
        String cache = "no-cache";
        String vary = null;
        if (webp) {
            Path encoded = WebpCache.convert(mediaRoot, src, relative);
            if (encoded != null) {
                file = encoded;
                contentType = "image/webp";
                cache = "public, max-age=86400";
                vary = "Accept";
            }
        }
        long size = Files.size(file);
        long mtime = Files.getLastModifiedTime(file).toMillis();
        String etag = "\"" + Long.toHexString(size) + "-" + Long.toHexString(mtime) + "\"";
        response.setHeader("Accept-Ranges", "bytes");
        response.setHeader("ETag", etag);
        response.setDateHeader("Last-Modified", mtime);
        response.setHeader("Cache-Control", cache);
        if (vary != null) {
            response.setHeader("Vary", vary);
        }
        String inm = request.getHeader("If-None-Match");
        if (inm != null && etagMatches(inm, etag)) {
            response.setStatus(HttpStatus.NOT_MODIFIED.value());
            return;
        }
        String range = request.getHeader("Range");
        if (range != null && range.startsWith("bytes=")) {
            writeRange(file, size, range.substring("bytes=".length()).strip(), contentType, response);
            return;
        }
        response.setStatus(HttpStatus.OK.value());
        response.setContentType(contentType);
        response.setContentLengthLong(size);
        try (InputStream in = Files.newInputStream(file); OutputStream out = response.getOutputStream()) {
            in.transferTo(out);
        }
    }

    private void writeRange(Path file, long size, String spec, String contentType, HttpServletResponse response)
            throws IOException {
        int dash = spec.indexOf('-');
        if (dash < 0) {
            response.setStatus(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE.value());
            return;
        }
        String startRaw = spec.substring(0, dash).strip();
        String endRaw = spec.substring(dash + 1).strip();
        long start;
        long end;
        try {
            if (startRaw.isEmpty()) {
                long suffix = Long.parseLong(endRaw);
                start = Math.max(0, size - suffix);
                end = size - 1;
            } else {
                start = Long.parseLong(startRaw);
                end = endRaw.isEmpty() ? size - 1 : Long.parseLong(endRaw);
            }
        } catch (NumberFormatException e) {
            response.setStatus(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE.value());
            return;
        }
        if (start < 0 || start >= size || end < start) {
            response.setHeader("Content-Range", "bytes */" + size);
            response.setStatus(HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE.value());
            return;
        }
        end = Math.min(end, size - 1);
        long length = end - start + 1;
        response.setStatus(HttpStatus.PARTIAL_CONTENT.value());
        response.setContentType(contentType);
        response.setHeader("Content-Range", "bytes " + start + "-" + end + "/" + size);
        response.setContentLengthLong(length);
        try (InputStream in = Files.newInputStream(file); OutputStream out = response.getOutputStream()) {
            in.skipNBytes(start);
            in.transferTo(new Bounded(out, length));
        }
    }

    private static boolean acceptsWebp(HttpServletRequest request) {
        String accept = request.getHeader("Accept");
        return accept != null && accept.toLowerCase(Locale.ROOT).contains("image/webp");
    }

    private static boolean etagMatches(String header, String etag) {
        for (String part : header.split(",")) {
            String token = part.strip();
            if (token.startsWith("W/")) {
                token = token.substring(2).strip();
            }
            if (token.equals(etag) || token.equals("*")) {
                return true;
            }
        }
        return false;
    }

    private static String ext(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot).toLowerCase(Locale.ROOT);
    }

    private static String mime(String name) {
        return MIME.getOrDefault(ext(name), "application/octet-stream");
    }

    private static void htmlNotFound(HttpServletResponse response) throws IOException {
        response.setStatus(HttpStatus.NOT_FOUND.value());
        response.setContentType("text/html; charset=utf-8");
        response.getWriter().write("<!doctype html><title>404 Not Found</title><h1>Not Found</h1>");
    }

    private static final class Bounded extends OutputStream {
        private final OutputStream out;
        private long left;

        private Bounded(OutputStream out, long left) {
            this.out = out;
            this.left = left;
        }

        @Override
        public void write(int b) throws IOException {
            if (left <= 0) {
                return;
            }
            out.write(b);
            left--;
        }

        @Override
        public void write(byte[] b, int off, int len) throws IOException {
            if (left <= 0 || len <= 0) {
                return;
            }
            int n = (int) Math.min(len, left);
            out.write(b, off, n);
            left -= n;
        }
    }

    static String httpDate(long millis) {
        return HTTP_DATE.format(Instant.ofEpochMilli(millis));
    }
}
