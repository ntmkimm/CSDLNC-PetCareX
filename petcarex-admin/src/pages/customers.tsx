import React from 'react'
import {
  Card,
  Table,
  Space,
  Button,
  Form,
  message,
  Popconfirm,
  Tag,
  Tabs,
  Select,
  InputNumber,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import { getAuth, clearToken } from '../lib/auth'

/* ===================== TYPES ===================== */

type Pet = {
  MaThuCung: string
  Ten?: string
}

type Service = {
  MaDV: string
  TenDV: string
}

type BookingRow = {
  MaPhien: string
  TenThuCung: string
  TenDV: string
  GiaTien: number
  TrangThai: 'BOOKING' | 'CONFIRMED' | 'CANCELLED'
}

type AppointmentRow = {
  MaPhien: string
  MaHoaDon: string
  NgayLap: string
  TenThuCung: string
  TenDV: string
  GiaTien: number
}

type PurchaseRow = {
  MaHoaDon: string
  TenSP: string
  SoLuong: number
  ThanhTien: number
}

/* ===================== COMPONENT ===================== */

export default function CustomersPage() {
  const router = useRouter()
  const auth = getAuth()
  const payload = auth.payload

  const canUsePage = !!auth.token && payload?.role === 'customer'

  const [maKH, setMaKH] = React.useState<string>('')

  const [pets, setPets] = React.useState<Pet[]>([])
  const [services, setServices] = React.useState<Service[]>([])

  const [bookings, setBookings] = React.useState<BookingRow[]>([])
  const [appointments, setAppointments] = React.useState<AppointmentRow[]>([])
  const [purchases, setPurchases] = React.useState<PurchaseRow[]>([])

  const [bookingForm] = Form.useForm()
  const [loadingBooking, setLoadingBooking] = React.useState(false)

  /* ===================== AUTH ===================== */

  React.useEffect(() => {
    if (!canUsePage) {
      message.info('Vui lòng đăng nhập')
      router.replace('/')
      return
    }

    const mkh = String(payload.sub)
    setMaKH(mkh)

    fetchPets(mkh)
    fetchServices()
    fetchBookings(mkh)
    fetchAppointments(mkh)
    fetchPurchases(mkh)
  }, [])

  /* ===================== API ===================== */

  const fetchPets = async (mkh = maKH) => {
    const res = await api.get('/customer/pets', { params: { ma_kh: mkh } })
    setPets(res.data?.items ?? [])
  }

  const fetchServices = async () => {
    const res = await api.get('/customer/services')
    setServices(res.data?.items ?? [])
  }

  const fetchBookings = async (mkh = maKH) => {
    const res = await api.get('/customer/me/bookings', {
      params: { ma_kh: mkh },
    })
    setBookings(res.data?.items ?? [])
  }

  const fetchAppointments = async (mkh = maKH) => {
    const res = await api.get('/customer/me/appointments', {
      params: { ma_kh: mkh },
    })
    setAppointments(res.data?.items ?? [])
  }

  const fetchPurchases = async (mkh = maKH) => {
    const res = await api.get('/customer/me/purchases', {
      params: { ma_kh: mkh },
    })
    setPurchases(res.data?.items ?? [])
  }

  /* ===================== ACTIONS ===================== */

  const submitBooking = async (v: any) => {
    setLoadingBooking(true)
    try {
      await api.post('/customer/appointments', null, {
        params: {
          ma_kh: maKH,
          ma_thu_cung: v.ma_thu_cung,
          ma_dv: v.ma_dv,
        },
      })
      message.success('Đã đặt dịch vụ')
      bookingForm.resetFields()
      fetchBookings()
    } catch (e: any) {
      message.error(e?.response?.data?.detail ?? 'Có lỗi xảy ra')
    } finally {
      setLoadingBooking(false)
    }
  }

  const cancelBooking = async (row: BookingRow) => {
    await api.delete(`/customer/appointments/${row.MaPhien}`, {
      params: { ma_kh: maKH },
    })
    message.success('Đã huỷ dịch vụ')
    fetchBookings()
  }

  const logout = () => {
    clearToken()
    router.replace('/')
  }

  /* ===================== TABLE ===================== */

  const bookingCols: ColumnsType<BookingRow> = [
    { title: 'Mã phiên', dataIndex: 'MaPhien' },
    { title: 'Thú cưng', dataIndex: 'TenThuCung' },
    { title: 'Dịch vụ', dataIndex: 'TenDV' },
    { title: 'Giá', dataIndex: 'GiaTien' },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (v) =>
        v === 'BOOKING' ? (
          <Tag color="blue">Đã đặt</Tag>
        ) : v === 'CONFIRMED' ? (
          <Tag color="green">Đã khám</Tag>
        ) : (
          <Tag color="red">Đã huỷ</Tag>
        ),
    },
    {
      title: 'Huỷ',
      render: (_, r) =>
        r.TrangThai === 'BOOKING' ? (
          <Popconfirm title="Huỷ dịch vụ này?" onConfirm={() => cancelBooking(r)}>
            <Button danger>Huỷ</Button>
          </Popconfirm>
        ) : null,
    },
  ]

  const appointmentCols: ColumnsType<AppointmentRow> = [
    { title: 'Ngày', dataIndex: 'NgayLap' },
    { title: 'Thú cưng', dataIndex: 'TenThuCung' },
    { title: 'Dịch vụ', dataIndex: 'TenDV' },
    { title: 'Giá', dataIndex: 'GiaTien' },
  ]

  /* ===================== UI ===================== */

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Customer Portal"
        extra={
          <Space>
            <Tag color="purple">{payload?.sub}</Tag>
            <Button danger onClick={logout}>
              Logout
            </Button>
          </Space>
        }
      >
        <Tabs
          items={[
            {
              key: 'booking',
              label: '📅 Đặt dịch vụ',
              children: (
                <Card size="small" title="Mua dịch vụ khám">
                  <Form
                    form={bookingForm}
                    layout="inline"
                    onFinish={submitBooking}
                  >
                    <Form.Item
                      name="ma_thu_cung"
                      rules={[{ required: true, message: 'Chọn thú cưng' }]}
                    >
                      <Select placeholder="Thú cưng" style={{ width: 180 }}>
                        {pets.map((p) => (
                          <Select.Option key={p.MaThuCung} value={p.MaThuCung}>
                            {p.Ten}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="ma_dv"
                      rules={[{ required: true, message: 'Chọn dịch vụ' }]}
                    >
                      <Select placeholder="Dịch vụ" style={{ width: 220 }}>
                        {services.map((s) => (
                          <Select.Option key={s.MaDV} value={s.MaDV}>
                            {s.TenDV}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loadingBooking}
                    >
                      Đặt dịch vụ
                    </Button>
                  </Form>

                </Card>
              ),
            },
            {
              key: 'bookings',
              label: '📋 Dịch vụ đã đặt',
              children: (
                <Table
                  rowKey="MaPhien"
                  dataSource={bookings}
                  columns={bookingCols}
                />
              ),
            },
            {
              key: 'appointments',
              label: '🩺 Đã khám',
              children: (
                <Table
                  rowKey="MaPhien"
                  dataSource={appointments}
                  columns={appointmentCols}
                />
              ),
            },
            {
              key: 'purchases',
              label: '🛒 Mua hàng',
              children: (
                <Table
                  rowKey={(r) => `${r.MaHoaDon}-${r.TenSP}`}
                  dataSource={purchases}
                  columns={[
                    { title: 'Hoá đơn', dataIndex: 'MaHoaDon' },
                    { title: 'Sản phẩm', dataIndex: 'TenSP' },
                    { title: 'SL', dataIndex: 'SoLuong' },
                    { title: 'Thành tiền', dataIndex: 'ThanhTien' },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
