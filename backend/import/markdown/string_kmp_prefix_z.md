---
title: 前缀函数、KMP 与 Z 函数模板合集
slug: string-kmp-prefix-z
type: algorithm
tags:
- 字符串
- KMP
- 前缀函数
- Z函数
summary: PrefixAndKMP 模板，包含无重叠前后缀前缀函数等多个应用函数。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2025-07-21T14:00:00'
updated_at: '2025-07-21T14:00:00'
difficulty: hard
series: 字符串算法模板
---

本文按“先主体模板，再前缀函数应用”的顺序整理。
oiwiki 参考 [前缀函数与 KMP 算法](https://oi-wiki.org/string/kmp/) 

## 算法主体模板

```cpp
// 前缀函数
//两个前缀的最长公共 border 即为他们在 border 树上的 LCA
//01找最短的「压缩」表示，也即我们希望寻找一个最短的字符串 t，使得 s 可以被 t 的一份或多份拷贝的拼接表示
    //计算 s 的前缀函数。通过使用该函数的最后一个值 pi[n - 1]，我们定义值 k = n - pi[n - 1]。
    //我们将证明，如果 k 整除 n，那么 k 就是答案，否则不存在一个有效的压缩，故答案为 n。
vector<int> prefix_function(string s) { // 返回的pi数组中，前缀和后缀会有重叠, eg: aaaa, 会有aaa的前缀和aaa的后缀，下面会给一个没有重叠的pi数组的算法
    int len = (int)s.length();
    vector<int> pi(len); // 前缀
    for (int i = 1; i < len; i++) {
        int j = pi[i - 1];
        while (j > 0 && s[i] != s[j]) j = pi[j - 1];
        if (s[i] == s[j]) j++;
        pi[i] = j;
    }
    return pi;
}

// KMP
vector<int> KMP(string text, string pattern) {
    string cur = pattern + '#' + text; // cur = sub + str
    int sz1 = text.size(), sz2 = pattern.size();
    vector<int> kmp;
    vector<int> pi = prefix_function(cur);
    for (int i = sz2 + 1; i <= sz1 + sz2; i++) {
        if (pi[i] == sz2) kmp.push_back(i - 2 * sz2);
    }
    return kmp;
}

// exKMP  z函数
vector<int> z_function(string s) {
    int n = (int)s.length();
    vector<int> z(n);
    for (int i = 1, l = 0, r = 0; i < n; ++i) {
        if (i <= r && z[i - l] < r - i + 1) {
            z[i] = z[i - l];
        }
        else {
            z[i] = max(0, r - i + 1); // 跳转
            while (i + z[i] < n && s[z[i]] == s[i + z[i]]) ++z[i];
        }
        if (i + z[i] - 1 > r) l = i, r = i + z[i] - 1;
    }
    return z;
}
```

## 前缀函数部分的应用

### 1) 失配树应用：去除重叠前后缀计数

这个函数用于“前后缀必须不重叠”的场景。  
注释里的“排除有重叠的前缀和后缀”对应实现是 `while ((j << 1) > i + 1) j = pi[j - 1];`，它会把过长的 border 继续沿失配边跳到合法位置。  
补充理解：`res.push_back(num[j])` 统计的是当前合法 border 链上的层数信息，常见于前缀方案计数题。

```cpp
//fail树，失配树
vector<int> prefix_function_WithoutOverlap(string s) { // 排除有重叠的前缀和后缀的 前缀函数算法
    int len = (int)s.length();
    vector<int> pi(len); // 前缀
    vector<int> num(len + 2);
    num[0] = 0; num[1] = 1;
    vector<int>res;
    for (int i = 1; i < len; i++) {
        int j = pi[i - 1];
        while (j > 0 && s[i] != s[j]) j = pi[j - 1];
        if (s[i] == s[j]) j++;
        pi[i] = j;
        num[i + 1] = num[j] + 1;
    }
    for (int i = 1, j = 0; i < len; i++) {
        //int j = pi[i - 1];
        // 不像上面这样写的原因，可能会找不到一个合适的前缀匹配,每次重置j的值会因为串是很长的同一字符而导致下面的循环长时间找不到 j = 0的时候而超时
        while (j > 0 && s[i] != s[j]) j = pi[j - 1];
        if (s[i] == s[j]) j++;
        while ((j << 1) > i + 1) j = pi[j - 1];
        res.push_back(num[j]);
    }
    return res; // 返回的就是去除重叠部分的前缀数组
}
```

### 2) 提取最短相同前后缀 / 循环节

这个函数是对前缀函数的再加工：先得到 `pi`，再通过“跳父边到最浅可行点”得到每个位置更规范的边界信息。  
保留了两种写法，方便在不同题型下替换。

```cpp
vector<int> prefix_function_MinSamePreSuf_OR_MaxLoopSection(string s) { // 求最短相同前后缀 || 求最长循环节
    int len = (int)s.length();
    vector<int> pi(len + 2); // 前缀
    vector<int> pii(len + 2);
    vector<int> res(len + 2);
    for (int i = 1; i < len; i++) {
        int j = pi[i - 1];
        while (j > 0 && s[i] != s[j]) j = pi[j - 1];
        if (s[i] == s[j]) j++;
        pi[i] = j;
    }
    //*****写法 1*****
    for (int i = 0; i < len; i++) pii[i + 1] = pi[i];
    for (int i = 1, j = 0; i <= len; i++) {
        j = i;
        while (pii[j]) j = pii[j];
        if (pii[i]) pii[i] = j;
        res.push_back(i - j);
    }
    //*****写法 2*****
    //for (int i = 1, j = 0; i < len; i++) {
    //	while (j > 0 && s[i] != s[j]) j = pi[j - 1];
    //	if (s[i] == s[j]) j++;
    //	pi[i] = j;
    //}
    //for (int i = 0; i < len; i++) {
    //	int j = pi[i];
    //	while (j > 0 && pi[j - 1]) j = pi[j - 1];
    //	pi[i] = j;
    //	if (pi[i])
    //		res.push_back(i + 1 - pi[i]);
    //}
    return res;
}
```

### 3) 求所有既是前缀又是后缀的长度

这个函数通过 `pi` 末尾一路回跳 `pi[j - 1]`，把整条 border 链全部提出来。  
适合输出所有合法 border 长度的题。

```cpp
vector<int> prefix_function_SubStringIsPreAndSufLen(string s) { // 字符串中求出所有既是前缀又是后缀的子串长度 // 例,ababcababababcabab，既是原串的前缀又是原串的后缀的：ab，abab，ababcabab，ababcababababcabab
    vector<int>pi = prefix_function(s);
    vector<int>res;
    res.push_back(s.length()); // 包括自己
    int j = pi[pi.size() - 1]; // 既然是和原串有关，那必然会联想到从前缀数组的最后一位开始匹配
    while (j) {
        res.push_back(j);
        j = pi[j - 1]; // 其实是打表想到的，根据样例，然后输出所有，一个一个跳转就找到了
    }
    sort(res.begin(), res.end());
    return res; // 可开心死我了，读完题马上有思路，不超5min给A了
}
```

### 4) 最长“前缀=后缀且在中间出现”

这个函数先统计中间部分的最大 `pi`，再用末尾 `pi` 向上回跳到可行答案。  
是典型的“前后缀 + 中间出现”模型。

```cpp
int prefix_function_MaxSamePreSuf_AND_occurInMiddle(string s) { // 找一个串中，即是前缀也是后缀，还在串中出现过的，并且最长
    int len = s.length();
    vector<int>pi = prefix_function(s);
    int maxn = -1;
    for (int i = 1; i < len - 1; i++) // 从 1 开始因为 0 没有意义； 不要最后一个是为了让中缀不包括后缀部分， eg: abcddabcddabc
        maxn = max(maxn, pi[i]);
    int j = pi[len - 1];
    while (j && j > maxn) j = pi[j - 1];
    return j;
}
```

### 5) 最短可表示子串长度（非最小表示法）

这个函数返回 `n - pi[n-1]`，用于求“最短循环核心长度”。

```cpp
int getMinShow(string s) { // 不是最小表示法，从一个字符串中找到最短的子串，这个子串可以循环组成，使原串是这个新串的子串， 例如，cabcabc原串-->abc最短符合子串-->abcabcabc新串
    vector<int>pi = prefix_function(s);
    return s.length() - pi[pi.size() - 1];
}
```

### 6) 最短循环节长度

这个函数在 `n % (n - pi[n-1]) == 0` 时返回最短循环节，否则返回原串长度。  
适合判断字符串是否由某个短串重复拼接而成。

```cpp
// s的最小周期 是 s.length()-pi[pi.size()-1] 如果求最大周期长度，就是 maxLen = pi[len - 1] ,
// s寻找一个最短的字符串 t，使得 s 可以被 t 的一份或多份拷贝的拼接表示, eg: cabcabca是abcabcabcabc的子串，可以由abc连接得到，即最短循环长度为3，是abc的长度
int getMinPeriod(string s) {
    vector<int>pi = prefix_function(s);
    int len = s.length();
    if (!(len % (len - pi[len - 1]))) return len - pi[len - 1];
    else return len;
}
```

### 7) 补字符变循环串

这个函数求“最少再补多少字符”能让当前串成为完整循环串。  
本质是利用最小循环节长度与当前长度余数的关系。

```cpp
// 和getMinPeriod()不同的是，上面是求最短循环节
// 下面的是求添加多少字符可构成循环字符串， 即abcd -> abcdabcd; aaa -> aaa; aba -> abab
// 也可以说是，某种情况下，新串的pi[pi.size() - 1] = newString.length() / 2;
int getNumToCircle(string s) {
    vector<int>pi = prefix_function(s);
    int len = s.length();
    int minPeriod = len - pi[pi.size() - 1];
    if (!pi[pi.size() - 1]) // 最小循环节 = 原子符串长度, 说明只能通过复制一次原串得到目标字符串
        return len;
    else if (!(len % minPeriod)) // 原串长度 % 最小循环节 = 0 ,说明原串已经是循环的了
        return 0;
    else  // 最小循环节 - 原串长度 % 最小循环节 , 有部分不在循环中
        return minPeriod - len % minPeriod;
}
```

### 8) 每个前缀是否可压缩

这个函数枚举每个前缀，判断是否能由更短循环节重复得到，并输出“前缀长度 + 重复次数”。  
常用于周期前缀统计题。

```cpp
vector<pair<int, int> > getPrefixSubstringCompress(string s) { // 求前缀是否是周期性字符串(对于每个前缀pre，pre连接k次)
    vector<int>pi = prefix_function(s);
    vector<pair<int, int> > res; // { 当前子串的长度， 循环节出现的次数 }
    for (int i = 0; i < pi.size(); i++) {
        if (pi[i]) {
            int nowLen = i + 1;
            int minPeriod = nowLen - pi[i]; //  最短循环节=子串的长度-最长相同前后缀长度
            if (!(nowLen % minPeriod)/*当前串能被最短循环节组成*/ && nowLen / minPeriod > 1/*循环节在原串出现的次数>1*/)
                res.push_back({ nowLen, nowLen / minPeriod });
        }
    }
    return res;
}
```

### 9) 多串最大重叠拼接

这个函数把“前串后缀”和“后串前缀”的最大重叠长度用前缀函数算出来，再进行拼接。  
常用于路径字符串合并、DNA 片段拼接等题型。

```cpp
string compressString(string s[], int n/*词的个数*/) { // 前串的后缀 是 后串的前缀 ， 求前后缀合体后的最终串，eg: 1101 1001 001001 101 010 -> 1101001001010 ||  want to order -> wantorder
    string res = s[1];
    rep(i, 2, n, 1) {
        int len = min(res.length(), s[i].length());
        // 中间的杂串是随便加的，目的是隔开原本的两串
        string temp = s[i] + "!@#$%^&*()njm[];'./~~~123112asfdnaowdhj" + res.substr(res.size() - len, len);
        vector<int>pi = prefix_function(temp);
        for (int j = pi[pi.size() - 1]; j < s[i].length(); j++) res += s[i][j];
    }
    //优化空间的写法：
    /*cin >> res;
    rep(i, 2, n, 1) {
        string str; cin >> str;
        int len = min(res.length(), str.length());
        temp = str + "!@#$%^&*()njm[];'./~~~123112asfdnaowdhj" + res.substr(res.size() - len, len);
        vector<int>pi = pakmp.prefix_function(temp);
        for (int j = pi[pi.size() - 1]; j < str.length(); j++) res += str[j];
    }*/
    return res;
}
```

