import type { User } from './types'

const KEY = 'gasket-user'

export function getCurrentUser(): User | null {
  const raw = localStorage.getItem(KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export function login(username: string): User {
  const user: User = { username, loggedInAt: Date.now() }
  localStorage.setItem(KEY, JSON.stringify(user))
  return user
}

export function logout() {
  localStorage.removeItem(KEY)
}
