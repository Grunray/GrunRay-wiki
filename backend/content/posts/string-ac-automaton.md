这篇对应 `AC` 结构体，用于“一个文本匹配多个模式串”。

oiwiki 参考 [AC 自动机](https://oi-wiki.org/string/ac-automaton/)

## 算法模板

```cpp
struct AC {
    int tr[N][26], tot;
    int e[N], fail[N];

    void insert(string s) {
        int u = 0;
        for (int i = 0; i < (int)s.length(); i++) {
            if (!tr[u][s[i] - 'a']) tr[u][s[i] - 'a'] = ++tot;
            u = tr[u][s[i] - 'a'];
        }
        e[u]++;
    }

    void build() {
        queue<int> q;
        for (int i = 0; i < 26; i++) if (tr[0][i]) q.push(tr[0][i]);
        while (!q.empty()) {
            int u = q.front(); q.pop();
            for (int i = 0; i < 26; i++) {
                if (tr[u][i]) {
                    fail[tr[u][i]] = tr[fail[u]][i];
                    q.push(tr[u][i]);
                } else {
                    tr[u][i] = tr[fail[u]][i];
                }
            }
        }
    }

    int query(string s) {
        int u = 0, res = 0;
        for (int i = 0; i < (int)s.length(); i++) {
            u = tr[u][s[i] - 'a'];
            for (int j = u; j && e[j] != -1; j = fail[j]) {
                res += e[j];
                e[j] = -1;
            }
        }
        return res;
    }
};
```

## 应用场景

### 应用 1：构建多模式匹配自动机

这段代码用于先把所有模式串插入 Trie，再通过 `build` 构建 fail 指针与自动机转移。

```cpp
void insert(string s) {
    int u = 0;
    for (int i = 0; i < (int)s.length(); i++) {
        if (!tr[u][s[i] - 'a']) tr[u][s[i] - 'a'] = ++tot;
        u = tr[u][s[i] - 'a'];
    }
    e[u]++;
}

void build() {
    queue<int> q;
    for (int i = 0; i < 26; i++) if (tr[0][i]) q.push(tr[0][i]);
    while (!q.empty()) {
        int u = q.front(); q.pop();
        for (int i = 0; i < 26; i++) {
            if (tr[u][i]) {
                fail[tr[u][i]] = tr[fail[u]][i];
                q.push(tr[u][i]);
            } else {
                tr[u][i] = tr[fail[u]][i];
            }
        }
    }
}
```

- 多关键字过滤
- 文本中出现了多少个模式串（可去重计数）
- 病毒串匹配、敏感词匹配

### 应用 2：文本扫描统计命中

这段代码用于在文本上跑自动机并沿 fail 链回溯统计命中次数。

```cpp
int query(string s) {
    int u = 0, res = 0;
    for (int i = 0; i < (int)s.length(); i++) {
        u = tr[u][s[i] - 'a'];
        for (int j = u; j && e[j] != -1; j = fail[j]) {
            res += e[j];
            e[j] = -1;
        }
    }
    return res;
}
```

## 使用注意

- 当前 `query` 里会把命中节点 `e[j]` 置为 `-1`，用于“每个模式最多计一次”
- 若题目要求“可重复命中”，要改统计方式（比如额外计数数组，不直接覆写 `e`）