import { useId } from "react";
import { cn } from "@/lib/utils";

/** Marca do Bloom: cinco pétalas sobrepostas em gradiente, com miolo claro. */
export function BloomMark({ className, animated }: { className?: string; animated?: boolean }) {
  const id = useId();
  const colors = ["#ef4361", "#ff6b3d", "#f2a01f", "#159fb3", "#9877ee"];
  return (
    <svg
      viewBox="-50 -50 100 100"
      className={cn("size-8", animated && "animate-bloom", className)}
      aria-hidden="true"
    >
      <defs>
        {colors.map((c, i) => (
          <radialGradient key={c} id={`${id}-${i}`} cx="50%" cy="80%" r="80%">
            <stop offset="0%" stopColor={c} stopOpacity="0.55" />
            <stop offset="100%" stopColor={c} />
          </radialGradient>
        ))}
      </defs>
      {colors.map((_, i) => (
        <path
          key={i}
          d="M0 -6 C 14 -10 22 -30 14 -42 C 8 -50 -8 -50 -14 -42 C -22 -30 -14 -10 0 -6 Z"
          fill={`url(#${id}-${i})`}
          opacity="0.92"
          transform={`rotate(${i * 72})`}
          style={{ mixBlendMode: "multiply" }}
        />
      ))}
      <circle r="7" fill="#fff" />
      <circle r="3.5" fill="#f2a01f" />
    </svg>
  );
}

export function BloomWordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-2 text-xl font-bold tracking-tight", className)}
    >
      <BloomMark />
      Bloom
    </span>
  );
}
