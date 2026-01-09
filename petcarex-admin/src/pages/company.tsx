import React, { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { 
  Card, Row, Col, Table, Button, InputNumber, message, 
  Space, Tag, Typography, Statistic, Input, Modal, Form,
  ConfigProvider, theme, Switch
} from 'antd';
import { 
  BarChartOutlined, TeamOutlined, DollarOutlined, 
  SwapOutlined, ReloadOutlined, BulbOutlined, BulbFilled,
  PieChartOutlined, UserOutlined
} from '@ant-design/icons';
import { api } from '../lib/api';
import { useRouter } from 'next/router';
import { getAuth, clearToken } from '../lib/auth';

const BranchBar = dynamic(() => import('../components/charts/BranchBar'), { ssr: false });
const MembershipPie = dynamic(() => import('../components/charts/MembershipPie'), { ssr: false });

const { Title, Text } = Typography;

export default function CompanyDashboard() {
  const router = useRouter();
  const auth = getAuth();
  const payload = auth.payload;
  const warnedRef = useRef(false);

  // ======= Dark Mode State =======
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { defaultAlgorithm, darkAlgorithm } = theme;

  const role = payload?.role;
  const maCNFromToken = (payload as any)?.maCN;
  const isCompanyAdmin = role === 'staff' || role === 'branch_manager';

  // ======= States =======
  const [data, setData] = useState({
    total: 0,
    byBranch: [],
    topServices: [],
    memberships: [],
    customers: [],
    pets: [],
    staff: []
  });
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [staffSearch, setStaffSearch] = useState('');

  // ======= Guards =======
  useEffect(() => {
    if (auth.token && !auth.isExpired && (role === 'staff' || role === 'branch_manager')) return;
    if (!warnedRef.current) {
      warnedRef.current = true;
      message.error('Bạn không có quyền truy cập trang quản trị này');
    }
    router.replace('/');
  }, [auth.token, auth.isExpired, router, role]);

  // ======= Data Loaders =======
  const fetchData = async (endpoint: string, key: string, params = {}) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const res = await api.get(`/company/${endpoint}`, { params });
      setData(prev => ({ ...prev, [key]: res.data?.items ?? res.data }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  const loadAll = () => {
    fetchData('revenue/total', 'total');
    fetchData('revenue/by-branch', 'byBranch');
    fetchData('services/top-revenue', 'topServices');
    fetchData('memberships/distribution', 'memberships');
    fetchData('customers/count-by-branch', 'customers');
    fetchData('pets/overall-stats', 'pets');
    fetchData('staff/search', 'staff', { keyword: staffSearch });
    message.success('Dữ liệu đã được cập nhật');
  };

  useEffect(() => { if (auth.token) loadAll(); }, [staffSearch]);

  const handleUpdateStaff = async (values: any) => {
    try {
      await api.put(`/company/staff/${selectedStaff.MaNV}/assignment`, values);
      message.success('Điều động nhân sự thành công');
      setIsModalOpen(false);
      fetchData('staff/search', 'staff');
    } catch (err) {
      message.error('Lỗi khi cập nhật nhân sự');
    }
  };

  if (!auth.token) return null;

  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm }}>
      <div style={{ 
        padding: '24px', 
        background: isDarkMode ? '#141414' : '#f0f2f5', 
        minHeight: '100vh',
        transition: 'all 0.3s'
      }}>
        {/* Header Section */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>PetCareX Dashboard</Title>
            <Space split={<Text type="secondary">|</Text>}>
              <Tag color="gold" icon={<TeamOutlined />}>{role?.toUpperCase()}</Tag>
              {maCNFromToken && <Text type="secondary">Chi nhánh: {maCNFromToken}</Text>}
            </Space>
          </Col>
          <Col>
            <Space size="large">
              <Space>
                <BulbOutlined />
                <Switch 
                  checked={isDarkMode} 
                  onChange={setIsDarkMode} 
                  checkedChildren="Dark" 
                  unCheckedChildren="Light" 
                />
                <BulbFilled />
              </Space>
              <Button icon={<ReloadOutlined />} onClick={loadAll}>Refresh</Button>
              <Button danger onClick={() => { clearToken(); router.replace('/'); }}>Logout</Button>
            </Space>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          {/* CT2: Tổng doanh thu */}
          <Col xs={24} md={8}>
            <Card hoverable style={{ height: '100%' }}>
              <Statistic 
                title={<Text strong>TỔNG DOANH THU HỆ THỐNG</Text>}
                value={(data.total as any)?.TongDoanhThu || 0}
                precision={0}
                prefix={<DollarOutlined style={{ color: '#52c41a' }} />}
                suffix="VND"
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
              <Text type="secondary">Cập nhật: {new Date().toLocaleTimeString()}</Text>
            </Card>
          </Col>

          {/* CT4: Hội viên */}
          <Col xs={24} md={16}>
            <Card title={<Space><PieChartOutlined /> Phân bổ hạng hội viên (CT4)</Space>} hoverable>
              <MembershipPie data={data.memberships.map((m: any) => ({ name: m.Bac, value: m.SoLuong }))} />
            </Card>
          </Col>

          {/* CT1: Doanh thu chi nhánh */}
          <Col xs={24} lg={12}>
            <Card title={<Space><BarChartOutlined /> Doanh thu theo chi nhánh (CT1)</Space>} hoverable>
              <BranchBar data={data.byBranch.map((b: any) => ({ branch: b.TenCN, revenue: b.DoanhThu }))} />
            </Card>
          </Col>

          {/* CT3: Top Dịch vụ */}
          <Col xs={24} lg={12}>
            <Card title={<Space><DollarOutlined /> Dịch vụ mang lại doanh thu cao nhất (CT3)</Space>} hoverable>
              <Table 
                dataSource={data.topServices} 
                rowKey="MaDV"
                columns={[
                  { title: 'Dịch vụ', dataIndex: 'TenDV', key: 'TenDV', render: (t) => <Text strong>{t}</Text> },
                  { title: 'Doanh thu (VND)', dataIndex: 'DoanhThuDichVu', key: 'rev', align: 'right', render: v => <Text color="blue">{v?.toLocaleString()}</Text> }
                ]} 
                pagination={false} 
                size="small"
              />
            </Card>
          </Col>

          {/* CT5 & CT6: Nhân sự */}
<Col span={24}>
  <Card 
    title={<Space><UserOutlined /> Quản lý & Điều động nhân sự (CT5, CT6)</Space>}
    extra={<Input.Search placeholder="Tìm nhân viên..." onSearch={setStaffSearch} style={{ width: 250 }} />}
    hoverable
  >
    <Table 
      dataSource={data.staff}
      rowKey="MaNV"
      columns={[
        { 
          title: 'Mã NV', 
          dataIndex: 'MaNV',
          sorter: (a: any, b: any) => a.MaNV.localeCompare(b.MaNV) 
        },
        { 
          title: 'Họ tên', 
          dataIndex: 'HoTen', 
          render: (t) => <Text strong>{t}</Text>,
          sorter: (a: any, b: any) => a.HoTen.localeCompare(b.HoTen)
        },
        { title: 'Chức vụ', dataIndex: 'ChucVu' },
        { 
          title: 'Chi nhánh', 
          dataIndex: 'TenCN', 
          render: (t) => <Tag color="blue">{t}</Tag>,
      
        },
        { 
          title: 'Lương', 
          dataIndex: 'Luong', 
          // Sắp xếp theo giá trị số của lương
          sorter: (a: any, b: any) => a.Luong - b.Luong,
          render: v => <Text strong color="green">{v?.toLocaleString()} đ</Text> 
        },
        { 
          title: 'Thao tác', 
          render: (_, record) => (
            <Button type="primary" ghost icon={<SwapOutlined />} onClick={() => { setSelectedStaff(record); setIsModalOpen(true); }}>
              Điều động
            </Button>
          ) 
        }
      ]}
      // Thêm tooltip hướng dẫn sắp xếp cho người dùng
      showSorterTooltip={{ title: 'Click để sắp xếp' }}
    />
  </Card>
</Col>

          {/* CT7: Khách hàng chi nhánh */}
         <Col xs={24} md={12}>
  <Card title={<Space><TeamOutlined /> Khách hàng mỗi chi nhánh (CT7)</Space>} hoverable>
    <Table 
      dataSource={data.customers} 
      rowKey="TenCN"
      columns={[
        { 
          title: 'Chi nhánh', 
          dataIndex: 'TenCN',
          
        },
        { 
          title: 'Số lượng khách', 
          dataIndex: 'SoKhachHang', 
          align: 'right', 
          // Sắp xếp theo số lượng tăng/giảm dần
          sorter: (a: any, b: any) => a.SoKhachHang - b.SoKhachHang,
          // Mặc định ưu tiên sắp xếp cột này giảm dần khi click lần đầu
          defaultSortOrder: 'descend', 
          render: v => <Text strong style={{ color: '#1890ff' }}>{v}</Text> 
        }
      ]}
      size="small"
      pagination={{ pageSize: 5 }}
      // Làm cho bảng nhìn chuyên nghiệp hơn khi di chuột qua
      showSorterTooltip={{ title: 'Sort' }}
    />
  </Card>
</Col>

          {/* CT8: Thú cưng */}
          <Col xs={24} md={12}>
            <Card title="Thống kê loài thú cưng (CT8)">
              <Table 
                dataSource={data.pets.filter(item => item.Loai !== 'TỔNG CỘNG')} 
                columns={[
                  { title: 'Loài', dataIndex: 'Loai', render: v => <Tag color="purple">{v}</Tag> },
                  { title: 'Số lượng', dataIndex: 'SoLuong', align: 'right' }
                ]}
                size="small"
                pagination={false}
                summary={() => {
                  const total = data.pets.find(i => i.Loai === 'TỔNG CỘNG')?.SoLuong || 0;
                  return (
                    <Table.Summary.Row style={{ background: isDarkMode ? '#1d1d1d' : '#fafafa' }}>
                      <Table.Summary.Cell index={0}><Text strong>TỔNG CỘNG</Text></Table.Summary.Cell>
                      <Table.Summary.Cell index={1} align="right"><Text strong type="danger">{total}</Text></Table.Summary.Cell>
                    </Table.Summary.Row>
                  );
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Modal CT6 */}
        <Modal 
          title={`Điều động nhân sự: ${selectedStaff?.HoTen}`} 
          open={isModalOpen} 
          onCancel={() => setIsModalOpen(false)}
          footer={null}
          destroyOnClose
        >
          <Form layout="vertical" onFinish={handleUpdateStaff} initialValues={{ luong_moi: selectedStaff?.Luong }}>
            <Form.Item name="ma_cn_moi" label="Chi nhánh mới" rules={[{ required: true, message: 'Vui lòng nhập mã CN' }]}>
              <Input placeholder="Ví dụ: CN002" />
            </Form.Item>
            <Form.Item name="luong_moi" label="Mức lương mới" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
            </Form.Item>
            <Button type="primary" htmlType="submit" block size="large">Xác nhận điều động</Button>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
}