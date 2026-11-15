import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ChevronLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
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
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
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

    localStorage.setItem("bloom-remember", remember ? "1" : "0");
    sessionStorage.setItem("bloom-session-alive", "1");
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
  const field =
    "h-14 w-full rounded-xl border border-[#dcdce4] bg-white px-5 text-[15px] text-[#1c1c28] outline-none placeholder:text-[#9a9aa6] focus:border-[#a98be6]";
  const purple = "text-[#c2407a]";

  return (
    <main
      className="relative mx-auto flex min-h-dvh max-w-md flex-col overflow-hidden"
      style={{ background: "linear-gradient(135deg,#fbd0de 0%,#f8a9c6 50%,#f45b9a 100%)" }}
    >
      <svg className="pointer-events-none absolute inset-x-0 top-0 h-[45%] w-full opacity-60" viewBox="0 0 400 300" preserveAspectRatio="none" aria-hidden="true">
        {Array.from({ length: 40 }, (_, k) => (
          <path key={k} d={`M -20 ${k * 8 - 20} Q 200 ${k * 8 + 60} 420 ${k * 8 - 20}`} fill="none" stroke="white" strokeWidth="0.8" />
        ))}
      </svg>

      <Link to="/" className="relative z-10 mt-[max(24px,env(safe-area-inset-top))] ml-5 flex w-fit items-center gap-2 p-2 text-[17px] text-[#3a3046]">
        <ChevronLeft className="size-5" aria-hidden="true" /> Voltar
      </Link>

      <section className="relative z-10 mt-[22vh] flex flex-1 flex-col rounded-t-[3rem] bg-white px-7 pt-10 pb-[max(24px,env(safe-area-inset-bottom))]">
        <h1 className="text-center text-[28px] font-semibold text-[#111]">
          {isRecover ? "Recuperar senha" : isSignUp ? "Criar conta" : "Bem-vinda de volta"}
        </h1>
        <p className="mt-4 text-center text-[13px] text-[#333]">
          {isRecover ? "Enviaremos um link para você criar uma nova senha." : "Pronta para continuar acompanhando seu ciclo?"}
          <br />
          <span className="font-semibold">Seu Bloom está aqui.</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-9 space-y-4" noValidate>
          {isSignUp ? (
            <input aria-label="Nome (opcional)" placeholder="Nome (opcional)" value={displayName} maxLength={80} onChange={(e) => setDisplayName(e.target.value)} autoComplete="nickname" className={field} />
          ) : null}
          <input aria-label="E-mail" type="email" placeholder="Digite seu e-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className={field} />
          {!isRecover ? (
            <div className="relative">
              <input aria-label="Senha" type={showPw ? "text" : "password"} placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={isSignUp ? "new-password" : "current-password"} className={`${field} pr-14`} />
              <button type="button" onClick={() => setShowPw((v) => !v)} aria-label={showPw ? "Ocultar senha" : "Mostrar senha"} className="absolute top-1/2 right-4 -translate-y-1/2 p-1 text-[#9a9aa6]">
                {showPw ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
          ) : null}

          {mode === "login" ? (
            <div className="flex items-center justify-between px-1 text-[13px] font-medium">
              <label className={`flex items-center gap-2 ${purple}`}>
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 rounded accent-[#f45b9a]" />
                Lembrar de mim
              </label>
              <Link to="/entrar" search={{ modo: "recuperar" }} className={purple}>Esqueceu a senha?</Link>
            </div>
          ) : null}

          {error ? <p role="alert" className="rounded-xl bg-[#fdecef] p-3 text-sm text-[#a3203a]">{error}</p> : null}
          {info ? <p role="status" className="rounded-xl bg-[#f1ecfd] p-3 text-sm text-[#4b3596]">{info}</p> : null}

          <button type="submit" disabled={busy} className="press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-full text-[17px] font-medium text-white shadow-[0_10px_20px_-10px_rgba(150,100,200,0.6)] disabled:opacity-70" style={{ background: "linear-gradient(90deg,#f8a9c6,#f45b9a)" }}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            {isRecover ? "Enviar link" : isSignUp ? "Cadastrar" : "Entrar"}
          </button>
        </form>

        {!isRecover ? (
          <>
            <div className="mt-10 flex items-center gap-4 text-[14px] text-[#666]">
              <span className="h-px flex-1 bg-[#e6e6ea]" />Entrar com<span className="h-px flex-1 bg-[#e6e6ea]" />
            </div>
            <div className="mt-5 flex justify-center gap-10">
              <button type="button" aria-label="Entrar com Facebook" disabled={busy} onClick={() => setError("O login com Facebook ainda não está disponível. Use e-mail, Google ou Apple.")}>
                <svg viewBox="0 0 24 24" className="size-9" aria-hidden="true"><circle cx="12" cy="12" r="12" fill="#1877F2" /><path fill="#fff" d="M15.1 12.6h-2.1V20h-3v-7.4H8.5V10H10V8.4C10 6.5 11 5.3 13.3 5.3c.8 0 1.7.1 1.7.1v2.3h-1c-1 0-1.1.5-1.1 1.1V10h2.2l-.4 2.6z" /></svg>
              </button>
              <button type="button" aria-label="Entrar com Google" disabled={busy} onClick={() => handleOAuth("google")}>
                <svg viewBox="0 0 24 24" className="size-9" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
              </button>
              <button type="button" aria-label="Entrar com Apple" disabled={busy} onClick={() => handleOAuth("apple")}>
                <svg viewBox="0 0 24 24" className="size-9" aria-hidden="true"><path fill="#000" d="M16.4 12.7c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1zM13.9 5.1c.7-.9 1.2-2 1-3.2-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.1 1.2.1 2.3-.6 3.1-1.5z" /></svg>
              </button>
            </div>
          </>
        ) : null}

        <p className="mt-auto pt-8 text-center text-[14px] text-[#333]">
          {mode === "login" ? (
            <>Não tem uma conta? <Link to="/entrar" search={{ modo: "cadastro" }} className={`font-semibold ${purple}`}>Cadastre-se</Link></>
          ) : (
            <>Já tem uma conta? <Link to="/entrar" search={{ modo: "login" }} className={`font-semibold ${purple}`}>Entrar</Link></>
          )}
        </p>
      </section>
    </main>
  );
}
