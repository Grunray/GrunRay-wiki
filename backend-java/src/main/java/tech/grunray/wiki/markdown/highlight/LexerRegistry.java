package tech.grunray.wiki.markdown.highlight;

import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.regex.Pattern;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** 加载 {@code highlight/pygments-lexers.json}，按别名（不区分大小写）查词法器。 */
public final class LexerRegistry {

    public static final String RESOURCE = "/highlight/pygments-lexers.json";

    private final Map<String, RegexLexer> byAlias;
    private final String pygmentsVersion;

    private LexerRegistry(Map<String, RegexLexer> byAlias, String pygmentsVersion) {
        this.byAlias = byAlias;
        this.pygmentsVersion = pygmentsVersion;
    }

    public static LexerRegistry loadDefault() {
        try (InputStream in = LexerRegistry.class.getResourceAsStream(RESOURCE)) {
            if (in == null) {
                throw new IllegalStateException("missing resource " + RESOURCE);
            }
            return load(new ObjectMapper().readTree(in));
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static LexerRegistry load(JsonNode root) {
        List<Pattern> patterns = new ArrayList<>();
        for (JsonNode p : root.get("patterns")) {
            int flags = Pattern.UNIX_LINES | Pattern.UNICODE_CHARACTER_CLASS;
            if (p.get("m").asBoolean()) {
                flags |= Pattern.MULTILINE;
            }
            if (p.get("s").asBoolean()) {
                flags |= Pattern.DOTALL;
            }
            if (p.get("i").asBoolean()) {
                flags |= Pattern.CASE_INSENSITIVE;
            }
            Pattern compiled = Pattern.compile(p.get("regex").asText(), flags);
            if (compiled.matcher("").groupCount() != p.get("groups").asInt()) {
                throw new IllegalStateException("group count mismatch: " + p.get("regex").asText());
            }
            patterns.add(compiled);
        }

        Map<String, RegexLexer.TokenType> types = new HashMap<>();
        Map<String, RegexLexer> byAlias = new LinkedHashMap<>();
        root.get("lexers").fields().forEachRemaining(entry -> {
            JsonNode lx = entry.getValue();
            Map<String, List<RegexLexer.Rule>> states = RegexLexer.newStates();
            lx.get("states").fields().forEachRemaining(st -> {
                List<RegexLexer.Rule> rules = new ArrayList<>();
                for (JsonNode r : st.getValue()) {
                    rules.add(new RegexLexer.Rule(
                            patterns.get(r.get("pattern").asInt()),
                            action(r.get("action"), types),
                            transition(r.get("next"))));
                }
                states.put(st.getKey(), List.copyOf(rules));
            });
            RegexLexer.Postprocess post = null;
            JsonNode pp = lx.get("postprocess");
            if (pp != null) {
                HashSet<String> values = new HashSet<>();
                pp.get("values").forEach(v -> values.add(v.asText()));
                post = new RegexLexer.Postprocess(pp.get("from").asText(), type(pp.get("to"), types), values);
            }
            List<String> aliases = new ArrayList<>();
            lx.get("aliases").forEach(a -> aliases.add(a.asText()));
            RegexLexer lexer = new RegexLexer(lx.get("name").asText(), List.copyOf(aliases), states, post);
            for (String alias : aliases) {
                byAlias.put(alias.toLowerCase(Locale.ROOT), lexer);
            }
        });
        return new LexerRegistry(byAlias, root.path("pygments").asText());
    }

    /** Pygments {@code get_lexer_by_name}：别名小写匹配；找不到返回 empty（调用方回退 text）。 */
    public Optional<RegexLexer> byAlias(String alias) {
        if (alias == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(byAlias.get(alias.toLowerCase(Locale.ROOT)));
    }

    public String pygmentsVersion() {
        return pygmentsVersion;
    }

    private static RegexLexer.Action action(JsonNode node, Map<String, RegexLexer.TokenType> types) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.has("token")) {
            return new RegexLexer.TokenAction(type(node.get("token"), types));
        }
        List<Object> items = new ArrayList<>();
        for (JsonNode g : node.get("bygroups")) {
            if (g.isNull()) {
                items.add(null);
            } else if (g.has("token")) {
                items.add(type(g.get("token"), types));
            } else {
                List<String> stack = new ArrayList<>();
                g.get("using").forEach(s -> stack.add(s.asText()));
                items.add(new RegexLexer.Using(List.copyOf(stack)));
            }
        }
        return new RegexLexer.GroupsAction(items);
    }

    private static RegexLexer.Transition transition(JsonNode node) {
        if (node == null || node.isNull()) {
            return null;
        }
        if (node.has("pop")) {
            return new RegexLexer.Transition(node.get("pop").asInt(), List.of());
        }
        List<String> push = new ArrayList<>();
        node.get("push").forEach(s -> push.add(s.asText()));
        return new RegexLexer.Transition(0, List.copyOf(push));
    }

    private static RegexLexer.TokenType type(JsonNode node, Map<String, RegexLexer.TokenType> types) {
        String name = node.get("name").asText();
        return types.computeIfAbsent(name, n -> new RegexLexer.TokenType(n, node.get("css").asText()));
    }
}
