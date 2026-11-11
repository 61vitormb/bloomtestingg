import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/bloom/AuthLayout";
import { isValidISODate, diffInDays } from "@/domain/cycle";
import { todayISO } from "@/lib/format";
import { useCreateCycle, useUpdatePreferences } from "@/hooks/useBloomData";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Boas-vindas ao Bloom" },
      {
        name: "description",
        content: "Configure em poucos passos como o Bloom vai acompanhar você.",
      },
      { property: "og:title", content: "Boas-vindas ao Bloom" },
      {
        property: "og:description",
        content: "Conte o básico ou pule — você pode registrar depois.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const savePreferences = useUpdatePreferences();
  const createCycle = useCreateCycle();

  const [step, setStep] = useState(0);
  const [lastPeriod, setLastPeriod] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function finish(withData: boolean) {
    setError(null);
    if (withData && lastPeriod) {
      if (!isValidISODate(lastPeriod) || diffInDays(todayISO(), lastPeriod) > 0) {
        setError("Escolha uma data válida que não esteja no futuro.");
        return;
      }
    }
    try {
      if (withData && lastPeriod) {
        await createCycle.mutateAsync({ start_date: lastPeriod, end_date: null, notes: null });
      }
      await savePreferences.mutateAsync({
        onboarding_completed: true,
        average_cycle_length: withData && cycleLength ? Number(cycleLength) : null,
        average_period_length: withData && periodLength ? Number(periodLength) : null,
      });
      navigate({ to: "/app", replace: true });
    } catch {
      setError("Não conseguimos salvar agora. Seus dados continuam aqui — tente novamente.");
    }
  }

  const busy = savePreferences.isPending || createCycle.isPending;

  return (
    <AuthLayout>
      <div className="mb-2 flex gap-1.5" aria-label={`Etapa ${step + 1} de 2`}>
        {[0, 1].map((i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${i <= step ? "bg-primary" : "bg-border"}`}
          />
        ))}
      </div>

      {step === 0 ? (
        <section className="mt-6 animate-fade-up">
          <h1 className="text-3xl font-bold">Bem-vinda ao Bloom</h1>
          <p className="mt-3 text-muted-foreground">
            Aqui você registra menstruação, sintomas e humor no seu ritmo. Nada é obrigatório, e
            você pode mudar tudo depois.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">
            Os dados que você informa servem para organizar seu acompanhamento e estimar datas
            futuras. As estimativas são aproximadas.
          </p>
          <div className="mt-8 space-y-3">
            <Button className="min-h-12 w-full rounded-full" onClick={() => setStep(1)}>
              Continuar
            </Button>
            <Button
              variant="ghost"
              className="min-h-12 w-full rounded-full"
              onClick={() => finish(false)}
            >
              Pular e ir para o app
            </Button>
          </div>
        </section>
      ) : (
        <section className="mt-6 animate-fade-up">
          <h1 className="text-2xl font-bold">Algumas perguntas opcionais</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Você pode responder só o que quiser, ou pular esta etapa.
          </p>

          <div className="mt-6 space-y-5">
            <div className="space-y-2">
              <Label htmlFor="last-period">Quando começou sua última menstruação?</Label>
              <Input
                id="last-period"
                type="date"
                max={todayISO()}
                value={lastPeriod}
                onChange={(e) => setLastPeriod(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="period-length">Quantos dias costuma durar o sangramento?</Label>
              <Input
                id="period-length"
                type="number"
                min={1}
                max={15}
                inputMode="numeric"
                value={periodLength}
                onChange={(e) => setPeriodLength(e.target.value)}
                className="h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cycle-length">Quantos dias costuma durar seu ciclo?</Label>
              <Input
                id="cycle-length"
                type="number"
                min={15}
                max={90}
                inputMode="numeric"
                value={cycleLength}
                onChange={(e) => setCycleLength(e.target.value)}
                className="h-12 rounded-xl"
              />
              <p className="text-xs text-muted-foreground">
                Do primeiro dia de uma menstruação até o primeiro dia da próxima. Ciclos irregulares
                são aceitos.
              </p>
            </div>
          </div>

          {error ? (
            <p role="alert" className="mt-4 rounded-2xl bg-accent/70 p-3 text-sm">
              {error}
            </p>
          ) : null}

          <div className="mt-8 space-y-3">
            <Button
              className="min-h-12 w-full rounded-full"
              disabled={busy}
              onClick={() => finish(true)}
            >
              {busy ? "Salvando…" : "Salvar e começar"}
            </Button>
            <Button
              variant="ghost"
              className="min-h-12 w-full rounded-full"
              disabled={busy}
              onClick={() => finish(false)}
            >
              Prefiro não informar agora
            </Button>
          </div>
        </section>
      )}
    </AuthLayout>
  );
}
