package tech.grunray.wiki.post;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import tech.grunray.wiki.common.ContentFiles;
import tech.grunray.wiki.markdown.MarkdownRenderer;

@WebMvcTest(PostController.class)
@Import(PostJson.class)
@TestPropertySource(properties = {"grunray.content-root=.", "grunray.cors-origins=http://localhost:5173"})
class PostControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private PostRepository repo;

    @MockitoBean
    private ContentFiles files;

    @MockitoBean
    private MarkdownRenderer markdown;

    @Test
    void invalidCategoryIdUsesEnvelopeA() throws Exception {
        mockMvc.perform(get("/api/posts").param("category_id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(content().json("{\"code\":1,\"data\":[],\"message\":\"invalid category_id\"}", true));
    }

    @Test
    void missingSlugIsNotFoundObject() throws Exception {
        when(repo.findBySlug("nope")).thenReturn(Optional.empty());
        mockMvc.perform(get("/api/posts/nope"))
                .andExpect(status().isNotFound())
                .andExpect(content().json("{\"error\":\"not_found\"}", true));
    }

    @Test
    void unknownTypeReturnsEmptyList() throws Exception {
        when(repo.findAll()).thenReturn(List.of());
        mockMvc.perform(get("/api/posts").param("type", "bogus"))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"posts\":[]}", true));
    }
}
