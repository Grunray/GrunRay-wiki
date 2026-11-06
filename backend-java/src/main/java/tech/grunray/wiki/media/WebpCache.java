package tech.grunray.wiki.media;

import java.awt.image.BufferedImage;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Iterator;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;

/** Pillow {@code WEBP quality=82} 的近似。失败时返回 null，调用方回原图。 */
final class WebpCache {

    private WebpCache() {
    }

    static Path convert(Path mediaRoot, Path src, String relative) {
        Path cache = mediaRoot.resolve(".webp_cache").resolve(relative + ".webp");
        try {
            if (Files.isRegularFile(cache)
                    && Files.getLastModifiedTime(cache).toMillis() >= Files.getLastModifiedTime(src).toMillis()) {
                return cache;
            }
            BufferedImage image = ImageIO.read(src.toFile());
            if (image == null) {
                return null;
            }
            Iterator<ImageWriter> writers = ImageIO.getImageWritersByMIMEType("image/webp");
            if (!writers.hasNext()) {
                writers = ImageIO.getImageWritersByFormatName("webp");
            }
            if (!writers.hasNext()) {
                return null;
            }
            Files.createDirectories(cache.getParent());
            ImageWriter writer = writers.next();
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                String[] types = param.getCompressionTypes();
                if (types != null && types.length > 0) {
                    param.setCompressionType(types[0]);
                }
                param.setCompressionQuality(0.82f);
            }
            try (ImageOutputStream out = ImageIO.createImageOutputStream(cache.toFile())) {
                writer.setOutput(out);
                writer.write(null, new IIOImage(image, null, null), param);
            } finally {
                writer.dispose();
            }
            return Files.isRegularFile(cache) ? cache : null;
        } catch (RuntimeException | IOException e) {
            return null;
        }
    }
}
