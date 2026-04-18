这篇对应 `PAM` 结构体（Palindromic Tree / Eertree），用于维护所有不同回文子串。

oiwiki 参考 [回文树](https://oi-wiki.org/string/pam/) 

## 算法模板

```cpp
struct PAM {
    int sz, tot, last;
    int cnt[N], ch[N][26], len[N], fail[N];
    char s[N];

    int node(int l) {
        sz++;
        memset(ch[sz], 0, sizeof(ch[sz]));
        len[sz] = l;
        fail[sz] = cnt[sz] = 0;
        return sz;
    }

    void clear() {
        sz = -1;
        last = 0;
        s[tot = 0] = '$';
        node(0); node(-1);
        fail[0] = 1;
    }

    int getfail(int x) {
        while (s[tot - len[x] - 1] != s[tot]) x = fail[x];
        return x;
    }

    void insert(char c, int i) {
        s[++tot] = c;
        int now = getfail(last);
        if (!ch[now][c - 'a']) {
            int x = node(len[now] + 2);
            fail[x] = ch[getfail(fail[now])][c - 'a'];
            ch[now][c - 'a'] = x;
        }
        last = ch[now][c - 'a'];
        cnt[last]++;
    }

    long long solve() {
        long long ans = 0;
        for (int i = sz; i >= 0; i--) cnt[fail[i]] += cnt[i];
        for (int i = 2; i <= sz; i++) {
            ans = (ans + ((1ll * len[i] * cnt[i]) % MODE) * cnt[i]) % MODE;
        }
        return ans;
    }
};
```

## 应用场景

### 1) 统计不同回文子串数量

这段代码用于动态插入字符并维护回文树节点；每新建一个节点就对应一个新的不同回文子串。

```cpp
void insert(char c, int i) {
    s[++tot] = c;
    int now = getfail(last);
    if (!ch[now][c - 'a']) {
        int x = node(len[now] + 2);
        fail[x] = ch[getfail(fail[now])][c - 'a'];
        ch[now][c - 'a'] = x;
    }
    last = ch[now][c - 'a'];
    cnt[last]++;
}
```

- 建树后节点数（除两个根）就是不同回文子串个数

### 2) 统计每个回文子串出现次数

这段代码用于把出现次数沿 fail 树向上累加，得到每个回文串在原串中的总出现次数。

```cpp
long long solve() {
    long long ans = 0;
    for (int i = sz; i >= 0; i--) cnt[fail[i]] += cnt[i];
    for (int i = 2; i <= sz; i++) {
        ans = (ans + ((1ll * len[i] * cnt[i]) % MODE) * cnt[i]) % MODE;
    }
    return ans;
}
```

- 插入时记录 `cnt[last]++`
- 最后按 fail 树逆序累加：`cnt[fail[i]] += cnt[i]`

### 3) 回文贡献类题目

这段代码用于计算“长度和出现次数组合贡献”的目标值，模板里是 `len * cnt * cnt` 形式。

- 模板里 `solve()` 给出了一类贡献计算：
- `sum(len[i] * cnt[i] * cnt[i])`（取模）