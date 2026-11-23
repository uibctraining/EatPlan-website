import { useEffect, useRef, useState } from 'react'
import { IslandScene } from '../game/IslandScene'
import Joystick from './Joystick'
import { findSection, formatCoord, sections } from '../data/sections'

type Props = {
  drawerOpen: boolean
  onZoneEnter: (slug: string) => void
  onZoneLeave: (slug: string) => void
  onPickBuilding: (slug: string) => void
  onAction: (slug: string | null) => void
}

/** 全屏 three.js 舞台：画布 + 虚拟摇杆 + 坐标提示（含 WebGL 降级） */
export default function IslandStage({
  drawerOpen,
  onZoneEnter,
  onZoneLeave,
  onPickBuilding,
  onAction,
}: Props) {
  const holderRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<IslandScene | null>(null)
  const [near, setNear] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  // 回调用 ref 保持稳定，避免重建场景
  const cbs = useRef({ onZoneEnter, onZoneLeave, onPickBuilding, onAction })
  cbs.current = { onZoneEnter, onZoneLeave, onPickBuilding, onAction }

  useEffect(() => {
    if (!holderRef.current) return
    let scene: IslandScene
    try {
      scene = new IslandScene(holderRef.current, {
        onZoneEnter: (slug) => cbs.current.onZoneEnter(slug),
        onZoneLeave: (slug) => cbs.current.onZoneLeave(slug),
        onPickBuilding: (slug) => cbs.current.onPickBuilding(slug),
        onAction: (slug) => cbs.current.onAction(slug),
        onNearChange: (slug) => setNear(slug),
      })
    } catch {
      setFailed(true)
      return
    }
    sceneRef.current = scene
    return () => {
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  useEffect(() => {
    sceneRef.current?.setControlsEnabled(!drawerOpen)
  }, [drawerOpen])

  const nearSection = findSection(near ?? undefined)

  return (
    <div className="island-stage">
      <div className="island-canvas" ref={holderRef} />

      {failed && (
        <div className="stage-fallback">
          <p className="section-kicker">NO WEBGL</p>
          <h2>你的浏览器暂不支持 3D 小岛</h2>
          <p>可以直接从坐标入口进入栏目：</p>
          <div className="fallback-grid">
            {sections.map((s) => (
              <button key={s.slug} className="chip" onClick={() => onAction(s.slug)}>
                {s.navLabel} · {formatCoord(s.coord)}
              </button>
            ))}
          </div>
        </div>
      )}

      {!failed && (
        <div className="stage-hint">
          {nearSection ? (
            <>
              <span className="hint-coord">{formatCoord(nearSection.coord)}</span>
              <span className="hint-name">已抵达「{nearSection.navLabel}」坐标</span>
            </>
          ) : (
            <span className="hint-name">拖动摇杆移动 · 点建筑直接走过去</span>
          )}
        </div>
      )}

      {!failed && <Joystick onChange={(x, y) => sceneRef.current?.setJoystick(x, y)} />}

      {nearSection && !drawerOpen && !failed && (
        <button
          className="action-btn"
          onClick={() => {
            sceneRef.current?.action()
            onAction(near)
          }}
        >
          进入「{nearSection.navLabel}」
        </button>
      )}
    </div>
  )
}