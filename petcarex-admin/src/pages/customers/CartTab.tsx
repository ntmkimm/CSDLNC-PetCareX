import React, { useState, useEffect, useMemo } from 'react'
import {
  Card, Table, Button, Form, message, Tag, Tabs, Select,
  InputNumber, Divider, Typography, Popconfirm, Radio, Space
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../../lib/api'

const { Text } = Typography

/* ===================== TYPES ===================== */
type BookingRow = {
  MaPhien?: string; MaHoaDon: string; TenThuCung?: string;
  TenDV: string; GiaTien: number; TrangThai: string; MaCN?: string;
}

interface CartTabProps {
  maKH: string;
  maNV?: string; // Mã nhân viên thao tác hộ
  maCN?: string; // Chi nhánh nhân viên đang trực
}

export default function CartTab({ maKH, maNV, maCN }: CartTabProps) {
  const [pets, setPets] = useState([])
  const [services, setServices] = useState([])
  const [products, setProducts] = useState([])
  const [packages, setPackages] = useState([])
  const [branches, setBranches] = useState([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [currentMaHD, setCurrentMaHD] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Hình thức thanh toán: Mặc định Tiền mặt cho NV, Chuyển khoản cho Khách
  const [paymentMethod, setPaymentMethod] = useState(maNV ? 'Tiền mặt' : 'Chuyển khoản')

  const [bookingForm] = Form.useForm()
  const [buyForm] = Form.useForm()
  const [buyPackageForm] = Form.useForm()

  // Khi component load, nếu có maCN từ nhân viên thì gán ngay vào form
  useEffect(() => {
    if (maCN) {
      bookingForm.setFieldsValue({ ma_cn: maCN })
      buyForm.setFieldsValue({ ma_cn: maCN })
    }
  }, [maCN, bookingForm, buyForm])

  useEffect(() => {
    if (maKH) fetchData(maKH)
  }, [maKH])

  const fetchData = async (mkh: string) => {
    try {
      const [petsRes, svcsRes, prodsRes, pkgsRes, bookingsRes] = await Promise.all([
        api.get('/customer/pets', { params: { ma_kh: mkh } }),
        api.get('/customer/services'),
        api.get('/customer/products/search'),
        api.get('/customer/packages'),
        api.get('/customer/me/bookings', { params: { ma_kh: mkh } }),
      ])
      setPets(petsRes.data.items || [])
      setServices(svcsRes.data.items || [])
      setProducts(prodsRes.data.items || [])
      setPackages(pkgsRes.data.items || [])
      const bks = bookingsRes.data.items ?? []
      setBookings(bks)
      setCurrentMaHD(bks.length ? bks[0].MaHoaDon : null)
    } catch (e) { console.error(e) }
  }

  const tempTotal = useMemo(() => bookings.reduce((s, b) => s + (b.GiaTien || 0), 0), [bookings])

  /* ===================== ACTIONS ===================== */

  const submitBooking = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/appointments', null, {
        params: { 
            ma_kh: maKH, ma_thu_cung: v.ma_thu_cung, ma_dv: v.ma_dv, 
            ma_cn: v.ma_cn, ma_nv: maNV || 'NV_SYSTEM' 
        },
      })
      message.success('Đã thêm dịch vụ')
      bookingForm.resetFields(['ma_thu_cung', 'ma_dv'])
      if (maCN) bookingForm.setFieldsValue({ ma_cn: maCN })
      fetchData(maKH)
    } catch (e: any) { message.error(e?.response?.data?.detail || 'Lỗi đặt lịch') }
    finally { setLoading(false) }
  }

  const submitBuyProduct = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/orders/products', null, {
        params: { 
            ma_kh: maKH, ma_sp: v.ma_sp, so_luong: v.so_luong, 
            ma_cn: v.ma_cn, ma_nv: maNV || 'NV_SYSTEM' 
        },
      })
      message.success('Đã thêm sản phẩm')
      buyForm.resetFields(['ma_sp', 'so_luong'])
      if (maCN) buyForm.setFieldsValue({ ma_cn: maCN })
      fetchData(maKH)
    } catch (e: any) { message.error(e?.response?.data?.detail || 'Lỗi mua hàng') }
    finally { setLoading(false) }
  }

  const submitBuyPackage = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/packages/buy', null, {
        params: { ma_kh: maKH, ma_goi: v.ma_goi, ma_nv: maNV || 'NV_SYSTEM' },
      })
      message.success('Đã thêm gói tiêm')
      buyPackageForm.resetFields()
      fetchData(maKH)
    } catch (e: any) { message.error(e?.response?.data?.detail || 'Lỗi mua gói') }
    finally { setLoading(false) }
  }

  const confirmPayment = async () => {
    if (!currentMaHD) return
    setLoading(true)
    try {
      await api.post('/customer/orders/confirm', null, {
        params: {
          ma_hoa_don: currentMaHD,
          hinh_thuc_thanh_toan: paymentMethod,
          ma_nv: maNV || 'NV_SYSTEM'
        },
      })
      message.success('Thanh toán thành công')
      fetchData(maKH)
    } catch (e: any) { message.error(e?.response?.data?.detail || 'Lỗi thanh toán') }
    finally { setLoading(false) }
  }

  const cancelBooking = async (maPhien?: string) => {
    if (!maPhien) return
    try {
      await api.delete(`/customer/appointments/${maPhien}`, { params: { ma_kh: maKH } })
      message.success('Đã hủy')
      fetchData(maKH)
    } catch (e: any) { message.error('Không thể hủy') }
  }

  /* ===================== RENDER HELPERS ===================== */

  const BranchItem = () => (
    <Form.Item name="ma_cn" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
      {maCN ? (
        <Tag color="blue" style={{ padding: '4px 10px', fontSize: '13px', margin: 0 }}>
          📍 Chi nhánh: {maCN}
        </Tag>
      ) : (
        <Select placeholder="Chọn chi nhánh" style={{ width: 180 }}
          options={branches.map((b: any) => ({ label: b.TenCN, value: b.MaCN }))}
        />
      )}
    </Form.Item>
  )

  const bookingColumns: ColumnsType<BookingRow> = [
    { title: 'Phiên', dataIndex: 'MaPhien', width: 90 },
    { title: 'Đối tượng', dataIndex: 'TenThuCung', render: (v) => v ? <Tag color="cyan">{v}</Tag> : <Text>—</Text> },
    { title: 'Nội dung', dataIndex: 'TenDV', render: (v) => <Text strong>{v}</Text> },
    { title: 'Chi nhánh', dataIndex: 'MaCN', render: (v) => <Tag>{v}</Tag> },
    { title: 'Giá', dataIndex: 'GiaTien', align: 'right', render: (v) => `${(v || 0).toLocaleString()}đ` },
    {
      title: 'Thao tác',
      render: (_, r) => r.MaPhien && (
        <Popconfirm title="Gỡ bỏ?" onConfirm={() => cancelBooking(r.MaPhien)}>
          <Button danger size="small" type="text">Hủy</Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Tabs type="card">
        {/* TAB DỊCH VỤ */}
        <Tabs.TabPane key="svc" tab="Dịch vụ">
          <Form form={bookingForm} layout="inline" onFinish={submitBooking} style={{ rowGap: 10 }}>
            <Form.Item name="ma_thu_cung" rules={[{ required: true }]}>
              <Select placeholder="Thú cưng" style={{ width: 140 }} options={pets.map((p: any) => ({ label: p.Ten, value: p.MaThuCung }))} />
            </Form.Item>
            <Form.Item name="ma_dv" rules={[{ required: true }]}>
              <Select placeholder="Dịch vụ" style={{ width: 180 }} options={services.map((s: any) => ({ label: s.TenDV, value: s.MaDV }))}
                onChange={async (ma_dv) => {
                  if (maCN) return;
                  const res = await api.get('/customer/branches/by-service', { params: { ma_dv } })
                  setBranches(res.data.items); bookingForm.setFieldsValue({ ma_cn: undefined })
                }}
              />
            </Form.Item>
            <BranchItem />
            <Button type="primary" htmlType="submit" loading={loading}>Thêm</Button>
          </Form>
        </Tabs.TabPane>

        {/* TAB SẢN PHẨM */}
        <Tabs.TabPane key="prd" tab="Sản phẩm">
          <Form form={buyForm} layout="inline" onFinish={submitBuyProduct} style={{ rowGap: 10 }}>
            <Form.Item name="ma_sp" rules={[{ required: true }]}>
              <Select showSearch placeholder="Tìm sản phẩm" style={{ width: 220 }}
                options={products.map((p: any) => ({ label: `${p.TenSP} (${p.DonGia.toLocaleString()}đ)`, value: p.MaSP }))}
                onChange={async (ma_sp) => {
                  if (maCN) return;
                  const res = await api.get('/customer/branches/by-product', { params: { ma_sp } })
                  setBranches(res.data.items); buyForm.setFieldsValue({ ma_cn: undefined })
                }}
              />
            </Form.Item>
            <BranchItem />
            <Form.Item name="so_luong" initialValue={1}><InputNumber min={1} style={{ width: 60 }} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>Thêm</Button>
          </Form>
        </Tabs.TabPane>

        {/* TAB GÓI TIÊM */}
        <Tabs.TabPane key="pkg" tab="💉 Gói vaccine">
          <Form form={buyPackageForm} layout="inline" onFinish={submitBuyPackage}>
            <Form.Item name="ma_goi" rules={[{ required: true }]}>
              <Select placeholder="Chọn gói" style={{ width: 300 }} options={packages.map((p: any) => ({ label: `${p.TenGoi} (${p.ThoiGian} th)`, value: p.MaGoi }))} />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>Mua gói</Button>
          </Form>
        </Tabs.TabPane>
      </Tabs>

      <Table 
        dataSource={bookings} 
        columns={bookingColumns} 
        rowKey={(r, i) => r.MaPhien || i} 
        pagination={false}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell colSpan={4} align="right"><Text strong>Tổng cộng</Text></Table.Summary.Cell>
            <Table.Summary.Cell colSpan={1} align="right">
                <Text strong style={{ color: '#f5222d', fontSize: 18 }}>{tempTotal.toLocaleString()}đ</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />

      {currentMaHD && bookings.length > 0 && (
        <Card size="small" style={{ background: '#fffbe6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space size="large">
                <Text strong>Phương thức thanh toán:</Text>
                {maNV ? (
                  <Radio.Group value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <Radio value="Tiền mặt">Tiền mặt</Radio>
                    <Radio value="Chuyển khoản">Chuyển khoản</Radio>
                  </Radio.Group>
                ) : (
                  <Tag color="orange">Chuyển khoản</Tag>
                )}
            </Space>

            <Button type="primary" danger size="large" onClick={confirmPayment} loading={loading}>
              XÁC NHẬN THANH TOÁN {maNV && `(BỞI ${maNV})`}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}