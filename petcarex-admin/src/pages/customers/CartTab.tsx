import React, { useState, useEffect, useMemo } from 'react'
import {
  Card, Table, Button, Form, message, Tag, Tabs, Select,
  InputNumber, Divider, Typography, Popconfirm, Radio, Space
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../../lib/api'

const { Text } = Typography

/* ===================== TYPES ===================== */
type BookingRow = {
  MaPhien?: string; MaHoaDon: string; TenThuCung?: string;
  TenDV: string; GiaTien: number; TrangThai: string; MaCN?: string;
}

interface CartTabProps {
  maKH: string;
  maNV?: string; 
  maCN?: string; 
}


export default function CartTab({ maKH, maNV, maCN }: CartTabProps) {
  const [pets, setPets] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [bookings, setBookings] = useState<BookingRow[]>([])
  const [loading, setLoading] = useState(false)

  // Lưu ý: selectedCN ban đầu lấy từ prop maCN (dành cho NV)
  const [selectedCN, setSelectedCN] = useState<string | undefined>(maCN)
  const [paymentMethod, setPaymentMethod] = useState(maNV ? 'Tiền mặt' : 'Chuyển khoản')

  const [bookingForm] = Form.useForm()
  const [buyForm] = Form.useForm()

  // 1. Khởi tạo dữ liệu
  useEffect(() => {
    if (maKH) {
      loadInitialData();
      loadCart(maKH);
    }
  }, [maKH])

  const loadInitialData = async () => {
    try {
      // Load thú cưng của khách
      api.get('/customer/pets', { params: { ma_kh: maKH } }).then(r => setPets(r.data.items || []))
      
      // Load TẤT CẢ dịch vụ ban đầu để khách có thể chọn trước
      // Nếu là NV thì truyền thêm ma_cn để lọc ngay từ đầu
      const svcRes = await api.get('/customer/services', { 
        params: { ma_cn: maCN || undefined } 
      })
      setServices(svcRes.data.items || [])

      // Nếu là NV (có maCN), load luôn sản phẩm của chi nhánh đó
      if (maCN) {
        const prodRes = await api.get('/customer/products/search', { params: { ma_cn: maCN } })
        setProducts(prodRes.data.items || [])
      }
    } catch (e) { console.error("Lỗi load dữ liệu ban đầu") }
  }

  const loadCart = (mkh: string) => {
    api.get('/customer/me/bookings', { params: { ma_kh: mkh } }).then(r => {
      setBookings(r.data.items || [])
    })
  }

  // 2. Xử lý khi chọn Dịch vụ (Dành cho Khách hàng chọn DV trước CN sau)
  const handleServiceChange = async (maDV: string) => {
    if (!maNV) { // Chỉ chạy logic tìm CN nếu là Khách hàng
      try {
        const res = await api.get('/customer/branches/by-service', { params: { ma_dv: maDV } })
        setBranches(res.data.items || [])
        // Reset chi nhánh đã chọn nếu chi nhánh đó không hỗ trợ dịch vụ mới
        bookingForm.setFieldsValue({ ma_cn: undefined })
      } catch (e) { message.error("Không tìm thấy chi nhánh hỗ trợ dịch vụ này") }
    }
  }

  // 3. Xử lý khi chọn Chi nhánh trong tab Sản phẩm
  const handleBranchChangeForProduct = async (cnId: string) => {
    setSelectedCN(cnId)
    const res = await api.get('/customer/products/search', { params: { ma_cn: cnId } })
    setProducts(res.data.items || [])
  }

  const tempTotal = useMemo(() => bookings.reduce((sum, item) => sum + (item.GiaTien || 0), 0), [bookings])

  /* ================= ACTIONS ================= */
  const submitBooking = async (v: any) => {
    setLoading(true)
    try {
      // Ưu tiên lấy ma_cn từ form, nếu không có (trường hợp NV fix cứng) thì lấy từ prop
      const payload = { ...v, ma_cn: v.ma_cn || maCN, ma_kh: maKH, ma_nv: maNV || 'NV_SYSTEM' }
      await api.post('/customer/appointments', null, { params: payload })
      message.success('Đã thêm dịch vụ')
      bookingForm.resetFields(['ma_thu_cung', 'ma_dv'])
      loadCart(maKH)
    } catch (e: any) { message.error(e?.response?.data?.detail || 'Lỗi đặt lịch') }
    finally { setLoading(false) }
  }

  const submitBuyProduct = async (v: any) => {
    setLoading(true)
    try {
      const payload = { ...v, ma_cn: v.ma_cn || maCN, ma_kh: maKH, ma_nv: maNV || 'NV_SYSTEM' }
      await api.post('/customer/orders/products', null, { params: payload })
      message.success('Đã thêm sản phẩm')
      buyForm.resetFields(['ma_sp', 'so_luong'])
      loadCart(maKH)
    } catch (e: any) { message.error(e?.response?.data?.detail || 'Lỗi mua hàng') }
    finally { setLoading(false) }
  }

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Tabs type="card">
        {/* TAB DỊCH VỤ */}
        <Tabs.TabPane key="svc" tab="Dịch vụ">
          <Form form={bookingForm} layout="inline" onFinish={submitBooking}>
            <Form.Item name="ma_thu_cung" rules={[{ required: true }]}>
              <Select placeholder="Chọn Pet" style={{ width: 120 }}
                options={pets.map((p: any) => ({ label: p.Ten, value: p.MaThuCung }))}
              />
            </Form.Item>

            <Form.Item name="ma_dv" rules={[{ required: true }]}>
              <Select 
                placeholder="Chọn dịch vụ" 
                style={{ width: 180 }} 
                onChange={handleServiceChange}
                options={services.map((s: any) => ({ label: s.TenDV, value: s.MaDV }))}
              />
            </Form.Item>

            {/* Chi nhánh: Nếu là NV thì hiện Tag, nếu là KH thì hiện Select dựa trên DV đã chọn */}
            <Form.Item name="ma_cn" rules={[{ required: !maCN }]}>
              {maCN ? (
                <Tag color="blue" style={{ padding: '5px 10px' }}>📍 {maCN}</Tag>
              ) : (
                <Select 
                  placeholder="Chọn Chi nhánh" 
                  style={{ width: 160 }}
                  options={branches.map(b => ({ label: b.TenCN, value: b.MaCN }))}
                />
              )}
            </Form.Item>

            <Button type="primary" htmlType="submit" loading={loading}>Thêm</Button>
          </Form>
        </Tabs.TabPane>

        {/* TAB SẢN PHẨM */}
        <Tabs.TabPane key="prd" tab="Sản phẩm">
          <Form form={buyForm} layout="inline" onFinish={submitBuyProduct}>
            <Form.Item name="ma_cn" rules={[{ required: !maCN }]}>
               {maCN ? (
                <Tag color="blue" style={{ padding: '5px 10px' }}>📍 {maCN}</Tag>
              ) : (
                <Select 
                  placeholder="Chọn Chi nhánh" 
                  style={{ width: 160 }}
                  onChange={handleBranchChangeForProduct}
                  // Ở tab sản phẩm, khách phải chọn CN trước để biết tồn kho
                  options={[{label: 'CN Quận 1', value: 'CN01'}, {label: 'CN Quận 7', value: 'CN02'}]} // Hoặc load từ API branches
                />
              )}
            </Form.Item>

            <Form.Item name="ma_sp" rules={[{ required: true }]}>
              <Select 
                showSearch 
                placeholder="Tìm sản phẩm..." 
                style={{ width: 250 }}
                disabled={!maCN && !buyForm.getFieldValue('ma_cn')}
                options={products.map((p: any) => ({
                  label: `${p.TenSP} (Tồn: ${p.SoLuongTonKho})`,
                  value: p.MaSP,
                  disabled: p.SoLuongTonKho <= 0
                }))}
              />
            </Form.Item>
            
            <Form.Item name="so_luong" initialValue={1}><InputNumber min={1} style={{ width: 60 }} /></Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>Thêm</Button>
          </Form>
        </Tabs.TabPane>
      </Tabs>

      {/* TABLE & THANH TOÁN GIỮ NGUYÊN ... */}
      <Table 
        dataSource={bookings} 
        pagination={false} 
        size="small" 
        rowKey={(r) => r.MaPhien || Math.random().toString()}
        columns={[
          { title: 'Nội dung', dataIndex: 'TenDV', render: (v, r) => r.TenThuCung ? `${v} (${r.TenThuCung})` : v },
          { title: 'Chi nhánh', dataIndex: 'MaCN', render: (v) => <Tag color="cyan">{v}</Tag> },
          { title: 'Thành tiền', dataIndex: 'GiaTien', align: 'right', render: (v) => `${v?.toLocaleString()}đ` },
          { render: (r) => (
            <Popconfirm title="Xóa mục này?" onConfirm={() => api.delete(`/customer/appointments/${r.MaPhien}`, { params: { ma_kh: maKH } }).then(() => loadCart(maKH))}>
              <Button type="text" danger size="small">Xóa</Button>
            </Popconfirm>
          )}
        ]}
        summary={() => (
          <Table.Summary.Row>
            <Table.Summary.Cell colSpan={2} align="right"><Text strong>Tổng tiền:</Text></Table.Summary.Cell>
            <Table.Summary.Cell align="right">
              <Text strong style={{ color: '#f5222d', fontSize: 17 }}>{tempTotal.toLocaleString()}đ</Text>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
      
      {/* Nút xác nhận thanh toán cuối trang */}
      {bookings.length > 0 && (
        <Card size="small" style={{ background: '#fffbe6', border: '1px solid #ffe58f' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Text strong>Thanh toán:</Text>
              <Radio.Group value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                <Radio value="Tiền mặt">Tiền mặt</Radio>
                <Radio value="Chuyển khoản">Chuyển khoản</Radio>
              </Radio.Group>
            </Space>
            <Button type="primary" danger size="large" onClick={async () => {
                setLoading(true);
                try {
                    await api.post('/customer/orders/confirm', null, {
                        params: { 
                          ma_hoa_don: bookings[0].MaHoaDon, 
                          hinh_thuc_thanh_toan: paymentMethod, 
                          ma_nv: maNV || 'NV_SYSTEM' 
                        }
                    });
                    message.success('Thành công');
                    loadCart(maKH);
                } catch(e) { message.error('Thất bại') }
                finally { setLoading(false) }
            }} loading={loading}>
              XÁC NHẬN {maNV ? 'TẠI QUẦY' : 'ĐẶT HÀNG'}
            </Button>
          </div>
        </Card>
      )}
    </Space>
  )
}