export type SparklineProps = {
  data: number[];
  width?: number;
  height?: number;
  /** Accessible summary; omit when the surrounding tile already states the value. */
  label?: string;
  className?: string;
};

export function Sparkline({ data, width = 96, height = 32, label, className }: SparklineProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = width / (data.length - 1);
  const points = data.map((v, i) => [i * step, height - 3 - ((v - min) / range) * (height - 6)] as const);
  const d = points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = points[points.length - 1];
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      style={{ overflow: "visible", flex: "none" }}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <path d={d} fill="none" stroke="var(--blue-500)" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lx} cy={ly} r={3} fill="var(--blue-500)" />
    </svg>
  );
}
