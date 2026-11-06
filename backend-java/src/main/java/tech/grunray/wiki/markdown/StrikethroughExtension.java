package tech.grunray.wiki.markdown;

import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.vladsch.flexmark.ast.Text;
import com.vladsch.flexmark.html.HtmlRenderer;
import com.vladsch.flexmark.html.renderer.NodeRenderer;
import com.vladsch.flexmark.html.renderer.NodeRenderingHandler;
import com.vladsch.flexmark.parser.InlineParser;
import com.vladsch.flexmark.parser.InlineParserExtension;
import com.vladsch.flexmark.parser.InlineParserExtensionFactory;
import com.vladsch.flexmark.parser.LightInlineParser;
import com.vladsch.flexmark.parser.Parser;
import com.vladsch.flexmark.util.ast.Node;
import com.vladsch.flexmark.util.data.MutableDataHolder;
import com.vladsch.flexmark.util.sequence.BasedSequence;

/**
 * Flask {@code markdown_util.StrikethroughExtension}：正则 {@code ~~([^~\n]+?)~~} → {@code <del>}，
 * 不走 GFM 的定界符规则，内部按纯文本输出。
 */
final class StrikethroughExtension implements Parser.ParserExtension, HtmlRenderer.HtmlRendererExtension {

    private static final Pattern STRIKE = Pattern.compile("~~([^~\\n]+?)~~");

    static StrikethroughExtension create() {
        return new StrikethroughExtension();
    }

    @Override
    public void parserOptions(MutableDataHolder options) {
    }

    @Override
    public void rendererOptions(MutableDataHolder options) {
    }

    @Override
    public void extend(Parser.Builder builder) {
        builder.customInlineParserExtensionFactory(new InlineParserExtensionFactory() {
            @Override
            public CharSequence getCharacters() {
                return "~";
            }

            @Override
            public InlineParserExtension apply(LightInlineParser inlineParser) {
                return new Inline();
            }

            @Override
            public Set<Class<?>> getAfterDependents() {
                return null;
            }

            @Override
            public Set<Class<?>> getBeforeDependents() {
                return null;
            }

            @Override
            public boolean affectsGlobalScope() {
                return false;
            }
        });
    }

    @Override
    public void extend(HtmlRenderer.Builder builder, String rendererType) {
        builder.nodeRendererFactory(options -> (NodeRenderer) () -> Set.of(
                new NodeRenderingHandler<>(Del.class, (node, context, html) -> {
                    html.raw("<del>");
                    context.renderChildren(node);
                    html.raw("</del>");
                })));
    }

    static final class Del extends Node {
        Del(BasedSequence chars) {
            super(chars);
        }

        @Override
        public BasedSequence[] getSegments() {
            return new BasedSequence[] {getChars()};
        }
    }

    private static final class Inline implements InlineParserExtension {
        @Override
        public void finalizeDocument(InlineParser inlineParser) {
        }

        @Override
        public void finalizeBlock(InlineParser inlineParser) {
        }

        @Override
        public boolean parse(LightInlineParser inlineParser) {
            BasedSequence input = inlineParser.getInput();
            int index = inlineParser.getIndex();
            Matcher m = STRIKE.matcher(input);
            m.region(index, input.length());
            if (!m.lookingAt()) {
                return false;
            }
            inlineParser.flushTextNode();
            Del del = new Del(input.subSequence(m.start(), m.end()));
            del.appendChild(new Text(input.subSequence(m.start(1), m.end(1))));
            inlineParser.getBlock().appendChild(del);
            inlineParser.setIndex(m.end());
            return true;
        }
    }
}
