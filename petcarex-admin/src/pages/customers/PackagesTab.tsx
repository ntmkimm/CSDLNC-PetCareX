import React from 'react'
import { Table, Tag, Tooltip, Typography, Card } from 'antd'
import { api } from '../../lib/api'
import { AlertOutlined, CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function PackagesTab({ maKH }: { maKH: string }) {
  const [pkgs, setPkgs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    setLoading(true)
    api.get('/customer/me/purchased-packages', { params: { ma_kh: maKH } })
      .then(res => setPkgs(res.data.items ?? []))
      .finally(() => setLoading(false))
  }, [maKH])

  const columns = [
    {
      title: 'Tên Gói',
      dataIndex: 'TenGoi',
      key: 'TenGoi',
      render: (text: string, record: any) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>HĐ: {record.MaHoaDon}</Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (s: string, record: any) => {
        if (record.CoCanhBaoHetHang === 1 && s === 'ACTIVE') {
          return (
            <Tooltip title="Một số vaccine trong gói đang hết hàng trên toàn hệ thống">
              <Tag color="warning" icon={<AlertOutlined />}>Tạm hết hàng</Tag>
            </Tooltip>
          )
        }
        switch (s) {
          case 'ACTIVE': return <Tag color="green" icon={<CheckCircleOutlined />}>Đang hiệu lực</Tag>
          case 'COMPLETED': return <Tag color="blue">Đã hoàn thành</Tag>
          case 'EXPIRED': return <Tag color="red" icon={<CloseCircleOutlined />}>Hết hạn</Tag>
          default: return <Tag color="default">{s}</Tag>
        }
      }
    },
    {
      title: 'Chi tiết mũi tiêm',
      render: (_: any, r: any) => (
        <span>
          Dùng: <Text strong>{r.SoMuiDaDung}</Text> / Còn: <Text strong type="danger">{r.SoMuiConLai}</Text> (Tổng: {r.SoMuiTong})
        </span>
      )
    },
    {
      title: 'Ngày mua',
      dataIndex: 'NgayMua',
      render: (d: string) => new Date(d).toLocaleDateString('vi-VN')
    },
    {
      title: 'Hết hạn',
      dataIndex: 'NgayHetHan',
      render: (d: string, record: any) => (
        <Text delete={record.TrangThai === 'EXPIRED'}>
          {new Date(d).toLocaleDateString('vi-VN')}
        </Text>
      )
    }
  ]

  return (
    <Card title="Gói vaccine đã sở hữu" bordered={false}>
      <Table
        dataSource={pkgs}
        rowKey="MaHoaDon"
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 5 }}
      />
    </Card>
  )
}