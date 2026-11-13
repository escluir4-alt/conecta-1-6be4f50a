import { CarRoadTripPlanner } from '../viagens-module/components/car-planner/CarRoadTripPlanner';

interface RoadTripPlatformProps {
  onOpenTicketsPlatform?: () => void;
  initialOriginCity?: string;
  initialDestCity?: string;
}

/**
 * RODOVIAS & PEDÁGIOS BRASIL
 * Plataforma Independente de Rotas, Pedágios, Postos da PRF e Gestão de Combustível
 * Totalmente desacoplada do serviço de passagens aéreas e rodoviárias.
 */
export function RoadTripPlatform({
  onOpenTicketsPlatform,
  initialOriginCity = 'São Paulo',
  initialDestCity = 'Rio de Janeiro'
}: RoadTripPlatformProps) {
  return (
    <div className="w-full min-h-screen bg-slate-100 flex flex-col font-sans">
      <CarRoadTripPlanner
        {...(onOpenTicketsPlatform ? { onBackToTickets: onOpenTicketsPlatform } : {})}
        initialOriginCity={initialOriginCity}
        initialDestCity={initialDestCity}
      />
    </div>
  );
}

export default RoadTripPlatform;
