import React from 'react'
import { Table } from 'antd'
import { api } from '../../lib/api'

type PaidItem = {
  MaHoaDon: string
  NgayLap: string
  TenDV?: string
  TenSP?: string
  TenGoi?: string
  SoLuong?: number
  ThanhTien: number
}

export default function PaidTab({ maKH }: { maKH: string }) {
  const [items, setItems] = React.useState<PaidItem[]>([])

  React.useEffect(() => {
    api
      .get('/customer/me/purchases', { params: { ma_kh: maKH } })
      .then(res => setItems(res.data.items ?? []))
  }, [])

  return (
    <Table
      dataSource={items}
      rowKey={(_, i) => i}
      columns={[
        { title: 'Hóa đơn', dataIndex: 'MaHoaDon' },
        { title: 'Ngày', dataIndex: 'NgayLap' },
        {
          title: 'Nội dung',
          render: r => r.TenDV || r.TenSP || r.TenGoi,
        },
        { title: 'SL', dataIndex: 'SoLuong' },
        {
          title: 'Thành tiền',
          dataIndex: 'ThanhTien',
          align: 'right',
          render: v => `${v.toLocaleString()}đ`,
        },
      ]}
    />
  )
}
