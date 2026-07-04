import React from 'react';

function getThreatData(score) {
  if (score >= 80) return { level: 'CRITICAL', color: 'bg-rose-500', text: 'text-rose-600' };
  if (score >= 60) return { level: 'HIGH', color: 'bg-orange-500', text: 'text-orange-600' };
  if (score >= 40) return { level: 'ELEVATED', color: 'bg-amber-500', text: 'text-amber-600' };
  return { level: 'LOW', color: 'bg-emerald-500', text: 'text-emerald-600' };
}

export default function AnomalyGauge({ score = 0, zScores = {} }) {
  const threat = getThreatData(score);
  const states = ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'];
  
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-2xl p-6 h-full flex flex-col">
      <h2 className="text-slate-800 font-extrabold text-xl mb-4 border-b border-slate-200/60 pb-3">System Threat Level</h2>
      
      <div className="flex-1 flex flex-col justify-center items-center py-4">
        <div className={`text-4xl font-black tracking-tight mb-2 ${threat.text}`}>
          {threat.level}
        </div>
        <div className="text-slate-500 font-medium mb-8">
          Anomaly Score: {Math.round(score)}/100
        </div>
        
        {/* Meter Bar */}
        <div className="w-full flex gap-2">
          {states.map((state, i) => {
            const isActive = state === threat.level;
            const isPast = states.indexOf(threat.level) >= i;
            let bgColor = 'bg-slate-200';
            if (isPast) {
              if (i === 0) bgColor = 'bg-emerald-500';
              if (i === 1) bgColor = 'bg-amber-500';
              if (i === 2) bgColor = 'bg-orange-500';
              if (i === 3) bgColor = 'bg-rose-500';
            }
            
            return (
              <div key={state} className="flex-1 flex flex-col items-center gap-2">
                <div className={`h-2 w-full rounded-full transition-colors duration-500 ${bgColor} ${isActive ? 'shadow-sm transform scale-105' : ''}`} />
                <span className={`text-xs font-bold tracking-wide ${isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                  {state}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Z-Scores Grid if they exist */}
      {Object.keys(zScores).length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-200/60">
          <p className="text-xs font-bold text-slate-500 mb-2 tracking-wider">SUBSYSTEM STATUS</p>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(zScores).map(([sensor, z]) => (
                 <div
                   key={sensor}
                   className="flex items-center justify-between px-3 py-2 bg-slate-50/80 rounded-lg border border-slate-200"
                 >
                   <span className="text-sm text-slate-600 capitalize font-medium">{sensor.slice(0, 8)}</span>
                   <span
                     className={`text-sm font-bold ${z > 2.5 ? 'text-amber-500' : 'text-emerald-500'}`}
                   >
                     {z.toFixed(2)}σ
                   </span>
                 </div>
               ))}
          </div>
        </div>
      )}
    </div>
  );
}

