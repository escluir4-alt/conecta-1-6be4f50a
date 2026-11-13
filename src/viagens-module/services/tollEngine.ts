import { 
  BRAZIL_TOLL_PLAZAS, 
  TollPlaza, 
  VehicleCategoryId, 
  VEHICLE_CATEGORIES, 
  FuelTypeId, 
  FUEL_OPTIONS,
  WEIGH_STATIONS,
  GAS_STATIONS,
  WeighStation,
  GasStationPoint
} from '../data/tollPlazasData';
import { PRF_HIGHWAY_STATIONS, PrfStation } from '../data/placesAndPoiData';
import { POPULAR_LOCATIONS } from '../data/locations';
import { Location } from '../types';

export interface RouteWaypoint {
  id: string;
  label: string; // "A", "B", "C", etc.
  name: string; // "São Paulo, SP"
  lat: number;
  lng: number;
  isCustom?: boolean;
}

export interface RotogramaStep {
  id: string;
  type: 'start' | 'highway_entry' | 'toll' | 'weigh_station' | 'gas_station' | 'prf_station' | 'waypoint' | 'finish';
  title: string;
  description: string;
  distanceKmFromStart: number;
  accumulatedMinutes: number;
  tollDetails?: {
    plazaName: string;
    concessionaire: string;
    highway: string;
    costBRL: number;
    paymentMethods: string[];
  };
  prfDetails?: {
    name: string;
    highway: string;
    emergencyPhone: string;
    services: string[];
  };
}

export interface CalculatedRouteResult {
  id: string;
  name: string; // e.g. "ROTA 1 - Principal (Via Dutra)"
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  waypoints: RouteWaypoint[];
  distanceKm: number;
  durationMinutes: number;
  formattedDuration: string; // e.g. "5 h 35 min"
  
  // Costs
  vehicleCategory: VehicleCategoryId;
  tollTotalBRL: number;
  tollPlazasCount: number;
  tollPerAxleBRL: number;
  
  fuelType: FuelTypeId;
  fuelPricePerUnit: number;
  vehicleKmPerLiter: number;
  fuelLitersNeeded: number;
  fuelTotalBRL: number;
  
  totalTripCostBRL: number; // Pedágio + Combustível
  
  // Plazas, Stations & Steps
  tollPlazas: TollPlaza[];
  prfStations: PrfStation[];
  weighStations: WeighStation[];
  gasStations: GasStationPoint[];
  rotograma: RotogramaStep[];
  
  // Geographic polyline for map rendering
  polyline: [number, number][]; // [lat, lng][]
}

// Helper: Haversine distance in KM
export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Distance from a point (P) to a line segment (AB)
function distanceToSegment(
  pLat: number, pLng: number, 
  aLat: number, aLng: number, 
  bLat: number, bLng: number
): number {
  const l2 = (bLat - aLat) * (bLat - aLat) + (bLng - aLng) * (bLng - aLng);
  if (l2 === 0) return calculateDistanceKm(pLat, pLng, aLat, aLng);
  
  // Project P onto AB
  let t = ((pLat - aLat) * (bLat - aLat) + (pLng - aLng) * (bLng - aLng)) / l2;
  t = Math.max(0, Math.min(1, t));
  
  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);
  return calculateDistanceKm(pLat, pLng, projLat, projLng);
}

// Check if a toll plaza is along the route corridor (within max distance of the polyline segments)
export function findPlazasAlongPolyline(polyline: [number, number][], corridorBufferKm = 18): TollPlaza[] {
  const matchedPlazas: { plaza: TollPlaza; progress: number }[] = [];

  for (const plaza of BRAZIL_TOLL_PLAZAS) {
    let minDistanceToRoute = Infinity;
    let closestSegmentIndex = 0;

    for (let i = 0; i < polyline.length - 1; i++) {
      const [aLat, aLng] = polyline[i];
      const [bLat, bLng] = polyline[i + 1];
      const d = distanceToSegment(plaza.lat, plaza.lng, aLat, aLng, bLat, bLng);
      if (d < minDistanceToRoute) {
        minDistanceToRoute = d;
        closestSegmentIndex = i;
      }
    }

    if (minDistanceToRoute <= corridorBufferKm) {
      matchedPlazas.push({
        plaza,
        progress: closestSegmentIndex
      });
    }
  }

  // Sort plazas by order of encounter along the route
  matchedPlazas.sort((a, b) => a.progress - b.progress);
  return matchedPlazas.map(m => m.plaza);
}

// Find all PRF Police Stations along the highway corridor
export function findPrfStationsAlongPolyline(polyline: [number, number][], corridorBufferKm = 24): PrfStation[] {
  const matched: { station: PrfStation; progress: number }[] = [];

  for (const station of PRF_HIGHWAY_STATIONS) {
    let minDistanceToRoute = Infinity;
    let closestSegmentIndex = 0;

    for (let i = 0; i < polyline.length - 1; i++) {
      const [aLat, aLng] = polyline[i];
      const [bLat, bLng] = polyline[i + 1];
      const d = distanceToSegment(station.lat, station.lng, aLat, aLng, bLat, bLng);
      if (d < minDistanceToRoute) {
        minDistanceToRoute = d;
        closestSegmentIndex = i;
      }
    }

    if (minDistanceToRoute <= corridorBufferKm) {
      matched.push({
        station,
        progress: closestSegmentIndex
      });
    }
  }

  matched.sort((a, b) => a.progress - b.progress);
  return matched.map(m => m.station);
}

// Format duration in Brazilian style (e.g. "2 d 3 h 20 min" or "5 h 35 min")
export function formatRouteDuration(minutes: number): string {
  const days = Math.floor(minutes / (24 * 60));
  const remainingMinutesAfterDays = minutes % (24 * 60);
  const hours = Math.floor(remainingMinutesAfterDays / 60);
  const mins = remainingMinutesAfterDays % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days} d`);
  if (hours > 0 || days > 0) parts.push(`${hours} h`);
  parts.push(`${mins} min`);

  return parts.join(' ');
}

// Generate realistic polyline points between two points (interpolating intermediate points with slight highway curve)
function generateHighwayPolyline(
  start: { lat: number; lng: number }, 
  end: { lat: number; lng: number }, 
  steps = 15
): [number, number][] {
  const points: [number, number][] = [];
  
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Linear base
    let lat = start.lat + (end.lat - start.lat) * t;
    let lng = start.lng + (end.lng - start.lng) * t;
    
    // Add natural geographic curvature of Brazilian highway corridors
    const curvature = Math.sin(t * Math.PI) * 0.12;
    // Orient curvature based on road direction
    if (Math.abs(start.lng - end.lng) > Math.abs(start.lat - end.lat)) {
      lat += curvature * 0.4;
    } else {
      lng += curvature * 0.4;
    }

    points.push([lat, lng]);
  }
  return points;
}

// Preset popular Brazilian highway routes with detailed real-world geometry
const PRESET_HIGHWAY_POLYLINES: Record<string, [number, number][]> = {
  'SP-RJ': [
    [-23.5505, -46.6333], // SP Centro
    [-23.4812, -46.5291], // Marginal Tietê / Dutra
    [-23.3962, -46.3218], // Arujá (Pedágio)
    [-23.2845, -46.0821], // Parateí
    [-23.1894, -45.8821], // São José dos Campos
    [-23.0291, -45.5512], // Taubaté
    [-22.9554, -45.3892], // Moreira César (Pedágio)
    [-22.8492, -45.1892], // Aparecida / Guaratinguetá
    [-22.5028, -44.5714], // Itatiaia / Resende (Pedágio)
    [-22.5218, -44.1029], // Volta Redonda / Barra Mansa
    [-22.6892, -43.8821], // Piraí (Descida da Serra)
    [-22.7562, -43.7124], // Seropédica / Viúva Graça (Pedágio)
    [-22.8129, -43.4102], // Baixada Fluminense
    [-22.9068, -43.1729]  // Rio de Janeiro Centro
  ],
  'SP-CWB': [
    [-23.5505, -46.6333], // SP Centro
    [-23.6892, -46.7892], // Taboão da Serra / Embu
    [-23.8492, -46.9421], // São Lourenço da Serra (Pedágio)
    [-24.2753, -47.4589], // Miracatu (Pedágio)
    [-24.3218, -47.6432], // Juquiá (Pedágio)
    [-24.7392, -48.1254], // Cajati (Pedágio)
    [-24.9814, -48.4981], // Barra do Turvo (Pedágio)
    [-25.2912, -49.0721], // Campina Grande do Sul (Pedágio)
    [-25.4284, -49.2733]  // Curitiba Centro
  ],
  'SP-CPQ': [
    [-23.5505, -46.6333], // SP
    [-23.4078, -46.7725], // Perus (Pedágio)
    [-23.2751, -46.8529], // Campo Limpo
    [-23.1892, -46.9982], // Jundiaí
    [-23.1325, -47.0543], // Itupeva (Pedágio)
    [-23.0118, -47.0392], // Valinhos (Pedágio)
    [-22.9099, -47.0626]  // Campinas
  ],
  'SP-SSZ': [
    [-23.5505, -46.6333], // SP
    [-23.7712, -46.5492], // Piratininga / Riacho Grande (Pedágio)
    [-23.8821, -46.4912], // Serra do Mar
    [-23.9608, -46.3336]  // Santos
  ]
};

// Main Route Planning Calculation Function
export function calculateRoadTripRoute({
  origin,
  destination,
  waypoints = [],
  vehicleCategoryId = 'car',
  fuelTypeId = 'gasolina',
  customFuelPrice,
  customKmPerLiter
}: {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  waypoints?: RouteWaypoint[];
  vehicleCategoryId?: VehicleCategoryId;
  fuelTypeId?: FuelTypeId;
  customFuelPrice?: number;
  customKmPerLiter?: number;
}): CalculatedRouteResult {
  const vehicleConfig = VEHICLE_CATEGORIES.find(v => v.id === vehicleCategoryId) || VEHICLE_CATEGORIES[0];
  const fuelConfig = FUEL_OPTIONS.find(f => f.id === fuelTypeId) || FUEL_OPTIONS[0];

  const fuelPrice = customFuelPrice !== undefined && customFuelPrice > 0 ? customFuelPrice : fuelConfig.defaultPriceBRL;
  const kmPerLiter = customKmPerLiter !== undefined && customKmPerLiter > 0 ? customKmPerLiter : vehicleConfig.defaultFuelKmPerL;

  // Build full coordinate points sequence: Origin -> Waypoints -> Destination
  const allWaypoints = [origin, ...waypoints, destination];
  
  // Check if we have a preset corridor for standard city pairs
  let fullPolyline: [number, number][] = [];
  const routeKey = `${origin.name.includes('São Paulo') ? 'SP' : ''}-${destination.name.includes('Rio') ? 'RJ' : destination.name.includes('Curitiba') ? 'CWB' : destination.name.includes('Campinas') ? 'CPQ' : destination.name.includes('Santos') ? 'SSZ' : ''}`;
  
  if (PRESET_HIGHWAY_POLYLINES[routeKey] && waypoints.length === 0) {
    fullPolyline = PRESET_HIGHWAY_POLYLINES[routeKey];
  } else {
    // Generate chained polyline through each waypoint
    for (let i = 0; i < allWaypoints.length - 1; i++) {
      const legStart = allWaypoints[i];
      const legEnd = allWaypoints[i + 1];
      const legPoints = generateHighwayPolyline(
        { lat: legStart.lat, lng: legStart.lng },
        { lat: legEnd.lat, lng: legEnd.lng }
      );
      if (i > 0) legPoints.shift(); // avoid duplicate joining node
      fullPolyline.push(...legPoints);
    }
  }

  // Calculate total road distance by summing polyline segments (with road tortuosity factor 1.18x for realistic Brazilian highway topography)
  let straightDistance = 0;
  for (let i = 0; i < fullPolyline.length - 1; i++) {
    const [lat1, lon1] = fullPolyline[i];
    const [lat2, lon2] = fullPolyline[i + 1];
    straightDistance += calculateDistanceKm(lat1, lon1, lat2, lon2);
  }
  const totalDistanceKm = Math.round(straightDistance * 1.16);

  // Estimate duration: average highway speed 80 km/h for heavy vehicles, 95 km/h for cars + traffic/tolls buffer
  const avgSpeed = vehicleConfig.axles >= 3 ? 75 : 92;
  const totalDurationMinutes = Math.round((totalDistanceKm / avgSpeed) * 60 + (totalDistanceKm > 200 ? 30 : 15));

  // Find all toll plazas along the highway corridor
  const tollPlazas = findPlazasAlongPolyline(fullPolyline, 22);

  // Compute toll cost per plaza based on vehicle category
  let totalTollCost = 0;
  for (const plaza of tollPlazas) {
    let rate = plaza.rates.car;
    switch (vehicleCategoryId) {
      case 'motorcycle':
        rate = plaza.rates.motorcycle;
        break;
      case 'utility':
        rate = plaza.rates.utility;
        break;
      case 'truck_2axles':
        rate = plaza.rates.truck_2axles;
        break;
      case 'truck_3axles':
        rate = plaza.rates.truck_3axles;
        break;
      case 'truck_4axles':
        rate = plaza.rates.truck_4axles;
        break;
      case 'truck_6axles':
        rate = plaza.rates.truck_6axles;
        break;
      case 'truck_7axles':
        rate = plaza.rates.truck_7axles;
        break;
      case 'truck_9axles':
        rate = plaza.rates.truck_9axles;
        break;
      case 'bus_2axles':
        rate = plaza.rates.bus_2axles;
        break;
      case 'bus_3axles':
        rate = plaza.rates.bus_3axles;
        break;
      default:
        rate = plaza.rates.car;
    }
    totalTollCost += rate;
  }

  // Average toll per axle
  const tollPerAxle = vehicleConfig.axles > 0 ? totalTollCost / vehicleConfig.axles : totalTollCost;

  // Calculate fuel liters and cost
  const fuelLitersNeeded = Number((totalDistanceKm / kmPerLiter).toFixed(1));
  const fuelTotalBRL = Number((fuelLitersNeeded * fuelPrice).toFixed(2));
  const totalTripCostBRL = Number((totalTollCost + fuelTotalBRL).toFixed(2));

  // Find matched weigh stations, gas stations, and PRF police stations
  const matchedWeighStations = WEIGH_STATIONS.filter(ws => {
    return fullPolyline.some(([pLat, pLng]) => calculateDistanceKm(ws.lat, ws.lng, pLat, pLng) < 25);
  });

  const matchedGasStations = GAS_STATIONS.filter(gs => {
    return fullPolyline.some(([pLat, pLng]) => calculateDistanceKm(gs.lat, gs.lng, pLat, pLng) < 25);
  });

  const matchedPrfStations = findPrfStationsAlongPolyline(fullPolyline, 25);

  // Construct detailed step-by-step Rotograma
  const rotograma: RotogramaStep[] = [];
  
  // Start
  rotograma.push({
    id: 'step_start',
    type: 'start',
    title: `Partida em ${origin.name}`,
    description: `Início da viagem com destino a ${destination.name}. Tanque recomendado cheio (${fuelLitersNeeded} ${fuelConfig.unit} previstos).`,
    distanceKmFromStart: 0,
    accumulatedMinutes: 0
  });

  // Intermediate plazas and PRF posts along the route
  tollPlazas.forEach((plaza, idx) => {
    const fraction = (idx + 1) / (tollPlazas.length + 1);
    const kmAtPlaza = Math.round(totalDistanceKm * fraction);
    const minAtPlaza = Math.round(totalDurationMinutes * fraction);
    
    let rate = plaza.rates.car;
    if (vehicleCategoryId === 'motorcycle') rate = plaza.rates.motorcycle;
    else if (vehicleCategoryId === 'truck_3axles') rate = plaza.rates.truck_3axles;
    else if (vehicleCategoryId === 'truck_6axles') rate = plaza.rates.truck_6axles;
    else if (vehicleCategoryId === 'bus_2axles') rate = plaza.rates.bus_2axles;

    rotograma.push({
      id: `step_toll_${plaza.id}`,
      type: 'toll',
      title: `${plaza.name} (${plaza.concessionaire})`,
      description: `Tarifa: R$ ${rate.toFixed(2).replace('.', ',')} para ${vehicleConfig.name}. Aceita: ${plaza.paymentMethods.slice(0, 3).map(p => p.toUpperCase().replace('_', ' ')).join(', ')}.`,
      distanceKmFromStart: kmAtPlaza,
      accumulatedMinutes: minAtPlaza,
      tollDetails: {
        plazaName: plaza.name,
        concessionaire: plaza.concessionaire,
        highway: plaza.highway,
        costBRL: rate,
        paymentMethods: plaza.paymentMethods
      }
    });
  });

  // Add PRF Stations to Rotograma
  matchedPrfStations.forEach(prf => {
    rotograma.push({
      id: `step_prf_${prf.id}`,
      type: 'prf_station',
      title: `🚨 ${prf.name} (${prf.highway} km ${prf.km})`,
      description: `Fiscalização e apoio ao motorista. Emergência PRF Ligue 191. Serviços: ${prf.services.slice(0, 2).join(', ')}.`,
      distanceKmFromStart: Math.round(totalDistanceKm * 0.45),
      accumulatedMinutes: Math.round(totalDurationMinutes * 0.45),
      prfDetails: {
        name: prf.name,
        highway: prf.highway,
        emergencyPhone: prf.emergencyPhone,
        services: prf.services
      }
    });
  });

  // Finish
  rotograma.push({
    id: 'step_finish',
    type: 'finish',
    title: `Chegada em ${destination.name}`,
    description: `Destino final alcançado. Total de ${totalDistanceKm} km percorridos, ${tollPlazas.length} praça(s) de pedágio e ${matchedPrfStations.length} posto(s) da PRF.`,
    distanceKmFromStart: totalDistanceKm,
    accumulatedMinutes: totalDurationMinutes
  });

  return {
    id: `route_${Date.now()}`,
    name: 'ROTA 1 - Mais Rápida / Principal',
    origin,
    destination,
    waypoints,
    distanceKm: totalDistanceKm,
    durationMinutes: totalDurationMinutes,
    formattedDuration: formatRouteDuration(totalDurationMinutes),
    vehicleCategory: vehicleCategoryId,
    tollTotalBRL: totalTollCost,
    tollPlazasCount: tollPlazas.length,
    tollPerAxleBRL: Number(tollPerAxle.toFixed(2)),
    fuelType: fuelTypeId,
    fuelPricePerUnit: fuelPrice,
    vehicleKmPerLiter: kmPerLiter,
    fuelLitersNeeded,
    fuelTotalBRL,
    totalTripCostBRL,
    tollPlazas,
    prfStations: matchedPrfStations,
    weighStations: matchedWeighStations,
    gasStations: matchedGasStations,
    rotograma,
    polyline: fullPolyline
  };
}

// Generate shareable message for drivers ("Enviar para motorista")
export function generateDriverShareText(route: CalculatedRouteResult): string {
  const vehicle = VEHICLE_CATEGORIES.find(v => v.id === route.vehicleCategory)?.name || 'Veículo';
  
  let text = `🚗 *PLANEJAMENTO DE VIAGEM - MÓDULO VIAGENS*\n`;
  text += `📍 *Origem:* ${route.origin.name}\n`;
  if (route.waypoints.length > 0) {
    text += `🛑 *Paradas:* ${route.waypoints.map(w => w.name).join(' ➔ ')}\n`;
  }
  text += `🏁 *Destino:* ${route.destination.name}\n`;
  text += `------------------------------------\n`;
  text += `📏 *Distância Total:* ${route.distanceKm} km\n`;
  text += `⏱️ *Tempo Estimado:* ${route.formattedDuration}\n`;
  text += `🚛 *Veículo:* ${vehicle}\n`;
  text += `------------------------------------\n`;
  text += `💰 *RESUMO DE CUSTOS:*\n`;
  text += `• Pedágio (${route.tollPlazasCount} praças): R$ ${route.tollTotalBRL.toFixed(2).replace('.', ',')}\n`;
  text += `• Combustível (${route.fuelLitersNeeded}L est.): R$ ${route.fuelTotalBRL.toFixed(2).replace('.', ',')}\n`;
  text += `⭐ *CUSTO TOTAL:* R$ ${route.totalTripCostBRL.toFixed(2).replace('.', ',')}\n`;
  text += `------------------------------------\n`;
  if (route.tollPlazas.length > 0) {
    text += `🛣️ *PRAÇAS DE PEDÁGIO NO CAMINHO:*\n`;
    route.tollPlazas.forEach((p, idx) => {
      text += `${idx + 1}. ${p.name} (${p.highway}) - R$ ${p.rates.car.toFixed(2).replace('.', ',')}\n`;
    });
  }
  if (route.prfStations && route.prfStations.length > 0) {
    text += `------------------------------------\n`;
    text += `🚨 *POSTOS PRF NO CAMINHO (Emergência 191):*\n`;
    route.prfStations.forEach(prf => {
      text += `• ${prf.name} - ${prf.highway} km ${prf.km}\n`;
    });
  }
  text += `\nGerado via Módulo VIAGENS. Boa viagem!`;
  return text;
}
