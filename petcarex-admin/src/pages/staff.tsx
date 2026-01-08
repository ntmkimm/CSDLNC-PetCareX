import React from 'react'
import { useRouter } from 'next/router'
import { Spin } from 'antd'
import { getAuth } from '../lib/auth'

export default function StaffEntryPage() {
  const router = useRouter()

  React.useEffect(() => {
    const auth = getAuth()
    
    // 1. Kiểm tra đăng nhập
    if (!auth.token || auth.isExpired) {
      router.replace('/')
      return
    }

    const role = auth.payload?.role
    const maNV = auth.payload?.sub // Thường sub là mã nhân viên
    const maCN = auth.payload?.maCN // Lấy mã chi nhánh từ token

    // 2. Tạo object params để đính vào URL
    const query = { maNV, maCN }

    // 3. Điều hướng kèm theo dữ liệu trên URL
    if (role === 'sales_staff') {
      router.replace({ pathname: '/staff/sales', query })
    } 
    else if (role === 'receptionist_staff') {
      router.replace({ pathname: '/staff/reception', query })
    } 
    else if (role === 'veterinarian_staff') {
      router.replace({ pathname: '/staff/vet', query })
    } 
    else if (role === 'branch_manager') {
      // Manager có quyền vào tất cả, nhưng mặc định đẩy vào sales
      // Có thể thêm flag isManager=true để các trang con biết mà hiển thị thêm tính năng
      router.replace({ pathname: '/staff/sales', query: { ...query, isManager: true } })
    } 
    else {
      router.replace('/')
    }
  }, [])

  return (
    <div style={{ textAlign: 'center', padding: 100 }}>
      <Spin size="large" tip="Đang chuyển hướng đến bộ phận chuyên môn..." />
    </div>
  )
}