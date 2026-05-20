import type { Session } from './types'

const KEY = 'gasket-session'
const SESSION_TTL = 12 * 60 * 60 * 1000 // 12시간

interface DemoAccount {
  loginId: string
  password: string
  displayName: string
}

// ── 인증 계정 ──────────────────────────────────────────────
// TODO: 실제 운영 시 이 목록을 인증 서버 API 호출로 대체
//       (POST /auth/login → { token } 응답을 세션에 저장)
const DEMO_ACCOUNTS: DemoAccount[] = [
  { loginId: 'admin', password: 'admin1234', displayName: '관리자' },
]

export function login(loginId: string, password: string): Session | null {
  const acc = DEMO_ACCOUNTS.find(
    (a) => a.loginId === loginId && a.password === password,
  )
  if (!acc) return null
  const session: Session = {
    username: acc.displayName,
    loginId: acc.loginId,
    token:
      typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    issuedAt: Date.now(),
  }
  localStorage.setItem(KEY, JSON.stringify(session))
  return session
}

export function getCurrentUser(): Session | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    const s = JSON.parse(raw) as Session
    if (!s.token || Date.now() - s.issuedAt > SESSION_TTL) {
      localStorage.removeItem(KEY)
      return null
    }
    return s
  } catch {
    return null
  }
}

export function logout() {
  localStorage.removeItem(KEY)
}
