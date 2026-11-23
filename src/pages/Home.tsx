import { Link } from 'react-router-dom'
import { useEffect } from 'react'
import MapHero from '../components/MapHero'
import { formatCoord, sections } from '../data/sections'

export default function Home() {
  useEffect(() => {
    document.title = '下一站，想去哪里？｜吃货计划 EAT PLAN'
  }, [])

  return (
    <div className="home">
      <section className="hero">
        <p className="hero-kicker">EAT PLAN · MALAYSIA FOOD ATLAS</p>
        <h1 className="hero-title">
          下一站，想去哪里？
          <span className="hero-cursor" aria-hidden="true" />
        </h1>
        <p className="hero-sub">找一处好吃的，走一段有故事的街。六个坐标，六种逛法。</p>
        <div className="hero-actions">
          <a
            className="btn btn-primary"
            href="https://eatplan.online/"
            target="_blank"
            rel="noopener noreferrer"
          >
            进入吃货计划主站
          </a>
          <a className="btn btn-ghost" href="#atlas">
            逛逛这张地图 ↓
          </a>
        </div>
      </section>

      <section id="atlas" className="atlas">
        <MapHero />
      </section>

      <section className="guide">
        <div className="section-head">
          <p className="section-kicker">TRAVEL GUIDE</p>
          <h2>行程手册 · 六个坐标入口</h2>
          <p className="section-desc">
            每个坐标对应一个栏目页：点地图上的坐标，或直接从这里进入。
          </p>
        </div>

        <div className="guide-grid">
          {sections.map((s, i) => (
            <Link key={s.slug} to={`/${s.slug}`} className="guide-card">
              <div className="guide-thumb">
                <img src={s.image} alt="" loading={i < 3 ? 'eager' : 'lazy'} />
                <span className="guide-no">{String(i + 1).padStart(2, '0')}</span>
              </div>
              <div className="guide-body">
                <p className="guide-en">{s.enLabel}</p>
                <h3>{s.navLabel}</h3>
                <p className="guide-coord">{formatCoord(s.coord)}</p>
                <p className="guide-intro">{s.intro}</p>
                <span className="guide-cta">进入坐标 →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="promo">
        <div className="promo-inner">
          <div>
            <p className="section-kicker">ABOUT EAT PLAN</p>
            <h2>一座用中文整理的马来西亚美食百科</h2>
            <p>
              吃货计划目前收录 294 篇百科文章，覆盖菜式、岁时节庆、食材生态与实地地点，全部附公开来源。这张地图官网是它的门面，正文仍在主站。
            </p>
            <a
              className="btn btn-primary"
              href="https://eatplan.online/magazine/"
              target="_blank"
              rel="noopener noreferrer"
            >
              打开百科 ▶
            </a>
          </div>
        </div>
      </section>
    </div>
  )
}
