import { cn } from "@/lib/utils";

/**
 * OmniStore mark — concentric rounded squares on the brand gradient.
 *
 * Rendered inline so it inherits currentColor where needed and adds no
 * network request. The gradient stops mirror `--accent` → `--accent-2`.
 */
export function Logo({ className, size = 32 }: { className?: string; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      role="img"
      aria-label="OmniStore"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="omnistore-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(var(--accent))" />
          <stop offset="1" stopColor="rgb(var(--accent-2))" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="url(#omnistore-mark)" />
      <g fill="none" stroke="#ffffff" strokeWidth="30" strokeLinejoin="round">
        <rect x="120" y="120" width="272" height="272" rx="72" opacity="0.5" />
        <rect x="164" y="164" width="184" height="184" rx="52" opacity="0.82" />
      </g>
      <circle cx="256" cy="256" r="38" fill="#ffffff" />
    </svg>
  );
}
