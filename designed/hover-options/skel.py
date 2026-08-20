"""从花藤剪影提取骨架路径，按从右下角出发的连通顺序排列。"""
from collections import defaultdict, deque
from PIL import Image
import numpy as np

PNG = r"e:\Project\GrunRay_wiki\designed\hover-options\flower-vine.png"
img = Image.open(PNG).convert("RGBA")
alpha = np.array(img)[..., 3]
sil = alpha > 40
H, W = sil.shape
print("size", W, H, "sil px", sil.sum())

from skimage.morphology import medial_axis
skel, dist = medial_axis(sil, return_distance=True)
print("skel px", skel.sum(), "max radius", dist.max())

# 8-邻接骨架图
ys, xs = np.where(skel)
pts = list(zip(xs.tolist(), ys.tolist()))
pset = set(pts)
nbrs = [(-1,-1),(-1,0),(-1,1),(0,-1),(0,1),(1,-1),(1,0),(1,1)]

def neighbors(p):
    x, y = p
    out = []
    for dx, dy in nbrs:
        q = (x+dx, y+dy)
        if q in pset:
            out.append(q)
    return out

deg = {p: len(neighbors(p)) for p in pts}

# 起点：最靠近右下角的骨架点
origin = (W-8, H-8)
start = min(pts, key=lambda p: (p[0]-origin[0])**2 + (p[1]-origin[1])**2)
print("start", start, "deg", deg[start])

# 提取链：从端点/起点走，在分叉处断开
def walk_chain(src, used):
    chain = [src]
    used.add(src)
    prev = None
    cur = src
    while True:
        nxts = [q for q in neighbors(cur) if q != prev and q not in used]
        if not nxts:
            break
        # 分叉：只走一度，留给其他链
        if len(nxts) > 1 and len(chain) > 1:
            break
        nxt = nxts[0]
        if deg[cur] > 2 and len(chain) > 1:
            # 已经走到一个新的分叉节点，收下它然后停
            chain.append(nxt)
            used.add(nxt)
            break
        chain.append(nxt)
        used.add(nxt)
        prev, cur = cur, nxt
    return chain

used = set()
chains = []

# 先从起点拉出主干
chains.append(walk_chain(start, used))

# 反复从已访问点的未访问邻居长出新枝（保证每条新枝都接在已画部分上）
changed = True
while changed:
    changed = False
    # 优先：已访问的分叉点
    frontier = [p for p in used for q in neighbors(p) if q not in used]
    if not frontier:
        # 孤岛：从剩余点里找离已访问最近的
        rest = [p for p in pts if p not in used]
        if not rest:
            break
        if used:
            seed = min(rest, key=lambda p: min((p[0]-u[0])**2+(p[1]-u[1])**2 for u in used))
        else:
            seed = rest[0]
        chains.append(walk_chain(seed, used))
        changed = True
        continue
    seed = frontier[0]
    chains.append(walk_chain(seed, used))
    changed = True

# 丢掉太短的噪声链，但保留 >= 4 的
chains = [c for c in chains if len(c) >= 4]
print("chains", len(chains), "covered skel", sum(len(c) for c in chains), "/", skel.sum())

# 简化折线：每 3 像素取一点
def simplify(chain, step=3):
    out = chain[::step]
    if out[-1] != chain[-1]:
        out.append(chain[-1])
    return out

# 按时序：主干（最长且含 start）先，其余按起点到 start 的距离
def chain_key(c):
    return (0 if start in c else 1, min((p[0]-start[0])**2+(p[1]-start[1])**2 for p in c), -len(c))

chains.sort(key=chain_key)

# 输出 SVG path d
def to_d(pts):
    x0, y0 = pts[0]
    d = f"M {x0},{y0}"
    for x, y in pts[1:]:
        d += f" L {x},{y}"
    return d

# stroke-width = 2*max_radius + 余量，过冲由 PNG mask 裁掉
sw = int(2 * dist.max() + 12)
print("stroke-width", sw)

print("---PATHS---")
for i, c in enumerate(chains):
    s = simplify(c, 4)
    print(f"{i:02d} n={len(s):3d} start={s[0]} end={s[-1]}")
    print(to_d(s))
