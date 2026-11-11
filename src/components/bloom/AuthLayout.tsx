import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { BloomMark } from "./BloomLogo";

/**
 * Layout das telas públicas (boas-vindas, entrar, nova senha, onboarding).
 * Desktop: painel visual à esquerda e conteúdo à direita. Mobile: visual compacto no topo.
 */
export function AuthLayout({ children, visual }: { children: ReactNode; visual?: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background lg:grid lg:grid-cols-[1.05fr_1fr]">
      <aside
        className="bloom-gradient grain relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12"
        aria-hidden="true"
      >
        <Link
          to="/"
          className="relative z-10 flex items-center gap-2.5 text-xl font-bold text-white"
        >
          <span className="flex size-10 items-center justify-center rounded-2xl bg-white/90">
            <BloomMark className="size-7" />
          </span>
          Bloom
        </Link>
        <div className="relative z-10">{visual ?? <HeroFlower />}</div>
        <p className="relative z-10 max-w-sm text-sm text-white/85">
          Acompanhe seu ciclo, sintomas e humor com privacidade. Estimativas transparentes — nunca
          diagnósticos.
        </p>
      </aside>
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-6 pt-8 pb-12 lg:max-w-lg lg:justify-center lg:px-12">
        <Link to="/" className="mb-8 flex items-center gap-2 text-lg font-bold lg:hidden">
          <BloomMark animated /> Bloom
        </Link>
        <div className="animate-fade-up">{children}</div>
      </main>
    </div>
  );
}

/** Flor grande animada para os painéis visuais. */
export function HeroFlower({ className }: { className?: string }) {
  const colors = ["#ffffff", "#ffe1ea", "#ffd3b0", "#d7f3f6", "#e6ddff", "#ffe8b8"];
  return (
    <svg
      viewBox="-120 -120 240 240"
      className={className ?? "mx-auto w-full max-w-md animate-float"}
    >
      {colors.map((c, i) => (
        <g key={c} transform={`rotate(${i * 60})`}>
          <path
            d="M0 -18 C 26 -18 62 -60 60 -92 C 58 -118 -58 -118 -60 -92 C -62 -60 -26 -18 0 -18 Z"
            fill={c}
            fillOpacity={0.38 + (i % 2) * 0.14}
            stroke="#ffffff"
            strokeOpacity="0.6"
            strokeWidth="1.2"
            style={{
              animation: `bloom-open 1.1s ${i * 0.09}s cubic-bezier(0.2,0.8,0.2,1) both`,
              transformBox: "fill-box",
              transformOrigin: "50% 100%",
            }}
          />
        </g>
      ))}
      <circle r="22" fill="#fff" fillOpacity="0.95" />
      <circle r="11" fill="#f2a01f" />
    </svg>
  );
}
