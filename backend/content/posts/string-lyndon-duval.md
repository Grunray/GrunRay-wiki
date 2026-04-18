这篇对应 `Lyndon` 结构体，并补充文件中的独立最小表示法函数 `minn_show`。

oiwiki 参考 [Lyndon 分解](https://oi-wiki.org/string/lyndon/) 

## 算法模板（Lyndon / Duval）

```cpp
struct Lyndon {
    // Duval 分解：返回每段 Lyndon 串的右端点（下标从 1 开始）
    vector<int> duval_getRightPoint(string const& s) {
        int len = s.size(), i = 1;
        vector<string> lyndon;
        vector<int> right_point;
        while (i < len) {
            int j = i + 1, k = i;
            while (j < len && s[k] <= s[j]) {
                if (s[k] < s[j]) k = i;
                else k++;
                j++;
            }
            while (i <= k) {
                lyndon.push_back(s.substr(i, j - k));
                i += j - k;
                right_point.push_back(i);
            }
        }
        return right_point;
    }

    // 求每个前缀字符串中的最大字典序子串左端点
    vector<int> duval_getMaxOrderSubstringLeftPoint(string const& s) {
        int len = s.size(), i = 1;
        vector<int> l(len + 5);
        while (i < len) {
            int j = i + 1, k = i;
            if (!l[i]) l[i] = i;
            while (j < len && s[k] >= s[j]) {
                if (!l[j]) l[j] = i;
                if (s[k] == s[j]) k++;
                else k = i;
                j++;
            }
            while (i <= k) i += j - k;
        }
        return l;
    }

    // 最小表示法（返回最小字典序循环串）
    string minCyclicString(string s) {
        s += s;
        int len = s.size();
        int i = 0, ans = 0;
        while (i < len / 2) {
            ans = i;
            int j = i + 1, k = i;
            while (j < len && s[k] <= s[j]) {
                if (s[k] < s[j]) k = i;
                else k++;
                j++;
            }
            while (i <= k) i += j - k;
        }
        return s.substr(ans, len / 2);
    }
};
```

## 补充模板（文件中的独立函数）

```cpp
long long minn_show(vector<long long> sec, string s) {
    long long k = 0, i = 1, j = 2;
    int n = s.length();
    for (int t = 0; t < n; t++) sec[n + t] = sec[t];
    while (k < n && i < n && j < n) {
        for (k = 0; k < n && sec[(i + k) % n] == sec[(j + k) % n]; k++);
        sec[(i + k) % n] > sec[(j + k) % n] ? i = i + k + 1 : j = j + k + 1;
        if (i == j) i++;
    }
    return min(i, j);
}
```

## 应用场景

### 应用 1：Lyndon 分解

这段代码用于把字符串按 Duval 规则分解成 Lyndon 串，并记录每段右端点。

```cpp
vector<int> duval_getRightPoint(string const& s) {
    int len = s.size(), i = 1;
    vector<string> lyndon;
    vector<int> right_point;
    while (i < len) {
        int j = i + 1, k = i;
        while (j < len && s[k] <= s[j]) {
            if (s[k] < s[j]) k = i;
            else k++;
            j++;
        }
        while (i <= k) {
            lyndon.push_back(s.substr(i, j - k));
            i += j - k;
            right_point.push_back(i);
        }
    }
    return right_point;
}
```

- Lyndon 分解：字符串因子分解、后缀结构分析

### 应用 2：前缀最大字典序子串

这段代码用于求每个前缀内“最大字典序子串”的左端点，适合在线/前缀查询型题目。

```cpp
vector<int> duval_getMaxOrderSubstringLeftPoint(string const& s) {
    int len = s.size(), i = 1;
    vector<int> l(len + 5);
    while (i < len) {
        int j = i + 1, k = i;
        if (!l[i]) l[i] = i;
        while (j < len && s[k] >= s[j]) {
            if (!l[j]) l[j] = i;
            if (s[k] == s[j]) k++;
            else k = i;
            j++;
        }
        while (i <= k) i += j - k;
    }
    return l;
}
```

### 应用 3：最小表示法

这段代码用于求循环串的最小字典序表示，可用于循环同构判定和标准化表示。

```cpp
string minCyclicString(string s) {
    s += s;
    int len = s.size();
    int i = 0, ans = 0;
    while (i < len / 2) {
        ans = i;
        int j = i + 1, k = i;
        while (j < len && s[k] <= s[j]) {
            if (s[k] < s[j]) k = i;
            else k++;
            j++;
        }
        while (i <= k) i += j - k;
    }
    return s.substr(ans, len / 2);
}
```

这段代码是同类最小表示法的独立实现版本，返回最优起点下标。

```cpp
long long minn_show(vector<long long> sec, string s) {
    long long k = 0, i = 1, j = 2;
    int n = s.length();
    for (int t = 0; t < n; t++) sec[n + t] = sec[t];
    while (k < n && i < n && j < n) {
        for (k = 0; k < n && sec[(i + k) % n] == sec[(j + k) % n]; k++);
        sec[(i + k) % n] > sec[(j + k) % n] ? i = i + k + 1 : j = j + k + 1;
        if (i == j) i++;
    }
    return min(i, j);
}
```