/**
 * 竖屏平面图布局：所有坐标以地图宽高的百分比表示（与 1080×1920 原图对齐）。
 * path：小人行走的折线（与图中石板路重合，自码头向上）
 * stops：每个栏目对应的折线节点索引（走到该节点即抵达坐标）
 * pins：建筑上的坐标点（标签悬于点上方）
 */
export type Pct = { x: number; y: number }

export const SPAWN: Pct = { x: 50, y: 89 }

export const PATH: Pct[] = [
  { x: 50, y: 89 }, // 码头起点
  { x: 50, y: 86 },
  { x: 50, y: 81 },
  { x: 52, y: 76 },
  { x: 50, y: 72 },
  { x: 47, y: 68 }, // 05 · 美食词条（大排档右侧）
  { x: 50, y: 65 },
  { x: 54, y: 63 }, // 07 · 吃货地图（地图板左侧）
  { x: 51, y: 59 },
  { x: 49, y: 54 },
  { x: 48, y: 49 }, // 10 · 百科（书店前广场）
  { x: 52, y: 46 }, // 11 · 岁时节庆（节庆屋门前）
  { x: 50, y: 42 },
  { x: 49, y: 37 },
  { x: 50, y: 33 },
  { x: 52, y: 28 },
  { x: 50, y: 24 },
  { x: 49, y: 20 }, // 17 · 按地区（路标广场右侧）
  { x: 55, y: 17 }, // 18 · 生物与生态文化（温室门前）
  { x: 59, y: 13 },
  { x: 63, y: 9 },
  { x: 66, y: 5 }, // 溶洞尽头
]

export const STOPS: Record<string, number> = {
  dishes: 5,
  places: 7,
  magazine: 10,
  festival: 11,
  area: 17,
  bioculture: 18,
}

export const PINS: Record<string, Pct> = {
  dishes: { x: 30, y: 58 },
  places: { x: 68, y: 58 },
  magazine: { x: 33, y: 30 },
  festival: { x: 71, y: 34 },
  area: { x: 32, y: 9 },
  bioculture: { x: 70, y: 10 },
}