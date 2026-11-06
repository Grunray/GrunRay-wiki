package tech.grunray.wiki.markdown.highlight;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.IdentityHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Pygments {@code RegexLexer.get_tokens_unprocessed} 的移植。规则表由
 * {@code tools/contract/dump_pygments_lexers.py} 从 Pygments 运行时导出，这里只实现执行语义：
 * 按当前状态顺序试规则、{@code bygroups} / {@code using(this)}、状态栈转移、行尾无匹配时重置到 root。
 */
public final class RegexLexer {

    public record TokenType(String name, String css) {
    }

    public record Token(TokenType type, String value) {
    }

    sealed interface Action permits TokenAction, GroupsAction {
    }

    record TokenAction(TokenType type) implements Action {
    }

    /** 元素为 {@link TokenType}、{@link Using} 或 {@code null}（跳过该组）。 */
    record GroupsAction(List<Object> items) implements Action {
    }

    record Using(List<String> stack) {
    }

    /** {@code pop > 0}：出栈（至少留一层）；否则依次处理 {@code push}（可含 #pop / #push）。 */
    record Transition(int pop, List<String> push) {
    }

    record Rule(Pattern pattern, Action action, Transition next) {
    }

    record Postprocess(String fromName, TokenType to, Set<String> values) {
    }

    static final TokenType WHITESPACE = new TokenType("Token.Text.Whitespace", "w");
    static final TokenType ERROR = new TokenType("Token.Error", "err");

    private final String name;
    private final List<String> aliases;
    private final Map<String, List<Rule>> states;
    private final Postprocess postprocess;

    RegexLexer(String name, List<String> aliases, Map<String, List<Rule>> states, Postprocess postprocess) {
        this.name = name;
        this.aliases = aliases;
        this.states = states;
        this.postprocess = postprocess;
    }

    public String name() {
        return name;
    }

    public List<String> aliases() {
        return aliases;
    }

    /** 已做过 {@code Lexer._preprocess_lexer_input} 的文本。 */
    public List<Token> tokens(String text) {
        List<Token> out = new ArrayList<>();
        run(text, List.of("root"), out);
        if (postprocess == null) {
            return out;
        }
        List<Token> mapped = new ArrayList<>(out.size());
        for (Token t : out) {
            if (t.type().name().equals(postprocess.fromName()) && postprocess.values().contains(t.value())) {
                mapped.add(new Token(postprocess.to(), t.value()));
            } else {
                mapped.add(t);
            }
        }
        return mapped;
    }

    private void run(String text, List<String> initialStack, List<Token> out) {
        Map<Pattern, Matcher> matchers = new IdentityHashMap<>();
        List<String> stack = new ArrayList<>(initialStack);
        List<Rule> rules = state(stack.get(stack.size() - 1));
        int pos = 0;
        int len = text.length();
        while (true) {
            boolean matched = false;
            for (Rule rule : rules) {
                Matcher m = matchers.computeIfAbsent(rule.pattern(), p -> p.matcher(text)
                        .useTransparentBounds(true)
                        .useAnchoringBounds(false));
                m.region(pos, len);
                if (!m.lookingAt()) {
                    continue;
                }
                apply(rule.action(), m, out);
                pos = m.end();
                if (rule.next() != null) {
                    transition(stack, rule.next());
                    rules = state(stack.get(stack.size() - 1));
                }
                matched = true;
                break;
            }
            if (matched) {
                continue;
            }
            if (pos >= len) {
                return;
            }
            if (text.charAt(pos) == '\n') {
                stack.clear();
                stack.add("root");
                rules = state("root");
                out.add(new Token(WHITESPACE, "\n"));
                pos++;
                continue;
            }
            int cp = text.codePointAt(pos);
            int width = Character.charCount(cp);
            out.add(new Token(ERROR, text.substring(pos, pos + width)));
            pos += width;
        }
    }

    private void apply(Action action, Matcher m, List<Token> out) {
        if (action == null) {
            return;
        }
        if (action instanceof TokenAction ta) {
            out.add(new Token(ta.type(), m.group()));
            return;
        }
        List<Object> items = ((GroupsAction) action).items();
        for (int i = 0; i < items.size(); i++) {
            Object item = items.get(i);
            if (item == null) {
                continue;
            }
            String data = m.group(i + 1);
            if (item instanceof TokenType type) {
                if (data != null && !data.isEmpty()) {
                    out.add(new Token(type, data));
                }
            } else if (item instanceof Using using && data != null) {
                run(data, using.stack(), out);
            }
        }
    }

    private static void transition(List<String> stack, Transition t) {
        if (t.pop() > 0) {
            if (t.pop() >= stack.size()) {
                stack.subList(1, stack.size()).clear();
            } else {
                stack.subList(stack.size() - t.pop(), stack.size()).clear();
            }
            return;
        }
        for (String s : t.push()) {
            switch (s) {
                case "#pop" -> {
                    if (stack.size() > 1) {
                        stack.remove(stack.size() - 1);
                    }
                }
                case "#push" -> stack.add(stack.get(stack.size() - 1));
                default -> stack.add(s);
            }
        }
    }

    private List<Rule> state(String name) {
        List<Rule> rules = states.get(name);
        if (rules == null) {
            throw new IllegalStateException("unknown lexer state " + name + " in " + this.name);
        }
        return rules;
    }

    static Map<String, List<Rule>> newStates() {
        return new HashMap<>();
    }
}
