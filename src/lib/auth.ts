import { isFirebaseConfigured } from './firebase'
import { syncFromFirestore } from './history'
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

/**
 * 로그인. 성공 시 세션을 localStorage 에 저장하고 반환.
 * Firebase 가 설정되어 있으면 로그인 직후 원격 이력을 받아 로컬 캐시에 병합한다.
 */
export async function login(
  loginId: string,
  password: string,
): Promise<Session | null> {
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

  if (isFirebaseConfigured()) {
    try {
      const n = await syncFromFirestore()
      if (n > 0) console.info(`[auth] Firestore 동기화: ${n}건 로컬로 병합`)
    } catch (e) {
      console.warn('[auth] Firestore 동기화 실패 (로컬 캐시로 진행):', e)
    }
  }

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
