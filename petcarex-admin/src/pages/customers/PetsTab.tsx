import React from 'react'
import { Select, Divider, Table, Typography, Card, Empty, Tag } from 'antd'
import { api } from '../../lib/api'

const { Title, Text } = Typography

export default function PetsTab({ maKH }: { maKH: string }) {
  const [pets, setPets] = React.useState<any[]>([])
  const [vaccines, setVaccines] = React.useState<any[]>([])
  const [medical, setMedical] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    api.get('/customer/pets', { params: { ma_kh: maKH } })
      .then(res => setPets(res.data.items || []))
  }, [maKH])

  const handlePetChange = async (tc: string) => {
    setLoading(true)
    try {
      const [vRes, mRes] = await Promise.all([
        api.get(`/customer/pets/${tc}/vaccinations`, { params: { ma_kh: maKH } }),
        api.get(`/customer/pets/${tc}/medical-history`, { params: { ma_kh: maKH } }),
      ])
      setVaccines(vRes.data.items || [])
      setMedical(mRes.data.items || [])
    } catch (e) {
      console.error("Lỗi khi tải lịch sử:", e)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card bordered={false}>
      <div style={{ marginBottom: 24 }}>
        <Text strong>Chọn thú cưng: </Text>
        <Select
          placeholder="Chọn thú cưng để xem lịch sử"
          style={{ width: 300, marginLeft: 10 }}
          options={pets.map(p => ({ label: `${p.Ten} (${p.Loai})`, value: p.MaThuCung }))}
          onChange={handlePetChange}
        />
      </div>

      <Title level={4}>💉 Lịch sử tiêm phòng</Title>
      <Table
        dataSource={vaccines}
        rowKey={(r) => r.MaPhien + r.MaVC}
        loading={loading}
        pagination={{ pageSize: 5 }}
        columns={[
          { 
            title: 'Ngày tiêm', 
            dataIndex: 'NgayTiem',
            render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '—'
          },
          { 
            title: 'Tên Vaccine', 
            dataIndex: 'TenVC',
            render: (v) => <Tag color="blue">{v}</Tag>
          },
          { title: 'Liều lượng', dataIndex: 'SoLieu', render: (v) => `${v} ml` },
          { title: 'Gói tiêm', dataIndex: 'MaGoi', render: (v) => v || 'Tiêm lẻ' },
        ]}
        locale={{ emptyText: <Empty description="Chưa có dữ liệu tiêm phòng" /> }}
      />

      <Divider />

      <Title level={4}>🩺 Lịch sử khám bệnh & Toa thuốc</Title>
      <Table
        dataSource={medical}
        rowKey={(r, i) => i}
        loading={loading}
        pagination={{ pageSize: 5 }}
        columns={[
          { 
            title: 'Ngày khám', 
            dataIndex: 'NgayLap',
            width: 120,
            render: (v) => v ? new Date(v).toLocaleDateString('vi-VN') : '—'
          },
          { title: 'Dịch vụ', dataIndex: 'TenDV', width: 150, render: (v) => <Text strong>{v}</Text> },
          { 
            title: 'Chẩn đoán & Triệu chứng', 
            render: (_, r) => (
              <div>
                <div style={{ color: 'red', fontWeight: 'bold' }}>{r.ChanDoan}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{r.CacTrieuChung}</div>
              </div>
            )
          },
          { 
            title: 'Toa thuốc', 
            dataIndex: 'ToaThuoc',
            render: (v) => v ? (
              <div style={{ 
                whiteSpace: 'pre-line', 
                backgroundColor: '#f6ffed', 
                padding: '8px', 
                borderRadius: '4px',
                border: '1px solid #b7eb8f'
              }}>
                {v}
              </div>
            ) : <Text type="secondary">Không có thuốc</Text>
          },
          { 
            title: 'Hẹn tái khám', 
            dataIndex: 'NgayTaiKham',
            render: (v) => v ? <Tag color="volcano">{new Date(v).toLocaleDateString('vi-VN')}</Tag> : '—'
          },
        ]}
        locale={{ emptyText: <Empty description="Chưa có lịch sử khám bệnh" /> }}
      />
    </Card>
  )
}