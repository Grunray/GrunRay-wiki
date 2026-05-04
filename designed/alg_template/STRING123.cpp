#define _CRT_SECURE_NO_WARNINGS
#include<bits/stdc++.h>
using namespace std;

//#define int long long

#define bit(x) (1LL << (x))
#define lowbit(x) (x & -x)
#define sq(x) ((x) * (x))

#define rep(a, b, c, d) for (int a = (b); a <= (c); a += (d))
#define fep(a, b, c, d) for (int a = (b); a >= (c); a -= (d))

using unll = unsigned long long;
using ll = long long;

/*--int128--*/
//inline __int128 read() {//__int128模板 
//	__int128 x = 0, f = 1;
//	char ch = getchar();
//	while (ch < '0' || ch > '9') { if (ch == '-')  f = -1; ch = getchar(); }
//	while (ch >= '0' && ch <= '9') { x = x * 10 + ch - '0'; ch = getchar(); }
//	return x * f;
//}
//inline void print(__int128 x) {
//	if (x < 0) { putchar('-'); x = -x; }
//	if (x > 9)  print(x / 10);
//	putchar(x % 10 + '0');
//}
/*--fast read--*/
template<typename T> T read() {
	T X = 0; bool flag = true; char ch = getchar();
	while (ch < '0' || ch > '9') { if (ch == '-') flag = false; ch = getchar(); }
	while (ch >= '0' && ch <= '9') { X = (X << 1) + (X << 3) + ch - '0'; ch = getchar(); }
	if (flag) return X;
	return ~(X - 1);
}
template<typename T> void write(T X) {
	if (X < 0) { putchar('-'); X = ~(X - 1); }
	int s[100], top = 0;
	while (X) { s[++top] = X % 10; X /= 10; }
	if (!top) s[++top] = 0;
	while (top) putchar(s[top--] + '0');
}
/*--const--*/
const int INF = 0x3f3f3f3f;
const long long LINF = 0x3f3f3f3f3f3f3f3f;
const long long MODE = 998244353;
const long long MOD = 1e9 + 7;

const int dx[] = { 1, 0,-1, 0,   1, 1,-1,-1 };
const int dy[] = { 0,-1, 0, 1,  -1, 1,-1, 1 };

const double eps = 1e-8;
double Pi = acos(-1.0);
/*--math--*/
long long qpow(long long x, long long y) {
	x %= MODE;
	long long res = 1;
	while (y) {
		if (y & 1) res = res * x % MODE;
		x = x * x % MODE;
		y >>= 1;
	}
	return res;
}
long long gcd(long long a, long long b) { // 最大公约数
	while (b ^= a ^= b ^= a %= b)
		;
	return a;
}
long long lcm(long long a, long long b) { // 最小公倍数
	return a / gcd(a, b) * b;
}

/*------------CODE------------*/

// int months[15] = { 0,31,28,31,30,31,30,31,31,30,31,30,31 };

//priority_queue<ll> pq;//这是一个大根堆q
//priority_queue<int, vector<int>, greater<int> >q;//这是一个小根堆q
//priority_queue<ll, vector<ll>, greater<ll> >pq; // 小根

const long long N = 1e4 + 50;
const long long M = 1e6 + 50;

ll n, m;

// 哈希
struct HASHE { // 下标从1开始
    const int Pri = 13331;
    unll p[N], h[N];
    unll val = 0;
    // 求一个串的哈希值相当于求前缀和
    unll init(string str) {
        p[0] = 1; h[0] = 0;
        int len = str.length();
        for (int i = 1; i < len; i++) {
            p[i] = p[i - 1] * Pri;
            h[i] = h[i - 1] * Pri + str[i];
        }
        val = h[len - 1];
        return val; // 当前串的哈希值
    }
    // 求子串的哈希值相当于求区间和
    unll getSubHash(int l, int r) { return h[r] - h[l - 1] * p[r - l + 1]; }
    bool isSameSub(int l1, int r1, int l2, int r2) { return getSubHash(l1, r1) == getSubHash(l2, r2); }
};
struct Binary_HASHE
{
    unll lh[N], rh[N], p[N];
    const ll Pri = 131ll;
    char s[N], c[N];
    unll pos;
    ll len;
    ll lhget(ll l, ll r) {
        return ((lh[r] - lh[l - 1] * p[r - l + 1] % MODE + MODE) % MODE + MODE) % MODE;
    }
    ll rhget(ll l, ll r) {
        return ((rh[l] - rh[r + 1] * p[r - l + 1] % MODE + MODE) % MODE + MODE) % MODE;
    }
    ll cal(ll x, ll d) {
        if (x >= d)
            return rhget(pos + x - d, pos + x - 1);
        else {
            ll res1 = rhget(pos, pos + x - 1);
            ll res2 = lhget(pos + x, pos + d - 1);
            return (res1 * p[d - x] % MODE + res2) % MODE;
        }
    }
    char Getchar(ll x, ll d) {
        if (x >= d) return s[pos + x - d];
        else return s[pos + d - 1];
    }
    bool check(ll x, ll y) {
        ll l = 0, r = len - pos;
        while (l < r) {
            ll mid = (l + r + 1) / 2;
            ll p = cal(x, mid);
            ll q = cal(y, mid);
            if (p == q) l = mid;
            else r = mid - 1;
        }
        l++;
        char _x = Getchar(x, l);
        char _y = Getchar(y, l);
        return  _x > _y;
    }
};
// 字典树
struct Trie {
    int nex[N][65], cnt;
    int exist[N];  // 该结点结尾的[词]出现次数是多少
    int done[N]; // 记录是否为一个[词]
    //bool vis[N]; // 记录该[词]是否被访问
    ll compareCnt = 0;
    void init() {
        for (int i = 0; i <= cnt; i++) for (int j = 0; j < 65; j++) nex[i][j] = 0;
        for (int i = 0; i <= cnt; i++) exist[i] = 0;
        for (int i = 0; i <= cnt; i++) done[i] = 0;
        cnt = 1;
        compareCnt = 0;
    }
    int getAscii(char ch) { //  A-Z a-z 0-9
        int ascii = 0;
        if (isupper(ch))      ascii = int(ch - 'A');
        else if (islower(ch)) ascii = int(ch - 'a' + 26);
        else if (isdigit(ch)) ascii = int(ch - '0' + 52);
        return ascii;
    }
    // nex[上节点编号][下方连接的字母]=下方连接的字母的节点编号
    void insert(string s) {  // 插入[词]
        int p = 0, len = s.length();
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) nex[p][c] = ++cnt;  // 如果没有，就添加结点
            p = nex[p][c];
            ++exist[p];
        }
        done[p]++; // 记录成为一个[词]
    }
    void insert_whenCount(string s) { // 字典树上计数问题时使用 // 计数
        int p = 0, len = s.length();
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) { // 如果没有，就添加结点
                ++cnt;
                memset(nex[cnt], 0, sizeof nex[cnt]);
                nex[p][c] = cnt;
                compareCnt += exist[p] * (i * 2 + 1);
            }
            else compareCnt += (exist[p] - exist[nex[p][c]]) * (i * 2 + 1);
            ++exist[p]; // 这个时候是当前节点经过多少个词
            p = nex[p][c];
        }
        compareCnt += done[p] * 2 * (len + 1);
        compareCnt += (exist[p] - done[p]) * (len * 2 + 1);
        ++exist[p]; // 这个时候是当前节点经过多少个词
        done[p]++; // 记录成为一个[词]
    }
    ll getCompareCnt() { return compareCnt; }
    int find(string s) {  // 查找[词]
        int p = 0, len = s.length();
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) return 0;
            p = nex[p][c];
        }
        if (done[p]) return exist[p]; // 有这个[词]
        return 0; // 没有这个[词]
    }
    // 查找一条链上有多少个词，即查找词链，eg: i -> int -> intern -> internet 返回4
        // 本质上还是类似于find()函数查找[词]，因为这些词都是已有的，所以到internet(词链最长的单词)时，可以计数完整的词链
    int findWordChains(string s) {
        int p = 0, len = s.length();
        int ans = 0;
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) return 0;
            p = nex[p][c];
            if (done[p]) ans++;
        }
        if (done[p]) return ans;
        return 0;
    }
    // 查找树中与s拥有相同的前缀的[词]的数量luoguP2922
    // insert()函数那，必须是done[p]++，因为插入到树的串可能会重复
    int findMaxPrefix(string s) {
        int p = 0, len = s.length();
        int res = 0;
        for (int i = 0; i < len; i++) {
            int c = getAscii(s[i]);
            if (!nex[p][c]) return res;
            p = nex[p][c];
            res += done[p];
        }
        return res + exist[p] - done[p];
    }
    //int findUnique(string s) { // 查找[词]，并且判断该[词]是否访问过
    //	int p = 0, len = s.length();
    //	for (int i = 0; i < len; i++) {
    //		int c = getAscii(s[i]);
    //		if (!nex[p][c]) return 0;
    //		p = nex[p][c];
    //	}
    //	if (done[p]) { // 有这个[词]
    //		if (vis[p]) return -1; // 重复访问
    //		vis[p] = true;
    //		return exist[p];
    //	}
    //	return 0;
    //}
    int countNode(int node) {
        int cnt = 0;
        for (int i = 0; i < 65; i++) {
            if (nex[node][i]) cnt++;
        }
        return cnt;
    }
};
// 维护异或的字典树
//给定一棵n点的带权树，结点下标1-n。寻找树中找两个结点，求最长异或路径。
//异或路径指的是指两个结点之间唯一路径上的所有边权的异或。
struct xorTrie {
    vector<pair<int, long long> >adj[N];
    int cnt = 0, tot = 1, res = 0;
    int dis[N], ch[N << 5/*N * 32*/][2];

    void insert(int x) {
        for (int i = 30, u = 1; i >= 0; --i) {
            int c = ((x >> i) & 1);  // 二进制一位一位向下取
            if (!ch[u][c]) ch[u][c] = ++tot;
            u = ch[u][c];
        }
    }
    int get(int x) { //  返回最长异或路径
        int ans = 0;
        for (int i = 30, u = 1; i >= 0; --i) {
            int c = ((x >> i) & 1);
            if (ch[u][c ^ 1]) {  // 如果能向和当前位不同的子树走，就向那边走
                u = ch[u][c ^ 1];
                ans |= (1 << i);
            }
            else u = ch[u][c];
        }
        return res = max(res, ans);  // 更新答案
    }
    void add(int u, int v, int w) { adj[u].push_back({ v, w }); }
    void dfs(int u, int fa) {
        insert(dis[u]);
        get(dis[u]);
        for (auto it : adj[u]) {  // 遍历子节点
            int v = it.first;
            long long w = it.second;
            if (v == fa) continue;
            dis[v] = dis[u] ^ w;
            dfs(v, u);
        }
    }
};
// 前缀和KMP
struct PrefixAndKMP
{
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
    int getMinShow(string s) { // 不是最小表示法，从一个字符串中找到最短的子串，这个子串可以循环组成，使原串是这个新串的子串， 例如，cabcabc原串-->abc最短符合子串-->abcabcabc新串
        vector<int>pi = prefix_function(s);
        return s.length() - pi[pi.size() - 1];
    }
    // s的最小周期 是 s.length()-pi[pi.size()-1] 如果求最大周期长度，就是 maxLen = pi[len - 1] , 
    // s寻找一个最短的字符串 t，使得 s 可以被 t 的一份或多份拷贝的拼接表示, eg: cabcabca是abcabcabcabc的子串，可以由abc连接得到，即最短循环长度为3，是abc的长度
    int getMinPeriod(string s) {
        vector<int>pi = prefix_function(s);
        int len = s.length();
        if (!(len % (len - pi[len - 1]))) return len - pi[len - 1];
        else return len;
    }
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
    // 统计每个前缀出现的次数
    vector<int> count_occurrences(vector<int> pi, int len) {
        vector<int> ans(len + 1);
        for (int i = 0; i < len; i++)
            ans[pi[i]]++;
        for (int i = len - 1; i > 0; i--)
            ans[pi[i - 1]] += ans[i];
        for (int i = 0; i <= len; i++)
            ans[i]++;
        return ans;
    }
};
struct Manacher
{
    pair<vector<int>, vector<int> > MANACHER(string s) { // 算法本体
        int len = s.length();
        //string str; // 好像？不用改串？？？-> 哦~，懂了，如过只用一个数组来存回文长度的话就合并， 然后用d1的算法即可 // 如MANACHER2
        //for (int i = 0; i < len; i++) { // eg原串aaa -> #a#a#a
        //	str.push_back('#');
        //	str.push_back(s[i]);
        //}
        //str = "%" + str + "#@"; // 最终变为 %#a#a#a#@
        //len = s.length(); // 更新长度
        // 具体算法
        vector<int> d1(len);
        for (int i = 0, l = 0, r = -1; i < len; i++) {
            int k = (i > r) ? 1 : min(d1[l + r - i], r - i + 1);
            while (0 <= i - k && i + k < len && s[i - k] == s[i + k])
                k++;
            d1[i] = k--;
            if (i + k > r) {
                l = i - k;
                r = i + k;
            }
        }
        vector<int> d2(len);
        for (int i = 0, l = 0, r = -1; i < len; i++) {
            int k = (i > r) ? 0 : min(d2[l + r - i + 1], r - i + 1);
            while (0 <= i - k - 1 && i + k < len && s[i - k - 1] == s[i + k])
                k++;
            d2[i] = k--;
            if (i + k > r) {
                l = i - k - 1;
                r = i + k;
            }
        }
        return { d1, d2 };
    }
    vector<int> MANACHER2(string s) { // 算法本体
        int len = s.length();
        string str; // 好像？不用改串？？？-> 哦~，懂了，如过只用一个数组来存回文长度的话就合并， 然后用d1的算法即可
        for (int i = 0; i < len; i++) { // eg原串aaa -> #a#a#a
            str.push_back('#');
            str.push_back(s[i]);
        }
        str = "%" + str + "#@"; // 最终变为 %#a#a#a#@
        len = str.length(); // 更新长度
        // 具体算法 形如原算法的d1，一致
        vector<int> d(len);
        for (int i = 0, l = 0, r = -1; i < len; i++) {
            int k = (i > r) ? 1 : min(d[l + r - i], r - i + 1);
            while (0 <= i - k && i + k < len && str[i - k] == str[i + k])
                k++;
            d[i] = k--;
            if (i + k > r) {
                l = i - k;
                r = i + k;
            }
        }
        return d;//求最长回文长度就是数组中最大的元素 - 1
    }
    pair<int, int> getMaxOrMinLenOfPalindromeSubstring(string s, bool MaxOrMin) { // 奇 偶 %% true->Max  false->Min
        pair<vector<int>, vector<int> >pv = MANACHER(s);
        vector<int>d1 = pv.first;
        vector<int>d2 = pv.second;
        int Odd = 0, Even = 0;
        if (MaxOrMin) {
            for (auto x : d1) Odd = max(Odd, x);
            for (auto x : d2) Even = max(Even, x);
        }
        else {
            for (auto x : d1) if (x) Odd = min(Odd, x);
            for (auto x : d2) if (x) Even = min(Even, x);
        }
        Odd = Odd * 2 - 1;
        Even = Even * 2;
        return { Odd ,Even };
    }
    int getMinLenToAddChTOPalindrome(string s) { // 在一个串右边的最少添加多少个字符以使得新串回文
        pair<vector<int>, vector<int> >pv = MANACHER(s);
        vector<int>d1 = pv.first;
        vector<int>d2 = pv.second;
        int Odd = 0, Even = 0;
        for (int i = 0; i < d1.size(); i++)
            if (d1[i] + i == s.length()) // 当前串回文的长度加上本来的长度 == 原长
                Odd = max(Odd, d1[i]);
        for (int i = 0; i < d2.size(); i++)
            if (d2[i] + i == s.length())
                Even = max(Even, d2[i]);
        Odd = Odd * 2 - 1;
        Even = Even * 2;
        return s.length() - max(Odd, Even); // 如果求的是最大后缀回文的话，返回max(Odd, Even)即可
    }
};
// 最小表示法
ll minn_show(vector<ll> sec, string s) {
    ll k = 0, i = 1, j = 2;
    // 破环成链
    int n = s.length();
    rep(i, 0, n - 1, 1) sec[n + i] = sec[i];
    while (k < n && i < n && j < n) {
        for (k = 0; k < n && sec[(i + k) % n] == sec[(j + k) % n]; k++)
            ;
        sec[(i + k) % n] > sec[(j + k) % n] ? i = i + k + 1 : j = j + k + 1;
        if (i == j) i++;
    }
    return min(i, j);
}
// AC自动机
struct AC {
    int tr[N][26], tot;
    int e[N], fail[N];
    void insert(string s) {
        int u = 0;
        for (int i = 0; i < s.length(); i++) {
            if (!tr[u][s[i] - 'a']) tr[u][s[i] - 'a'] = ++tot;  // 如果没有则插入新节点
            u = tr[u][s[i] - 'a'];                              // 搜索下一个节点
        }
        e[u]++;  // 尾为节点 u 的串的个数
    }
    void build() {
        queue<int> q;
        for (int i = 0; i < 26; i++)
            if (tr[0][i]) q.push(tr[0][i]);
        while (q.size()) {
            int u = q.front();
            q.pop();
            for (int i = 0; i < 26; i++) {
                if (tr[u][i]) {
                    fail[tr[u][i]] =
                        tr[fail[u]][i];  // fail数组：同一字符可以匹配的其他位置
                    q.push(tr[u][i]);
                }
                else tr[u][i] = tr[fail[u]][i];
            }
        }
    }
    int query(string s) {
        int u = 0, res = 0;
        for (int i = 0; i < s.length(); i++) {
            u = tr[u][s[i] - 'a'];  // 转移
            for (int j = u; j && e[j] != -1; j = fail[j])
                res += e[j], e[j] = -1;
        }
        return res;
    }
};
// 后缀自动机
struct SAM {
    // 每次End 是代表新产生的位置的作用点
// 新创建的数组要清空
    //const int Max = ((1e5 + 5) * 2); // M节点数量,字符串长度的两倍
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
    void clear() { // 1为root
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
                int nq = newnod(); mxlen[nq] = mxlen[p] + 1; // nq是新产生的分叉点
                memcpy(ch[nq], ch[q], sizeof(ch[q]));
                par[nq] = par[q], par[End] = par[q] = nq;
                for (; ch[p][c] == q; p = par[p]) ch[p][c] = nq;
            }
        }
    }
    void build() {//倒叙循环满足拓扑
        static int cnt[M];
        rep(i, 0, tot + 1, 1) cnt[i] = 0;
        rep(i, 1, tot + 1, 1) cnt[mxlen[i]]++;
        rep(i, 1, tot + 1, 1) cnt[i] += cnt[i - 1];
        fep(i, tot, 1, 1) tp[cnt[mxlen[i]]--] = i;
    }

};
// 回文树查询回文子串出现次数
struct PAM {
    int sz, tot, last;
    int cnt[N], ch[N][26], len[N], fail[N];
    char s[N];

    int node(int l) {  // 建立一个新节点，长度为 l
        sz++;
        memset(ch[sz], 0, sizeof(ch[sz]));
        len[sz] = l;
        fail[sz] = cnt[sz] = 0;
        return sz;
    }
    void clear() {  // 初始化
        sz = -1;
        last = 0;
        s[tot = 0] = '$';
        node(0); node(-1);
        fail[0] = 1;
    }
    int getfail(int x) {  // 找后缀回文
        while (s[tot - len[x] - 1] != s[tot]) x = fail[x];
        return x;
    }
    void insert(char c, int i) {  // 建树
        s[++tot] = c;
        int now = getfail(last);
        if (!ch[now][c - 'a']) {
            int x = node(len[now] + 2);
            fail[x] = ch[getfail(fail[now])][c - 'a'];
            ch[now][c - 'a'] = x;
        }
        last = ch[now][c - 'a'];
        //if (i > n)// 若破链成环
        cnt[last]++;
    }
    long long solve() {
        long long ans = 0;
        for (int i = sz; i >= 0; i--) {
            cnt[fail[i]] += cnt[i];
        }
        for (int i = 2; i <= sz; i++) {  // 更新答案
            //if (len[i] > n) continue;// 若破链成环
            ans = (ans + (((1ll) * len[i] * cnt[i]) % MODE) * cnt[i]) % MODE;

        }
        return ans;
    }
};
//Lyndon 分解
struct Lyndon
{
    //s 的字典序严格小于 s 的所有后缀的字典序，我们称 s 是Lyndon 串。
    //例，a,b,ab,aab,abb,ababb,abcd 都是 Lyndon 串
    vector<int> duval_getRightPoint(string const& s) { // 下标从 1 开始
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
                lyndon.push_back(s.substr(i, j - k)); // Lyndon串
                i += j - k;
                right_point.push_back(i);
            }
        }
        //return lyndon;
        return right_point;
    }
    //求这个字符串的所有前缀字符串中的最大字典序子串
    //子串的左端点就是数组 l[]
    //可以证明其右端点就是 子串最右端 即 i
    vector<int> duval_getMaxOrderSubstringLeftPoint(string const& s) {
        int len = s.size(), i = 1;
        vector<int>l(len + 5);
        while (i < len) {
            int j = i + 1, k = i;
            if (!l[i]) l[i] = i;
            //cout << i << ' ';
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
    // 最小表示法
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

void solve() {

	

	
	

}


signed main() {
	ios::sync_with_stdio(false);
	cin.tie(0);
	cout.tie(0);

	//freopen("wrt.in", "r", stdin);
	//freopen("out.out", "w", stdout);

	signed T = 1;
	//scanf("%d", &T);
	//cin >> T;
	while (T--) {
		solve();
	}
	return 0;
}