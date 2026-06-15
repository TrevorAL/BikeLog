type BikeSilhouetteProps = {
  className?: string;
};

export function BikeSilhouette({ className }: BikeSilhouetteProps) {
  return (
    <svg
      viewBox="0 0 600 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Rear wheel */}
      <circle cx="150" cy="220" r="68" stroke="currentColor" strokeWidth="8" />
      <circle cx="150" cy="220" r="10" stroke="currentColor" strokeWidth="6" />
      {[0, 45, 90, 135].map((angle) => (
        <line
          key={`rear-spoke-${angle}`}
          x1="150"
          y1="220"
          x2={150 + 62 * Math.cos((angle * Math.PI) / 180)}
          y2={220 + 62 * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.5"
        />
      ))}

      {/* Front wheel */}
      <circle cx="450" cy="220" r="68" stroke="currentColor" strokeWidth="8" />
      <circle cx="450" cy="220" r="10" stroke="currentColor" strokeWidth="6" />
      {[0, 45, 90, 135].map((angle) => (
        <line
          key={`front-spoke-${angle}`}
          x1="450"
          y1="220"
          x2={450 + 62 * Math.cos((angle * Math.PI) / 180)}
          y2={220 + 62 * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.5"
        />
      ))}

      {/* Frame */}
      <path
        d="M150 220 L262 220 M150 220 L242 100 M262 220 L242 100 M242 100 L400 112 M262 220 L400 112 M400 112 L450 220"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Seat post + saddle */}
      <path d="M242 100 L250 78" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M225 76 L268 72" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />

      {/* Stem + handlebar */}
      <path d="M400 112 L418 82" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M396 84 C408 78, 432 78, 436 92 C438 100, 430 104, 422 100"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Crank + pedal */}
      <circle cx="262" cy="220" r="16" stroke="currentColor" strokeWidth="6" />
      <path d="M262 220 L300 244" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M262 220 L226 198" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
