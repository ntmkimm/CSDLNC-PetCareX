import React from 'react'
import { Select, Divider, Table, Typography } from 'antd'
import { api } from '../../lib/api'

const { Title } = Typography

export default function PetsTab({ maKH }: { maKH: string }) {
  const [pets, setPets] = React.useState<any[]>([])
  const [vaccines, setVaccines] = React.useState<any[]>([])
  const [medical, setMedical] = React.useState<any[]>([])

  React.useEffect(() => {
    api.get('/customer/pets', { params: { ma_kh: maKH } })
      .then(res => setPets(res.data.items))
  }, [])

  return (
    <>
      <Select
        placeholder="Chọn thú cưng"
        style={{ width: 240 }}
        options={pets.map(p => ({ label: p.Ten, value: p.MaThuCung }))}
        onChange={async tc => {
          const [v, m] = await Promise.all([
            api.get(`/customer/pets/${tc}/vaccinations`, { params: { ma_kh: maKH } }),
            api.get(`/customer/pets/${tc}/medical-history`, { params: { ma_kh: maKH } }),
          ])
          setVaccines(v.data.items)
          setMedical(m.data.items)
        }}
      />

      <Divider />

      <Title level={5}>💉 Lịch sử tiêm</Title>
      <Table
        dataSource={vaccines}
        rowKey={(_, i) => i}
        pagination={false}
        columns={[
          { title: 'Vaccine', dataIndex: 'TenVC' },
          { title: 'Ngày tiêm', dataIndex: 'NgayTiem' },
          { title: 'Liều', dataIndex: 'SoLieu' },
        ]}
      />

      <Divider />

      <Title level={5}>🩺 Lịch sử khám</Title>
      <Table
        dataSource={medical}
        rowKey={(_, i) => i}
        pagination={false}
        columns={[
          { title: 'Dịch vụ', dataIndex: 'TenDV' },
          { title: 'Chẩn đoán', dataIndex: 'ChanDoan' },
          { title: 'Triệu chứng', dataIndex: 'CacTrieuChung' },
          { title: 'Tái khám', dataIndex: 'NgayTaiKham' },
        ]}
      />
    </>
  )
}
