import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sliders, Cpu, Shield, Save, RefreshCw, ChevronRight } from 'lucide-react';
import useStore from '../store/useStore';
import { updateThreshold, setTickRate } from '../hooks/useSocket';

function Section({ icon: I, title, children }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200/60 bg-white/40">
        <I size={18} className="text-indigo-600 stroke-[2]"/><span className="text-lg font-extrabold text-slate-800">{title}</span>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function SliderField({ label, value, min, max, step=0.1, unit, description, onChange }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-slate-700">{label}</p>
          {description&&<p className="text-xs text-slate-500 font-medium mt-0.5">{description}</p>}
        </div>
        <span className="font-mono text-base font-black text-indigo-600">{value.toFixed(step<1?1:0)}{unit}</span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-200 shadow-inner">
        <div className="absolute inset-y-0 left-0 rounded-full bg-indigo-500 shadow-sm" style={{ width:`${pct}%` }}/>
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={e=>onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer h-full"/>
      </div>
      <div className="flex justify-between text-xs text-slate-400 font-mono font-semibold"><span>{min}{unit}</span><span>{max}{unit}</span></div>
    </div>
  );
}

const STEPS = [
  { step:'01', title:'Install MQTT broker', code:'sudo apt install mosquitto mosquitto-clients' },
  { step:'02', title:'Flash ESP32 firmware', code:'# Upload esp32-firmware/sensorguard.ino via Arduino IDE' },
  { step:'03', title:'Set environment variable', code:'MQTT_BROKER=mqtt://localhost:1883' },
  { step:'04', title:'Enable MQTT in server', code:'# Uncomment setupMQTT() in simulatorService.js line ~55' },
  { step:'05', title:'Restart server', code:'npm run dev:server' },
];

export default function Settings() {
  const { user, isConnected, tickCount } = useStore();
  const [spoofT,  setSpoofT]  = useState(2.5);
  const [flatT,   setFlatT]   = useState(0.5);
  const [eventT,  setEventT]  = useState(1.0);
  const [tick,    setTick]    = useState(2000);
  const [saved,   setSaved]   = useState(false);

  const handleSave = () => {
    updateThreshold('spoof',         spoofT);
    updateThreshold('neighborFlat',  flatT);
    updateThreshold('neighborEvent', eventT);
    setTickRate(tick);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-8 pb-10 max-w-3xl">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Settings</h1>
        <p className="text-sm font-medium text-slate-500 mt-1">Detection thresholds, simulator, and hardware integration</p>
      </div>

      <Section icon={Sliders} title="Detection Thresholds">
        <div className="space-y-8">
          <SliderField label="Spoofing Z-Score Threshold" description="Sensor reading exceeding this z-score triggers anomaly check" value={spoofT} min={1} max={5} step={0.1} unit="σ" onChange={setSpoofT}/>
          <SliderField label="Neighbor Flat Threshold" description="If ALL other sensors are below this → SPOOFING verdict" value={flatT} min={0.1} max={2} step={0.1} unit="σ" onChange={setFlatT}/>
          <SliderField label="Neighbor Event Threshold" description="If neighbors also anomalous → LEGITIMATE EVENT verdict" value={eventT} min={0.5} max={3} step={0.1} unit="σ" onChange={setEventT}/>
          
          <div className="p-5 rounded-xl font-mono text-sm space-y-2 bg-slate-50 border border-slate-200 shadow-sm mt-4">
            <p className="text-slate-500 font-sans text-xs font-bold uppercase tracking-wider mb-3">Active Detection Logic</p>
            <p><span className="text-indigo-600 font-bold">IF</span> <span className="text-slate-700">z_score(sensor)</span> <span className="text-indigo-600 font-bold">&gt;</span> <span className="text-amber-500 font-bold">{spoofT}σ</span></p>
            <p className="pl-6"><span className="text-indigo-600 font-bold">AND</span> <span className="text-slate-700">max_neighbor_z</span> <span className="text-indigo-600 font-bold">&lt;</span> <span className="text-emerald-500 font-bold">{flatT}σ</span> <span className="text-rose-500 font-black">→ SPOOF</span></p>
            <p><span className="text-indigo-600 font-bold">ELSE IF</span> <span className="text-slate-700">avg_neighbor_z</span> <span className="text-indigo-600 font-bold">&gt;</span> <span className="text-emerald-500 font-bold">{eventT}σ</span> <span className="text-emerald-500 font-black">→ LEGIT</span></p>
          </div>
        </div>
      </Section>

      <Section icon={RefreshCw} title="Simulator Control">
        <div className="space-y-5">
          <SliderField label="Tick Rate" description="Interval between synthetic sensor readings" value={tick} min={500} max={10000} step={500} unit=" ms" onChange={setTick}/>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <p className="text-sm text-slate-600 font-medium">Current Configuration: <span className="font-mono text-indigo-600 font-bold ml-1">{tick}ms</span> <span className="text-slate-400 mx-1">≈</span> <span className="font-mono text-indigo-600 font-bold">{(1000/tick).toFixed(1)} Hz</span></p>
            <p className="text-xs text-slate-500 mt-1 font-mono">Total emitted ticks: <span className="font-bold text-slate-700">{tickCount.toLocaleString()}</span></p>
          </div>
        </div>
      </Section>

      <motion.button className={`px-6 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 w-full md:w-auto shadow-md transition-all ${saved ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-none' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
        onClick={handleSave} whileTap={{ scale:0.98 }}>
        {saved ? <><RefreshCw size={16} className="animate-spin"/>Applied Successfully</> : <><Save size={16}/>Apply Settings</>}
      </motion.button>

      <Section icon={Cpu} title="Hardware Integration Guide">
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium leading-relaxed">When your ESP32 components arrive, switch from simulation to real data. <strong className="text-slate-800">No frontend changes needed</strong> — only the server simulator is replaced with live MQTT payloads.</p>
          <div className="space-y-3 mt-4">
            {STEPS.map(({ step, title, code }) => (
              <div key={step} className="flex gap-4 p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <span className="flex-shrink-0 text-sm font-mono font-black text-indigo-500 mt-0.5">{step}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 mb-2">{title}</p>
                  <code className="block text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg break-all">{code}</code>
                </div>
                <ChevronRight size={18} className="text-slate-300 flex-shrink-0 mt-0.5"/>
              </div>
            ))}
          </div>
          <div className="p-4 mt-6 rounded-xl text-sm font-mono bg-indigo-50 border border-indigo-100">
            <p className="text-indigo-700 font-black mb-1">BOM (₹830–₹1,020 · Robu.in)</p>
            <p className="text-indigo-600/80 font-medium">ESP32 DevKit v1 · DHT22 · LDR GL5516 · KY-038 · Resistors · Wires</p>
          </div>
        </div>
      </Section>

      <Section icon={Shield} title="Active Session">
        <div className="grid grid-cols-2 gap-4 text-sm font-mono">
          {[['User',user?.name||'—'],['Email',user?.email||'—'],['Role',(user?.role||'—').toUpperCase()],['Socket',isConnected?'LIVE':'Disconnected']].map(([k,v])=>(
            <div key={k} className="px-4 py-3 rounded-xl bg-slate-50 border border-slate-100 flex flex-col">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">{k}</p>
              <p className="text-slate-800 font-bold">{v}</p>
            </div>
          ))}
        </div>
      </Section>

      <p className="text-xs text-slate-400 font-mono font-semibold text-center pt-8 pb-4">SensorGuard v1.0 · IDEA Lab EL Project · AY 2025–26</p>
    </div>
  );
}
