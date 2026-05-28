import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../lib/auth'
import Chatbot from './Chatbot'

const NAV = [
  { to: '/', label: '대시보드', end: true },
  { to: '/live', label: '현장 검사', end: false },
  { to: '/inspect', label: '단건 검사', end: false },
  { to: '/history', label: '검사 이력', end: false },
  { to: '/mypage', label: '검사 현황', end: false },
]

export default function Layout() {
  const user = getCurrentUser()
  const nav = useNavigate()

  const onLogout = () => {
    logout()
    nav('/login')
  }

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive
        ? 'bg-slate-100 text-slate-900'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold tracking-tight">
            <span className="text-slate-900">GASKET</span>
            <span className="text-slate-600">QC</span>
          </Link>
          <div className="flex items-center gap-1">
            {user &&
              NAV.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={linkCls}>
                  {n.label}
                </NavLink>
              ))}
            {user ? (
              <button
                onClick={onLogout}
                className="ml-2 px-3 py-2 text-sm text-slate-600 hover:text-slate-900 transition"
                title="로그아웃"
              >
                {user.username} ↗
              </button>
            ) : (
              <NavLink to="/login" className={linkCls}>
                로그인
              </NavLink>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
      {user && <Chatbot />}
    </div>
  )
}
