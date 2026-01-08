import React from 'react'
import { Table, Tag } from 'antd'
import { api } from '../../lib/api'

export default function PackagesTab({ maKH }: { maKH: string }) {
  const [pkgs, setPkgs] = React.useState<any[]>([])

  React.useEffect(() => {
    api.get('/customer/me/packages', { params: { ma_kh: maKH } })
      .then(res => setPkgs(res.data.items ?? []))
  }, [])

  return (
    <Table
      dataSource={pkgs}
      rowKey={(_, i) => i}
      columns={[
        { title: 'Gói', dataIndex: 'TenGoi' },
        {
          title: 'Trạng thái',
          dataIndex: 'TrangThai',
          render: s =>
            s === 'ACTIVE' ? <Tag color="green">Đang dùng</Tag> :
            s === 'PENDING' ? <Tag color="orange">Chưa kích hoạt</Tag> :
            <Tag color="red">Hết hạn</Tag>,
        },
        { title: 'Tổng mũi', dataIndex: 'SoMuiTong' },
        { title: 'Đã tiêm', dataIndex: 'SoMuiDaDung' },
        { title: 'Còn lại', dataIndex: 'SoMuiConLai' },
        { title: 'Hết hạn', dataIndex: 'NgayHetHan' },
      ]}
    />
  )
}
