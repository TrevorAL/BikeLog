type LogoMarkProps = {
  className?: string;
};

export function LogoMark({ className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="3" />
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" strokeDasharray="2 6" />
      <circle cx="24" cy="24" r="5.5" fill="currentColor" />
      <path
        d="M24 24L13 30M24 24L31 12M24 24L34 29"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="13" cy="30" r="2.5" fill="currentColor" />
      <circle cx="31" cy="12" r="2.5" fill="currentColor" />
      <circle cx="34" cy="29" r="2.5" fill="currentColor" />
    </svg>
  );
}
