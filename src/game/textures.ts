import * as THREE from 'three'

/** 确定性伪随机，保证每次进岛布景一致 */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function canvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  return [c, ctx]
}

function toTexture(c: HTMLCanvasElement, repeat = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.repeat.set(repeat, repeat)
  return tex
}

function noiseFill(
  ctx: CanvasRenderingContext2D,
  size: number,
  base: string,
  variants: string[],
  rnd: () => number,
  block = 4,
) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  for (let y = 0; y < size; y += block) {
    for (let x = 0; x < size; x += block) {
      if (rnd() < 0.45) {
        ctx.fillStyle = variants[Math.floor(rnd() * variants.length)]
        ctx.fillRect(x, y, block, block)
      }
    }
  }
}

export function grassTexture(seed = 7): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(seed)
  noiseFill(ctx, 64, '#5aa054', ['#519649', '#63ab5c', '#4a8d44'], rnd, 4)
  // 零星小草叶
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * 16) * 4
    const y = Math.floor(rnd() * 16) * 4
    ctx.fillStyle = rnd() > 0.5 ? '#78bd68' : '#3f7f3c'
    ctx.fillRect(x + 1, y, 2, 4)
  }
  return toTexture(c)
}

export function sandTexture(seed = 11): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(seed)
  noiseFill(ctx, 64, '#ead6a0', ['#e2cb92', '#f2e0ad', '#dcc487'], rnd, 4)
  return toTexture(c)
}

export function dirtTexture(seed = 13): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(seed)
  noiseFill(ctx, 64, '#8a6242', ['#7b5738', '#96704d', '#6e4d32'], rnd, 4)
  return toTexture(c)
}

export function waterTexture(seed = 17): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(seed)
  noiseFill(ctx, 64, '#3f9fb8', ['#3a95ad', '#49aec6', '#34899f'], rnd, 4)
  for (let i = 0; i < 14; i++) {
    const y = Math.floor(rnd() * 16) * 4
    const x = Math.floor(rnd() * 12) * 4
    ctx.fillStyle = '#7fd3e0'
    ctx.fillRect(x, y, 8 + Math.floor(rnd() * 8), 2)
  }
  return toTexture(c)
}

export function woodTexture(tone = '#a9713f', dark = '#8a5a31'): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(23)
  ctx.fillStyle = tone
  ctx.fillRect(0, 0, 64, 64)
  for (let x = 0; x < 64; x += 8) {
    ctx.fillStyle = dark
    ctx.fillRect(x, 0, 2, 64)
    for (let i = 0; i < 8; i++) {
      if (rnd() < 0.4) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)'
        ctx.fillRect(x + 3, Math.floor(rnd() * 16) * 4, 4, 2)
      }
    }
  }
  return toTexture(c)
}

export function roofTexture(tone: string, dark: string): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  ctx.fillStyle = dark
  ctx.fillRect(0, 0, 64, 64)
  for (let y = 0; y < 64; y += 8) {
    ctx.fillStyle = tone
    ctx.fillRect(0, y, 64, 6)
    for (let x = (y / 8) % 2 === 0 ? 0 : 4; x < 64; x += 8) {
      ctx.fillRect(x, y, 6, 6)
    }
  }
  return toTexture(c)
}

export function plasterTexture(tone = '#f4e6c8'): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(31)
  noiseFill(ctx, 64, tone, ['#efdfbc', '#f9edd4', '#e9d7b0'], rnd, 4)
  return toTexture(c)
}

export function stoneTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  const rnd = mulberry32(41)
  noiseFill(ctx, 64, '#cfc7b4', ['#c4bba6', '#dad2c0', '#b8ae98'], rnd, 4)
  ctx.strokeStyle = '#a89e88'
  ctx.lineWidth = 2
  ctx.strokeRect(1, 1, 62, 62)
  return toTexture(c)
}

export function glassTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  ctx.fillStyle = '#bfe7e3'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#d7f2ee'
  ctx.fillRect(4, 4, 24, 24)
  ctx.fillStyle = '#a5d7d2'
  ctx.fillRect(36, 36, 24, 24)
  ctx.fillStyle = '#5f8f8b'
  ctx.fillRect(30, 0, 4, 64)
  ctx.fillRect(0, 30, 64, 4)
  return toTexture(c)
}

export function awningTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas(64)
  for (let x = 0; x < 64; x += 16) {
    ctx.fillStyle = '#f2e3c4'
    ctx.fillRect(x, 0, 16, 64)
    ctx.fillStyle = '#c7503c'
    ctx.fillRect(x + 16, 0, 16, 64)
  }
  return toTexture(c)
}

/** 用 canvas 画一段文字贴图（精灵标签用） */
export function labelTexture(title: string, coord: string): THREE.CanvasTexture {
  const w = 512
  const h = 160
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')!
  // 底板
  ctx.fillStyle = '#fff6e7'
  ctx.fillRect(6, 6, w - 12, h - 12)
  ctx.strokeStyle = '#2a2622'
  ctx.lineWidth = 8
  ctx.strokeRect(6, 6, w - 12, h - 12)
  ctx.fillStyle = '#2a2622'
  ctx.font = 'bold 56px "PingFang SC", "Microsoft YaHei", sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(title, w / 2, 62)
  ctx.fillStyle = '#1e5b45'
  ctx.font = 'bold 34px monospace'
  ctx.fillText(coord, w / 2, 122)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.LinearFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/** 角色脸部贴图 */
export function faceTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f6cfa0'
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = '#2a2622'
  ctx.fillRect(7, 13, 5, 6)
  ctx.fillRect(20, 13, 5, 6)
  ctx.fillStyle = '#c7503c'
  ctx.fillRect(13, 23, 6, 3)
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

export function upTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#f6cfa0'
  ctx.fillRect(0, 0, 32, 32)
  ctx.fillStyle = '#2a2622'
  ctx.fillRect(6, 2, 20, 10) // 头发
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}
