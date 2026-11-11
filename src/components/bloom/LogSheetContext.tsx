import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { FlowerSection } from "./DayFlower";
import { DayLogSheet } from "./DayLogSheet";
import { PetalBurst } from "./Feedback";

interface LogSheetState {
  date: string | null;
  section: FlowerSection | null;
}

interface LogSheetApi {
  openLog: (date: string, section?: FlowerSection) => void;
  celebrate: () => void;
}

const LogSheetContext = createContext<LogSheetApi>({
  openLog: () => undefined,
  celebrate: () => undefined,
});

/** Disponibiliza o registro diário (folha de registro) para qualquer tela do app. */
export function LogSheetProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LogSheetState>({ date: null, section: null });
  const [burst, setBurst] = useState(0);

  const openLog = useCallback((date: string, section?: FlowerSection) => {
    setState({ date, section: section ?? null });
  }, []);
  const celebrate = useCallback(() => setBurst((n) => n + 1), []);
  const api = useMemo(() => ({ openLog, celebrate }), [openLog, celebrate]);

  return (
    <LogSheetContext.Provider value={api}>
      {children}
      <DayLogSheet
        date={state.date}
        focusSection={state.section}
        open={state.date !== null}
        onOpenChange={(open) => {
          if (!open) setState({ date: null, section: null });
        }}
        onSaved={celebrate}
      />
      <PetalBurst trigger={burst} />
    </LogSheetContext.Provider>
  );
}

export function useLogSheet(): LogSheetApi {
  return useContext(LogSheetContext);
}
