import React from 'react'
import {
  Card,
  Table,
  Button,
  Form,
  message,
  Tag,
  Tabs,
  Select,
  InputNumber,
  Divider,
  Typography,
  Popconfirm,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import { getAuth, clearToken } from '../lib/auth'

const { Text, Title } = Typography

/* ===================== TYPES ===================== */

type Pet = { MaThuCung: string; Ten?: string }
type Service = { MaDV: string; TenDV: string }
type Product = { MaSP: string; TenSP: string; DonGia: number }
type Package = { MaGoi: string; TenGoi: string; ThoiGian: number; KhuyenMai: number }

type BookingRow = {
  MaPhien: string
  MaHoaDon: string
  TenThuCung?: string
  TenDV: string
  GiaTien: number
  TrangThai: 'BOOKING' | 'CONFIRMED' | 'CANCELLED'
  MaCN?: string
}

type PaidRow = {
  MaHoaDon: string
  NgayLap: string
  TenDV?: string
  TenSP?: string
  SoLuong?: number
  DonGia?: number
  ThanhTien: number
}

/* ===================== COMPONENT ===================== */

export default function CustomersPage() {
  const router = useRouter()
  const auth = getAuth()
  const payload = auth.payload
  const canUsePage = !!auth.token && payload?.role === 'customer'

  const [maKH, setMaKH] = React.useState('')
  const [pets, setPets] = React.useState<Pet[]>([])
  const [services, setServices] = React.useState<Service[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [packages, setPackages] = React.useState<Package[]>([])

  const [bookings, setBookings] = React.useState<BookingRow[]>([])
  const [paidRows, setPaidRows] = React.useState<PaidRow[]>([])
  const [currentMaHD, setCurrentMaHD] = React.useState<string | null>(null)

  const [loading, setLoading] = React.useState(false)

  const [bookingForm] = Form.useForm()
  const [buyForm] = Form.useForm()
  const [buyPackageForm] = Form.useForm()

  /* ===================== FETCH ===================== */

  React.useEffect(() => {
    if (!canUsePage) {
      message.info('Vui lòng đăng nhập')
      router.replace('/')
      return
    }
    const mkh = String(payload.sub)
    setMaKH(mkh)
    fetchData(mkh)
  }, [])

  const fetchData = async (mkh: string) => {
    try {
      const [
        resPets,
        resSvc,
        resProd,
        resPkg,
        resBooking,
        resPaid,
      ] = await Promise.all([
        api.get('/customer/pets', { params: { ma_kh: mkh } }),
        api.get('/customer/services'),
        api.get('/customer/products/search'),
        api.get('/customer/packages'),
        api.get('/customer/me/bookings', { params: { ma_kh: mkh } }),
        api.get('/customer/me/purchases', { params: { ma_kh: mkh } }),
      ])

      setPets(resPets.data?.items ?? [])
      setServices(resSvc.data?.items ?? [])
      setProducts(resProd.data?.items ?? [])
      setPackages(resPkg.data?.items ?? [])

      const bookingItems = resBooking.data?.items ?? []
      setBookings(bookingItems)
      setCurrentMaHD(bookingItems.length ? bookingItems[0].MaHoaDon : null)

      setPaidRows(resPaid.data?.items ?? [])
    } catch (e) {
      console.error(e)
    }
  }

  /* ===================== COMPUTED ===================== */

  const tempTotal = React.useMemo(() => {
    return bookings.reduce((sum, b) => sum + (b.GiaTien || 0), 0)
  }, [bookings])

  /* ===================== ACTIONS ===================== */

  const submitBooking = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/appointments', null, {
        params: {
          ma_kh: maKH,
          ma_thu_cung: v.ma_thu_cung,
          ma_dv: v.ma_dv,
        },
      })
      message.success('Đã thêm dịch vụ')
      bookingForm.resetFields()
      fetchData(maKH)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Lỗi')
    } finally {
      setLoading(false)
    }
  }

  const submitBuyProduct = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/orders/products', null, {
        params: {
          ma_kh: maKH,
          ma_sp: v.ma_sp,
          so_luong: v.so_luong,
        },
      })
      message.success('Đã thêm sản phẩm')
      buyForm.resetFields()
      fetchData(maKH)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Lỗi')
    } finally {
      setLoading(false)
    }
  }

  const submitBuyPackage = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/packages/buy', null, {
        params: {
          ma_kh: maKH,
          ma_goi: v.ma_goi,
        },
      })
      message.success('Đã thêm gói tiêm')
      buyPackageForm.resetFields()
      fetchData(maKH)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Lỗi mua gói')
    } finally {
      setLoading(false)
    }
  }

  const confirmPayment = async () => {
    if (!currentMaHD) return
    setLoading(true)
    try {
      await api.post('/customer/orders/confirm', null, {
        params: {
          ma_hoa_don: currentMaHD,
          hinh_thuc_thanh_toan: 'Chuyển khoản',
        },
      })
      message.success('Thanh toán thành công')
      fetchData(maKH)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Thanh toán thất bại')
    } finally {
      setLoading(false)
    }
  }

  const cancelBooking = async (maPhien: string) => {
    try {
      await api.delete(`/customer/appointments/${maPhien}`, {
        params: { ma_kh: maKH },
      })
      message.success('Đã hủy')
      fetchData(maKH)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Không thể hủy')
    }
  }

  const logout = () => {
    clearToken()
    router.replace('/')
  }

  /* ===================== TABLE ===================== */

  const bookingColumns: ColumnsType<BookingRow> = [
    { title: 'Phiên', dataIndex: 'MaPhien', width: 90 },
    {
      title: 'Đối tượng',
      dataIndex: 'TenThuCung',
      render: v => v ? <Tag color="cyan">{v}</Tag> : <Text>Mua lẻ</Text>,
    },
    { title: 'Nội dung', dataIndex: 'TenDV', render: v => <Text strong>{v}</Text> },
    { title: 'Chi nhánh', dataIndex: 'MaCN', render: v => v ? <Tag>{v}</Tag> : '-' },
    {
      title: 'Giá',
      dataIndex: 'GiaTien',
      align: 'right',
      render: v => `${v.toLocaleString()}đ`,
    },
    {
      title: 'Thao tác',
      render: (_, r) => (
        <Popconfirm title="Hủy mục này?" onConfirm={() => cancelBooking(r.MaPhien)}>
          <Button danger size="small">Hủy</Button>
        </Popconfirm>
      ),
    },
  ]

  const paidColumns: ColumnsType<PaidRow> = [
    { title: 'Hóa đơn', dataIndex: 'MaHoaDon' },
    { title: 'Ngày', dataIndex: 'NgayLap' },
    { title: 'Nội dung', render: r => r.TenDV || r.TenSP },
    { title: 'SL', dataIndex: 'SoLuong' },
    {
      title: 'Thành tiền',
      dataIndex: 'ThanhTien',
      align: 'right',
      render: v => `${v.toLocaleString()}đ`,
    },
  ]

  /* ===================== UI ===================== */

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
      <Card
        title={<Title level={3}>🐾 PetCareX Portal</Title>}
        extra={<Button danger onClick={logout}>Đăng xuất</Button>}
      >
        <Tabs defaultActiveKey="cart">
          <Tabs.TabPane key="cart" tab="🛒 Giỏ hàng">

            <Tabs type="card">
              <Tabs.TabPane key="svc" tab="Dịch vụ">
                <Form form={bookingForm} layout="inline" onFinish={submitBooking}>
                  <Form.Item name="ma_thu_cung" rules={[{ required: true }]}>
                    <Select placeholder="Thú cưng" style={{ width: 160 }}
                      options={pets.map(p => ({ label: p.Ten, value: p.MaThuCung }))} />
                  </Form.Item>
                  <Form.Item name="ma_dv" rules={[{ required: true }]}>
                    <Select placeholder="Dịch vụ" style={{ width: 220 }}
                      options={services.map(s => ({ label: s.TenDV, value: s.MaDV }))} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>Thêm</Button>
                </Form>
              </Tabs.TabPane>

              <Tabs.TabPane key="prd" tab="Sản phẩm">
                <Form form={buyForm} layout="inline" onFinish={submitBuyProduct}>
                  <Form.Item name="ma_sp" rules={[{ required: true }]}>
                    <Select
                      showSearch
                      placeholder="Sản phẩm"
                      style={{ width: 300 }}
                      options={products.map(p => ({
                        label: `${p.TenSP} (${p.DonGia.toLocaleString()}đ)`,
                        value: p.MaSP,
                      }))} />
                  </Form.Item>
                  <Form.Item name="so_luong" initialValue={1}>
                    <InputNumber min={1} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>Thêm</Button>
                </Form>
              </Tabs.TabPane>

              <Tabs.TabPane key="pkg" tab="💉 Gói tiêm">
                <Form form={buyPackageForm} layout="inline" onFinish={submitBuyPackage}>
                  <Form.Item name="ma_goi" rules={[{ required: true }]}>
                    <Select
                      placeholder="Chọn gói"
                      style={{ width: 360 }}
                      options={packages.map(p => ({
                        label: `${p.TenGoi} (${p.ThoiGian} tháng – KM ${p.KhuyenMai}%)`,
                        value: p.MaGoi,
                      }))} />
                  </Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading}>Mua gói</Button>
                </Form>
              </Tabs.TabPane>
            </Tabs>

            <Divider />

            <Table
              dataSource={bookings}
              columns={bookingColumns}
              rowKey="MaPhien"
              pagination={false}
              summary={() => (
                <Table.Summary.Row>
                  <Table.Summary.Cell colSpan={4} align="right">
                    <Text strong>Tạm tính</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell colSpan={2} align="right">
                    <Text strong style={{ color: '#f5222d', fontSize: 18 }}>
                      {tempTotal.toLocaleString()}đ
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />

            {currentMaHD && (
              <div style={{ marginTop: 24, textAlign: 'right' }}>
                <Button
                  type="primary"
                  danger
                  size="large"
                  loading={loading}
                  onClick={confirmPayment}
                >
                  XÁC NHẬN THANH TOÁN
                </Button>
              </div>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane key="paid" tab="📄 Đã thanh toán">
            <Table
              dataSource={paidRows}
              columns={paidColumns}
              rowKey={r => r.MaHoaDon + r.ThanhTien}
              pagination={{ pageSize: 8 }}
            />
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  )
}
