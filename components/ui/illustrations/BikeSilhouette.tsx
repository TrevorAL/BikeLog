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
      <circle cx="150" cy="224" r="76" stroke="currentColor" strokeWidth="8" />
      <circle cx="150" cy="224" r="10" stroke="currentColor" strokeWidth="6" />
      {[20, 80, 140, 200, 260, 320].map((angle) => (
        <line
          key={`rear-spoke-${angle}`}
          x1="150"
          y1="224"
          x2={150 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={224 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.45"
        />
      ))}

      {/* Front wheel */}
      <circle cx="404" cy="224" r="76" stroke="currentColor" strokeWidth="8" />
      <circle cx="404" cy="224" r="10" stroke="currentColor" strokeWidth="6" />
      {[20, 80, 140, 200, 260, 320].map((angle) => (
        <line
          key={`front-spoke-${angle}`}
          x1="404"
          y1="224"
          x2={404 + 70 * Math.cos((angle * Math.PI) / 180)}
          y2={224 + 70 * Math.sin((angle * Math.PI) / 180)}
          stroke="currentColor"
          strokeWidth="3"
          opacity="0.45"
        />
      ))}

      {/* Frame: rear triangle, front triangle, fork */}
      <path
        d="M150 224 L248 208 L224 96 L150 224 M248 208 L366 146 L358 92 L224 96 M366 146 L404 224"
        stroke="currentColor"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Saddle */}
      <path d="M224 96 L210 84" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M194 82 L238 78" stroke="currentColor" strokeWidth="10" strokeLinecap="round" />

      {/* Stem + drop handlebar */}
      <path d="M358 92 L382 70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M366 64 C390 56, 414 64, 412 84 C410 98, 394 100, 390 92"
        stroke="currentColor"
        strokeWidth="7"
        strokeLinecap="round"
        fill="none"
      />

      {/* Crank + pedals */}
      <circle cx="248" cy="208" r="18" stroke="currentColor" strokeWidth="6" />
      <path d="M248 208 L292 234" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
      <path d="M248 208 L204 182" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
    </svg>
  );
}
