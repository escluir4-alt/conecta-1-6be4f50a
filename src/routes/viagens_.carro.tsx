import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { AppShell, useRequireUser } from "@/components/AppShell";
import { RoadTripPlatform } from "@/road-trip-platform/RoadTripPlatform";
export const Route = createFileRoute("/viagens_/carro")({
  head: () => ({ meta: [{ title: "Viagem de carro — Axion" }] }),
  component: CarTripPage,
});
function CarTripPage() {
  const user = useRequireUser();
  return (
    <AppShell active="viagens" user={user}>
      <div className="w-full bg-slate-100 px-4 py-3">
        <Link to="/viagens" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900">
          <ArrowLeft className="size-4" /> Voltar para Viagens do Axion
        </Link>
      </div>
      <RoadTripPlatform />
    </AppShell>
  );
}
