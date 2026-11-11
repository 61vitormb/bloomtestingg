import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, CalendarHeart, Lock, NotebookPen, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BloomMark } from "@/components/bloom/BloomLogo";
import { HeroFlower } from "@/components/bloom/AuthLayout";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom — seu ciclo, do seu jeito" },
      {
        name: "description",
        content:
          "Bloom acompanha ciclo menstrual, sintomas, humor e bem-estar, com seus dados guardados na nuvem e só para você.",
      },
      { property: "og:title", content: "Bloom — seu ciclo, do seu jeito" },
      {
        property: "og:description",
        content: "Calendário menstrual, registro de sintomas, humor e análises descritivas.",
      },
    ],
  }),
  component: Welcome,
});

const FEATURES = [
  {
    icon: CalendarHeart,
    title: "Calendário inteligente",
    text: "Menstruação registrada e estimada, janela fértil estimada e histórico de ciclos.",
  },
  {
    icon: Sparkles,
    title: "Registro em segundos",
    text: "Fluxo, humor, cólicas, energia, sono e sintomas em uma única tela.",
  },
  {
    icon: BarChart3,
    title: "Análises e insights",
    text: "Médias, variação entre ciclos e padrões — descritivos, sem diagnósticos.",
  },
  {
    icon: NotebookPen,
    title: "Diário privado",
    text: "Anotações ligadas ao dia do ciclo, organizadas por data.",
  },
  {
    icon: Lock,
    title: "Privacidade real",
    text: "Isolamento por usuária no banco, exportação e exclusão total dos dados.",
  },
  {
    icon: ShieldCheck,
    title: "Responsável",
    text: "Não é contraceptivo e não substitui acompanhamento de saúde.",
  },
];

function Welcome() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app", replace: true });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-dvh bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <span className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <BloomMark animated className="size-9" /> Bloom
        </span>
        <Button asChild variant="ghost" className="rounded-full">
          <Link to="/entrar" search={{ modo: "login" }}>
            Entrar
          </Link>
        </Button>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-16">
        <section className="bloom-gradient grain relative overflow-hidden rounded-[2.5rem] px-6 py-12 text-white shadow-[var(--shadow-lift)] md:px-12 md:py-16">
          <div className="relative z-10 grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div className="animate-fade-up">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold tracking-wide uppercase backdrop-blur">
                Acompanhamento menstrual
              </span>
              <h1 className="mt-5 text-4xl leading-[1.05] font-bold tracking-tight text-balance md:text-6xl">
                Seu ciclo, acompanhado com calma.
              </h1>
              <p className="mt-5 max-w-md text-lg text-white/90">
                Registre menstruação, sintomas, humor e bem-estar em poucos toques. Estimativas
                sempre transparentes e baseadas no que você registrou.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button
                  asChild
                  size="lg"
                  className="min-h-12 rounded-full bg-white px-6 text-base text-[#22172b] hover:bg-white/90"
                >
                  <Link to="/entrar" search={{ modo: "cadastro" }}>
                    Criar minha conta
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="min-h-12 rounded-full border-white/60 bg-transparent px-6 text-base text-white hover:bg-white/15 hover:text-white"
                >
                  <Link to="/entrar" search={{ modo: "login" }}>
                    Já tenho conta
                  </Link>
                </Button>
              </div>
            </div>
            <HeroFlower className="mx-auto w-full max-w-sm animate-float" />
          </div>
        </section>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {FEATURES.map((f) => (
            <li key={f.title} className="bloom-card p-6">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-accent text-accent-foreground">
                <f.icon className="size-5" aria-hidden="true" />
              </span>
              <h2 className="mt-4 font-bold">{f.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </li>
          ))}
        </ul>

        <p className="mx-auto mt-12 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
          O Bloom não é um método contraceptivo e não substitui acompanhamento de saúde. As
          previsões de menstruação e da janela fértil são estimativas.
        </p>
      </main>
    </div>
  );
}
