---
title: 异或 Trie 模板：树上最大异或路径
slug: string-xor-trie-tree-path
type: algorithm
tags:
- Trie
- 异或
- 树
summary: xorTrie 模板，解决树上两点路径异或和最大值问题。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2025-07-21T14:00:00'
updated_at: '2025-07-21T14:00:00'
difficulty: medium
series: 字符串算法模板
---

这篇对应 `xorTrie` 结构体。虽然不属于传统“字符串处理”，但本质是二进制字典树模板，常和字符串模板一起维护。

oiwiki 参考 [异或树](https://oi-wiki.org/string/trie/#%E7%BB%B4%E6%8A%A4%E5%BC%82%E6%88%96%E6%9E%81%E5%80%BC) 

## 算法模板

```cpp
struct xorTrie {
    vector<pair<int, long long>> adj[N];
    int cnt = 0, tot = 1, res = 0;
    int dis[N], ch[N << 5][2];

    void insert(int x) {
        for (int i = 30, u = 1; i >= 0; --i) {
            int c = ((x >> i) & 1);
            if (!ch[u][c]) ch[u][c] = ++tot;
            u = ch[u][c];
        }
    }

    int get(int x) { // 返回当前 x 的最大异或值
        int ans = 0;
        for (int i = 30, u = 1; i >= 0; --i) {
            int c = ((x >> i) & 1);
            if (ch[u][c ^ 1]) {
                u = ch[u][c ^ 1];
                ans |= (1 << i);
            } else u = ch[u][c];
        }
        return res = max(res, ans);
    }

    void add(int u, int v, int w) { adj[u].push_back({v, w}); }

    void dfs(int u, int fa) {
        insert(dis[u]);
        get(dis[u]);
        for (auto it : adj[u]) {
            int v = it.first;
            long long w = it.second;
            if (v == fa) continue;
            dis[v] = dis[u] ^ w;
            dfs(v, u);
        }
    }
};
```

## 应用场景

### 1) 树上两点路径最大异或和

这段代码用于树上最大异或路径，核心流程是：`dfs` 维护根到点异或前缀，`insert/get` 在线更新答案。

```cpp
void dfs(int u, int fa) {
    insert(dis[u]);
    get(dis[u]);
    for (auto it : adj[u]) {
        int v = it.first;
        long long w = it.second;
        if (v == fa) continue;
        dis[v] = dis[u] ^ w;
        dfs(v, u);
    }
}
```

- 先 DFS 求每个点到根的异或前缀 `dis[u]`
- 两点路径异或值是 `dis[u] ^ dis[v]`
- 用二进制 Trie 维护已出现的 `dis`，逐个查询最大值

### 2) 数组中的最大异或对

这段代码用于“序列里任意两数最大异或值”问题，直接循环调用 `insert` 和 `get` 即可。

```cpp
void insert(int x) {
    for (int i = 30, u = 1; i >= 0; --i) {
        int c = ((x >> i) & 1);
        if (!ch[u][c]) ch[u][c] = ++tot;
        u = ch[u][c];
    }
}

int get(int x) { // 返回当前 x 的最大异或值
    int ans = 0;
    for (int i = 30, u = 1; i >= 0; --i) {
        int c = ((x >> i) & 1);
        if (ch[u][c ^ 1]) {
            u = ch[u][c ^ 1];
            ans |= (1 << i);
        } else u = ch[u][c];
    }
    return res = max(res, ans);
}
```

- 把 DFS 部分换成遍历数组插入即可
- `get(x)` 查询当前元素与历史元素能形成的最大异或值

## 复杂度

- 插入/查询：O(log V)，`V` 为值域（模板中按 31 位）
- 树场景总体：O(n log V)

