import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Download, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { exportAllData } from "@/services/bloom";
import { useAuth } from "@/hooks/useAuth";
import {
  useDeleteAllRecords,
  usePreferences,
  useProfile,
  useUpdatePreferences,
  useUpdateProfile,
} from "@/hooks/useBloomData";

export const Route = createFileRoute("/_authenticated/app/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Bloom" },
      { name: "description", content: "Perfil, preferências, privacidade e seus dados." },
      { property: "og:title", content: "Ajustes — Bloom" },
      { property: "og:description", content: "Controle total sobre seus dados no Bloom." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsScreen,
});

function SettingsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const profile = useProfile();
  const preferences = usePreferences();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const deleteAll = useDeleteAllRecords();

  const [displayName, setDisplayName] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (profile.data) setDisplayName(profile.data.display_name ?? "");
  }, [profile.data]);

  useEffect(() => {
    if (!preferences.data) return;
    setCycleLength(preferences.data.average_cycle_length?.toString() ?? "");
    setPeriodLength(preferences.data.average_period_length?.toString() ?? "");
  }, [preferences.data]);

  async function handleSaveProfile() {
    await updateProfile.mutateAsync({ display_name: displayName.trim() || null });
  }

  async function handleSaveCycleDefaults() {
    const cycle = cycleLength ? Number(cycleLength) : null;
    const period = periodLength ? Number(periodLength) : null;
    if (cycle !== null && (!Number.isInteger(cycle) || cycle < 15 || cycle > 90)) {
      toast.error("A duração do ciclo deve ficar entre 15 e 90 dias.");
      return;
    }
    if (period !== null && (!Number.isInteger(period) || period < 1 || period > 15)) {
      toast.error("A duração do sangramento deve ficar entre 1 e 15 dias.");
      return;
    }
    await updatePreferences.mutateAsync({
      average_cycle_length: cycle,
      average_period_length: period,
    });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const payload = await exportAllData();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bloom-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo com seus dados gerado.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível exportar seus dados agora.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleDeleteAll() {
    if (
      !window.confirm(
        "Excluir TODOS os seus registros de ciclos, sintomas e humor? Essa ação não pode ser desfeita.",
      )
    )
      return;
    await deleteAll.mutateAsync(undefined);
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Ajustes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seu perfil, suas preferências e o controle dos seus dados.
        </p>
      </header>

      <section className="bloom-card space-y-3 p-4">
        <h2 className="text-base font-semibold">Perfil</h2>
        <div className="space-y-2">
          <Label htmlFor="display-name">Como quer ser chamada?</Label>
          <Input
            id="display-name"
            className="min-h-12"
            maxLength={80}
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Opcional"
          />
        </div>
        <p className="text-xs text-muted-foreground">Conta: {user?.email}</p>
        <Button
          className="min-h-12 w-full"
          onClick={handleSaveProfile}
          disabled={updateProfile.isPending}
        >
          Salvar perfil
        </Button>
      </section>

      <section className="bloom-card space-y-3 p-4">
        <h2 className="text-base font-semibold">Ciclo</h2>
        <p className="text-xs text-muted-foreground">
          Usamos esses valores só enquanto você ainda não tem ciclos registrados suficientes.
        </p>
        <div className="space-y-2">
          <Label htmlFor="cycle-length">Duração média do ciclo (dias)</Label>
          <Input
            id="cycle-length"
            className="min-h-12"
            type="number"
            inputMode="numeric"
            min={15}
            max={90}
            value={cycleLength}
            onChange={(event) => setCycleLength(event.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="period-length">Duração média do sangramento (dias)</Label>
          <Input
            id="period-length"
            className="min-h-12"
            type="number"
            inputMode="numeric"
            min={1}
            max={15}
            value={periodLength}
            onChange={(event) => setPeriodLength(event.target.value)}
          />
        </div>
        <Button
          className="min-h-12 w-full"
          onClick={handleSaveCycleDefaults}
          disabled={updatePreferences.isPending}
        >
          Salvar valores do ciclo
        </Button>
      </section>

      <section className="bloom-card space-y-4 p-4">
        <h2 className="text-base font-semibold">Preferências</h2>
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="notifications" className="text-sm">
              Lembretes de registro
            </Label>
            <p className="text-xs text-muted-foreground">
              Guardamos sua escolha; nada é enviado sem sua permissão no dispositivo.
            </p>
          </div>
          <Switch
            id="notifications"
            checked={preferences.data?.notifications_enabled ?? false}
            onCheckedChange={(checked) =>
              updatePreferences.mutate({ notifications_enabled: checked })
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="temperature-unit">Unidade de temperatura</Label>
          <Select
            value={preferences.data?.temperature_unit ?? "celsius"}
            onValueChange={(value) => updatePreferences.mutate({ temperature_unit: value })}
          >
            <SelectTrigger id="temperature-unit" className="min-h-12">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="celsius">Celsius (°C)</SelectItem>
              <SelectItem value="fahrenheit">Fahrenheit (°F)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </section>

      <section className="bloom-card space-y-3 p-4">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Privacidade e seus dados
        </h2>
        <p className="text-sm text-muted-foreground">
          Seus registros ficam na sua conta e só você pode lê-los. Não vendemos nem compartilhamos
          seus dados. O Bloom mostra estimativas com base no que você registra e não substitui
          avaliação profissional de saúde.
        </p>
        <Button
          variant="outline"
          className="min-h-12 w-full"
          onClick={handleExport}
          disabled={exporting}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {exporting ? "Preparando arquivo…" : "Exportar meus dados (JSON)"}
        </Button>
        <Button
          variant="outline"
          className="min-h-12 w-full text-destructive hover:text-destructive"
          onClick={handleDeleteAll}
          disabled={deleteAll.isPending}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Excluir todos os meus registros
        </Button>
      </section>

      <section className="bloom-card space-y-3 p-4">
        <h2 className="text-base font-semibold">Conta</h2>
        <Button variant="ghost" className="min-h-12 w-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sair da conta
        </Button>
      </section>
    </div>
  );
}
