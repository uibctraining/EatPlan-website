import { useNavigate } from 'react-router-dom'
import { MAP_IMAGE, formatCoord, sections } from '../data/sections'

export default function MapHero() {
  const navigate = useNavigate()

  return (
    <div className="map-scroll">
      <div className="map-frame">
      <img
        className="map-image"
        src={MAP_IMAGE}
        alt="像素风马来西亚美食小镇地图，地图上标示六个栏目坐标入口"
      />

      {sections.map((s) => (
        <button
          key={s.slug}
          type="button"
          className="map-pin"
          style={{ left: `${s.pin.x}%`, top: `${s.pin.y}%` }}
          onClick={() => navigate(`/${s.slug}`)}
          aria-label={`坐标入口：${s.navLabel}（${formatCoord(s.coord)}），点击进入`}
        >
          <span className="pin-dot" aria-hidden="true" />
          <span className="pin-label">
            <span className="pin-name">{s.navLabel}</span>
            <span className="pin-coord">{formatCoord(s.coord)}</span>
          </span>
        </button>
      ))}

      <div className="map-legend" aria-hidden="true">
        <span className="legend-key">↑↓←→</span>
        <span>点选坐标 · 进入栏目</span>
      </div>
      </div>
    </div>
  )
}
