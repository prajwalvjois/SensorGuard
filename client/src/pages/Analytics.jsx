import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell
} from 'recharts';
import { BarChart2, TrendingUp, Clock, Zap, Target } from 'lucide-react';
import { format } from 'date-fns';
import useStore from '../store/useStore';

import CorrelationHeatmap from '../components/dashboard/CorrelationHeatmap';

const SENSOR_COLORS = {
  temperature: '#f43f5e', // rose
  humidity:    '#0ea5e9', // sky
  light:       '#f59e0b', // amber
  sound:       '#6366f1', // indigo
};

const ATTACK_TYPES = [
  { id: 'TEMPERATURE_SPOOF', label: 'Temp Spoof', color: '#f43f5e' }, // rose
  { id: 'HUMIDITY_SPOOF', label: 'Humid Spoof', color: '#0ea5e9' }, // sky
  { id: 'LIGHT_SPOOF', label: 'Light Spoof', color: '#f59e0b' }, // amber
  { id: 'SOUND_SPOOF', label: 'Sound Spoof', color: '#6366f1' }, // indigo
  { id: 'REPLAY_ATTACK', label: 'Replay Attack', color: '#10b981' }, // emerald
];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="px-3 py-2 rounded-lg text-xs font-mono space-y-1 shadow-lg border border-slate-200 bg-white/95 backdrop-blur-md">
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color || p.payload?.color || '#333' }} />
          <span className="text-slate-600 capitalize font-semibold">{p.name}:</span>
          <span style={{ color: p.color || p.payload?.color || '#333' }} className="font-bold">{typeof p.value === 'number' ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const TIME_WINDOWS = [{ label: '1 min', points: 30 }, { label: '5 min', points: 150 }, { label: 'All', points: 300 }];
const axisStyle = { fill: '#64748b', fontSize: 10, fontFamily: 'ui-mono, SFMono-Regular, Menlo, Monaco, Consolas, monospace' };
const gridStyle = { stroke: '#e2e8f0' };

export default function Analytics() {
  const { sensorHistory, alerts, zScores } = useStore();
  const [windowIdx, setWindowIdx] = useState(1);
  const maxPoints = TIME_WINDOWS[windowIdx].points;

  const timeSeries = useMemo(() => {
    const temps = (sensorHistory.temperature || []).slice(-maxPoints);
    const baseOffset = (sensorHistory.temperature || []).length - temps.length;
    return temps.map((pt, i) => ({
      time: format(new Date(pt.timestamp), 'HH:mm:ss'),
      temperature: pt.value,
      humidity: sensorHistory.humidity?.[baseOffset + i]?.value ?? null,
      light:    sensorHistory.light?.[baseOffset + i]?.value    ?? null,
      sound:    sensorHistory.sound?.[baseOffset + i]?.value    ?? null,
      anomaly:  pt.isAnomaly ? 85 : 10,
    }));
  }, [sensorHistory, maxPoints]);

  const alertsByType = useMemo(() => {
    const counts = {};
    for (const a of alerts) counts[a.type] = (counts[a.type] || 0) + 1;
    
    return ATTACK_TYPES.map(type => ({
      name: type.label,
      count: counts[type.id] || 0,
      color: type.color
    }));
  }, [alerts]);

  const alertsBySeverity = useMemo(() =>
    ['critical', 'high', 'medium', 'low'].map(sev => ({
      severity: sev.toUpperCase(),
      count: alerts.filter(a => a.severity === sev).length,
      color: { critical: '#f43f5e', high: '#f97316', medium: '#f59e0b', low: '#10b981' }[sev],
    })), [alerts]);

  const radarData = useMemo(() => [
    { subject: 'Temperature', zScore: Math.abs(zScores?.temperature || 0) },
    { subject: 'Humidity', zScore: Math.abs(zScores?.humidity || 0) },
    { subject: 'Light', zScore: Math.abs(zScores?.light || 0) },
    { subject: 'Sound', zScore: Math.abs(zScores?.sound || 0) },
  ], [zScores]);

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Advanced Analytics & Topology</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Deep-dive technical view of subsystem correlations and attack traces</p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/50 border border-slate-200 shadow-sm">
          {TIME_WINDOWS.map((w, i) => (
            <button key={w.label} onClick={() => setWindowIdx(i)}
              className="px-3 py-1.5 rounded-md text-xs font-bold transition-all"
              style={{ 
                background: windowIdx === i ? '#4f46e5' : 'transparent', 
                color: windowIdx === i ? '#ffffff' : '#64748b', 
                boxShadow: windowIdx === i ? '0 2px 4px rgba(79,70,229,0.2)' : 'none' 
              }}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Row 1: Heatmap & Radar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CorrelationHeatmap />
        
        <div className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200/60 pb-3">
            <Target size={18} className="text-indigo-600" />
            <span className="text-lg font-extrabold text-slate-800">Divergence Radar</span>
            <span className="text-xs font-semibold text-slate-400 ml-2">Absolute Z-Score deviation</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
              <PolarGrid stroke="#e2e8f0" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#94a3b8', fontSize: 10 }} />
              <Tooltip content={<CustomTooltip />} />
              <Radar name="Z-Score" dataKey="zScore" stroke="#6366f1" strokeWidth={2} fill="rgba(99, 102, 241, 0.2)" fillOpacity={1} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 2: Multi-sensor overlay */}
      <div className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-6 border-b border-slate-200/60 pb-3">
          <TrendingUp size={18} className="text-indigo-600" />
          <span className="text-lg font-extrabold text-slate-800">Multi-Sensor Time Series</span>
          <span className="text-xs font-semibold text-slate-400 ml-2">Divergence = spoofing event</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeSeries} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
            <CartesianGrid {...gridStyle} vertical={false} />
            <XAxis dataKey="time" tick={axisStyle} tickLine={false} axisLine={false} interval="preserveStartEnd" />
            <YAxis tick={axisStyle} tickLine={false} axisLine={false} width={40} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12, fontWeight: 600, color: '#475569', paddingTop: '10px' }} />
            {Object.entries(SENSOR_COLORS).map(([sensor, color]) => (
              <Line key={sensor} type="monotone" dataKey={sensor} stroke={color} strokeWidth={2} dot={false} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Row 3: Attacks by Type & Threat Breakdown/Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Column 1: Attacks by Type */}
        <div className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200/60 pb-3">
            <Zap size={18} className="text-rose-500" />
            <span className="text-lg font-extrabold text-slate-800">Attacks by Type</span>
          </div>
          {alertsByType.every(a => a.count === 0)
            ? <div className="flex-1 flex items-center justify-center text-slate-400 text-sm font-medium">No events yet</div>
            : <ResponsiveContainer width="100%" height="100%" minHeight={300}>
                <BarChart data={alertsByType} margin={{ top: 20, right: 8, bottom: 4, left: -20 }}>
                  <CartesianGrid {...gridStyle} vertical={false} />
                  <XAxis dataKey="name" tick={{ ...axisStyle, fontSize: 10, fontWeight: 600 }} tickLine={false} axisLine={false} interval={0} />
                  <YAxis tick={axisStyle} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: 'rgba(0,0,0,0.05)' }} content={<CustomTooltip />} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {alertsByType.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
          }
        </div>

        {/* Column 2: Threat Breakdown & Detection Timeline */}
        <div className="flex flex-col gap-8">
          
          <div className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200/60 pb-3">
              <BarChart2 size={18} className="text-indigo-500" />
              <span className="text-lg font-extrabold text-slate-800">Threat Level Breakdown</span>
            </div>
            <div className="space-y-4">
              {alertsBySeverity.map(({ severity, count, color }) => {
                const pct = Math.round((count / (alerts.length || 1)) * 100);
                return (
                  <div key={severity}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold" style={{ color }}>{severity}</span>
                      <span className="text-xs font-bold text-slate-500">{count} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200 shadow-inner">
                      <motion.div className="h-full rounded-full" style={{ background: color }}
                        initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white/60 backdrop-blur-xl border border-slate-200 shadow-lg shadow-slate-200/50 rounded-2xl p-6 flex-1">
            <div className="flex items-center gap-2 mb-6 border-b border-slate-200/60 pb-3">
              <Clock size={18} className="text-amber-500" />
              <span className="text-lg font-extrabold text-slate-800">Detection Timeline</span>
            </div>
            <ResponsiveContainer width="100%" height={140}>
              <AreaChart data={timeSeries} margin={{ top: 5, right: 0, bottom: 0, left: -26 }}>
                <defs>
                  <linearGradient id="anomaly-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="time" tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ ...axisStyle, fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} width={40} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={50} stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" opacity={0.5} />
                <Area type="step" dataKey="anomaly" stroke="#f43f5e" strokeWidth={2} fill="url(#anomaly-fill)" dot={false} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

        </div>
      </div>
    </div>
  );
}
