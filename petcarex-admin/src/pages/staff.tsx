// src/pages/staff.tsx
import React from 'react'
import { Card, Table, message, Space, Input, Button, Form, Modal, DatePicker, Typography, InputNumber, Tabs, Tag, Spin } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import { getAuth } from '../lib/auth'

type AnyRow = Record<string, any>

function getErrMsg(e: any) {
  return e?.response?.data?.detail ?? e?.message ?? 'Có lỗi xảy ra'
}

function toDateStr(d?: Dayjs | null) {
  return d ? d.format('YYYY-MM-DD') : ''
}

type AuthState = ReturnType<typeof getAuth>

export default function StaffPage() {
  const router = useRouter()

  // IMPORTANT: auth=null để SSR + first client render giống nhau (tránh hydration mismatch)
  const [auth, setAuth] = React.useState<AuthState | null>(null)
  React.useEffect(() => setAuth(getAuth()), [])

  // Common inputs (auto from token)
  const [maCN, setMaCN] = React.useState('')
  const [maNV, setMaNV] = React.useState('')
  const [date, setDate] = React.useState<Dayjs | null>(dayjs())

  // NV1 create invoice
  const [invForm] = Form.useForm()
  const [creatingInv, setCreatingInv] = React.useState(false)

  // NV2 vaccines
  const [vaccines, setVaccines] = React.useState<AnyRow[]>([])
  const [loadingVaccines, setLoadingVaccines] = React.useState(false)

  // NV3 revenue daily
  const [revenueRows, setRevenueRows] = React.useState<AnyRow[]>([])
  const [loadingRevenue, setLoadingRevenue] = React.useState(false)

  // NV4 schedule vaccinations
  const [vaccSchedRows, setVaccSchedRows] = React.useState<AnyRow[]>([])
  const [loadingVaccSched, setLoadingVaccSched] = React.useState(false)

  // NV5 schedule exams
  const [examRows, setExamRows] = React.useState<AnyRow[]>([])
  const [loadingExams, setLoadingExams] = React.useState(false)

  // NV6 search invoices
  const [searchForm] = Form.useForm()
  const [invoiceRows, setInvoiceRows] = React.useState<AnyRow[]>([])
  const [loadingInvoices, setLoadingInvoices] = React.useState(false)

  // NV7 inventory
  const [inventory, setInventory] = React.useState<{ products: AnyRow[]; vaccines: AnyRow[] }>({ products: [], vaccines: [] })
  const [loadingInv, setLoadingInv] = React.useState(false)

  // NV8 import stock
  const [importForm] = Form.useForm()
  const [importing, setImporting] = React.useState(false)

  // Modals
  const [vaccModalOpen, setVaccModalOpen] = React.useState(false)

  // ====== Guard + auto-fill from JWT ======
  const warnedRef = React.useRef(false)

  React.useEffect(() => {
    if (auth === null) return

    const payload: any = auth.payload
    const role = payload?.role
    const canAccess = !!auth.token && !!payload && !auth.isExpired && (role === 'staff' || role === 'branch_manager')

    if (!canAccess) {
      if (!warnedRef.current) {
        warnedRef.current = true
        message.info(!auth.token || auth.isExpired ? 'Vui lòng đăng nhập' : 'Không đủ quyền truy cập Staff')
      }
      router.replace('/')
      return
    }

    // Auto MaNV + MaCN
    const tokenMaNV = payload?.sub ? String(payload.sub) : ''
    const tokenMaCN = payload?.maCN ? String(payload.maCN) : ''

    if (tokenMaNV && maNV !== tokenMaNV) setMaNV(tokenMaNV)
    if (tokenMaCN && maCN !== tokenMaCN) setMaCN(tokenMaCN)
  }, [auth, router, maCN, maNV])

  if (auth === null) {
    return (
      <div style={{ padding: 16 }}>
        <Spin />
      </div>
    )
  }

  const payload: any = auth.payload
  const role = payload?.role
  const canAccess = !!auth.token && !!payload && !auth.isExpired && (role === 'staff' || role === 'branch_manager')
  if (!canAccess) return null

  // =========================
  // Handlers
  // =========================

  // NV1
  const createInvoice = async (vals: any) => {
    if (!maNV.trim()) return message.warning('Thiếu MaNV trong token (sub)')
    setCreatingInv(true)
    try {
      const res = await api.post('/staff/invoices', null, {
        params: {
          ma_hoa_don: vals.ma_hoa_don?.trim(),
          ma_kh: vals.ma_kh?.trim(),
          hinh_thuc: vals.hinh_thuc?.trim(),
          ma_nv: maNV.trim(), // AUTO from token
        },
      })
      message.success(`Đã tạo hoá đơn: ${res.data?.MaHoaDon ?? vals.ma_hoa_don}`)
      invForm.resetFields()
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setCreatingInv(false)
    }
  }

  // NV2
  const loadVaccines = async () => {
    setLoadingVaccines(true)
    try {
      const res = await api.get('/staff/vaccines')
      setVaccines(res.data?.items ?? [])
      setVaccModalOpen(true)
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setLoadingVaccines(false)
    }
  }

  // NV3
  const loadRevenueDaily = async () => {
    const cn = maCN.trim()
    const d = toDateStr(date)
    if (!cn) return message.warning('Thiếu MaCN trong token')
    if (!d) return message.warning('Chọn ngày')
    setLoadingRevenue(true)
    try {
      const res = await api.get('/staff/reports/revenue/daily', { params: { date: d, ma_cn: cn } })
      setRevenueRows(res.data?.items ?? [])
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setLoadingRevenue(false)
    }
  }

  // NV4
  const loadVaccinationsSchedule = async () => {
    const cn = maCN.trim()
    const d = toDateStr(date)
    if (!cn) return message.warning('Thiếu MaCN trong token')
    if (!d) return message.warning('Chọn ngày')
    setLoadingVaccSched(true)
    try {
      const res = await api.get('/staff/schedule/vaccinations', { params: { date: d, ma_cn: cn } })
      setVaccSchedRows(res.data?.items ?? [])
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setLoadingVaccSched(false)
    }
  }

  // NV5
  const loadExamsSchedule = async () => {
    const cn = maCN.trim()
    const d = toDateStr(date)
    if (!cn) return message.warning('Thiếu MaCN trong token')
    if (!d) return message.warning('Chọn ngày')
    setLoadingExams(true)
    try {
      const res = await api.get('/staff/schedule/exams', { params: { date: d, ma_cn: cn } })
      setExamRows(res.data?.items ?? [])
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setLoadingExams(false)
    }
  }

  // NV6
  const searchInvoices = async (vals: any) => {
    const cn = maCN.trim()
    if (!cn) return message.warning('Thiếu MaCN trong token')
    const from = vals.from_date ? dayjs(vals.from_date).format('YYYY-MM-DD') : ''
    const to = vals.to_date ? dayjs(vals.to_date).format('YYYY-MM-DD') : ''
    if (!from || !to) return message.warning('Chọn from_date và to_date')

    setLoadingInvoices(true)
    try {
      const res = await api.get('/staff/invoices', {
        params: {
          from_date: from,
          to_date: to,
          ma_cn: cn,
          ma_kh: vals.ma_kh?.trim() || undefined,
        },
      })
      setInvoiceRows(res.data?.items ?? [])
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setLoadingInvoices(false)
    }
  }

  // NV7
  const loadInventory = async () => {
    const cn = maCN.trim()
    if (!cn) return message.warning('Thiếu MaCN trong token')
    setLoadingInv(true)
    try {
      const res = await api.get('/staff/inventory', { params: { ma_cn: cn } })
      setInventory({
        products: res.data?.products ?? [],
        vaccines: res.data?.vaccines ?? [],
      })
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setLoadingInv(false)
    }
  }

  // NV8
  const importStock = async (vals: any) => {
    const cn = maCN.trim()
    if (!cn) return message.warning('Thiếu MaCN trong token')
    setImporting(true)
    try {
      await api.post('/staff/inventory/products/import', null, {
        params: {
          ma_cn: cn,
          ma_sp: vals.ma_sp?.trim(),
          so_luong: vals.so_luong,
        },
      })
      message.success('Đã nhập tồn kho')
      importForm.resetFields()
      loadInventory()
    } catch (e) {
      message.error(getErrMsg(e))
    } finally {
      setImporting(false)
    }
  }

  // =========================
  // Columns
  // =========================

  const vaccineCols: ColumnsType<AnyRow> = [
    { title: 'Mã VC', dataIndex: 'MaVC' },
    { title: 'Tên VC', dataIndex: 'TenVC' },
    { title: 'Đơn giá', dataIndex: 'DonGia', align: 'right' },
    { title: 'Mô tả', dataIndex: 'MoTa' },
  ]

  const revenueCols: ColumnsType<AnyRow> = [
    { title: 'Ngày', dataIndex: 'Ngay' },
    { title: 'Doanh thu', dataIndex: 'DoanhThu', align: 'right', render: (v) => (v == null ? '' : Number(v).toLocaleString('vi-VN')) },
  ]

  const vaccSchedCols: ColumnsType<AnyRow> = [
    { title: 'Mã phiên', dataIndex: 'MaPhien' },
    { title: 'Mã thú cưng', dataIndex: 'MaThuCung' },
    { title: 'Ngày tiêm', dataIndex: 'NgayTiem' },
    { title: 'Mã VC', dataIndex: 'MaVC' },
    { title: 'Tên VC', dataIndex: 'TenVC' },
    { title: 'Số liều', dataIndex: 'SoLieu', align: 'right' },
  ]

  const examCols: ColumnsType<AnyRow> = [
    { title: 'Mã phiên', dataIndex: 'MaPhien' },
    { title: 'Mã thú cưng', dataIndex: 'MaThuCung' },
    { title: 'Bác sĩ', dataIndex: 'BacSiPhuTrach' },
    { title: 'Chẩn đoán', dataIndex: 'ChanDoan' },
    { title: 'Ngày tái khám', dataIndex: 'NgayTaiKham' },
  ]

  const invoiceCols: ColumnsType<AnyRow> = [
    { title: 'Mã HĐ', dataIndex: 'MaHoaDon' },
    { title: 'Mã KH', dataIndex: 'MaKH' },
    { title: 'Ngày lập', dataIndex: 'NgayLap' },
    { title: 'Nhân viên lập', dataIndex: 'NhanVienLap' },
    { title: 'HTTT', dataIndex: 'HinhThucThanhToan' },
    { title: 'Khuyến mãi', dataIndex: 'KhuyenMai', align: 'right' },
    { title: 'Tổng tiền', dataIndex: 'TongTien', align: 'right', render: (v) => (v == null ? '' : Number(v).toLocaleString('vi-VN')) },
  ]

  const invProductCols: ColumnsType<AnyRow> = [
    { title: 'Mã SP', dataIndex: 'MaSP' },
    { title: 'Tên SP', dataIndex: 'TenSP' },
    { title: 'Loại', dataIndex: 'LoaiSP' },
    { title: 'Đơn giá', dataIndex: 'DonGia', align: 'right', render: (v) => (v == null ? '' : Number(v).toLocaleString('vi-VN')) },
    { title: 'Tồn kho', dataIndex: 'SoLuongTonKho', align: 'right' },
  ]

  const invVaccineCols: ColumnsType<AnyRow> = [
    { title: 'Mã VC', dataIndex: 'MaVC' },
    { title: 'Tên VC', dataIndex: 'TenVC' },
    { title: 'Đơn giá', dataIndex: 'DonGia', align: 'right', render: (v) => (v == null ? '' : Number(v).toLocaleString('vi-VN')) },
    { title: 'Tồn kho', dataIndex: 'SoLuongTonKho', align: 'right' },
  ]

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Staff Console (NV1–NV8)"
        extra={
          <Space wrap>
            <Tag color="blue">{role}</Tag>
            {maNV ? <Tag color="geekblue">MaNV: {maNV}</Tag> : null}
            {maCN ? <Tag color="purple">MaCN: {maCN}</Tag> : null}
            <DatePicker value={date} onChange={setDate} />
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          MaNV lấy từ <b>token.sub</b>, MaCN lấy từ <b>token.maCN</b>. Trang này không cần nhập tay nữa.
        </Typography.Paragraph>

        <Tabs
          items={[
            {
              key: 'nv1',
              label: 'NV1 - Tạo hoá đơn',
              children: (
                <Card size="small" title="POST /staff/invoices">
                  <Form form={invForm} layout="vertical" onFinish={createInvoice}>
                    <Space wrap>
                      <Form.Item name="ma_hoa_don" label="MaHoaDon" rules={[{ required: true, message: 'Nhập MaHoaDon' }]}>
                        <Input style={{ width: 220 }} placeholder="HD001" />
                      </Form.Item>
                      <Form.Item name="ma_kh" label="MaKH" rules={[{ required: true, message: 'Nhập MaKH' }]}>
                        <Input style={{ width: 220 }} placeholder="KH001" />
                      </Form.Item>
                      <Form.Item name="hinh_thuc" label="Hình thức thanh toán" rules={[{ required: true, message: 'Nhập hinh_thuc' }]}>
                        <Input style={{ width: 220 }} placeholder="Cash / Card / ..." />
                      </Form.Item>
                    </Space>

                    <Typography.Text type="secondary">
                      MaNV sẽ tự dùng: <b>{maNV || '(missing token.sub)'}</b>
                    </Typography.Text>

                    <div style={{ height: 8 }} />

                    <Button type="primary" htmlType="submit" loading={creatingInv} disabled={!maNV}>
                      Tạo hoá đơn
                    </Button>
                  </Form>
                </Card>
              ),
            },
            {
              key: 'nv2',
              label: 'NV2 - Vaccine',
              children: (
                <Card
                  size="small"
                  title="GET /staff/vaccines"
                  extra={
                    <Button onClick={loadVaccines} loading={loadingVaccines}>
                      Tải danh sách vaccine
                    </Button>
                  }
                >
                  <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                    Danh sách vaccine sẽ mở trong modal để đỡ dài trang.
                  </Typography.Paragraph>

                  <Modal open={vaccModalOpen} onCancel={() => setVaccModalOpen(false)} footer={null} width={900} title="Danh sách vaccine">
                    <Table rowKey={(r) => r.MaVC ?? r.id} dataSource={vaccines} columns={vaccineCols} pagination={{ pageSize: 10 }} />
                  </Modal>
                </Card>
              ),
            },
            {
              key: 'nv3',
              label: 'NV3 - Doanh thu ngày',
              children: (
                <Card
                  size="small"
                  title="GET /staff/reports/revenue/daily"
                  extra={
                    <Button type="primary" onClick={loadRevenueDaily} loading={loadingRevenue} disabled={!maCN}>
                      Xem doanh thu
                    </Button>
                  }
                >
                  <Table rowKey={(r, idx) => `${r.Ngay ?? 'd'}-${idx}`} loading={loadingRevenue} dataSource={revenueRows} columns={revenueCols} pagination={false} />
                </Card>
              ),
            },
            {
              key: 'nv4',
              label: 'NV4 - Lịch tiêm',
              children: (
                <Card
                  size="small"
                  title="GET /staff/schedule/vaccinations"
                  extra={
                    <Button type="primary" onClick={loadVaccinationsSchedule} loading={loadingVaccSched} disabled={!maCN}>
                      Tải lịch tiêm
                    </Button>
                  }
                >
                  <Table
                    rowKey={(r, idx) => `${r.MaPhien ?? 'ph'}-${r.MaVC ?? 'vc'}-${idx}`}
                    loading={loadingVaccSched}
                    dataSource={vaccSchedRows}
                    columns={vaccSchedCols}
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              ),
            },
            {
              key: 'nv5',
              label: 'NV5 - Lịch khám',
              children: (
                <Card
                  size="small"
                  title="GET /staff/schedule/exams"
                  extra={
                    <Button type="primary" onClick={loadExamsSchedule} loading={loadingExams} disabled={!maCN}>
                      Tải lịch khám
                    </Button>
                  }
                >
                  <Table rowKey={(r, idx) => `${r.MaPhien ?? 'ph'}-${idx}`} loading={loadingExams} dataSource={examRows} columns={examCols} pagination={{ pageSize: 10 }} />
                </Card>
              ),
            },
            {
              key: 'nv6',
              label: 'NV6 - Tra cứu hoá đơn',
              children: (
                <Card size="small" title="GET /staff/invoices">
                  <Form
                    form={searchForm}
                    layout="inline"
                    onFinish={searchInvoices}
                    initialValues={{ from_date: dayjs().startOf('month'), to_date: dayjs() }}
                  >
                    <Form.Item name="from_date" label="From" rules={[{ required: true, message: 'Chọn from_date' }]}>
                      <DatePicker />
                    </Form.Item>
                    <Form.Item name="to_date" label="To" rules={[{ required: true, message: 'Chọn to_date' }]}>
                      <DatePicker />
                    </Form.Item>
                    <Form.Item name="ma_kh" label="MaKH (optional)">
                      <Input placeholder="KH001" style={{ width: 180 }} />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={loadingInvoices} disabled={!maCN}>
                        Tìm
                      </Button>
                    </Form.Item>
                  </Form>

                  <div style={{ height: 12 }} />

                  <Table
                    rowKey={(r, idx) => `${r.MaHoaDon ?? 'hd'}-${idx}`}
                    loading={loadingInvoices}
                    dataSource={invoiceRows}
                    columns={invoiceCols}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 900 }}
                  />
                </Card>
              ),
            },
            {
              key: 'nv7',
              label: 'NV7 - Tồn kho',
              children: (
                <Card
                  size="small"
                  title="GET /staff/inventory"
                  extra={
                    <Button type="primary" onClick={loadInventory} loading={loadingInv} disabled={!maCN}>
                      Tải tồn kho
                    </Button>
                  }
                >
                  <Tabs
                    items={[
                      {
                        key: 'p',
                        label: 'Sản phẩm',
                        children: (
                          <Table
                            rowKey={(r, idx) => `${r.MaSP ?? 'sp'}-${idx}`}
                            loading={loadingInv}
                            dataSource={inventory.products}
                            columns={invProductCols}
                            pagination={{ pageSize: 10 }}
                          />
                        ),
                      },
                      {
                        key: 'v',
                        label: 'Vaccine',
                        children: (
                          <Table
                            rowKey={(r, idx) => `${r.MaVC ?? 'vc'}-${idx}`}
                            loading={loadingInv}
                            dataSource={inventory.vaccines}
                            columns={invVaccineCols}
                            pagination={{ pageSize: 10 }}
                          />
                        ),
                      },
                    ]}
                  />
                </Card>
              ),
            },
            {
              key: 'nv8',
              label: 'NV8 - Nhập kho SP',
              children: (
                <Card size="small" title="POST /staff/inventory/products/import">
                  <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                    MaCN lấy từ token: <b>{maCN || '(missing token.maCN)'}</b>
                  </Typography.Paragraph>

                  <Form form={importForm} layout="inline" onFinish={importStock}>
                    <Form.Item name="ma_sp" rules={[{ required: true, message: 'Nhập MaSP' }]}>
                      <Input placeholder="MaSP" style={{ width: 200 }} />
                    </Form.Item>
                    <Form.Item name="so_luong" rules={[{ required: true, message: 'Nhập số lượng' }]}>
                      <InputNumber min={1} placeholder="Số lượng" style={{ width: 140 }} />
                    </Form.Item>
                    <Form.Item>
                      <Button type="primary" htmlType="submit" loading={importing} disabled={!maCN}>
                        Nhập kho
                      </Button>
                    </Form.Item>
                    <Form.Item>
                      <Button onClick={loadInventory} loading={loadingInv} disabled={!maCN}>
                        Refresh tồn kho
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              ),
            },
          ]}
        />
      </Card>
    </div>
  )
}
