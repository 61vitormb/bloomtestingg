import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Flower2, Lock, LineChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganicField } from "@/components/bloom/OrganicField";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Bloom — seu ciclo, do seu jeito" },
      {
        name: "description",
        content:
          "Bloom acompanha ciclo menstrual, sintomas e humor em um app acolhedor, com seus dados guardados na nuvem e só para você.",
      },
      { property: "og:title", content: "Bloom — seu ciclo, do seu jeito" },
      {
        property: "og:description",
        content: "Calendário menstrual, registro de sintomas e acompanhamento de humor.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/app", replace: true });
  }, [loading, session, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-12">
      <div className="relative overflow-hidden rounded-[2.5rem] border border-border">
        <div className="absolute inset-0">
          <OrganicField variant="bloom" />
        </div>
        <div className="relative flex min-h-64 flex-col justify-end p-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-card/85 px-3 py-1 text-xs font-semibold tracking-wide text-primary uppercase">
            <Flower2 className="h-3.5 w-3.5" aria-hidden="true" />
            Bloom
          </span>
          <h1 className="mt-4 text-4xl leading-tight font-bold text-foreground">
            Seu ciclo, acompanhado com calma.
          </h1>
        </div>
      </div>

      <p className="mt-6 text-base text-muted-foreground">
        Registre menstruação, sintomas e humor em poucos toques. As estimativas são
        aproximadas e sempre baseadas no que você registrou.
      </p>

      <ul className="mt-6 space-y-3">
        <li className="bloom-card flex items-start gap-3 p-4">
          <LineChart className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Calendário e histórico</p>
            <p className="text-sm text-muted-foreground">
              Veja seus ciclos anteriores e as datas estimadas dos próximos.
            </p>
          </div>
        </li>
        <li className="bloom-card flex items-start gap-3 p-4">
          <Flower2 className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Humor sem julgamento</p>
            <p className="text-sm text-muted-foreground">
              Registros pessoais, sem diagnósticos e sem certo ou errado.
            </p>
          </div>
        </li>
        <li className="bloom-card flex items-start gap-3 p-4">
          <Lock className="mt-0.5 h-5 w-5 text-primary" aria-hidden="true" />
          <div>
            <p className="font-semibold">Privacidade em primeiro lugar</p>
            <p className="text-sm text-muted-foreground">
              Só você acessa seus registros. Exporte ou exclua quando quiser.
            </p>
          </div>
        </li>
      </ul>

      <div className="mt-8 space-y-3">
        <Button asChild className="min-h-12 w-full text-base">
          <Link to="/entrar" search={{ modo: "cadastro" }}>
            Criar minha conta
          </Link>
        </Button>
        <Button asChild variant="outline" className="min-h-12 w-full text-base">
          <Link to="/entrar" search={{ modo: "login" }}>
            Já tenho conta
          </Link>
        </Button>
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
        O Bloom não é um método contraceptivo e não substitui acompanhamento de saúde.
        As previsões de menstruação e da janela ovulatória são estimativas.
      </p>
    </main>
  );
}
