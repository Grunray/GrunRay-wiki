package tech.grunray.wiki.markdown;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;

import org.junit.jupiter.api.Assumptions;
import org.junit.jupiter.api.Test;

import tech.grunray.wiki.common.ContentFiles;

/**
 * 用 Python-Markdown 生成的 body_html 快照验收 {@link MarkdownRenderer}（DOM 等价）。
 * 金样在 {@code src/test/resources/markdown/cases}；整站文章快照由
 * {@code tools/contract/md_snapshots.py} 生成，经 {@code -Dmd.snapshot.dir=…} 传入。
 */
class MarkdownSnapshotTest {

    private final MarkdownRenderer renderer = new MarkdownRenderer();

    @Test
    void committedCases() throws Exception {
        Path dir = Path.of(MarkdownSnapshotTest.class.getResource("/markdown/cases").toURI());
        assertMatches(dir, 5);
    }

    @Test
    void externalSnapshots() throws Exception {
        String prop = System.getProperty("md.snapshot.dir", "");
        Assumptions.assumeTrue(!prop.isBlank(), "未指定 -Dmd.snapshot.dir，跳过整站快照");
        assertMatches(Path.of(prop), 1);
    }

    private static Map<String, String> knownDifferences() throws IOException, URISyntaxException {
        Path file = Path.of(MarkdownSnapshotTest.class.getResource("/markdown/known-differences.txt").toURI());
        Map<String, String> out = new LinkedHashMap<>();
        for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
            if (line.isBlank() || line.startsWith("#")) {
                continue;
            }
            String[] parts = line.split("\t", 2);
            out.put(parts[0], parts.length > 1 ? parts[1] : "");
        }
        return out;
    }

    private void assertMatches(Path dir, int minCases) throws IOException, URISyntaxException {
        List<Path> sources;
        try (Stream<Path> s = Files.list(dir)) {
            sources = s.filter(p -> p.getFileName().toString().endsWith(".md")).sorted().toList();
        }
        assertThat(sources).hasSizeGreaterThanOrEqualTo(minCases);
        Map<String, String> known = knownDifferences();
        List<String> failures = new ArrayList<>();
        List<String> expectedDiffs = new ArrayList<>();
        int exact = 0;
        for (Path md : sources) {
            Path htmlPath = md.resolveSibling(md.getFileName().toString().replaceAll("\\.md$", ".html"));
            String expected = ContentFiles.universalNewlines(Files.readString(htmlPath, StandardCharsets.UTF_8));
            String source = ContentFiles.universalNewlines(Files.readString(md, StandardCharsets.UTF_8));
            String actual = renderer.render(source);
            Path actualOut = Path.of("target", "markdown-actual", dir.getFileName().toString(),
                    htmlPath.getFileName().toString());
            Files.createDirectories(actualOut.getParent());
            Files.writeString(actualOut, actual, StandardCharsets.UTF_8);
            if (actual.equals(expected)) {
                exact++;
                continue;
            }
            String e = HtmlDom.canonical(expected);
            String a = HtmlDom.canonical(actual);
            if (!e.equals(a)) {
                String name = md.getFileName().toString();
                String entry = name + " " + HtmlDom.firstDifference(e, a);
                if (known.containsKey(name)) {
                    expectedDiffs.add(entry + "\n  原因: " + known.get(name));
                } else {
                    failures.add(entry);
                }
            }
        }
        String summary = String.format("[markdown] %s: %d 份，逐字节一致 %d，DOM 不一致 %d，已登记的预期差异 %d%n",
                dir.getFileName(), sources.size(), exact, failures.size(), expectedDiffs.size());
        System.out.print(summary);
        Path report = Path.of("target", "markdown-" + dir.getFileName() + ".txt");
        Files.createDirectories(report.getParent());
        Files.writeString(report, summary + String.join("\n\n", failures)
                + "\n\n--- 预期差异 ---\n" + String.join("\n\n", expectedDiffs) + "\n", StandardCharsets.UTF_8);
        assertThat(failures).as("DOM 不一致，详见 " + report.toAbsolutePath()).isEmpty();
    }
}
