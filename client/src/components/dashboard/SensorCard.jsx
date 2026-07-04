import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { Thermometer, Droplets, Sun, Volume2, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import clsx from 'clsx';

const SENSOR_META = {
  temperature: {
    icon: Thermometer,
    label: 'Temperature',
    unit: '°C',
    color: '#f43f5e',
    colorDim: 'rgba(244,63,94,0.12)',
    normalRange: [20, 35],
  },
  humidity: {
    icon: Droplets,
    label: 'Humidity',
    unit: '%',
    color: '#0ea5e9',
    colorDim: 'rgba(14,165,233,0.12)',
    normalRange: [40, 80],
  },
  light: {
    icon: Sun,
    label: 'Light',
    unit: 'lux',
    color: '#f59e0b',
    colorDim: 'rgba(245,158,11,0.1)',
    normalRange: [200, 1500],
  },
  sound: {
    icon: Volume2,
    label: 'Sound',
    unit: 'dB',
    color: '#6366f1',
    colorDim: 'rgba(99,102,241,0.12)',
    normalRange: [20, 70],
  },
};

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="px-2 py-1 rounded text-2xs font-mono"
      style={{
        background: 'rgba(11,17,32,0.95)',
        border: '1px solid rgba(0,229,255,0.15)',
        color: '#e8eaf6',
      }}
    >
      {payload[0]?.value?.toFixed(2)}
    </div>
  );
};

export default function SensorCard({ sensor, data, currentValue, zScore = 0, isAnomaly = false, hmacStatus = 'VALID', isSpoofed = false }) {
  const meta = SENSOR_META[sensor] || SENSOR_META.temperature;
  const Icon = meta.icon;

  const chartData = useMemo(() =>
    (data || []).slice(-50).map((p, i) => ({
      i,
      value: p.value,
      anomaly: p.isAnomaly,
    })),
  [data]);

  const statusColor = isSpoofed ? '#f43f5e' : isAnomaly ? '#f97316' : meta.color;
  const cardState   = isSpoofed ? 'card-danger' : isAnomaly ? 'card-warn' : '';

  return (
    <motion.div
      className={clsx('card relative overflow-hidden rounded-xl p-4 flex flex-col gap-3', cardState)}
      layout
      animate={isSpoofed ? { borderColor: ['rgba(244,63,94,0.35)', 'rgba(244,63,94,0.7)', 'rgba(244,63,94,0.35)'] } : {}}
      transition={isSpoofed ? { duration: 1.5, repeat: Infinity } : { duration: 0.3 }}
    >
      {/* Top shine gradient */}
      <div
        className="absolute inset-x-0 top-0 h-px opacity-40"
        style={{ background: `linear-gradient(90deg, transparent, ${statusColor}, transparent)` }}
      />

      {/* Spoofing alert overlay */}
      <AnimatePresence>
        {isSpoofed && (
          <motion.div
            className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-md text-2xs font-mono font-bold"
            style={{ background: 'rgba(244,63,94,0.15)', color: '#f43f5e', border: '1px solid rgba(244,63,94,0.3)' }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <ShieldAlert size={9} />
            SPOOF
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-8 h-8 rounded-lg"
            style={{ background: meta.colorDim, border: `1px solid ${meta.color}22` }}
          >
            <Icon size={16} color={meta.color} strokeWidth={2} />
          </div>
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest">{meta.label}</span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1">
          {isSpoofed ? (
            <AlertTriangle size={12} color="#f43f5e" />
          ) : isAnomaly ? (
            <AlertTriangle size={12} color="#f97316" />
          ) : (
            <CheckCircle2 size={12} color="#10b981" opacity={0.7} />
          )}
        </div>
      </div>

      {/* Value */}
      <div className="flex items-end gap-2 my-2">
        <AnimatePresence mode="wait">
          <motion.span
            key={currentValue}
            className="text-4xl lg:text-5xl font-black tracking-tight leading-none"
            style={{ color: statusColor }}
            initial={{ opacity: 0.5, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentValue != null ? currentValue.toFixed(sensor === 'light' ? 0 : 1) : '—'}
          </motion.span>
        </AnimatePresence>
        <span className="text-sm font-bold text-slate-400 mb-1 font-mono uppercase tracking-widest">{meta.unit}</span>
      </div>

      {/* Sparkline */}
      <div className="h-14 -mx-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 2, bottom: 2, left: 0, right: 0 }}>
            <defs>
              <linearGradient id={`grad-${sensor}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity={0.3} />
                <stop offset="100%" stopColor={statusColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone"
              dataKey="value"
              stroke={statusColor}
              strokeWidth={1.5}
              fill={`url(#grad-${sensor})`}
              dot={false}
              isAnimationActive={false}
            />
            <Tooltip content={<CustomTooltip />} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer: z-score + HMAC */}
      <div className="flex items-center justify-between pt-1 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <div className="flex items-center gap-1.5">
          <span className="label-caps">Z-Score</span>
          <span
            className="text-2xs font-mono font-bold"
            style={{ color: zScore > 2.5 ? '#f97316' : 'var(--text-muted)' }}
          >
            {zScore.toFixed(2)}σ
          </span>
        </div>

        <div
          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-2xs font-mono"
          style={{
            background: hmacStatus === 'REPLAYED'
              ? 'rgba(244,63,94,0.1)'
              : 'rgba(16,185,129,0.06)',
            color: hmacStatus === 'REPLAYED' ? '#f43f5e' : 'rgba(16,185,129,0.8)',
          }}
        >
          HMAC: {hmacStatus}
        </div>
      </div>
    </motion.div>
  );
}
