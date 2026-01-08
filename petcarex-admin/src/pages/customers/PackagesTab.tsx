import React from 'react'
import { Table, Tag, Tooltip, Typography, Card, Badge, Spin } from 'antd'
import { api } from '../../lib/api'
import { AlertOutlined, CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

export default function PackagesTab({ maKH }: { maKH: string }) {
  const [pkgs, setPkgs] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  React.useEffect(() => {
    fetchData()
  }, [maKH])

  const fetchData = () => {
    setLoading(true)
    api.get('/customer/me/purchased-packages', { params: { ma_kh: maKH } })
      .then(res => {
        // Khởi tạo thêm field 'details' là null cho mỗi gói
        const data = (res.data.items ?? []).map((item: any) => ({ ...item, details: null, loadingDetail: false }))
        setPkgs(data)
      })
      .finally(() => setLoading(false))
  }

  // Hàm lấy chi tiết vaccine của một gói khi người dùng mở rộng dòng
  const handleExpand = (expanded: boolean, record: any) => {
    if (expanded && !record.details) {
      // Đánh dấu đang load cho riêng dòng đó
      updatePkgState(record.MaGoi, { loadingDetail: true })

      api.get(`/customer/me/purchased-packages/${record.MaGoi}/details`, { params: { ma_kh: maKH } })
        .then(res => {
          updatePkgState(record.MaGoi, { details: res.data.items, loadingDetail: false })
        })
        .catch(() => {
          updatePkgState(record.MaGoi, { loadingDetail: false })
        })
    }
  }

  const updatePkgState = (maGoi: string, newState: any) => {
    setPkgs(prev => prev.map(p => p.MaGoi === maGoi ? { ...p, ...newState } : p))
  }

  // Render bảng chi tiết bên trong dòng mở rộng
  const expandedRowRender = (record: any) => {
    if (record.loadingDetail) return <Spin size="small" tip="Đang tải chi tiết..." />
    if (!record.details) return <Text type="secondary">Không có dữ liệu chi tiết</Text>

    const subColumns = [
      { 
        title: 'Tên Vaccine', 
        dataIndex: 'TenVC', 
        key: 'TenVC',
        render: (text: string) => <Text strong>{text}</Text>
      },
      { 
        title: 'Liều lượng', 
        dataIndex: 'LieuLuong', 
        render: (v: any) => v ? `${v} ml` : '-' 
      },
      { 
        title: 'Tổng mũi', 
        dataIndex: 'TongSoMui', 
        align: 'center' as const 
      },
      { 
        title: 'Đã dùng', 
        dataIndex: 'SoMuiDaDung', 
        align: 'center' as const,
        render: (v: number) => <Badge count={v} showZero color="#52c41a" /> 
      },
      { 
        title: 'Còn lại', 
        dataIndex: 'SoMuiConLai', 
        align: 'center' as const,
        render: (v: number) => <Badge count={v} showZero color={v > 0 ? "#f5222d" : "#d9d9d9"} /> 
      },
      {
        title: 'Tồn kho hệ thống',
        dataIndex: 'TonKhoHeThong',
        render: (ton: number) => (
          ton > 0 
            ? <Tag color="success">Còn {ton} liều</Tag> 
            : <Tag color="error">Hết hàng toàn quốc</Tag>
        )
      }
    ];

    return (
      <div style={{ padding: '10px', background: '#f9f9f9', borderRadius: '8px' }}>
        <Typography.Title level={5} style={{ fontSize: '14px', marginBottom: '10px' }}>
          <InfoCircleOutlined /> Danh sách vaccine trong gói
        </Typography.Title>
        <Table 
          columns={subColumns} 
          dataSource={record.details} 
          pagination={false} 
          size="small"
          rowKey="TenVC"
          bordered
        />
      </div>
    );
  };

  const columns = [
    {
      title: 'Tên Gói Vaccine',
      dataIndex: 'TenGoi',
      key: 'TenGoi',
      render: (text: string, record: any) => (
        <div>
          <Text strong style={{ color: '#1890ff' }}>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '11px' }}>Mã gói: {record.MaGoi}</Text>
        </div>
      )
    },
    {
      title: 'Trạng thái',
      dataIndex: 'TrangThai',
      render: (s: string, record: any) => {
        if (record.CoCanhBaoHetHang === 1 && s === 'ACTIVE') {
          return (
            <Tooltip title="Có vaccine trong gói đang hết hàng toàn hệ thống">
              <Tag color="warning" icon={<AlertOutlined />}>Tạm thiếu hàng</Tag>
            </Tooltip>
          )
        }
        switch (s) {
          case 'ACTIVE': return <Tag color="green" icon={<CheckCircleOutlined />}>Đang hiệu lực</Tag>
          case 'COMPLETED': return <Tag color="blue">Đã hoàn thành</Tag>
          case 'EXPIRED': return <Tag color="red" icon={<CloseCircleOutlined />}>Hết hạn</Tag>
          default: return <Tag>{s}</Tag>
        }
      }
    },
    {
      title: 'Tiến độ',
      render: (_: any, r: any) => {
        const percent = Math.round((r.SoMuiDaDung / r.SoMuiTong) * 100);
        return (
          <div style={{ width: 140 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <Text>{r.SoMuiDaDung}/{r.SoMuiTong} mũi</Text>
                <Text type="secondary">{percent}%</Text>
            </div>
            <div style={{ width: '100%', height: 6, background: '#f0f0f0', borderRadius: 3, marginTop: 4 }}>
                <div style={{ 
                    width: `${percent}%`, 
                    height: '100%', 
                    background: percent === 100 ? '#52c41a' : '#1890ff', 
                    borderRadius: 3,
                    transition: 'all 0.3s'
                }}></div>
            </div>
          </div>
        )
      }
    },
    {
      title: 'Ngày hết hạn',
      dataIndex: 'NgayHetHan',
      render: (d: string) => <Text style={{ fontSize: '13px' }}>{new Date(d).toLocaleDateString('vi-VN')}</Text>
    }
  ]

  return (
    <Card title="Gói vaccine đã mua" bordered={false} className="shadow-sm">
      <Table
        dataSource={pkgs}
        rowKey="MaGoi" // Sử dụng MaGoi làm key để handle expand chính xác
        columns={columns}
        loading={loading}
        pagination={{ pageSize: 5 }}
        onExpand={handleExpand} // Gọi hàm khi nhấn mở rộng
        expandable={{
          expandedRowRender: expandedRowRender,
          rowExpandable: (record) => record.TrangThai !== 'EXPIRED',
        }}
      />
    </Card>
  )
}