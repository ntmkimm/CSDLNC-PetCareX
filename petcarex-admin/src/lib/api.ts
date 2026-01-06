// src/lib/api.ts
import axios from 'axios'
import { clearToken, getToken } from './auth'

const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000/api'
export const api = axios.create({ baseURL, timeout: 20000 })

api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers = config.headers ?? {}
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // token sai/het han -> logout ve trang home
      clearToken()
      if (typeof window !== 'undefined') {
        if (window.location.pathname !== '/') window.location.href = '/'
      }
    }
    return Promise.reject(err)
  }
)
