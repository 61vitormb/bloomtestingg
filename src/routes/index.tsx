import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom — Acompanhe seu ciclo" },
      { name: "description", content: "Acompanhe cada fase do seu ciclo menstrual com o Bloom." },
      { property: "og:title", content: "Bloom — Acompanhe seu ciclo" },
      { property: "og:description", content: "Acompanhe cada fase do seu ciclo menstrual de forma simples." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: "/app", replace: true });
  }, [loading, session, navigate]);

  return (
    <main
      className="relative mx-auto flex h-dvh max-w-md flex-col justify-end overflow-hidden px-8 pb-[max(40px,env(safe-area-inset-bottom))]"
      style={{
        background:
          "radial-gradient(60% 40% at 35% 88%, #f77a86 0%, transparent 70%), radial-gradient(45% 35% at 75% 85%, #f59a8f 0%, transparent 70%), radial-gradient(70% 55% at 95% 55%, #d896e6 0%, transparent 70%), radial-gradient(80% 45% at 10% 70%, #f286b8 0%, transparent 75%), linear-gradient(180deg, #ffffff 0%, #ffffff 38%, #f6c3dc 58%, #f08ab6 80%, #e98ad0 100%)",
      }}
    >
      <h1 className="text-[2.6rem] leading-[1.15] font-light tracking-tight text-white">
        Acompanhe
        <br />
        seu ciclo
      </h1>
      <p className="mt-5 max-w-[17rem] text-[15px] leading-snug font-light text-white/90">
        Acompanhe cada fase do seu ciclo menstrual de forma simples.
      </p>
      <Link
        to="/entrar"
        search={{ modo: "login" }}
        className="press mt-16 flex h-14 w-full items-center justify-center rounded-full bg-white text-base font-normal text-[#e0559a] shadow-[0_10px_30px_-12px_rgba(180,60,120,0.45)]"
      >
        Começar
      </Link>
    </main>
  );
}
