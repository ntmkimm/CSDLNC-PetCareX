import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Card, Row, Col, Table, Button, InputNumber, message, 
  Space, Tag, Typography, Statistic, Input, Modal, Form,
  ConfigProvider, theme, Switch, Popconfirm, Select, DatePicker
} from 'antd';
import { 
  BarChartOutlined, TeamOutlined, DollarOutlined, 
  SwapOutlined, ReloadOutlined, BulbOutlined, BulbFilled,
  PieChartOutlined, UserOutlined, PlusOutlined, DeleteOutlined,
  EnvironmentOutlined, CalendarOutlined
} from '@ant-design/icons';
import { api } from '../lib/api';
import { useRouter } from 'next/router';
import { getAuth, clearToken } from '../lib/auth';
import dayjs from 'dayjs';

const BranchBar = dynamic(() => import('../components/charts/BranchBar'), { ssr: false });
const MembershipPie = dynamic(() => import('../components/charts/MembershipPie'), { ssr: false });

const { Title, Text } = Typography;

export default function CompanyDashboard() {
  const router = useRouter();
  const auth = getAuth();
  const payload = auth.payload;
  const warnedRef = useRef(false);

  const [isDarkMode, setIsDarkMode] = useState(false);
  const { defaultAlgorithm, darkAlgorithm } = theme;

  const role = payload?.role;
  const maCNFromToken = (payload as any)?.maCN;
  const isCompanyAdmin = role === 'staff' || role === 'branch_manager';

  const [data, setData] = useState({
    total: 0, byBranch: [], topServices: [], memberships: [], 
    customers: [], pets: [], staff: [], branches: [] 
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffSearch, setStaffSearch] = useState('');

  const [form] = Form.useForm();

  useEffect(() => {
    if (auth.token && !auth.isExpired && isCompanyAdmin) return;
    if (!warnedRef.current) {
      warnedRef.current = true;
      message.error('Bạn không có quyền truy cập quản trị');
    }
    router.replace('/');
  }, [auth.token, auth.isExpired, router, role]);

  const fetchData = async (endpoint: string, key: string, params = {}) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.get(`/company/${endpoint}`, { params });
      setData(prev => ({ ...prev, [key]: res.data?.items ?? res.data }));
    } catch (err) { console.error(err); }
    finally { setLoading(prev => ({ ...prev, [key]: false })); }
  };

  const loadAll = () => {
    fetchData('revenue/total', 'total');
    fetchData('revenue/by-branch', 'byBranch');
    fetchData('services/top-revenue', 'topServices');
    fetchData('memberships/distribution', 'memberships');
    fetchData('customers/count-by-branch', 'customers');
    fetchData('pets/overall-stats', 'pets');
    fetchData('branches/all', 'branches');
    fetchData('staff/search', 'staff', { keyword: staffSearch });
  };

  useEffect(() => { if (auth.token) loadAll(); }, [staffSearch]);

  const handleStaffSubmit = async (values: any) => {
    try {
      if (selectedStaff) {
        await api.put(`/company/staff/${selectedStaff.MaNV}/assignment`, {
          ma_cn_moi: values.MaCN,
          luong_moi: values.Luong
        });
        message.success('Cập nhật nhân sự thành công');
      } else {
        const submitData = { ...values, NgaySinh: values.NgaySinh?.format('YYYY-MM-DD') };
        await api.post(`/company/staff`, submitData);
        message.success('Thêm nhân viên thành công');
      }
      setIsModalOpen(false);
      fetchData('staff/search', 'staff');
    } catch (err: any) {
      message.error(err.response?.data?.detail || 'Thao tác thất bại');
    }
  };

  const handleDeleteStaff = async (maNV: string) => {
    try {
      await api.delete(`/company/staff/${maNV}`);
      message.success('Đã xóa nhân viên');
      fetchData('staff/search', 'staff');
    } catch (err: any) { message.error('Không thể xóa nhân sự này'); }
  };

  if (!auth.token) return null;

  return (
    <ConfigProvider theme={{ 
      algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm,
      token: { borderRadius: 12, colorPrimary: '#1890ff' }
    }}>
      <div style={{ 
        padding: '24px', 
        background: isDarkMode ? '#000' : 'linear-gradient(180deg, #f0f2f5 0%, #ffffff 100%)', 
        minHeight: '100vh', transition: 'all 0.3s' 
      }}>
        
        {/* Header hiện đại */}
        <div style={{ 
          background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(10px)', padding: '20px', borderRadius: '16px',
          marginBottom: '24px', border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
        }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: '#1890ff', width: '8px', height: '30px', borderRadius: '4px' }} />
                Hệ thống Quản trị PetCareX
              </Title>
              <Space style={{ marginTop: 8 }}>
                <Tag color="blue" icon={<TeamOutlined />}>{role}</Tag>
                <Tag color="cyan" icon={<EnvironmentOutlined />}>{maCNFromToken || "Toàn hệ thống"}</Tag>
              </Space>
            </Col>
            <Col>
              <Space size="middle">
                <Switch checked={isDarkMode} onChange={setIsDarkMode} checkedChildren={<BulbFilled />} unCheckedChildren={<BulbOutlined />} />
                <Button icon={<ReloadOutlined />} shape="circle" onClick={loadAll} />
                <Button type="primary" danger onClick={() => { clearToken(); router.replace('/'); }}>Đăng xuất</Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Row gutter={[20, 20]}>
          {/* Bento Box 1: Doanh thu & Hội viên */}
          <Col xs={24} lg={8}>
            <Card style={{ height: '100%' }} bordered={false} hoverable>
              <Statistic 
                title={<Text strong type="secondary">TỔNG DOANH THU</Text>}
                value={(data.total as any)?.TongDoanhThu || 0}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a', fontSize: '32px', fontWeight: '800' }}
                suffix="VND"
              />
              <div style={{ marginTop: '40px' }}>
                <Text strong><PieChartOutlined /> Phân bổ hạng hội viên (CT4)</Text>
                <MembershipPie data={data.memberships.map((m: any) => ({ name: m.Bac, value: m.SoLuong }))} />
              </div>
            </Card>
          </Col>

          {/* Bento Box 2: Biểu đồ & Top Dịch vụ */}
          <Col xs={24} lg={16}>
            <Row gutter={[20, 20]}>
              <Col span={24}>
                <Card title={<Space><BarChartOutlined /> Hiệu suất doanh thu chi nhánh (CT1)</Space>} bordered={false} hoverable>
                  <BranchBar data={data.byBranch.map((b: any) => ({ branch: b.TenCN, revenue: b.DoanhThu }))} />
                </Card>
              </Col>
              <Col span={24}>
                <Card title={<Space><DollarOutlined /> Top Dịch vụ (CT3)</Space>} bordered={false} hoverable>
                  <Table dataSource={data.topServices} pagination={false} size="small" columns={[
                    { title: 'Dịch vụ', dataIndex: 'TenDV', render: t => <Text strong>{t}</Text> },
                    { title: 'Doanh thu', dataIndex: 'DoanhThuDichVu', align: 'right', render: v => <Text type="success">{v?.toLocaleString()} đ</Text> }
                  ]} />
                </Card>
              </Col>
            </Row>
          </Col>

          {/* Quản lý Nhân sự (CT5, CT6) */}
          <Col span={24}>
            <Card 
              title={<Space><UserOutlined /> Quản lý nhân sự tổng thể</Space>}
              extra={
                <Space>
                  <Input.Search placeholder="Tìm theo tên/mã..." onSearch={setStaffSearch} style={{ width: 250 }} allowClear />
                  <Button type="primary" icon={<PlusOutlined />} onClick={() => { setSelectedStaff(null); form.resetFields(); setIsModalOpen(true); }}>
                    Thêm nhân viên
                  </Button>
                </Space>
              }
            >
              <Table 
                dataSource={data.staff} rowKey="MaNV"
                columns={[
                  { title: 'Mã NV', dataIndex: 'MaNV', sorter: (a, b) => a.MaNV.localeCompare(b.MaNV) },
                  { title: 'Họ tên', dataIndex: 'HoTen', render: (t) => <Text strong>{t}</Text> },
                  { title: 'Chức vụ', dataIndex: 'ChucVu', render: (t) => <Tag color="orange">{t}</Tag> },
                  { title: 'Chi nhánh', dataIndex: 'TenCN', render: (t) => <Tag color="blue">{t}</Tag> },
                  { title: 'Lương', dataIndex: 'Luong', align: 'right', sorter: (a, b) => a.Luong - b.Luong, render: v => <b>{v?.toLocaleString()} đ</b> },
                  { title: 'Thao tác', render: (_, record) => (
                    <Space>
                      <Button size="small" type="link" icon={<SwapOutlined />} onClick={() => {
                        setSelectedStaff(record);
                        form.setFieldsValue({ MaCN: record.MaCN, Luong: record.Luong });
                        setIsModalOpen(true);
                      }}>Sửa/Điều động</Button>
                      <Popconfirm title="Xác nhận xóa?" onConfirm={() => handleDeleteStaff(record.MaNV)}><Button size="small" type="text" danger icon={<DeleteOutlined />} /></Popconfirm>
                    </Space>
                  )}
                ]}
              />
            </Card>
          </Col>

          {/* CT7 & CT8 */}
          <Col xs={24} md={12}>
            <Card title="Mật độ khách hàng (CT7)" hoverable>
              <Table dataSource={data.customers} pagination={{ pageSize: 5 }} columns={[
                { title: 'Chi nhánh', dataIndex: 'TenCN', sorter: (a, b) => a.TenCN.localeCompare(b.TenCN) },
                { title: 'Số khách', dataIndex: 'SoKhachHang', align: 'right', sorter: (a, b) => a.SoKhachHang - b.SoKhachHang, defaultSortOrder: 'descend' }
              ]} />
            </Card>
          </Col>
          <Col xs={24} md={12}>
            <Card title="Thống kê sinh vật (CT8)" hoverable>
              <Table dataSource={data.pets.filter(i => i.Loai !== 'TỔNG CỘNG')} pagination={false} columns={[
                { title: 'Loài', dataIndex: 'Loai', render: t => <Tag color="purple">{t}</Tag> },
                { title: 'Số lượng', dataIndex: 'SoLuong', align: 'right' }
              ]} summary={() => (
                <Table.Summary.Row style={{ background: isDarkMode ? '#1d1d1d' : '#fafafa' }}>
                  <Table.Summary.Cell index={0}><Text strong>TỔNG CỘNG HỆ THỐNG</Text></Table.Summary.Cell>
                  <Table.Summary.Cell index={1} align="right"><Text strong type="danger" style={{ fontSize: '16px' }}>{data.pets.find(i => i.Loai === 'TỔNG CỘNG')?.SoLuong}</Text></Table.Summary.Cell>
                </Table.Summary.Row>
              )} />
            </Card>
          </Col>
        </Row>

        <Modal 
          title={<Space><CalendarOutlined /> {selectedStaff ? `Cập nhật thông tin: ${selectedStaff.HoTen}` : "Tiếp nhận nhân viên mới"}</Space>}
          open={isModalOpen} onCancel={() => setIsModalOpen(false)} footer={null} destroyOnClose centered
        >
          <Form form={form} layout="vertical" onFinish={handleStaffSubmit} requiredMark="optional">
            {!selectedStaff && (
              <>
                <Form.Item name="MaNV" label="Mã định danh" rules={[{ required: true }]}><Input placeholder="Ví dụ: NV00001" /></Form.Item>
                <Form.Item name="HoTen" label="Họ và tên" rules={[{ required: true }]}><Input /></Form.Item>
                <Row gutter={16}>
                  <Col span={12}><Form.Item name="NgaySinh" label="Ngày sinh"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                  <Col span={12}><Form.Item name="GioiTinh" label="Giới tính"><Select options={[{value: 'Nam', label: 'Nam'}, {value: 'Nữ', label: 'Nữ'}]} /></Form.Item></Col>
                </Row>
                <Form.Item name="ChucVu" label="Chức vụ đảm nhiệm" rules={[{ required: true }]}><Input /></Form.Item>
              </>
            )}
            <Form.Item name="MaCN" label="Cơ sở làm việc" rules={[{ required: true }]}>
              <Select placeholder="Chọn chi nhánh có sẵn" showSearch optionFilterProp="children">
                {data.branches.map((bn: any) => (
                  <Select.Option key={bn.MaCN} value={bn.MaCN}>{bn.TenCN} ({bn.MaCN})</Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item name="Luong" label="Mức lương cơ bản (VND)" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} addonAfter="₫" />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large" style={{ marginTop: 10 }}>{selectedStaff ? "Xác nhận cập nhật" : "Tạo hồ sơ nhân viên"}</Button>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
}