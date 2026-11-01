import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck, CalendarDays, History, Layers, LineChart, LogOut, Menu, ScrollText, TrendingDown, TrendingUp, Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type AppPage =
  | "receitas"
  | "historico-receitas"
  | "crediario"
  | "despesas"
  | "anuais"
  | "parceladas"
  | "historico"
  | "carteira"
  | "cotacoes"
  | "moedas"
  | "auditoria";

export interface AppUser {
  email: string;
  name: string;
}

export function useRequireUser(): AppUser | null {
  const navigate = useNavigate();
  const [user, setUser] = useState<AppUser | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) navigate({ to: "/" });
      else
        setUser({
          email: data.user.email ?? "",
          name: (data.user.user_metadata?.["full_name"] as string) || data.user.email || "",
        });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_OUT") navigate({ to: "/", replace: true });
    });
    return () => sub.subscription.unsubscribe();
  }, [navigate]);
  return user;
}

export function useSignOut() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };
}

function NavLink({
  to,
  icon: Icon,
  label,
  active,
  indent,
  onNavigate,
}: {
  to: string;
  icon: typeof Wallet;
  label: string;
  active: boolean;
  indent?: boolean;
  onNavigate?: (() => void) | undefined;
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition ${
        indent ? "text-[13px]" : "text-sm"
      } ${
        active
          ? "bg-brand font-semibold text-primary-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
      }`}
    >
      <Icon className="size-4 shrink-0" />
      {label}
    </Link>
  );
}

const DESPESAS_SUB = [
  { to: "/despesas", id: "despesas", label: "Despesas do Mês", icon: CalendarCheck },
  { to: "/despesas/anuais", id: "anuais", label: "Despesas Anuais", icon: CalendarDays },
  { to: "/despesas/parceladas", id: "parceladas", label: "Despesas Parceladas", icon: Layers },
  { to: "/historico-pagamentos", id: "historico", label: "Histórico de Pagamentos", icon: History },
] as const;

export function AppShell({
  active,
  user,
  headerActions,
  children,
}: {
  active: AppPage;
  user: AppUser | null;
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  const signOut = useSignOut();
  const [menuOpen, setMenuOpen] = useState(false);
  const despesasActive = ["despesas", "anuais", "parceladas", "historico"].includes(active);

  const nav = (indent: boolean, onNavigate?: () => void) => (
    <>
      <div className="px-3 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Financeiro</div>
      <NavLink to="/receitas" icon={TrendingUp} label="Receitas" active={active === "receitas"} indent={indent} onNavigate={onNavigate} />
      <div className="ml-4 space-y-1 border-l pl-2">
        <NavLink to="/crediario" icon={Layers} label="Crediário" active={active === "crediario"} indent onNavigate={onNavigate} />
        <NavLink to="/historico-receitas" icon={History} label="Histórico de Receitas" active={active === "historico-receitas"} indent onNavigate={onNavigate} />
      </div>
      <div>
        <Link to="/despesas" onClick={onNavigate}
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 ${
            despesasActive ? "font-semibold text-foreground" : "text-muted-foreground"
          } ${indent ? "text-[13px]" : "text-sm"}`}
        >
          <TrendingDown className="size-4 shrink-0" />
          Despesas
        </Link>
        <div className="ml-4 space-y-1 border-l pl-2">
          {DESPESAS_SUB.map((s) => (
            <NavLink key={s.id} to={s.to} icon={s.icon} label={s.label} active={active === s.id} indent onNavigate={onNavigate} />
          ))}
        </div>
      </div>
      <NavLink to="/painel" icon={Wallet} label="Carteira" active={active === "carteira"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/cotacoes" icon={LineChart} label="Bolsa de Valores" active={active === "cotacoes"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/moedas" icon={LineChart} label="Moedas" active={active === "moedas"} indent={indent} onNavigate={onNavigate} />
      <div className="px-3 pt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sistema</div>
      <NavLink to="/auditoria" icon={ScrollText} label="Logs de Auditoria" active={active === "auditoria"} indent={indent} onNavigate={onNavigate} />
    </>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r bg-sidebar p-5 md:flex">
        <Logo />
        <nav aria-label="Menu principal" className="mt-8 space-y-1">{nav(false)}</nav>
        <Button variant="ghost"
          onClick={signOut}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent"
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="no-print flex items-center justify-between gap-3 border-b bg-card px-4 py-3 md:justify-end md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="shrink-0"><Menu /></Button>
              </SheetTrigger>
              <SheetContent side="left" aria-describedby={undefined} className="flex w-[min(20rem,90vw)] flex-col overflow-y-auto bg-sidebar p-5">
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <Logo />
                <nav aria-label="Menu principal" className="mt-6 space-y-1">{nav(false, () => setMenuOpen(false))}</nav>
                <Button variant="ghost" onClick={signOut} className="mt-auto justify-start gap-3 text-muted-foreground"><LogOut />Sair</Button>
              </SheetContent>
            </Sheet>
            <Logo />
          </div>
          <div className="flex min-w-0 items-center gap-3">
            {headerActions}
            <div className="hidden min-w-0 text-right text-sm md:block">
              <div className="break-words font-semibold">{user?.name}</div>
              <div className="break-words text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </header>
        {children}
      </main>
    </div>
  );
}
