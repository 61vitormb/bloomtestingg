import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { CalendarRange, ChevronRight, Download, LogOut, ShieldCheck, Trash2, UserRound, X, Pencil, Sparkles, Palette, Info, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { exportAllData } from "@/services/bloom";
import { useAuth } from "@/hooks/useAuth";
import { useDeleteAllRecords, usePreferences, useProfile, useUpdatePreferences, useUpdateProfile } from "@/hooks/useBloomData";

export const Route = createFileRoute("/_authenticated/app/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Bloom" },
      { name: "description", content: "Perfil, preferências, privacidade e seus dados." },
      { property: "og:title", content: "Ajustes — Bloom" },
      { property: "og:description", content: "Controle total sobre seus dados no Bloom." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

  useEffect(() => { if (profile.data) setDisplayName(profile.data.display_name ?? ""); }, [profile.data]);
  useEffect(() => {
    if (!preferences.data) return;
    setCycleLength(preferences.data.average_cycle_length?.toString() ?? "");
    setPeriodLength(preferences.data.average_period_length?.toString() ?? "");
  }, [preferences.data]);

  async function saveCycle() {
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
    await updatePreferences.mutateAsync({ average_cycle_length: cycle, average_period_length: period });
  }

  async function handleExport() {
    setExporting(true);
    try {
      const payload = await exportAllData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `bloom-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Arquivo com seus dados gerado.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível exportar seus dados agora.");
    } finally { setExporting(false); }
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/entrar", replace: true });
  }

  return (
    <div className="space-y-5 pb-2">
      <header>
        <div className="flex items-center justify-between">
          <span className="size-11" aria-hidden="true" />
          <h1 className="text-xl font-bold text-neon">Meus Dados</h1>
          <Link to="/app" aria-label="Fechar" className="press flex size-11 items-center justify-center rounded-full bg-secondary"><X className="size-5" aria-hidden="true" /></Link>
        </div>
        <div className="mt-4 text-center">
          <div className="relative mx-auto size-24">
            <div className="flex size-24 items-center justify-center rounded-full bg-foreground text-3xl font-bold text-primary-foreground" aria-hidden="true">
              {(displayName || user?.email || "B").slice(0, 1).toUpperCase()}
            </div>
            <button type="button" aria-label="Editar nome" onClick={() => { const d = document.getElementById("edit-user") as HTMLDetailsElement | null; if (d) { d.open = true; document.getElementById("display-name")?.focus(); } }} className="press absolute -right-1 bottom-0 flex size-11 items-center justify-center rounded-full border-4 border-background bg-neon text-primary-foreground"><Pencil className="size-4" aria-hidden="true" /></button>
          </div>
          <p className="mt-3 text-lg font-bold">{displayName || "Sem nome"}</p>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </header>

      <SettingsGroup label="Usuário">
        <details id="edit-user">
          <summary className="settings-row"><UserRound aria-hidden="true" /><span>Editar dados pessoais</span><ChevronRight aria-hidden="true" /></summary>
          <div className="space-y-3 border-t border-border p-4">
            <Label htmlFor="display-name">Como quer ser chamada?</Label>
            <Input id="display-name" className="min-h-12" maxLength={80} value={displayName} onChange={(event) => setDisplayName(event.target.value)} placeholder="Opcional" />
            <Button className="min-h-11 w-full rounded-full" disabled={updateProfile.isPending} onClick={() => updateProfile.mutate({ display_name: displayName.trim() || null })}>Salvar nome</Button>
          </div>
        </details>
      </SettingsGroup>

      <SettingsGroup label="Ciclo">
        <details>
          <summary className="settings-row"><CalendarRange aria-hidden="true" /><span>Preferências do ciclo</span><ChevronRight aria-hidden="true" /></summary>
          <div className="space-y-3 border-t border-border p-4">
            <div><Label htmlFor="cycle-length">Duração média do ciclo</Label><Input id="cycle-length" className="mt-2 min-h-12" type="number" inputMode="numeric" min={15} max={90} value={cycleLength} onChange={(event) => setCycleLength(event.target.value)} /></div>
            <div><Label htmlFor="period-length">Duração média do sangramento</Label><Input id="period-length" className="mt-2 min-h-12" type="number" inputMode="numeric" min={1} max={15} value={periodLength} onChange={(event) => setPeriodLength(event.target.value)} /></div>
            <Button className="min-h-11 w-full rounded-full" disabled={updatePreferences.isPending} onClick={saveCycle}>Salvar ciclo</Button>
          </div>
        </details>
        <Link to="/app/historico" className="settings-row border-t border-border"><CalendarRange aria-hidden="true" /><span>Histórico de ciclos</span><ChevronRight aria-hidden="true" /></Link>
      </SettingsGroup>

      <SettingsGroup label="Preferências">
        <div className="settings-row"><span>Lembretes de registro</span><Switch aria-label="Lembretes de registro" checked={preferences.data?.notifications_enabled ?? false} onCheckedChange={(checked) => updatePreferences.mutate({ notifications_enabled: checked })} /></div>
        <div className="flex min-h-14 items-center justify-between gap-4 border-t border-border px-4">
          <Label htmlFor="temperature-unit">Temperatura</Label>
          <Select value={preferences.data?.temperature_unit ?? "celsius"} onValueChange={(value) => updatePreferences.mutate({ temperature_unit: value === "fahrenheit" ? "fahrenheit" : "celsius" })}>
            <SelectTrigger id="temperature-unit" className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="celsius">Celsius</SelectItem><SelectItem value="fahrenheit">Fahrenheit</SelectItem></SelectContent>
          </Select>
        </div>
      </SettingsGroup>

      <SettingsGroup label="Assinatura">
        <div className="settings-row"><Sparkles aria-hidden="true" /><span>Planos & Assinatura</span><span className="flex-none! text-xs text-muted-foreground">Gratuito</span></div>
      </SettingsGroup>

      <SettingsGroup label="Personalização">
        <div className="settings-row"><Palette aria-hidden="true" /><span>Tema</span><span className="flex-none! text-xs text-muted-foreground">Monocromático</span></div>
      </SettingsGroup>

      <SettingsGroup label="Ajuda">
        <details>
          <summary className="settings-row"><Info aria-hidden="true" /><span>Sobre o Bloom</span><ChevronRight aria-hidden="true" /></summary>
          <p className="border-t border-border p-4 text-sm text-muted-foreground">O Bloom organiza seus registros de ciclo, sintomas e humor. Seus dados ficam privados na sua conta.</p>
        </details>
        <details className="border-t border-border">
          <summary className="settings-row"><HelpCircle aria-hidden="true" /><span>Perguntas frequentes</span><ChevronRight aria-hidden="true" /></summary>
          <div className="space-y-2 border-t border-border p-4 text-sm text-muted-foreground">
            <p><strong className="text-foreground">As previsões são exatas?</strong> Não. São estimativas baseadas nos seus registros.</p>
            <p><strong className="text-foreground">Posso usar como contraceptivo?</strong> Não. O Bloom não é um método contraceptivo.</p>
          </div>
        </details>
      </SettingsGroup>

      <SettingsGroup label="Privacidade">
        <Button variant="ghost" className="settings-row h-auto w-full justify-start rounded-none" onClick={handleExport} disabled={exporting}><Download aria-hidden="true" /><span>{exporting ? "Preparando arquivo…" : "Exportar meus dados"}</span><ChevronRight className="ml-auto" aria-hidden="true" /></Button>
        <Button variant="ghost" className="settings-row h-auto w-full justify-start rounded-none border-t border-border text-destructive hover:text-destructive" disabled={deleteAll.isPending} onClick={() => { if (window.confirm("Excluir TODOS os seus registros? Essa ação não pode ser desfeita.")) deleteAll.mutate(undefined); }}><Trash2 aria-hidden="true" /><span>Excluir meus registros</span><ChevronRight className="ml-auto" aria-hidden="true" /></Button>
      </SettingsGroup>

      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />Seus registros são privados e as previsões são apenas estimativas.</p>
      <Button variant="outline" className="min-h-12 w-full rounded-full border-destructive/40 text-destructive hover:text-destructive" onClick={signOut}><LogOut aria-hidden="true" />Sair</Button>
    </div>
  );
}

function SettingsGroup({ label, children }: { label: string; children: ReactNode }) {
  return <section><h2 className="mb-2 px-2 text-[11px] font-bold uppercase text-muted-foreground">{label}</h2><div className="overflow-hidden rounded-2xl border border-border">{children}</div></section>;
}