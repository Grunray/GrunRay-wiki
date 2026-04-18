这篇对应 `Manacher` 结构体，保留了两种实现：`d1+d2` 分离版与带分隔符合并版。

oiwiki 参考 [Manacher](https://oi-wiki.org/string/manacher/) 

## 算法模板

```cpp
struct Manacher {
    pair<vector<int>, vector<int>> MANACHER(string s) {
        int len = s.length();
        vector<int> d1(len);
        for (int i = 0, l = 0, r = -1; i < len; i++) {
            int k = (i > r) ? 1 : min(d1[l + r - i], r - i + 1);
            while (0 <= i - k && i + k < len && s[i - k] == s[i + k]) k++;
            d1[i] = k--;
            if (i + k > r) l = i - k, r = i + k;
        }

        vector<int> d2(len);
        for (int i = 0, l = 0, r = -1; i < len; i++) {
            int k = (i > r) ? 0 : min(d2[l + r - i + 1], r - i + 1);
            while (0 <= i - k - 1 && i + k < len && s[i - k - 1] == s[i + k]) k++;
            d2[i] = k--;
            if (i + k > r) l = i - k - 1, r = i + k;
        }
        return {d1, d2};
    }

    vector<int> MANACHER2(string s) {
        int len = s.length();
        string str;
        for (int i = 0; i < len; i++) {
            str.push_back('#');
            str.push_back(s[i]);
        }
        str = "%" + str + "#@";
        len = str.length();
        vector<int> d(len);
        for (int i = 0, l = 0, r = -1; i < len; i++) {
            int k = (i > r) ? 1 : min(d[l + r - i], r - i + 1);
            while (0 <= i - k && i + k < len && str[i - k] == str[i + k]) k++;
            d[i] = k--;
            if (i + k > r) l = i - k, r = i + k;
        }
        return d; // 最长回文长度 = max(d) - 1
    }

    pair<int, int> getMaxOrMinLenOfPalindromeSubstring(string s, bool MaxOrMin) {
        auto pv = MANACHER(s);
        vector<int> d1 = pv.first, d2 = pv.second;
        int Odd = 0, Even = 0;
        if (MaxOrMin) {
            for (auto x : d1) Odd = max(Odd, x);
            for (auto x : d2) Even = max(Even, x);
        } else {
            for (auto x : d1) if (x) Odd = min(Odd, x);
            for (auto x : d2) if (x) Even = min(Even, x);
        }
        Odd = Odd * 2 - 1;
        Even = Even * 2;
        return {Odd, Even};
    }

    int getMinLenToAddChTOPalindrome(string s) {
        auto pv = MANACHER(s);
        vector<int> d1 = pv.first, d2 = pv.second;
        int Odd = 0, Even = 0;
        for (int i = 0; i < (int)d1.size(); i++)
            if (d1[i] + i == s.length()) Odd = max(Odd, d1[i]);
        for (int i = 0; i < (int)d2.size(); i++)
            if (d2[i] + i == s.length()) Even = max(Even, d2[i]);
        Odd = Odd * 2 - 1;
        Even = Even * 2;
        return s.length() - max(Odd, Even);
    }
};
```

## 应用整理

### 1) 最长回文子串

这段代码用于同时求奇回文半径数组 `d1` 与偶回文半径数组 `d2`，是后续所有回文统计的基础。

```cpp
pair<vector<int>, vector<int>> MANACHER(string s) {
    int len = s.length();
    vector<int> d1(len);
    for (int i = 0, l = 0, r = -1; i < len; i++) {
        int k = (i > r) ? 1 : min(d1[l + r - i], r - i + 1);
        while (0 <= i - k && i + k < len && s[i - k] == s[i + k]) k++;
        d1[i] = k--;
        if (i + k > r) l = i - k, r = i + k;
    }

    vector<int> d2(len);
    for (int i = 0, l = 0, r = -1; i < len; i++) {
        int k = (i > r) ? 0 : min(d2[l + r - i + 1], r - i + 1);
        while (0 <= i - k - 1 && i + k < len && s[i - k - 1] == s[i + k]) k++;
        d2[i] = k--;
        if (i + k > r) l = i - k - 1, r = i + k;
    }
    return {d1, d2};
}
```

- 使用 `MANACHER` 后：
  - 奇回文最大长度 `max(d1) * 2 - 1`
  - 偶回文最大长度 `max(d2) * 2`

### 2) 区分奇回文/偶回文处理

这段代码用于把奇偶答案分开输出（最大或最小），适合需要分别处理两类回文的题。

```cpp
pair<int, int> getMaxOrMinLenOfPalindromeSubstring(string s, bool MaxOrMin) {
    auto pv = MANACHER(s);
    vector<int> d1 = pv.first, d2 = pv.second;
    int Odd = 0, Even = 0;
    if (MaxOrMin) {
        for (auto x : d1) Odd = max(Odd, x);
        for (auto x : d2) Even = max(Even, x);
    } else {
        for (auto x : d1) if (x) Odd = min(Odd, x);
        for (auto x : d2) if (x) Even = min(Even, x);
    }
    Odd = Odd * 2 - 1;
    Even = Even * 2;
    return {Odd, Even};
}
```

- 模板把 `d1/d2` 分开，适合做“奇偶回文分开统计”的题

### 3) 右侧最少补字符变回文

这段代码用于求“在末尾最少补多少字符可变回文”，本质是找以末尾结束的最长回文后缀。

```cpp
int getMinLenToAddChTOPalindrome(string s) {
    auto pv = MANACHER(s);
    vector<int> d1 = pv.first, d2 = pv.second;
    int Odd = 0, Even = 0;
    for (int i = 0; i < (int)d1.size(); i++)
        if (d1[i] + i == s.length()) Odd = max(Odd, d1[i]);
    for (int i = 0; i < (int)d2.size(); i++)
        if (d2[i] + i == s.length()) Even = max(Even, d2[i]);
    Odd = Odd * 2 - 1;
    Even = Even * 2;
    return s.length() - max(Odd, Even);
}
```

- `getMinLenToAddChTOPalindrome`：
  - 找“以末尾结尾”的最长回文后缀
  - 结果是 `n - 最长回文后缀长度`