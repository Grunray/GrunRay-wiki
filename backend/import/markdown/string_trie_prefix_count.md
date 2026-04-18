---
title: Trie 字典树模板：插入、词链与前缀统计
slug: string-trie-prefix-count
type: algorithm
tags:
- 字符串
- Trie
- 前缀统计
summary: Trie 模板，包含常规插入查询、词链统计和前缀计数应用。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2025-07-21T14:00:00'
updated_at: '2025-07-21T14:00:00'
difficulty: medium
series: 字符串算法模板
---

这篇对应 `Trie` 结构体，字符集支持 `A-Z / a-z / 0-9`，用于字符串集合查询与统计。

oiwiki 参考 [字典树 (Trie)](https://oi-wiki.org/string/trie/) 

## 算法模板

```cpp
struct Trie {
    int nex[N][65], cnt;
    int exist[N];  // 该结点结尾的[词]出现次数是多少
    int done[N];   // 记录是否为一个[词]
    long long compareCnt = 0;

    void init() {
        for (int i = 0; i <= cnt; i++) for (int j = 0; j < 65; j++) nex[i][j] = 0;
        for (int i = 0; i <= cnt; i++) exist[i] = 0;
        for (int i = 0; i <= cnt; i++) done[i] = 0;
        cnt = 1;
        compareCnt = 0;
    }

    int getAscii(char ch) { // A-Z a-z 0-9
        if (isupper(ch)) return int(ch - 'A');
        if (islower(ch)) return int(ch - 'a' + 26);
        if (isdigit(ch)) return int(ch - '0' + 52);
        return 0;
    }

    void insert(string s) {
        int p = 0, len = s.length();
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) nex[p][c] = ++cnt;
            p = nex[p][c];
            ++exist[p];
        }
        done[p]++;
    }

    void insert_whenCount(string s) { // 字典树上计数问题
        int p = 0, len = s.length();
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) {
                ++cnt;
                memset(nex[cnt], 0, sizeof nex[cnt]);
                nex[p][c] = cnt;
                compareCnt += exist[p] * (i * 2 + 1);
            } else {
                compareCnt += (exist[p] - exist[nex[p][c]]) * (i * 2 + 1);
            }
            ++exist[p];
            p = nex[p][c];
        }
        compareCnt += done[p] * 2 * (len + 1);
        compareCnt += (exist[p] - done[p]) * (len * 2 + 1);
        ++exist[p];
        done[p]++;
    }

    long long getCompareCnt() { return compareCnt; }

    int find(string s) {
        int p = 0, len = s.length();
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) return 0;
            p = nex[p][c];
        }
        if (done[p]) return exist[p];
        return 0;
    }

    // 例：i -> int -> intern -> internet，返回 4
    int findWordChains(string s) {
        int p = 0, len = s.length(), ans = 0;
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) return 0;
            p = nex[p][c];
            if (done[p]) ans++;
        }
        if (done[p]) return ans;
        return 0;
    }

    // 查找与 s 拥有相同前缀的词数量
    int findMaxPrefix(string s) {
        int p = 0, len = s.length(), res = 0;
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) return res;
            p = nex[p][c];
            res += done[p];
        }
        return res + exist[p] - done[p];
    }

    int countNode(int node) {
        int cnt = 0;
        for (int i = 0; i < 65; i++) if (nex[node][i]) cnt++;
        return cnt;
    }
};
```

## 典型应用

### 1) 查询单词是否存在与出现次数

这段代码用于维护词典并查询某个完整单词是否出现，主要对应 `insert` 和 `find`。

```cpp
void insert(string s) {
    int p = 0, len = s.length();
    for (int i = 0; i < len; i++) {
        int c = getAscii(s[i]);
        if (!nex[p][c]) nex[p][c] = ++cnt;
        p = nex[p][c];
        ++exist[p];
    }
    done[p]++;
}

int find(string s) {
    int p = 0, len = s.length();
    for (int i = 0; i < len; i++) {
        int c = getAscii(s[i]);
        if (!nex[p][c]) return 0;
        p = nex[p][c];
    }
    if (done[p]) return exist[p];
    return 0;
}
```

- 用 `insert` 建树
- 用 `find` 判断词是否存在，返回该词频次

### 2) 词链统计（前缀逐步成词）

这段代码用于统计沿着同一路径逐步成词的数量，比如 `i -> int -> intern -> internet`。

```cpp
int findWordChains(string s) {
    int p = 0, len = s.length(), ans = 0;
    for (int i = 0; i < len; i++) {
        int c = getAscii(s[i]);
        if (!nex[p][c]) return 0;
        p = nex[p][c];
        if (done[p]) ans++;
    }
    if (done[p]) return ans;
    return 0;
}
```

- `findWordChains("internet")` 可统计 `i/int/intern/internet` 这种链
- 适合“词根词缀层级”类题目

### 3) 相同前缀词计数

这段代码用于统计字典树中和目标串共享前缀关系的词数量，对应 `findMaxPrefix`。

```cpp
int findMaxPrefix(string s) {
    int p = 0, len = s.length(), res = 0;
    for (int i = 0; i < len; i++) {
        int c = getAscii(s[i]);
        if (!nex[p][c]) return res;
        p = nex[p][c];
        res += done[p];
    }
    return res + exist[p] - done[p];
}
```

- `findMaxPrefix(s)` 能统计与 `s` 共前缀的词数量
- 常用于自动补全、前缀频次查询

### 4) 比较次数/代价统计

这段代码用于“插入过程比较代价”类题目，核心是 `insert_whenCount` 与 `getCompareCnt`。

```cpp
void insert_whenCount(string s) {
    int p = 0, len = s.length();
    for (int i = 0; i < len; i++) {
        int c = getAscii(s[i]);
        if (!nex[p][c]) {
            ++cnt;
            memset(nex[cnt], 0, sizeof nex[cnt]);
            nex[p][c] = cnt;
            compareCnt += exist[p] * (i * 2 + 1);
        } else {
            compareCnt += (exist[p] - exist[nex[p][c]]) * (i * 2 + 1);
        }
        ++exist[p];
        p = nex[p][c];
    }
    compareCnt += done[p] * 2 * (len + 1);
    compareCnt += (exist[p] - done[p]) * (len * 2 + 1);
    ++exist[p];
    done[p]++;
}
```

- `insert_whenCount` + `getCompareCnt` 是你模板里给的扩展统计逻辑
- 适合“批量插入时累计比较代价”这类变种题

