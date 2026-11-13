import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown, ArrowLeftRight, ArrowUp, CarFront, Fuel, LocateFixed,
  MapPin, Navigation, Plus, Save, Trash2, Wallet, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type GeoPoint = { lat: number; lon: number };
type RoadResult = { distanceKm: number; durationMin: number; coordinates: number[][] };
type TripData = {
  id: string; origin: string; destination: string; stops: string[];
  roundTrip: boolean; kmPerLiter: string; pricePerLiter: string; tollPerLeg: string;
  distanceKm: number; durationMin: number; createdAt: string;
};

const brl = (n: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
const num = (n: number) => new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n);
const numberFrom = (v: string) => Number(v.trim().replace(",", "."));
const isTrip = (v: unknown): v is TripData =>
  !!v && typeof v === "object" && typeof (v as TripData).id === "string" &&
  typeof (v as TripData).origin === "string" && Array.isArray((v as TripData).stops) &&
  typeof (v as TripData).distanceKm === "number";

const knownPoints = new Map<string, GeoPoint>();
const exampleTrips = [
  { label: "Brasília → Goiânia", origin: "Brasília, DF, Brasil", destination: "Goiânia, GO, Brasil" },
  { label: "São Paulo → Rio de Janeiro", origin: "São Paulo, SP, Brasil", destination: "Rio de Janeiro, RJ, Brasil" },
] as const;

async function geocode(value: string, signal: AbortSignal): Promise<GeoPoint> {
  const query = value.trim();
  const coords = query.match(/^(-?\d+(?:\.\d+)?)\s*[,;]\s*(-?\d+(?:\.\d+)?)$/);
  if (coords) {
    const lat = Number(coords[1]), lon = Number(coords[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
    throw new Error("Coordenadas inválidas.");
  }
  const key = query.toLocaleLowerCase("pt-BR");
  const saved = knownPoints.get(key);
  if (saved) return saved;
  const url = "https://nominatim.openstreetmap.org/search?" +
    new URLSearchParams({ q: query, format: "jsonv2", limit: "1", countrycodes: "br" });
  const res = await fetch(url, { signal, headers: { "Accept-Language": "pt-BR" } });
  if (!res.ok) throw new Error("O serviço de endereços está indisponível.");
  const list = await res.json() as Array<{ lat?: string; lon?: string }>;
  if (!list[0]?.lat || !list[0]?.lon) throw new Error("Local não encontrado: " + query);
  const point = { lat: Number(list[0].lat), lon: Number(list[0].lon) };
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lon)) throw new Error("Local inválido: " + query);
  knownPoints.set(key, point);
  return point;
}

async function calculateDrivingRoute(points: string[], signal: AbortSignal): Promise<RoadResult> {
  const coords: GeoPoint[] = [];
  for (const point of points) {
    if (signal.aborted) throw new Error("Consulta cancelada.");
    // Nominatim exige que as chamadas não sejam feitas em rajadas.
    if (coords.length) await new Promise<void>(resolve => setTimeout(resolve, 1150));
    coords.push(await geocode(point, signal));
  }
  if (signal.aborted) throw new Error("Consulta cancelada.");
  const pairs = coords.map(p => p.lon + "," + p.lat).join(";");
  const response = await fetch(
    "https://router.project-osrm.org/route/v1/driving/" + pairs +
    "?overview=full&geometries=geojson&steps=false",
    { signal },
  );
  if (!response.ok) throw new Error("Não foi possível consultar o serviço público de rotas.");
  const data = await response.json() as {
    code?: string;
    routes?: Array<{ distance: number; duration: number; geometry?: { coordinates: number[][] } }>;
  };
  const route = data.routes?.[0];
  if (data.code !== "Ok" || !route || route.distance <= 0)
    throw new Error("Nenhuma rota rodoviária disponível entre os locais informados.");
  return {
    distanceKm: route.distance / 1000,
    durationMin: route.duration / 60,
    coordinates: route.geometry?.coordinates ?? [],
  };
}

function mapsUrl(points: string[]) {
  const params = new URLSearchParams({
    api: "1",
    origin: points[0] ?? "",
    destination: points[points.length - 1] ?? "",
    travelmode: "driving",
  });
  if (points.length > 2) params.set("waypoints", points.slice(1, -1).join("|"));
  return "https://www.google.com/maps/dir/?" + params.toString();
}
function wazeUrl(destination: string) {
  return "https://www.waze.com/ul?" + new URLSearchParams({ q: destination, navigate: "yes" });
}

function RouteSketch({ coordinates }: { coordinates: number[][] }) {
  if (!coordinates.length) return null;
  const lons = coordinates.map(p => p[0] ?? 0);
  const lats = coordinates.map(p => p[1] ?? 0);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const xSpan = Math.max(maxLon - minLon, .001), ySpan = Math.max(maxLat - minLat, .001);
  const scale = Math.min(760 / xSpan, 280 / ySpan);
  const width = xSpan * scale, height = ySpan * scale;
  const x0 = (800 - width) / 2, y0 = (320 - height) / 2;
  const sampled = coordinates.filter((_,i) => i === 0 || i === coordinates.length - 1 || i % Math.max(1,Math.floor(coordinates.length / 300)) === 0);
  const points = sampled.map(p => [
    (x0 + ((p[0] ?? 0) - minLon) * scale).toFixed(1),
    (y0 + (maxLat - (p[1] ?? 0)) * scale).toFixed(1)
  ].join(",")).join(" ");
  return (
    <div className="relative overflow-hidden rounded-xl border bg-slate-950 p-4">
      <svg viewBox="0 0 800 320" className="w-full" role="img" aria-label="Esquema do trajeto calculado, sem mapa cartográfico">
        <defs><pattern id="road-grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#334155" strokeWidth=".6"/></pattern></defs>
        <rect width="800" height="320" fill="url(#road-grid)"/>
        <polyline points={points} fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={x0} cy={y0+height} r="10" fill="#16a34a" stroke="white" strokeWidth="3"/>
        <circle cx={x0+width} cy={y0} r="10" fill="#ea580c" stroke="white" strokeWidth="3"/>
      </svg>
      <p className="mt-2 text-center text-xs text-slate-300">Esquema do percurso (não é um mapa geográfico). Consulte a navegação para conferir o trajeto.</p>
    </div>
  );
}

export function CarRoadTripPlanner({ userEmail }: { userEmail?: string | undefined }) {
  const [origin,setOrigin] = useState("");
  const [destination,setDestination] = useState("");
  const [stops,setStops] = useState<string[]>([]);
  const [roundTrip,setRoundTrip] = useState(false);
  const [fuelType,setFuelType] = useState("gasolina");
  const [vehicle,setVehicle] = useState("carro");
  const [kmPerLiter,setKmPerLiter] = useState("12");
  const [pricePerLiter,setPricePerLiter] = useState("6,00");
  const [tollPerLeg,setTollPerLeg] = useState("0");
  const [route,setRoute] = useState<RoadResult | null>(null);
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState("");
  const [saved,setSaved] = useState<TripData[]>([]);
  const request = useRef<AbortController | null>(null);
  const key = userEmail ? "axion:viagens:carro:" + userEmail : null;
  const names = [origin, ...stops, destination].map(s => s.trim());
  const price = numberFrom(pricePerLiter);
  const efficiency = numberFrom(kmPerLiter);
  const toll = numberFrom(tollPerLeg);
  const validCost = price >= 0 && Number.isFinite(price) && efficiency > 0 && Number.isFinite(efficiency) && toll >= 0 && Number.isFinite(toll);
  const legs = roundTrip ? 2 : 1;
  const km = (route?.distanceKm ?? 0) * legs;
  const liters = validCost ? km / efficiency : 0;
  const fuelCost = liters * price;
  const tollCost = toll * legs;
  const totalCost = fuelCost + tollCost;

  useEffect(() => {
    if (!key) return;
    try {
      const stored: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
      setSaved(Array.isArray(stored) ? stored.filter(isTrip) : []);
    } catch { setSaved([]); }
  }, [key]);
  useEffect(() => () => request.current?.abort(), []);

  function invalidate() {
    request.current?.abort();
    setRoute(null);
    setLoading(false);
    setError("");
  }
  function persist(items: TripData[]) {
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(items));
    setSaved(items);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (names.some(n=>!n)) { setError("Informe a origem, o destino e todas as paradas."); return; }
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError("");
    setLoading(true);
    setRoute(null);
    try {
      setRoute(await calculateDrivingRoute(names, controller.signal));
    } catch (caught) {
      if (!controller.signal.aborted)
        setError(caught instanceof Error ? caught.message : "Falha na consulta de rota.");
    } finally {
      if (request.current === controller) { setLoading(false); request.current = null; }
    }
  }
  function reorder(i: number, d: number) {
    const copy = [...stops];
    const next = i + d;
    if (next < 0 || next >= copy.length) return;
    const first = copy[i], second = copy[next];
    if (first === undefined || second === undefined) return;
    copy[i] = second; copy[next] = first;
    setStops(copy); invalidate();
  }
  function locateMe() {
    if (!navigator.geolocation) { setError("Geolocalização não disponível."); return; }
    navigator.geolocation.getCurrentPosition(
      ({coords}) => { setOrigin(coords.latitude.toFixed(6) + ", " + coords.longitude.toFixed(6)); invalidate(); },
      () => setError("Não foi possível obter a localização. Confira a permissão do navegador."),
      { timeout: 12000 },
    );
  }
  function saveTrip() {
    if (!route || !validCost || !key) return;
    persist([{
      id: crypto.randomUUID(), createdAt: new Date().toISOString(),
      origin, destination, stops: [...stops], roundTrip, kmPerLiter, pricePerLiter,
      tollPerLeg, distanceKm: route.distanceKm, durationMin: route.durationMin,
    }, ...saved]);
  }
  function loadTrip(trip: TripData) {
    invalidate();
    setOrigin(trip.origin);setDestination(trip.destination);
    setStops([...trip.stops]);setRoundTrip(trip.roundTrip);
    setKmPerLiter(trip.kmPerLiter);setPricePerLiter(trip.pricePerLiter);setTollPerLeg(trip.tollPerLeg);
    setRoute({distanceKm:trip.distanceKm,durationMin:trip.durationMin,coordinates:[]});
  }
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-xl bg-primary/10 p-3 text-primary"><CarFront className="size-6"/></span>
          <div>
            <h2 className="text-xl font-bold">Planejamento rodoviário</h2>
            <p className="text-sm text-muted-foreground">Origem, destino, paradas e estimativa de combustível e pedágios.</p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {exampleTrips.map(trip => <Button key={trip.label} variant="outline" size="sm" type="button" onClick={() => {
            setOrigin(trip.origin);setDestination(trip.destination);setStops([]);invalidate();
          }}>{trip.label}</Button>)}
        </div>
      </div>
      <form onSubmit={submit} className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold">Itinerário</h3>
            <Button type="button" variant="outline" size="sm" onClick={()=>{
              setOrigin(destination);setDestination(origin);setStops([...stops].reverse());invalidate();
            }}><ArrowLeftRight className="mr-2 size-4"/> Inverter</Button>
          </div>
          <div className="space-y-2">
            <Label htmlFor="car-origin">Origem</Label>
            <div className="flex gap-2"><Input id="car-origin" value={origin} onChange={e=>{setOrigin(e.target.value);invalidate();}} required placeholder="Endereço ou cidade de origem" />
              <Button type="button" variant="outline" onClick={locateMe} aria-label="Usar minha localização" title="Usar minha localização"><LocateFixed className="size-4"/></Button></div>
          </div>
          {stops.map((stop,i)=> <div key={i} className="space-y-2">
            <Label htmlFor={"car-stop-"+i}>Parada {i+1}</Label>
            <div className="flex gap-1">
              <Input id={"car-stop-"+i} value={stop} required placeholder="Cidade ou endereço" onChange={e=>{setStops(stops.map((s,j)=>j===i?e.target.value:s));invalidate();}}/>
              <Button type="button" variant="outline" size="icon" disabled={i===0} onClick={()=>reorder(i,-1)} aria-label="Subir parada"><ArrowUp className="size-4"/></Button>
              <Button type="button" variant="outline" size="icon" disabled={i===stops.length-1} onClick={()=>reorder(i,1)} aria-label="Descer parada"><ArrowDown className="size-4"/></Button>
              <Button type="button" variant="ghost" size="icon" onClick={()=>{setStops(stops.filter((_,j)=>j!==i));invalidate();}} aria-label="Excluir parada"><Trash2 className="size-4"/></Button>
            </div>
          </div>)}
          <Button type="button" variant="outline" size="sm" onClick={()=>{setStops([...stops,""]);invalidate();}} disabled={stops.length>=8}>
            <Plus className="mr-2 size-4"/> Adicionar parada</Button>
          <div className="space-y-2"><Label htmlFor="car-destination">Destino</Label>
            <Input id="car-destination" value={destination} required onChange={e=>{setDestination(e.target.value);invalidate();}} placeholder="Endereço ou cidade de destino"/></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roundTrip} onChange={e=>setRoundTrip(e.target.checked)}/> Considerar ida e volta nos custos</label>
          <Button type="submit" disabled={loading || names.some(n=>!n)} className="w-full"><Navigation className="mr-2 size-4"/>{loading?"Consultando rota…":"Calcular rota rodoviária"}</Button>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        </section>
        <section className="space-y-4 rounded-2xl border bg-card p-5">
          <div className="flex items-center gap-2"><Fuel className="size-5 text-primary"/><h3 className="font-bold">Veículo e combustível</h3></div>
          <div className="space-y-2"><Label htmlFor="car-vehicle">Categoria</Label>
            <select id="car-vehicle" value={vehicle} onChange={e=>{setVehicle(e.target.value);setKmPerLiter(e.target.value==="moto"?"30":e.target.value==="utilitario"?"9":"12");}} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="carro">Carro de passeio</option><option value="moto">Motocicleta</option><option value="utilitario">Utilitário / caminhonete</option><option value="caminhao">Caminhão</option><option value="onibus">Ônibus</option>
            </select>
          </div>
          <div className="space-y-2"><Label htmlFor="car-fuel">Combustível</Label>
            <select id="car-fuel" value={fuelType} onChange={e=>setFuelType(e.target.value)} className="h-10 w-full rounded-md border bg-background px-3 text-sm">
              <option value="gasolina">Gasolina</option><option value="etanol">Etanol</option><option value="diesel">Diesel</option><option value="gnv">GNV</option>
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2"><Label htmlFor="car-price">Preço por {fuelType==="gnv"?"m³":"litro"} (R$)</Label>
              <Input id="car-price" inputMode="decimal" value={pricePerLiter} onChange={e=>setPricePerLiter(e.target.value)}/></div>
            <div className="space-y-2"><Label htmlFor="car-consumption">Rendimento ({fuelType==="gnv"?"km/m³":"km/L"})</Label>
              <Input id="car-consumption" inputMode="decimal" value={kmPerLiter} onChange={e=>setKmPerLiter(e.target.value)}/></div>
          </div>
          <div className="space-y-2"><Label htmlFor="car-tolls">Pedágios estimados por sentido (R$)</Label>
            <Input id="car-tolls" inputMode="decimal" value={tollPerLeg} onChange={e=>setTollPerLeg(e.target.value)}/></div>
          <p className="text-xs text-muted-foreground">Tarifas de pedágio não são obtidas automaticamente: informe o total de cada sentido para incluir no orçamento. Valores de combustível são preenchidos manualmente e não são cotações em tempo real.</p>
          {route ? <div className="space-y-3 rounded-xl bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2 font-semibold"><Wallet className="size-5"/> Resumo da viagem</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-slate-400">Distância {roundTrip?"total":"de ida"}</p><strong>{num(km)} km</strong></div>
              <div><p className="text-slate-400">Duração {roundTrip?"estimada total":"estimada"}</p><strong>{num(route.durationMin*legs/60)} h</strong></div>
              <div><p className="text-slate-400">Combustível</p><strong>{validCost?brl(fuelCost):"Verifique os campos"}</strong></div>
              <div><p className="text-slate-400">Pedágio informado</p><strong>{validCost?brl(tollCost):"Verifique os campos"}</strong></div>
            </div>
            <div className="flex justify-between border-t border-slate-600 pt-3"><strong>Total estimado</strong><strong className="text-emerald-400">{validCost?brl(totalCost):"Indisponível"}</strong></div>
            <div className="flex flex-wrap gap-2">
              <a className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900" target="_blank" rel="noopener noreferrer" href={mapsUrl(names)}><MapPin className="size-4"/> Google Maps <ExternalLink className="size-3"/></a>
              <a className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-900" target="_blank" rel="noopener noreferrer" href={wazeUrl(destination)}>Waze <ExternalLink className="size-3"/></a>
            </div>
            <Button type="button" variant="secondary" className="w-full" disabled={!validCost || !key} onClick={saveTrip}><Save className="mr-2 size-4"/> Salvar planejamento</Button>
          </div> : <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Calcule a rota para consultar distância e duração. Para conferir o trajeto no mapa, abra o Google Maps.</p>}
        </section>
      </form>
      {route && <RouteSketch coordinates={route.coordinates}/>}
      <section className="rounded-2xl border bg-card p-5">
        <h3 className="font-bold">Planejamentos salvos</h3>
        <p className="mt-1 text-xs text-muted-foreground">Salvos neste navegador, separados por conta. Não há sincronização com a nuvem.</p>
        <div className="mt-4 space-y-2">
          {saved.length===0 && <p className="text-sm text-muted-foreground">Nenhuma viagem de carro salva.</p>}
          {saved.map(trip=><div key={trip.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <div className="min-w-0 flex-1"><p className="font-semibold">{trip.origin} → {trip.destination}</p>
              <p className="text-xs text-muted-foreground">{num(trip.distanceKm)} km (ida) · {new Date(trip.createdAt).toLocaleDateString("pt-BR")}</p></div>
            <Button type="button" size="sm" variant="outline" onClick={()=>loadTrip(trip)}>Abrir</Button>
            <Button type="button" size="sm" variant="ghost" onClick={()=>{
              if (window.confirm("Excluir este planejamento de viagem?")) persist(saved.filter(t=>t.id!==trip.id));
            }} aria-label="Excluir viagem"><Trash2 className="size-4"/></Button>
          </div>)}
        </div>
      </section>
      <p className="text-xs text-muted-foreground">A consulta rodoviária usa serviços públicos de geocodificação e roteamento, sujeitos a limites e indisponibilidade. Rota e duração são estimativas e devem ser verificadas antes de viajar.</p>
    </div>
  );
}
