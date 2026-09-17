import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OrganicField } from "@/components/bloom/OrganicField";
import { useAuth } from "@/hooks/useAuth";

type Mode = "login" | "cadastro" | "recuperar";

const searchSchema = z.object({
  modo: z.enum(["login", "cadastro", "recuperar"]).catch("login"),
});

export const Route = createFileRoute("/entrar")({
  validateSearch: searchSchema,
  head: () => ({
    meta: [
      { title: "Entrar no Bloom" },
      {
        name: "description",
        content: "Acesse sua conta Bloom para acompanhar seu ciclo menstrual em qualquer aparelho.",
      },
      { property: "og:title", content: "Entrar no Bloom" },
      { property: "og:description", content: "Entre com e-mail, Google ou Apple." },
    ],
  }),
  component: AuthPage,
});

const credentialsSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido.").max(255),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(72),
  displayName: z.string().trim().max(80).optional(),
});

function AuthPage() {
  const { modo } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading: sessionLoading } = useAuth();

  const [mode, setMode] = useState<Mode>(modo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => setMode(modo), [modo]);

  useEffect(() => {
    if (!sessionLoading && session) navigate({ to: "/app", replace: true });
  }, [session, sessionLoading, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setInfo(null);

    if (mode === "recuperar") {
      const parsed = z.string().trim().email().safeParse(email);
      if (!parsed.success) {
        setError("Informe um e-mail válido.");
        return;
      }
      setBusy(true);
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(parsed.data, {
        redirectTo: `${window.location.origin}/nova-senha`,
      });
      setBusy(false);
      if (resetError) {
        setError("Não foi possível enviar o e-mail agora. Tente novamente.");
        return;
      }
      setInfo("Se existir uma conta com esse e-mail, você receberá um link para criar uma nova senha.");
      return;
    }

    const parsed = credentialsSchema.safeParse({ email, password, displayName });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Confira os dados informados.");
      return;
    }

    setBusy(true);
    if (mode === "cadastro") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { display_name: parsed.data.displayName ?? "" },
        },
      });
      setBusy(false);
      if (signUpError) {
        setError(
          signUpError.message.toLowerCase().includes("already")
            ? "Já existe uma conta com esse e-mail. Tente entrar."
            : "Não conseguimos criar a conta agora. Tente novamente.",
        );
        return;
      }
      if (!data.session) {
        setInfo("Conta criada. Confirme seu e-mail pelo link que enviamos para entrar.");
        return;
      }
      toast.success("Conta criada. Bem-vinda ao Bloom.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (signInError) {
      setError("E-mail ou senha incorretos.");
      return;
    }
  }

  async function handleOAuth(provider: "google" | "apple") {
    setError(null);
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      setError("Não foi possível entrar com esse método agora.");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
  }

  const isSignUp = mode === "cadastro";
  const isRecover = mode === "recuperar";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-6 pt-10 pb-12">
      <div className="relative h-28 overflow-hidden rounded-[2rem] border border-border">
        <OrganicField variant="petals" />
      </div>

      <h1 className="mt-6 text-3xl font-bold">
        {isRecover ? "Recuperar acesso" : isSignUp ? "Criar conta no Bloom" : "Entrar no Bloom"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {isRecover
          ? "Enviaremos um link para você criar uma nova senha."
          : "Seus registros ficam na nuvem e acompanham você em qualquer aparelho."}
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
        {isSignUp ? (
          <div className="space-y-2">
            <Label htmlFor="name">Como quer ser chamada? (opcional)</Label>
            <Input
              id="name"
              value={displayName}
              maxLength={80}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="nickname"
              className="min-h-12"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="min-h-12"
          />
        </div>

        {!isRecover ? (
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="min-h-12"
            />
            {isSignUp ? (
              <p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p>
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-2xl bg-accent/70 p-3 text-sm text-foreground">
            {error}
          </p>
        ) : null}
        {info ? (
          <p role="status" className="rounded-2xl bg-secondary p-3 text-sm text-secondary-foreground">
            {info}
          </p>
        ) : null}

        <Button type="submit" disabled={busy} className="min-h-12 w-full text-base">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
          {isRecover ? "Enviar link" : isSignUp ? "Criar conta" : "Entrar"}
        </Button>
      </form>

      {!isRecover ? (
        <>
          <div className="my-6 flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou continue com</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => handleOAuth("google")}
            >
              Continuar com Google
            </Button>
            <Button
              type="button"
              variant="outline"
              className="min-h-12 w-full"
              disabled={busy}
              onClick={() => handleOAuth("apple")}
            >
              Continuar com Apple
            </Button>
          </div>
        </>
      ) : null}

      <div className="mt-8 space-y-2 text-sm">
        {mode !== "login" ? (
          <p>
            <Link to="/entrar" search={{ modo: "login" }} className="font-medium text-primary underline">
              Já tenho conta
            </Link>
          </p>
        ) : null}
        {mode !== "cadastro" ? (
          <p>
            <Link
              to="/entrar"
              search={{ modo: "cadastro" }}
              className="font-medium text-primary underline"
            >
              Criar uma conta
            </Link>
          </p>
        ) : null}
        {mode !== "recuperar" ? (
          <p>
            <Link
              to="/entrar"
              search={{ modo: "recuperar" }}
              className="font-medium text-primary underline"
            >
              Esqueci minha senha
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
