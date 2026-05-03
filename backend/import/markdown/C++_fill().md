---
title: C++ fill()：数组与 vector 填充备忘
slug: cpp-fill-notes
type: article
tags:
- C++
- STL
- 数组
- vector
summary: 记录 fill() 在一维数组、二维数组和 vector 中的常见用法与边界注意事项。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2024-03-25T10:00:00'
updated_at: '2024-03-25T10:00:00'
difficulty: easy
series: C++ 常用函数
---

这是一份自用备忘，整理 `fill()` 的常见写法，方便写题时快速查阅。

## 1. 填充一维数组

### 1.1 从头填充

`fill(数组名, 数组名 + 要填充的个数, 填充值);`

### 1.2 指定起始位置填充

`fill(数组名 + 起始位置, 数组名 + 要填充的个数, 填充值);`

> 若起始位置从 `0` 开始，则可以省略偏移。

示例与输出：

```cpp
fill(arr, arr + N, 1);
for (int i = 0; i < N; i++) cout << arr[i] << ' ';
cout << '\n';

fill(arr, arr + 5, 2);
for (int i = 0; i < N; i++) cout << arr[i] << ' ';
cout << '\n';

fill(arr + 6, arr + 10, 3);
for (int i = 0; i < N; i++) cout << arr[i] << ' ';
```

```text
1 1 1 1 1 1 1 1 1 1
2 2 2 2 2 1 1 1 1 1
2 2 2 2 2 1 3 3 3 3
```

## 2. 填充二维数组

### 2.1 从 `arr[0][0]` 开始按内存连续填充

`fill(数组名[行数], 数组名[行数] + 要填充的个数, 填充值);`

常用写法（从 `arr[0][0]` 开始逐行填充）：

```cpp
fill(dis[0], dis[0] + N * N - N, 1);
for (int i = 0; i < N; i++) {
    for (int j = 0; j < N; j++) cout << dis[i][j] << ' ';
    cout << '\n';
}
```

```text
1 1 1 1 1
1 1 1 1 1
1 1 1 1 1
1 1 1 1 1
0 0 0 0 0
```

### 2.2 指定行和列偏移开始填充

`fill(数组名[行数] + 起始位置, 数组名[行数] + 要填充的个数, 填充值);`

行数可为 `0` 或其他值。起始位置表示从 `arr[行数][起始位置]` 开始填充。

例如：行数 `= 1`，起始位置 `= 1`，即从 `arr[1][1]` 开始。

```cpp
fill(dis[1] + 1, dis[1] + 3 * N - 2, 2);
for (int i = 0; i < N; i++) {
    for (int j = 0; j < N; j++) cout << dis[i][j] << ' ';
    cout << '\n';
}
```

```text
0 0 0 0 0
0 2 2 2 2
2 2 2 2 2
2 2 2 0 0
0 0 0 0 0
```

### 2.3 使用负偏移跨到上一行尾部

`fill(数组名[行数] - 值, 数组名[行数] + 要填充的个数, 填充值);`

与 2.2 类似，但会从 `arr[行数 - 1][每行长度 - 值]` 附近开始填充。

```cpp
fill(dis[1] - 2, dis[1] + 3 * N - 2, 2);
for (int i = 0; i < N; i++) {
    for (int j = 0; j < N; j++) cout << dis[i][j] << ' ';
    cout << '\n';
}
```

```text
0 0 0 2 2
2 2 2 2 2
2 2 2 2 2
2 2 2 0 0
0 0 0 0 0
```

## 3. 填充一维 `vector`

### 3.1 填充整个 `vector`

`fill(v.begin(), v.end(), value);`

```cpp
vector<int> v(N);
fill(v.begin(), v.end(), 1);
for (int i = 0; i < N; i++) cout << v[i] << ' ';
```

```text
1 1 1 1 1
```

### 3.2 填充部分区间

- `fill(v.begin(), v.begin() + pos, value);`（需满足 `pos < v.size()`）
- `fill(v.begin() + p1, v.end() - p2, value);`（通常需保证区间合法）
- `fill(v.end() - p1, v.end() - p2, value);`（当 `p1 == p2` 时，相当于空区间）

```cpp
fill(v.begin(), v.begin() + 2, 1);
for (int i = 0; i < N; i++) cout << v[i] << ' ';
cout << '\n';

fill(v.begin() + 3, v.end() - 1, 2);
for (int i = 0; i < N; i++) cout << v[i] << ' ';
cout << '\n';

fill(v.end() - 3, v.end() - 2, 3);
for (int i = 0; i < N; i++) cout << v[i] << ' ';
```

```text
1 1 0 0 0
1 1 0 2 0
1 1 3 2 0
```