// src/pages/customers.tsx
import React from 'react'
import { Tabs, Card, Button, message, Spin } from 'antd'
import { useRouter } from 'next/router'
import { clearToken, getAuth } from '../lib/auth'

import CartTab from './customers/CartTab'
import PaidTab from './customers/PaidTab'
import PetsTab from './customers/PetsTab'
import PackagesTab from './customers/PackagesTab'

export default function CustomersPage() {
  const router = useRouter()

  // ⛑ SSR-safe state
  const [maKH, setMaKH] = React.useState<string | null>(null)

  React.useEffect(() => {
    const auth = getAuth()

    if (!auth.token || !auth.payload || auth.payload.role !== 'customer') {
      message.info('Vui lòng đăng nhập')
      router.replace('/')
      return
    }

    // 🎯 lấy MaKH từ token
    setMaKH(String(auth.payload.sub))
  }, [])

  const logout = () => {
    clearToken()
    router.replace('/')
  }

  // ⏳ Trong lúc chờ client hydrate
  if (!maKH) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin />
      </div>
    )
  }

  return (
    <Card
      title="🐾 PetCareX – Khách hàng"
      extra={<Button danger onClick={logout}>Đăng xuất</Button>}
    >
      <Tabs defaultActiveKey="cart">
        <Tabs.TabPane key="cart" tab="🛒 Giỏ hàng">
          <CartTab maKH={maKH} />
        </Tabs.TabPane>

        <Tabs.TabPane key="paid" tab="📄 Đã thanh toán">
          <PaidTab maKH={maKH} />
        </Tabs.TabPane>

        <Tabs.TabPane key="pets" tab="🐾 Thú cưng">
          <PetsTab maKH={maKH} />
        </Tabs.TabPane>

        <Tabs.TabPane key="vaccine" tab="📦 Gói vaccine">
          <PackagesTab maKH={maKH} />
        </Tabs.TabPane>
      </Tabs>
    </Card>
  )
}
