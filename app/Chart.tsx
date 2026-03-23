// @ts-nocheck
"use client";

import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';

export default function Chart({ data }) {
  return (
    <div style={{ height: '450px', width: '100%', color: 'black' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8884d8" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
          <XAxis 
            dataKey="label" 
            stroke="#888" 
            tick={{ fill: '#888', fontSize: 12 }}
            tickMargin={10}
            minTickGap={40}
          />
          <YAxis yAxisId="left" stroke="#888" tick={{ fill: '#888' }} axisLine={false} tickLine={false} />
          <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" tick={{ fill: '#82ca9d' }} axisLine={false} tickLine={false} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', borderColor: '#333', color: '#fff', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
          
          <Area yAxisId="left" type="monotone" dataKey="kwh" stroke="#8884d8" strokeWidth={2} fillOpacity={1} fill="url(#colorKwh)" name="Zużycie (kWh)" />
          <Line yAxisId="right" type="stepAfter" dataKey="price" stroke="#82ca9d" name="Cena (PLN/kWh)" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
