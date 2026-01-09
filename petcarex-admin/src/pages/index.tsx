import React from 'react'
import { useRouter } from 'next/router'
import {
  Card, Button, Typography, Tabs,
  Form, Input, Space, message, Tag, Spin, Select,
} from 'antd'
import { api } from '../lib/api'
import { clearToken, getAuth, setToken } from '../lib/auth'

const { Title, Text } = Typography
const { Option } = Select
type AuthState = ReturnType<typeof getAuth>

export default function Home() {
  const router = useRouter()

  const [auth, setAuthState] = React.useState<AuthState | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState('staff') // Quản lý tab đang mở

  React.useEffect(() => {
    setAuthState(getAuth())
  }, [])

  /* ================= REDIRECT LOGIC ================= */
  const redirectByRole = (payload: any) => {
    const role = payload?.role
    if (role === 'customer') { router.replace('/customers'); return }
    if (role === 'branch_manager') { router.replace('/company'); return }
    if (['staff', 'sales_staff', 'veterinarian_staff', 'receptionist_staff'].includes(role)) {
      router.replace('/staff'); return
    }
    router.replace('/')
  }

  React.useEffect(() => {
    if (!auth) return
    if (auth.token && auth.payload && !auth.isExpired) {
      redirectByRole(auth.payload)
    }
  }, [auth])

  if (auth === null) return <div style={{ padding: 24 }}><Spin /></div>
  const payload = auth.payload
  const loggedIn = !!auth.token && !!payload && !auth.isExpired

  /* ================= HANDLERS ================= */

  const doCustomerLogin = async (vals: any) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/login', null, {
        params: { username: vals.username?.trim(), password: vals.password },
      })
      setToken(res.data?.access_token)
      message.success('Customer login OK')
      redirectByRole(getAuth().payload)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? e?.message ?? 'Login failed')
    } finally { setLoading(false) }
  }

  const doCustomerRegister = async (vals: any) => {
    setLoading(true)
    try {
      // Gửi params qua URL theo yêu cầu backend "bỏ Body"
      await api.post('/auth/register', null, {
        params: {
          username: vals.username,
          password: vals.password,
          Hoten: vals.Hoten,
          CCCD: vals.CCCD,
          Gioitinh: vals.Gioitinh,
          Email: vals.Email,
          SDT: vals.SDT,
        },
      })
      message.success('Đăng ký thành công! Hãy đăng nhập.')
      setActiveTab('customer') // Chuyển sang tab đăng nhập sau khi đăng ký xong
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? e?.message ?? 'Đăng ký thất bại')
    } finally { setLoading(false) }
  }

  const doStaffLogin = async (vals: any) => {
    setLoading(true)
    try {
      const res = await api.post('/auth/staff-login', null, {
        params: { ma_nv: vals.ma_nv?.trim(), password: vals.password },
      })
      setToken(res.data?.access_token)
      message.success('Staff login OK')
      redirectByRole(getAuth().payload)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? e?.message ?? 'Login failed')
    } finally { setLoading(false) }
  }

  const logout = () => {
    clearToken()
    setAuthState(getAuth())
    message.success('Đã đăng xuất')
  }

  return (
    <div style={{ padding: 24, maxWidth: 600, margin: 'auto' }}>
      <Title>PetCareX Admin</Title>
      
      {!loggedIn ? (
        <Card style={{ marginTop: 16 }} title="Hệ thống quản lý">
          <Tabs
            activeKey={activeTab}
            onChange={(key) => setActiveTab(key)}
            items={[
              {
                key: 'staff',
                label: 'Nhân viên',
                children: (
                  <Form layout="vertical" onFinish={doStaffLogin}>
                    <Form.Item name="ma_nv" label="Mã nhân viên" rules={[{ required: true }]}>
                      <Input placeholder="NV000001" />
                    </Form.Item>
                    <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>Đăng nhập nhân viên</Button>
                  </Form>
                ),
              },
              {
                key: 'customer',
                label: 'Khách đăng nhập',
                children: (
                  <Form layout="vertical" onFinish={doCustomerLogin}>
                    <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true }]}>
                      <Input placeholder="username" />
                    </Form.Item>
                    <Form.Item name="password" label="Mật khẩu" rules={[{ required: true }]}>
                      <Input.Password />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" loading={loading} block>Đăng nhập khách hàng</Button>
                  </Form>
                ),
              },
              {
                key: 'register',
                label: 'Đăng ký khách hàng',
                children: (
                  <Form layout="vertical" onFinish={doCustomerRegister}>
                    <Space style={{ display: 'flex' }} align="start">
                      <Form.Item name="Hoten" label="Họ tên" rules={[{ required: true }]}>
                        <Input placeholder="Nguyễn Văn A" />
                      </Form.Item>
                      <Form.Item name="Gioitinh" label="Giới tính" rules={[{ required: true }]}>
                        <Select placeholder="Chọn" style={{ width: 100 }}>
                          <Option value="Nam">Nam</Option>
                          <Option value="Nữ">Nữ</Option>
                        </Select>
                      </Form.Item>
                    </Space>
                    
                    <Form.Item name="SDT" label="Số điện thoại" rules={[{ required: true }]}>
                      <Input placeholder="09xxxx" />
                    </Form.Item>

                    <Form.Item name="CCCD" label="CCCD" rules={[{ required: false }]}>
                      <Input placeholder="Số căn cước" />
                    </Form.Item>

                    <Form.Item name="Email" label="Email" rules={[{ type: 'email' }]}>
                      <Input placeholder="example@gmail.com" />
                    </Form.Item>

                    <Divider />

                    <Form.Item name="username" label="Tên đăng nhập mới" rules={[{ required: true }]}>
                      <Input />
                    </Form.Item>
                    <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true }]}>
                      <Input.Password />
                    </Form.Item>

                    <Button type="primary" htmlType="submit" loading={loading} block color="green" variant="solid">
                      Xác nhận đăng ký
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
            <Text><b>sub:</b> {payload?.sub}</Text>
            {(payload as any)?.maCN ? <Tag color="purple">MaCN: {(payload as any).maCN}</Tag> : null}
            <Button danger onClick={logout}>Logout</Button>
          </Space>
        </Card>
      )}
    </div>
  )
}

const Divider = () => <div style={{ height: 1, background: '#f0f0f0', margin: '16px 0' }} />