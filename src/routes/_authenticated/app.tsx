import { createFileRoute, Outlet } from "@tanstack/react-router";
import { BottomNav } from "@/components/bloom/BottomNav";

export const Route = createFileRoute("/_authenticated/app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-5 pt-8 pb-28">
        <Outlet />
      </div>
      <BottomNav />
    </div>
  );
}
