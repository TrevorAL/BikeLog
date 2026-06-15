type GearBadgeProps = {
  className?: string;
};

export function GearBadge({ className }: GearBadgeProps) {
  const teeth = 12;
  const center = 60;
  const outerRadius = 52;
  const innerRadius = 44;
  const toothLength = 8;

  const toothPaths = Array.from({ length: teeth }, (_, index) => {
    const angle = (index / teeth) * Math.PI * 2;
    const nextAngle = angle + (Math.PI * 2) / teeth / 2.4;
    const x1 = center + innerRadius * Math.cos(angle);
    const y1 = center + innerRadius * Math.sin(angle);
    const x2 = center + (outerRadius + toothLength) * Math.cos(angle);
    const y2 = center + (outerRadius + toothLength) * Math.sin(angle);
    const x3 = center + (outerRadius + toothLength) * Math.cos(nextAngle);
    const y3 = center + (outerRadius + toothLength) * Math.sin(nextAngle);
    const x4 = center + innerRadius * Math.cos(nextAngle);
    const y4 = center + innerRadius * Math.sin(nextAngle);

    return `M${x1} ${y1} L${x2} ${y2} L${x3} ${y3} L${x4} ${y4} Z`;
  });

  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx={center} cy={center} r={innerRadius} stroke="currentColor" strokeWidth="6" />
      <circle cx={center} cy={center} r={18} stroke="currentColor" strokeWidth="5" />
      {toothPaths.map((path, index) => (
        <path key={index} d={path} fill="currentColor" opacity="0.85" />
      ))}
    </svg>
  );
}
