// src/lib/auth.ts
export type AuthPayload = {
  sub: string
  role: string
  maCN?: string
  chucvu?: string
  exp?: number // unix seconds
}

const TOKEN_KEY = 'petcarex_token'

export function setToken(token: string) {
  if (typeof window === 'undefined') return
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
  if (typeof window === 'undefined') return
  localStorage.removeItem(TOKEN_KEY)
}

function base64UrlDecode(input: string) {
  const pad = '='.repeat((4 - (input.length % 4)) % 4)
  const base64 = (input + pad).replace(/-/g, '+').replace(/_/g, '/')
  // atob handles base64
  return decodeURIComponent(
    Array.prototype.map
      .call(atob(base64), (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join('')
  )
}

export function decodeJwt<T = any>(token: string): T | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payloadJson = base64UrlDecode(parts[1])
    return JSON.parse(payloadJson) as T
  } catch {
    return null
  }
}

export function getAuth() {
  const token = getToken()
  const payload = token ? decodeJwt<AuthPayload>(token) : null
  const nowSec = Math.floor(Date.now() / 1000)
  const isExpired = !!payload?.exp && payload.exp <= nowSec
  return { token, payload, isExpired }
}

export function isAuthed() {
  const { token, payload, isExpired } = getAuth()
  return !!token && !!payload && !isExpired
}
