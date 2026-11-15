import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Annoyed, BatteryLow, Droplets, Frown, Heart, Laugh, Leaf, Meh, Smile, Sparkles, Zap, Angry, type LucideIcon } from "lucide-react";
import { MOOD_OPTIONS } from "@/domain/catalog";
import { todayISO } from "@/lib/format";
import { useMoodLogs, useSaveMoodLog } from "@/hooks/useBloomData";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/humor")({
  head: () => ({
    meta: [
      { title: "Humor — Bloom" },
      { name: "description", content: "Conte como você está se sentindo hoje." },
      { property: "og:title", content: "Humor — Bloom" },
      { property: "og:description", content: "Registre seu humor de hoje com um toque." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MoodScreen,
});

const ICONS: Record<string, LucideIcon> = {
  happy: Smile, calm: Leaf, loving: Heart, excited: Laugh, energized: Zap, neutral: Meh,
  anxious: Annoyed, sad: Frown, irritated: Angry, sensitive: Droplets, tired: BatteryLow,
};
const TINTS = ["text-primary", "text-coral", "text-[#b48ef0]"];

function MoodScreen() {
  const today = todayISO();
  const moodLogs = useMoodLogs();
  const saveMood = useSaveMoodLog();
  const existing = moodLogs.data?.find((l) => l.log_date === today) ?? null;
  const [index, setIndex] = useState(2);
  const [sheet, setSheet] = useState(false);
  const scroller = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const saved = existing?.moods[0];
    const i = MOOD_OPTIONS.findIndex((m) => m.value === saved);
    if (i >= 0) setIndex(i);
  }, [existing]);

  useEffect(() => {
    const el = scroller.current?.children[index] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [index]);

  function pick(i: number) {
    setIndex(i);
    saveMood.mutate({ log_date: today, moods: [MOOD_OPTIONS[i]!.value], intensity: existing?.intensity ?? null, notes: existing?.notes ?? "" });
  }

  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "short" }).format(new Date());
  const current = MOOD_OPTIONS[index] ?? MOOD_OPTIONS[0];

  return (
    <div className="flex min-h-full flex-col">
      <p className="pt-2 text-center text-[13px] text-muted-foreground">{dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1)}</p>
      <h1 className="mx-auto mt-6 max-w-[16rem] text-center text-[28px] leading-tight font-semibold text-primary">
        Como você está se sentindo hoje?
      </h1>

      <ul ref={scroller} aria-label="Opções de humor" className="-mx-4 mt-10 flex snap-x snap-mandatory items-center gap-4 overflow-x-auto px-[38%] py-6 [scrollbar-width:none]">
        {MOOD_OPTIONS.map((m, i) => {
          const Icon = ICONS[m.value] ?? Sparkles;
          const active = i === index;
          return (
            <li key={m.value} className="snap-center">
              <button
                type="button"
                aria-pressed={active}
                aria-label={m.label}
                onClick={() => pick(i)}
                className={cn(
                  "flex shrink-0 flex-col items-center justify-center rounded-full bg-white transition-all duration-300",
                  active ? "size-28 shadow-[0_12px_32px_-10px_rgb(244_91_154/0.45)]" : "size-16 bg-muted opacity-80",
                )}
              >
                <span className={cn("flex items-center justify-center rounded-full bg-pink-soft", active ? "size-12" : "size-9")}>
                  <Icon className={cn(TINTS[i % 3], active ? "size-6" : "size-4")} aria-hidden="true" />
                </span>
                {active ? <span className="mt-1.5 text-[13px] font-semibold">{m.label}</span> : null}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-center text-xs text-muted-foreground" aria-live="polite">
        {saveMood.isPending ? "Salvando…" : saveMood.isError ? "Não foi possível salvar. Toque novamente." : existing?.moods.length ? `Registrado: ${current.label}` : "Toque em um humor para registrar."}
      </p>

      <div className="mt-auto mb-28 grid grid-cols-2 gap-3 pt-10">
        <button type="button" onClick={() => setSheet(true)} className="bloom-card flex min-h-36 flex-col justify-between p-4 text-left">
          <span className="text-[17px] leading-snug font-semibold">Registrar sintomas</span>
          <span className="flex size-9 items-center justify-center self-end rounded-full bg-pink-soft text-primary"><ArrowUpRight className="size-4" /></span>
        </button>
        <Link to="/app/estatisticas" className="bloom-card flex min-h-36 flex-col justify-between p-4">
          <span className="text-[17px] leading-snug font-semibold">Ver estatísticas de humor</span>
          <span className="flex size-9 items-center justify-center self-end rounded-full bg-pink-soft text-primary"><ArrowUpRight className="size-4" /></span>
        </Link>
      </div>
      <DayLogSheet date={sheet ? today : null} open={sheet} onOpenChange={setSheet} />
    </div>
  );
}
