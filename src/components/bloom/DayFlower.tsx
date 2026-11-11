import { Activity, Droplet, Moon, NotebookPen, Smile, Zap, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type FlowerSection = "flow" | "mood" | "symptoms" | "energy" | "sleep" | "notes";

export const FLOWER_PETALS: {
  id: FlowerSection;
  label: string;
  color: string;
  icon: LucideIcon;
}[] = [
  { id: "flow", label: "Fluxo", color: "var(--petal-rose)", icon: Droplet },
  { id: "mood", label: "Humor", color: "var(--petal-amber)", icon: Smile },
  { id: "symptoms", label: "Sintomas", color: "var(--petal-coral)", icon: Activity },
  { id: "energy", label: "Energia", color: "var(--petal-teal)", icon: Zap },
  { id: "sleep", label: "Sono", color: "var(--petal-blue)", icon: Moon },
  { id: "notes", label: "Diário", color: "var(--petal-lilac)", icon: NotebookPen },
];

// Pétala: triângulo arredondado que se abre para fora do centro (0,0)
const PETAL = "M0 -14 C 12 -16 38 -50 38 -78 C 38 -100 -38 -100 -38 -78 C -38 -50 -12 -16 0 -14 Z";

/**
 * "Flor do dia": cada pétala é uma categoria de registro. Pétalas preenchidas
 * indicam o que já foi registrado hoje; as vazias mostram só o contorno e um
 * botão compacto perto do centro. Cada pétala é um botão acessível.
 */
export function DayFlower({
  filled,
  onSelect,
  className,
}: {
  filled: Partial<Record<FlowerSection, boolean>>;
  onSelect: (section: FlowerSection) => void;
  className?: string;
}) {
  const count = FLOWER_PETALS.length;
  const done = FLOWER_PETALS.filter((p) => filled[p.id]).length;
  return (
    <div className={cn("relative mx-auto aspect-square w-full max-w-[300px]", className)}>
      <svg
        viewBox="-112 -112 224 224"
        className="size-full overflow-visible"
        role="group"
        aria-label={`Registro de hoje: ${done} de ${count} categorias preenchidas`}
      >
        {FLOWER_PETALS.map((petal, i) => {
          const angle = (360 / count) * i;
          const isFilled = Boolean(filled[petal.id]);
          const Icon = petal.icon;
          // posição do ícone: perto do centro quando vazio, no meio da pétala quando cheio
          const r = isFilled ? 62 : 34;
          const rad = ((angle - 90) * Math.PI) / 180;
          const ix = Math.cos(rad) * r;
          const iy = Math.sin(rad) * r;
          return (
            <g
              key={petal.id}
              role="button"
              tabIndex={0}
              aria-label={`${petal.label}: ${isFilled ? "registrado hoje" : "toque para registrar"}`}
              aria-pressed={isFilled}
              onClick={() => onSelect(petal.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(petal.id);
                }
              }}
              className="group cursor-pointer outline-none"
            >
              <g transform={`rotate(${angle})`}>
                <path
                  d={PETAL}
                  fill={isFilled ? petal.color : "transparent"}
                  stroke={petal.color}
                  strokeWidth={isFilled ? 0 : 1.6}
                  className="transition-all duration-500 group-hover:opacity-90 group-focus-visible:stroke-[3]"
                  style={{ transformOrigin: "0 0" }}
                />
                {!isFilled ? (
                  <path
                    d={PETAL}
                    fill={petal.color}
                    transform="translate(0 -14) scale(0.36)"
                    className="transition-transform duration-300 group-hover:scale-[0.4]"
                  />
                ) : null}
              </g>
              <Icon
                x={ix - 9}
                y={iy - 9}
                width={18}
                height={18}
                color="#fff"
                strokeWidth={2.4}
                aria-hidden="true"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
