import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { axionStatus } from "@/lib/axion/axion.functions";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarCheck,
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
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 ${
        indent ? "text-[13px]" : "text-sm"
      } ${
        active
          ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/15"
          : "text-muted-foreground hover:bg-accent/80 hover:text-foreground"
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
      <NavLink to="/painel" icon={Wallet} label="Home Broker" active={active === "carteira"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/receitas" icon={TrendingUp} label="Receitas" active={["receitas", "contas-a-receber", "historico-receitas", "crediario"].includes(active)} indent={indent} onNavigate={onNavigate} />
      <div className="ml-4 space-y-1 border-l border-border/80 pl-2">
        <NavLink to="/contas-a-receber" icon={CalendarDays} label="Contas a receber" active={active === "contas-a-receber"} indent onNavigate={onNavigate} />
        <NavLink to="/crediario" icon={FileText} label="Contratos parcelados" active={active === "crediario"} indent onNavigate={onNavigate} />
        <NavLink to="/historico-receitas" icon={History} label="Histórico de receitas" active={active === "historico-receitas"} indent onNavigate={onNavigate} />
      </div>
      <NavLink to="/despesas/anuais" icon={TrendingDown} label="Despesas" active={despesasActive} indent={indent} onNavigate={onNavigate} />
      <div className="ml-4 space-y-1 border-l border-border/80 pl-2">
        <NavLink to="/despesas" icon={CalendarCheck} label="Despesas do mês" active={active === "despesas"} indent onNavigate={onNavigate} />
        <NavLink to="/despesas/anuais" icon={CalendarDays} label="Despesas anuais" active={active === "anuais"} indent onNavigate={onNavigate} />
        <NavLink to="/despesas/parceladas" icon={Layers} label="Contratos parcelados" active={active === "parceladas"} indent onNavigate={onNavigate} />
        <NavLink to="/historico-pagamentos" icon={History} label="Histórico de pagamentos" active={active === "historico"} indent onNavigate={onNavigate} />
      </div>
      <NavLink to="/cotacoes" icon={LineChart} label="Bolsa de valores" active={active === "cotacoes"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/moedas" icon={LineChart} label="Moedas" active={active === "moedas"} indent={indent} onNavigate={onNavigate} />
      <div className="px-3 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Organização pessoal</div>
      <NavLink to="/agenda" icon={CalendarDays} label="Agenda e calendário" active={active === "agenda"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/calculadora" icon={Calculator} label="Calculadora" active={active === "calculadora"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/compras" icon={ClipboardList} label="Lista de compras" active={active === "compras"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/notas" icon={StickyNote} label="Anotações" active={active === "notas"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/viagens" icon={CarFront} label="Viagens" active={active === "viagens"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/notas-fiscais" icon={FolderArchive} label="Notas fiscais" active={active === "notas-fiscais"} indent={indent} onNavigate={onNavigate} />
      <div className="px-3 pt-5 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Axion</div>
      <NavLink to="/nuvem" icon={Shield} label="Nuvem" active={active === "nuvem"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/perfil" icon={UserRound} label="Perfil" active={active === "perfil"} indent={indent} onNavigate={onNavigate} />
      <NavLink to="/auditoria" icon={History} label="Auditoria" active={active === "auditoria"} indent={indent} onNavigate={onNavigate} />
    </>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="no-print hidden w-72 shrink-0 flex-col border-r border-border/80 bg-sidebar/90 p-5 shadow-[0_0_0_1px_rgba(15,23,42,0.02)] backdrop-blur-md md:flex">
        <Logo />
        <nav aria-label="Menu principal" className="mt-8 space-y-1.5">
          {nav(false)}
        </nav>
        <Button
          variant="ghost"
          onClick={signOut}
          className="mt-auto flex items-center justify-start gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-accent"
        >
          <LogOut className="size-4" />
          Sair
        </Button>
      </aside>

      <main className="min-w-0 flex-1 overflow-x-hidden">
        <header className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-card/80 px-4 py-3 backdrop-blur-md md:justify-end md:px-6">
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
                className="flex w-[min(20rem,90vw)] flex-col overflow-y-auto bg-sidebar p-5"
              >
                <SheetTitle className="sr-only">Menu principal</SheetTitle>
                <Logo />
                <nav aria-label="Menu principal" className="mt-6 space-y-1.5">
                  {nav(false, () => setMenuOpen(false))}
                </nav>
                <Button variant="ghost" onClick={signOut} className="mt-auto justify-start gap-3 text-muted-foreground">
                  <LogOut />
                  Sair
                </Button>
              </SheetContent>
            </Sheet>
            <Logo />
          </div>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {headerActions}
            <div className="hidden min-w-0 text-right text-sm md:block">
              <div className="break-words font-semibold text-foreground">{user?.name}</div>
              <div className="break-words text-xs text-muted-foreground">{user?.email}</div>
            </div>
          </div>
        </header>
        {children}
      </main>
      {user && axionAccess.data?.owner && (
        <Link to="/assistente" className="no-print fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-30 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg focus-visible:outline-2">
          <MessageCircle size={18} aria-hidden="true" /> Axion IA
        </Link>
      )}
    </div>
  );
}

