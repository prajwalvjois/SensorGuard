import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Activity, AlertTriangle, Cpu, Clock, CheckCircle, Zap, ChevronDown, Thermometer, Repeat, Droplets, Sun, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import useStore from '../store/useStore';
import { triggerAttack } from '../hooks/useSocket';
import SensorCard from '../components/dashboard/SensorCard';
import AnomalyGauge from '../components/dashboard/AnomalyGauge';
import AttackLog from '../components/dashboard/AttackLog';
import LiveTelemetryGraph from '../components/dashboard/LiveTelemetryGraph';

// Top-level metric card
function MetricCard({ icon: Icon, label, value, sub, color = '#00e5ff', trend }) {
  // Use a softer blue for light theme instead of neon cyan
  const displayColor = color === '#00e5ff' ? '#0ea5e9' : color;
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg"
          style={{ background: `${displayColor}12`, border: `1px solid ${displayColor}22` }}
        >
          <Icon size={15} color={displayColor} strokeWidth={1.5} />
        </div>
        {trend !== undefined && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded shadow-sm"
            style={{
              background: trend > 0 ? '#fee2e2' : '#dcfce7',
              color: trend > 0 ? '#ef4444' : '#22c55e',
            }}
          >
            {trend > 0 ? '+' : ''}{trend}
          </span>
        )}
      </div>
      <p className="text-4xl lg:text-5xl font-black tracking-tight mb-1" style={{ color: displayColor }}>
        {value}
      </p>
      <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">{label}</p>
      {sub && <p className="text-xs text-slate-400 mt-1 font-medium tracking-wide">{sub}</p>}
    </div>
  );
}

// Active attack banner
function AttackBanner({ attack }) {
  if (!attack) return null;
  const label = attack.type.replace(/_/g, ' ');
  return (
    <motion.div
      className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 bg-rose-50 border border-rose-200 shadow-sm"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
    >
      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)] flex-shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-bold text-rose-600">
          {label}
        </span>
        <span className="text-xs text-rose-500 ml-2">
          {attack.sensor ? `on ${attack.sensor} sensor` : 'via MQTT channel'} — cross-correlation analysis running...
        </span>
      </div>
      <span className="font-mono text-xs text-rose-400 font-semibold">
        tick {attack.elapsed}/{attack.duration}
      </span>
    </motion.div>
  );
}

export default function Dashboard() {
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);

  const {
    latestReading,
    sensorHistory,
    anomalyScore,
    activeAttack,
    zScores,
    hmacStatus,
    alerts,
    stats,
    isConnected,
    tickCount,
  } = useStore();

  const sensors = latestReading?.sensors || {};
  const analysis = latestReading?.analysis || {};

  // Determine which sensor is being spoofed
  const spoofedSensor = activeAttack?.sensor || null;

  const lastUpdate = latestReading
    ? formatDistanceToNow(latestReading.timestamp, { addSuffix: true })
    : 'Waiting...';

  // System health: ok / degraded / critical
  const systemHealth = anomalyScore > 70 ? 'CRITICAL' : anomalyScore > 40 ? 'DEGRADED' : 'OPERATIONAL';
  const healthColor  = anomalyScore > 70 ? '#f43f5e' : anomalyScore > 40 ? '#f59e0b' : '#10b981';

  return (
    <div className="space-y-4 pb-8">
      {/* ── Header Row ─────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 font-medium">Live operational telemetry and threat heuristics</p>
        </div>
        <div className="relative mt-4 md:mt-0 w-full md:w-auto">
          <button 
            onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg shadow-md hover:shadow-lg transition-all font-semibold text-sm w-full md:w-auto"
          >
            <Zap size={16} className="fill-current text-indigo-200" />
            Run Demo Attack
            <ChevronDown size={16} className={`ml-1 opacity-80 transition-transform ${isDemoMenuOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDemoMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white/90 backdrop-blur-xl border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50">
              <ul className="flex flex-col">
                <li 
                  onClick={() => { triggerAttack('TEMPERATURE_SPOOF'); setIsDemoMenuOpen(false); }}
                  className="flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium text-sm p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                >
                  <Thermometer size={16} className="text-orange-500" />
                  Temp Spoof
                </li>
                <li 
                  onClick={() => { triggerAttack('HUMIDITY_SPOOF'); setIsDemoMenuOpen(false); }}
                  className="flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium text-sm p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                >
                  <Droplets size={16} className="text-blue-500" />
                  Humid Spoof
                </li>
                <li 
                  onClick={() => { triggerAttack('LIGHT_SPOOF'); setIsDemoMenuOpen(false); }}
                  className="flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium text-sm p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                >
                  <Sun size={16} className="text-amber-500" />
                  Light Spoof
                </li>
                <li 
                  onClick={() => { triggerAttack('REPLAY_ATTACK'); setIsDemoMenuOpen(false); }}
                  className="flex items-center gap-2 hover:bg-slate-50 text-slate-700 font-medium text-sm p-3 border-b border-slate-100 last:border-0 cursor-pointer transition-colors"
                >
                  <RefreshCw size={16} className="text-rose-500" />
                  Replay Attack
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Attack banner */}
      {activeAttack && <AttackBanner attack={activeAttack} />}

      {/* ── Row 1: Live Telemetry & Threat Level ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1">
          <AnomalyGauge score={anomalyScore} zScores={zScores} />
        </div>
        
        <div className="lg:col-span-3">
          <LiveTelemetryGraph />
        </div>
      </div>

      {/* ── Row 2: Sensor cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {['temperature', 'humidity', 'light', 'sound'].map((sensor) => (
          <SensorCard
            key={sensor}
            sensor={sensor}
            data={sensorHistory[sensor] || []}
            currentValue={sensors[sensor]?.value}
            zScore={zScores[sensor] || 0}
            isAnomaly={analysis.isAnomaly?.[sensor] || false}
            hmacStatus={hmacStatus}
            isSpoofed={spoofedSensor === sensor}
          />
        ))}
      </div>

      {/* ── Row 3: Logs & Metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3">
          <AttackLog />
        </div>
        
        <div className="lg:col-span-1 flex flex-col justify-end gap-6 h-full">
          <MetricCard
            icon={Shield}
            label="HMAC Status"
            value={hmacStatus}
            color={hmacStatus === 'REPLAYED' ? '#f43f5e' : '#10b981'}
            sub="SHA-256 packet signing"
          />
          <MetricCard
            icon={Cpu}
            label="Sensor Ticks"
            value={tickCount.toLocaleString()}
            color="#6366f1"
            sub={isConnected ? `Updated ${lastUpdate}` : 'Connecting...'}
          />
        </div>
      </div>

      {/* ── System info footer ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 rounded-xl text-xs font-mono text-slate-500 bg-white border border-slate-200 mt-6 shadow-sm">
        <span>SESSION · {latestReading?.sessionId?.slice(0, 8) || '--------'}</span>
        <span>MODE · SIMULATION</span>
        <span>PROTOCOL · MQTT + HMAC-SHA256</span>
        <span>WINDOW · 60 readings</span>
        <span>THRESHOLD · 2.5σ</span>
        <span className="ml-auto flex items-center gap-1.5 p-1 px-3 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-widest text-[10px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]" />
          REAL-TIME ACTIVE
        </span>
      </div>
    </div>
  );
}
