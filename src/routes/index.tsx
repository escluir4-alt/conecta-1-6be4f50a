import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { BarChart3, Bell, Check, Eye, EyeOff, Lock, Mail, ShieldCheck, Target, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Entrar — Casa Clara" },
      { name: "description", content: "Entre ou crie sua conta Casa Clara e controle contas e cartões via Open Finance." },
      { property: "og:title", content: "Entrar — Casa Clara" },
      { property: "og:description", content: "Controle de contas e cartões via Open Finance." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const features = [
  { icon: BarChart3, title: "Controle Total", text: "Acompanhe contas, despesas e saldo em tempo real." },
  { icon: Target, title: "Planejamento Inteligente", text: "Defina metas e organize seus objetivos financeiros." },
  { icon: Bell, title: "Alertas e Lembretes", text: "Acompanhe faturas, vencimentos e movimentações." },
  { icon: ShieldCheck, title: "Segurança dos Seus Dados", text: "Conexão bancária oficial via Open Finance." },
];

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/painel" });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/painel" });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        if (!data.session) toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      }
    } catch (err) {
      toast.error((err as Error).message === "Invalid login credentials" ? "E-mail ou senha incorretos." : (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error("Não foi possível entrar com o Google.");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="relative hidden bg-hero px-16 py-14 lg:flex lg:flex-col">
        <Logo />
        <div className="mt-20 max-w-xl">
          <h1 className="text-5xl font-extrabold leading-tight">
            Mais controle hoje,
            <br />
            <span className="text-primary">mais tranquilidade amanhã.</span>
          </h1>
          <p className="mt-6 text-muted-foreground">
            Conecte seus bancos com Open Finance e veja contas, cartões e movimentações em um só lugar.
          </p>
          <div className="mt-10 grid grid-cols-2 gap-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-xl border bg-card/80 p-5 shadow-soft">
                <f.icon className="size-5 text-primary" />
                <div className="mt-3 font-semibold">{f.title}</div>
                <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
              </div>
            ))}
          </div>
          <ul className="mt-6 space-y-1.5 text-sm text-muted-foreground">
            {[
              "Interface simples e intuitiva",
              "Dados sincronizados com seus bancos",
              "Cartões e faturas em tempo real",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2"><Check className="size-4 text-success" />{t}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="flex items-center justify-center bg-card px-6 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center"><Logo /></div>
          <h2 className="mt-12 text-2xl font-bold">{mode === "login" ? "Bem-vindo de volta!" : "Crie sua conta"}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Entre na sua conta para continuar gerenciando suas finanças." : "Leva menos de um minuto."}
          </p>

          <form onSubmit={submit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" className="h-11" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Seu nome" />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" className="h-11 pl-10" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="seu@email.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pw">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="pw" type={show ? "text" : "password"} minLength={6} className="h-11 px-10" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Digite sua senha" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label="Mostrar senha">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" variant="brand" className="h-11 w-full" disabled={loading}>
              {mode === "login" ? "Entrar" : "Criar conta"} <ArrowRight />
            </Button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" />ou<div className="h-px flex-1 bg-border" />
          </div>
          <Button variant="outline" className="h-11 w-full" onClick={google}>
            <GoogleIcon /> Continuar com Google
          </Button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            {mode === "login" ? "Não tem uma conta? " : "Já tem conta? "}
            <button className="font-semibold text-primary" onClick={() => setMode(mode === "login" ? "signup" : "login")}>
              {mode === "login" ? "Criar conta grátis" : "Entrar"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-4">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}
