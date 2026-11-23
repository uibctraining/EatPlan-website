import { useCallback, useRef } from 'react'

type Props = {
  onChange: (x: number, y: number) => void
}

/** 左手虚拟摇杆：输出归一化向量，右上为 (0,1) */
export default function Joystick({ onChange }: Props) {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const activeId = useRef<number | null>(null)

  const reset = useCallback(() => {
    activeId.current = null
    if (knobRef.current) knobRef.current.style.transform = 'translate(0px, 0px)'
    onChange(0, 0)
  }, [onChange])

  const handle = useCallback(
    (clientX: number, clientY: number) => {
      const base = baseRef.current
      if (!base) return
      const rect = base.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const max = rect.width / 2 - 14
      let dx = clientX - cx
      let dy = clientY - cy
      const len = Math.hypot(dx, dy)
      if (len > max) {
        dx = (dx / len) * max
        dy = (dy / len) * max
      }
      if (knobRef.current) knobRef.current.style.transform = `translate(${dx}px, ${dy}px)`
      onChange(dx / max, -dy / max) // 屏幕 y 向下，输入 y 向上为正
    },
    [onChange],
  )

  return (
    <div
      ref={baseRef}
      className="joystick"
      role="button"
      aria-label="移动摇杆"
      onPointerDown={(e) => {
        activeId.current = e.pointerId
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        handle(e.clientX, e.clientY)
      }}
      onPointerMove={(e) => {
        if (activeId.current === e.pointerId) handle(e.clientX, e.clientY)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div className="joystick-knob" ref={knobRef} />
    </div>
  )
}