type RoadLinesProps = {
  className?: string;
};

export function RoadLines({ className }: RoadLinesProps) {
  return (
    <svg
      viewBox="0 0 800 400"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <path
        d="M-40 320 C 180 250, 380 380, 620 280 C 760 220, 860 260, 900 230"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.35"
      />
      <path
        d="M-40 360 C 200 300, 420 400, 640 330 C 780 290, 860 310, 900 290"
        stroke="currentColor"
        strokeWidth="2"
        opacity="0.2"
      />
      <path
        d="M-40 300 C 160 360, 360 220, 560 300 C 720 360, 840 300, 900 320"
        strokeDasharray="10 14"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
