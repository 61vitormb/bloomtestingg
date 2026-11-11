import { useId } from "react";
import { cn } from "@/lib/utils";

type Variant = "garden" | "petals" | "bloom" | "dusk";

const PALETTES: Record<Variant, [string, string, string]> = {
  garden: ["var(--petal-teal)", "var(--petal-amber)", "var(--phase-ovulatory-soft)"],
  petals: ["var(--petal-rose)", "var(--petal-lilac)", "var(--phase-menstrual-soft)"],
  bloom: ["var(--petal-coral)", "var(--petal-pink)", "var(--petal-lilac)"],
  dusk: ["var(--petal-lilac)", "var(--petal-blue)", "var(--phase-luteal-soft)"],
};

/**
 * Campo de cor orgânico, inspirado em pinturas de jardim.
 * Usado como destaque decorativo — nunca atrás de textos longos.
 */
export function OrganicField({
  variant = "garden",
  className,
}: {
  variant?: Variant;
  className?: string;
}) {
  const id = useId();
  const [a, b, c] = PALETTES[variant];
  return (
    <svg
      viewBox="0 0 200 120"
      preserveAspectRatio="none"
      className={cn("h-full w-full", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={`${id}-a`} cx="25%" cy="35%" r="70%">
          <stop offset="0%" stopColor={a} stopOpacity="0.85" />
          <stop offset="100%" stopColor={a} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-b`} cx="75%" cy="25%" r="70%">
          <stop offset="0%" stopColor={b} stopOpacity="0.8" />
          <stop offset="100%" stopColor={b} stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${id}-c`} cx="55%" cy="90%" r="75%">
          <stop offset="0%" stopColor={c} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="120" fill={`url(#${id}-c)`} />
      <ellipse cx="60" cy="50" rx="80" ry="60" fill={`url(#${id}-a)`} />
      <ellipse cx="150" cy="40" rx="70" ry="55" fill={`url(#${id}-b)`} />
    </svg>
  );
}
