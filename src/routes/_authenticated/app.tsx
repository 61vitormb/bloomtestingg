import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/bloom/AppShell";
import { LogSheetProvider } from "@/components/bloom/LogSheetContext";
import { ReminderRunner } from "@/components/bloom/ReminderRunner";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <LogSheetProvider>
      <AppShell>
        <Outlet />
      </AppShell>
      <ReminderRunner />
    </LogSheetProvider>
  );
}
