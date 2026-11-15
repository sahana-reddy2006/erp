export function BrandLogo({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="40" height="40" rx="10" className="fill-emerald-700 dark:fill-emerald-600" />
      <path
        d="M11 28V12H15.2V19.1L22.1 12H27.4L19.6 19.8L28 28H22.5L15.2 20.6V28H11Z"
        fill="white"
      />
      <rect x="25" y="12" width="4" height="4" rx="1" fill="#A7F3D0" />
    </svg>
  );
}
