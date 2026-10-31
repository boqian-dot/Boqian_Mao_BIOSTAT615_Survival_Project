import type { Subject } from '../stats';

interface Props {
  subjects: Subject[];
  selectedTime: number;
  maxTime?: number;
  title?: string;
  groupColors?: Record<string, string>;
}

export default function Timeline({ subjects, selectedTime, maxTime, title = 'Individual follow-up', groupColors }: Props) {
  const displayed = subjects.slice(0, 50);
  const end = Math.max(maxTime ?? 0, ...subjects.map(s => s.time), 1);
  const height = Math.max(110, displayed.length * 25 + 44);
  const left = 52, top = 22, plotWidth = 440;
  const x = (time: number) => left + time / end * plotWidth;
  return <div className="timeline-wrap">
    <div className="timeline-caption"><span><i className="event-dot" /> Event</span><span><i className="censor-cross">+</i> Censored</span><span className="risk-key">Highlighted = at risk before t</span></div>
    <div className="timeline-scroll"><svg viewBox={`0 0 520 ${height}`} role="img" aria-label={`${title}. Highlighted subjects are still at risk immediately before time ${selectedTime}.`}>
      <line x1={x(selectedTime)} x2={x(selectedTime)} y1="5" y2={height - 23} className="chart-selected-line" />
      {displayed.map((s, index) => {
        const py = top + index * 25;
        const atRisk = s.time >= selectedTime;
        const color = s.group && groupColors?.[s.group] ? groupColors[s.group] : s.group === 'B' ? 'var(--amber)' : 'var(--teal)';
        return <g key={s.id} opacity={atRisk ? 1 : 0.32}>
          {atRisk && <rect x="2" y={py - 10} width="508" height="21" rx="5" fill="var(--teal-soft)" />}
          <text x={left - 14} y={py + 4} textAnchor="end" className="timeline-label">{s.id}</text>
          <line x1={left} x2={x(s.time)} y1={py} y2={py} stroke={color} strokeWidth="2" />
          {s.event === 1 ? <circle cx={x(s.time)} cy={py} r="4" fill={color} /> : <g stroke={color} strokeWidth="2"><line x1={x(s.time) - 4} x2={x(s.time) + 4} y1={py} y2={py} /><line x1={x(s.time)} x2={x(s.time)} y1={py - 4} y2={py + 4} /></g>}
        </g>;
      })}
      {[0, 1, 2, 3, 4].map(i => <text key={i} className="chart-tick" x={x(end * i / 4)} y={height - 5} textAnchor="middle">{Number((end * i / 4).toPrecision(3))}</text>)}
    </svg></div>
    {subjects.length > 50 && <p className="helper">Timelines show the first 50 of {subjects.length.toLocaleString()} subjects. All {subjects.length.toLocaleString()} contribute to the estimates.</p>}
  </div>;
}
