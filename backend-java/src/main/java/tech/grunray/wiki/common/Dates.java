package tech.grunray.wiki.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

/** Flask 把库内无时区时间按字面输出，不做换算。 */
public final class Dates {

    private static final DateTimeFormatter SQL_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final DateTimeFormatter ISO_SECONDS = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss");
    private static final DateTimeFormatter RFC_1123 =
            DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.ENGLISH);

    private Dates() {
    }

    /** Python {@code str(datetime)}，秒精度。空为 {@code ""}。 */
    public static String sql(LocalDateTime value) {
        return value == null ? "" : SQL_SECONDS.format(value);
    }

    /** Python {@code datetime.isoformat()}，秒精度、无时区。空为 {@code null}。 */
    public static String isoLocal(LocalDateTime value) {
        return value == null ? null : ISO_SECONDS.format(value);
    }

    public static String isoDate(LocalDate value) {
        return value == null ? null : value.toString();
    }

    /** RSS {@code email.utils.format_datetime(..., usegmt=True)}，naive 时间当 UTC。 */
    public static String rfc1123Utc(LocalDateTime value) {
        if (value == null) {
            return "";
        }
        return RFC_1123.format(value.atOffset(ZoneOffset.UTC));
    }
}
