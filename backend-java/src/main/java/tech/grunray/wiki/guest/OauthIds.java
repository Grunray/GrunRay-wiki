package tech.grunray.wiki.guest;

import java.security.SecureRandom;
import java.util.Base64;

final class OauthIds {
    private static final SecureRandom RANDOM = new SecureRandom();

    private OauthIds() {
    }

    static String random() {
        byte[] buf = new byte[16];
        RANDOM.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }
}
