package tech.grunray.wiki.ops;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

class KeywordCorpusTest {

    @Test
    void jiebaSnapshotMatchesCorpus() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        JsonNode corpus = mapper.readTree(Files.readString(Path.of("src/test/resources/keywords/corpus.json")));
        JsonNode jieba = mapper.readTree(Files.readString(Path.of("src/test/resources/keywords/jieba.json")));
        assertEquals(4, corpus.size());
        assertEquals(corpus.size(), jieba.size());
        for (int i = 0; i < corpus.size(); i++) {
            assertEquals(corpus.get(i).get("id").asText(), jieba.get(i).get("id").asText());
            assertEquals(8, jieba.get(i).get("keywords").size());
        }
    }
}
