import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  CalendarRange,
  ChevronRight,
  Download,
  FileJson,
  KeyRound,
  LaptopMinimal,
  LogOut,
  Moon,
  Palette,
  Plus,
  ShieldCheck,
  Trash2,
  UserRound,
  Volume2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/bloom/Feedback";
import { supabase } from "@/integrations/supabase/client";
import { deleteAccount, exportAllData, exportHistoryCsv } from "@/services/bloom";
import { useAuth } from "@/hooks/useAuth";
import {
  errorMessage,
  useChangePassword,
  useDeleteAllRecords,
  usePreferences,
  useProfile,
  useSignOutOthers,
  useUpdatePreferences,
  useUpdateProfile,
} from "@/hooks/useBloomData";
import {
  resetDeviceSettings,
  useDeviceSettings,
  writeDeviceSettings,
  type ThemeMode,
} from "@/lib/device-settings";
import { downloadText } from "@/lib/download";
import { formatLong, todayISO } from "@/lib/format";
import { playSound } from "@/lib/sound";
import {
  cyclePreferencesSchema,
  firstError,
  parseOptionalInt,
  passwordChangeSchema,
  reminderSchema,
} from "@/domain/validation";
import type { CustomReminder } from "@/domain/reminders";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/app/ajustes")({
  head: () => ({
    meta: [
      { title: "Ajustes — Bloom" },
      {
        name: "description",
        content: "Perfil, notificações, sons, aparência, privacidade e seus dados.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsScreen,
});

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];

function SettingsScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, session } = useAuth();
  const profile = useProfile();
  const preferences = usePreferences();
  const updateProfile = useUpdateProfile();
  const updatePreferences = useUpdatePreferences();
  const deleteAll = useDeleteAllRecords();
  const changePassword = useChangePassword();
  const signOutOthers = useSignOutOthers();
  const device = useDeviceSettings();

  const [displayName, setDisplayName] = useState("");
  const [cycleLength, setCycleLength] = useState("");
  const [periodLength, setPeriodLength] = useState("");
  const [cycleError, setCycleError] = useState<string | null>(null);
  const [password, setPassword] = useState({ password: "", confirm: "" });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<"json" | "csv" | null>(null);
  const [danger, setDanger] = useState<"records" | "account" | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [newReminder, setNewReminder] = useState<CustomReminder | null>(null);
  const [reminderError, setReminderError] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    if (profile.data) setDisplayName(profile.data.display_name ?? "");
  }, [profile.data]);
  useEffect(() => {
    if (!preferences.data) return;
    setCycleLength(preferences.data.average_cycle_length?.toString() ?? "");
    setPeriodLength(preferences.data.average_period_length?.toString() ?? "");
  }, [preferences.data]);
  useEffect(() => {
    setPermission(typeof Notification === "undefined" ? "unsupported" : Notification.permission);
  }, []);

  const provider = (user?.app_metadata?.["provider"] as string | undefined) ?? "email";
  const usesPassword = provider === "email";
  const notificationsOn = preferences.data?.notifications_enabled ?? false;
  const reminders = device.reminders;

  async function saveCycle() {
    setCycleError(null);
    const parsed = cyclePreferencesSchema.safeParse({
      average_cycle_length: parseOptionalInt(cycleLength),
      average_period_length: parseOptionalInt(periodLength),
    });
    if (!parsed.success) {
      setCycleError(firstError(parsed.error));
      return;
    }
    await updatePreferences.mutateAsync(parsed.data);
  }

  async function savePassword() {
    setPasswordError(null);
    const parsed = passwordChangeSchema.safeParse(password);
    if (!parsed.success) {
      setPasswordError(firstError(parsed.error));
      return;
    }
    try {
      await changePassword.mutateAsync(password);
      setPassword({ password: "", confirm: "" });
    } catch (e) {
      setPasswordError(errorMessage(e));
    }
  }

  async function handleExport(kind: "json" | "csv") {
    setExporting(kind);
    try {
      if (kind === "json") {
        const payload = await exportAllData();
        downloadText(
          JSON.stringify(payload, null, 2),
          `bloom-meus-dados-${todayISO()}.json`,
          "application/json",
        );
      } else {
        downloadText(
          await exportHistoryCsv(),
          `bloom-meus-dados-${todayISO()}.csv`,
          "text/csv;charset=utf-8",
        );
      }
      playSound("save");
      toast.success("Arquivo com seus dados gerado neste aparelho.");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setExporting(null);
    }
  }

  async function toggleNotifications(on: boolean) {
    if (on && typeof Notification !== "undefined" && Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setPermission(result);
    }
    updatePreferences.mutate({ notifications_enabled: on });
  }

  function updateReminders(patch: Partial<typeof reminders>) {
    writeDeviceSettings({ reminders: { ...reminders, ...patch } });
    playSound("toggle");
  }

  function addReminder() {
    if (!newReminder) return;
    const parsed = reminderSchema.safeParse(newReminder);
    if (!parsed.success) {
      setReminderError(firstError(parsed.error));
      return;
    }
    updateReminders({ custom: [...reminders.custom, parsed.data] });
    setNewReminder(null);
    setReminderError(null);
    toast.success("Lembrete criado.");
  }

  async function signOut(scope: "local" | "global" = "local") {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope });
    navigate({ to: "/entrar", search: { modo: "login" }, replace: true });
  }

  async function confirmDanger() {
    setDeleting(true);
    try {
      if (danger === "records") {
        await deleteAll.mutateAsync(undefined);
      } else if (danger === "account") {
        await deleteAccount();
        queryClient.clear();
        resetDeviceSettings();
        toast.success("Sua conta e todos os dados foram excluídos.");
        navigate({ to: "/", replace: true });
      }
      setDanger(null);
      setConfirmText("");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeleting(false);
    }
  }

  const name = displayName || user?.email?.split("@")[0] || "Você";
  const memberSince = profile.data?.created_at
    ? formatLong(profile.data.created_at.slice(0, 10))
    : null;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader eyebrow="Ajustes" title="Perfil e preferências" />

      <section className="bloom-card bloom-gradient grain mb-6 flex items-center gap-4 overflow-hidden p-5 text-white">
        <div
          className="relative z-10 flex size-16 shrink-0 items-center justify-center rounded-full bg-white/25 text-2xl font-bold backdrop-blur"
          aria-hidden="true"
        >
          {name.slice(0, 1).toUpperCase()}
        </div>
        <div className="relative z-10 min-w-0">
          <p className="truncate text-lg font-bold">{name}</p>
          <p className="truncate text-sm text-white/85">{user?.email}</p>
          {memberSince ? (
            <p className="text-xs text-white/75">No Bloom desde {memberSince}</p>
          ) : null}
        </div>
      </section>

      <div className="space-y-6">
        <Group label="Conta">
          <Disclosure
            icon={<UserRound />}
            title="Informações pessoais"
            hint={displayName || "Sem nome"}
          >
            <Label htmlFor="display-name">Como quer ser chamada?</Label>
            <Input
              id="display-name"
              className="mt-2 h-12 rounded-xl"
              maxLength={80}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Opcional"
            />
            <p className="mt-2 text-xs text-muted-foreground">
              E-mail: {user?.email} · Acesso via{" "}
              {provider === "email" ? "e-mail e senha" : provider}
            </p>
            <Button
              className="mt-3 rounded-full"
              disabled={updateProfile.isPending}
              onClick={() => updateProfile.mutate({ display_name: displayName.trim() || null })}
            >
              Salvar nome
            </Button>
          </Disclosure>
          <Disclosure
            icon={<KeyRound />}
            title="Alterar senha"
            hint={usesPassword ? undefined : `Entrada via ${provider}`}
          >
            {usesPassword ? (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="new-password">Nova senha</Label>
                  <Input
                    id="new-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1 h-12 rounded-xl"
                    value={password.password}
                    onChange={(e) => setPassword({ ...password, password: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    className="mt-1 h-12 rounded-xl"
                    value={password.confirm}
                    onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Mínimo de 8 caracteres, com letras e números.
                </p>
                {passwordError ? (
                  <p role="alert" className="text-sm text-destructive">
                    {passwordError}
                  </p>
                ) : null}
                <Button
                  className="rounded-full"
                  onClick={savePassword}
                  disabled={changePassword.isPending}
                >
                  {changePassword.isPending ? "Alterando…" : "Alterar senha"}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sua conta usa login com {provider}. A senha é gerenciada por esse provedor.
              </p>
            )}
          </Disclosure>
        </Group>

        <Group label="Ciclo">
          <Disclosure
            icon={<CalendarRange />}
            title="Padrão do ciclo"
            hint="Usado enquanto houver poucos registros"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="cycle-length">Duração média do ciclo (dias)</Label>
                <Input
                  id="cycle-length"
                  className="mt-1 h-12 rounded-xl"
                  type="number"
                  inputMode="numeric"
                  min={15}
                  max={90}
                  value={cycleLength}
                  onChange={(e) => setCycleLength(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="period-length">Duração da menstruação (dias)</Label>
                <Input
                  id="period-length"
                  className="mt-1 h-12 rounded-xl"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={15}
                  value={periodLength}
                  onChange={(e) => setPeriodLength(e.target.value)}
                />
              </div>
            </div>
            {cycleError ? (
              <p role="alert" className="mt-2 text-sm text-destructive">
                {cycleError}
              </p>
            ) : null}
            <Button
              className="mt-3 rounded-full"
              disabled={updatePreferences.isPending}
              onClick={saveCycle}
            >
              Salvar ciclo
            </Button>
          </Disclosure>
          <Row>
            <Label htmlFor="temperature-unit" className="flex-1">
              Unidade de temperatura
            </Label>
            <Select
              value={preferences.data?.temperature_unit ?? "celsius"}
              onValueChange={(v) =>
                updatePreferences.mutate({
                  temperature_unit: v === "fahrenheit" ? "fahrenheit" : "celsius",
                })
              }
            >
              <SelectTrigger id="temperature-unit" className="w-36 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="celsius">Celsius</SelectItem>
                <SelectItem value="fahrenheit">Fahrenheit</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </Group>

        <Group label="Notificações e lembretes">
          <Row>
            <Bell className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium">Permitir lembretes</span>
              <span className="block text-xs text-muted-foreground">
                {permission === "denied"
                  ? "Notificações bloqueadas no navegador — os lembretes aparecerão dentro do app."
                  : "Os lembretes funcionam enquanto o Bloom estiver aberto (inclusive em segundo plano)."}
              </span>
            </span>
            <Switch
              aria-label="Permitir lembretes"
              checked={notificationsOn}
              onCheckedChange={toggleNotifications}
            />
          </Row>
          <fieldset
            disabled={!notificationsOn}
            className={cn("transition-opacity", !notificationsOn && "opacity-50")}
          >
            <ReminderRow
              label="Registro diário"
              enabled={reminders.dailyLog.enabled}
              time={reminders.dailyLog.time}
              onToggle={(v) => updateReminders({ dailyLog: { ...reminders.dailyLog, enabled: v } })}
              onTime={(t) => updateReminders({ dailyLog: { ...reminders.dailyLog, time: t } })}
            />
            <ReminderRow
              label="Previsão da menstruação"
              enabled={reminders.periodForecast.enabled}
              time={reminders.periodForecast.time}
              onToggle={(v) =>
                updateReminders({ periodForecast: { ...reminders.periodForecast, enabled: v } })
              }
              onTime={(t) =>
                updateReminders({ periodForecast: { ...reminders.periodForecast, time: t } })
              }
              extra={
                <Select
                  value={String(reminders.periodForecast.daysBefore)}
                  onValueChange={(v) =>
                    updateReminders({
                      periodForecast: { ...reminders.periodForecast, daysBefore: Number(v) },
                    })
                  }
                >
                  <SelectTrigger aria-label="Antecedência" className="h-10 w-32 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 5, 7].map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d === 0 ? "No dia" : `${d} dia(s) antes`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              }
            />
            <ReminderRow
              label="Sintomas durante a menstruação"
              enabled={reminders.symptomCheck.enabled}
              time={reminders.symptomCheck.time}
              onToggle={(v) =>
                updateReminders({ symptomCheck: { ...reminders.symptomCheck, enabled: v } })
              }
              onTime={(t) =>
                updateReminders({ symptomCheck: { ...reminders.symptomCheck, time: t } })
              }
            />
            <Row>
              <span className="flex-1">
                <span className="block font-medium">Atualizações do Bloom</span>
                <span className="block text-xs text-muted-foreground">
                  Avisos sobre novidades importantes do app.
                </span>
              </span>
              <Switch
                aria-label="Atualizações do Bloom"
                checked={reminders.updates.enabled}
                onCheckedChange={(v) => updateReminders({ updates: { enabled: v } })}
              />
            </Row>
            <div className="border-t border-border p-4">
              <p className="text-sm font-semibold">Lembretes personalizados</p>
              {reminders.custom.length ? (
                <ul className="mt-2 space-y-2">
                  {reminders.custom.map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center gap-3 rounded-2xl bg-secondary/60 p-3 text-sm"
                    >
                      <span className="flex-1">
                        <span className="block font-medium">{r.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.time} ·{" "}
                          {r.days.length === 7
                            ? "todos os dias"
                            : r.days.map((d) => WEEK[d]).join(" ")}
                        </span>
                      </span>
                      <Switch
                        aria-label={`Ativar ${r.title}`}
                        checked={r.enabled}
                        onCheckedChange={(v) =>
                          updateReminders({
                            custom: reminders.custom.map((c) =>
                              c.id === r.id ? { ...c, enabled: v } : c,
                            ),
                          })
                        }
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-9 rounded-full"
                        aria-label={`Excluir lembrete ${r.title}`}
                        onClick={() =>
                          updateReminders({ custom: reminders.custom.filter((c) => c.id !== r.id) })
                        }
                      >
                        <X aria-hidden="true" />
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {newReminder ? (
                <div className="mt-3 space-y-3 rounded-2xl border border-border p-3 animate-fade-up">
                  <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                    <div>
                      <Label htmlFor="rem-title">Nome</Label>
                      <Input
                        id="rem-title"
                        maxLength={60}
                        className="mt-1 h-11 rounded-xl"
                        value={newReminder.title}
                        onChange={(e) => setNewReminder({ ...newReminder, title: e.target.value })}
                        placeholder="Ex.: tomar água"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rem-time">Horário</Label>
                      <Input
                        id="rem-time"
                        type="time"
                        className="mt-1 h-11 rounded-xl"
                        value={newReminder.time}
                        onChange={(e) => setNewReminder({ ...newReminder, time: e.target.value })}
                      />
                    </div>
                  </div>
                  <div role="group" aria-label="Dias da semana" className="flex gap-1.5">
                    {WEEK.map((d, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-pressed={newReminder.days.includes(i)}
                        aria-label={
                          ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][i]
                        }
                        onClick={() =>
                          setNewReminder({
                            ...newReminder,
                            days: newReminder.days.includes(i)
                              ? newReminder.days.filter((x) => x !== i)
                              : [...newReminder.days, i],
                          })
                        }
                        className="bloom-chip size-10 justify-center px-0"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                  {reminderError ? (
                    <p role="alert" className="text-sm text-destructive">
                      {reminderError}
                    </p>
                  ) : null}
                  <div className="flex gap-2">
                    <Button className="rounded-full" onClick={addReminder}>
                      Adicionar
                    </Button>
                    <Button
                      variant="ghost"
                      className="rounded-full"
                      onClick={() => {
                        setNewReminder(null);
                        setReminderError(null);
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 rounded-full"
                  onClick={() =>
                    setNewReminder({
                      id: crypto.randomUUID(),
                      title: "",
                      time: "09:00",
                      days: [0, 1, 2, 3, 4, 5, 6],
                      enabled: true,
                    })
                  }
                >
                  <Plus aria-hidden="true" /> Novo lembrete
                </Button>
              )}
            </div>
          </fieldset>
        </Group>

        <Group label="Sons">
          <Row>
            <Volume2 className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium">Sons do Bloom</span>
              <span className="block text-xs text-muted-foreground">
                Sons sutis ao registrar e concluir. Nunca tocam ao abrir o app.
              </span>
            </span>
            <Switch
              aria-label="Sons do Bloom"
              checked={device.sound.enabled}
              onCheckedChange={(v) => {
                writeDeviceSettings({ sound: { ...device.sound, enabled: v } });
                if (v) playSound("complete", { enabled: true, volume: device.sound.volume });
              }}
            />
          </Row>
          <Row>
            <Label htmlFor="volume" className="w-20">
              Volume
            </Label>
            <Slider
              id="volume"
              aria-label="Volume"
              className="flex-1"
              min={0}
              max={100}
              step={5}
              disabled={!device.sound.enabled}
              value={[Math.round(device.sound.volume * 100)]}
              onValueChange={(v) =>
                writeDeviceSettings({ sound: { ...device.sound, volume: (v[0] ?? 50) / 100 } })
              }
              onValueCommit={() => playSound("save")}
            />
            <span className="w-10 text-right text-sm tabular-nums text-muted-foreground">
              {Math.round(device.sound.volume * 100)}%
            </span>
          </Row>
          <Row>
            <span className="flex-1 text-sm text-muted-foreground">Ouvir exemplos</span>
            {(["save", "complete", "milestone"] as const).map((e) => (
              <Button
                key={e}
                size="sm"
                variant="outline"
                className="rounded-full"
                disabled={!device.sound.enabled}
                onClick={() => playSound(e)}
              >
                {e === "save" ? "Salvar" : e === "complete" ? "Concluir" : "Conquista"}
              </Button>
            ))}
          </Row>
        </Group>

        <Group label="Aparência">
          <Row>
            <Palette className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 font-medium">Tema</span>
            <div
              role="radiogroup"
              aria-label="Tema"
              className="inline-flex rounded-full bg-secondary p-1"
            >
              {(
                [
                  ["system", "Sistema"],
                  ["light", "Claro"],
                  ["dark", "Escuro"],
                ] as [ThemeMode, string][]
              ).map(([v, l]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={device.theme === v}
                  onClick={() => writeDeviceSettings({ theme: v })}
                  className={cn(
                    "min-h-9 rounded-full px-3 text-sm font-medium transition-all",
                    device.theme === v
                      ? "bg-card shadow-[var(--shadow-soft)]"
                      : "text-muted-foreground",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>
          </Row>
          <Row>
            <Moon className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium">Reduzir animações</span>
              <span className="block text-xs text-muted-foreground">
                O Bloom também segue a configuração do seu sistema.
              </span>
            </span>
            <Switch
              aria-label="Reduzir animações"
              checked={device.reduceMotion}
              onCheckedChange={(v) => writeDeviceSettings({ reduceMotion: v })}
            />
          </Row>
        </Group>

        <Group label="Privacidade">
          <Row>
            <ShieldCheck className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium">Modo discreto</span>
              <span className="block text-xs text-muted-foreground">
                Esconde números e fases da tela inicial — útil em lugares públicos.
              </span>
            </span>
            <Switch
              aria-label="Modo discreto"
              checked={device.discreet}
              onCheckedChange={(v) => writeDeviceSettings({ discreet: v })}
            />
          </Row>
          <Disclosure icon={<ShieldCheck />} title="Como tratamos seus dados (LGPD)">
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              <li>
                <strong className="text-foreground">Finalidade:</strong> organizar seus registros e
                calcular estimativas para você.
              </li>
              <li>
                <strong className="text-foreground">Coleta mínima:</strong> e-mail, nome opcional,
                preferências e o que você registrar.
              </li>
              <li>
                <strong className="text-foreground">Isolamento:</strong> políticas no banco garantem
                que só sua conta acessa seus registros.
              </li>
              <li>
                <strong className="text-foreground">Sem venda ou publicidade:</strong> seus dados
                não são compartilhados com terceiros para marketing.
              </li>
              <li>
                <strong className="text-foreground">Seus direitos:</strong> exportar, corrigir e
                excluir — tudo aqui nesta tela.
              </li>
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {device.consentAt
                ? `Você confirmou ciência destes termos em ${formatLong(device.consentAt.slice(0, 10))}.`
                : "Ao usar o Bloom você concorda com este tratamento."}
            </p>
          </Disclosure>
        </Group>

        <Group label="Seus dados">
          <ActionRow
            icon={<FileJson />}
            onClick={() => handleExport("json")}
            disabled={exporting !== null}
          >
            {exporting === "json" ? "Preparando arquivo…" : "Exportar tudo (JSON)"}
          </ActionRow>
          <ActionRow
            icon={<Download />}
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
          >
            {exporting === "csv"
              ? "Preparando planilha…"
              : "Exportar histórico (CSV para planilhas)"}
          </ActionRow>
          <ActionRow icon={<Trash2 />} destructive onClick={() => setDanger("records")}>
            Apagar todos os registros
          </ActionRow>
          <ActionRow icon={<Trash2 />} destructive onClick={() => setDanger("account")}>
            Excluir minha conta
          </ActionRow>
        </Group>

        <Group label="Sessões">
          <Row>
            <LaptopMinimal className="size-[18px] text-muted-foreground" aria-hidden="true" />
            <span className="flex-1">
              <span className="block font-medium">Este aparelho</span>
              <span className="block text-xs text-muted-foreground">
                {user?.last_sign_in_at
                  ? `Último acesso em ${formatLong(user.last_sign_in_at.slice(0, 10))}`
                  : "Sessão ativa"}
                {session?.expires_at ? ` · renovação automática` : ""}
              </span>
            </span>
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              Ativa
            </span>
          </Row>
          <ActionRow
            icon={<LogOut />}
            onClick={() => signOutOthers.mutate(undefined)}
            disabled={signOutOthers.isPending}
          >
            Encerrar sessões nos outros aparelhos
          </ActionRow>
          <ActionRow icon={<LogOut />} onClick={() => void signOut("global")}>
            Sair de todos os aparelhos
          </ActionRow>
        </Group>

        <Group label="Sobre">
          <Disclosure icon={<ChevronRight />} title="Sobre o Bloom">
            <p className="text-sm text-muted-foreground">
              O Bloom organiza seus registros de ciclo, sintomas, humor e bem-estar. Previsões são
              estimativas estatísticas. O Bloom não é método contraceptivo e não faz diagnósticos.
            </p>
          </Disclosure>
        </Group>

        <Button
          variant="outline"
          className="min-h-12 w-full rounded-full"
          onClick={() => void signOut()}
        >
          <LogOut aria-hidden="true" /> Sair
        </Button>
      </div>

      <AlertDialog
        open={danger !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDanger(null);
            setConfirmText("");
          }
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {danger === "account" ? "Excluir sua conta?" : "Apagar todos os registros?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {danger === "account"
                ? "Sua conta, perfil, preferências e todos os registros serão apagados definitivamente da nuvem. Considere exportar seus dados antes."
                : "Ciclos, registros diários e humores serão apagados definitivamente. Sua conta continua ativa."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <Label htmlFor="confirm-delete">
              Digite <strong>EXCLUIR</strong> para confirmar
            </Label>
            <Input
              id="confirm-delete"
              autoComplete="off"
              className="mt-2 h-12 rounded-xl"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancelar</AlertDialogCancel>
            <Button
              variant="destructive"
              className="rounded-full"
              disabled={confirmText.trim().toUpperCase() !== "EXCLUIR" || deleting}
              onClick={confirmDanger}
            >
              {deleting
                ? "Excluindo…"
                : danger === "account"
                  ? "Excluir conta"
                  : "Apagar registros"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label} className="animate-fade-up">
      <h2 className="eyebrow mb-2 px-2">{label}</h2>
      <div className="bloom-card divide-y divide-border overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-14 flex-wrap items-center gap-3 px-4 py-2.5 text-sm">{children}</div>
  );
}

function Disclosure({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint?: string | undefined;
  children: ReactNode;
}) {
  return (
    <details className="group">
      <summary className="settings-row">
        {icon}
        <span>{title}</span>
        {hint ? (
          <span className="hidden max-w-[40%] truncate text-xs text-muted-foreground sm:inline">
            {hint}
          </span>
        ) : null}
        <ChevronRight aria-hidden="true" />
      </summary>
      <div className="border-t border-border bg-surface/40 p-4 animate-fade-in">{children}</div>
    </details>
  );
}

function ActionRow({
  icon,
  children,
  onClick,
  disabled,
  destructive,
}: {
  icon: ReactNode;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "settings-row disabled:opacity-50",
        destructive && "text-destructive [&>svg:first-child]:text-destructive",
      )}
    >
      {icon}
      <span>{children}</span>
      <ChevronRight aria-hidden="true" />
    </button>
  );
}

function ReminderRow({
  label,
  enabled,
  time,
  onToggle,
  onTime,
  extra,
}: {
  label: string;
  enabled: boolean;
  time: string;
  onToggle: (v: boolean) => void;
  onTime: (t: string) => void;
  extra?: ReactNode;
}) {
  return (
    <Row>
      <span className="min-w-40 flex-1 font-medium">{label}</span>
      {extra}
      <Input
        type="time"
        aria-label={`Horário: ${label}`}
        className="h-10 w-28 rounded-xl"
        value={time}
        disabled={!enabled}
        onChange={(e) => e.target.value && onTime(e.target.value)}
      />
      <Switch aria-label={label} checked={enabled} onCheckedChange={onToggle} />
    </Row>
  );
}
