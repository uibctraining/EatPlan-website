import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { BRAND_BADGE, sections } from '../data/sections'

export default function Layout() {
  const location = useLocation()

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
  }, [location.pathname])

  return (
    <div className="site">
      <header className="site-header">
        <Link to="/" className="brand" aria-label="吃货计划首页">
          <img src={BRAND_BADGE} alt="" className="brand-badge" width={44} height={44} />
          <span className="brand-text">
            <strong>吃货计划</strong>
            <em>EAT PLAN</em>
          </span>
        </Link>

        <nav className="site-nav" aria-label="栏目直达">
          {sections.map((s) => (
            <NavLink
              key={s.slug}
              to={`/${s.slug}`}
              className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}
            >
              {s.navLabel}
            </NavLink>
          ))}
          <a
            className="nav-link nav-external"
            href="https://eatplan.online/"
            target="_blank"
            rel="noopener noreferrer"
          >
            主站 ▶
          </a>
        </nav>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <img src={BRAND_BADGE} alt="" className="brand-badge" width={56} height={56} />
            <div>
              <p className="footer-slogan">下一站，想去哪里？</p>
              <p className="footer-sub">找一处好吃的，走一段有故事的街。</p>
            </div>
          </div>

          <div className="footer-cols">
            <div className="footer-col">
              <h3>逛地图</h3>
              {sections.map((s) => (
                <Link key={s.slug} to={`/${s.slug}`}>
                  {s.navLabel}
                </Link>
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
              <a href="https://eatplan.online/places/" target="_blank" rel="noopener noreferrer">
                吃货地图
              </a>
            </div>
            <div className="footer-col">
              <h3>关于</h3>
              <a
                href="https://eatplan.online/privacy-policy/"
                target="_blank"
                rel="noopener noreferrer"
              >
                隐私政策
              </a>
              <a href="https://eatplan.online/me/" target="_blank" rel="noopener noreferrer">
                我的
              </a>
            </div>
          </div>
        </div>
        <p className="footer-copy">
          © {new Date().getFullYear()} 吃货计划 EAT PLAN · Beta Ver 1.0 · 内容整理自公开来源
        </p>
      </footer>
    </div>
  )
}