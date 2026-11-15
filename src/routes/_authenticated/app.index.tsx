import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Droplet } from "lucide-react";
import { DayLogSheet } from "@/components/bloom/DayLogSheet";
import { PHASE_INFO } from "@/domain/catalog";
import { addDays, buildCycleOverview, parseISODate, type CycleRecord } from "@/domain/cycle";
import { todayISO } from "@/lib/format";
import { useCycles, useDailyLogs, usePreferences, useProfile } from "@/hooks/useBloomData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/")({
  head: () => ({
    meta: [
      { title: "Home — Bloom" },
      { name: "description", content: "Your current cycle phase, week and daily overview." },
      { property: "og:title", content: "Home — Bloom" },
      { property: "og:description", content: "Current phase, cycle length and daily overview." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomeScreen,
});

const NAVY = "#1f2a44";
const LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

function ordinal(n: number) {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
  return `${n}${s}`;
}

function HomeScreen() {
  const navigate = useNavigate();
  const today = todayISO();
  const profile = useProfile();
  const preferences = usePreferences();
  const cycles = useCycles();
  const dailyLogs = useDailyLogs();
  const [selected, setSelected] = useState(today);
  const [sheetDate, setSheetDate] = useState<string | null>(null);

  useEffect(() => {
    if (preferences.data?.onboarding_completed === false) navigate({ to: "/onboarding", replace: true });
  }, [preferences.data, navigate]);

  const records: CycleRecord[] = useMemo(
    () => (cycles.data ?? []).map(({ id, start_date, end_date }) => ({ id, start_date, end_date })),
    [cycles.data],
  );
  const overview = useMemo(
    () =>
      buildCycleOverview(records, selected, {
        cycleLength: preferences.data?.average_cycle_length ?? null,
        periodLength: preferences.data?.average_period_length ?? null,
      }),
    [records, selected, preferences.data],
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const name = (profile.data as { display_name?: string | null } | undefined)?.display_name?.split(" ")[0] ?? "Hi";
  const days = Array.from({ length: 9 }, (_, i) => addDays(selected, i - 4));
  const flowDays = new Set((dailyLogs.data ?? []).filter((l) => l.flow_intensity && l.flow_intensity !== "none").map((l) => l.log_date));
  const phase = overview.phase ? PHASE_INFO[overview.phase].label : "—";
  const ratio = overview.dayOfCycle ? Math.min(1, overview.dayOfCycle / Math.max(overview.cycleLength.value, 1)) : 0;

  const R = 80;
  const C = 2 * Math.PI * R;
  const angle = ratio * 2 * Math.PI - Math.PI / 2;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden" style={{ color: NAVY }}>
      <header className="flex items-start justify-between pt-2">
        <div>
          <h1 className="text-[1.75rem] leading-tight font-bold">
            {greeting} <span aria-hidden="true">🌞</span>
          </h1>
          <p className="mt-0.5 text-lg">
            {name} !{" "}
            <span className="text-[#8a93a8]">
              {overview.dayOfCycle ? `It's your ${ordinal(overview.dayOfCycle)} day.` : "Log your period to start."}
            </span>
          </p>
        </div>
        <Link to="/app/calendario" aria-label="Open calendar" className="press mt-1 p-1">
          <CalendarDays className="size-7" strokeWidth={1.6} />
        </Link>
      </header>

      <ul className="-mx-2 mt-6 grid grid-cols-9 items-start" aria-label="Week">
        {days.map((d, i) => {
          const active = d === selected;
          const edge = i === 0 || i === 8;
          const dot = flowDays.has(d);
          return (
            <li key={d} className="flex justify-center">
              <button
                type="button"
                onClick={() => (active ? setSheetDate(d) : setSelected(d))}
                aria-pressed={active}
                aria-label={d}
                className={cn(
                  "flex w-12 flex-col items-center gap-3 rounded-full py-2 text-sm font-medium",
                  active ? "text-white" : edge ? "text-[#c3c8d4]" : "",
                )}
                style={active ? { background: NAVY } : undefined}
              >
                <span className={cn("text-xs", !active && "text-[#9aa1b2]")}>{LETTERS[parseISODate(d).getDay()]}</span>
                {active ? (
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#f7a9ad] text-sm" style={{ color: NAVY }}>
                    {Number(d.slice(-2))}
                  </span>
                ) : (
                  <span>{Number(d.slice(-2))}</span>
                )}
                {!active && <span className={cn("size-2 rounded-full", dot ? "bg-[#ee4b55]" : "bg-transparent")} />}
              </button>
            </li>
          );
        })}
      </ul>

      <section className="flex min-h-0 flex-1 items-center justify-center py-4">
        <div className="relative aspect-square h-full max-h-[300px]">
          <svg viewBox="0 0 200 200" className="absolute inset-0 size-full drop-shadow-[0_0_18px_rgba(247,169,190,0.55)]" aria-hidden="true">
            <defs>
              <linearGradient id="seg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ef7f8a" />
                <stop offset="1" stopColor="#ee4048" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r={R} fill="none" stroke="#fde0e8" strokeWidth="26" />
            <circle cx="100" cy="100" r="62" fill="white" style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.08))" }} />
            {ratio > 0 && (
              <>
                <circle
                  cx="100" cy="100" r={R} fill="none" stroke="url(#seg)" strokeWidth="18" strokeLinecap="round"
                  strokeDasharray={C} strokeDashoffset={C * (1 - ratio)} transform="rotate(-90 100 100)"
                  className="transition-[stroke-dashoffset] duration-700"
                />
                <circle cx={100 + R * Math.cos(angle)} cy={100 + R * Math.sin(angle)} r="9" fill="#f59ea4" stroke="white" strokeWidth="2.5" />
              </>
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs text-[#6b7389]">Current Phase</span>
            <span className="mt-1 text-lg font-bold tracking-wide text-[#f06aa6] uppercase">{phase}</span>
            <span className="mt-4 text-xs text-[#6b7389]">Average Cycle Length</span>
            <span className="mt-1 text-lg font-bold">{overview.cycleLength.value} DAYS</span>
          </div>
        </div>
      </section>

      <ul className="flex items-start justify-between px-1">
        <Stat emoji="🔥" label="Steps" value="—" />
        <Stat emoji="😴" label="Sleep" value="—" offset />
        <Stat emoji="💧" label="Water" value="—" />
      </ul>

      <div className="-mx-4 mt-5 mb-2 flex snap-x gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        <div className="flex min-w-[85%] snap-start items-center gap-3 rounded-xl bg-[#e6f7fd] px-4 py-4">
          <Droplet className="size-5 fill-[#2aa6e0] text-[#2aa6e0]" />
          <div>
            <p className="text-sm font-bold">Hydration Level : —</p>
            <p className="text-sm text-[#6b7389]">You need to drink more water.</p>
          </div>
        </div>
        <button type="button" onClick={() => setSheetDate(today)} className="flex min-w-[85%] snap-start items-center gap-3 rounded-xl bg-[#fff8dc] px-4 py-4 text-left">
          <span aria-hidden="true">🌸</span>
          <div>
            <p className="text-sm font-bold">Predicted next period</p>
            <p className="text-sm text-[#6b7389]">
              {overview.daysUntilNextPeriod !== null ? `In about ${overview.daysUntilNextPeriod} days. Tap to log today.` : "Tap to log today."}
            </p>
          </div>
        </button>
      </div>

      <DayLogSheet date={sheetDate} open={sheetDate !== null} onOpenChange={(o) => setSheetDate(o ? sheetDate : null)} />
    </div>
  );
}

function Stat({ emoji, label, value, offset }: { emoji: string; label: string; value: string; offset?: boolean }) {
  return (
    <li className={cn("flex size-[104px] flex-col items-center justify-center rounded-full bg-white shadow-[0_8px_24px_-10px_rgba(31,42,68,0.25)]", offset && "mt-8")}>
      <span aria-hidden="true">{emoji}</span>
      <span className="text-xs font-semibold text-[#6b7389]">{label}</span>
      <span className="text-xl font-bold">{value}</span>
    </li>
  );
}
