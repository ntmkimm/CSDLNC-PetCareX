// src/pages/company.tsx
import React from 'react'
import dynamic from 'next/dynamic'
import { Card, Row, Col, Table, Button, InputNumber, message, Space, Tag, Typography } from 'antd'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import { getAuth, clearToken } from '../lib/auth'

const BranchBar = dynamic(() => import('../components/charts/BranchBar'), { ssr: false })
const MembershipPie = dynamic(() => import('../components/charts/MembershipPie'), { ssr: false })

type Branch = { MaCN?: string; TenCN?: string; DoanhThu?: number }
type TotalData = { TongDoanhThu?: number } | Record<string, any>
type Service = { MaDV?: string; TenDV?: string; SoLan?: number; DoanhThu?: number }
type Membership = { Bac?: string; SoLuong?: number }
type CustomerBranch = { MaCN?: string; SoKhach?: number } | { MaCN?: string; SoKhachHang?: number }
type PetStat = { Loai?: string; SoLuong?: number }

export default function CompanyPage() {
  const router = useRouter()
  const auth = getAuth()
  const payload = auth.payload
  const warnedRef = React.useRef(false)

  const role = payload?.role
  const maCNFromToken = (payload as any)?.maCN as string | undefined
  const canAccess = !!auth.token && !!payload && !auth.isExpired && (role === 'staff' || role === 'branch_manager')

  // ======= Guard =======
  React.useEffect(() => {
    if (canAccess) return

    if (!warnedRef.current) {
      warnedRef.current = true
      message.info(!auth.token || auth.isExpired ? 'Vui lòng đăng nhập' : 'Không đủ quyền truy cập Company')
    }
    router.replace('/')
  }, [canAccess, auth.token, auth.isExpired, router])

  // ======= states =======
  const [byBranch, setByBranch] = React.useState<Branch[]>([])
  const [totalData, setTotalData] = React.useState<TotalData>({})
  const [topServices, setTopServices] = React.useState<Service[]>([])
  const [memberships, setMemberships] = React.useState<Membership[]>([])
  const [customers, setCustomers] = React.useState<CustomerBranch[]>([])
  const [pets, setPets] = React.useState<PetStat[]>([])
  const [months, setMonths] = React.useState<number>(6)

  const [loadingByBranch, setLoadingByBranch] = React.useState(false)
  const [loadingTotal, setLoadingTotal] = React.useState(false)
  const [loadingTopServices, setLoadingTopServices] = React.useState(false)
  const [loadingMemberships, setLoadingMemberships] = React.useState(false)
  const [loadingCustomers, setLoadingCustomers] = React.useState(false)
  const [loadingPets, setLoadingPets] = React.useState(false)

  // ======= loaders =======
  const loadByBranch = async () => {
    setLoadingByBranch(true)
    try {
      const res = await api.get('/company/revenue/by-branch')
      const rows = (res.data?.items ?? res.data ?? []) as Branch[]
      let mapped = rows.map(r => ({ MaCN: r.MaCN, TenCN: r.TenCN ?? r.MaCN, DoanhThu: Number(r.DoanhThu ?? 0) }))
      // branch_manager: chỉ xem CN của mình (optional)
      if (role === 'branch_manager' && maCNFromToken) {
        mapped = mapped.filter(x => x.MaCN === maCNFromToken)
      }
      setByBranch(mapped)
    } catch (err: any) {
      console.error(err)
      message.error('Lỗi tải doanh thu theo chi nhánh')
    } finally {
      setLoadingByBranch(false)
    }
  }

  const loadTotal = async () => {
    setLoadingTotal(true)
    try {
      const res = await api.get('/company/revenue/total')
      setTotalData(res.data ?? {})
    } catch (err: any) {
      console.error(err)
      message.error('Lỗi tải tổng doanh thu')
    } finally {
      setLoadingTotal(false)
    }
  }

  const loadTopServices = async (m = months) => {
    setLoadingTopServices(true)
    try {
      const res = await api.get('/company/services/top', { params: { months: m } })
      const rows = (res.data?.items ?? res.data ?? []) as Service[]
      setTopServices(rows)
    } catch (err: any) {
      console.error(err)
      message.error('Lỗi tải top dịch vụ')
    } finally {
      setLoadingTopServices(false)
    }
  }

  const loadMemberships = async () => {
    setLoadingMemberships(true)
    try {
      const res = await api.get('/company/memberships/stats')
      const rows = (res.data?.items ?? res.data ?? []) as Membership[]
      setMemberships(rows.map(r => ({ Bac: (r as any).Bac ?? (r as any).name, SoLuong: Number((r as any).SoLuong ?? (r as any).value ?? 0) })))
    } catch (err: any) {
      console.error(err)
      message.error('Lỗi tải thống kê membership')
    } finally {
      setLoadingMemberships(false)
    }
  }

  const loadCustomers = async () => {
    setLoadingCustomers(true)
    try {
      const res = await api.get('/company/customers/by-branch')
      const rows = (res.data?.items ?? res.data ?? []) as CustomerBranch[]
      let mapped = rows.map(r => ({ MaCN: (r as any).MaCN, SoKhach: Number((r as any).SoKhach ?? (r as any).SoKhachHang ?? 0) }))
      if (role === 'branch_manager' && maCNFromToken) {
        mapped = mapped.filter(x => (x as any).MaCN === maCNFromToken)
      }
      setCustomers(mapped)
    } catch (err: any) {
      console.error(err)
      message.error('Lỗi tải khách hàng theo chi nhánh')
    } finally {
      setLoadingCustomers(false)
    }
  }

  const loadPets = async () => {
    setLoadingPets(true)
    try {
      const res = await api.get('/company/pets/stats')
      const rows = (res.data?.items ?? res.data ?? []) as PetStat[]
      setPets(rows.map(r => ({ Loai: r.Loai, SoLuong: Number(r.SoLuong ?? 0) })))
    } catch (err: any) {
      console.error(err)
      message.error('Lỗi tải thống kê thú cưng')
    } finally {
      setLoadingPets(false)
    }
  }

  const loadAll = async () => {
    await Promise.allSettled([
      loadTotal(),
      loadByBranch(),
      loadTopServices(),
      loadMemberships(),
      loadCustomers(),
      loadPets(),
    ])
    message.success('Hoàn tất tải dữ liệu')
  }

  // chỉ load data khi đủ quyền
  React.useEffect(() => {
    if (!canAccess) return
    loadTotal()
    // bạn có thể gọi loadAll() nếu muốn mở trang là load hết
    // loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canAccess])

  const branchChart = byBranch.map(r => ({ branch: r.TenCN ?? r.MaCN ?? 'N/A', revenue: Number(r.DoanhThu ?? 0) }))
  const membershipData = memberships.map(m => ({ name: m.Bac ?? 'N/A', value: Number(m.SoLuong ?? 0) }))

  // Nếu chưa access thì return UI rỗng (tránh flash dữ liệu)
  if (!canAccess) return null

  const logout = () => {
    clearToken()
    message.success('Đã đăng xuất')
    router.replace('/')
  }

  return (
    <div style={{ padding: 16 }}>
      <Space style={{ marginBottom: 12 }} wrap>
        <Tag color="blue">{role}</Tag>

        {maCNFromToken && (
          <Tag color="purple">MaCN: {maCNFromToken}</Tag>
        )}

        <Button onClick={() => router.push('/')}>
          Về Home
        </Button>

        <Button danger onClick={logout}>
          Logout
        </Button>
      </Space>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={8}>
          <Card
            title="Tổng doanh thu"
            extra={
              <Space>
                <Button onClick={loadTotal} loading={loadingTotal}>Làm mới</Button>
                <Button onClick={loadAll}>Làm mới tất cả</Button>
              </Space>
            }
          >
            <div style={{ fontSize: 24, fontWeight: 700 }}>
              {Number((totalData as any)?.TongDoanhThu ?? (totalData as any)?.total ?? (totalData as any)?.value ?? 0).toLocaleString('vi-VN')} VND
            </div>
            {role === 'branch_manager' ? (
              <Typography.Text type="secondary">
                *Lưu ý: Bạn đang xem dữ liệu theo chi nhánh của mình (lọc ở các bảng theo CN).
              </Typography.Text>
            ) : null}
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="Top dịch vụ">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div />
              <div>
                <InputNumber min={1} max={36} value={months} onChange={(v) => setMonths(Number(v ?? 6))} />
                <Button style={{ marginLeft: 8 }} onClick={() => loadTopServices(months)} loading={loadingTopServices}>
                  Áp dụng
                </Button>
              </div>
            </div>

            <Table<Service>
              dataSource={topServices}
              rowKey={(r) => r.MaDV ?? r.TenDV ?? JSON.stringify(r)}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Mã', dataIndex: 'MaDV' },
                { title: 'Tên dịch vụ', dataIndex: 'TenDV' },
                { title: 'Số lần', dataIndex: 'SoLan', align: 'right' },
                { title: 'Doanh thu', dataIndex: 'DoanhThu', align: 'right', render: (v) => Number(v ?? 0).toLocaleString('vi-VN') },
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Doanh thu theo chi nhánh" extra={<Button onClick={loadByBranch} loading={loadingByBranch}>Làm mới</Button>}>
            <Table<Branch>
              dataSource={byBranch}
              rowKey={(r) => r.MaCN ?? r.TenCN ?? JSON.stringify(r)}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Mã CN', dataIndex: 'MaCN' },
                { title: 'Tên CN', dataIndex: 'TenCN' },
                { title: 'Doanh thu', dataIndex: 'DoanhThu', align: 'right', render: (v) => Number(v ?? 0).toLocaleString('vi-VN') }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Biểu đồ Doanh thu theo CN">
            <BranchBar data={branchChart} />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Thống kê gói membership" extra={<Button onClick={loadMemberships} loading={loadingMemberships}>Làm mới</Button>}>
            <MembershipPie data={membershipData} />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Thống kê thú cưng" extra={<Button onClick={loadPets} loading={loadingPets}>Làm mới</Button>}>
            <Table<PetStat>
              dataSource={pets}
              rowKey={(r) => r.Loai ?? JSON.stringify(r)}
              pagination={{ pageSize: 6 }}
              columns={[
                { title: 'Loại', dataIndex: 'Loai' },
                { title: 'Số lượng', dataIndex: 'SoLuong', align: 'right' }
              ]}
            />
          </Card>
        </Col>

        <Col xs={24}>
          <Card title="Khách hàng theo chi nhánh" extra={<Button onClick={loadCustomers} loading={loadingCustomers}>Làm mới</Button>}>
            <Table<CustomerBranch>
              dataSource={customers}
              rowKey={(r) => (r as any).MaCN ?? (r as any).TenCN ?? JSON.stringify(r)}
              pagination={{ pageSize: 8 }}
              columns={[
                { title: 'Mã CN', dataIndex: 'MaCN' },
                { title: 'Tên CN', dataIndex: 'TenCN' },
                { title: 'Số KH', dataIndex: 'SoKhach', align: 'right', render: (v, r) => Number(v ?? (r as any).SoKhachHang ?? 0).toLocaleString('vi-VN') }
              ]}
            />
          </Card>
        </Col>
      </Row>

      <div style={{ marginTop: 16 }}>
        <h4>Raw debug (quick):</h4>
        <pre style={{ maxHeight: 240, overflow: 'auto', background: '#fff', padding: 12 }}>
          {JSON.stringify({ totalData, byBranch, topServices, memberships, customers, pets }, null, 2)}
        </pre>
      </div>
    </div>
  )
}
