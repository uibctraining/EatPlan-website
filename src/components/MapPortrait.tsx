import { useEffect, useMemo, useRef, useState } from 'react'
import { formatCoord, sections } from '../data/sections'
import { PATH, PINS, STOPS } from '../map/mapLayout'
import { FRAME_W, FRAMES, createWalkerSprite } from '../map/sprite'

const MAP_IMAGE =
  '/manus-storage/async-images/GETtFLV81WaX0AKd4Epwfc/image-1.webp'

const SCALE = 4 // 精灵图 16px → 显示 64px
const SPEED = 170 // 小人每秒走多少像素

type Props = {
  /** 当前路由坐标（chips 打开时小人也会走过去） */
  slug: string
  /** 小人抵达坐标 → 拉出抽屉 */
  onArrive: (slug: string) => void
}

/**
 * 竖屏平面图：整张地图一屏呈现，点坐标 → 小人沿石板路走过去 → 到达拉开抽屉。
 */
export default function MapPortrait({ slug, onArrive }: Props) {
  const frameRef = useRef<HTMLDivElement>(null)
  const charRef = useRef<HTMLDivElement>(null)
  const [imgFailed, setImgFailed] = useState(false)
  const sprite = useMemo(() => createWalkerSprite(), [])

  const st = useRef({
    s: 0, // 沿 PATH 的位置：整数=节点，小数=段内比例
    target: 0,
    onDone: null as null | ((slug: string) => void),
    pendingSlug: '',
    pathPx: [] as { x: number; y: number }[],
    len: [] as number[],
    total: 0,
    facing: 1,
    frame: 0,
    frameClock: 0,
    walking: false,
    ready: false,
  })

  const measure = () => {
    const frame = frameRef.current
    if (!frame) return
    const r = frame.getBoundingClientRect()
    st.current.pathPx = PATH.map((p) => ({ x: (p.x / 100) * r.width, y: (p.y / 100) * r.height }))
    const len: number[] = []
    let total = 0
    for (let i = 0; i < st.current.pathPx.length - 1; i++) {
      const a = st.current.pathPx[i]
      const b = st.current.pathPx[i + 1]
      const d = Math.hypot(b.x - a.x, b.y - a.y)
      len.push(d)
      total += d
    }
    st.current.len = len
    st.current.total = total
    st.current.ready = true
    paint()
  }

  const posOf = (s: number): { x: number; y: number } => {
    const pts = st.current.pathPx
    if (!pts.length) return { x: 0, y: 0 }
    const n = pts.length
    const clamped = Math.max(0, Math.min(n - 1, s))
    const seg = Math.min(Math.floor(clamped), n - 2)
    const frac = clamped - seg
    const a = pts[seg]
    const b = pts[seg + 1]
    return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }
  }

  const paint = () => {
    const el = charRef.current
    if (!el) return
    const p = posOf(st.current.s)
    el.style.left = `${p.x}px`
    el.style.top = `${p.y}px`
    el.style.transform = `translate(-50%, -88%) scaleX(${st.current.facing})`
    el.style.backgroundPosition = `${-st.current.frame * FRAME_W * SCALE}px 0px`
  }

  /** 走到路径节点 node；完成后回调 */
  const walkTo = (node: number, onDone?: (slug: string) => void, pendingSlug = '') => {
    const s = st.current
    if (!s.ready || node < 0 || node > PATH.length - 1) {
      onDone?.(pendingSlug)
      return
    }
    s.target = node
    s.onDone = onDone ?? null
    s.pendingSlug = pendingSlug
    if (Math.abs(s.s - node) < 0.01) {
      s.walking = false
      s.onDone?.(s.pendingSlug)
      s.onDone = null
      return
    }
    s.walking = true
  }

  // 尺寸变化时重算路径像素坐标
  useEffect(() => {
    measure()
    const ro = new ResizeObserver(() => measure())
    if (frameRef.current) ro.observe(frameRef.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 路由变化（chips 直达）→ 小人也走过去
  useEffect(() => {
    if (!slug) return
    const node = STOPS[slug]
    if (node !== undefined) walkTo(node)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // 主循环：行走插值 + 帧动画
  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const s = st.current
      if (!s.ready) return

      if (s.walking) {
        const n = PATH.length
        const seg = Math.min(Math.floor(s.s), n - 2)
        const segLen = s.len[seg] || 1
        const ds = (SPEED * dt) / segLen
        const diff = s.target - s.s
        if (Math.abs(diff) <= ds) {
          s.s = s.target
          s.walking = false
          const cb = s.onDone
          const slug = s.pendingSlug
          s.onDone = null
          cb?.(slug)
        } else {
          s.s += Math.sign(diff) * ds
          // 朝向：按屏幕 x 方向翻转
          const before = posOf(s.s - Math.sign(diff) * 0.01)
          const after = posOf(s.s)
          if (Math.abs(after.x - before.x) > 0.4) s.facing = after.x >= before.x ? 1 : -1
        }
        // 行走帧动画
        s.frameClock += dt
        if (s.frameClock > 0.16) {
          s.frameClock = 0
          s.frame = s.frame === 1 ? 2 : 1
        }
      } else {
        s.frame = 0
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
    walkTo(node, onArrive, slug)
  }

  return (
    <div className="map-screen">
      <div className="map-frame" ref={frameRef}>
        {!imgFailed ? (
          <img
            className="map-img"
            src={MAP_IMAGE}
            alt="竖屏像素小镇地图，沿路分布六个栏目坐标"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <div className="map-img map-img-fallback" />
        )}

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
              onClick={() => handlePin(s.slug)}
              aria-label={`坐标：${s.navLabel}（${formatCoord(s.coord)}），让小人走过去并打开`}
            >
              <span className="pin-label">
                <span className="pin-name">{s.navLabel}</span>
                <span className="pin-coord">{formatCoord(s.coord)}</span>
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
            width: FRAME_W * SCALE,
            height: 16 * SCALE,
            backgroundImage: `url(${sprite})`,
            backgroundSize: `${FRAME_W * FRAMES * SCALE}px ${16 * SCALE}px`,
          }}
        />
      </div>

      <div className="stage-hint map-hint">
        <span className="hint-name">点坐标 → 小人沿路走过去 → 自动拉开抽屉</span>
      </div>
    </div>
  )
}