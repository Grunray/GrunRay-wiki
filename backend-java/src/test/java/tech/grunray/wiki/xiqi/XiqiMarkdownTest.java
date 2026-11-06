package tech.grunray.wiki.xiqi;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

class XiqiMarkdownTest {

    @Test
    void fragmentKeepsImagesAndCover() {
        String md = XiqiMarkdown.fragment(
                "frag-contract-db",
                "daily",
                "published",
                "2026-11-06T23:00:00",
                List.of(Map.of("url", "/api/media/files/xiqi/fragments/frag-contract-daily.png", "alt", "图")),
                0,
                "入库碎念 **加粗**");
        assertTrue(md.contains("created_at: '2026-11-06T23:00:00'"));
        assertTrue(md.contains("url: /api/media/files/xiqi/fragments/frag-contract-daily.png"));
        assertTrue(md.contains("cover_index: 0"));
        assertTrue(md.contains("入库碎念 **加粗**"));
    }

    @Test
    void recommendKeepsCategoryRatingAndUrl() {
        String md = XiqiMarkdown.recommend(
                "rec-contract-db",
                "opensource",
                4,
                "入库推荐",
                "published",
                "2026-11-06T23:00:00",
                "https://contract.example.test/oss",
                "",
                List.of(),
                0,
                "开源**项目**");
        assertTrue(md.contains("category: opensource"));
        assertTrue(md.contains("rating: 4"));
        assertTrue(md.contains("status: published"));
        assertTrue(md.contains("url: \"https://contract.example.test/oss\""));
        assertTrue(md.contains("images: []"));
    }

    @Test
    void pageKeepsHero() {
        String md = XiqiMarkdown.page(
                "recommend",
                "/api/media/files/xiqi/pages/recommend/x.png",
                "",
                "published",
                "");
        assertTrue(md.contains("hero_image_url: /api/media/files/xiqi/pages/recommend/x.png"));
        assertTrue(md.contains("hero_image_alt: \n"));
    }

    @Test
    void aboutKeepsProfileFields() {
        Map<String, Object> body = Map.of(
                "alias", "契约站长二",
                "genderAge", "合成 · 21 岁",
                "email", "owner2@contract.example.test",
                "intro", "合成简介",
                "awards", List.of(Map.of("id", "a1", "label", "合成奖", "tier", "gold")),
                "education", Map.of(
                        "schoolPublic", "某校",
                        "schoolRaw", "全名",
                        "degree", "本科",
                        "major", "专业",
                        "period", "2024—2028",
                        "rankRaw", "前 5%"),
                "internship", Map.of(
                        "companyPublic", "某司",
                        "companyRaw", "全名",
                        "role", "实习",
                        "period", "2026",
                        "summaryRaw", "详情"),
                "club", Map.of(
                        "namePublic", "某社",
                        "nameRaw", "全名",
                        "role", "成员",
                        "period", "2024",
                        "summaryRaw", "详情"),
                "certificates", List.of("证书"));
        assertNull(XiqiMarkdown.aboutError(body));
        String md = XiqiMarkdown.aboutMarkdown(body, "published");
        assertTrue(md.contains("alias: 契约站长二"));
        assertTrue(md.contains("gender_age: 合成 · 21 岁"));
        assertTrue(md.contains("email: owner2@contract.example.test"));
        assertTrue(md.contains("intro: 合成简介"));
        assertTrue(md.contains("school_public: 某校"));
        assertTrue(md.contains("  - 证书"));
    }
}
