# 吃货计划 EAT PLAN · 官网

给 [https://eatplan.online](https://eatplan.online) 做的中文美食百科官网：一张全屏竖屏像素小镇地图，六个栏目做成地图上的坐标入口，小人走到坐标，页面从右侧抽屉拉开。

## 玩法

- **全屏无顶栏**：地图从屏幕边缘铺满整屏，宽屏两侧用同图模糊补满。
- **跟手摇杆**：按住屏幕任意位置，摇杆即在手指处出现；拖动超过 10px 接管移动，松手消失。
- **自由行走**：草地、沙地、广场都能走；点地面直接直线走过去，也支持 WASD / 方向键。
- **坐标抽屉**：走到坐标附近自动从右侧拉出该栏目的抽屉（简介 + 代表文章 + 主站外链 + 下一站）；URL 同步 `/:slug`，可分享、可返回、Esc 关闭。
- **像素吉祥物**：由吉祥物原图程序化像素化生成的三帧行走精灵（站立 / 左步 / 右步）。

## 技术栈

Vite 7 · React 19 · TypeScript · react-router-dom 7 · pnpm

## 目录

```
public/map-town.webp      竖屏像素小镇地图（1080×1920）
public/walker-mascot.png  像素吉祥物三帧精灵图（横向拼接）
src/components/MapPortrait.tsx  全屏地图：摇杆、行走、触发、渲染
src/components/Layout.tsx        应用外壳：浮动信息钮、信息弹层
src/components/SectionDrawer.tsx 右侧抽屉内容
src/map/mapLayout.ts             PATH / STOPS / PINS 坐标布局
src/data/sections.ts             六个栏目的文案与代表文章
tools/gen_map_path.py            路面掩码 → Dijkstra → 视线简化，生成行走路线
tools/make_walker_sprite.py      吉祥物 → 像素化三帧行走精灵
```

## 开发

```sh
pnpm install
pnpm dev      # 本地开发（默认 3000 端口）
pnpm build    # 产出 dist/
```

## 内容

地图只是门面，正文仍在主站 [eatplan.online](https://eatplan.online)；百科内容整理自公开来源，附引用出处。
