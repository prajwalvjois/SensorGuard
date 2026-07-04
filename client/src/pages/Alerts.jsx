import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCheck, Search, ShieldAlert, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import useStore from '../store/useStore';
import { alertsAPI } from '../utils/api';

const SEV = {
  critical: { color: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  high:     { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  medium:   { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  low:      { color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
};
const TYPE_LABEL = { SENSOR_SPOOF:'Sensor Spoof', REPLAY_ATTACK:'Replay Attack', DATA_INJECTION:'Data Inject', THRESHOLD_BREACH:'Threshold', SYSTEM:'System' };

function AlertRow({ alert, onAck }) {
  const [exp, setExp] = useState(false);
  const s = SEV[alert.severity] || SEV.low;
  return (
    <motion.div className={`rounded-xl overflow-hidden shadow-sm ${s.bg} border ${s.border}`}
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} layout>
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-white/40 transition-colors" onClick={() => setExp(!exp)}>
        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold flex-shrink-0 mt-0.5 bg-white shadow-sm border ${s.border} ${s.color}`}>!</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded bg-white shadow-sm border ${s.border} ${s.color}`}>
              {alert.severity?.toUpperCase()}
            </span>
            <span className="text-xs font-mono text-slate-500 bg-slate-200/50 px-1.5 py-0.5 rounded border border-slate-200">
              {TYPE_LABEL[alert.type] || alert.type}
            </span>
            {alert.sensor && <span className="text-xs text-slate-500 font-mono font-semibold">· {alert.sensor}</span>}
            {alert.isAcknowledged && <span className="text-xs text-emerald-600 font-mono font-bold flex items-center gap-1"><CheckCheck size={12}/>ACK</span>}
          </div>
          <p className="text-sm font-bold text-slate-800 mt-1.5 leading-snug">{alert.title}</p>
          <p className="text-xs text-slate-600 mt-0.5 font-mono line-clamp-1">{alert.description}</p>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className="text-xs text-slate-500 font-mono font-semibold">{alert.createdAt ? format(new Date(alert.createdAt),'HH:mm:ss') : ''}</span>
          {alert.anomalyScore != null && <span className={`text-xs font-mono font-bold ${s.color}`}>{alert.anomalyScore.toFixed(0)}/100</span>}
          <span className="text-slate-400 mt-1">{exp ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</span>
        </div>
      </div>
      <AnimatePresence>
        {exp && (
          <motion.div className="px-4 pb-4" initial={{ height:0, opacity:0 }} animate={{ height:'auto', opacity:1 }} exit={{ height:0, opacity:0 }} transition={{ duration: 0.2 }}>
            <div className="p-4 rounded-xl font-mono text-xs space-y-3 bg-white/60 border border-white shadow-sm">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-1">SENSOR</span><span className={`font-bold ${s.color}`}>{alert.sensor||'—'}</span></div>
                <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-1">HMAC</span><span className={`font-bold ${alert.attackVector?.hmacStatus==='REPLAYED'?'text-rose-600':'text-emerald-600'}`}>{alert.attackVector?.hmacStatus||'VALID'}</span></div>
                <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-1">Z-SCORE</span><span className="text-slate-700 font-bold">{alert.attackVector?.deviationZScore?.toFixed(3)??'—'}σ</span></div>
                <div className="flex flex-col"><span className="text-slate-500 font-semibold mb-1">CONFID</span><span className="text-slate-700 font-bold">{alert.attackVector?.confidence?.toFixed(1)??'—'}%</span></div>
              </div>
              <div className="pt-3 border-t border-slate-200/60 flex flex-col">
                <span className="text-slate-500 font-semibold mb-1">DESCRIPTION</span><span className="text-slate-700 leading-relaxed max-w-3xl">{alert.description}</span>
              </div>
              <div className="text-slate-400 font-sans italic pt-1">{alert.createdAt ? formatDistanceToNow(new Date(alert.createdAt),{addSuffix:true}) : ''}</div>
              {!alert.isAcknowledged && (
                <div className="pt-2 flex justify-end">
                  <button className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors border border-indigo-200" onClick={e => { e.stopPropagation(); onAck(alert._id); }}>
                    <CheckCheck size={14}/>Acknowledge
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Alerts() {
  const { alerts, stats } = useStore();
  const [sev,  setSev]   = useState('all');
  const [type, setType]  = useState('all');
  const [q,    setQ]     = useState('');

  const filtered = useMemo(() => alerts.filter(a => {
    if (sev  !== 'all' && a.severity !== sev)  return false;
    if (type !== 'all' && a.type     !== type) return false;
    if (q && !`${a.title} ${a.description} ${a.sensor}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }), [alerts, sev, type, q]);

  const handleAck = async (id) => {
    try { await alertsAPI.acknowledge(id); } catch {}
    useStore.setState(s => ({ alerts: s.alerts.map(a => a._id === id ? { ...a, isAcknowledged: true } : a) }));
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Alert Log</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Review and acknowledge incoming threat detections</p>
        </div>
        <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-lg">
          <RefreshCw size={14} className="text-indigo-600" style={{ animation:'spin 3s linear infinite' }}/>
          <span className="text-xs text-indigo-700 font-bold font-mono uppercase tracking-wider">Live Feed</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['critical','high','medium','low'].map(s => {
          const st = SEV[s];
          const isSelected = sev === s;
          return (
            <div key={s} className={`rounded-xl p-4 cursor-pointer transition-all shadow-sm border ${isSelected ? st.border : 'border-white/80'} ${isSelected ? st.bg : 'bg-white/60 backdrop-blur-xl'} hover:shadow-md`}
              onClick={() => setSev(sev===s?'all':s)}>
              <p className={`text-3xl font-black ${isSelected ? st.color : 'text-slate-700'}`}>{stats[s]||0}</p>
              <p className={`text-xs font-bold mt-1 tracking-wider ${isSelected ? st.color : 'text-slate-500'}`}>{s.toUpperCase()}</p>
            </div>
          );
        })}
      </div>

      {/* Glass Container for Filter & List */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl p-6 space-y-4">
        {/* Filter bar */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input className="w-full bg-white/50 border border-slate-300 text-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder-slate-400" placeholder="Search alerts..." value={q} onChange={e=>setQ(e.target.value)}/>
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            {['all','SENSOR_SPOOF','REPLAY_ATTACK'].map(t => (
              <button key={t} onClick={()=>setType(t)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap border ${type===t ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm' : 'bg-white/50 text-slate-600 border-slate-200 hover:bg-slate-50' }`} >
                {t==='all'?'All Types':TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="space-y-3 pt-4 border-t border-slate-200/60">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{filtered.length} event{filtered.length!==1?'s':''}</span>
          </div>
          <AnimatePresence mode="popLayout">
            {filtered.length === 0
              ? <motion.div key="empty" className="flex flex-col items-center py-20 gap-4" initial={{ opacity:0 }} animate={{ opacity:1 }}>
                  <ShieldAlert size={48} className="text-slate-300" strokeWidth={1.5}/>
                  <p className="text-slate-500 font-medium">{alerts.length===0?'No alerts yet — monitoring active':'No events match filters'}</p>
                </motion.div>
              : filtered.map(a => <AlertRow key={a._id} alert={a} onAck={handleAck}/>)
            }
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

