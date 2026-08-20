"""生成无回描的骨架路径 + delay，写入 grow-paths.svg 片段。"""
from collections import defaultdict, deque
from PIL import Image, ImageDraw
import numpy as np
from skimage.morphology import medial_axis

PNG = r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png"
OUT = r"e:\Project\GrunRay_wiki\designed\hover-options\grow-paths.txt"

img = Image.open(PNG).convert("RGBA")
alpha = np.array(img)[..., 3]
sil = alpha > 40
H, W = sil.shape
skel, dist = medial_axis(sil, return_distance=True)
SW = int(2 * dist.max() + 18)

skel = skel.copy()
for (cx, cy) in [(0,0),(W-1,0),(0,H-1),(W-1,H-1)]:
    skel[max(0,cy-14):cy+15, max(0,cx-14):cx+15] = False

ys, xs = np.where(skel)
pts = list(zip(xs.tolist(), ys.tolist()))
pset = set(pts)
nbr8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def neighbors(p):
    x, y = p
    return [(x+dx, y+dy) for dx, dy in nbr8 if (x+dx, y+dy) in pset]

adj = {p: neighbors(p) for p in pts}

# 先找最大连通分量，再在其中取最靠近右下角的点当起点
seen = set()
comps = []
for p in pts:
    if p in seen:
        continue
    q = deque([p])
    seen.add(p)
    comp = [p]
    while q:
        u = q.popleft()
        for v in adj[u]:
            if v not in seen:
                seen.add(v)
                q.append(v)
                comp.append(v)
    comps.append(comp)
main_list = max(comps, key=len)
main = set(main_list)
origin = min(main_list, key=lambda p: (p[0]-(W-8))**2 + (p[1]-(H-8))**2)
print("main", len(main), "origin", origin)

# 生成树 + 测地距离
parent = {origin: None}
gdist = {origin: 0}
q = deque([origin])
while q:
    u = q.popleft()
    for v in adj[u]:
        if v in main and v not in parent:
            parent[v] = u
            gdist[v] = gdist[u] + 1
            q.append(v)
maxd = max(gdist.values())

# 子节点
children = defaultdict(list)
for v, p in parent.items():
    if p is not None:
        children[p].append(v)

# 贪心路径覆盖：反复取剩余树中最长根向路径
remaining_children = {k: list(v) for k, v in children.items()}

def longest_from(u):
    best = [u]
    for c in remaining_children.get(u, []):
        cand = longest_from(c)
        if len(cand) > len(best) - 1:
            best = [u] + cand
    return best

def consume(path):
    for a, b in zip(path, path[1:]):
        if b in remaining_children.get(a, []):
            remaining_children[a].remove(b)

paths = []
# 第一条：从 origin 出发的最长路（主干）
root_path = longest_from(origin)
consume(root_path)
paths.append((0, root_path))

# 其余：每个还有子节点的节点，抽出最长剩余枝
changed = True
while changed:
    changed = False
    # 按测地距离近的先抽，这样 delay 自然
    nodes = sorted(
        [n for n, ch in remaining_children.items() if ch],
        key=lambda n: gdist.get(n, 10**9),
    )
    if not nodes:
        break
    u = nodes[0]
    c = remaining_children[u][0]
    branch = [u] + longest_from(c)
    consume(branch)
    delay = gdist[u] / maxd  # 0..1
    paths.append((delay, branch))
    changed = True

# 丢掉极短枝
paths = [(d, p) for d, p in paths if len(p) >= 8]
print("paths", len(paths), "main len", len(paths[0][1]), "maxd", maxd)

def simplify(chain, step=2):
    out = chain[::step]
    if out[-1] != chain[-1]:
        out.append(chain[-1])
    return out

def to_d(seq):
    x0, y0 = seq[0]
    parts = [f"M {x0},{y0}"]
    for x, y in seq[1:]:
        parts.append(f"L {x},{y}")
    return " ".join(parts)

# 覆盖率
cover = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(cover)
for _, chain in paths:
    seq = simplify(chain, 2)
    dr.line(seq, fill=255, width=SW, joint="curve")
    r = SW // 2
    dr.ellipse((seq[0][0]-r, seq[0][1]-r, seq[0][0]+r, seq[0][1]+r), fill=255)
    dr.ellipse((seq[-1][0]-r, seq[-1][1]-r, seq[-1][0]+r, seq[-1][1]+r), fill=255)

# 其它较大分量（花穗孤岛等）也画上，delay 按到 origin 的欧氏距离
rest_pts = [p for p in pts if p not in main]
# 分分量
rest_seen = set()
extra = []
nbr = neighbors
for p in rest_pts:
    if p in rest_seen:
        continue
    q = deque([p])
    rest_seen.add(p)
    comp = [p]
    while q:
        u = q.popleft()
        for v in neighbors(u):
            if v not in rest_seen and v not in main:
                rest_seen.add(v)
                q.append(v)
                comp.append(v)
    if len(comp) < 40:
        continue
    # 从离 origin 最近的点做最长链（简易）
    st = min(comp, key=lambda p: (p[0]-origin[0])**2+(p[1]-origin[1])**2)
    cset = set(comp)
    # BFS path covering 简化：从 st 做生成树再抽最长
    par = {st: None}
    qq = deque([st])
    while qq:
        u = qq.popleft()
        for v in neighbors(u):
            if v in cset and v not in par:
                par[v] = u
                qq.append(v)
    # 最长
    def depth_path(u):
        kids = [k for k, pv in par.items() if pv == u]
        best = [u]
        for k in kids:
            cand = depth_path(k)
            if len(cand) + 1 > len(best):
                best = [u] + cand
        return best
    chain = depth_path(st)
    if len(chain) >= 8:
        delay = min(0.85, np.hypot(st[0]-origin[0], st[1]-origin[1]) / 400)
        extra.append((delay, chain))

paths.extend(extra)
print("with extra", len(paths))

cover = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(cover)
for _, chain in paths:
    seq = simplify(chain, 2)
    dr.line(seq, fill=255, width=SW, joint="curve")
    r = SW // 2
    dr.ellipse((seq[0][0]-r, seq[0][1]-r, seq[0][0]+r, seq[0][1]+r), fill=255)
    dr.ellipse((seq[-1][0]-r, seq[-1][1]-r, seq[-1][0]+r, seq[-1][1]+r), fill=255)
cov = np.array(cover) > 128
print(f"coverage {(sil&cov).sum()/sil.sum()*100:.1f}% missed {(sil&~cov).sum()}")

vis = np.zeros((H, W, 3), np.uint8)
vis[:] = (244, 241, 232)
vis[sil & cov] = (46, 107, 79)
vis[sil & ~cov] = (200, 40, 40)
Image.fromarray(vis).save(r"e:\Project\GrunRay_wiki\designed\hover-options\coverage.png")

# 写出 path 标签
lines = []
for i, (delay, chain) in enumerate(paths):
    seq = simplify(chain, 2)
    cls = "grow grow-main" if i == 0 else "grow grow-br"
    delay_s = 0 if i == 0 else round(0.15 + delay * 0.7, 3)
    lines.append(
        f'<path class="{cls}" pathLength="100" style="--grow-delay:{delay_s}s" d="{to_d(seq)}" />'
    )
OUT_HTML = "\n".join(lines)
open(OUT, "w", encoding="utf-8").write(OUT_HTML)
print("wrote", OUT, "chars", len(OUT_HTML), "stroke", SW)
print("delays", [round(0 if i==0 else 0.15+d*0.7, 3) for i,(d,_) in enumerate(paths)][:12], "...")
