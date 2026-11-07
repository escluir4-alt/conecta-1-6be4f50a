import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { axionStatus } from "@/lib/axion/axion.functions";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck,
  LayoutDashboard,
  Clock3,
  Settings2,
  CalendarDays,
  Calculator,
  ClipboardList,
  StickyNote,
  CarFront,
  FileText,
  FolderArchive,
  History,
  Layers,
  LineChart,
  LogOut,
  Menu,
  MessageCircle,
  Shield,
  TrendingDown,
  TrendingUp,
  UserRound,
  Wallet,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

export type AppPage =
  | "home-broker"
  | "relogio"
  | "receitas"
  | "contas-a-receber"
  | "historico-receitas"
  | "crediario"
  | "despesas"
  | "anuais"
  | "parceladas"
  | "historico"
  | "carteira"
  | "cotacoes"
  | "moedas"
  | "agenda"
  | "perfil"
  | "auditoria"
  | "nuvem"
  | "calculadora"
  | "compras"
  | "notas"
  | "viagens"
  | "notas-fiscais";

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
      else {
        setUser({
          email: data.user.email ?? "",
          name: (data.user.user_metadata?.["full_name"] as string) || data.user.email || "",
        });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/", replace: true });
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
      data-active={active}
      aria-current={active ? "page" : undefined}
      className={`axion-nav-link flex items-center gap-3 px-3 py-2.5 ${
        indent ? "text-[13px]" : "text-sm"
      } ${
        active
          ? "font-semibold"
          : "text-muted-foreground hover:bg-accent/70 hover:text-foreground"
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
  const axion = useServerFn(axionStatus);
  const axionAccess = useQuery({ queryKey: ["axion-access", user?.email], queryFn: () => axion(), enabled: !!user });
  const [menuOpen, setMenuOpen] = useState(false);
  const despesasActive = ["despesas", "anuais", "parceladas", "historico"].includes(active);

  const nav = (indent: boolean, onNavigate?: () => void) => (
    <>
      <div className="px-3 pt-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Controle financeiro</div>
      <NavLink to="/home-broker" icon={LayoutDashboard} label="Painel Financeiro" active={active === "home-broker"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/receitas" icon={TrendingUp} label="Receitas" active={["receitas", "contas-a-receber", "historico-receitas", "crediario"].includes(active)} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/despesas/anuais" icon={TrendingDown} label="Despesas" active={despesasActive} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/painel" icon={Wallet} label="Carteira" active={active === "carteira"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/cotacoes" icon={LineChart} label="Bolsa de Valores" active={["cotacoes", "moedas"].includes(active)} indent={indent} onNavigate={onNavigate} />
      <div className="px-3 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Organização pessoal</div>
      <NavLink to="/agenda" icon={CalendarDays} label="Agenda e calendário" active={active === "agenda"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/calculadora" icon={Calculator} label="Calculadora" active={active === "calculadora"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/compras" icon={ClipboardList} label="Lista de compras" active={active === "compras"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/notas-fiscais" icon={FolderArchive} label="Notas fiscais" active={active === "notas-fiscais"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/relogio" icon={Clock3} label="Relógio e alarmes" active={active === "relogio"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/viagens" icon={CarFront} label="Viagens" active={active === "viagens"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/assistente" icon={MessageCircle} label="Assistente IA" active={false} indent={indent} onNavigate={onNavigate} />
    </>
  );

  return (
    <div className="axion-app-shell flex min-h-screen bg-background">
      <aside className="axion-sidebar no-print hidden w-72 shrink-0 flex-col p-5 md:sticky md:top-0 md:flex md:h-screen">
        <Logo tone="light" />
        <nav aria-label="Menu principal" className="mt-8 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
          {nav(false)}
        </nav>
        <Button
          variant="ghost"
          onClick={signOut}
          className="axion-sidebar-signout mt-auto flex items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm"
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="axion-topbar no-print sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:justify-end md:px-6">
          <div className="flex min-w-0 items-center gap-2 md:hidden">
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Abrir menu" className="shrink-0">
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                aria-describedby={undefined}
                className="axion-sidebar flex w-[min(20rem,90vw)] flex-col overflow-y-auto border-r-0 p-5"
              >
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <Logo tone="light" />
                <nav aria-label="Menu principal" className="mt-6 space-y-1.5 axion-mobile-menu">
                  {nav(false, () => setMenuOpen(false))}
                </nav>
                <Button variant="ghost" onClick={signOut} className="axion-sidebar-signout mt-auto justify-start gap-3">
                  <LogOut />
                  Sair
                </Button>
              </SheetContent>
            </Sheet>
            <Logo />
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {headerActions}
            <details className="relative no-print">
              <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/20 hover:bg-accent/50" aria-label="Outros recursos do Axion"><Settings2 className="size-4" /><span className="hidden lg:inline">Outros recursos</span></summary>
              <div className="absolute right-0 z-50 mt-2 flex w-56 flex-col gap-1 rounded-2xl border bg-card p-2 shadow-soft">
                <Link to="/notas" className="rounded-md p-2 text-sm hover:bg-accent">Anotações</Link>
                <Link to="/nuvem" className="rounded-md p-2 text-sm hover:bg-accent">Nuvem</Link>
                <Link to="/perfil" className="rounded-md p-2 text-sm hover:bg-accent">Perfil</Link>
                <Link to="/auditoria" className="rounded-md p-2 text-sm hover:bg-accent">Auditoria</Link>
              </div>
            </details>
            <div className="hidden min-w-0 text-right text-sm md:block">
              <div className="break-words font-semibold text-foreground">{user?.name}</div>
              <div className="break-words text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </header>
        <div className="axion-page-content pb-20 md:pb-0">{children}</div>
      </main>
      <nav className="axion-mobile-bottom no-print md:hidden" aria-label="Navegação rápida">
        <Link to="/home-broker" className={active === "home-broker" ? "axion-bottom-current" : ""}><LayoutDashboard className="size-5" /><span>Painel</span></Link>
        <Link to="/receitas" className={["receitas", "contas-a-receber", "historico-receitas", "crediario"].includes(active) ? "axion-bottom-current" : ""}><TrendingUp className="size-5" /><span>Receitas</span></Link>
        <Link to="/despesas/anuais" className={despesasActive ? "axion-bottom-current" : ""}><TrendingDown className="size-5" /><span>Despesas</span></Link>
        <Link to="/agenda" className={active === "agenda" ? "axion-bottom-current" : ""}><CalendarDays className="size-5" /><span>Agenda</span></Link>
      </nav>
      {user && axionAccess.data?.owner && (
        <Link to="/assistente" className="axion-ai-fab no-print fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-4 z-30 md:bottom-4 flex items-center gap-2 rounded-full px-4 py-3 text-sm font-semibold text-primary-foreground focus-visible:outline-2">
          <MessageCircle size={18} aria-hidden="true" /> Axion IA
        </Link>
      )}
    </div>
  );
}

