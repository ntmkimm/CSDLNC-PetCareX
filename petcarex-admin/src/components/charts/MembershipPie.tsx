// src/components/charts/MembershipPie.tsx
import React from 'react'
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, Sector } from 'recharts'

type Data = { name: string; value: number }[]

// Sử dụng bảng màu Ant Design tinh tế hơn cho các hạng hội viên
const COLORS = {
  'VIP': '#fadb14',        // Vàng Gold cho VIP
  'Thân thiết': '#1890ff',  // Xanh dương cho Thân thiết
  'Cơ bản': '#8c8c8c',      // Xám cho Cơ bản
  'Default': '#13c2c2'
}

export default function MembershipPie({ data }: { data: Data }) {
  return (
    <div style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={60} // Tạo hình Donut giúp biểu đồ trông thoáng hơn
            outerRadius={100}
            paddingAngle={5} // Khoảng cách giữa các miếng bánh
            dataKey="value"
            nameKey="name"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={(COLORS as any)[entry.name] || COLORS.Default} 
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            formatter={(v: any) => [Number(v).toLocaleString('vi-VN') + ' khách', 'Số lượng']} 
          />
          <Legend 
            verticalAlign="bottom" 
            align="center"
            iconType="circle"
            formatter={(value) => <span style={{ color: '#595959', fontWeight: 500 }}>{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}