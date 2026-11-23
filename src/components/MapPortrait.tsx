import { useEffect, useRef, useState } from 'react'
import { formatCoord, sections } from '../data/sections'
import { PATH, PINS, STOPS } from '../map/mapLayout'
import { FRAME_H, FRAME_W, FRAMES, WALKER_IMAGE } from '../map/sprite'

const MAP_IMAGE = '/map-town.webp'
const SPEED = 170 // 小人每秒走多少像素
const TRIGGER_RATIO = 0.05 // 距坐标多少比例内触发抽屉
const RELEASE_RATIO = 0.085 // 走出多少比例后允许再次触发
const JOY_IN = 56 // 摇杆输入半径（拖多少算满偏）
const JOY_VIS = 34 // 摇杆方向盘钮的最大位移
const TAP_SLOP = 10 // 小于这个位移算点按，否则算拖动摇杆

type Props = {
  /** 当前路由坐标（chips 打开时小人也会走过去） */
  slug: string
  /** 小人抵达坐标 → 拉出右侧抽屉 */
  onArrive: (slug: string) => void
}

/**
 * 全屏竖屏地图：按住屏幕任意位置会出现摇杆，拖动即可在草地、石板路上自由走动；
 * 点地面直接走过去，走到坐标自动从右侧拉开抽屉。
 * 窄屏用 cover 铺满裁切左右，宽屏用 contain + 模糊背景保证内容完整。
 */
export default function MapPortrait({ slug, onArrive }: Props) {
  const screenRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const charRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const [joy, setJoy] = useState<{ x: number; y: number } | null>(null)

  const slugRef = useRef(slug)
  slugRef.current = slug

  const keys = useRef(new Set<string>())
  const vec = useRef({ x: 0, y: 0 }) // 键盘/摇杆合成的方向向量

  // 指针状态：按下即出现摇杆，拖动超过 TAP_SLOP 才算操作
  const ptr = useRef({
    active: false,
    id: -1,
    cx: 0,
    cy: 0, // 摇杆圆心（屏幕坐标）
    sx: 0,
    sy: 0,
    moved: false,
  })

  const st = useRef({
    pos: { x: 0, y: 0 },
    target: null as { x: number; y: number } | null,
    onDone: null as null | ((slug: string) => void),
    pendingSlug: '',
    goto: '', // 指定前往的坐标：途中不响应其它坐标
    triggered: '', // 已触发且尚未离开的坐标
    facing: 1,
    frame: 0,
    frameClock: 0,
    moving: false,
    ready: false,
    trigger: 36,
    release: 72,
    bounds: { w: 0, h: 0 },
    pathPx: [] as { x: number; y: number }[],
  })

  /** PATH 上第 s 个参数处的像素坐标（仅用于确定坐标点位置） */
  const posOf = (s: number): { x: number; y: number } => {
    const pts = st.current.pathPx
    if (!pts.length) return { x: 0, y: 0 }
    const clamped = Math.max(0, Math.min(pts.length - 1, s))
    const seg = Math.min(Math.floor(clamped), pts.length - 2)
    const frac = clamped - seg
    const a = pts[seg]
    const b = pts[seg + 1]
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }
  }

  const clampPos = (x: number, y: number): { x: number; y: number } => {
    const { w, h } = st.current.bounds
    return {
      x: Math.max(12, Math.min(w - 12, x)),
      y: Math.max(18, Math.min(h - 8, y)),
    }
  }

  const paint = () => {
    const el = charRef.current
    if (!el) return
    const { pos, facing, frame } = st.current
    el.style.left = `${pos.x}px`
    el.style.top = `${pos.y}px`
    el.style.transform = `translate(-50%, -95%) scaleX(${facing})`
    el.style.backgroundPosition = `${-frame * FRAME_W}px 0px`
  }

  /** 沿直线走到该像素点；到达后回调 */
  const walkTo = (target: { x: number; y: number }, onDone?: (slug: string) => void, pendingSlug = '') => {
    const s = st.current
    if (!s.ready) {
      onDone?.(pendingSlug)
      return
    }
    s.target = clampPos(target.x, target.y)
    s.onDone = onDone ?? null
    s.pendingSlug = pendingSlug
    s.goto = pendingSlug
    if (Math.hypot(s.target.x - s.pos.x, s.target.y - s.pos.y) < 2) arrive()
  }

  const arrive = () => {
    const s = st.current
    s.target = null
    s.moving = false
    const cb = s.onDone
    const pending = s.pendingSlug
    s.onDone = null
    s.goto = ''
    cb?.(pending)
  }

  const measure = () => {
    const screen = screenRef.current
    const content = contentRef.current
    if (!screen || !content) return
    const r = screen.getBoundingClientRect()
    const img = imgRef.current
    const nw = imgFailed ? 0 : img?.naturalWidth || 0
    const nh = imgFailed ? 0 : img?.naturalHeight || 0

    // 可用区域：全屏（无顶栏、无底栏），地图从屏幕边缘铺满
    const area = { x: 0, y: 0, w: r.width, h: Math.max(200, r.height) }

    let dx: number
    let dy: number
    let dw: number
    let dh: number
    if (!nw || !nh) {
      // 图片未加载/加载失败：退化为整块区域
      dx = area.x
      dy = area.y
      dw = area.w
      dh = area.h
    } else if (area.w / area.h > nw / nh) {
      // 视口比图更宽 → contain 居中，左右用模糊背景铺满
      dh = area.h
      dw = (dh * nw) / nh
      dx = area.x + (area.w - dw) / 2
      dy = area.y
    } else {
      // 更窄 → cover 铺满整屏，左右裁掉少量海面
      const k = Math.max(area.w / nw, area.h / nh)
      dw = nw * k
      dh = nh * k
      dx = area.x + (area.w - dw) / 2
      dy = area.y + (area.h - dh) / 2
    }

    content.style.left = `${dx}px`
    content.style.top = `${dy}px`
    content.style.width = `${dw}px`
    content.style.height = `${dh}px`
    if (img) {
      img.style.left = `${dx}px`
      img.style.top = `${dy}px`
      img.style.width = `${dw}px`
      img.style.height = `${dh}px`
    }

    const s = st.current
    s.trigger = Math.max(20, dw * TRIGGER_RATIO)
    s.release = Math.max(34, dw * RELEASE_RATIO)
    s.bounds = { w: dw, h: dh }
    const first = !s.ready
    s.pathPx = PATH.map((p) => ({ x: (p.x / 100) * dw, y: (p.y / 100) * dh }))
    s.ready = true
    if (first) {
      const node = STOPS[slugRef.current]
      if (node !== undefined) {
        // 深链 / chips 直达：直接站在对应坐标的路口
        s.pos = { ...s.pathPx[node] }
        s.triggered = slugRef.current
      } else {
        // 默认开局站在地图正中央（草地/路面均可走）
        s.pos = clampPos(dw / 2, dh / 2)
        // 预占最近的坐标：开局不弹抽屉，走远再回来才会触发
        let best = ''
        let bestD = Infinity
        for (const key of Object.keys(STOPS)) {
          const p = posOf(STOPS[key])
          const d = Math.hypot(p.x - s.pos.x, p.y - s.pos.y)
          if (d < bestD) {
            bestD = d
            best = key
          }
        }
        if (bestD < s.release) s.triggered = best
      }
    } else {
      // 尺寸变化：保持相对位置，仍落在地图范围内
      s.pos = clampPos(s.pos.x, s.pos.y)
    }
    paint()
  }

  // 尺寸变化 → 重算路径像素坐标
  useEffect(() => {
    measure()
    const ro = new ResizeObserver(() => measure())
    if (screenRef.current) ro.observe(screenRef.current)
    window.addEventListener('resize', measure)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 图片加载失败 → 退化区域重新测量
  useEffect(() => {
    measure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgFailed])

  // 键盘 WASD / 方向键
  useEffect(() => {
    const map: Record<string, string> = {
      ArrowUp: 'up',
      w: 'up',
      W: 'up',
      ArrowDown: 'down',
      s: 'down',
      S: 'down',
      ArrowLeft: 'left',
      a: 'left',
      A: 'left',
      ArrowRight: 'right',
      d: 'right',
      D: 'right',
    }
    const down = (e: KeyboardEvent) => {
      const k = map[e.key]
      if (!k || slugRef.current) return
      e.preventDefault()
      keys.current.add(k)
    }
    const up = (e: KeyboardEvent) => {
      const k = map[e.key]
      if (k) keys.current.delete(k)
    }
    const blur = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
    }
  }, [])

  // 路由变化（chips 直达）→ 小人也走过去
  useEffect(() => {
    if (!slug) return
    const node = STOPS[slug]
    if (node !== undefined) {
      keys.current.clear()
      vec.current = { x: 0, y: 0 }
      walkTo(posOf(node), undefined, '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // 主循环：自由移动 / 直线行走 / 帧动画 / 坐标触发
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = st.current
      if (!s.ready) return

      const blocked = !!slugRef.current // 抽屉打开时不动
      let moving = false

      if (!blocked) {
        // 1) 键盘 / 摇杆自由走动（草地与路面都可走）
        let kx = vec.current.x
        let ky = vec.current.y
        if (keys.current.has('left')) kx -= 1
        if (keys.current.has('right')) kx += 1
        if (keys.current.has('up')) ky -= 1
        if (keys.current.has('down')) ky += 1
        const mag = Math.hypot(kx, ky)
        if (mag > 0.08) {
          const d = Math.hypot(kx, ky)
          const nx = (kx / d) * SPEED * dt
          const ny = (ky / d) * SPEED * dt
          s.pos = clampPos(s.pos.x + nx, s.pos.y + ny)
          if (Math.abs(nx) > 0.2) s.facing = nx > 0 ? 1 : -1
          s.moving = true
          s.target = null
          s.onDone = null
          s.goto = ''
          moving = true
        }
      }

      // 2) 直线行走（点地面 / 点坐标 / chips）——抽屉打开时也继续走到位
      if (s.target) {
        const dx = s.target.x - s.pos.x
        const dy = s.target.y - s.pos.y
        const d = Math.hypot(dx, dy)
        const ds = SPEED * dt
        if (d <= ds) {
          s.pos = { ...s.target }
          arrive()
        } else {
          s.pos.x += (dx / d) * ds
          s.pos.y += (dy / d) * ds
          if (Math.abs(dx) > 0.3) s.facing = dx > 0 ? 1 : -1
        }
        moving = true
      }

      s.moving = moving
      if (moving) {
        s.frameClock += dt
        if (s.frameClock > 0.16) {
          s.frameClock = 0
          s.frame = s.frame === 1 ? 2 : 1
        }
      } else {
        s.frame = 0
      }

      // 3) 坐标触发：走到坐标附近自动拉出抽屉（正走向指定坐标时只在到达时触发）
      if (!blocked && !s.goto) {
        let hit = ''
        let hitD = Infinity
        for (const key of Object.keys(STOPS)) {
          const p = posOf(STOPS[key])
          const d = Math.hypot(p.x - s.pos.x, p.y - s.pos.y)
          if (d < hitD) {
            hitD = d
            hit = key
          }
        }
        if (hitD <= s.trigger && s.triggered !== hit) {
          s.triggered = hit
          onArrive(hit)
        } else if (hitD > s.release && s.triggered) {
          s.triggered = ''
        }
      }

      paint()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePin = (slug: string) => {
    const node = STOPS[slug]
    if (node === undefined) return
    keys.current.clear()
    vec.current = { x: 0, y: 0 }
    walkTo(posOf(node), onArrive, slug)
  }

  const paintKnob = (vx: number, vy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${vx * JOY_VIS}px, ${vy * JOY_VIS}px)`
  }

  // 按下：在手指位置出现摇杆
  const onScreenDown = (e: React.PointerEvent) => {
    if (slugRef.current || !st.current.ready) return
    if ((e.target as HTMLElement).closest('.map-pin')) return
    const r = screenRef.current!.getBoundingClientRect()
    const cx = e.clientX - r.left
    const cy = e.clientY - r.top
    ptr.current = { active: true, id: e.pointerId, cx, cy, sx: e.clientX, sy: e.clientY, moved: false }
    setJoy({ x: cx, y: cy })
    paintKnob(0, 0)
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  // 拖动：超过阈值即接管走动
  const onScreenMove = (e: React.PointerEvent) => {
    const p = ptr.current
    if (!p.active || e.pointerId !== p.id) return
    if (!p.moved && Math.hypot(e.clientX - p.sx, e.clientY - p.sy) > TAP_SLOP) {
      p.moved = true
      keys.current.clear()
      st.current.target = null
      st.current.onDone = null
      st.current.goto = ''
    }
    if (!p.moved) return
    let vx = (e.clientX - p.cx) / JOY_IN
    let vy = (e.clientY - p.cy) / JOY_IN
    const m = Math.hypot(vx, vy)
    if (m > 1) {
      vx /= m
      vy /= m
    }
    vec.current = { x: vx, y: vy }
    paintKnob(vx, vy)
  }

  // 抬起：拖过→松手停住；没拖过→点按，直接走到该处
  const onScreenUp = (e: React.PointerEvent) => {
    const p = ptr.current
    if (!p.active || e.pointerId !== p.id) return
    p.active = false
    const dragged = p.moved
    vec.current = { x: 0, y: 0 }
    paintKnob(0, 0)
    setJoy(null)
    if (dragged || slugRef.current) return
    const content = contentRef.current
    if (!content) return
    const r = content.getBoundingClientRect()
    keys.current.clear()
    st.current.onDone = null
    st.current.pendingSlug = ''
    walkTo({ x: e.clientX - r.left, y: e.clientY - r.top }, undefined, FREE_TAG)
  }

  return (
    <div
      className="map-screen"
      ref={screenRef}
      onPointerDown={onScreenDown}
      onPointerMove={onScreenMove}
      onPointerUp={onScreenUp}
      onPointerCancel={onScreenUp}
    >
      <div className="map-bg" style={{ backgroundImage: `url(${imgFailed ? '' : MAP_IMAGE})` }} />
      {!imgFailed ? (
        <img
          ref={imgRef}
          className="map-img"
          src={MAP_IMAGE}
          alt="全屏像素小镇地图，六个栏目坐标分布在小岛各处"
          onLoad={measure}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="map-img map-img-fallback" />
      )}

      <div className="map-content" ref={contentRef}>
        {sections.map((s) => {
          const pin = PINS[s.slug]
          if (!pin) return null
          const active = slug === s.slug
          return (
            <button
              key={s.slug}
              type="button"
              className={active ? 'map-pin is-active' : 'map-pin'}
              style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              onClick={(e) => {
                e.stopPropagation()
                handlePin(s.slug)
              }}
              aria-label={`坐标：${s.navLabel}（${formatCoord(s.coord)}），让小人走过去并打开`}
            >
              <span className="pin-label">
                <span className="pin-name">{s.navLabel}</span>
              </span>
              <span className="pin-dot" aria-hidden="true" />
            </button>
          )
        })}

        <div
          className="walker"
          ref={charRef}
          aria-hidden="true"
          style={{
            width: FRAME_W,
            height: FRAME_H,
            backgroundImage: `url(${WALKER_IMAGE})`,
            backgroundSize: `${FRAME_W * FRAMES}px ${FRAME_H}px`,
          }}
        />
      </div>

      {/* 跟手摇杆：按住屏幕任意位置即出现 */}
      <div
        className="joystick"
        aria-hidden="true"
        style={{
          left: joy ? joy.x : 0,
          top: joy ? joy.y : 0,
          opacity: joy ? 1 : 0,
          visibility: joy ? 'visible' : 'hidden',
        }}
      >
        <span className="joy-knob" ref={knobRef} />
      </div>

      <div className="map-hint">
        <span className="hint-name">按住屏幕拖动 = 摇杆走动 · 点地面走过去 · 点栏目拉开抽屉</span>
      </div>
    </div>
  )
}
const FREE_TAG = '__free' // 点地自由行走：途中不响应路过坐标
