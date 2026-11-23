# TODO — 吃货计划官网（竖屏平面图版）

## 本轮需求：一张竖屏平面图 + 小人走动动画，走到坐标拉开抽屉

- [x] 移除 three.js 3D 小岛（删除 `src/game/`、`IslandStage.tsx`、`Joystick.tsx`，卸载 `three`/`@types/three`）
- [x] 竖屏平面图地图首页：1080×1920 AI 生成像素插画铺满视口（`MapPortrait.tsx`，图片失败时降级为渐变背景）
- [x] 程序化像素小人：`src/map/sprite.ts` 生成 3 帧 16×16 精灵（站立 + 行走两帧），CSS 切帧动画
- [x] 行走动画：沿 `mapLayout.ts` 的 22 节点百分比折线以 170px/s 插值，按 x 方向翻转朝向，行走帧每 0.16s 切换
- [x] 六个坐标 pin 落在建筑上（按原图重新校准 PATH / STOPS / PINS 百分比坐标），标签收窄后不再互相重叠
- [x] 点 pin → 小人沿路走到坐标 → 到达后自动 `navigate('/<slug>')` 拉出抽屉；chips 直达时小人同样走过去
- [x] 抽屉：底部滑出，✕ / Esc / 遮罩 / 浏览器返回均可关闭；URL 同步可分享
- [x] HUD：品牌头部 + 坐标直达 chips（按行走顺序排序）+ 关于弹层（含隐私政策等页脚链接）
- [x] `sections.ts` 按行走顺序（dishes → places → magazine → festival → area → bioculture）导出，chips 与抽屉「下一站」顺序一致
- [x] `index.html` meta description 已更新为竖屏平面图文案；`global.css` 清理 3D 残留样式
- [x] 移动端竖屏 390×844 与桌面 1280×800 截图验证通过

## 工程与交付

- [x] `pnpm build` 通过（tsc + vite，bundle 276KB），截图验证 pin 落点 / 行走路线 / 抽屉开合
- [x] 浏览器实测：点坐标 → 小人走到 → URL 变为 `/dishes` 且抽屉自动滑出；✕ 关闭回到 `/`；Preview 域名地图图片与小人精灵正常加载
- [x] `/manus-routes.json` 与路由一致（7 条，200）；`/` 与 `/magazine` 均 200
- [x] 发布声明：build（dist）+ routes（/* static + spaFallback）
- [x] 提交 checkpoint 并推送 origin/main
- [ ] 用户在 Preview 确认后发布上线（auto_publish = false）

## 历史版本（已归档 checkpoint）

- `5b49305`：平面像素地图官网（Blueprint 条目全部完成）
- `f9cc51a`：three.js 3D 像素小岛（体素岛 + 六栋建筑 + 摇杆/点选寻路 + 碰撞）
