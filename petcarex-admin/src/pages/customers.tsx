// src/pages/customers.tsx
import React from 'react'
import { Card, Table, Space, Input, Button, Form, Modal, message, Popconfirm, Typography, Tag } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../lib/api'
import { useRouter } from 'next/router'
import { getAuth, clearToken } from '../lib/auth'

type Pet = {
  MaThuCung: string
  MaKH: string
  Ten?: string
  Loai?: string
  Giong?: string
}

type VaccinationRow = {
  MaPhien?: string
  MaVC?: string
  TenVC?: string
  NgayTiem?: string
  SoLieu?: number
  MaGoi?: string
}

function getErrMsg(e: any) {
  return e?.response?.data?.detail ?? e?.message ?? 'Có lỗi xảy ra'
}

export default function CustomersPage() {
  const router = useRouter()

  const [maKH, setMaKH] = React.useState<string>('')

  const [loadingPets, setLoadingPets] = React.useState(false)
  const [pets, setPets] = React.useState<Pet[]>([])

  const [creating, setCreating] = React.useState(false)
  const [createForm] = Form.useForm()

  const [vaccOpen, setVaccOpen] = React.useState(false)
  const [vaccLoading, setVaccLoading] = React.useState(false)
  const [vaccRows, setVaccRows] = React.useState<VaccinationRow[]>([])
  const [selectedPet, setSelectedPet] = React.useState<Pet | null>(null)

  // đọc auth 1 lần mỗi render (token đổi thì reload page / interceptor thường đẩy về "/")
  const auth = getAuth()
  const payload = auth.payload
  const isCustomer = payload?.role === 'customer'
  const canUsePage = !!auth.token && !!payload && !auth.isExpired

  const fetchPets = React.useCallback(
    async (mkhOverride?: string) => {
      const mkh = (mkhOverride ?? maKH).trim()
      if (!mkh) {
        message.warning('Nhập MaKH trước')
        return
      }
      setLoadingPets(true)
      try {
        const res = await api.get('/customer/pets', { params: { ma_kh: mkh } })
        setPets(res.data?.items ?? [])
      } catch (e) {
        message.error(getErrMsg(e))
      } finally {
        setLoadingPets(false)
      }
    },
    [maKH]
  )

  // Guard + auto-fill MaKH for customer
  const warnedRef = React.useRef(false)
  React.useEffect(() => {
    if (!canUsePage) {
      if (!warnedRef.current) {
        warnedRef.current = true
        message.info('Vui lòng đăng nhập')
      }
      router.replace('/')
      return
    }

    // customer: auto set MaKH = sub and auto fetch
    if (isCustomer && payload?.sub) {
      const mkh = String(payload.sub)
      if (maKH !== mkh) setMaKH(mkh)
      // gọi fetchPets với override để tránh phụ thuộc vào state update timing
      fetchPets(mkh)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canUsePage, isCustomer, payload?.sub, router])

  const createPet = React.useCallback(
    async (values: any) => {
      const mkh = maKH.trim()
      if (!mkh) {
        message.warning('Nhập MaKH trước')
        return
      }
      setCreating(true)
      try {
        await api.post('/customer/pets', null, {
          params: {
            ma_kh: mkh,
            ma_thu_cung: values.ma_thu_cung?.trim(),
            ten: values.ten?.trim(),
            loai: values.loai?.trim() || undefined,
            giong: values.giong?.trim() || undefined,
          },
        })
        message.success('Đã thêm thú cưng')
        createForm.resetFields()
        fetchPets(mkh)
      } catch (e) {
        message.error(getErrMsg(e))
      } finally {
        setCreating(false)
      }
    },
    [maKH, createForm, fetchPets]
  )

  const deletePet = React.useCallback(
    async (pet: Pet) => {
      const mkh = maKH.trim()
      if (!mkh) {
        message.warning('Nhập MaKH trước')
        return
      }
      try {
        await api.delete(`/customer/pets/${encodeURIComponent(pet.MaThuCung)}`, {
          params: { ma_kh: mkh },
        })
        message.success('Đã xoá thú cưng')
        fetchPets(mkh)
      } catch (e) {
        message.error(getErrMsg(e))
      }
    },
    [maKH, fetchPets]
  )

  const openVaccinations = React.useCallback(
    async (pet: Pet) => {
      const mkh = maKH.trim()
      if (!mkh) {
        message.warning('Nhập MaKH trước')
        return
      }
      setSelectedPet(pet)
      setVaccOpen(true)
      setVaccLoading(true)
      setVaccRows([])
      try {
        const res = await api.get(`/customer/pets/${encodeURIComponent(pet.MaThuCung)}/vaccinations`, {
          params: { ma_kh: mkh },
        })
        setVaccRows(res.data?.items ?? [])
      } catch (e) {
        message.error(getErrMsg(e))
      } finally {
        setVaccLoading(false)
      }
    },
    [maKH]
  )

  const petColumns: ColumnsType<Pet> = [
    { title: 'Mã thú cưng', dataIndex: 'MaThuCung' },
    { title: 'Tên', dataIndex: 'Ten' },
    { title: 'Loại', dataIndex: 'Loai' },
    { title: 'Giống', dataIndex: 'Giong' },
    {
      title: 'Hành động',
      key: 'actions',
      render: (_: any, r: Pet) => (
        <Space>
          <Button onClick={() => openVaccinations(r)}>Lịch sử tiêm</Button>
          <Popconfirm title="Xoá thú cưng này?" okText="Xoá" cancelText="Huỷ" onConfirm={() => deletePet(r)}>
            <Button danger>Xoá</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const vaccColumns: ColumnsType<VaccinationRow> = [
    { title: 'Mã phiên', dataIndex: 'MaPhien' },
    { title: 'Mã VC', dataIndex: 'MaVC' },
    { title: 'Tên vaccine', dataIndex: 'TenVC' },
    { title: 'Ngày tiêm', dataIndex: 'NgayTiem' },
    { title: 'Số liều', dataIndex: 'SoLieu', align: 'right' },
    { title: 'Mã gói', dataIndex: 'MaGoi' },
  ]

  const logout = () => {
      clearToken()
      message.success('Đã đăng xuất')
      router.replace('/')
    }

  return (
    <div style={{ padding: 16 }}>
      <Card
        title="Customer – Pets (KH2) & Vaccination History (KH3)"
        extra={
          <Space wrap>
            <Input
              placeholder="Nhập MaKH (ví dụ: KH001)"
              value={maKH}
              disabled={isCustomer}
              onChange={(e) => setMaKH(e.target.value)}
              style={{ width: 240 }}
              onPressEnter={() => fetchPets()}
            />
            <Button
              type="primary"
              onClick={() => fetchPets()}
              loading={loadingPets}
              disabled={isCustomer && !maKH}
            >
              Tải danh sách thú cưng
            </Button>

            {payload?.role && <Tag color="blue">{payload.role}</Tag>}
            {isCustomer && payload?.sub && <Tag color="purple">MaKH: {payload.sub}</Tag>}

            <Button danger onClick={logout}>
              Logout
            </Button>
          </Space>
        }
      >
        <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
          Backend dùng query param <b>ma_kh</b> cho các thao tác thú cưng và lịch sử tiêm.
        </Typography.Paragraph>

        <Card size="small" title="Thêm thú cưng (POST /customer/pets)" style={{ marginBottom: 16 }}>
          <Form form={createForm} layout="inline" onFinish={createPet}>
            <Form.Item name="ma_thu_cung" rules={[{ required: true, message: 'Nhập mã thú cưng' }]}>
              <Input placeholder="MaThuCung" style={{ width: 160 }} />
            </Form.Item>

            <Form.Item name="ten" rules={[{ required: true, message: 'Nhập tên' }]}>
              <Input placeholder="Tên" style={{ width: 160 }} />
            </Form.Item>

            <Form.Item name="loai">
              <Input placeholder="Loại (tuỳ chọn)" style={{ width: 160 }} />
            </Form.Item>

            <Form.Item name="giong">
              <Input placeholder="Giống (tuỳ chọn)" style={{ width: 160 }} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={creating} disabled={!maKH.trim()}>
                Thêm
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Table
          rowKey={(r) => r.MaThuCung}
          loading={loadingPets}
          dataSource={pets}
          columns={petColumns}
          pagination={{ pageSize: 8 }}
        />

        <Modal
          open={vaccOpen}
          onCancel={() => {
            setVaccOpen(false)
            setSelectedPet(null)
            setVaccRows([])
          }}
          footer={null}
          width={900}
          title={selectedPet ? `Lịch sử tiêm – ${selectedPet.MaThuCung} (${selectedPet.Ten ?? ''})` : 'Lịch sử tiêm'}
        >
          <Table
            rowKey={(r, idx) => `${r.MaPhien ?? 'ph'}-${r.MaVC ?? 'vc'}-${idx}`}
            loading={vaccLoading}
            dataSource={vaccRows}
            columns={vaccColumns}
            pagination={{ pageSize: 8 }}
          />
        </Modal>
      </Card>
    </div>
  )
}
