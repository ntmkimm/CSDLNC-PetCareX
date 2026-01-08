// src/pages/staff/sales.tsx
import React, { useEffect, useState } from 'react'
import {
  Card, Table, message, Space, Input, Button, Form, Modal,
  DatePicker, Typography, Tabs, Tag, Spin
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs from 'dayjs'
import { useRouter } from 'next/router'
import { api } from '../../lib/api'
import { getAuth, clearToken } from '../../lib/auth'

// Import các Tab của khách hàng
import CartTab from '../customers/CartTab'
import PaidTab from '../customers/PaidTab'
import PetsTab from '../customers/PetsTab'
import PackagesTab from '../customers/PackagesTab'

type AnyRow = Record<string, any>

function getErrMsg(e: any) {
  return e?.response?.data?.detail ?? e?.message ?? 'Có lỗi xảy ra'
}

export default function SalesPage() {
  const router = useRouter()
  
  // 1. Lấy thông tin từ URL Query hoặc Auth
  const queryMaNV = router.query.maNV as string
  const queryMaCN = router.query.maCN as string

  const [auth, setAuth] = useState<any>(null)
  const [targetMaKH, setTargetMaKH] = useState('') // MaKH đang phục vụ

  // 2. States cho NV1 & NV6
  const [invForm] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [creatingInv, setCreatingInv] = useState(false)
  const [invoiceRows, setInvoiceRows] = useState<AnyRow[]>([])
  const [loadingInvoices, setLoadingInvoices] = useState(false)
  const [invDetail, setInvDetail] = useState<any>(null)
  const [invDetailOpen, setInvDetailOpen] = useState(false)

  useEffect(() => {
    const a = getAuth()
    if (!a.token) {
      router.replace('/')
      return
    }
    setAuth(a)
  }, [router])

  if (!auth || !router.isReady) return <Spin style={{ padding: 50 }} />

  // Ưu tiên lấy từ URL, nếu không có thì lấy từ token
  const maNV = queryMaNV || auth.payload?.sub
  const maCN = queryMaCN || auth.payload?.maCN
  const role = auth.payload?.role

  /* ================= API HANDLERS (NV1 & NV6) ================= */

  const createInvoice = async (v: any) => {
    setCreatingInv(true)
    try {
      await api.post('/staff/invoices', null, {
        params: { ...v, ma_nv: maNV },
      })
      message.success('Đã tạo hoá đơn thành công')
      invForm.resetFields()
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setCreatingInv(false) }
  }

  const searchInvoices = async (v: any) => {
    setLoadingInvoices(true)
    try {
      const r = await api.get('/staff/invoices', {
        params: {
          ma_cn: maCN,
          from_date: v.range?.[0]?.format('YYYY-MM-DD'),
          to_date: v.range?.[1]?.format('YYYY-MM-DD'),
          ma_kh: v.ma_kh || undefined,
        },
      })
      setInvoiceRows(r.data?.items ?? [])
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingInvoices(false) }
  }

  const loadInvoiceDetail = async (maHD: string) => {
    try {
      const r = await api.get(`/staff/invoices/${maHD}`)
      setInvDetail(r.data)
      setInvDetailOpen(true)
    } catch (e) { message.error(getErrMsg(e)) }
  }

  const logout = () => {
    clearToken()
    router.replace('/')
  }

  const simpleCols = (keys: string[]): ColumnsType<any> =>
    keys.map(k => ({ title: k, dataIndex: k }))

  return (
    <div style={{ padding: 16 }}>
      <Card 
        title={<Typography.Title level={4} style={{ margin: 0 }}>🛒 Quầy Bán Hàng & CSKH</Typography.Title>}
        extra={
          <Space wrap>
            <Tag color="gold">{role?.toUpperCase()}</Tag>
            <Tag color="blue">Mã NV: {maNV}</Tag>
            <Tag color="purple">Chi nhánh: {maCN}</Tag>
            <Button danger size="small" onClick={logout}>Đăng xuất</Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="staff_actions">
          
          {/* TAB 1: NGHIỆP VỤ NHÂN VIÊN (NV1, NV6) */}
          <Tabs.TabPane tab="Nghiệp vụ Nhân viên" key="staff_actions">
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              
              {/* NV1: Tạo hoá đơn */}
              <Card size="small" title="NV1 - Tạo hoá đơn nhanh">
                <Form form={invForm} layout="inline" onFinish={createInvoice}>
                  <Form.Item name="ma_hoa_don" rules={[{required: true}]}><Input placeholder="Mã HD"/></Form.Item>
                  <Form.Item name="ma_kh" rules={[{required: true}]}><Input placeholder="Mã KH"/></Form.Item>
                  <Form.Item name="hinh_thuc" initialValue="Tiền mặt"><Input placeholder="HT Thanh toán"/></Form.Item>
                  <Button type="primary" htmlType="submit" loading={creatingInv}>Tạo ngay</Button>
                </Form>
              </Card>

              {/* NV6: Tra cứu */}
              <Card size="small" title="NV6 - Tra cứu hoá đơn hệ thống">
                <Form form={searchForm} layout="inline" onFinish={searchInvoices} style={{ marginBottom: 16 }}>
                  <Form.Item name="range"><DatePicker.RangePicker /></Form.Item>
                  <Form.Item name="ma_kh"><Input placeholder="Lọc theo Mã KH (tùy chọn)"/></Form.Item>
                  <Button type="default" htmlType="submit" loading={loadingInvoices}>Tìm kiếm</Button>
                </Form>
                <Table
                  size="small"
                  dataSource={invoiceRows}
                  columns={simpleCols(['MaHoaDon', 'TongTien', 'NgayLap', 'TrangThai'])}
                  onRow={(r) => ({ onClick: () => loadInvoiceDetail(r.MaHoaDon) })}
                  pagination={{ pageSize: 5 }}
                />
              </Card>
            </Space>
          </Tabs.TabPane>

          {/* TAB 2: THAO TÁC HỘ KHÁCH HÀNG (Tương tự Customers Page) */}
          <Tabs.TabPane tab="Phục vụ Khách hàng" key="customer_actions">
            <div style={{ marginBottom: 20, padding: '16px', background: '#f5f5f5', borderRadius: 8 }}>
              <Typography.Text strong>Nhập Mã khách hàng để bắt đầu: </Typography.Text>
              <Input 
                placeholder="Ví dụ: KH001, KH002..." 
                style={{ width: 250, marginLeft: 12 }} 
                value={targetMaKH}
                onChange={e => setTargetMaKH(e.target.value.toUpperCase())}
              />
            </div>

            {targetMaKH ? (
              <Card type="inner" title={`Đang thao tác cho khách hàng: ${targetMaKH}`}>
                <Tabs type="card" defaultActiveKey="cart">
                  <Tabs.TabPane key="cart" tab="🛒 Giỏ hàng">
                    {/* Truyền maKH, maNV, maCN vào để xử lý nghiệp vụ bán hàng hộ */}
                    <CartTab maKH={targetMaKH} maNV={maNV} maCN={maCN} />
                  </Tabs.TabPane>

                  <Tabs.TabPane key="paid" tab="📄 Đã thanh toán">
                    <PaidTab maKH={targetMaKH} />
                  </Tabs.TabPane>

                  <Tabs.TabPane key="pets" tab="🐾 Thú cưng">
                    <PetsTab maKH={targetMaKH} />
                  </Tabs.TabPane>

                  <Tabs.TabPane key="vaccine" tab="📦 Gói vaccine">
                    <PackagesTab maKH={targetMaKH} />
                  </Tabs.TabPane>
                </Tabs>
              </Card>
            ) : (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Typography.Text type="secondary">Vui lòng nhập Mã khách hàng ở trên để sử dụng các tính năng giỏ hàng/thú cưng.</Typography.Text>
              </div>
            )}
          </Tabs.TabPane>

        </Tabs>
      </Card>

      {/* Modal chi tiết hoá đơn (Dùng chung cho NV6) */}
      <Modal
        title={`Chi tiết hoá đơn: ${invDetail?.hoa_don?.MaHoaDon}`}
        open={invDetailOpen}
        footer={null}
        width={800}
        onCancel={() => setInvDetailOpen(false)}
      >
        {invDetail && (
          <>
            <Typography.Paragraph>
              <b>Ngày lập:</b> {invDetail.hoa_don.NgayLap} | <b>Tổng tiền:</b> {invDetail.hoa_don.TongTien} VNĐ
            </Typography.Paragraph>
            <Divider orientation="left">Dịch vụ sử dụng</Divider>
            <Table 
              size="small" 
              pagination={false}
              dataSource={invDetail.phien_dich_vu} 
              columns={simpleCols(['MaPhien', 'TenDV', 'GiaTien'])} 
            />
          </>
        )}
      </Modal>
    </div>
  )
}

// Helper nhỏ để chia gạch ngang trong Modal
const Divider = ({ children, orientation }: any) => (
  <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0' }}>
    <div style={{ flex: orientation === 'left' ? 0 : 1, height: 1, background: '#eee' }} />
    <span style={{ padding: '0 10px', fontWeight: 'bold' }}>{children}</span>
    <div style={{ flex: 1, height: 1, background: '#eee' }} />
  </div>
)