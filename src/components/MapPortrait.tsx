import { useEffect, useRef, useState } from 'react'
import { formatCoord, sections } from '../data/sections'
import { PATH, PINS, STOPS } from '../map/mapLayout'
import { FRAME_H, FRAME_W, FRAMES, WALKER_IMAGE } from '../map/sprite'

const MAP_IMAGE = '/map-town.webp'

const SPEED = 170 // 小人每秒走多少像素
// 半径按地图显示宽度取比例：路宽变化时走廊与触发范围跟着自适应
const CORRIDOR_RATIO = 0.05 // 离石板路中心线多宽以内才算走在路上
const TRIGGER_RATIO = 0.05 // 距坐标多少比例内触发抽屉
const RELEASE_RATIO = 0.085 // 走出多少比例后允许再次触发

type Props = {
  /** 当前路由坐标（chips 打开时小人也会走过去） */
  slug: string
  /** 小人抵达坐标 → 拉出右侧抽屉 */
  onArrive: (slug: string) => void
}

/**
 * 全屏竖屏平面图：点坐标 / 摇杆 / WASD 走动小人，走到坐标自动从右侧拉开抽屉。
 * 窄屏用 cover 铺满裁切左右，宽屏用 contain + 模糊背景保证内容完整。
 */
export default function MapPortrait({ slug, onArrive }: Props) {
  const screenRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const imgRef = useRef<HTMLImageElement>(null)
  const charRef = useRef<HTMLDivElement>(null)
  const [imgFailed, setImgFailed] = useState(false)

  const slugRef = useRef(slug)
  slugRef.current = slug

  const keys = useRef(new Set<string>())
  const joy = useRef({ x: 0, y: 0 })

  const st = useRef({
    pos: { x: 0, y: 0 },
    s: 0, // 沿 PATH 的位置：整数=节点，小数=段内比例
    targetS: null as number | null,
    onDone: null as null | ((slug: string) => void),
    pendingSlug: '',
    goto: '', // 指定前往的坐标：途中不响应其它坐标
    triggered: '', // 已触发且尚未离开的坐标
    facing: 1,
    frame: 0,
    frameClock: 0,
    moving: false,
    ready: false,
    corridor: 30,
    trigger: 36,
    release: 72,
    pathPx: [] as { x: number; y: number }[],
    len: [] as number[],
  })

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

  /** 点到石板路折线的最近距离，同时返回全局参数 s */
  const nearestOnPath = (p: { x: number; y: number }): { d: number; s: number } => {
    const pts = st.current.pathPx
    let best = { d: Infinity, s: 0 }
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i]
      const b = pts[i + 1]
      const vx = b.x - a.x
      const vy = b.y - a.y
      const len2 = vx * vx + vy * vy || 1
      let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2
      t = Math.max(0, Math.min(1, t))
      const qx = a.x + vx * t
      const qy = a.y + vy * t
      const d = Math.hypot(p.x - qx, p.y - qy)
      if (d < best.d) best = { d, s: i + t }
    }
    return best
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

  /** 沿路走 s → 该参数处；到达后回调 */
  const walkTo = (target: number, onDone?: (slug: string) => void, pendingSlug = '') => {
    const s = st.current
    if (!s.ready || target < 0 || target > PATH.length - 1) {
      onDone?.(pendingSlug)
      return
    }
    s.targetS = target
    s.onDone = onDone ?? null
    s.pendingSlug = pendingSlug
    s.goto = pendingSlug
    if (Math.abs(s.s - target) < 0.02) arrive()
  }

  const arrive = () => {
    const s = st.current
    s.targetS = null
    s.moving = false
    const cb = s.onDone
    const pending = s.pendingSlug
    s.onDone = null
    s.goto = ''
    cb?.(pending)
  }

  /** 自由移动一格，限制在石板路走廊内（贴墙时只走可行的分量） */
  const step = (dx: number, dy: number) => {
    const s = st.current
    const tryMove = (nx: number, ny: number) =>
      nearestOnPath({ x: nx, y: ny }).d <= s.corridor
    const { pos } = s
    if (dx !== 0 || dy !== 0) {
      if (Math.abs(dx) > Math.abs(dy)) {
        if (tryMove(pos.x + dx, pos.y + dy)) pos.x += dx, (pos.y += dy)
        else if (tryMove(pos.x + dx, pos.y)) pos.x += dx
        else if (tryMove(pos.x, pos.y + dy)) pos.y += dy
      } else {
        if (tryMove(pos.x + dx, pos.y + dy)) pos.x += dx, (pos.y += dy)
        else if (tryMove(pos.x, pos.y + dy)) pos.y += dy
        else if (tryMove(pos.x + dx, pos.y)) pos.x += dx
      }
      if (Math.abs(dx) > 0.2) s.facing = dx > 0 ? 1 : -1
      s.moving = true
      s.targetS = null
      s.onDone = null
      s.goto = ''
      s.s = nearestOnPath(pos).s
    }
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
      // 视口比图更宽 → contain，左右用模糊背景铺满
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
    s.corridor = Math.max(16, dw * CORRIDOR_RATIO)
    s.trigger = Math.max(20, dw * TRIGGER_RATIO)
    s.release = Math.max(34, dw * RELEASE_RATIO)
    const first = !s.ready
    s.pathPx = PATH.map((p) => ({ x: (p.x / 100) * dw, y: (p.y / 100) * dh }))
    const len: number[] = []
    for (let i = 0; i < s.pathPx.length - 1; i++) {
      len.push(Math.hypot(s.pathPx[i + 1].x - s.pathPx[i].x, s.pathPx[i + 1].y - s.pathPx[i].y))
    }
    s.len = len
    s.ready = true
    if (first) {
      const node = STOPS[slugRef.current]
      if (node !== undefined) {
        // 深链 / chips 直达：直接站在对应坐标的路口
        s.pos = { ...s.pathPx[node] }
        s.s = node
        s.triggered = slugRef.current
      } else {
        // 默认开局在地图中央附近的石板路上
        const mid = nearestOnPath({ x: dw / 2, y: dh / 2 })
        s.s = Number.isFinite(mid.s) ? mid.s : 0
        s.pos = { ...posOf(s.s) }
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
      s.pos = { ...posOf(s.s) } // 重算后仍贴在石板路上
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
    if (node !== undefined) walkTo(node)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // 主循环：自由移动 / 沿路行走 / 帧动画 / 坐标触发
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
        // 1) 键盘 / 摇杆自由走动
        let kx = 0
        let ky = 0
        if (keys.current.has('left')) kx -= 1
        if (keys.current.has('right')) kx += 1
        if (keys.current.has('up')) ky -= 1
        if (keys.current.has('down')) ky += 1
        kx += joy.current.x
        ky += joy.current.y
        const mag = Math.hypot(kx, ky)
        if (mag > 0.08) {
          const nx = (kx / mag) * SPEED * dt
          const ny = (ky / mag) * SPEED * dt
          step(nx, ny)
          moving = s.moving
        }
      }

      // 2) 沿路行走（点坐标 / 点地面 / chips）——抽屉打开时也继续走到位
      {
        if (s.targetS !== null && s.ready) {
          const n = PATH.length
          const seg = Math.min(Math.max(Math.floor(s.s), 0), n - 2)
          const segLen = s.len[seg] || 1
          const ds = (SPEED * dt) / segLen
          const diff = s.targetS - s.s
          if (Math.abs(diff) <= ds) {
            s.s = s.targetS
            s.pos = { ...posOf(s.s) }
            arrive()
          } else {
            s.s += Math.sign(diff) * ds
            const before = posOf(s.s - Math.sign(diff) * 0.02)
            const after = posOf(s.s)
            s.pos = { ...after }
            if (Math.abs(after.x - before.x) > 0.3) s.facing = after.x >= before.x ? 1 : -1
          }
          moving = true
        }
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
    joy.current = { x: 0, y: 0 }
    walkTo(node, onArrive, slug)
  }

  /** 点地图任意位置 → 小人沿石板路走到最近的位置 */
  const handleGround = (e: React.PointerEvent) => {
    if (slugRef.current || !st.current.ready) return
    if ((e.target as HTMLElement).closest('.map-pin, .joystick')) return
    const content = contentRef.current
    if (!content) return
    const r = content.getBoundingClientRect()
    const p = { x: e.clientX - r.left, y: e.clientY - r.top }
    const near = nearestOnPath(p)
    if (!Number.isFinite(near.d)) return
    keys.current.clear()
    st.current.onDone = null
    st.current.pendingSlug = ''
    walkTo(near.s)
  }

  const knobRef = useRef<HTMLSpanElement>(null)

  const paintKnob = (dx: number, dy: number) => {
    if (knobRef.current) knobRef.current.style.transform = `translate(${dx * 22}px, ${dy * 22}px)`
  }

  const onJoyDown = (e: React.PointerEvent) => {
    e.stopPropagation()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    updateJoy(e)
  }
  const updateJoy = (e: React.PointerEvent) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const cx = box.left + box.width / 2
    const cy = box.top + box.height / 2
    const r = box.width / 2
    let dx = (e.clientX - cx) / r
    let dy = (e.clientY - cy) / r
    const m = Math.hypot(dx, dy)
    if (m > 1) {
      dx /= m
      dy /= m
    }
    if (slugRef.current) return
    joy.current = { x: dx, y: dy }
    paintKnob(dx, dy)
  }
  const onJoyUp = () => {
    joy.current = { x: 0, y: 0 }
    paintKnob(0, 0)
  }

  return (
    <div className="map-screen" ref={screenRef} onPointerDown={handleGround}>
      <div className="map-bg" style={{ backgroundImage: `url(${imgFailed ? '' : MAP_IMAGE})` }} />
      {!imgFailed ? (
        <img
          ref={imgRef}
          className="map-img"
          src={MAP_IMAGE}
          alt="全屏像素小镇地图，沿路分布六个栏目坐标"
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

      {/* 触屏 / 鼠标摇杆：自由走动 */}
      <div
        className="joystick"
        role="button"
        tabIndex={-1}
        aria-label="移动小人"
        onPointerDown={onJoyDown}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === 'touch') updateJoy(e)
        }}
        onPointerUp={onJoyUp}
        onPointerCancel={onJoyUp}
        onPointerLeave={onJoyUp}
      >
        <span className="joy-knob" ref={knobRef} />
      </div>

      <div className="map-hint">
        <span className="hint-name">点坐标 / 点路面 / WASD 走动 → 走到坐标自动拉开抽屉</span>
      </div>
    </div>
  )
}
