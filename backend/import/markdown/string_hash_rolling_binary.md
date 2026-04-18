---
title: 字符串哈希模板：单哈希与二分比较哈希
slug: string-hash-rolling-binary
type: algorithm
tags:
- 字符串
- 哈希
- 二分
summary: 哈希模板，整理单串哈希、子串等价判断与二分比较场景。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2025-07-21T14:00:00'
updated_at: '2025-07-21T14:00:00'
difficulty: medium
series: 字符串算法模板
---

这篇对应 `HASHE` 与 `Binary_HASHE` 两个结构体，核心用途是：

- O(1) 获取子串哈希
- O(1) 判断两个子串是否相等
- 结合二分比较两个“旋转/位移后”的字符串大小

oiwiki 参考 [字符串哈希](https://oi-wiki.org/string/hash/) 

## 1) 单哈希模板（`HASHE`）

```cpp
struct HASHE { // 下标从1开始
    const int Pri = 13331;
    unsigned long long p[N], h[N];
    unsigned long long val = 0;

    // 求一个串的哈希值，相当于前缀和
    unsigned long long init(string str) {
        p[0] = 1; h[0] = 0;
        int len = str.length();
        for (int i = 1; i < len; i++) {
            p[i] = p[i - 1] * Pri;
            h[i] = h[i - 1] * Pri + str[i];
        }
        val = h[len - 1];
        return val;
    }

    // 求子串哈希值，相当于区间和
    unsigned long long getSubHash(int l, int r) {
        return h[r] - h[l - 1] * p[r - l + 1];
    }

    bool isSameSub(int l1, int r1, int l2, int r2) {
        return getSubHash(l1, r1) == getSubHash(l2, r2);
    }
};
```

### 应用 1：子串判等

这段代码用于快速判断两段区间子串是否相同，核心是 `getSubHash` 与 `isSameSub`。

```cpp
unsigned long long getSubHash(int l, int r) {
    return h[r] - h[l - 1] * p[r - l + 1];
}

bool isSameSub(int l1, int r1, int l2, int r2) {
    return getSubHash(l1, r1) == getSubHash(l2, r2);
}
```

- 常见于“给定大量询问，判断 `s[l1..r1]` 与 `s[l2..r2]` 是否相同”
- 每次查询 O(1)，总复杂度从 O(q * len) 降到 O(n + q)

### 应用 2：去重/快速比较

这段代码用于把子串哈希作为“字符串指纹”，用于去重、分组和快速比对。

```cpp
unsigned long long init(string str) {
    p[0] = 1; h[0] = 0;
    int len = str.length();
    for (int i = 1; i < len; i++) {
        p[i] = p[i - 1] * Pri;
        h[i] = h[i - 1] * Pri + str[i];
    }
    val = h[len - 1];
    return val;
}
```

- 可以把每个子串的哈希放进 `set` 或 `unordered_set` 做去重统计
- 也可用于字符串分组、相同模式检测

## 2) 二分比较哈希模板（`Binary_HASHE`）

```cpp
struct Binary_HASHE {
    unsigned long long lh[N], rh[N], p[N];
    const long long Pri = 131ll;
    char s[N], c[N];
    unsigned long long pos;
    long long len;

    long long lhget(long long l, long long r) {
        return ((lh[r] - lh[l - 1] * p[r - l + 1] % MODE + MODE) % MODE + MODE) % MODE;
    }

    long long rhget(long long l, long long r) {
        return ((rh[l] - rh[r + 1] * p[r - l + 1] % MODE + MODE) % MODE + MODE) % MODE;
    }

    long long cal(long long x, long long d) {
        if (x >= d) return rhget(pos + x - d, pos + x - 1);
        long long res1 = rhget(pos, pos + x - 1);
        long long res2 = lhget(pos + x, pos + d - 1);
        return (res1 * p[d - x] % MODE + res2) % MODE;
    }

    char Getchar(long long x, long long d) {
        if (x >= d) return s[pos + x - d];
        return s[pos + d - 1];
    }

    // 比较两段“变换后串”字典序，返回 x 串是否大于 y 串
    bool check(long long x, long long y) {
        long long l = 0, r = len - pos;
        while (l < r) {
            long long mid = (l + r + 1) / 2;
            long long p = cal(x, mid);
            long long q = cal(y, mid);
            if (p == q) l = mid;
            else r = mid - 1;
        }
        l++;
        char _x = Getchar(x, l);
        char _y = Getchar(y, l);
        return _x > _y;
    }
};
```

### 应用 1：最长公共前缀 + 字典序比较

这段代码用于比较两个候选串（或位移后的串）大小，先二分最长公共前缀，再比较下一个字符。

```cpp
bool check(long long x, long long y) {
    long long l = 0, r = len - pos;
    while (l < r) {
        long long mid = (l + r + 1) / 2;
        long long p = cal(x, mid);
        long long q = cal(y, mid);
        if (p == q) l = mid;
        else r = mid - 1;
    }
    l++;
    char _x = Getchar(x, l);
    char _y = Getchar(y, l);
    return _x > _y;
}
```

- `check(x, y)` 本质是“哈希 + 二分”找第一个不同位置，再比较字符
- 适用于需要频繁比较多个候选字符串的题

### 应用 2：循环位移/拼接串比较

这段代码用于“位移后字符串片段哈希”的统一计算，`cal` 与 `Getchar` 配合 `check` 使用。

```cpp
long long cal(long long x, long long d) {
    if (x >= d) return rhget(pos + x - d, pos + x - 1);
    long long res1 = rhget(pos, pos + x - 1);
    long long res2 = lhget(pos + x, pos + d - 1);
    return (res1 * p[d - x] % MODE + res2) % MODE;
}
```

- `cal` 与 `Getchar` 这类写法常见于“串做位移后比较大小”
- 把原本 O(n) 的比较降到 O(log n)

## 3) 使用提醒

- 哈希有理论冲突概率，竞赛中通常可接受；追求稳妥可双哈希
- 注意模板里的下标习惯（注释写了“下标从 1 开始”）
- 需要先正确初始化幂数组与前缀哈希数组

