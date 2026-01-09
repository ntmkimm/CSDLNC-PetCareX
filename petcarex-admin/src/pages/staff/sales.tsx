// src/pages/staff/sales.tsx
import React, { useEffect, useState } from 'react'
import {
  Card, message, Space, Input, Button, Typography, Tabs, Tag, Spin
} from 'antd'
import { useRouter } from 'next/router'
import { api } from '../../lib/api'
import { getAuth, clearToken } from '../../lib/auth'

// Import các Tab chức năng dành cho khách hàng
import CartTab from '../customers/CartTab'
import PaidTab from '../customers/PaidTab'
import PetsTab from '../customers/PetsTab'
import PackagesTab from '../customers/PackagesTab'

export default function SalesPage() {
  const router = useRouter()
  const [auth, setAuth] = useState<any>(null)
  const [targetMaKH, setTargetMaKH] = useState('') 

  useEffect(() => {
    const a = getAuth()
    if (!a.token) {
      router.replace('/')
      return
    }
    setAuth(a)
  }, [router])

  if (!auth || !router.isReady) return <Spin style={{ padding: 50 }} />

  // Lấy thông tin định danh nhân viên
  const maNV = (router.query.maNV as string) || auth.payload?.sub
  const maCN = (router.query.maCN as string) || auth.payload?.maCN

  const logout = () => {
    clearToken()
    router.replace('/')
  }

  return (
    <div style={{ padding: 16 }}>
      <Card 
        title={<Typography.Title level={4} style={{ margin: 0 }}>🏪 Quầy Bán Hàng & CSKH</Typography.Title>}
        extra={
          <Space>
            <Tag color="purple" style={{ fontSize: 13 }}>Mã NV: {maNV}</Tag>
            <Tag color="cyan" style={{ fontSize: 13 }}>Chi nhánh: {maCN}</Tag>
            <Button danger size="small" onClick={logout}>Đăng xuất</Button>
          </Space>
        }
      >
        {/* KHU VỰC NHẬP MÃ KHÁCH HÀNG */}
        <div style={{ 
          marginBottom: 24, 
          padding: '20px', 
          background: '#f0f2f5', 
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          gap: 12
        }}>
          <Typography.Text strong>Nhập Mã khách hàng cần phục vụ: </Typography.Text>
          <Input 
            placeholder="Ví dụ: KH001, KH002..." 
            style={{ width: 250 }} 
            value={targetMaKH}
            onChange={e => setTargetMaKH(e.target.value.toUpperCase())}
            allowClear
          />
        </div>

        {/* NẾU ĐÃ CÓ MÃ KH THÌ HIỆN CÁC TAB CHỨC NĂNG */}
        {targetMaKH ? (
          <Card type="inner" title={`Đang phục vụ khách hàng: ${targetMaKH}`} style={{ border: '1px solid #d9d9d9' }}>
            <Tabs type="card" defaultActiveKey="cart">
              <Tabs.TabPane key="cart" tab="🛒 Bán hàng & Dịch vụ">
                {/* Truyền thông tin nhân viên xuống để cố định chi nhánh và người thực hiện */}
                <CartTab maKH={targetMaKH} maNV={maNV} maCN={maCN} />
              </Tabs.TabPane>

              <Tabs.TabPane key="pets" tab="🐾 Thú cưng">
                <PetsTab maKH={targetMaKH} />
              </Tabs.TabPane>

              <Tabs.TabPane key="paid" tab="📄 Lịch sử hóa đơn">
                <PaidTab maKH={targetMaKH} />
              </Tabs.TabPane>

              <Tabs.TabPane key="vaccine" tab="📦 Gói vaccine">
                <PackagesTab maKH={targetMaKH} />
              </Tabs.TabPane>
            </Tabs>
          </Card>
        ) : (
          <div style={{ padding: '80px 0', textAlign: 'center', border: '1px dashed #d9d9d9', borderRadius: 8 }}>
            <Typography.Text type="secondary" style={{ fontSize: 16 }}>
              Vui lòng nhập Mã khách hàng ở ô phía trên để bắt đầu thực hiện giao dịch.
            </Typography.Text>
          </div>
        )}
      </Card>
    </div>
  )
}