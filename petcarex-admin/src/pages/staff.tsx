import React from 'react'
import {
  Card, Table, message, Space, Input, Button, Form, Modal,
  DatePicker, Typography, InputNumber, Tabs, Tag, Spin,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import dayjs, { Dayjs } from 'dayjs'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import { getAuth, clearToken } from '../lib/auth'

type AnyRow = Record<string, any>
type AuthState = ReturnType<typeof getAuth>

const ROLE_NV: Record<string, string[]> = {
  branch_manager: ['nv1','nv2','nv3','nv4','nv5','nv6','nv7','nv8'],
  sales_staff: ['nv1','nv6'],
  veterinarian_staff: ['nv4','nv5'],
  receptionist_staff: ['nv1','nv2','nv6'],
}

function toDateStr(d?: Dayjs | null) {
  return d ? d.format('YYYY-MM-DD') : ''
}
function getErrMsg(e: any) {
  return e?.response?.data?.detail ?? e?.message ?? 'Có lỗi xảy ra'
}

export default function StaffPage() {
  const router = useRouter()
  const [auth, setAuth] = React.useState<AuthState | null>(null)
  React.useEffect(() => setAuth(getAuth()), [])

  const [maCN, setMaCN] = React.useState('')
  const [maNV, setMaNV] = React.useState('')
  const [date, setDate] = React.useState<Dayjs | null>(dayjs())

  const [invForm] = Form.useForm()
  const [searchForm] = Form.useForm()
  const [importForm] = Form.useForm()

  const [creatingInv, setCreatingInv] = React.useState(false)

  const [vaccines, setVaccines] = React.useState<AnyRow[]>([])
  const [loadingVaccines, setLoadingVaccines] = React.useState(false)

  const [revenueRows, setRevenueRows] = React.useState<AnyRow[]>([])
  const [vaccSchedRows, setVaccSchedRows] = React.useState<AnyRow[]>([])
  const [examRows, setExamRows] = React.useState<AnyRow[]>([])
  const [invoiceRows, setInvoiceRows] = React.useState<AnyRow[]>([])
  const [inventory, setInventory] = React.useState<{products:AnyRow[];vaccines:AnyRow[]}>({products:[],vaccines:[]})

  const [loadingRevenue, setLoadingRevenue] = React.useState(false)
  const [loadingVaccSched, setLoadingVaccSched] = React.useState(false)
  const [loadingExams, setLoadingExams] = React.useState(false)
  const [loadingInvoices, setLoadingInvoices] = React.useState(false)
  const [loadingInv, setLoadingInv] = React.useState(false)
  const [importing, setImporting] = React.useState(false)

  /** ===== Invoice detail ===== */
  const [invDetail, setInvDetail] = React.useState<any>(null)
  const [invDetailOpen, setInvDetailOpen] = React.useState(false)

  React.useEffect(() => {
    if (!auth) return
    const p:any = auth.payload
    if (!auth.token || auth.isExpired) {
      message.info('Vui lòng đăng nhập')
      router.replace('/')
      return
    }
    setMaNV(String(p?.sub ?? ''))
    setMaCN(String(p?.maCN ?? ''))
  }, [auth, router])

  if (!auth) return <Spin style={{ padding: 24 }} />

  const role = auth.payload?.role
  const allowedNV = ROLE_NV[role] ?? []

  /* ================= API ================= */

  const createInvoice = async (v:any) => {
    setCreatingInv(true)
    try {
      await api.post('/staff/invoices', null, {
        params: { ...v, ma_nv: maNV },
      })
      message.success('Đã tạo hoá đơn')
      invForm.resetFields()
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setCreatingInv(false) }
  }

  const loadVaccines = async () => {
    setLoadingVaccines(true)
    try {
      const r = await api.get('/staff/vaccines')
      setVaccines(r.data?.items ?? [])
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingVaccines(false) }
  }

  const loadRevenueDaily = async () => {
    setLoadingRevenue(true)
    try {
      const r = await api.get('/staff/reports/revenue/daily', {
        params: { date: toDateStr(date), ma_cn: maCN },
      })
      setRevenueRows(r.data?.items ?? [])
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingRevenue(false) }
  }

  const loadVaccinationsSchedule = async () => {
    setLoadingVaccSched(true)
    try {
      const r = await api.get('/staff/schedule/vaccinations', {
        params: { date: toDateStr(date), ma_cn: maCN },
      })
      setVaccSchedRows(r.data?.items ?? [])
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingVaccSched(false) }
  }

  const loadExamsSchedule = async () => {
    setLoadingExams(true)
    try {
      const r = await api.get('/staff/schedule/exams', {
        params: { date: toDateStr(date), ma_cn: maCN },
      })
      setExamRows(r.data?.items ?? [])
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingExams(false) }
  }

  const searchInvoices = async (v:any) => {
    setLoadingInvoices(true)
    try {
      const r = await api.get('/staff/invoices', {
        params: {
          ma_cn: maCN,
          from_date: dayjs(v.from_date).format('YYYY-MM-DD'),
          to_date: dayjs(v.to_date).format('YYYY-MM-DD'),
          ma_kh: v.ma_kh || undefined,
        },
      })
      setInvoiceRows(r.data?.items ?? [])
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingInvoices(false) }
  }

  const loadInvoiceDetail = async (maHD:string) => {
    const r = await api.get(`/staff/invoices/${maHD}`)
    setInvDetail(r.data)
    setInvDetailOpen(true)
  }

  const loadInventory = async () => {
    setLoadingInv(true)
    try {
      const r = await api.get('/staff/inventory', { params: { ma_cn: maCN } })
      setInventory(r.data)
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setLoadingInv(false) }
  }

  const importStock = async (v:any) => {
    setImporting(true)
    try {
      await api.post('/staff/inventory/products/import', null, {
        params: { ma_cn: maCN, ...v },
      })
      message.success('Đã nhập kho')
      importForm.resetFields()
      loadInventory()
    } catch (e) { message.error(getErrMsg(e)) }
    finally { setImporting(false) }
  }

  /* ================= UTILS ================= */

  const simpleCols = (keys:string[]):ColumnsType<any> =>
    keys.map(k => ({ title:k, dataIndex:k }))

  /* ================= NV MAP ================= */

  const NV_MAP: Record<string, any> = {

    nv1: {
      key:'nv1', label:'NV1 - Tạo hoá đơn',
      children: (
        <Card>
          <Form form={invForm} layout="inline" onFinish={createInvoice}>
            <Form.Item name="ma_hoa_don"><Input placeholder="MaHD"/></Form.Item>
            <Form.Item name="ma_kh"><Input placeholder="MaKH"/></Form.Item>
            <Form.Item name="hinh_thuc"><Input placeholder="HTTT"/></Form.Item>
            <Button type="primary" htmlType="submit" loading={creatingInv}>Tạo</Button>
          </Form>
        </Card>
      ),
    },

    nv2: {
      key:'nv2', label:'NV2 - Vaccine',
      children: (
        <Card>
          <Table
            loading={loadingVaccines}
            dataSource={vaccines}
            columns={simpleCols(['MaVC','TenVC','DonGia'])}
          />
        </Card>
      ),
    },

    nv3: {
      key:'nv3', label:'NV3 - Doanh thu',
      children: (
        <Card extra={<Button onClick={loadRevenueDaily} loading={loadingRevenue}>Xem</Button>}>
          <Table dataSource={revenueRows} columns={simpleCols(['Ngay','DoanhThu'])}/>
        </Card>
      ),
    },

    nv4: {
      key:'nv4', label:'NV4 - Lịch tiêm',
      children: (
        <Card extra={<Button onClick={loadVaccinationsSchedule} loading={loadingVaccSched}>Tải</Button>}>
          <Table dataSource={vaccSchedRows} columns={simpleCols(['MaPhien','TenVC','SoLieu'])}/>
        </Card>
      ),
    },

    nv5: {
      key:'nv5', label:'NV5 - Lịch khám',
      children: (
        <Card extra={<Button onClick={loadExamsSchedule} loading={loadingExams}>Tải</Button>}>
          <Table dataSource={examRows} columns={simpleCols(['MaPhien','ChanDoan'])}/>
        </Card>
      ),
    },

    nv6: {
      key:'nv6', label:'NV6 - Tra cứu hoá đơn',
      children: (
        <Card>
          <Form form={searchForm} layout="inline" onFinish={searchInvoices}>
            <Form.Item name="from_date"><DatePicker/></Form.Item>
            <Form.Item name="to_date"><DatePicker/></Form.Item>
            <Form.Item name="ma_kh"><Input placeholder="MaKH"/></Form.Item>
            <Button htmlType="submit" loading={loadingInvoices}>Tìm</Button>
          </Form>

          <Table
            dataSource={invoiceRows}
            columns={simpleCols(['MaHoaDon','TongTien'])}
            onRow={(r) => ({
              onClick: () => loadInvoiceDetail(r.MaHoaDon),
            })}
          />

          <Modal
            open={invDetailOpen}
            footer={null}
            width={900}
            onCancel={() => setInvDetailOpen(false)}
          >
            <Typography.Title level={5}>
              Hoá đơn {invDetail?.hoa_don?.MaHoaDon}
            </Typography.Title>

            <p>Tổng tiền: {invDetail?.hoa_don?.TongTien}</p>
            <p>Khuyến mãi: {invDetail?.hoa_don?.KhuyenMai}</p>

            <Typography.Title level={5}>Phiên dịch vụ</Typography.Title>
            <Table
              dataSource={invDetail?.phien_dich_vu}
              columns={simpleCols(['MaPhien','TenDV','GiaTien'])}
              pagination={false}
            />

            <Typography.Title level={5}>Tiêm phòng</Typography.Title>
            <Table
              dataSource={invDetail?.tiem_phong}
              columns={simpleCols(['TenVC','SoLieu','NgayTiem'])}
              pagination={false}
            />
          </Modal>
        </Card>
      ),
    },

    nv7: {
      key:'nv7', label:'NV7 - Tồn kho',
      children: (
        <Card extra={<Button onClick={loadInventory} loading={loadingInv}>Tải</Button>}>
          <Table dataSource={inventory.products} columns={simpleCols(['MaSP','SoLuongTonKho'])}/>
        </Card>
      ),
    },

    nv8: {
      key:'nv8', label:'NV8 - Nhập kho',
      children: (
        <Card>
          <Form form={importForm} layout="inline" onFinish={importStock}>
            <Form.Item name="ma_sp"><Input placeholder="MaSP"/></Form.Item>
            <Form.Item name="so_luong"><InputNumber min={1}/></Form.Item>
            <Button htmlType="submit" loading={importing}>Nhập</Button>
          </Form>
        </Card>
      ),
    },
  }

  const logout = () => {
    clearToken()
    message.success('Đã đăng xuất')
    router.replace('/')
  }

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Staff Console"
        extra={
          <Space wrap>
            <Tag color="blue">{role}</Tag>
            <Tag color="geekblue">MaNV:{maNV}</Tag>
            <Tag color="purple">MaCN:{maCN}</Tag>
            <DatePicker value={date} onChange={setDate} />
            <Button danger onClick={logout}>Logout</Button>
          </Space>
        }
      >
        <Tabs
          items={allowedNV.map(k => NV_MAP[k])}
          onChange={(key) => {
            if (key === 'nv2' && vaccines.length === 0) loadVaccines()
          }}
        />
      </Card>
    </div>
  )
}
