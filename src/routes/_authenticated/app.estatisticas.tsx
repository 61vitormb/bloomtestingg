import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { moodLabel } from "@/domain/catalog";
import { addDays } from "@/domain/cycle";
import { todayISO } from "@/lib/format";
import { useMoodLogs } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/estatisticas")({
  head: () => ({
    meta: [
      { title: "Estatísticas de humor — Bloom" },
      { name: "description", content: "Veja quais humores você mais registrou em cada período." },
      { property: "og:title", content: "Estatísticas de humor — Bloom" },
      { property: "og:description", content: "Resumo dos seus registros de humor." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MoodStats,
});

const PERIODS = [7, 30, 90] as const;

function MoodStats() {
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);
  const logs = useMoodLogs();
  const from = addDays(todayISO(), -days + 1);
  const stats = useMemo(() => {
    const counts = new Map<string, number>();
    const inRange = (logs.data ?? []).filter((l) => l.log_date >= from);
    inRange.forEach((l) => l.moods.forEach((m) => counts.set(m, (counts.get(m) ?? 0) + 1)));
    return { total: inRange.length, rows: [...counts.entries()].sort((a, b) => b[1] - a[1]) };
  }, [logs.data, from]);
  const max = stats.rows[0]?.[1] ?? 1;

  return (
    <div className="space-y-5 pb-28">
      <Link to="/app/humor" className="flex w-fit items-center gap-1 py-2 text-sm"><ChevronLeft className="size-4" /> Voltar</Link>
      <h1 className="text-[26px] font-semibold text-primary">Estatísticas de humor</h1>
      <div className="flex gap-2">
        {PERIODS.map((p) => (
          <button key={p} type="button" onClick={() => setDays(p)} aria-pressed={days === p}
            className={cn("min-h-10 rounded-full px-4 text-sm font-medium", days === p ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {p} dias
          </button>
        ))}
      </div>
      {stats.rows.length ? (
        <>
          <p className="text-sm text-muted-foreground">
            Você registrou humor em {stats.total} {stats.total === 1 ? "dia" : "dias"}. O mais registrado foi <strong className="text-foreground">{moodLabel(stats.rows[0]![0]).toLowerCase()}</strong>.
          </p>
          <ul className="bloom-card space-y-3 p-4">
            {stats.rows.map(([m, n]) => (
              <li key={m}>
                <div className="flex justify-between text-sm"><span>{moodLabel(m)}</span><span className="text-muted-foreground">{n}</span></div>
                <div className="mt-1 h-2 rounded-full bg-pink-soft"><div className="h-2 rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="bloom-card p-4 text-sm text-muted-foreground">Nenhum humor registrado neste período.</p>
      )}
    </div>
  );
}
