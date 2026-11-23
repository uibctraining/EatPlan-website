import { Link, useParams } from 'react-router-dom'
import { useEffect } from 'react'
import { findSection, formatCoord, sections } from '../data/sections'

export default function SectionPage() {
  const { slug } = useParams()
  const section = findSection(slug)

  useEffect(() => {
    document.title = section
      ? `${section.title}｜吃货计划 EAT PLAN`
      : '页面走丢了｜吃货计划 EAT PLAN'
  }, [section])

  if (!section) {
    return (
      <div className="notfound">
        <p className="notfound-code">404 · LOST IN THE ATLAS</p>
        <h1>这个坐标上什么都没有</h1>
        <p>可能是旧地图印错了。回到首页重新选一个坐标吧。</p>
        <Link className="btn btn-primary" to="/">
          ← 回到地图
        </Link>
      </div>
    )
  }

  const index = sections.findIndex((s) => s.slug === section.slug)
  const next = sections[(index + 1) % sections.length]

  return (
    <article className="section-page">
      <nav className="crumbs" aria-label="面包屑">
        <Link to="/">地图</Link>
        <span aria-hidden="true">/</span>
        <span>{section.navLabel}</span>
      </nav>

      <header className="section-hero">
        <div className="section-hero-text">
          <p className="section-kicker">{section.enLabel}</p>
          <h1>{section.title}</h1>
          <p className="coord-badge">{formatCoord(section.coord)}</p>
          <p className="section-intro">{section.intro}</p>
          <a
            className="btn btn-primary"
            href={section.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            在主站打开本栏目 ▶
          </a>
        </div>
        <div className="section-hero-art">
          <img src={section.image} alt={`${section.navLabel}栏目插画`} />
        </div>
      </header>

      <section className="items">
        <div className="section-head">
          <p className="section-kicker">SELECTED ENTRIES</p>
          <h2>代表内容</h2>
        </div>
        <ol className="item-list">
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
      </section>

      <nav className="next-stop" aria-label="下一站">
        <p className="section-kicker">NEXT STOP</p>
        <Link to={`/${next.slug}`}>
          <span>下一站：{next.navLabel}</span>
          <span className="next-coord">{formatCoord(next.coord)}</span>
          <span className="next-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      </nav>
    </article>
  )
}
