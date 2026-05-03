---
title: 洛谷 P1347 题解
slug: algorithm-luogu-p1347
type: algorithm
tags:
- 图论
- 拓扑排序
- 洛谷
summary: 使用拓扑排序处理字母顺序关系，讨论矛盾检测、顺序确定与无法确定三类情况。
locale: zh
pinned: false
pinned_order: 9999
published_at: '2024-07-26T11:06:58'
updated_at: '2024-07-26T11:06:58'
difficulty: medium
series: OJ 题解
---

洛谷题目链接[P1347](https://www.luogu.com.cn/problem/P1347)

## 看题

### 数据范围
        这道题给的数据范围很小，所以支持一通乱搞。

### 读题并且看样例
        发现题目给你了这些字母的对应关系，要你判断给出的关系是否能确定这些字母的顺序。很明显，有三种情况：1.能从第 x 个关系中确定关系；2.在第 x 个关系中发现矛盾点；3.给出的关系不能确定顺序。

## 分析
        要从这些关系之间找到字母顺序，顺序从小到大，要找顺序，那很容易就能想到拓扑排序，再看题目，发现这些关系可以转化为有向无环图中的关系，比如关系A<B，可以转化为图中A->B

## 拓扑排序的板子

```cpp
vector<vector<int> > adj; // 邻接表
int in[N];  // 存储每个结点的入度

bool toposort() {

	vector<int> L;
	queue<int> S;
	//预处理：把入度为0的点都放进去
	for (int i = 1; i <= n; i++)
		if (!in[i]) 
			S.push(i);

	while (!S.empty()) {
		int u = S.front(); S.pop();
		L.push_back(u);
		for (auto v : adj[u])
			if (!--in[v]) // 将当前点所有的出边的终点入度-1    如果 入度 = 0 则入队
				S.push(v);
	}

	if (L.size() == n) { // 当所有点都遍历了
		for (auto i : L) cout << i << ' ';
		return true;
	}
	else 
		return false;
}
void solve() {

	cin >> n >> m; // n个点，m条边

	adj.resize(n + 1);

	int u, v;
    for(int i = 1; i <= m; i++){
		cin >> u >> v;
		adj[u].push_back(v);
		in[v]++;
	}
	
	toposort();

}
```

## 处理数据

### 预处理
        入度初始化为-1的原因在处理入度那有详细解释

```cpp
adj.resize(n + 5);
memset(in, -1, sizeof in);
```

### 处理输入
        用三个字符变量分别存  字母(x) <小于符号(ch) 字母(y) （也可以用字符串读一行）

```cpp
cin >> x >> ch >> y;
u = x - 'A' + 1;
v = y - 'A' + 1;
```

### 建图
        用邻接表存，u是有向边的起点，v是有向边的终点

```cpp
adj[u].push_back(v);
```

### 处理入度
        因为是边输入关系边拓扑，有些关系的数据不能从一开始就全部输入进去，在拓扑排序的函数中（toposort()函数），会将所有入度为0的点都放进 待处理队列S 中，这样会造成存 顺序的数组L 的大小始终为n(点的个数)。但是初始化为-1，在输入这两个点的时候，再赋值为0，就可以避免这个问题。

```cpp
if (in[u] == -1) in[u] = 0;
if (in[v] == -1) in[v] = 0;
in[v]++;
```

### 拓扑函数中
        另开一个用于 记录入度的数组inn 的原因： 拓扑排序里面会减掉数组中的点的入度，会对原有入度数据造成影响，并且是多次进行拓扑排序。然后用一个数组res记录确定顺序后的字母顺序（用数字记录）。
 
## 错误思路
        一开始想的是，数据范围很小，乱搞搞也能过， 并且要判断是否成环，就将并查集查环的板子给贴上去，然后处理一下数据，判断一下第二种情况就行了。但是测完样例之后交上去，10分，把第二种情况注释掉再交，30分，我就知道不能这样搞了。

## 调整思路（但不完全）
        要判断是否成环，我将每次拓扑中访问的点的个数记录下来，再和已经有了的点的个数进行比较，如果不相等，就说明成环了。用STL中的模板set来存储目前字母（点）个数(set可以去重)，然后再每次拓扑排序中用一个计数器记录访问了的点的个数。

```cpp
//每次把起点和终点加进去
point.insert(u);
point.insert(v);
#define rep(i,a,b) for(int i = (a); i <= (b); ++i)
int toposort() {

	cnt = 0;

	vector<int>L;
	queue<int>S;

	rep(i, 1, n) 
		inn[i] = in[i];

	rep(i, 1, n) {
		if (!inn[i]) {
			S.push(i);
			cnt++; // 计数器++
		}
	}

	while (!S.empty()) {

		int u = S.front(); S.pop();

		L.push_back(u);

		for (auto v : adj[u])
			if (!--inn[v]) {
				S.push(v);
				cnt++; // 计数器++
			}
	}

	if (L.size() == n) {
		res = L;
		return 1;
	}
	if (point.size() != cnt) 
		return 2;

	return 0;
}
```

加上判断之后交上去，发现80分，看了还有某种情况没处理对。

## 再调整思路
        发现，有这样一个情况，多个点的出度都为0的时候，是不能确定顺序的，所以加上一个out数组，用于记录出度，处理方式和入度数组in一样。拓扑中每次判断出度为0的点是否唯一即可。

```cpp
int t = 0;
rep(i, 1, n)
	if (!out[i])
		t++;
```

        交上去，90，我#￥%……&。

## 再再调整思路
        发现，我忽略了自成环的情况，即关系A<A这种情况。所以改变处理输入的方式。

将输入存下来，遇到自成环的情况直接输出矛盾即可。

```cpp
rep(i, 1, m) {
	cin >> x >> ch >> y;

	if (x == y) {
		std::cout << "Inconsistency found after " << i << " relations.\n";
		return;
	}

	vp[i].first = x - 'A' + 1;
	vp[i].second = y - 'A' + 1;
}
```

        交上去，AC了。

## 总结
        这是一道绿题，比较考思维，处理输入，建图，处理入度，还有成环的判断，都需要考虑完全。

## 附上AC代码

```cpp
#define _CRT_SECURE_NO_WARNINGS
#define itn int
#define PII pair<int, int>
#define PLI pair<long long, int>
#define fep(i,a,b) for(int i = (a); i >= (b); --i)
#define rep(i,a,b) for(int i = (a); i <= (b); ++i)
#include<bits/stdc++.h>
using ll = long long;
using ldou = long double;
using unll = unsigned long long;
using namespace std;

//////////////////////////////////////////////////////////////////////////////////

unll n, m, k;
const int N = 1005;
const int dx[4] = { 1,-1, 0, 0 };
const int dy[4] = { 0, 0, 1,-1 };
//priority_queue<unll, vector<unll>, greater<unll> >pq;

vector<vector<int> >adj; // 邻接矩阵存图
int in[N]; // 入度
int out[N]; // 出度

vector<PII>vp; // 用pair存下题目给定的关系
vector<int>res; // 存成功确定顺序后的字母
set<int>point; // 用来存储目前字母（点）个数

int cnt; // 用于记录拓扑排序里面点的访问个数
int inn[N];// 另开一个用于记录入度的数组的原因： 拓扑排序里面会减掉数组中的点的入度

// 拓扑的板子 不同于板子的地方 用  //******  做标记
int toposort() { 

	cnt = 0;//******

	int t = 0;//******
	rep(i, 1, n)
		if (!out[i])
			t++; // 每一次出度为0的点的个数应该为1，这样才能严格确定顺序

	vector<int>L;
	queue<int>S;

	rep(i, 1, n) inn[i] = in[i];//******

	rep(i, 1, n) {
		if (!inn[i]) {
			S.push(i);
			cnt++;//******
		}
	}

	while (!S.empty()) {

		int u = S.front(); S.pop();

		L.push_back(u);

		for (auto v : adj[u])
			if (!--inn[v]) {
				S.push(v);
				cnt++;//******
			}
	}

	if (L.size() == n && t == 1) {//******
		res = L;//******
		/*for (auto u : L) cout << u << ' ';
		cout << '\n';*/
		return 1;
	}
	if (point.size() != cnt) return 2;//******

	//point.clear();
	return 0;
}

void solve() {

	cin >> n >> m;

	adj.resize(n + 5);
	vp.resize(m + 5);
	memset(in, -1, sizeof in);
	memset(out, -1, sizeof out);

	char x, y, ch;
	int u, v;

	rep(i, 1, m) {
		cin >> x >> ch >> y;

		if (x == y) {
			std::cout << "Inconsistency found after " << i << " relations.\n";
			return;
		}

		vp[i].first = x - 'A' + 1;
		vp[i].second = y - 'A' + 1;
	}

	rep(i, 1, m) {

		u = vp[i].first;
		v = vp[i].second;

		point.insert(u);
		point.insert(v);

		adj[u].push_back(v);

		if (in[u] == -1) in[u] = 0;
		if (in[v] == -1) in[v] = 0;
		in[v]++;

		if (out[u] == -1) out[u] = 0;
		if (out[v] == -1) out[v] = 0;
		out[u]++;

		if (toposort() == 1) {
			std::cout << "Sorted sequence determined after " << i << " relations: ";
			for (int j = 0; j < res.size(); j++)
				std::cout << char(res[j] - 1 + 'A');
			std::cout << ".\n";
			return;
		}
		else if (toposort() == 2) {
			std::cout << "Inconsistency found after " << i << " relations.\n";
			return;
		}
	}

	std::cout << "Sorted sequence cannot be determined.\n";

}

signed main() {
	//std::ios::sync_with_stdio(false), std::cin.tie(0), std::cout.tie(0);
	//freopen("wrt.txt", "r", stdin); //freopen("out.txt", "w", stdout);
	int TTT = 1; //cin >> TTT;
	while (TTT--) {
		solve();
	}
	/*while (cin >> n >> m) {
		solve();
	}*/

	return 0;
}
```