import { EventmakerUser } from './api'

const TOKEN_KEY = 'em_token'
const USER_KEY = 'em_user'

export type SessionUser = Pick<EventmakerUser, 'id' | 'email' | 'first_name' | 'last_name'>

export function getSessionToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setSessionToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function getSessionUser(): SessionUser | null {
  const raw = sessionStorage.getItem(USER_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as SessionUser
  } catch {
    sessionStorage.removeItem(USER_KEY)
    return null
  }
}

export function setSessionUser(user: SessionUser): void {
  sessionStorage.setItem(USER_KEY, JSON.stringify(user))
}
