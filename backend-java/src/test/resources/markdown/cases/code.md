C++：

```cpp
#include <bits/stdc++.h>
using namespace std;
typedef long long ll;
const int N = 1e5 + 10;  // 上限

/* 多行
   注释 */
template <typename T>
struct Node {
    int val;
    vector<int> adj;
};

int gcd(int a, int b) {
    return b == 0 ? a : gcd(b, a % b);
}

int main() {
    ios::sync_with_stdio(false);
    size_t n = 0x1F;
    double x = 3.14f;
    char c = '\n';
    string s = "a\"b\t";
    for (int i = 0; i < n; ++i) {
        if (i & 1) continue;
        cout << s << endl;
    }
    return 0;
}
```

JavaScript：

```js
const re = /a+b/g;
let total = 0;
function add(a, b) {
  return `${a} + ${b} = ${a + b}`;
}
const f = (x) => x * 2; // 箭头
console.log(add(1, 2), re.test('aab'), null, undefined);
```

Bash：

```bash
#!/usr/bin/env bash
export NAME="契约"
for f in *.md; do
  echo "$f ${NAME}" | wc -l   # 统计
done
```

纯文本：

```text
plain <text> & "quotes"
```

不写语言：

```
no language
  keep indent
```

Python：

```python
@decorator
def f(x: int = 1, *args, **kwargs) -> str:
    """文档字符串"""
    name = f"v{x:02d}"
    return name if x else None  # 注释
```

未知语言按纯文本：

```nosuchlang
keep <as> & text
```

波浪线围栏：

~~~cpp
int x = 1;
~~~

缩进代码块：

    int y = 2;
    y++;

缩进代码块带语言头：

    :::cpp
    int z = 3;
