package tech.grunray.wiki.common;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.ByteBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;

import org.springframework.stereotype.Component;

/** 读 {@code CONTENT_ROOT} 下的文件，规则同 Flask {@code app/serialize.py#_read_markdown}。 */
@Component
public class ContentFiles {

    private final Path root;

    public ContentFiles(AppProperties props) {
        this.root = props.contentRootPath();
    }

    /**
     * 越出内容根或不是文件时返回 {@code ""}。按 UTF-8 严格解码（非法字节抛异常，Flask 同样 500），
     * 并做 Python 通用换行：{@code \r\n} 与 {@code \r} 统一成 {@code \n}。
     */
    public String readMarkdown(String relative) {
        Path path;
        try {
            path = root.resolve(relative == null ? "" : relative).normalize();
        } catch (InvalidPathException e) {
            return "";
        }
        if (!Files.isRegularFile(path)) {
            return "";
        }
        try {
            Path real = path.toRealPath();
            Path realRoot = root.toRealPath();
            // Flask 用字符串前缀判断，这里保持一致
            if (!real.toString().startsWith(realRoot.toString())) {
                return "";
            }
            return universalNewlines(decodeUtf8Strict(Files.readAllBytes(real)));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    public static String universalNewlines(String s) {
        return s.replace("\r\n", "\n").replace('\r', '\n');
    }

    private static String decodeUtf8Strict(byte[] bytes) throws CharacterCodingException {
        return StandardCharsets.UTF_8.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT)
                .decode(ByteBuffer.wrap(bytes))
                .toString();
    }
}
