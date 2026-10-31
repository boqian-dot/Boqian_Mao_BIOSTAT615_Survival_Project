import { useId } from 'react';

export interface CurvePoint {
  time: number;
  value: number;
  lower?: number | null;
  upper?: number | null;
}
export interface CurveSeries {
  id: string;
  label: string;
  color: string;
  points: CurvePoint[];
  initial: number;
  dashed?: boolean;
  continuous?: boolean;
  confidence?: boolean;
  censors?: { time: number; value: number }[];
}
interface Props {
  series: CurveSeries[];
  label: string;
  yLabel: string;
  maxTime: number;
  maxValue?: number;
  selectedTime?: number;
  showConfidence?: boolean;
  onSelectTime?: (time: number) => void;
  timeUnit?: string;
  hideLegend?: boolean;
}

function tick(value: number): string {
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  return Number(value.toPrecision(3)).toString();
}

export default function CurveChart({ series, label, yLabel, maxTime, maxValue, selectedTime, showConfidence, onSelectTime, timeUnit = 'time units', hideLegend }: Props) {
  const id = useId().replaceAll(':', '');
  const width = 820, height = 320;
  const left = 62, right = 24, top = 24, bottom = 54;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const end = maxTime > 0 ? maxTime : 1;
  const observedMax = Math.max(1, ...series.flatMap(s => s.points.filter(p => p.time <= end).map(p => p.value)));
  const ceiling = maxValue ?? Math.max(1, Math.ceil(observedMax * 1.08 * 5) / 5);
  const x = (time: number) => left + time / end * plotWidth;
  const y = (value: number) => top + plotHeight - value / ceiling * plotHeight;
  const vertices = (points: CurvePoint[], initial: number, field: 'value' | 'lower' | 'upper' = 'value', continuous = false) => {
    const output: [number, number][] = [[x(0), y(initial)]];
    let last = initial;
    for (const p of points) {
      if (p.time > end) { output.push([x(end), y(last)]); break; }
      const next = p[field];
      if (next === null || next === undefined) { output.push([x(p.time), y(last)]); break; }
      if (!continuous) output.push([x(p.time), y(last)]);
      output.push([x(p.time), y(next)]);
      last = next;
    }
    return output;
  };
  const line = (points: [number, number][]) => points.map(([px, py], index) => `${index ? 'L' : 'M'}${px.toFixed(3)},${py.toFixed(3)}`).join(' ');
  const selectionVisible = selectedTime !== undefined && selectedTime <= end;
  return <div className="curve-chart">
    <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title`} aria-describedby={`${id}-desc`}>
      <title id={`${id}-title`}>{label}</title>
      <desc id={`${id}-desc`}>Right-continuous estimates. {series.map(s => s.label).join('; ')}. Use the observation-time control or calculation table for exact values.</desc>
      <defs><clipPath id={`${id}-clip`}><rect x={left} y={top} width={plotWidth} height={plotHeight + 1} /></clipPath></defs>
      {[0, 1, 2, 3, 4].map(index => {
        const value = ceiling * index / 4;
        return <g key={`y${index}`}><line className="chart-grid" x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text className="chart-tick" x={left - 12} y={y(value) + 4} textAnchor="end">{tick(value)}</text></g>;
      })}
      {[0, 1, 2, 3, 4, 5, 6].map(index => {
        const time = end * index / 6;
        return <g key={`x${index}`}><line className="chart-tick-line" x1={x(time)} x2={x(time)} y1={top + plotHeight} y2={top + plotHeight + 5} /><text className="chart-tick" x={x(time)} y={height - bottom + 24} textAnchor="middle">{tick(time)}</text></g>;
      })}
      <text className="chart-axis-label" transform={`translate(17 ${top + plotHeight / 2}) rotate(-90)`} textAnchor="middle">{yLabel}</text>
      <text className="chart-axis-label" x={left + plotWidth / 2} y={height - 7} textAnchor="middle">Follow-up ({timeUnit})</text>
      <g clipPath={`url(#${id}-clip)`}>
        {series.map(s => {
          const lo = vertices(s.points, s.initial, 'lower');
          const hi = vertices(s.points, s.initial, 'upper');
          return <g key={s.id}>
            {showConfidence && s.confidence && s.points.some(p => p.lower !== null && p.lower !== undefined) && <path d={`${line([...lo, ...hi.reverse()])} Z`} fill={s.color} opacity="0.1" />}
            <path data-series={s.id} d={line(vertices(s.points, s.initial, 'value', s.continuous))} fill="none" stroke={s.color} strokeWidth={s.dashed ? 2 : 3} strokeDasharray={s.dashed ? '7 5' : undefined} strokeLinejoin="round" />
            {s.censors?.filter(p => p.time <= end).map((p, i) => <g key={`c${i}`} stroke={s.color} strokeWidth="1.6"><line x1={x(p.time) - 4} x2={x(p.time) + 4} y1={y(p.value)} y2={y(p.value)} /><line x1={x(p.time)} x2={x(p.time)} y1={y(p.value) - 4} y2={y(p.value) + 4} /></g>)}
          </g>;
        })}
        {selectionVisible && <line x1={x(selectedTime)} x2={x(selectedTime)} y1={top} y2={top + plotHeight} className="chart-selected-line" />}
        {selectionVisible && series.map(s => {
          const upto = s.points.filter(p => p.time <= selectedTime);
          const last = upto.at(-1);
          const support = s.points.at(-1)?.time ?? 0;
          if (selectedTime > support) return null;
          return <circle key={s.id} cx={x(selectedTime)} cy={y(last?.value ?? s.initial)} r="5.5" fill={s.color} stroke="white" strokeWidth="2.5" />;
        })}
      </g>
      {selectionVisible && <g><rect x={Math.min(width - 93, Math.max(left, x(selectedTime) - 34))} y={3} width="68" height="20" rx="5" fill="var(--ink)" /><text x={Math.min(width - 59, Math.max(left + 34, x(selectedTime)))} y="17" textAnchor="middle" fill="white" fontSize="10" fontFamily="var(--font-mono)">t = {tick(selectedTime)}</text></g>}
      {onSelectTime && <rect x={left} y={top} width={plotWidth} height={plotHeight} fill="transparent" className="chart-hit" aria-hidden="true" onClick={event => {
        const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect();
        if (!bounds) return;
        const clicked = ((event.clientX - bounds.left) / bounds.width * width - left) / plotWidth * end;
        const times = [...new Set(series.flatMap(s => s.points.map(p => p.time)))];
        if (times.length) onSelectTime(times.reduce((best, time) => Math.abs(time - clicked) < Math.abs(best - clicked) ? time : best));
      }} />}
    </svg>
    {!hideLegend && <div className="chart-legend">{series.map(s => <span key={s.id}><i style={{ background: s.color, color: s.color }} className={s.dashed ? 'legend-dashed' : ''} />{s.label}</span>)}{showConfidence && <span className="muted">Shading: 95% pointwise CI</span>}</div>}
  </div>;
}
