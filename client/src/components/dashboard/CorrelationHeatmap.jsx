import { useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import useStore from '../../store/useStore';

const SENSORS = ['temperature', 'humidity', 'light', 'sound'];
const LABELS  = { temperature: 'Temp', humidity: 'Humid', light: 'Light', sound: 'Sound' };

export default function CorrelationHeatmap() {
  const svgRef = useRef(null);
  const { correlationMatrix } = useStore();

  // Build flat cell data
  const cells = useMemo(() => {
    if (!correlationMatrix) return [];
    const result = [];
    for (const row of SENSORS) {
      for (const col of SENSORS) {
        const val = correlationMatrix?.[row]?.[col] ?? (row === col ? 1 : 0);
        result.push({ row, col, value: val });
      }
    }
    return result;
  }, [correlationMatrix]);

  useEffect(() => {
    if (!svgRef.current) return;

    const el    = svgRef.current;
    const W     = el.clientWidth  || 200;
    const H     = el.clientHeight || 200;
    const pad   = { top: 32, right: 8, bottom: 8, left: 38 };
    const inner = { w: W - pad.left - pad.right, h: H - pad.top - pad.bottom };
    const n     = SENSORS.length;
    const cell  = Math.min(inner.w, inner.h) / n;

    d3.select(el).selectAll('*').remove();

    const svg = d3.select(el)
      .attr('width', W)
      .attr('height', H);

    const g = svg.append('g')
      .attr('transform', `translate(${pad.left},${pad.top})`);

    // Color scale: red → light slate → indigo  (negative corr → no corr → positive corr)
    const colorScale = d3.scaleSequential()
      .domain([-1, 1])
      .interpolator(t => {
        // Custom: -1 = rose, 0 = slate-50, +1 = indigo
        if (t < 0.5) {
          const p = t * 2;
          return d3.interpolateRgb('#f43f5e', '#f8fafc')(p); // rose-500 to slate-50
        } else {
          const p = (t - 0.5) * 2;
          return d3.interpolateRgb('#f8fafc', '#4f46e5')(p); // slate-50 to indigo-600
        }
      });

    // Column headers
    g.selectAll('.col-label')
      .data(SENSORS)
      .enter().append('text')
        .attr('class', 'col-label')
        .attr('x', (d, i) => i * cell + cell / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10)
        .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
        .attr('fill', '#475569') // slate-600
        .attr('font-weight', 600)
        .text(d => LABELS[d]);

    // Row headers
    g.selectAll('.row-label')
      .data(SENSORS)
      .enter().append('text')
        .attr('class', 'row-label')
        .attr('x', -6)
        .attr('y', (d, i) => i * cell + cell / 2)
        .attr('text-anchor', 'end')
        .attr('dominant-baseline', 'middle')
        .attr('font-size', 10)
        .attr('font-family', 'ui-sans-serif, system-ui, sans-serif')
        .attr('fill', '#475569') // slate-600
        .attr('font-weight', 600)
        .text(d => LABELS[d]);

    // Cells
    const cellG = g.selectAll('.cell')
      .data(cells, d => `${d.row}-${d.col}`)
      .enter().append('g')
        .attr('class', 'cell')
        .attr('transform', d => {
          const cx = SENSORS.indexOf(d.col) * cell;
          const cy = SENSORS.indexOf(d.row) * cell;
          return `translate(${cx},${cy})`;
        });

    // Cell background
    cellG.append('rect')
      .attr('width', cell - 2)
      .attr('height', cell - 2)
      .attr('rx', 4)
      .attr('fill', d => colorScale(d.value))
      .attr('opacity', 0.85);

    // Diagonal identity cells get a special border
    cellG.filter(d => d.row === d.col)
      .append('rect')
        .attr('width', cell - 2)
        .attr('height', cell - 2)
        .attr('rx', 4)
        .attr('fill', 'none')
        .attr('stroke', '#cbd5e1') // slate-300
        .attr('stroke-width', 1.5);

    // Cell value text
    cellG.append('text')
      .attr('x', (cell - 2) / 2)
      .attr('y', (cell - 2) / 2)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      .attr('font-size', 10)
      .attr('font-family', 'ui-monospace, monospace')
      .attr('font-weight', 700)
      .attr('fill', d => Math.abs(d.value) > 0.4 ? '#ffffff' : '#475569') // text-white or slate-600
      .text(d => d.value.toFixed(2));

    // Animate in
    g.selectAll('.cell rect')
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((_, i) => i * 15)
      .attr('opacity', 0.85);

  }, [cells]);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/80 shadow-lg shadow-slate-200/50 rounded-3xl overflow-hidden flex flex-col h-[400px]">
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(226,232,240,0.6)' }}
      >
        <span className="text-slate-800 font-extrabold text-xl">Sensor Correlation Matrix</span>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 rounded-full shadow-inner" style={{ background: 'linear-gradient(90deg, #f43f5e, #f8fafc, #4f46e5)' }} />
          </div>
          <span className="text-xs text-slate-500 font-semibold font-mono">−1 → +1</span>
        </div>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center">
        <svg
          ref={svgRef}
          className="w-full h-full"
        />
      </div>

      <div
        className="px-6 py-4 flex items-center justify-center bg-slate-50/50"
        style={{ borderTop: '1px solid rgba(226,232,240,0.6)' }}
      >
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Spoof detected when single sensor diverges while others remain correlated
        </span>
      </div>
    </div>
  );
}
