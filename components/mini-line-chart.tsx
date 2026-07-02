"use client";

export function MiniLineChart({
  values,
  label,
  color = "#047481"
}: {
  values: number[];
  label: string;
  color?: string;
}) {
  const width = 620;
  const height = 210;
  const padding = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = padding + (index / Math.max(1, values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  const [lastX, lastY] = (points.at(-1) ?? String(padding) + "," + String(height - padding)).split(",");

  return (
    <svg className="chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#dce4dd" />
      <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#dce4dd" />
      <polyline fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" points={points.join(" ")} />
      <circle
        cx={lastX}
        cy={lastY}
        r="5"
        fill={color}
      />
      <text x={padding} y={18}>
        {Math.round(max)}
      </text>
      <text x={padding} y={height - 6}>
        {Math.round(min)}
      </text>
    </svg>
  );
}
