import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/bloom/BottomNav";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-dvh bg-background">
      <main className="mx-auto h-dvh max-w-md overflow-y-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
