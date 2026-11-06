package tech.grunray.wiki.post;

import java.time.LocalDateTime;

/** {@code post} 表一行，列与 Flask {@code read_api} 的 SELECT 一致。 */
public record PostRow(
        long id,
        String legacyId,
        String slug,
        String title,
        String mdUrl,
        String summary,
        String keywords,
        int categoryId,
        int type,
        int views,
        LocalDateTime updatedAt,
        LocalDateTime publishedAt,
        String locale,
        boolean pinned,
        int pinnedOrder,
        String cover,
        String extra) {
}
