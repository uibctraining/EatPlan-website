/**
 * 像素化吉祥物精灵图：由吉祥物原图程序化像素化生成
 * （裁剪 → BOX 降采样 → 32 色调色板量化 → 站立/左步/右步 三帧横排）。
 * 生成脚本见交付说明；输出 public/walker-mascot.png。
 */
export const WALKER_IMAGE = '/walker-mascot.png'
export const FRAME_W = 23
export const FRAME_H = 60
export const FRAMES = 3
