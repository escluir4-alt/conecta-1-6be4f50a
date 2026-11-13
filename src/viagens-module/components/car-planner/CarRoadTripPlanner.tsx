import { useState, useMemo, useRef, useEffect } from 'react';
import { 
  MapPin, 
  Car, 
  Plus, 
  Trash2, 
  ArrowUpDown, 
  Fuel, 
  Navigation, 
  Share2, 
  Download, 
  Printer, 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  CircleDollarSign, 
  Scale, 
  FileSpreadsheet, 
  Send, 
  ZoomIn, 
  ZoomOut, 
  Compass, 
  Maximize2,
  Sparkles,
  ArrowRight,
  Info,
  DollarSign,
  Shield,
  ShieldAlert,
  PhoneCall,
  ExternalLink,
  LocateFixed,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { 
  VEHICLE_CATEGORIES, 
  FUEL_OPTIONS, 
  VehicleCategoryId, 
  FuelTypeId, 
  TollPlaza,
  BRAZIL_TOLL_PLAZAS 
} from '../../data/tollPlazasData';
import { 
  calculateRoadTripRoute, 
  CalculatedRouteResult, 
  RouteWaypoint,
  calculateDistanceKm 
} from '../../services/tollEngine';
import { PrfStation } from '../../data/placesAndPoiData';
import { POPULAR_LOCATIONS } from '../../data/locations';
import { SmartLocationSearchInput } from './SmartLocationSearchInput';
import { GoogleMapRouteDirector } from './GoogleMapRouteDirector';
import { ShareDriverModal } from './ShareDriverModal';
import { ExportReportModal } from './ExportReportModal';
import { GpsExportModal } from './GpsExportModal';

interface CarRoadTripPlannerProps {
  onBackToTickets?: () => void;
  initialOriginCity?: string;
  initialDestCity?: string;
}

export function CarRoadTripPlanner({
  onBackToTickets,
  initialOriginCity = 'São Paulo',
  initialDestCity = 'Rio de Janeiro'
}: CarRoadTripPlannerProps) {
  // Read Maps API key from environment
  const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

  // Preset Brazilian Route Shortcuts
  const PRESET_ROUTES = [
    { name: 'São Paulo ↔ Rio de Janeiro', origin: 'São Paulo', dest: 'Rio de Janeiro', highway: 'Via Dutra (BR-116)' },
    { name: 'São Paulo ↔ Curitiba', origin: 'São Paulo', dest: 'Curitiba', highway: 'Régis Bittencourt (BR-116)' },
    { name: 'São Paulo ↔ Campinas', origin: 'São Paulo', dest: 'Campinas', highway: 'Anhanguera / Bandeirantes' },
    { name: 'São Paulo ↔ Santos', origin: 'São Paulo', dest: 'Santos', highway: 'Imigrantes (SP-160)' },
    { name: 'Rio de Janeiro ↔ Belo Horizonte', origin: 'Rio de Janeiro', dest: 'Belo Horizonte', highway: 'BR-040' },
    { name: 'Recife ↔ Natal', origin: 'Recife', dest: 'Natal', highway: 'Litoral Nordeste (BR-101)' },
    { name: 'Salvador ↔ Feira de Santana', origin: 'Salvador', dest: 'Feira de Santana', highway: 'BR-324' }
  ];

  // Route Waypoints State (A, B, C, D, E...)
  const [originWaypoint, setOriginWaypoint] = useState<RouteWaypoint>({
    id: 'origin_sp',
    label: 'A',
    name: 'São Paulo, SP',
    lat: -23.5505,
    lng: -46.6333
  });

  const [destWaypoint, setDestWaypoint] = useState<RouteWaypoint>({
    id: 'dest_rj',
    label: 'B',
    name: 'Rio de Janeiro, RJ',
    lat: -22.9068,
    lng: -43.1729
  });

  // Intermediate stops (array of waypoints)
  const [intermediateStops, setIntermediateStops] = useState<RouteWaypoint[]>([]);

  // Vehicle & Fuel Configuration State
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleCategoryId>('car');
  const [selectedFuel, setSelectedFuel] = useState<FuelTypeId>('gasolina');
  const [customFuelPrice, setCustomFuelPrice] = useState<number>(6.09);
  const [customKmPerL, setCustomKmPerL] = useState<number>(12.0);
  const [selectedTollTag, setSelectedTollTag] = useState<string>('sem_parar');

  // Accordion Expand/Collapse State
  const [openAccordions, setOpenAccordions] = useState<{
    tolls: boolean;
    prf: boolean;
    weighAndGas: boolean;
    rotograma: boolean;
  }>({
    tolls: true,
    prf: true,
    weighAndGas: false,
    rotograma: false
  });

  // Layer Toggles on Map
  const [showTollsLayer, setShowTollsLayer] = useState(true);
  const [showPrfLayer, setShowPrfLayer] = useState(true);
  const [showGasStationsLayer, setShowGasStationsLayer] = useState(true);
  const [showWeighStationsLayer, setShowWeighStationsLayer] = useState(true);

  // Selected Detail Popovers
  const [selectedPlazaForDetail, setSelectedPlazaForDetail] = useState<TollPlaza | null>(null);
  const [selectedPrfForDetail, setSelectedPrfForDetail] = useState<PrfStation | null>(null);

  // Modals State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGpsModalOpen, setIsGpsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Interactive Fallback Map Zoom/Pan
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({
    lat: -23.2,
    lng: -44.9
  });

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Synchronize fuel & km/L defaults when vehicle or fuel changes
  const handleVehicleChange = (newCat: VehicleCategoryId) => {
    setSelectedVehicle(newCat);
    const cat = VEHICLE_CATEGORIES.find(v => v.id === newCat);
    if (cat) {
      setCustomKmPerL(cat.defaultFuelKmPerL);
    }
  };

  const handleFuelChange = (newFuel: FuelTypeId) => {
    setSelectedFuel(newFuel);
    const fuel = FUEL_OPTIONS.find(f => f.id === newFuel);
    if (fuel) {
      setCustomFuelPrice(fuel.defaultPriceBRL);
    }
  };

  // Re-label waypoints sequentially (A, B, C, D, E...)
  const relabeledIntermediateStops = useMemo(() => {
    return intermediateStops.map((stop, idx) => ({
      ...stop,
      label: String.fromCharCode(66 + idx) // B, C, D...
    }));
  }, [intermediateStops]);

  const destinationLabel = useMemo(() => {
    return String.fromCharCode(66 + intermediateStops.length);
  }, [intermediateStops.length]);

  // Calculate the Route using our Toll Engine
  const calculatedRoute: CalculatedRouteResult = useMemo(() => {
    return calculateRoadTripRoute({
      origin: originWaypoint,
      destination: { ...destWaypoint, label: destinationLabel },
      waypoints: relabeledIntermediateStops,
      vehicleCategoryId: selectedVehicle,
      fuelTypeId: selectedFuel,
      customFuelPrice,
      customKmPerLiter: customKmPerL
    });
  }, [
    originWaypoint, 
    destWaypoint, 
    destinationLabel,
    relabeledIntermediateStops, 
    selectedVehicle, 
    selectedFuel, 
    customFuelPrice, 
    customKmPerL
  ]);

  // Center map on route when polyline updates
  useEffect(() => {
    if (calculatedRoute.polyline.length > 0) {
      const midIdx = Math.floor(calculatedRoute.polyline.length / 2);
      setMapCenter({
        lat: calculatedRoute.polyline[midIdx][0],
        lng: calculatedRoute.polyline[midIdx][1]
      });
    }
  }, [calculatedRoute.polyline]);

  // Handle Preset Route Selection
  const applyPresetRoute = (preset: typeof PRESET_ROUTES[0]) => {
    const locOrigin = POPULAR_LOCATIONS.find(l => l.city.toLowerCase() === preset.origin.toLowerCase()) || {
      id: 'custom_orig',
      name: `${preset.origin}, Brasil`,
      city: preset.origin,
      state: 'BR',
      code: 'BR',
      type: 'city_all' as const,
      country: 'Brasil'
    };
    const locDest = POPULAR_LOCATIONS.find(l => l.city.toLowerCase() === preset.dest.toLowerCase()) || {
      id: 'custom_dest',
      name: `${preset.dest}, Brasil`,
      city: preset.dest,
      state: 'BR',
      code: 'BR',
      type: 'city_all' as const,
      country: 'Brasil'
    };

    setOriginWaypoint({
      id: `w_orig_${Date.now()}`,
      label: 'A',
      name: `${locOrigin.city}, ${locOrigin.state}`,
      lat: locOrigin.city === 'São Paulo' ? -23.5505 : locOrigin.city === 'Rio de Janeiro' ? -22.9068 : locOrigin.city === 'Curitiba' ? -25.4284 : locOrigin.city === 'Recife' ? -8.0476 : -23.5,
      lng: locOrigin.city === 'São Paulo' ? -46.6333 : locOrigin.city === 'Rio de Janeiro' ? -43.1729 : locOrigin.city === 'Curitiba' ? -49.2733 : locOrigin.city === 'Recife' ? -34.8770 : -46.6
    });

    setDestWaypoint({
      id: `w_dest_${Date.now()}`,
      label: 'B',
      name: `${locDest.city}, ${locDest.state}`,
      lat: locDest.city === 'Rio de Janeiro' ? -22.9068 : locDest.city === 'Curitiba' ? -25.4284 : locDest.city === 'Campinas' ? -22.9099 : locDest.city === 'Santos' ? -23.9608 : locDest.city === 'Natal' ? -5.7945 : -22.9,
      lng: locDest.city === 'Rio de Janeiro' ? -43.1729 : locDest.city === 'Curitiba' ? -49.2733 : locDest.city === 'Campinas' ? -47.0626 : locDest.city === 'Santos' ? -46.3336 : locDest.city === 'Natal' ? -35.2110 : -43.1
    });

    setIntermediateStops([]);
    showNotification(`Rota configurada: ${preset.name} (${preset.highway})`);
  };

  // Swap Origin and Destination
  const handleSwapPoints = () => {
    const temp = { ...originWaypoint, label: 'A' };
    setOriginWaypoint({ ...destWaypoint, label: 'A' });
    setDestWaypoint({ ...temp, label: destinationLabel });
    showNotification('Origem e destino invertidos');
  };

  // Add intermediate stop (chaining A, B, C, D, E...)
  const handleAddStop = () => {
    const newIdx = intermediateStops.length;
    const newChar = String.fromCharCode(66 + newIdx); // B, C, D...
    const newStop: RouteWaypoint = {
      id: `stop_${Date.now()}`,
      label: newChar,
      name: 'Aparecida, SP',
      lat: -22.8492,
      lng: -45.2291
    };
    setIntermediateStops(prev => [...prev, newStop]);
    showNotification(`Parada ${newChar} adicionada ao itinerário`);
  };

  // Remove intermediate stop
  const handleRemoveStop = (index: number) => {
    setIntermediateStops(prev => prev.filter((_, i) => i !== index));
    showNotification('Parada removida');
  };

  // Move stop up in chain
  const handleMoveStopUp = (index: number) => {
    if (index === 0) return;
    setIntermediateStops(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  // Move stop down in chain
  const handleMoveStopDown = (index: number) => {
    if (index === intermediateStops.length - 1) return;
    setIntermediateStops(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // SVG Projection Helpers for Vector Fallback Map
  const mapBounds = useMemo(() => {
    const lats = calculatedRoute.polyline.map(p => p[0]);
    const lngs = calculatedRoute.polyline.map(p => p[1]);
    const minLat = Math.min(...lats) - 0.4;
    const maxLat = Math.max(...lats) + 0.4;
    const minLng = Math.min(...lngs) - 0.5;
    const maxLng = Math.max(...lngs) + 0.5;
    return { minLat, maxLat, minLng, maxLng };
  }, [calculatedRoute.polyline]);

  const projectToSvg = (lat: number, lng: number, width = 800, height = 600) => {
    const { minLat, maxLat, minLng, maxLng } = mapBounds;
    const latSpan = maxLat - minLat || 1;
    const lngSpan = maxLng - minLng || 1;
    const x = ((lng - minLng) / lngSpan) * (width - 120) + 60;
    const y = ((maxLat - lat) / latSpan) * (height - 120) + 60;
    return { x, y };
  };

  const svgPolylinePoints = useMemo(() => {
    return calculatedRoute.polyline
      .map(([lat, lng]) => {
        const { x, y } = projectToSvg(lat, lng);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [calculatedRoute.polyline, mapBounds]);

  const plannerContent = (
    <div className="flex flex-col min-h-screen bg-slate-100">
      {/* Top Header Bar */}
      <header className="bg-slate-900 text-white px-4 sm:px-6 py-3 border-b border-slate-800 shadow-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          {/* Logo & Section Title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center font-black shadow-xs">
              <Car className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-orange-400 uppercase">
                  RODOVIAS & PEDÁGIOS BRASIL
                </span>
                <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded font-mono border border-emerald-800/80">
                  Plataforma Independente
                </span>
              </div>
              <h1 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5">
                <span>Roteirizador de Estradas, Praças de Pedágio, Postos PRF e Combustível</span>
              </h1>
            </div>
          </div>

          {/* Quick preset routes pills */}
          <div className="hidden xl:flex items-center gap-1.5 overflow-x-auto text-xs py-1">
            <span className="text-slate-400 text-[11px] mr-1">Rotas Rápidas:</span>
            {PRESET_ROUTES.slice(0, 5).map((p, idx) => (
              <button
                key={idx}
                onClick={() => applyPresetRoute(p)}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-lg text-[11px] font-semibold transition-colors shrink-0 border border-slate-700/60 cursor-pointer"
              >
                {p.name}
              </button>
            ))}
          </div>

          {/* Right Actions: Enviar p/ GPS + Compartilhar Rota */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsGpsModalOpen(true)}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              title="Exportar rota para Waze ou Google Maps no celular"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Enviar p/ GPS</span>
            </button>
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer"
              title="Compartilhar itinerário com motorista via WhatsApp"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace: Left Panel + Right Map */}
      <div className="flex-1 max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden shadow-xl bg-white border-x border-slate-200">
        
        {/* ======================================================== */}
        {/* LEFT PANEL: Inputs, Costs, Plazas Accordions (Cols 1-5) */}
        {/* ======================================================== */}
        <aside className="lg:col-span-5 border-r border-slate-200 flex flex-col bg-white max-h-[calc(100vh-64px)] overflow-y-auto">
          <div className="p-4 sm:p-5 space-y-4">
            
            {/* 1. Smart Waypoint Search Inputs (Origin, Intermediate Stops, Destination) */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/90 space-y-3 relative">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200/70">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-orange-600" />
                  Itinerário da Viagem
                </span>
                <button
                  type="button"
                  onClick={handleSwapPoints}
                  title="Inverter origem e destino"
                  className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 rounded-md transition-colors"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Point A: Origin with Smart Autocomplete */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>Ponto de Partida (A)</span>
                  <span className="text-[10px] text-slate-400">Cidade, Ponto Turístico, CEP ou GPS</span>
                </label>
                <SmartLocationSearchInput
                  label="A"
                  badgeColorClass="bg-sky-600"
                  value={originWaypoint.name}
                  currentWaypoint={originWaypoint}
                  onSelectWaypoint={(w) => setOriginWaypoint(w)}
                  placeholder="Ex: Meu local, Rodoviária Tietê, CEP 01310-100 ou -23.55, -46.63..."
                />
              </div>

              {/* Intermediate Stops Chaining (B, C, D, E...) */}
              {relabeledIntermediateStops.map((stop, idx) => (
                <div key={stop.id} className="space-y-1 pt-1 border-t border-slate-200/50">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                    <span>Parada Intermediária ({stop.label})</span>
                    <div className="flex items-center gap-1">
                      {idx > 0 && (
                        <button
                          type="button"
                          onClick={() => handleMoveStopUp(idx)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Mover para cima"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                      )}
                      {idx < intermediateStops.length - 1 && (
                        <button
                          type="button"
                          onClick={() => handleMoveStopDown(idx)}
                          className="p-1 text-slate-400 hover:text-slate-700"
                          title="Mover para baixo"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <SmartLocationSearchInput
                    label={stop.label}
                    badgeColorClass="bg-amber-500"
                    value={stop.name}
                    currentWaypoint={stop}
                    showRemoveButton={true}
                    onRemove={() => handleRemoveStop(idx)}
                    onSelectWaypoint={(w) => {
                      setIntermediateStops(prev => prev.map((s, i) => i === idx ? { ...w, label: stop.label } : s));
                    }}
                    placeholder={`Parada ${stop.label}: Digite cidade, coordenadas ou CEP...`}
                  />
                </div>
              ))}

              {/* Destination Point with Smart Autocomplete */}
              <div className="space-y-1 pt-1 border-t border-slate-200/50">
                <label className="text-[11px] font-bold text-slate-600 flex items-center justify-between">
                  <span>Destino Final ({destinationLabel})</span>
                  <span className="text-[10px] text-slate-400">Destino final da rota</span>
                </label>
                <SmartLocationSearchInput
                  label={destinationLabel}
                  badgeColorClass="bg-emerald-600"
                  value={destWaypoint.name}
                  currentWaypoint={destWaypoint}
                  onSelectWaypoint={(w) => setDestWaypoint(w)}
                  placeholder="Ex: Rio de Janeiro, Recife, Natal, CEP ou coordenadas..."
                />
              </div>

              {/* Add Stop Button */}
              <div className="pt-2 flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={handleAddStop}
                  className="px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl font-bold flex items-center gap-1.5 border border-orange-200 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Adicionar Parada ao Itinerário</span>
                </button>
                <span className="text-[11px] text-slate-500 font-semibold font-mono">
                  {calculatedRoute.distanceKm} km · {calculatedRoute.formattedDuration}
                </span>
              </div>
            </div>

            {/* 2. Vehicle Category & Fuel Configuration */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Fuel className="w-3.5 h-3.5 text-orange-600" />
                  Consumo, Combustível & Custos
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Cálculo Dinâmico
                </span>
              </div>

              {/* Vehicle Dropdown */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Categoria do Veículo (Tarifa por Eixos):</span>
                  <span className="text-[10px] text-slate-500 font-normal">Ajusta pedágio e consumo</span>
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => handleVehicleChange(e.target.value as VehicleCategoryId)}
                  className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded-xl px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:outline-hidden shadow-xs cursor-pointer"
                >
                  {VEHICLE_CATEGORIES.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.icon} {v.name} ({v.axles} {v.axles === 1 ? 'eixo' : 'eixos'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fuel Inputs Grid: Consumo Médio (km/l) & Preço do Combustível (R$/l) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Field 1: Consumo Médio (km/l) */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-orange-500" />
                      <span>Consumo Médio (km/l)</span>
                    </label>
                    <span className="text-[10px] font-mono text-slate-500 font-semibold">
                      {customKmPerL.toFixed(1)} km/l
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomKmPerL(v => Math.max(1, Number((v - 0.5).toFixed(1))))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Diminuir consumo"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      max="60"
                      value={customKmPerL}
                      onChange={(e) => setCustomKmPerL(Math.max(0.5, Number(e.target.value) || 1))}
                      className="flex-1 text-center text-xs font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setCustomKmPerL(v => Math.min(60, Number((v + 0.5).toFixed(1))))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Aumentar consumo"
                    >
                      +
                    </button>
                  </div>

                  {/* Quick consumption presets */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCustomKmPerL(14.0)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        customKmPerL === 14.0 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      14 km/l (Econômico)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomKmPerL(11.5)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        customKmPerL === 11.5 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      11.5 km/l (Médio)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCustomKmPerL(8.0)}
                      className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                        customKmPerL === 8.0 ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      8 km/l (SUV)
                    </button>
                  </div>
                </div>

                {/* Field 2: Preço do Combustível (R$/l) */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-extrabold text-slate-800 flex items-center gap-1">
                      <DollarSign className="w-3 h-3 text-emerald-600" />
                      <span>Preço do Combustível (R$/l)</span>
                    </label>
                    <span className="text-[10px] font-mono text-emerald-700 font-bold">
                      R$ {customFuelPrice.toFixed(2)}/l
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCustomFuelPrice(v => Math.max(0.5, Number((v - 0.10).toFixed(2))))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Diminuir preço"
                    >
                      -
                    </button>
                    <div className="flex-1 relative flex items-center">
                      <span className="absolute left-2.5 text-xs text-slate-400 font-bold">R$</span>
                      <input
                        type="number"
                        step="0.05"
                        min="0.5"
                        value={customFuelPrice}
                        onChange={(e) => setCustomFuelPrice(Math.max(0.1, Number(e.target.value) || 1))}
                        className="w-full text-center text-xs font-black text-slate-900 bg-slate-50 border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-hidden"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomFuelPrice(v => Number((v + 0.10).toFixed(2)))}
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-black text-sm flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                      title="Aumentar preço"
                    >
                      +
                    </button>
                  </div>

                  {/* Fuel Options Quick Selection */}
                  <div className="flex items-center gap-1 mt-2 flex-wrap">
                    {FUEL_OPTIONS.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => handleFuelChange(f.id)}
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                          selectedFuel === f.id ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {f.name.split(' ')[0]} (R$ {f.defaultPriceBRL.toFixed(2)})
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Live Calculation Formula Card */}
              <div className="bg-orange-50/70 border border-orange-200/80 rounded-xl p-2.5 text-[11px] text-orange-950 space-y-1">
                <div className="flex items-center justify-between font-bold text-orange-900">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-orange-600" />
                    <span>Memória de Cálculo da Rota:</span>
                  </span>
                  <span className="font-mono text-xs">
                    {calculatedRoute.distanceKm} km
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 flex flex-wrap items-center justify-between gap-1 pt-0.5">
                  <span>
                    <strong>Litros:</strong> {calculatedRoute.distanceKm} km ÷ {customKmPerL.toFixed(1)} km/l = <strong>{calculatedRoute.fuelLitersNeeded} L</strong>
                  </span>
                  <span>
                    <strong>Combustível:</strong> {calculatedRoute.fuelLitersNeeded} L × R$ {customFuelPrice.toFixed(2)} = <strong className="text-orange-700">R$ {calculatedRoute.fuelTotalBRL.toFixed(2).replace('.', ',')}</strong>
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 flex items-center justify-between pt-0.5 border-t border-orange-200/60">
                  <span><strong>Pedágios ({calculatedRoute.tollPlazasCount} praças):</strong> R$ {calculatedRoute.tollTotalBRL.toFixed(2).replace('.', ',')}</span>
                  <span className="text-emerald-800 font-extrabold text-[11px]">
                    Total: R$ {calculatedRoute.totalTripCostBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Tag de Pedágio */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 mb-1 block">
                  Tag de Pedágio Automático:
                </label>
                <select
                  value={selectedTollTag}
                  onChange={(e) => setSelectedTollTag(e.target.value)}
                  className="w-full text-xs font-semibold text-slate-900 bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus:ring-2 focus:ring-orange-500 focus:outline-hidden cursor-pointer"
                >
                  <option value="sem_parar">Sem Parar (Passe Direto em todas as praças)</option>
                  <option value="conectcar">ConectCar (Aceito nas principais rodovias federais/estaduais)</option>
                  <option value="veloe">Veloe (Compatível com CCR, Arteris, Ecorodovias)</option>
                  <option value="taggy">Taggy / C6 Bank (Cobrança direta em conta)</option>
                  <option value="dinheiro">Pagamento Manual (Dinheiro, Cartão por Aproximação ou Pix)</option>
                </select>
              </div>
            </div>

            {/* 3. Cost Summary Card */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-lg border border-slate-800 space-y-3">
              {/* Top: Route Name & Distance Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div>
                  <span className="text-[11px] uppercase tracking-wider font-extrabold text-orange-400">
                    ROTA PRINCIPAL
                  </span>
                  <div className="text-base font-black text-white">
                    {calculatedRoute.distanceKm} KM
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-medium">Custo Estimado Total</span>
                  <div className="text-lg font-black text-emerald-400">
                    R$ {calculatedRoute.totalTripCostBRL.toFixed(2).replace('.', ',')}
                  </div>
                </div>
              </div>

              {/* Line item breakdowns */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Duração</span>
                  <span className="font-bold text-slate-200">{calculatedRoute.formattedDuration}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Distância Total</span>
                  <span className="font-bold text-slate-200">{calculatedRoute.distanceKm} km</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <span>Pedágio ({calculatedRoute.tollPlazasCount} praças)</span>
                  </span>
                  <span className="font-bold text-amber-400">
                    R$ {calculatedRoute.tollTotalBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Consumo Médio</span>
                  <span className="font-bold text-slate-200">
                    {customKmPerL.toFixed(1)} km/l
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">
                    Combustível ({calculatedRoute.fuelLitersNeeded}L a R$ {customFuelPrice.toFixed(2)}/l)
                  </span>
                  <span className="font-bold text-orange-300">
                    R$ {calculatedRoute.fuelTotalBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80">
                  <span className="text-slate-400">Custo Médio por KM</span>
                  <span className="font-bold text-slate-300">
                    R$ {(calculatedRoute.totalTripCostBRL / Math.max(calculatedRoute.distanceKm, 1)).toFixed(2).replace('.', ',')} / km
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 font-bold text-sm">
                  <span className="text-white">Custo Estimado Total</span>
                  <span className="text-emerald-400 font-extrabold text-base">
                    R$ {calculatedRoute.totalTripCostBRL.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Primary Dual Actions: ENVIAR PARA GPS & ENVIAR PARA MOTORISTA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsGpsModalOpen(true)}
                  className="py-2.5 px-3 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>Enviar para GPS</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="py-2.5 px-3 bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Enviar Motorista</span>
                </button>
              </div>

              {/* Secondary Tools: Excel, Print, Share */}
              <div className="flex items-center justify-center gap-4 pt-1 text-slate-400 text-xs">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Relatório</span>
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-sky-400" />
                  <span>Imprimir</span>
                </button>
                <span className="text-slate-700">·</span>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(true)}
                  className="hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Compartilhar</span>
                </button>
              </div>
            </div>

            {/* 4. Accordion: Praças de Pedágio */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setOpenAccordions(prev => ({ ...prev, tolls: !prev.tolls }))}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 font-bold text-xs text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <CircleDollarSign className="w-4 h-4 text-orange-600" />
                  <span>Praças de Pedágio ({calculatedRoute.tollPlazas.length})</span>
                </div>
                {openAccordions.tolls ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openAccordions.tolls && (
                <div className="p-3 divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                  {calculatedRoute.tollPlazas.length === 0 ? (
                    <div className="py-4 text-center text-slate-400">
                      Nenhuma praça de pedágio encontrada neste trajeto.
                    </div>
                  ) : (
                    calculatedRoute.tollPlazas.map((p, idx) => (
                      <div
                        key={p.id}
                        onClick={() => setSelectedPlazaForDetail(p)}
                        className="py-2.5 px-2 hover:bg-orange-50/60 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-extrabold text-slate-900 flex items-center gap-1.5 truncate">
                            <span className="w-4 h-4 rounded-full bg-orange-100 text-orange-700 text-[10px] flex items-center justify-center font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="truncate">{p.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-500 truncate">
                            {p.highway} · {p.concessionaire} · km {p.km}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            Aceita: {p.paymentMethods.slice(0, 3).map(m => m.replace('_', ' ')).join(', ')}
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-extrabold text-amber-700 text-xs block">
                            R$ {p.rates.car.toFixed(2).replace('.', ',')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {VEHICLE_CATEGORIES.find(v => v.id === selectedVehicle)?.shortName}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 5. Accordion: Postos da PRF (Polícia Rodoviária Federal) */}
            <div className="border border-blue-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setOpenAccordions(prev => ({ ...prev, prf: !prev.prf }))}
                className="w-full px-4 py-3 bg-blue-50/80 hover:bg-blue-100 font-bold text-xs text-blue-900 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-blue-700" />
                  <span>Postos da PRF na Rota ({calculatedRoute.prfStations.length})</span>
                </div>
                {openAccordions.prf ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openAccordions.prf && (
                <div className="p-3 divide-y divide-blue-50 text-xs max-h-64 overflow-y-auto">
                  {calculatedRoute.prfStations.length === 0 ? (
                    <div className="py-3 text-center text-slate-400">
                      Nenhum posto fixo da PRF catalogado diretamente neste segmento. Em emergência rodoviária, disque sempre 191.
                    </div>
                  ) : (
                    calculatedRoute.prfStations.map((prf) => (
                      <div
                        key={prf.id}
                        onClick={() => setSelectedPrfForDetail(prf)}
                        className="py-2.5 px-2 hover:bg-blue-50/70 rounded-xl transition-colors cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-extrabold text-blue-950 flex items-center gap-1.5 truncate">
                            <Shield className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="truncate">{prf.name}</span>
                          </div>
                          <div className="text-[11px] text-slate-600 truncate">
                            {prf.highway} km {prf.km} · {prf.city} ({prf.state})
                          </div>
                          <div className="text-[10px] text-blue-700">
                            {prf.services.slice(0, 2).join(' · ')}
                          </div>
                        </div>

                        <a
                          href="tel:191"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-[10px] font-bold shrink-0 flex items-center gap-1 shadow-xs"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>191</span>
                        </a>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* 6. Accordion: Balanças & Postos de Combustível */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setOpenAccordions(prev => ({ ...prev, weighAndGas: !prev.weighAndGas }))}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 font-bold text-xs text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-sky-600" />
                  <span>Balanças & Postos de Combustível ({calculatedRoute.weighStations.length + calculatedRoute.gasStations.length})</span>
                </div>
                {openAccordions.weighAndGas ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openAccordions.weighAndGas && (
                <div className="p-3 space-y-2 text-xs max-h-56 overflow-y-auto">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Postos de Combustível e Parada:
                  </div>
                  {calculatedRoute.gasStations.map(gs => (
                    <div key={gs.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900">{gs.name}</strong> ({gs.brand})
                        <span className="block text-[11px] text-slate-500">{gs.highway} km {gs.km} · {gs.amenities.join(', ')}</span>
                      </div>
                    </div>
                  ))}

                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pt-2">
                    Balanças Rodoviárias de Carga:
                  </div>
                  {calculatedRoute.weighStations.map(ws => (
                    <div key={ws.id} className="p-2 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <strong className="text-slate-900">{ws.name}</strong>
                        <span className="block text-[11px] text-slate-500">{ws.highway} km {ws.km} · Pesagem {ws.type}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 7. Accordion: Rotograma Passo a Passo */}
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
              <button
                type="button"
                onClick={() => setOpenAccordions(prev => ({ ...prev, rotograma: !prev.rotograma }))}
                className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/80 font-bold text-xs text-slate-800 flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Compass className="w-4 h-4 text-emerald-600" />
                  <span>Rotograma / Instruções Passo a Passo ({calculatedRoute.rotograma.length})</span>
                </div>
                {openAccordions.rotograma ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {openAccordions.rotograma && (
                <div className="p-3 divide-y divide-slate-100 text-xs max-h-64 overflow-y-auto">
                  {calculatedRoute.rotograma.map((step, idx) => (
                    <div key={step.id} className="py-2 flex items-start gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900">{step.title}</div>
                        <p className="text-[11px] text-slate-600">{step.description}</p>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {step.distanceKmFromStart} km percorridos
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </aside>

        {/* ======================================================== */}
        {/* RIGHT PANEL: Interactive Map & Live PRF / Toll Plazas    */}
        {/* ======================================================== */}
        <main className="lg:col-span-7 bg-slate-900 relative flex flex-col min-h-[500px] lg:min-h-[700px] overflow-hidden">
          
          {/* Floating Map Controls & Layer Toggles */}
          <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            {/* Layer Toggles */}
            <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200/80 flex items-center gap-2.5 pointer-events-auto text-xs">
              <span className="text-[11px] font-bold text-slate-600 hidden sm:inline">Camadas:</span>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 text-[11px]">
                <input
                  type="checkbox"
                  checked={showTollsLayer}
                  onChange={(e) => setShowTollsLayer(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500"
                />
                <span>Pedágios</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-blue-700 hover:text-blue-900 text-[11px]">
                <input
                  type="checkbox"
                  checked={showPrfLayer}
                  onChange={(e) => setShowPrfLayer(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <span className="font-bold">Postos PRF</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700 hover:text-slate-900 text-[11px]">
                <input
                  type="checkbox"
                  checked={showGasStationsLayer}
                  onChange={(e) => setShowGasStationsLayer(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                <span>Postos</span>
              </label>
            </div>

            {/* Quick Map Actions */}
            <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-xl shadow-lg border border-slate-200/80 flex items-center gap-1 pointer-events-auto">
              <button
                type="button"
                onClick={() => setMapZoom(z => Math.min(z + 0.25, 2.5))}
                title="Zoom In"
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMapZoom(z => Math.max(z - 0.25, 0.75))}
                title="Zoom Out"
                className="p-1 hover:bg-slate-100 rounded text-slate-700"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Map View */}
          <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden bg-slate-950">
            {googleMapsApiKey ? (
              <Map
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  mapId="DEMO_MAP_ID"
                  style={{ width: '100%', height: '100%' }}
                  defaultCenter={mapCenter}
                  defaultZoom={7}
                  gestureHandling={'greedy'}
                  disableDefaultUI={false}
                >
                  {/* Traced Route Polyline & Live Directions Service */}
                  <GoogleMapRouteDirector
                    origin={originWaypoint}
                    destination={destWaypoint}
                    waypoints={relabeledIntermediateStops}
                    defaultPolyline={calculatedRoute.polyline}
                  />

                  {/* Origin Marker */}
                  <AdvancedMarker
                    position={{ lat: originWaypoint.lat, lng: originWaypoint.lng }}
                    title={`Origem: ${originWaypoint.name}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-600 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                      A
                    </div>
                  </AdvancedMarker>

                  {/* Intermediate Stops Markers */}
                  {relabeledIntermediateStops.map(stop => (
                    <AdvancedMarker
                      key={stop.id}
                      position={{ lat: stop.lat, lng: stop.lng }}
                      title={`Parada: ${stop.name}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                        {stop.label}
                      </div>
                    </AdvancedMarker>
                  ))}

                  {/* Destination Marker */}
                  <AdvancedMarker
                    position={{ lat: destWaypoint.lat, lng: destWaypoint.lng }}
                    title={`Destino: ${destWaypoint.name}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shadow-lg border-2 border-white">
                      {destinationLabel}
                    </div>
                  </AdvancedMarker>

                  {/* Toll Plazas Markers with Price Badges */}
                  {showTollsLayer && calculatedRoute.tollPlazas.map(p => (
                    <AdvancedMarker
                      key={p.id}
                      position={{ lat: p.lat, lng: p.lng }}
                      title={`${p.name} - R$ ${p.rates.car.toFixed(2)}`}
                      onClick={() => {
                        setSelectedPrfForDetail(null);
                        setSelectedPlazaForDetail(p);
                      }}
                    >
                      <div className="flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform">
                        <div className="bg-orange-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg border border-white flex items-center gap-1">
                          <span>$</span>
                          <span>R$ {p.rates.car.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div className="w-2 h-2 bg-orange-600 rotate-45 -mt-1 shadow-xs" />
                      </div>
                    </AdvancedMarker>
                  ))}

                  {/* PRF Police Station Markers */}
                  {showPrfLayer && calculatedRoute.prfStations.map(prf => (
                    <AdvancedMarker
                      key={prf.id}
                      position={{ lat: prf.lat, lng: prf.lng }}
                      title={`${prf.name} - PRF 191`}
                      onClick={() => {
                        setSelectedPlazaForDetail(null);
                        setSelectedPrfForDetail(prf);
                      }}
                    >
                      <div className="flex flex-col items-center cursor-pointer group hover:scale-110 transition-transform">
                        <div className="bg-blue-800 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg border-2 border-amber-400 flex items-center gap-1">
                          <Shield className="w-3 h-3 text-amber-300 fill-amber-300" />
                          <span>PRF</span>
                        </div>
                        <div className="w-2 h-2 bg-blue-800 rotate-45 -mt-1 shadow-xs" />
                      </div>
                    </AdvancedMarker>
                  ))}
                </Map>
            ) : (
              /* High-fidelity Vector Map Canvas */
              <div 
                className="w-full h-full relative select-none cursor-grab active:cursor-grabbing flex items-center justify-center p-4"
                style={{ transform: `scale(${mapZoom})`, transition: 'transform 0.15s ease-out' }}
              >
                <svg
                  viewBox="0 0 800 600"
                  className="w-full h-full max-h-[750px] filter drop-shadow-2xl"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0284c7" />
                      <stop offset="50%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0ea5e9" />
                    </linearGradient>
                    <radialGradient id="oceanGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#0f172a" />
                      <stop offset="100%" stopColor="#020617" />
                    </radialGradient>
                  </defs>

                  {/* Brazilian Geographical Highway Canvas Background */}
                  <rect width="800" height="600" fill="url(#oceanGlow)" rx="16" />
                  
                  {/* Highway corridor glow */}
                  <polyline
                    points={svgPolylinePoints}
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="14"
                    strokeOpacity="0.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Main Highway Route Line */}
                  <polyline
                    points={svgPolylinePoints}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Waypoint A (Origin) */}
                  {(() => {
                    const pt = projectToSvg(originWaypoint.lat, originWaypoint.lng);
                    return (
                      <g transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer">
                        <circle r="14" fill="#0284c7" stroke="#ffffff" strokeWidth="3" />
                        <text y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">A</text>
                        <rect x="-60" y="-35" width="120" height="20" rx="6" fill="#0f172a" fillOpacity="0.9" />
                        <text y="-21" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          {originWaypoint.name.split(',')[0]}
                        </text>
                      </g>
                    );
                  })()}

                  {/* Intermediate Stops (B, C, D...) */}
                  {relabeledIntermediateStops.map(stop => {
                    const pt = projectToSvg(stop.lat, stop.lng);
                    return (
                      <g key={stop.id} transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer">
                        <circle r="12" fill="#f59e0b" stroke="#ffffff" strokeWidth="2.5" />
                        <text y="4" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">{stop.label}</text>
                      </g>
                    );
                  })}

                  {/* Waypoint Dest (Finish) */}
                  {(() => {
                    const pt = projectToSvg(destWaypoint.lat, destWaypoint.lng);
                    return (
                      <g transform={`translate(${pt.x}, ${pt.y})`} className="cursor-pointer">
                        <circle r="14" fill="#10b981" stroke="#ffffff" strokeWidth="3" />
                        <text y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                          {destinationLabel}
                        </text>
                        <rect x="-60" y="-35" width="120" height="20" rx="6" fill="#0f172a" fillOpacity="0.9" />
                        <text y="-21" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">
                          {destWaypoint.name.split(',')[0]}
                        </text>
                      </g>
                    );
                  })()}

                  {/* Toll Plaza Pins (Pedágios com Valor R$) */}
                  {showTollsLayer && calculatedRoute.tollPlazas.map((p) => {
                    const pt = projectToSvg(p.lat, p.lng);
                    return (
                      <g 
                        key={p.id} 
                        transform={`translate(${pt.x}, ${pt.y})`} 
                        className="cursor-pointer transition-transform hover:scale-125"
                        onClick={() => {
                          setSelectedPrfForDetail(null);
                          setSelectedPlazaForDetail(p);
                        }}
                      >
                        <circle r="11" fill="#ea580c" stroke="#ffffff" strokeWidth="2" />
                        <text y="3.5" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">$</text>
                        <rect x="-35" y="14" width="70" height="18" rx="5" fill="#1e293b" fillOpacity="0.95" stroke="#f97316" strokeWidth="1" />
                        <text y="26" textAnchor="middle" fill="#f97316" fontSize="9" fontWeight="bold">
                          R$ {p.rates.car.toFixed(2).replace('.', ',')}
                        </text>
                      </g>
                    );
                  })}

                  {/* PRF Station Pins */}
                  {showPrfLayer && calculatedRoute.prfStations.map(prf => {
                    const pt = projectToSvg(prf.lat, prf.lng);
                    return (
                      <g 
                        key={prf.id} 
                        transform={`translate(${pt.x}, ${pt.y})`} 
                        className="cursor-pointer transition-transform hover:scale-125"
                        onClick={() => {
                          setSelectedPlazaForDetail(null);
                          setSelectedPrfForDetail(prf);
                        }}
                      >
                        <circle r="11" fill="#1e3a8a" stroke="#fbbf24" strokeWidth="2" />
                        <text y="3.5" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">PRF</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            )}

            {/* Floating Bottom Card: Toll Plaza Inspector Modal */}
            {selectedPlazaForDetail && (
              <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-30 bg-white rounded-2xl p-4 shadow-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <span className="text-[10px] uppercase font-extrabold text-orange-600 tracking-wider">
                      Praça de Pedágio
                    </span>
                    <h4 className="text-sm font-extrabold text-slate-900">{selectedPlazaForDetail.name}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedPlazaForDetail.highway} · km {selectedPlazaForDetail.km} · {selectedPlazaForDetail.concessionaire}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPlazaForDetail(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Carro de Passeio</span>
                    <strong className="text-sm font-black text-slate-900">
                      R$ {selectedPlazaForDetail.rates.car.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Moto (1 eixo)</span>
                    <strong className="text-sm font-black text-slate-900">
                      R$ {selectedPlazaForDetail.rates.motorcycle.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Caminhão 3 Eixos</span>
                    <strong className="text-sm font-black text-slate-900">
                      R$ {selectedPlazaForDetail.rates.truck_3axles.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[10px] text-slate-500 block">Carreta 6 Eixos</span>
                    <strong className="text-sm font-black text-slate-900">
                      R$ {selectedPlazaForDetail.rates.truck_6axles.toFixed(2).replace('.', ',')}
                    </strong>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Tags: {selectedPlazaForDetail.paymentMethods.slice(0, 3).map(m => m.replace('_', ' ')).join(', ')}</span>
                  <span className="text-emerald-600 font-bold">Cobrança Ativa</span>
                </div>
              </div>
            )}

            {/* Floating Bottom Card: PRF Station Inspector Modal */}
            {selectedPrfForDetail && (
              <div className="absolute bottom-6 left-6 right-6 sm:left-auto sm:right-6 sm:w-96 z-30 bg-white rounded-2xl p-4 shadow-2xl border-2 border-blue-500 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-start justify-between pb-2 border-b border-slate-100">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-blue-700 font-extrabold text-[10px] uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5 fill-blue-700" />
                      <span>Polícia Rodoviária Federal</span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-900">{selectedPrfForDetail.name}</h4>
                    <p className="text-xs text-slate-500">
                      {selectedPrfForDetail.highway} · km {selectedPrfForDetail.km} · {selectedPrfForDetail.city} ({selectedPrfForDetail.state})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedPrfForDetail(null)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100">
                    <span className="text-[11px] font-bold text-blue-900 block mb-1">Serviços e Apoio:</span>
                    <ul className="list-disc list-inside text-[11px] text-blue-800 space-y-0.5">
                      {selectedPrfForDetail.services.map((svc, i) => (
                        <li key={i}>{svc}</li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href="tel:191"
                    className="w-full py-2.5 px-3 bg-blue-700 hover:bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Ligar Emergência PRF 191</span>
                  </a>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Driver Share Modal */}
      <ShareDriverModal
        route={calculatedRoute}
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* GPS Navigation Export Modal */}
      <GpsExportModal
        route={calculatedRoute}
        isOpen={isGpsModalOpen}
        onClose={() => setIsGpsModalOpen(false)}
      />

      {/* Export / Print Report Modal */}
      <ExportReportModal
        route={calculatedRoute}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      {/* Floating Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-800 flex items-center gap-2 text-xs font-bold animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );

  if (googleMapsApiKey) {
    return (
      <APIProvider apiKey={googleMapsApiKey} language="pt-BR" region="BR">
        {plannerContent}
      </APIProvider>
    );
  }

  return plannerContent;
}
