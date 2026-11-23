/**
 * 程序化像素小人：3 帧横向精灵图（0=站立, 1/2=行走交替）
 * 16×16 每帧，绘制后导出 dataURL，用 background-position 切帧。
 */
export const FRAME_W = 16
export const FRAMES = 3

const SKIN = '#f6cfa0'
const HAIR = '#3a2b22'
const CAP = '#f2a93b'
const CAP_DARK = '#d18b22'
const SHIRT = '#1e5b45'
const SHIRT_DARK = '#174936'
const PANTS = '#2f4b62'
const SHOE = '#2a2622'

function px(
  ctx: CanvasRenderingContext2D,
  color: string,
  x: number,
  y: number,
  w = 1,
  h = 1,
) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, w, h)
}

function drawBody(ctx: CanvasRenderingContext2D, ox: number) {
  // 帽子
  px(ctx, CAP, ox + 4, 1, 7, 2)
  px(ctx, CAP_DARK, ox + 4, 3, 6, 1)
  px(ctx, CAP_DARK, ox + 11, 2, 2, 1) // 帽檐朝右
  // 头
  px(ctx, SKIN, ox + 4, 4, 6, 4)
  px(ctx, HAIR, ox + 4, 4, 6, 1)
  px(ctx, HAIR, ox + 3, 4, 1, 3)
  px(ctx, '#2a2622', ox + 8, 5, 1, 2) // 眼睛
  // 身体
  px(ctx, SHIRT, ox + 4, 8, 6, 4)
  px(ctx, SHIRT_DARK, ox + 4, 11, 6, 1)
}

function drawLegs(ctx: CanvasRenderingContext2D, ox: number, frame: 0 | 1 | 2) {
  if (frame === 0) {
    px(ctx, PANTS, ox + 4, 12, 3, 3)
    px(ctx, PANTS, ox + 7, 12, 3, 3)
    px(ctx, SHOE, ox + 4, 15, 3, 1)
    px(ctx, SHOE, ox + 7, 15, 3, 1)
    // 手臂自然下垂
    px(ctx, SHIRT, ox + 10, 9, 2, 3)
  } else if (frame === 1) {
    // 右腿在前、左腿在后
    px(ctx, PANTS, ox + 8, 12, 3, 3)
    px(ctx, PANTS, ox + 3, 12, 3, 2)
    px(ctx, SHOE, ox + 9, 15, 3, 1)
    px(ctx, SHOE, ox + 2, 14, 3, 1)
    // 手臂摆动
    px(ctx, SHIRT, ox + 10, 8, 2, 3)
    px(ctx, SHIRT, ox + 3, 10, 2, 2)
  } else {
    // 左腿在前、右腿在后
    px(ctx, PANTS, ox + 7, 12, 3, 3)
    px(ctx, PANTS, ox + 4, 13, 3, 2)
    px(ctx, SHOE, ox + 8, 15, 3, 1)
    px(ctx, SHOE, ox + 5, 15, 3, 1)
    px(ctx, SHIRT, ox + 11, 10, 2, 2)
    px(ctx, SHIRT, ox + 4, 8, 2, 3)
  }
}

export function createWalkerSprite(): string {
  const canvas = document.createElement('canvas')
  canvas.width = FRAME_W * FRAMES
  canvas.height = 16
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  for (let f = 0; f < FRAMES; f++) {
    const ox = f * FRAME_W
    drawBody(ctx, ox)
    drawLegs(ctx, ox, f as 0 | 1 | 2)
  }
  return canvas.toDataURL('image/png')
}
