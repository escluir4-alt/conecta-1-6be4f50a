import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { CarRoadTripPlanner } from "@/components/viagens/CarRoadTripPlanner";

export const Route = createFileRoute("/viagens_/carro")({
  head: () => ({ meta: [{ title: "Viagem de carro — Axion" }] }),
  component: ViagemDeCarro,
});

function ViagemDeCarro() {
  const user = useRequireUser();
  return (
    <AppShell active="viagens" user={user}>
      <div className="mx-auto max-w-7xl space-y-5 p-4 md:p-8">
        <Link to="/viagens" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Voltar para Viagens
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Viagem de carro</h1>
          <p className="mt-1 text-sm text-muted-foreground">Planeje seu percurso, paradas e despesas de estrada.</p>
        </div>
        <CarRoadTripPlanner userEmail={user?.email}/>
      </div>
    </AppShell>
  );
}
