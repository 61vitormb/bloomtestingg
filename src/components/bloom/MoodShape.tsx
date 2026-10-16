import { useId } from "react";
import { moodOption, type MoodShapeKind } from "@/domain/catalog";

const PATHS: Record<MoodShapeKind, string> = {
  petal:
    "M50 6c14 12 30 20 30 38 0 20-14 34-30 34S20 64 20 44C20 26 36 18 50 6Z",
  wave:
    "M8 60c12-22 22 10 34-8s20-30 34-16c14 14 16 42-6 50-24 9-52 4-62-4-4-4-2-14 0-22Z",
  burst:
    "M50 4 62 30l28-8-16 24 22 18-28 4 4 28-22-18-22 18 4-28-28-4 22-18-16-24 28 8Z",
  circle: "M50 8a42 42 0 1 0 .1 0Z",
  ripple:
    "M50 10c22 0 40 14 40 32 0 20-20 32-40 32S10 62 10 42c0-8 4-14 10-14 8 0 8 14 16 14 10 0 6-32 14-32Z",
  drop: "M50 6c16 22 30 34 30 50a30 30 0 0 1-60 0C20 40 34 28 50 6Z",
};

interface MoodShapeProps {
  mood: string;
  size?: number;
  className?: string;
  mono?: boolean;
}

/** Ilustração orgânica reutilizável para cada estado emocional. */
export function MoodShape({ mood, size = 56, className, mono }: MoodShapeProps) {
  const option = moodOption(mood);
  const gradientId = useId();
  if (!option) return null;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <radialGradient id={gradientId} cx="35%" cy="30%" r="80%">
          <stop offset="0%" stopColor={option.from} />
          <stop offset="100%" stopColor={option.to} />
        </radialGradient>
      </defs>
      <path d={PATHS[option.shape]} fill={mono ? "currentColor" : `url(#${gradientId})`} />
    </svg>
  );
}
