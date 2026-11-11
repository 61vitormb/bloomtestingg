import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Clock, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/bloom/Feedback";
import {
  ARTICLES,
  CONTENT_CATEGORIES,
  CONTENT_DISCLAIMER,
  articlesByCategory,
  type Article,
  type ContentCategory,
} from "@/domain/content";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/conteudo")({
  head: () => ({
    meta: [
      { title: "Conteúdo — Bloom" },
      {
        name: "description",
        content: "Central de informações sobre ciclo menstrual, sintomas e saúde menstrual.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ContentScreen,
});

const CATEGORY_STYLE: Record<ContentCategory, { bg: string; fg: string }> = {
  fases: { bg: "var(--phase-menstrual-soft)", fg: "var(--phase-menstrual)" },
  sintomas: { bg: "var(--phase-follicular-soft)", fg: "var(--phase-follicular)" },
  saude: { bg: "var(--phase-ovulatory-soft)", fg: "var(--phase-ovulatory)" },
  bloom: { bg: "var(--phase-luteal-soft)", fg: "var(--phase-luteal)" },
};

function ContentScreen() {
  const [category, setCategory] = useState<ContentCategory | "all">("all");
  const [article, setArticle] = useState<Article | null>(null);
  const list = articlesByCategory(category);

  return (
    <div>
      <PageHeader
        eyebrow="Conteúdo"
        title="Central de informações"
        description="Explicações sobre o ciclo em linguagem simples e responsável."
      />

      <div
        role="radiogroup"
        aria-label="Categoria"
        className="scrollbar-none -mx-4 mb-6 flex gap-2 overflow-x-auto px-4"
      >
        {[{ value: "all" as const, label: `Tudo (${ARTICLES.length})` }, ...CONTENT_CATEGORIES].map(
          (c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              aria-pressed={category === c.value}
              onClick={() => setCategory(c.value)}
              className="bloom-chip shrink-0"
            >
              {c.label}
            </button>
          ),
        )}
      </div>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 stagger">
        {list.map((a) => {
          const style = CATEGORY_STYLE[a.category];
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setArticle(a)}
                className="bloom-card press group flex h-full w-full flex-col overflow-hidden text-left transition-shadow hover:shadow-[var(--shadow-lift)]"
              >
                <div
                  className="grain relative h-24 overflow-hidden"
                  style={{
                    background: `radial-gradient(120% 120% at 20% 10%, ${style.fg}55, transparent 60%), ${style.bg}`,
                  }}
                >
                  <svg
                    viewBox="-50 -50 100 100"
                    className="absolute -right-4 -bottom-6 size-28 opacity-80 transition-transform duration-700 group-hover:rotate-12"
                    aria-hidden="true"
                  >
                    {Array.from({ length: 5 }, (_, i) => (
                      <ellipse
                        key={i}
                        cx="0"
                        cy="-22"
                        rx="12"
                        ry="22"
                        fill={style.fg}
                        opacity="0.35"
                        transform={`rotate(${i * 72})`}
                      />
                    ))}
                  </svg>
                  <span
                    className="absolute top-3 left-4 rounded-full bg-card/80 px-2.5 py-1 text-[11px] font-semibold backdrop-blur"
                    style={{ color: style.fg }}
                  >
                    {CONTENT_CATEGORIES.find((c) => c.value === a.category)?.label}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h2 className="font-bold">{a.title}</h2>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{a.summary}</p>
                  <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {a.readingMinutes} min de leitura
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-8 flex items-start justify-center gap-2 text-center text-xs text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /> {CONTENT_DISCLAIMER}
      </p>

      <Dialog open={article !== null} onOpenChange={(o) => !o && setArticle(null)}>
        <DialogContent className="max-h-[88dvh] overflow-y-auto rounded-3xl sm:max-w-xl">
          {article ? (
            <>
              <DialogHeader className="text-left">
                <p className="eyebrow">
                  {CONTENT_CATEGORIES.find((c) => c.value === article.category)?.label}
                </p>
                <DialogTitle className="text-2xl">{article.title}</DialogTitle>
                <DialogDescription>{article.summary}</DialogDescription>
              </DialogHeader>
              <div className="space-y-5">
                {article.sections.map((s) => (
                  <section key={s.heading}>
                    <h3 className="font-semibold">{s.heading}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                  </section>
                ))}
              </div>
              <p className={cn("mt-2 rounded-2xl bg-secondary p-3 text-xs text-muted-foreground")}>
                {CONTENT_DISCLAIMER}
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
