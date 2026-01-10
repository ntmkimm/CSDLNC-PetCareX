import React from 'react'
import { useRouter } from 'next/router'
import {
  Card, Table, Button, message, Tag, Input, Divider, 
  Typography, Space, Tabs, Spin, Select, InputNumber 
} from 'antd'
import { 
  PlayCircleOutlined, 
  SaveOutlined, 
  SearchOutlined,
  HistoryOutlined
} from '@ant-design/icons'
import type { ColumnsType } from 'antd/es/table'
import { api } from '../../lib/api'
import { clearToken } from '../../lib/auth'

const { Text, Title } = Typography

/* ===================== TYPES ===================== */
type Medicine = {
  MaSP: string
  TenSP: string
  LoaiSP?: string
  DonGia: number
  DonViTinh: string
  SoLuongTonKho: number
}

/* ===================== COMPONENT 1: TRA CỨU THUỐC ===================== */
function MedicinesTab({ maCN, setMedicinesList }: { maCN: string, setMedicinesList: (data: Medicine[]) => void }) {
  const [medicines, setMedicines] = React.useState<Medicine[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchText, setSearchText] = React.useState('')

  const fetchData = async (cn: string) => {
    if (!cn) return
    setLoading(true)
    try {
      const res = await api.get('/staff/medicines', { params: { ma_cn: cn, all: true } })
      const data = res.data?.items ?? (Array.isArray(res.data) ? res.data : [])
      setMedicines(data)
      setMedicinesList(data) 
    } catch (e: any) {
      message.error('Lỗi tải danh mục thuốc')
    } finally {
      setLoading(false)
    }
  }

  React.useEffect(() => { if (maCN) fetchData(maCN) }, [maCN])

  const filteredMedicines = React.useMemo(() => {
    if (!searchText) return medicines
    const search = searchText.toLowerCase()
    return medicines.filter(m => m.TenSP.toLowerCase().includes(search) || m.MaSP.toLowerCase().includes(search))
  }, [medicines, searchText])

  const columns: ColumnsType<Medicine> = [
    { title: 'Mã', dataIndex: 'MaSP', width: 100 },
    { title: 'Tên dược phẩm', dataIndex: 'TenSP', render: (v) => <Text strong color="blue">{v}</Text> },
    { title: 'ĐVT', dataIndex: 'DonViTinh', align: 'center' },
    { title: 'Tồn kho (CN)', dataIndex: 'SoLuongTonKho', align: 'center', render: (v) => (
      <Tag color={v > 0 ? 'green' : 'red'}>{v > 0 ? v : 0}</Tag>
    )}
  ]

  return (
    <div style={{ marginTop: 10 }}>
      <Input.Search 
        placeholder="Tìm tên hoặc mã thuốc..." 
        onChange={(e) => setSearchText(e.target.value)} 
        style={{ marginBottom: 16 }} 
        prefix={<SearchOutlined />}
      />
      <Table dataSource={filteredMedicines} columns={columns} rowKey="MaSP" loading={loading} size="small" pagination={{ pageSize: 10 }} />
    </div>
  )
}

/* ===================== COMPONENT 2: PHÒNG KHÁM ===================== */
function ExaminationTab({ maCN, maNV }: { maCN: string, maNV: string }) {
  const [bookings, setBookings] = React.useState<any[]>([]) 
  const [loading, setLoading] = React.useState(false)
  const [selectedSession, setSelectedSession] = React.useState<any>(null)
  const [searchKH, setSearchKH] = React.useState('')
  
  const [allMedicines, setAllMedicines] = React.useState<any[]>([])
  const [symptoms, setSymptoms] = React.useState('')
  const [diagnosis, setDiagnosis] = React.useState('')
  const [prescription, setPrescription] = React.useState<any[]>([])

  const fetchAllMedicines = async () => {
    try {
      const res = await api.get('/staff/all-medicines');
      setAllMedicines(res.data?.items || res.data || []);
    } catch (e) { console.error("Không thể nạp danh mục thuốc tổng"); }
  }

  const fetchBookings = async (khId?: string) => {
    setLoading(true)
    try {
      const res = await api.get('/staff/bookings', { params: { ma_cn: maCN, ma_kh: khId || undefined } })
      setBookings(res.data.items || [])
    } catch (e) { message.error('Lỗi tải hàng đợi'); } 
    finally { setLoading(false) }
  }

  React.useEffect(() => { 
    if (maCN) { fetchBookings(); fetchAllMedicines(); }
  }, [maCN])

  const handleStartExam = async (record: any) => {
    try {
      await api.post('/staff/examination/start', { ma_phien: record.MaPhien });
      message.success(`Đã chuyển ${record.TenThuCung} vào phòng khám`);

      await fetchBookings(searchKH);

      setSelectedSession({ ...record, TrangThai: 'IN_SERVICE' });
      setSymptoms(''); setDiagnosis(''); setPrescription([]);
    } catch (e) { message.error("Lỗi: Ca này đã có bác sĩ khác tiếp nhận!"); }
  }

  const handleSelectSession = (record: any) => {
    if (record.TrangThai !== 'IN_SERVICE') {
        return message.warning("Hãy nhấn 'Khám' để bắt đầu phiên làm việc");
    }
    setSelectedSession(record);
  }

  const handleSaveExam = async () => {
    if (!selectedSession || !diagnosis) return message.error('Phải có chẩn đoán mới lưu được hồ sơ');
    setLoading(true);
    try {
      await api.post('/staff/examination/complete', {
        ma_phien: selectedSession.MaPhien,
        ma_bs: maNV,
        trieu_chung: symptoms,
        chan_doan: diagnosis,
        thuoc_list: prescription
      });
      message.success('Đã lưu hồ sơ thành công');

      setSelectedSession(null);
      setSymptoms(''); setDiagnosis(''); setPrescription([]);

      fetchBookings(searchKH);
    } catch (e) { message.error('Lỗi lưu dữ liệu'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', gap: '20px', marginTop: 10 }}>
      {/* HÀNG ĐỢI: Chỉ hiện BOOKING */}
      <Card title="Hàng đợi khám" style={{ width: '400px' }} size="small">
        <Input.Search 
          placeholder="Mã KH..." 
          onSearch={(val) => { setSearchKH(val); fetchBookings(val); }} 
          style={{ marginBottom: 12 }} 
          enterButton 
        />
        <Table
          dataSource={bookings} 
          rowKey="MaPhien" 
          size="small" 
          loading={loading}
          onRow={(r) => ({ onClick: () => handleSelectSession(r) })}
          columns={[
            { title: 'Thú cưng', render: (_, r) => (
              <div style={{ cursor: 'pointer' }}>
                <Text strong color={selectedSession?.MaPhien === r.MaPhien ? '#1890ff' : ''}>{r.TenThuCung}</Text> <br/>
                <Text type="secondary" style={{fontSize: 11}}>{r.MaPhien}</Text>
              </div>
            )},
            { title: 'Trạng thái', render: (_, r) => (
              r.TrangThai === 'IN_SERVICE' ? (
                <Button type="primary" size="small" ghost icon={<PlayCircleOutlined />} onClick={(e) => { e.stopPropagation(); handleStartExam(r); }}>Khám</Button>
              ) : <Tag color="blue">Đang khám</Tag>
            )}
          ]}
        />
      </Card>

      {/* KHU VỰC NHẬP LIỆU */}
      <Card title={selectedSession ? `Khám cho: ${selectedSession.TenThuCung}` : "Chưa chọn ca khám"} style={{ flex: 1 }}>
        {selectedSession ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Triệu chứng lâm sàng:</Text>
            <Input.TextArea rows={2} value={symptoms} onChange={e => setSymptoms(e.target.value)} placeholder="Nhập triệu chứng..." />
            
            <Text strong>Chẩn đoán bệnh:</Text>
            <Input.TextArea rows={2} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Nhập kết luận..." />

            <Divider orientation="left" style={{margin: '12px 0'}}>Kê toa thuốc</Divider>
            
            <Select 
              showSearch 
              placeholder="Chọn thuốc..." 
              style={{ width: '100%' }} 
              optionFilterProp="children"
              onSelect={(val, opt: any) => {
                if(!prescription.find(p => p.MaSP === val)) 
                  setPrescription([...prescription, { MaSP: val, TenSP: opt.children, SoLuong: 1 }])
              }}
            >
              {allMedicines.map(m => (
                <Select.Option key={m.MaSP} value={m.MaSP}>{m.TenSP}</Select.Option>
              ))}
            </Select>

            <Table dataSource={prescription} rowKey="MaSP" size="small" pagination={false} 
                columns={[
                    { title: 'Tên thuốc', dataIndex: 'TenSP' },
                    { title: 'SL', width: 80, render: (_, r, idx) => (
                        <InputNumber min={1} value={r.SoLuong} size="small" onChange={v => {
                            const n = [...prescription]; n[idx].SoLuong = v || 1; setPrescription(n);
                        }} />
                    )},
                    { title: '', render: (_, __, idx) => <Button type="link" danger size="small" onClick={() => { const n = [...prescription]; n.splice(idx, 1); setPrescription(n); }}>Xóa</Button> }
                ]} 
            />
            <Button type="primary" block icon={<SaveOutlined />} onClick={handleSaveExam} loading={loading} style={{ marginTop: 10 }}>
              LƯU HỒ SƠ & TOA THUỐC
            </Button>
          </Space>
        ) : <div style={{ textAlign: 'center', padding: 80, color: '#bfbfbf' }}><HistoryOutlined style={{fontSize: 40}}/><br/>Chọn một ca "Đang khám" hoặc nhấn nút Khám</div>}
      </Card>
    </div>
  )
}

/* ===================== COMPONENT 3: HỒ SƠ ===================== */
function MedicalRecordsTab() {
  const [pets, setPets] = React.useState([])
  const [selectedPet, setSelectedPet] = React.useState<any>(null)
  const [history, setHistory] = React.useState({ exams: [], vaccines: [] })
  const [loading, setLoading] = React.useState(false)

  const searchPets = async (value: string) => {
    if (!value) return
    setLoading(true)
    try {
      const res = await api.get('/customer/pets', { params: { ma_kh: value } })
      setPets(res.data.items || []); setSelectedPet(null);
    } catch (e) { message.error('Lỗi tìm kiếm') }
    finally { setLoading(false) }
  }

  const handleSelectPet = async (pet: any) => {
    setSelectedPet(pet); setLoading(true)
    try {
      const [ex, vac] = await Promise.all([
        api.get('/staff/history/exams', { params: { ma_thu_cung: pet.MaThuCung } }),
        api.get('/staff/history/vaccines', { params: { ma_thu_cung: pet.MaThuCung } })
      ])
      setHistory({ exams: ex.data.items || [], vaccines: vac.data.items || [] })
    } catch (e) { setHistory({ exams: [], vaccines: [] }) }
    finally { setLoading(false) }
  }

  return (
    <div style={{ display: 'flex', gap: '24px' }}>
      <Card size="small" title="Tìm thú cưng" style={{ width: '300px' }}>
        <Input.Search placeholder="Mã KH..." onSearch={searchPets} enterButton style={{marginBottom: 10}} />
        <Table dataSource={pets} rowKey="MaThuCung" size="small" pagination={false}
          onRow={(r) => ({ onClick: () => handleSelectPet(r), style: { cursor: 'pointer', background: selectedPet?.MaThuCung === r.MaThuCung ? '#e6f7ff' : '' } })}
          columns={[{ title: 'Tên', dataIndex: 'Ten' }, { title: 'Giống', dataIndex: 'Giong' }]}
        />
      </Card>
      
      <Card style={{ flex: 1 }} title={selectedPet ? `Hồ sơ: ${selectedPet.Ten}` : "Thông tin chi tiết"}>
        {selectedPet ? (
          <Tabs defaultActiveKey="h1">
            <Tabs.TabPane tab="Lịch sử khám" key="h1">
              <Table dataSource={history.exams} size="small" 
                columns={[
                  { title: 'Ngày', dataIndex: 'NgayKham', width: 100, render: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '---' },
                  { title: 'Chẩn đoán', dataIndex: 'ChanDoan', width: 180 },
                  { title: 'Toa thuốc', dataIndex: 'ToaThuoc', render: (t) => t ? <Tag color="blue">{t}</Tag> : 'N/A' },
                  { title: 'Bác sĩ', dataIndex: 'TenBacSi' }
                ]} 
              />
            </Tabs.TabPane>

            {/* CẬP NHẬT: Thêm thông tin đầy đủ cho Tiêm phòng giống bên Khám */}
            <Tabs.TabPane tab="Lịch sử tiêm phòng" key="h2">
              <Table dataSource={history.vaccines} size="small" 
                columns={[
                  { title: 'Ngày', dataIndex: 'NgayTiem', width: 100, render: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '---' },
                  { title: 'Vaccine', dataIndex: 'TenVaccine', width: 180, render: (v) => <Tag color="cyan">{v}</Tag> },
                  { title: 'Hình thức', dataIndex: 'TenGoi', render: (g) => g ? <Tag color="orange">Gói: {g}</Tag> : <Tag>Tiêm lẻ</Tag> },
                  { title: 'Liều lượng', dataIndex: 'SoLieu', render: (s) => `${s} liều` },
                  { title: 'Bác sĩ', dataIndex: 'TenBacSi' }
                ]} 
              />
            </Tabs.TabPane>
          </Tabs>
        ) : <div style={{padding: 50, textAlign:'center'}}>Vui lòng chọn thú cưng để xem bệnh lý</div>}
      </Card>
    </div>
  )
}

/* ===================== COMPONENT 4: TIÊM PHÒNG ===================== */
function VaccinationTab({ maCN, maNV }: { maCN: string, maNV: string }) {
  const [bookings, setBookings] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [selectedSession, setSelectedSession] = React.useState<any>(null)
  
  const [vaccines, setVaccines] = React.useState<any[]>([])
  const [selectedList, setSelectedList] = React.useState<any[]>([])

  const fetchBookings = async () => {
    setLoading(true)
    try {
      const res = await api.get('/staff/bookings', { params: { ma_cn: maCN, ma_dv: 'DV002' } })
      const waitList = (res.data.items || []).filter((item: any) => item.TrangThai === 'IN_SERVICE');
      setBookings(waitList)
    } catch (e) { message.error('Lỗi tải danh sách đợi') }
    finally { setLoading(false) }
  }

  const fetchDataCommon = async () => {
    try {
      const resVC = await api.get('/staff/vaccines')
      setVaccines(resVC.data?.items || [])
    } catch (e) { console.error("Lỗi danh mục vaccine") }
  }

  React.useEffect(() => {
    if (maCN) fetchBookings();
    fetchDataCommon();
  }, [maCN])

  const handlePickSession = (record: any) => {
    setSelectedSession(record);
    setSelectedList([]);
    setBookings(bookings.filter(b => b.MaPhien !== record.MaPhien));
  }

  const handleSaveVaccine = async () => {
    if (selectedList.length === 0) return message.error('Vui lòng chọn ít nhất 1 loại Vaccine');
    
    setLoading(true);
    try {
      await api.post('/staff/vaccination/complete', {
        ma_phien_goc: selectedSession.MaPhien, 
        ma_bs: maNV,
        ma_cn: maCN,
        danh_sach_tiem: selectedList.map(item => ({
          ma_vc: item.MaVC,
          ma_goi: null, 
          so_lieu: item.dosage
        }))
      });

      message.success('Đã lưu thành công ca tiêm');
      setSelectedSession(null);
      setSelectedList([]);
      fetchBookings(); 
    } catch (e: any) {
      message.error('Lỗi khi lưu dữ liệu tiêm');
    } finally { setLoading(false); }
  }

  return (
    <div style={{ display: 'flex', gap: '20px', marginTop: 10 }}>
      {/* BÊN TRÁI: HÀNG ĐỢI */}
      <Card title="Hàng đợi Tiêm" style={{ width: '350px' }} size="small">
        <Table
          dataSource={bookings}
          rowKey="MaPhien"
          size="small"
          loading={loading}
          onRow={(r) => ({
            onClick: () => handlePickSession(r),
            style: { cursor: 'pointer', background: selectedSession?.MaPhien === r.MaPhien ? '#e6f7ff' : '' }
          })}
          columns={[{ title: 'Thú cưng', dataIndex: 'TenThuCung' }]}
        />
      </Card>

      {/* BÊN PHẢI: CHI TIẾT TIÊM */}
      <Card title={selectedSession ? `Đang tiêm: ${selectedSession.TenThuCung}` : "Chưa chọn ca"} style={{ flex: 1 }}>
        {selectedSession ? (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            
            <Text strong>1. Chọn Vaccine:</Text>
            <Select 
              showSearch 
              style={{ width: '100%' }} 
              placeholder="Chọn loại vaccine..."
              onChange={(val) => {
                if (selectedList.find(x => x.MaVC === val)) return;
                const vc = vaccines.find(v => v.MaVC === val);
                if (vc) setSelectedList([...selectedList, { ...vc, dosage: 1 }]);
              }}
              value={null}
            >
              {vaccines.map(v => <Select.Option key={v.MaVC} value={v.MaVC}>{v.TenVC}</Select.Option>)}
            </Select>

            <div style={{ marginTop: 10 }}>
                <Text strong>2. Danh sách tiêm thực tế:</Text>
                {selectedList.map((item, index) => (
                    <div key={item.MaVC} style={{ border: '1px solid #eee', padding: '10px 15px', marginTop: 8, borderRadius: 8, background: '#fafafa' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong>{index + 1}. {item.TenVC}</Text>
                            <Button type="link" danger size="small" onClick={() => setSelectedList(selectedList.filter(x => x.MaVC !== item.MaVC))}>Xóa</Button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                            <Text>Số lượng liều:</Text>
                            <InputNumber 
                              min={0.1} 
                              step={1}
                              value={item.dosage} 
                              onChange={(v) => {
                                const newList = [...selectedList];
                                newList[index].dosage = v;
                                setSelectedList(newList);
                            }} />
                        </div>
                    </div>
                ))}
            </div>

            <Button 
                type="primary" 
                block 
                size="large" 
                icon={<SaveOutlined />} 
                onClick={handleSaveVaccine} 
                loading={loading}
                disabled={selectedList.length === 0}
                style={{ marginTop: 20, height: '50px' }}
            >
              HOÀN THÀNH & LƯU HỒ SƠ TIÊM
            </Button>
          </Space>
        ) : <div style={{ textAlign: 'center', padding: 80, color: '#999' }}>Chọn một thú cưng từ hàng đợi để thực hiện tiêm phòng</div>}
      </Card>
    </div>
  )
}

/* ===================== COMPONENT 5: NHẬT KÝ TỔNG HỢP ===================== */
import { Row, Col, DatePicker, Tooltip } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'

function DailyHistoryTab({ maCN }: { maCN: string }) {
  const [date, setDate] = React.useState<any>(dayjs());
  const [data, setData] = React.useState<{ kham: any[], tiem: any[] }>({ kham: [], tiem: [] });
  const [loading, setLoading] = React.useState(false);

  const fetchDailyData = async (selectedDate: any) => {
    if (!maCN) return;
    setLoading(true);
    try {
      const res = await api.get('/staff/history/daily-all', { 
        params: { ma_cn: maCN, date: selectedDate.format('YYYY-MM-DD') } 
      });
      setData({
        kham: res.data.kham_list || [],
        tiem: res.data.tiem_list || []
      });
    } catch (e) {
      message.error("Lỗi tải nhật ký");
    } finally { setLoading(false); }
  };

  React.useEffect(() => {
    fetchDailyData(date);
  }, [maCN, date]);

  const renderPetDetail = (record: any) => (
    <div style={{ padding: '12px', background: '#f9f9f9', borderRadius: '8px', borderLeft: '4px solid #1890ff' }}>
      <Row gutter={16}>
        <Col span={12}>
          <Text strong style={{ color: '#096dd9', display: 'block', marginBottom: 8 }}>THÔNG TIN THÚ CƯNG</Text>
          <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
            <li><b>Loại:</b> {record.Loai || '---'}</li>
            <li><b>Giống:</b> {record.Giong || '---'}</li>
            <li><b>Giới tính:</b> {record.GioiTinh || '---'}</li>
            <li><b>Ngày sinh:</b> {record.NgaySinh ? dayjs(record.NgaySinh).format('DD/MM/YYYY') : '---'}</li>
          </ul>
        </Col>
        <Col span={12}>
          <Text strong style={{ color: '#096dd9', display: 'block', marginBottom: 8 }}>CHI TIẾT PHIÊN LÀM VIỆC</Text>
          <p style={{ margin: 0 }}><b>Mã phiên:</b> <Text code>{record.MaPhien}</Text></p>
          {record.TenVC ? (
            <p style={{ margin: 0 }}><b>Vaccine:</b> <Tag color="green">{record.TenVC}</Tag> (Liều: {record.SoLieu})</p>
          ) : (
            <>
              <p style={{ margin: 0 }}><b>Triệu chứng:</b> {record.TrieuChung || 'Không ghi nhận'}</p>
              <p style={{ margin: 0 }}><b>Đơn thuốc:</b> {record.ThuocDaKe || 'Không kê đơn'}</p>
            </>
          )}
        </Col>
      </Row>
    </div>
  );

  return (
    <div style={{ marginTop: 10 }}>
      {/* Thanh công cụ chọn ngày */}
      <div style={{ marginBottom: 20, background: '#fff', padding: '15px', borderRadius: '8px', border: '1px solid #f0f0f0' }}>
        <Space size="large">
          <div>
            <Text strong style={{ marginRight: 10 }}>Xem nhật ký ngày:</Text>
            <DatePicker 
              value={date} 
              onChange={(d) => setDate(d)} 
              allowClear={false} 
              format="DD/MM/YYYY"
            />
          </div>
          <Button icon={<ReloadOutlined />} onClick={() => fetchDailyData(date)}>Làm mới dữ liệu</Button>
        </Space>
      </div>

      <Row gutter={20}>
        {/* CỘT 1: LỊCH SỬ KHÁM BỆNH */}
        <Col span={12}>
          <Card 
            title={<Space><span style={{ fontSize: '16px' }}></span><Text strong style={{ color: '#1890ff' }}>DANH SÁCH KHÁM BỆNH</Text></Space>} 
            size="small" 
          >
            <Table
              dataSource={data.kham}
              rowKey="MaPhien"
              size="small"
              loading={loading}
              pagination={{ pageSize: 8 }}
              expandable={{ expandedRowRender: renderPetDetail }}
              columns={[
                { title: 'Thú cưng', dataIndex: 'TenThuCung', key: 'pet', width: 120, render: (text) => <Text strong>{text}</Text> },
                { title: 'Chẩn đoán', dataIndex: 'ChanDoan', key: 'cd', ellipsis: true },
                { 
                  title: 'Giờ xong', 
                  dataIndex: 'ThoiDiemKetThuc', 
                  width: 80,
                  render: (t) => t ? dayjs(t).format('HH:mm') : '---' 
                }
              ]}
            />
          </Card>
        </Col>

        {/* CỘT 2: LỊCH SỬ TIÊM PHÒNG */}
        <Col span={12}>
          <Card 
            title={<Space><span style={{ fontSize: '16px' }}></span><Text strong style={{ color: '#52c41a' }}>💉 DANH SÁCH TIÊM PHÒNG</Text></Space>} 
            size="small"
          >
            <Table
              dataSource={data.tiem}
              rowKey={(r) => `${r.MaPhien}-${r.TenVC}`}
              size="small"
              loading={loading}
              pagination={{ pageSize: 8 }}
              expandable={{ expandedRowRender: renderPetDetail }}
              columns={[
                { title: 'Thú cưng', dataIndex: 'TenThuCung', key: 'pet', width: 120, render: (text) => <Text strong>{text}</Text> },
                { title: 'Loại Vaccine', dataIndex: 'TenVC', key: 'vc' },
                { 
                  title: 'Liều', 
                  dataIndex: 'SoLieu', 
                  width: 60,
                  render: (v) => <Tag color="green">{v}</Tag>
                },
                { 
                  title: 'Giờ xong', 
                  dataIndex: 'ThoiDiemKetThuc', 
                  width: 80,
                  render: (t) => t ? dayjs(t).format('HH:mm') : '---' 
                }
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

/* ===================== TRANG CHÍNH  ===================== */
export default function VeterinarianPage() {
  const router = useRouter()
  const { maNV, maCN } = router.query
  const [medicinesList, setMedicinesList] = React.useState<Medicine[]>([])

  if (!router.isReady || !maCN) return <div style={{ textAlign: 'center', padding: '100px' }}><Spin size="large" /></div>

  return (
    <div style={{ padding: '24px', background: '#f0f2f5', minHeight: '100vh' }}>
      <Card 
        title={<Space><Title level={4} style={{ margin: 0 }}>PETCAREX CLINIC - HỆ THỐNG ĐIỀU TRỊ</Title></Space>}
        extra={<Button danger onClick={() => { clearToken(); router.replace('/'); }}>Đăng xuất</Button>}
      >
        <div style={{ marginBottom: 16 }}>
          <Tag color="cyan">Chi nhánh: {maCN}</Tag> 
          <Tag color="gold">Bác sĩ/KTV: {maNV}</Tag>
        </div>

        <Tabs type="card" defaultActiveKey="1">
          {/* TAB 1: KHÁM BỆNH */}
          <Tabs.TabPane tab="Danh sách khám" key="1">
            <ExaminationTab maCN={maCN as string} maNV={maNV as string} />
          </Tabs.TabPane>

          {/* TAB 2: TIÊM PHÒNG (MỚI) */}
          <Tabs.TabPane tab="Danh sách tiêm phòng" key="2">
            <VaccinationTab maCN={maCN as string} maNV={maNV as string} />
          </Tabs.TabPane>

          {/* TAB 3: THUỐC */}
          <Tabs.TabPane tab="Danh mục dược phẩm" key="3">
            <MedicinesTab maCN={maCN as string} setMedicinesList={setMedicinesList} />
          </Tabs.TabPane>

          {/* TAB 4: HỒ SƠ */}
          <Tabs.TabPane tab="Hồ sơ thú cưng" key="4">
            <MedicalRecordsTab />
          </Tabs.TabPane>

          <Tabs.TabPane tab={<span><HistoryOutlined /> Nhật ký ca làm</span>} key="5">
            <DailyHistoryTab maCN={maCN as string} />
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </div>
  )
}