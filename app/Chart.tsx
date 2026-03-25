// @ts-nocheck
'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ComposedChart,
  Legend
} from 'recharts';

export default function Chart({ data }: { data: any }) {
  if (!data || data.length === 0) return <p style={{ color: '#64748b' }}>Brak danych do wyświetlenia.</p>;

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <ResponsiveContainer>
        <ComposedChart
          data={data}
          margin={{
            top: 20,
            right: 20,
            bottom: 20,
            left: 0,
          }}
        >
          {/* Jasnoszara siatka */}
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          
          <XAxis 
            dataKey="time" 
            stroke="#94a3b8" 
            fontSize={12}
            tickMargin={10}
            axisLine={false}
            tickLine={false}
          />
          
          {/* Lewa oś dla Zużycia (kWh) */}
          <YAxis 
            yAxisId="left" 
            stroke="#94a3b8" 
            fontSize={12}
            tickFormatter={(val) => `${val} kWh`}
            axisLine={false}
            tickLine={false}
          />
          
          {/* Prawa oś dla Ceny (PLN) */}
          <YAxis 
            yAxisId="right" 
            orientation="right" 
            stroke="#10b981" 
            fontSize={12}
            tickFormatter={(val) => `${val.toFixed(2)} zł`}
            axisLine={false}
            tickLine={false}
          />

          {/* Jasny Tooltip */}
          <Tooltip 
            contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
            itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
            labelStyle={{ color: '#64748b', marginBottom: '5px' }}
          />

          <Legend verticalAlign="top" height={36} wrapperStyle={{ paddingBottom: '10px' }} />

          {/* Słupki Zużycia (Szaro-niebieskie) */}
          <Bar yAxisId="left" dataKey="kwh" name="Zużycie (kWh)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
          
          {/* Linia Ceny (Zielona Giełda) */}
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="price"
            name="Cena RCE (Giełda)"
            stroke="#10b981"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
          />

          {/* NOWOŚĆ: Linia Ceny G11 (Czerwona przerywana) */}
          <Line
            yAxisId="right"
            type="step"
            dataKey="g11Price"
            name="Twoja Stawka G11"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
