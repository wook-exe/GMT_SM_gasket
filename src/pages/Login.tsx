import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login, getCurrentUser } from '../lib/auth'

export default function Login() {
  const [username, setUsername] = useState('')
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/inspect'

  if (getCurrentUser()) {
    nav(from, { replace: true })
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const u = username.trim()
    if (!u) return
    login(u)
    nav(from, { replace: true })
  }

  return (
    <div className="max-w-sm mx-auto mt-8 bg-white rounded-lg border border-slate-200 p-8">
      <h2 className="text-2xl font-bold mb-2 text-slate-900">로그인</h2>
      <p className="text-sm text-slate-500 mb-6">
        간이 로그인입니다. 서버 인증 없이 사용자명만으로 동작하며,
        검사 이력이 사용자별로 분리되어 저장됩니다.
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            사용자명
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="예: 홍길동 / line3-shift-a"
            className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-900 text-sm"
            autoFocus
          />
        </div>
        <button
          type="submit"
          disabled={!username.trim()}
          className="w-full py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition"
        >
          로그인
        </button>
      </form>
    </div>
  )
}
