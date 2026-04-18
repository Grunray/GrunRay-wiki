这篇对应 `SAM` 结构体，当前模板重点是“建图骨架 + 拓扑序”。

参考资料预留：[后缀自动机 (SAM)](https://oi-wiki.org/string/sam/)

## 算法模板

```cpp
struct SAM {
    int ch[M][30], mxlen[M], par[M], tp[M];
    int End, tot;
    int siz[M];

    int newnod() {
        tot++;
        mxlen[tot] = par[tot] = 0;
        memset(ch[tot], 0, sizeof(ch[tot]));
        siz[tot] = 0;
        return tot;
    }

    void clear() { // 1 为 root
        tot = 0;
        End = newnod();
    }

    void extend(int c) {
        int p = End; End = newnod();
        mxlen[End] = mxlen[p] + 1;
        siz[End] = 1;
        for (; p && !ch[p][c]; p = par[p]) ch[p][c] = End;
        if (!p) par[End] = 1;
        else {
            int q = ch[p][c];
            if (mxlen[p] + 1 == mxlen[q]) par[End] = q;
            else {
                int nq = newnod();
                mxlen[nq] = mxlen[p] + 1;
                memcpy(ch[nq], ch[q], sizeof(ch[q]));
                par[nq] = par[q], par[End] = par[q] = nq;
                for (; ch[p][c] == q; p = par[p]) ch[p][c] = nq;
            }
        }
    }

    void build() { // 按 mxlen 计数排序得到逆拓扑
        static int cnt[M];
        for (int i = 0; i <= tot + 1; i++) cnt[i] = 0;
        for (int i = 1; i <= tot + 1; i++) cnt[mxlen[i]]++;
        for (int i = 1; i <= tot + 1; i++) cnt[i] += cnt[i - 1];
        for (int i = tot; i >= 1; i--) tp[cnt[mxlen[i]]--] = i;
    }
};
```

## 应用整理

### 1) 不同子串个数

这段代码用于先完成 SAM 建图，再通过状态区间贡献计算不同子串总数。建图核心在 `extend`。

```cpp
void extend(int c) {
    int p = End; End = newnod();
    mxlen[End] = mxlen[p] + 1;
    siz[End] = 1;
    for (; p && !ch[p][c]; p = par[p]) ch[p][c] = End;
    if (!p) par[End] = 1;
    else {
        int q = ch[p][c];
        if (mxlen[p] + 1 == mxlen[q]) par[End] = q;
        else {
            int nq = newnod();
            mxlen[nq] = mxlen[p] + 1;
            memcpy(ch[nq], ch[q], sizeof(ch[q]));
            par[nq] = par[q], par[End] = par[q] = nq;
            for (; ch[p][c] == q; p = par[p]) ch[p][c] = nq;
        }
    }
}
```

- 建完 SAM 后，答案常用公式是：
- `sum(mxlen[v] - mxlen[par[v]])`

### 2) 子串出现次数统计

这段代码用于把状态按 `mxlen` 排序得到逆拓扑，随后可做 `siz` 从长到短汇总。

```cpp
void build() { // 按 mxlen 计数排序得到逆拓扑
    static int cnt[M];
    for (int i = 0; i <= tot + 1; i++) cnt[i] = 0;
    for (int i = 1; i <= tot + 1; i++) cnt[mxlen[i]]++;
    for (int i = 1; i <= tot + 1; i++) cnt[i] += cnt[i - 1];
    for (int i = tot; i >= 1; i--) tp[cnt[mxlen[i]]--] = i;
}
```

- 在 `extend` 时对 `siz[End] = 1`
- 再按 `build` 得到的逆拓扑把 `siz` 向父节点累加

### 3) 最长公共子串（双串/多串变种）

这段思路用于“一个串建 SAM，另一个串在自动机上匹配”的最长公共子串模型，依赖 `ch` 转移与 `par` 回退。

- 用一个串建 SAM
- 另一个串在自动机上跑匹配并维护当前长度