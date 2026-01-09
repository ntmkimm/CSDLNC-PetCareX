import React from 'react'
import { 
  Table, Button, Modal, Tag, Descriptions, Divider, 
  Typography, Space, Rate, Input, message, Form 
} from 'antd'
import { api } from '../../lib/api'
import { EyeOutlined, StarOutlined, StarFilled } from '@ant-design/icons'

const { Text } = Typography
const { TextArea } = Input

type InvoiceHeader = {
  MaHoaDon: string
  NgayLap: string
  TongTien: number
  KhuyenMai: number
  HinhThucThanhToan: string
  DaDanhGia?: boolean 
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
  
  // State cho Modal chi tiết (GIỮ NGUYÊN)
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [detailLoading, setDetailLoading] = React.useState(false)
  const [currentInvoice, setCurrentInvoice] = React.useState<InvoiceHeader | null>(null)
  const [details, setDetails] = React.useState<InvoiceDetailItem[]>([])

  // State cho Modal Đánh giá (CẬP NHẬT THEO SQL)
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false)
  const [submittingReview, setSubmittingReview] = React.useState(false)
  const [isExistingReview, setIsExistingReview] = React.useState(false)
  const [reviewForm, setReviewForm] = React.useState({
    diem_dv: 10,      // DiemDV (1-10)
    muc_do: 5,       // Mucdohailong (1-5)
    thai_do: '',     // Thaidonhanvien (NVARCHAR)
    binh_luan: ''    // Binhluan (NVARCHAR)
  })

  const fetchInvoices = async () => {
    setLoading(true)
    try {
      const res = await api.get('/customer/me/purchases', { params: { ma_kh: maKH } })
      setInvoices(res.data.items ?? [])
    } catch (e) { console.error(e) } finally { setLoading(false) }
  }

  React.useEffect(() => { fetchInvoices() }, [maKH])

  // Logic chi tiết hóa đơn (GIỮ NGUYÊN)
  const showDetail = async (record: InvoiceHeader) => {
    setCurrentInvoice(record)
    setIsModalOpen(true)
    setDetailLoading(true)
    try {
      const res = await api.get(`/customer/invoices/${record.MaHoaDon}`, { params: { ma_kh: maKH } })
      setDetails(res.data.items ?? [])
    } catch (e) { console.error(e) } finally { setDetailLoading(false) }
  }

  // Xử lý mở Modal Đánh giá (Map đúng key từ SELECT * của SQL)
  const handleOpenReview = async (record: InvoiceHeader) => {
    setCurrentInvoice(record)
    setIsReviewModalOpen(true)
    setSubmittingReview(true)
    try {
      const res = await api.get(`/customer/invoices/${record.MaHoaDon}/review`, {
        params: { ma_kh: maKH }
      })
      
      if (res.data.review) {
        const r = res.data.review
        setReviewForm({
          diem_dv: r.DiemDV || 10,
          muc_do: r.Mucdohailong || 5,
          thai_do: r.Thaidonhanvien || '',
          binh_luan: r.Binhluan || ''
        })
        setIsExistingReview(true)
      } else {
        setReviewForm({ diem_dv: 10, muc_do: 5, thai_do: '', binh_luan: '' })
        setIsExistingReview(false)
      }
    } catch (e) { console.error(e) } finally { setSubmittingReview(false) }
  }

  // Gửi đánh giá (Không Schema)
  const handleSubmitReview = async () => {
    if (!currentInvoice) return
    setSubmittingReview(true)
    try {
      await api.post(`/customer/invoices/${currentInvoice.MaHoaDon}/review`, 
        reviewForm, // Gửi body gồm 4 trường
        { params: { ma_kh: maKH } }
      )
      message.success("Lưu đánh giá thành công!")
      setIsReviewModalOpen(false)
      fetchInvoices()
    } catch (e) {
      message.error("Lỗi: Không thể gửi đánh giá")
    } finally { setSubmittingReview(false) }
  }

  const columns = [
    { title: 'Mã HĐ', dataIndex: 'MaHoaDon', key: 'MaHoaDon', width: 110 },
    { title: 'Ngày lập', dataIndex: 'NgayLap', render: (v: string) => new Date(v).toLocaleString('vi-VN') },
    { title: 'Thanh toán', dataIndex: 'HinhThucThanhToan', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'Tổng tiền', dataIndex: 'TongTien', align: 'right' as const, render: (v: number) => <Text strong>{v.toLocaleString()}đ</Text> },
    {
  title: 'Thao tác',
    key: 'action',
    render: (_: any, record: InvoiceHeader) => {
      // Chuyển DaDanhGia về boolean để check
      const isReviewed = Boolean(record.DaDanhGia); 

      return (
        <Space>
          <Button onClick={() => showDetail(record)}>Chi tiết</Button>
          
          <Button 
            // Nếu đã đánh giá (isReviewed === true):
            // - type="default" (nút trắng)
            // - icon StarFilled (sao đặc)
            // - Style màu vàng #faad14
            type={isReviewed ? "default" : "primary"}
            icon={isReviewed ? <StarFilled /> : <StarOutlined />}
            style={isReviewed ? { color: '#faad14', borderColor: '#faad14' } : {}}
            onClick={() => handleOpenReview(record)}
          >
            {isReviewed ? "Xem đánh giá" : "Đánh giá"}
          </Button>
        </Space>
      )
    }
  },
  ]

  return (
    <>
      <Table dataSource={invoices} columns={columns} rowKey="MaHoaDon" loading={loading} />

      {/* Modal Chi tiết hóa đơn (GIỮ NGUYÊN) */}
      <Modal
        title={`Chi tiết hóa đơn: ${currentInvoice?.MaHoaDon}`}
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={[<Button key="close" onClick={() => setIsModalOpen(false)}>Đóng</Button>]}
        width={700}
      >
        {currentInvoice && (
          <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Ngày lập">{new Date(currentInvoice.NgayLap).toLocaleString('vi-VN')}</Descriptions.Item>
            <Descriptions.Item label="Hình thức">{currentInvoice.HinhThucThanhToan}</Descriptions.Item>
            <Descriptions.Item label="Khuyến mãi">{currentInvoice.KhuyenMai}%</Descriptions.Item>
            <Descriptions.Item label="Tổng cộng"><Text type="danger" strong>{currentInvoice.TongTien.toLocaleString()}đ</Text></Descriptions.Item>
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
            { title: 'Loại', dataIndex: 'Loai', render: (v) => v === 'Service' ? <Tag color="green">Dịch vụ</Tag> : v === 'Product' ? <Tag color="orange">Sản phẩm</Tag> : <Tag color="purple">Gói tiêm</Tag> },
            { title: 'Tên mục', dataIndex: 'TenItem' },
            { title: 'SL', dataIndex: 'SoLuong', align: 'center' },
            { title: 'Đơn giá', dataIndex: 'DonGia', align: 'right', render: (v) => `${v.toLocaleString()}đ` },
            { title: 'Thành tiền', dataIndex: 'ThanhTien', align: 'right', render: (v) => <Text strong>{v.toLocaleString()}đ</Text> },
          ]}
        />
      </Modal>

      {/* Modal Đánh giá (CẬP NHẬT THEO SQL) */}
      <Modal
        title={isExistingReview ? "Nội dung đánh giá" : "Đánh giá dịch vụ & nhân viên"}
        open={isReviewModalOpen}
        onCancel={() => setIsReviewModalOpen(false)}
        onOk={isExistingReview ? () => setIsReviewModalOpen(false) : handleSubmitReview}
        okText={isExistingReview ? "Đóng" : "Gửi đánh giá"}
        confirmLoading={submittingReview}
        cancelButtonProps={{ style: { display: isExistingReview ? 'none' : 'inline-block' } }}
      >
        <Form layout="vertical" style={{ marginTop: 10 }}>
          <Form.Item label="Điểm dịch vụ (1-10):">
            <Rate 
              count={10} 
              value={reviewForm.diem_dv} 
              disabled={isExistingReview}
              onChange={(v) => setReviewForm({...reviewForm, diem_dv: v})} 
            />
            <span style={{ marginLeft: 10 }}>{reviewForm.diem_dv}/10</span>
          </Form.Item>

          <Form.Item label="Mức độ hài lòng:">
            <Rate 
              value={reviewForm.muc_do} 
              disabled={isExistingReview}
              onChange={(v) => setReviewForm({...reviewForm, muc_do: v})} 
            />
          </Form.Item>

          <Form.Item label="Ý kiến về thái độ nhân viên:">
            <TextArea 
              rows={2}
              value={reviewForm.thai_do}
              disabled={isExistingReview}
              placeholder="Nhân viên phục vụ như thế nào..."
              onChange={(e) => setReviewForm({...reviewForm, thai_do: e.target.value})}
            />
          </Form.Item>

          <Form.Item label="Bình luận/Góp ý chung:">
            <TextArea 
              rows={3} 
              value={reviewForm.binh_luan}
              disabled={isExistingReview}
              placeholder="Chia sẻ thêm trải nghiệm của bạn..."
              onChange={(e) => setReviewForm({...reviewForm, binh_luan: e.target.value})}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  )
}