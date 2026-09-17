import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/nova-senha")({
  head: () => ({
    meta: [
      { title: "Criar nova senha — Bloom" },
      { name: "description", content: "Defina uma nova senha para sua conta Bloom." },
      { property: "og:title", content: "Criar nova senha — Bloom" },
      { property: "og:description", content: "Defina uma nova senha para sua conta Bloom." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);

  useEffect(() => {
    const hash = typeof window === "undefined" ? "" : window.location.hash;
    if (hash.includes("type=recovery")) setRecoveryReady(true);
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setRecoveryReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const parsed = z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72).safeParse(password);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Senha inválida.");
      return;
    }
    if (password !== confirmation) {
      setError("As senhas não são iguais.");
      return;
    }
    setBusy(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (updateError) {
      setError("Não foi possível alterar a senha. Solicite um novo link.");
      return;
    }
    toast.success("Senha alterada.");
    navigate({ to: "/app", replace: true });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <h1 className="text-3xl font-bold">Criar nova senha</h1>
      {!recoveryReady ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Abra esta página pelo link enviado ao seu e-mail para redefinir a senha.
        </p>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <Input
            id="new-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="min-h-12"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm-password">Repetir a nova senha</Label>
          <Input
            id="confirm-password"
            type="password"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
            className="min-h-12"
            required
          />
        </div>
        {error ? (
          <p role="alert" className="rounded-2xl bg-accent/70 p-3 text-sm">
            {error}
          </p>
        ) : null}
        <Button type="submit" disabled={busy} className="min-h-12 w-full">
          {busy ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </form>
    </main>
  );
}
