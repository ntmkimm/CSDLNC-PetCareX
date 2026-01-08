// src/pages/customers/PaidTab.tsx
import React from 'react'
import { Table, Button, Modal, Tag, Descriptions, Divider, Typography } from 'antd'
import { api } from '../../lib/api'
import { EyeOutlined } from '@ant-design/icons'

const { Text } = Typography

type InvoiceHeader = {
  MaHoaDon: string
  NgayLap: string
  TongTien: number
  KhuyenMai: number
  HinhThucThanhToan: string
}

type InvoiceDetailItem = {
  TenItem: string
  SoLuong: number
  DonGia: number
  ThanhTien: number
  Loai: 'Service' | 'Product' | 'Package'
}

export default function PaidTab({ maKH }: { maKH: string }) {
  const [invoices, setInvoices] = React.useState<InvoiceHeader[]>([])
  const [loading, setLoading] = React.useState(false)
  
  // State cho Modal chi tiết
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [currentInvoice, setCurrentInvoice] = React.useState<InvoiceHeader | null>(null)
  const [details, setDetails] = React.useState<InvoiceDetailItem[]>([])

  // Lấy danh sách hóa đơn
  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customer/me/purchases', { params: { ma_kh: maKH } })
      setInvoices(res.data.items ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => {
    fetchInvoices()
  }, [maKH])

  // Lấy chi tiết hóa đơn khi bấm xem
  const showDetail = async (record: InvoiceHeader) => {
    setCurrentInvoice(record)
    setIsModalOpen(true)
    setDetailLoading(true)
    try {
      const res = await api.get(`/customer/invoices/${record.MaHoaDon}`, {
        params: { ma_kh: maKH }
      })
      setDetails(res.data.items ?? [])
    } catch (e) {
      console.error(e)
    } finally {
      setDetailLoading(false)
    }
  }

  const columns = [
    { title: 'Mã HĐ', dataIndex: 'MaHoaDon', key: 'MaHoaDon', width: 120 },
    { 
      title: 'Ngày lập', 
      dataIndex: 'NgayLap', 
      render: (v: string) => new Date(v).toLocaleString('vi-VN') 
    },
    { 
      title: 'Thanh toán', 
      dataIndex: 'HinhThucThanhToan',
      render: (v: string) => <Tag color="blue">{v}</Tag>
    },
    { 
      title: 'Tổng tiền', 
      dataIndex: 'TongTien', 
      align: 'right' as const,
      render: (v: number) => <Text strong>{v.toLocaleString()}đ</Text>
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_: any, record: InvoiceHeader) => (
        <Button 
          type="primary" 
          ghost 
          icon={<EyeOutlined />} 
          onClick={() => showDetail(record)}
        >
          Chi tiết
        </Button>
      ),
    },
  ]

  return (
    <>
      <Table
        dataSource={invoices}
        columns={columns}
        rowKey="MaHoaDon"
        loading={loading}
        pagination={{ pageSize: 10 }}
      />

      <Modal
        title={`Chi tiết hóa đơn: ${currentInvoice?.MaHoaDon}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>
        ]}
        width={700}
      >
        {currentInvoice && (
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Ngày lập">
              {new Date(currentInvoice.NgayLap).toLocaleString('vi-VN')}
            </Descriptions.Item>
            <Descriptions.Item label="Hình thức">{currentInvoice.HinhThucThanhToan}</Descriptions.Item>
            <Descriptions.Item label="Khuyến mãi">{currentInvoice.KhuyenMai}%</Descriptions.Item>
            <Descriptions.Item label="Tổng cộng">
              <Text type="danger" strong>{currentInvoice.TongTien.toLocaleString()}đ</Text>
            </Descriptions.Item>
          </Descriptions>
        )}

        <Divider orientation="left">Danh sách hạng mục</Divider>

        <Table
          dataSource={details}
          loading={detailLoading}
          rowKey={(r, i) => i}
          pagination={false}
          size="small"
          columns={[
            { 
              title: 'Loại', 
              dataIndex: 'Loai', 
              render: (v) => {
                if(v === 'Service') return <Tag color="green">Dịch vụ</Tag>
                if(v === 'Product') return <Tag color="orange">Sản phẩm</Tag>
                return <Tag color="purple">Gói tiêm</Tag>
              }
            },
            { title: 'Tên mục', dataIndex: 'TenItem' },
            { title: 'SL', dataIndex: 'SoLuong', align: 'center' },
            { 
              title: 'Đơn giá', 
              dataIndex: 'DonGia', 
              align: 'right',
              render: (v) => `${v.toLocaleString()}đ`
            },
            { 
              title: 'Thành tiền', 
              dataIndex: 'ThanhTien', 
              align: 'right',
              render: (v) => <Text strong>{v.toLocaleString()}đ</Text>
            },
          ]}
        />
      </Modal>
    </>
  )
}