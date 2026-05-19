import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { getCurrentUser, logout } from '../lib/auth'

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
        ? 'bg-slate-900 text-white'
        : 'text-slate-700 hover:bg-slate-200'
    }`

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-lg tracking-tight">
            <span className="text-slate-900">Gasket</span>
            <span className="text-slate-400 ml-1">QC</span>
          </Link>
          <div className="flex items-center gap-1">
            <NavLink to="/" end className={linkCls}>홈</NavLink>
            <NavLink to="/inspect" className={linkCls}>검사</NavLink>
            <NavLink to="/history" className={linkCls}>이력</NavLink>
            <NavLink to="/mypage" className={linkCls}>마이</NavLink>
            {user ? (
              <button
                onClick={onLogout}
                className="ml-2 px-3 py-2 text-sm text-slate-500 hover:text-slate-900"
                title="로그아웃"
              >
                {user.username} ↗
              </button>
            ) : (
              <NavLink to="/login" className={linkCls}>로그인</NavLink>
            )}
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  )
}
