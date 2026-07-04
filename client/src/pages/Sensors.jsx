import { motion } from 'framer-motion';
import { Thermometer, Droplets, Sun, Volume2, Wifi, Cpu, Shield, Activity } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import { format } from 'date-fns';
import useStore from '../store/useStore';

const META = {
  temperature: { icon: Thermometer, label: 'Temperature', unit: '°C',  color: '#ff6b35', model: 'DHT22',       pin: 'GPIO4',  range: '-40–80°C',    accuracy: '±0.5°C' },
  humidity:    { icon: Droplets,    label: 'Humidity',    unit: '%',    color: '#22d9f5', model: 'DHT22',       pin: 'GPIO4',  range: '0–100%',      accuracy: '±2%'    },
  light:       { icon: Sun,         label: 'Light',       unit: 'lux',  color: '#ffd60a', model: 'LDR GL5516', pin: 'ADC1',   range: '0–2000 lux',  accuracy: '±5%'    },
  sound:       { icon: Volume2,     label: 'Sound',       unit: 'dB',   color: '#bf5af2', model: 'KY-038',     pin: 'GPIO34', range: '40–130 dB',   accuracy: '±3 dB'  },
};

const CustomTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return <div className="px-2 py-1 rounded text-xs font-mono bg-white shadow-md border border-slate-200 text-slate-800">{payload[0]?.value?.toFixed(2)}</div>;
};

function SensorCard({ sensor }) {
  const m = META[sensor];
  const I = m.icon;
  const { latestReading, sensorHistory, zScores, hmacStatus } = useStore();
  const value   = latestReading?.sensors?.[sensor]?.value;
  const isSpoofed = latestReading?.attackState?.sensor === sensor;
  const isAnom  = latestReading?.analysis?.isAnomaly?.[sensor];
  const z       = zScores[sensor] || 0;
  const hist    = (sensorHistory[sensor] || []).slice(-80);
  const statusC = isSpoofed ? 'text-rose-700' : isAnom ? 'text-amber-700' : 'text-emerald-700';
  const statusBg = isSpoofed ? 'bg-rose-100' : isAnom ? 'bg-amber-100' : 'bg-emerald-100';
  const statusBorder = isSpoofed ? 'border-rose-200' : isAnom ? 'border-amber-200' : 'border-emerald-200';
  const statusL = isSpoofed ? 'SPOOFING' : isAnom ? 'ANOMALY' : 'NOMINAL';

  return (
    <motion.div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden"
      animate={isSpoofed ? { borderColor:['rgba(255,255,255,0.8)','rgba(244,63,94,0.4)','rgba(255,255,255,0.8)'] } : {}}
      transition={isSpoofed ? { duration:1.5, repeat:Infinity } : {}}
      style={isSpoofed ? { boxShadow:'0 0 24px rgba(244,63,94,0.15)' } : {}}>
      <div className="h-1 shadow-sm" style={{ background:`linear-gradient(90deg,transparent,${m.color},transparent)` }}/>
      <div className="p-6">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-100">
              <I size={18} color={m.color} strokeWidth={2}/>
            </div>
            <div>
              <p className="font-extrabold text-slate-800 text-base">{m.label}</p>
              <p className="text-xs text-slate-500 font-mono font-semibold">{m.model} · {m.pin}</p>
            </div>
          </div>
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold border shadow-sm ${statusC} ${statusBg} ${statusBorder}`}>
            <span className={`w-1.5 h-1.5 rounded-full bg-current opacity-80`} />
            {statusL}
          </div>
        </div>
        <div className="flex items-end gap-3 mb-5 border-b border-slate-200/60 pb-5">
          <span className="font-black leading-none tracking-tight" style={{ fontSize:48, color:m.color }}>
            {value != null ? value.toFixed(sensor==='light'?0:1) : '—'}
          </span>
          <span className="text-sm font-bold text-slate-400 mb-2 font-mono">{m.unit}</span>
          <div className="ml-auto text-right mb-1">
            <p className="text-xs text-slate-400 font-bold font-mono">Z-SCORE</p>
            <p className="text-sm font-black font-mono mt-0.5" style={{ color:z>2.5?'#f59e0b':'#4f46e5' }}>{z.toFixed(3)}σ</p>
          </div>
        </div>
        <div className="h-24 -mx-1 mb-5">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hist.map((p,i)=>({i,value:p.value}))} margin={{ top:2, bottom:2, left:0, right:0 }}>
              <defs>
                <linearGradient id={`g-${sensor}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={m.color} stopOpacity={0.25}/>
                  <stop offset="100%" stopColor={m.color} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area type="monotone" dataKey="value" stroke={m.color} strokeWidth={2} fill={`url(#g-${sensor})`} dot={false} isAnimationActive={false}/>
              <Tooltip content={<CustomTip/>}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs font-mono mb-4">
          {[['RANGE',m.range],['ACCURACY',m.accuracy],['MODEL',m.model],['PIN',m.pin]].map(([k,v])=>(
            <div key={k} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
              <span className="text-slate-400 font-bold tracking-wider mb-1 uppercase">{k}</span>
              <span className="text-slate-800 font-bold">{v}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-200/60">
          <div className="flex items-center gap-2 text-xs font-mono font-bold">
            <Shield size={14} className={hmacStatus==='REPLAYED'?'text-rose-500':'text-emerald-500'}/>
            <span className={hmacStatus==='REPLAYED'?'text-rose-600':'text-emerald-600'}>HMAC {hmacStatus}</span>
          </div>
          <span className="text-xs text-slate-500 font-bold font-mono">{hist.length} readings</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function Sensors() {
  const { isConnected, latestReading, tickCount } = useStore();
  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Sensor Array & Diagnostics</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">ESP32 sensor array · {isConnected?'Connected · Live':'Awaiting connection'}{latestReading&&` · ${format(latestReading.timestamp,'HH:mm:ss')}`}</p>
        </div>
        <div className="flex items-center gap-2 bg-white/60 border border-slate-200 shadow-sm px-3 py-1.5 rounded-lg">
          <Wifi size={14} className={isConnected? 'text-emerald-500' : 'text-rose-500'}/>
          <span className={`text-xs font-bold font-mono uppercase tracking-wider ${isConnected? 'text-emerald-600' : 'text-rose-600'}`}>{isConnected?'LIVE':'OFFLINE'}</span>
        </div>
      </div>
      <div className="flex items-start gap-3 px-5 py-4 rounded-xl text-sm bg-indigo-50 border border-indigo-100 shadow-sm">
        <Activity size={18} className="text-indigo-600 flex-shrink-0 mt-0.5"/>
        <div>
          <span className="font-bold text-indigo-800">Simulation Mode</span>
          <span className="text-indigo-600/80 font-medium ml-2">Ornstein-Uhlenbeck synthetic data active. When ESP32 arrives, uncomment <code className="font-mono bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded shadow-sm text-xs mx-1">setupMQTT()</code> in <code className="font-mono bg-white border border-indigo-200 text-indigo-700 px-1.5 py-0.5 rounded shadow-sm text-xs mx-1">simulatorService.js</code>.</span>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(META).map(s => <SensorCard key={s} sensor={s}/>)}
      </div>
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl p-6">
        <p className="text-lg font-extrabold text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200/60 pb-3"><Cpu size={18} className="text-indigo-600"/> System Info</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
          {[['Platform','ESP32 DevKit v1'],['Protocol','MQTT+HMAC-SHA256'],['Algorithm','Cross-corr Δz'],['Window','60 readings'],['Tick Rate','2000 ms'],['Threshold','2.5σ'],['Signing','SHA-256 256-bit'],['Total Ticks',tickCount.toLocaleString()]].map(([k,v])=>(
            <div key={k} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
              <p className="text-slate-400 font-bold uppercase tracking-wider mb-1">{k}</p>
              <p className="text-slate-800 font-bold">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
