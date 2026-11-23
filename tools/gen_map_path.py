"""在地图路面掩码上生成小人行走折线：逐段 Dijkstra + 压路校验的视线简化。

输出 mapLayout.ts 的 PATH / STOPS 片段。
"""
import sys
from collections import deque

import heapq
import numpy as np
from PIL import Image

sys.setrecursionlimit(20000)

IMG = '/home/ubuntu/eatplanhq/public/map-town.webp'
CELL = 6

im = np.array(Image.open(IMG).convert('RGB')).astype(int)
H, W, _ = im.shape
R, G, B = im[..., 0], im[..., 1], im[..., 2]

cream = (R > 185) & (G > 165) & (B > 105) & (B < 245) & (G > B)  # 石板路 / 沙地 / 广场
wood = (R > 140) & (G > 80) & (G < 175) & (B < 130) & (R > B + 55)  # 木栈桥
road = cream | wood


def dilate(mask, times=1):
    m = mask.copy()
    for _ in range(times):
        o = m.copy()
        o[1:, :] |= m[:-1, :]
        o[:-1, :] |= m[1:, :]
        o[:, 1:] |= m[:, :-1]
        o[:, :-1] |= m[:, 1:]
        m = o
    return m


road = dilate(road, 3)

gh, gw = H // CELL, W // CELL
grid0 = np.zeros((gh, gw), dtype=bool)
for gy in range(gh):
    for gx in range(gw):
        grid0[gy, gx] = road[gy * CELL:(gy + 1) * CELL, gx * CELL:(gx + 1) * CELL].mean() > 0.45

# 只保留最大连通路面
lab = -np.ones((gh, gw), dtype=int)
sizes = []
cid = 0
for y0 in range(gh):
    for x0 in range(gw):
        if grid0[y0, x0] and lab[y0, x0] < 0:
            q = deque([(y0, x0)])
            lab[y0, x0] = cid
            n = 0
            while q:
                cy, cx = q.popleft()
                n += 1
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < gh and 0 <= nx < gw and grid0[ny, nx] and lab[ny, nx] < 0:
                            lab[ny, nx] = cid
                            q.append((ny, nx))
            sizes.append(n)
            cid += 1
MAIN = int(np.argmax(sizes))
grid = lab == MAIN
print(f'最大连通路面: {sizes[MAIN]} 格（共 {len(sizes)} 块）')


def to_cell(pct):
    return (min(gh - 1, int(pct[1] / 100 * H) // CELL), min(gw - 1, int(pct[0] / 100 * W) // CELL))


def to_pct(cell):
    return (round((cell[1] + 0.5) * CELL * 100 / W, 1), round((cell[0] + 0.5) * CELL * 100 / H, 1))


def nearest_open(pct, radius=24):
    y, x = to_cell(pct)
    best, bd = None, 10**9
    for yy in range(max(0, y - radius), min(gh, y + radius + 1)):
        for xx in range(max(0, x - radius), min(gw, x + radius + 1)):
            if grid[yy, xx]:
                d = (yy - y) ** 2 + (xx - x) ** 2
                if d < bd:
                    bd, best = d, (yy, xx)
    return best


NB = [(-1, 0, 1), (1, 0, 1), (0, -1, 1), (0, 1, 1),
      (-1, -1, 1.414), (-1, 1, 1.414), (1, -1, 1.414), (1, 1, 1.414)]


def dijkstra(src, dst):
    dist = {src: 0.0}
    prev = {}
    pq = [(0.0, src)]
    while pq:
        d, cur = heapq.heappop(pq)
        if cur == dst:
            break
        if d > dist.get(cur, 1e18):
            continue
        for dy, dx, c in NB:
            ny, nx = cur[0] + dy, cur[1] + dx
            if not (0 <= ny < gh and 0 <= nx < gw) or not grid[ny, nx]:
                continue
            nd = d + c
            if nd < dist.get((ny, nx), 1e18):
                dist[(ny, nx)] = nd
                prev[(ny, nx)] = cur
                heapq.heappush(pq, (nd, (ny, nx)))
    if dst not in dist:
        return None
    out = [dst]
    cur = dst
    while cur != src:
        cur = prev[cur]
        out.append(cur)
    return out[::-1]


def on_road(pct, sub=6):
    """按百分比坐标判断是否落在可走路面（带邻域容差）。"""
    y, x = to_cell(pct)
    return 0 <= y < gh and 0 <= x < gw and bool(grid[y, x])


def line_ok(a, b, steps=80):
    for t in np.linspace(0, 1, steps):
        p = (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
        if not on_road(p):
            return False
    return True


def simplify(pts):
    """视线简化：保留能直连且全程压在路面上的最远点。"""
    out = [pts[0]]
    i = 0
    while i < len(pts) - 1:
        j = len(pts) - 1
        while j > i + 1 and not line_ok(pts[i], pts[j]):
            j -= 1
        out.append(pts[j])
        i = j
    return out


# —— 行走顺序：自下而上（先左后右分层）——
WAYPOINTS = [
    ('spawn', (50, 88)),
    ('dishes', (38, 64)),     # 大排档门前横向路
    ('places', (66, 65)),     # 地图板广场
    ('festival', (67, 45)),   # 节庆屋前
    ('magazine', (39, 43)),   # 书店门前
    ('bioculture', (66, 21)), # 温室前小广场
    ('area', (31, 19)),       # 路标广场
    ('cave', (50, 9)),
]

cells = []
for name, pct in WAYPOINTS:
    c = nearest_open(pct)
    if c is None:
        raise SystemExit(f'{name} 附近找不到可走路面: {pct}')
    cells.append((name, c))
    print(f'{name:10s} {pct} -> 网格 {c} = {to_pct(c)}')

simple = []
for i in range(len(cells) - 1):
    seg = dijkstra(cells[i][1], cells[i + 1][1])
    if seg is None:
        raise SystemExit(f'无法连通: {WAYPOINTS[i]} -> {WAYPOINTS[i+1]}')
    part = simplify([to_pct(c) for c in seg])
    # 分段简化，保证每个坐标节点都被保留
    simple.extend(part if not simple else part[1:])

# STOPS：路途回到的坐标节点（waypoint 对应在简化路径中的下标）
stop_pts = {name: to_pct(c) for name, c in cells}
stop_idx = {}
for name, _ in WAYPOINTS[1:-1]:
    stop_idx[name] = int(np.argmin([np.hypot(p[0] - stop_pts[name][0], p[1] - stop_pts[name][1])
                                    for p in simple]))

bad_nodes = [p for p in simple if not on_road(p)]
bad_segs = [(simple[k], simple[k + 1]) for k in range(len(simple) - 1)
            if not line_ok(simple[k], simple[k + 1])]

print()
print('PATH 节点数:', len(simple))
print('不可走节点:', bad_nodes)
print('跨草地线段:', bad_segs)
print('STOPS =', stop_idx)
print()
for p in simple:
    print(f'  {{ x: {p[0]}, y: {p[1]} }},')
