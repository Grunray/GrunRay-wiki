"""骨架 DFS 巡游 → 少量粗路径，验证覆盖率。"""
from collections import defaultdict, deque
from PIL import Image, ImageDraw
import numpy as np
from skimage.morphology import medial_axis

PNG = r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png"
img = Image.open(PNG).convert("RGBA")
alpha = np.array(img)[..., 3]
sil = alpha > 40
H, W = sil.shape
skel, dist = medial_axis(sil, return_distance=True)
SW = int(2 * dist.max() + 16)  # 过冲由 PNG mask 裁
print("max r", dist.max(), "stroke", SW)

# 去掉四角伪影（旋转裁边留下的小方块）
skel = skel.copy()
for (cx, cy) in [(0,0),(W-1,0),(0,H-1),(W-1,H-1)]:
    skel[max(0,cy-12):cy+13, max(0,cx-12):cx+13] = False

ys, xs = np.where(skel)
pts = list(zip(xs.tolist(), ys.tolist()))
pset = set(pts)
nbr8 = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def neighbors(p):
    x, y = p
    return [(x+dx, y+dy) for dx, dy in nbr8 if (x+dx, y+dy) in pset]

adj = {p: neighbors(p) for p in pts}
origin = min(pts, key=lambda p: (p[0]-(W-8))**2 + (p[1]-(H-8))**2)

# 连通分量，主分量含 origin
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
comps.sort(key=lambda c: (0 if origin in c else 1, -len(c)))
print("components", [(len(c), origin in c) for c in comps[:6]], "total", len(comps))

def euler_from(start, allowed):
    """无向图 DFS 欧拉巡游（每条边走两次：去+回）。"""
    tour = [start]
    stack = [(start, 0)]  # node, next-neighbor index
    used_dir = set()  # (a,b) directed
    while stack:
        u, i = stack[-1]
        nbrs = [v for v in adj[u] if v in allowed]
        if i >= len(nbrs):
            stack.pop()
            if stack:
                tour.append(stack[-1][0])  # backtrack
            continue
        stack[-1] = (u, i+1)
        v = nbrs[i]
        if (u, v) in used_dir:
            continue
        used_dir.add((u, v))
        used_dir.add((v, u))
        tour.append(v)
        stack.append((v, 0))
    return tour

def simplify(chain, step=3):
    if len(chain) <= 2:
        return chain
    out = chain[::step]
    if out[-1] != chain[-1]:
        out.append(chain[-1])
    return out

def to_d(seq):
    x0, y0 = seq[0]
    d = f"M {x0},{y0}"
    for x, y in seq[1:]:
        d += f" L {x},{y}"
    return d

# 主分量一条巡游；其余较大分量各自一条（按离 origin 的距离排 delay）
paths = []
for comp in comps:
    if len(comp) < 20:
        continue
    allowed = set(comp)
    st = origin if origin in allowed else min(comp, key=lambda p: (p[0]-origin[0])**2+(p[1]-origin[1])**2)
    tour = euler_from(st, allowed)
    simp = simplify(tour, 3)
    paths.append((st, simp))
    print(f"path start={st} tour={len(tour)} simp={len(simp)}")

# 覆盖率
cover = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(cover)
for _, seq in paths:
    dr.line(seq, fill=255, width=SW, joint="curve")
    r = SW // 2
    for x, y in (seq[0], seq[-1]):
        dr.ellipse((x-r, y-r, x+r, y+r), fill=255)
cov = np.array(cover) > 128
print(f"coverage {(sil&cov).sum()/sil.sum()*100:.1f}%  missed {(sil & ~cov).sum()}")

vis = np.zeros((H, W, 3), np.uint8)
vis[:] = (244, 241, 232)
vis[sil & cov] = (46, 107, 79)
vis[sil & ~cov] = (200, 40, 40)
Image.fromarray(vis).save(r"e:\Project\GrunRay_wiki\designed\hover-options\coverage.png")

print("---D---")
for i, (st, seq) in enumerate(paths):
    print(f"PATH {i} n={len(seq)}")
    print(to_d(seq))
