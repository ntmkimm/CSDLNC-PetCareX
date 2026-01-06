// src/lib/requireRole.ts
import { getAuth } from './auth'
import { message } from 'antd'

export function requireRole(allowed: string[]) {
  const auth = getAuth()
  const payload: any = auth.payload

  if (!auth.token || auth.isExpired) {
    message.info('Vui lòng đăng nhập')
    return false
  }

  if (!allowed.includes(payload?.role)) {
    message.error('Không đủ quyền')
    return false
  }

  return true
}
