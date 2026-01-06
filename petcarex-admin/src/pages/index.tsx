import React from 'react'
import { useRouter } from 'next/router'
import {
  Card, Button, Typography, Tabs,
  Form, Input, Space, message, Tag, Spin,
} from 'antd'
import { api } from '../lib/api'
import { clearToken, getAuth, setToken } from '../lib/auth'

const { Title, Text } = Typography
type AuthState = ReturnType<typeof getAuth>

export default function Home() {
  const router = useRouter()

  // null để SSR + first client render giống nhau
  const [auth, setAuthState] = React.useState<AuthState | null>(null)
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setAuthState(getAuth())
  }, [])

  /* ================= REDIRECT LOGIC ================= */

  const redirectByRole = (payload: any) => {
    const role = payload?.role

    if (role === 'customer') {
      router.replace('/customers')
      return
    }

    if (role === 'branch_manager') {
      router.replace('/company')
      return
    }

    if (['staff', 'sales_staff', 'veterinarian_staff', 'receptionist_staff'].includes(role)) {
      router.replace('/staff')
      return
    }

    router.replace('/')
  }

  // nếu đã login mà vào lại /
  React.useEffect(() => {
    if (!auth) return
    if (auth.token && auth.payload && !auth.isExpired) {
      redirectByRole(auth.payload)
    }
  }, [auth])

  if (auth === null) {
    return (
      <div style={{ padding: 24 }}>
        <Spin />
      </div>
    )
  }

  const payload = auth.payload
  const loggedIn = !!auth.token && !!payload && !auth.isExpired

  /* ================= LOGIN HANDLERS ================= */

  const doCustomerLogin = async (vals: any) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', null, {
        params: { username: vals.username?.trim(), password: vals.password },
      })
      const token = res.data?.access_token
      if (!token) throw new Error('No token returned')

      setToken(token)
      const nextAuth = getAuth()
      message.success('Customer login OK')
      redirectByRole(nextAuth.payload)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? e?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const doStaffLogin = async (vals: any) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/staff-login', null, {
        params: { ma_nv: vals.ma_nv?.trim(), password: vals.password },
      })
      const token = res.data?.access_token
      if (!token) throw new Error('No token returned')

      setToken(token)
      const nextAuth = getAuth()
      message.success('Staff login OK')
      redirectByRole(nextAuth.payload)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? e?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const logout = () => {
    clearToken()
    setAuthState(getAuth())
    message.success('Đã đăng xuất')
  }

  /* ================= UI ================= */

  return (
    <div style={{ padding: 24 }}>
      <Title>PetCareX Admin</Title>
      <Text type="secondary">Đăng nhập trước, rồi vào module</Text>

      {!loggedIn ? (
        <Card style={{ marginTop: 16 }} title="Login">
          <Tabs
            defaultActiveKey="staff"
            items={[
              {
                key: 'staff',
                label: 'Staff login',
                children: (
                  <Form layout="vertical" onFinish={doStaffLogin}>
                    <Form.Item name="ma_nv" label="MaNV" rules={[{ required: true }]}>
                      <Input placeholder="NV001" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                      <Input.Password placeholder="admin (demo)" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Login staff
                    </Button>
                  </Form>
                ),
              },
              {
                key: 'customer',
                label: 'Customer login',
                children: (
                  <Form layout="vertical" onFinish={doCustomerLogin}>
                    <Form.Item name="username" label="Username" rules={[{ required: true }]}>
                      <Input placeholder="tendangnhap" />
                    </Form.Item>
                    <Form.Item name="password" label="Password" rules={[{ required: true }]}>
                      <Input.Password placeholder="mật khẩu" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading}>
                      Login customer
                    </Button>
                  </Form>
                ),
              },
            ]}
          />
        </Card>
      ) : (
        <Card size="small" style={{ marginTop: 12 }} title="Đã đăng nhập">
          <Space wrap>
            <Tag color="blue">{payload?.role}</Tag>
            <Text>
              <b>sub:</b> {payload?.sub}
            </Text>
            {(payload as any)?.maCN ? (
              <Tag color="purple">MaCN: {(payload as any).maCN}</Tag>
            ) : null}
            <Button danger onClick={logout}>Logout</Button>
          </Space>
        </Card>
      )}
    </div>
  )
}
