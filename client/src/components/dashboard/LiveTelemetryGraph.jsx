import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import useStore from '../../store/useStore';
import { format } from 'date-fns';

const SENSOR_COLORS = {
  temperature: '#f43f5e', // rose
  humidity: '#0ea5e9',    // sky
  light: '#f59e0b',       // amber
  sound: '#6366f1'        // indigo
};

export default function LiveTelemetryGraph() {
  const { sensorHistory } = useStore();
  
  const sensorKeys = Object.keys(sensorHistory || {});
  
  // Combine all sensor histories into a single timeline array for recharts
  const refSensor = sensorKeys[0];
  const historyData = refSensor && sensorHistory ? sensorHistory[refSensor] : [];
  
  // Downsample or take last 60 points
  const displayData = historyData.slice(-60).map((item, index) => {
    const pt = { timestamp: format(new Date(item.timestamp), 'HH:mm:ss') };
    sensorKeys.forEach(key => {
      // Find matching index relative to the sliced array. Since sensor histories are synced, this is safe.
      const originalIndex = historyData.length - 60 + index;
      if (originalIndex >= 0 && sensorHistory[key][originalIndex]) {
        pt[key] = sensorHistory[key][originalIndex].value;
      } else if (sensorHistory[key][index]) {
        pt[key] = sensorHistory[key][index].value;
      }
    });
    return pt;
  });

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl p-6 w-full h-[380px] flex flex-col">
      <h2 className="text-slate-800 font-extrabold text-xl mb-4 border-b border-slate-200/60 pb-3">Live Telemetry</h2>
      <div className="flex-1 w-full relative">
        {displayData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={displayData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {sensorKeys.map((key) => (
                  <linearGradient key={`grad-${key}`} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={SENSOR_COLORS[key] || '#94a3b8'} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={SENSOR_COLORS[key] || '#94a3b8'} stopOpacity={0}/>
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={10} tickMargin={8} minTickGap={20} />
              <YAxis stroke="#94a3b8" fontSize={10} tickMargin={4} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '12px' }}
                itemStyle={{ color: '#334155' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {sensorKeys.map((key) => (
                <Area 
                  key={key}
                  type="monotone" 
                  name={key.charAt(0).toUpperCase() + key.slice(1)}
                  dataKey={key} 
                  stroke={SENSOR_COLORS[key] || '#94a3b8'} 
                  strokeWidth={2} 
                  fill={`url(#color-${key})`} 
                  isAnimationActive={false} 
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex bg-slate-50 border border-slate-100 rounded-xl h-full items-center justify-center text-slate-400 font-medium text-sm">
            Awaiting telemetry data...
          </div>
        )}
      </div>
    </div>
  );
}
