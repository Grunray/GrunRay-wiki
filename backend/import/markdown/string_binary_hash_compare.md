---
title: Binary_HASH 模板：二分 + 哈希比较字符串
slug: string-binary-hash-compare
type: algorithm
tags:
- 字符串
- 哈希
- 二分
summary:  Binary_HASHE 结构体，整理旋转/位移后字符串比较模板。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2025-07-21T14:00:00'
updated_at: '2025-07-21T14:00:00'
difficulty: hard
series: 字符串算法模板
---

这篇单独对应 `Binary_HASHE` 结构体，避免和普通前缀哈希混在一起，便于直接套题。

oiwiki 参考 [二分哈希](https://oi-wiki.org/string/hash/) 

## 算法模板

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

## 典型应用

### 应用 1：位移串字典序比较

这段代码用于比较两段“位移后字符串”谁的字典序更大，核心函数是 `check`。

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

- 多个候选方案按字典序选最优（每次比较 O(log n)）
- 环形串/位移串比较大小
- 需要“最长公共前缀 + 下一个字符比较”的题

### 应用 2：位移片段哈希求值

这段代码用于求某次变换后的前缀哈希，给 `check` 的二分过程提供 O(1) 子串比较能力。

```cpp
long long cal(long long x, long long d) {
    if (x >= d) return rhget(pos + x - d, pos + x - 1);
    long long res1 = rhget(pos, pos + x - 1);
    long long res2 = lhget(pos + x, pos + d - 1);
    return (res1 * p[d - x] % MODE + res2) % MODE;
}
```

