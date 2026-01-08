// src/pages/customers/CartTab.tsx
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
import { useRouter } from 'next/router'
import { api } from '../../lib/api' // Đảm bảo đường dẫn này đúng với project của bạn
import { clearToken } from '../../lib/auth'

const { Text, Title } = Typography

/* ===================== TYPES ===================== */

type Pet = { MaThuCung: string; Ten?: string }
type Service = { MaDV: string; TenDV: string }
type Product = { MaSP: string; TenSP: string; DonGia: number }
type Package = { MaGoi: string; TenGoi: string; ThoiGian: number; KhuyenMai: number }
type Branch = { MaCN: string; TenCN: string; SoLuongTonKho?: number }

type BookingRow = {
  MaPhien?: string
  MaHoaDon: string
  TenThuCung?: string
  TenDV: string
  GiaTien: number
  TrangThai: 'BOOKING' | 'CONFIRMED' | 'CANCELLED'
  MaCN?: string
}

interface CartTabProps {
  maKH: string
}

/* ===================== COMPONENT ===================== */

export default function CartTab({ maKH }: CartTabProps) {
  const router = useRouter()

  const [pets, setPets] = React.useState<Pet[]>([])
  const [services, setServices] = React.useState<Service[]>([])
  const [products, setProducts] = React.useState<Product[]>([])
  const [packages, setPackages] = React.useState<Package[]>([])
  const [branches, setBranches] = React.useState<Branch[]>([])

  const [bookings, setBookings] = React.useState<BookingRow[]>([])
  const [currentMaHD, setCurrentMaHD] = React.useState<string | null>(null)

  const [loading, setLoading] = React.useState(false)

  const [bookingForm] = Form.useForm()
  const [buyForm] = Form.useForm()
  const [buyPackageForm] = Form.useForm()

  /* ===================== FETCH ===================== */

  React.useEffect(() => {
    if (maKH) {
      fetchData(maKH)
    }
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
      // Lấy mã hóa đơn hiện tại từ dòng đầu tiên nếu có
      setCurrentMaHD(bks.length ? bks[0].MaHoaDon : null)
    } catch (e) {
      console.error('Fetch error:', e)
    }
  }

  /* ===================== COMPUTED ===================== */

  const tempTotal = React.useMemo(
    () => bookings.reduce((s, b) => s + (b.GiaTien || 0), 0),
    [bookings],
  )

  /* ===================== ACTIONS ===================== */

  const submitBooking = async (v: any) => {
    setLoading(true)
    try {
      await api.post('/customer/appointments', null, {
        params: {
          ma_kh: maKH,
          ma_thu_cung: v.ma_thu_cung,
          ma_dv: v.ma_dv,
          ma_cn: v.ma_cn,
        },
      })
      message.success('Đã thêm dịch vụ')
      bookingForm.resetFields()
      setBranches([])
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
          ma_cn: v.ma_cn,
        },
      })
      message.success('Đã thêm sản phẩm')
      buyForm.resetFields()
      setBranches([])
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
        params: { ma_kh: maKH, ma_goi: v.ma_goi },
      })
      message.success('Đã thêm gói tiêm')
      buyPackageForm.resetFields()
      fetchData(maKH)
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Lỗi')
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

  const cancelBooking = async (maPhien?: string) => {
    if (!maPhien) return
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

  /* ===================== TABLE ===================== */

  const bookingColumns: ColumnsType<BookingRow> = [
    { title: 'Phiên', dataIndex: 'MaPhien', width: 90 },
    {
      title: 'Đối tượng',
      dataIndex: 'TenThuCung',
      render: (v) => (v ? <Tag color="cyan">{v}</Tag> : <Text>—</Text>),
    },
    { title: 'Nội dung', dataIndex: 'TenDV', render: (v) => <Text strong>{v}</Text> },
    { title: 'Chi nhánh', dataIndex: 'MaCN', render: (v) => (v ? <Tag>{v}</Tag> : '—') },
    {
      title: 'Giá',
      dataIndex: 'GiaTien',
      align: 'right',
      render: (v) => `${(v || 0).toLocaleString()}đ`,
    },
    {
      title: 'Thao tác',
      render: (_, r) =>
        r.MaPhien ? (
          <Popconfirm title="Hủy mục này?" onConfirm={() => cancelBooking(r.MaPhien)}>
            <Button danger size="small">
              Hủy
            </Button>
          </Popconfirm>
        ) : null,
    },
  ]

  /* ===================== UI ===================== */

  return (
    <div>
      <Tabs type="card">
        {/* ================= DỊCH VỤ ================= */}
        <Tabs.TabPane key="svc" tab="Dịch vụ">
          <Form form={bookingForm} layout="inline" onFinish={submitBooking}>
            <Form.Item name="ma_thu_cung" rules={[{ required: true }]}>
              <Select
                placeholder="Thú cưng"
                style={{ width: 160 }}
                options={pets.map((p) => ({ label: p.Ten, value: p.MaThuCung }))}
              />
            </Form.Item>

            <Form.Item name="ma_dv" rules={[{ required: true }]}>
              <Select
                placeholder="Dịch vụ"
                style={{ width: 220 }}
                options={services.map((s) => ({ label: s.TenDV, value: s.MaDV }))}
                onChange={async (ma_dv) => {
                  const res = await api.get('/customer/branches/by-service', {
                    params: { ma_dv },
                  })
                  setBranches(res.data.items)
                  bookingForm.setFieldsValue({ ma_cn: undefined })
                }}
              />
            </Form.Item>

            <Form.Item name="ma_cn" rules={[{ required: true }]}>
              <Select
                placeholder="Chi nhánh"
                style={{ width: 200 }}
                options={branches.map((b) => ({
                  label: b.TenCN,
                  value: b.MaCN,
                }))}
              />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading}>
              Thêm
            </Button>
          </Form>
        </Tabs.TabPane>

        {/* ================= SẢN PHẨM ================= */}
        <Tabs.TabPane key="prd" tab="Sản phẩm">
          <Form form={buyForm} layout="inline" onFinish={submitBuyProduct}>
            <Form.Item name="ma_sp" rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder="Sản phẩm"
                style={{ width: 300 }}
                options={products.map((p) => ({
                  label: `${p.TenSP} (${(p.DonGia || 0).toLocaleString()}đ)`,
                  value: p.MaSP,
                }))}
                onChange={async (ma_sp) => {
                  const res = await api.get('/customer/branches/by-product', {
                    params: { ma_sp },
                  })
                  setBranches(res.data.items)
                  buyForm.setFieldsValue({ ma_cn: undefined })
                }}
              />
            </Form.Item>

            <Form.Item name="ma_cn" rules={[{ required: true }]}>
              <Select
                placeholder="Chi nhánh"
                style={{ width: 220 }}
                options={branches.map((b) => ({
                  label: `${b.TenCN} (Tồn ${b.SoLuongTonKho})`,
                  value: b.MaCN,
                }))}
              />
            </Form.Item>

            <Form.Item name="so_luong" initialValue={1}>
              <InputNumber min={1} />
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading}>
              Thêm
            </Button>
          </Form>
        </Tabs.TabPane>

        {/* ================= GÓI TIÊM ================= */}
        <Tabs.TabPane key="pkg" tab="💉 Gói tiêm">
          <Form form={buyPackageForm} layout="inline" onFinish={submitBuyPackage}>
            <Form.Item name="ma_goi" rules={[{ required: true }]}>
              <Select
                placeholder="Chọn gói"
                style={{ width: 380 }}
                options={packages.map((p) => ({
                  label: `${p.TenGoi} (${p.ThoiGian} tháng – KM ${p.KhuyenMai}%)`,
                  value: p.MaGoi,
                }))}
              />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              Mua gói
            </Button>
          </Form>
        </Tabs.TabPane>
      </Tabs>

      <Divider />

      <Table
        dataSource={bookings}
        columns={bookingColumns}
        rowKey={(r) => r.MaPhien ?? `${r.MaHoaDon}-${r.TenDV}`}
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

      {currentMaHD && bookings.length > 0 && (
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
    </div>
  )
}