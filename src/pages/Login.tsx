import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login, getCurrentUser } from '../lib/auth'

export default function Login() {
  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const from = (loc.state as { from?: string } | null)?.from ?? '/'

  if (getCurrentUser()) {
    nav(from, { replace: true })
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const id = loginId.trim()
    const pw = password.trim()

    if (!id || !pw) {
      setError('아이디와 비밀번호를 입력해주세요.')
      setLoading(false)
      return
    }

    const success = login(id, pw)
    setLoading(false)

    if (success) {
      nav(from, { replace: true })
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white ring-1 ring-slate-200 border border-slate-200 rounded-lg p-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-1">GASKET QC</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-1">로그인</h2>
        <p className="text-sm text-slate-500 mb-6">
          아이디와 비밀번호를 입력하세요.
        </p>

        {error && (
          <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              아이디
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="admin"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              autoFocus
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2 border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={!loginId.trim() || !password.trim() || loading}
            className="w-full py-2.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed font-medium transition"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-6 p-3 bg-slate-50 rounded-md border border-slate-200">
          <div className="text-xs font-semibold text-slate-700 mb-2">📋 데모 계정</div>
          <div className="space-y-1 text-xs text-slate-600">
            <div>
              아이디: <span className="font-mono text-slate-900">admin</span>
            </div>
            <div>
              비밀번호: <span className="font-mono text-slate-900">admin1234</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
