import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import MapPortrait from './MapPortrait'
import SectionDrawer from './SectionDrawer'
import { BRAND_BADGE, findSection, sections } from '../data/sections'

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [infoOpen, setInfoOpen] = useState(false)

  const slug = location.pathname.replace(/^\/+|\/+$/g, '')
  const section = slug ? findSection(slug) : undefined
  const unknown = !!slug && !section

  useEffect(() => {
    document.title = section
      ? `${section.title}｜吃货计划 EAT PLAN`
      : unknown
        ? '页面走丢了｜吃货计划 EAT PLAN'
        : '吃货计划 EAT PLAN — 沿着坐标逛马来西亚美食百科'
  }, [section, unknown])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (infoOpen) setInfoOpen(false)
      else if (slug) navigate('/')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [infoOpen, slug, navigate])

  return (
    <div className="app-shell">
      <header className="hud-top">
        <Link to="/" className="brand" aria-label="吃货计划首页">
          <img src={BRAND_BADGE} alt="" className="brand-badge" width={40} height={40} />
          <span className="brand-text">
            <strong>吃货计划</strong>
            <em>EAT PLAN</em>
          </span>
        </Link>

        <nav className="hud-nav" aria-label="坐标直达">
          {sections.map((s) => (
            <button
              key={s.slug}
              className={slug === s.slug ? 'chip is-active' : 'chip'}
              onClick={() => navigate(`/${s.slug}`)}
            >
              {s.navLabel}
            </button>
          ))}
        </nav>

        <button className="hud-info" onClick={() => setInfoOpen(true)} aria-label="关于与链接">
          i
        </button>
      </header>

      <MapPortrait slug={slug} onArrive={(s) => navigate(`/${s}`)} />

      <SectionDrawer
        section={section ?? null}
        unknown={unknown}
        onClose={() => navigate('/')}
        onGoto={(s) => navigate(`/${s}`)}
      />

      {infoOpen && (
        <div className="info-modal" role="dialog" aria-modal="true" aria-label="关于吃货计划">
          <div className="info-card">
            <button className="drawer-close info-close" onClick={() => setInfoOpen(false)} aria-label="关闭">
              ✕
            </button>
            <div className="footer-brand">
              <img src={BRAND_BADGE} alt="" className="brand-badge" width={56} height={56} />
              <div>
                <p className="footer-slogan">下一站，想去哪里？</p>
                <p className="footer-sub">找一处好吃的，走一段有故事的街。</p>
              </div>
            </div>
            <p className="info-desc">
              吃货计划目前收录 294 篇百科文章，覆盖菜式、岁时节庆、食材生态与实地地点，全部附公开来源。这张地图是它的门面，正文仍在主站。
            </p>
            <div className="footer-cols">
              <div className="footer-col">
                <h3>逛地图</h3>
                {sections.map((s) => (
                  <button
                    key={s.slug}
                    onClick={() => {
                      setInfoOpen(false)
                      navigate(`/${s.slug}`)
                    }}
                  >
                    {s.navLabel}
                  </button>
                ))}
              </div>
              <div className="footer-col">
                <h3>去主站</h3>
                <a href="https://eatplan.online/" target="_blank" rel="noopener noreferrer">
                  发现
                </a>
                <a href="https://eatplan.online/market/" target="_blank" rel="noopener noreferrer">
                  市集
                </a>
                <a href="https://eatplan.online/guides/" target="_blank" rel="noopener noreferrer">
                  攻略
                </a>
                <a href="https://eatplan.online/magazine/" target="_blank" rel="noopener noreferrer">
                  百科
                </a>
              </div>
              <div className="footer-col">
                <h3>关于</h3>
                <a href="https://eatplan.online/privacy-policy/" target="_blank" rel="noopener noreferrer">
                  隐私政策
                </a>
                <a href="https://eatplan.online/me/" target="_blank" rel="noopener noreferrer">
                  我的
                </a>
              </div>
            </div>
            <p className="footer-copy">
              © {new Date().getFullYear()} 吃货计划 EAT PLAN · Beta Ver 1.0 · 内容整理自公开来源
            </p>
          </div>
        </div>
      )}
    </div>
  )
}