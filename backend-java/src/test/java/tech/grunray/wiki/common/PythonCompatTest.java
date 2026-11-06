package tech.grunray.wiki.common;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigInteger;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.ObjectMapper;

class PythonCompatTest {

    @Test
    void parseIntFollowsPythonInt() {
        assertThat(PythonCompat.parseInt("12")).contains(BigInteger.valueOf(12));
        assertThat(PythonCompat.parseInt(" +7 ")).contains(BigInteger.valueOf(7));
        assertThat(PythonCompat.parseInt("-3")).contains(BigInteger.valueOf(-3));
        assertThat(PythonCompat.parseInt("1_000")).contains(BigInteger.valueOf(1000));
        assertThat(PythonCompat.parseInt("١٢")).contains(BigInteger.valueOf(12));
        assertThat(PythonCompat.parseInt("99999999999999999999")).contains(new BigInteger("99999999999999999999"));
        assertThat(PythonCompat.parseInt("abc")).isEmpty();
        assertThat(PythonCompat.parseInt("1.5")).isEmpty();
        assertThat(PythonCompat.parseInt("_1")).isEmpty();
        assertThat(PythonCompat.parseInt("1__0")).isEmpty();
        assertThat(PythonCompat.parseInt("+")).isEmpty();
    }

    @Test
    void strFollowsPythonStr() throws Exception {
        ObjectMapper m = new ObjectMapper();
        assertThat(PythonCompat.str(m.readTree("\"契约\""))).isEqualTo("契约");
        assertThat(PythonCompat.str(m.readTree("3"))).isEqualTo("3");
        assertThat(PythonCompat.str(m.readTree("1.5"))).isEqualTo("1.5");
        assertThat(PythonCompat.str(m.readTree("2.0"))).isEqualTo("2.0");
        assertThat(PythonCompat.str(m.readTree("true"))).isEqualTo("True");
        assertThat(PythonCompat.str(m.readTree("null"))).isEqualTo("None");
        assertThat(PythonCompat.str(m.readTree("[\"a\", 1]"))).isEqualTo("['a', 1]");
        assertThat(PythonCompat.str(m.readTree("{\"k\": \"it's\"}"))).isEqualTo("{'k': \"it's\"}");
    }

    @Test
    void stripUsesPythonWhitespace() {
        assertThat(PythonCompat.lstrip("\u00a0\u3000 x ")).isEqualTo("x ");
        assertThat(PythonCompat.strip("\u00a0 x \u3000")).isEqualTo("x");
    }
}
