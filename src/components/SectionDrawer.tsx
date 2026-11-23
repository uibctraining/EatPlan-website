import { formatCoord, sections, type Section } from '../data/sections'

type Props = {
  section: Section | null
  unknown?: boolean
  onClose: () => void
  onGoto: (slug: string) => void
}

/** 走到坐标后从底部拉出的内容抽屉（关闭即回到小岛） */
export default function SectionDrawer({ section, unknown, onClose, onGoto }: Props) {
  const open = !!section || unknown
  const index = section ? sections.findIndex((s) => s.slug === section.slug) : -1
  const next = index >= 0 ? sections[(index + 1) % sections.length] : null

  return (
    <>
      <div
        className={open ? 'drawer-scrim is-open' : 'drawer-scrim'}
        onClick={onClose}
        aria-hidden={!open}
      />
      <aside
        className={open ? 'drawer is-open' : 'drawer'}
        aria-hidden={!open}
        aria-label="坐标内容面板"
      >
        <div className="drawer-handle">
          <span className="handle-bar" />
          <button className="drawer-close" onClick={onClose} aria-label="关闭抽屉">
            ✕
          </button>
        </div>

        <div className="drawer-scroll">
          {unknown && (
            <div className="drawer-404">
              <p className="notfound-code">404 · LOST IN THE ATLAS</p>
              <h2>这个坐标上什么都没有</h2>
              <p>可能是旧地图印错了，回到小岛重新选一个坐标吧。</p>
            </div>
          )}

          {section && (
            <>
              <p className="section-kicker">{section.enLabel}</p>
              <div className="drawer-title-row">
                <h2>{section.title}</h2>
                <span className="coord-badge">{formatCoord(section.coord)}</span>
              </div>
              <p className="drawer-intro">{section.intro}</p>

              <a
                className="btn btn-primary drawer-external"
                href={section.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {section.ctaLabel || '在主站打开本栏目 ▶'}
              </a>

              <p className="section-kicker drawer-sub">SELECTED ENTRIES</p>
              <h3 className="drawer-subtitle">代表内容</h3>
              <ol className="item-list drawer-list">
                {section.items.map((item, i) => (
                  <li key={item.url} className="item-card">
                    <span className="item-no">{String(i + 1).padStart(2, '0')}</span>
                    <div>
                      <a href={item.url} target="_blank" rel="noopener noreferrer">
                        {item.title}
                      </a>
                      <p>{item.desc}</p>
                    </div>
                    <span className="item-arrow" aria-hidden="true">
                      ↗
                    </span>
                  </li>
                ))}
              </ol>

              {next && (
                <button className="drawer-next" onClick={() => onGoto(next.slug)}>
                  <span>下一站：{next.navLabel}</span>
                  <span className="next-coord">{formatCoord(next.coord)}</span>
                  <span aria-hidden="true">→</span>
                </button>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  )
}
