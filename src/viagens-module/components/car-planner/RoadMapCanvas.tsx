import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import type { RouteWaypoint } from '../../services/tollEngine';
import type { TollPlaza } from '../../data/tollPlazasData';
import type { PrfStation } from '../../data/placesAndPoiData';

type Coordinate = [number, number]; // Latitude, longitude.
type View = { x: number; y: number; zoom: number };
type Pin = { id: string; lat: number; lng: number; title: string; kind: 'stop' | 'toll' | 'prf' | 'fuel'; label: string; onClick?: () => void };
interface Props {
  origin: RouteWaypoint;
  destination: RouteWaypoint;
  waypoints: RouteWaypoint[];
  approximatePolyline: Coordinate[];
  tollPlazas: TollPlaza[];
  prfStations: PrfStation[];
  gasStations: Array<{id: string; name: string; lat: number; lng: number}>;
  showTolls: boolean;
  showPrf: boolean;
  showGasStations: boolean;
  onSelectToll: (plaza: TollPlaza) => void;
  onSelectPrf: (station: PrfStation) => void;
}
const TILE = 256;
const MIN_ZOOM = 3, MAX_ZOOM = 17;
function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)); }
function mercator(lat: number, lon: number): {x: number; y: number} {
  const phi = clamp(lat, -85.05112878, 85.05112878) * Math.PI / 180;
  return { x: (lon + 180) / 360, y: (1 - Math.asinh(Math.tan(phi)) / Math.PI) / 2 };
}
function inverseMercator(x: number, y: number) {
  return { lng: x * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI };
}
function mapsDirectionsUrl(stops: RouteWaypoint[]) {
  const params = new URLSearchParams({
    api: '1',
    origin: stops[0]?.lat + ',' + stops[0]?.lng,
    destination: stops[stops.length - 1]?.lat + ',' + stops[stops.length - 1]?.lng,
    travelmode: 'driving',
  });
  if (stops.length > 2) params.set('waypoints', stops.slice(1, -1).map(s => s.lat + ',' + s.lng).join('|'));
  return 'https://www.google.com/maps/dir/?' + params.toString();
}
function streetViewUrl(lat: number, lng: number) {
  return 'https://www.google.com/maps/@?' + new URLSearchParams({
    api: '1', map_action: 'pano', viewpoint: lat.toFixed(6) + ',' + lng.toFixed(6)
  }).toString();
}
function satelliteUrl(lat: number, lng: number) {
  return 'https://www.google.com/maps/@?' + new URLSearchParams({
    api: '1', map_action: 'map', center: lat.toFixed(6) + ',' + lng.toFixed(6),
    zoom: '12', basemap: 'satellite'
  }).toString();
}
function fitViewport(points: Coordinate[], width: number, height: number): View {
  const projected = points.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])).map(p => mercator(p[0], p[1]));
  if (!projected.length) return { x: 0.38, y: 0.57, zoom: 5 };
  const xs = projected.map(p => p.x), ys = projected.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const dx = Math.max(maxX - minX, 0.00002), dy = Math.max(maxY - minY, 0.00002);
  const usableW = Math.max(160, width - 110), usableH = Math.max(160, height - 140);
  const candidate = Math.floor(Math.log2(Math.min(usableW / (TILE * dx), usableH / (TILE * dy))));
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: clamp(candidate, MIN_ZOOM, MAX_ZOOM) };
}

export function RoadMapCanvas({
  origin, destination, waypoints, approximatePolyline, tollPlazas, prfStations, gasStations,
  showTolls, showPrf, showGasStations, onSelectToll, onSelectPrf,
}: Props) {
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<{x: number; y: number} | null>(null);
  const [size, setSize] = useState({width: 820, height: 720});
  const [view, setView] = useState<View>({x: 0.38, y: 0.57, zoom: 6});
  const [liveRoute, setLiveRoute] = useState<Coordinate[] | null>(null);
  const [routeStatus, setRouteStatus] = useState<'checking' | 'online' | 'approximate'>('checking');
  const [tileFailed, setTileFailed] = useState(false);
  const stops = [origin, ...waypoints, destination];
  const stopKey = stops.map(p => p.lat.toFixed(6) + ',' + p.lng.toFixed(6)).join(';');

  useEffect(() => {
    if (!el.current) return;
    const obs = new ResizeObserver(entries => {
      const box = entries[0]?.contentRect;
      if (box && box.width > 0 && box.height > 0) {
        setSize({width: Math.round(box.width), height: Math.round(box.height)});
      }
    });
    obs.observe(el.current);
    return () => obs.disconnect();
  }, []);

  // Routing lookup only for visible itineraries. Public OSRM is best-effort,
  // never used to assert toll tariffs or authoritative trip costs.
  useEffect(() => {
    const coordinates = stopKey.split(';');
    if (coordinates.length < 2 || coordinates.length > 10) {
      setLiveRoute(null); setRouteStatus('approximate'); return;
    }
    const controller = new AbortController();
    setLiveRoute(null);
    setRouteStatus('checking');
    const routingCoordinates = coordinates.map(p => {
      const pair = p.split(',');
      return (pair[1] || '') + ',' + (pair[0] || '');
    }).join(';');
    const url = 'https://router.project-osrm.org/route/v1/driving/' + routingCoordinates
      + '?overview=full&geometries=geojson&steps=false';
    fetch(url, { signal: controller.signal })
      .then(response => {
        if (!response.ok) throw new Error('Serviço de rotas indisponível');
        return response.json() as Promise<{
          code?: string;
          routes?: Array<{geometry?: {coordinates?: number[][]}}>;
        }>;
      })
      .then(result => {
        if (controller.signal.aborted) return;
        const coords = result.routes?.[0]?.geometry?.coordinates;
        if (result.code !== 'Ok' || !coords || coords.length < 2) throw new Error('Rota não localizada');
        const path = coords
          .filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1]))
          .map(p => [p[1] as number, p[0] as number] as Coordinate);
        if (path.length < 2) throw new Error('Geometria inválida');
        setLiveRoute(path);
        setRouteStatus('online');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLiveRoute(null);
          setRouteStatus('approximate');
        }
      });
    return () => controller.abort();
  }, [stopKey]);

  const route = liveRoute ?? approximatePolyline;
  const pathKey = liveRoute ? 'online-' + stopKey : 'local-' + stopKey;
  const routeFit = useMemo(() => {
    const samples = route.filter((_, i) => i === 0 || i === route.length - 1 || i % Math.max(1, Math.ceil(route.length / 250)) === 0);
    return fitViewport([...samples, [origin.lat, origin.lng], [destination.lat, destination.lng]], size.width, size.height);
  }, [pathKey, liveRoute, approximatePolyline, origin.lat, origin.lng, destination.lat, destination.lng, size.width, size.height]);
  useEffect(() => { setView(routeFit); }, [routeFit]);

  const world = TILE * Math.pow(2, view.zoom);
  const px = (lat: number, lng: number) => {
    const p = mercator(lat, lng);
    return {left: size.width / 2 + (p.x - view.x) * world, top: size.height / 2 + (p.y - view.y) * world};
  };
  const tiles = useMemo(() => {
    const n = Math.pow(2, view.zoom);
    const leftWorld = view.x * world - size.width / 2, topWorld = view.y * world - size.height / 2;
    const xMin = Math.floor(leftWorld / TILE), xMax = Math.ceil((leftWorld + size.width) / TILE);
    const yMin = Math.max(0, Math.floor(topWorld / TILE)), yMax = Math.min(n - 1, Math.ceil((topWorld + size.height) / TILE));
    const visible: Array<{key: string;url: string;left: number;top: number}> = [];
    for (let y = yMin; y <= yMax; y++) for (let x = xMin; x <= xMax; x++) {
      const wrappedX = ((x % n) + n) % n;
      visible.push({
        key: view.zoom + '/' + wrappedX + '/' + y,
        url: 'https://tile.openstreetmap.org/' + view.zoom + '/' + wrappedX + '/' + y + '.png',
        left: x * TILE - leftWorld, top: y * TILE - topWorld
      });
    }
    return visible.slice(0, 64);
  }, [view, world, size]);
  const geometry = useMemo(() => {
    const every = Math.max(1, Math.floor(route.length / 2500));
    return route.filter((_, i) => i % every === 0 || i === route.length - 1)
      .map(([lat, lng]) => {
        const p = mercator(lat, lng);
        return (size.width / 2 + (p.x - view.x) * world).toFixed(1) + ','
          + (size.height / 2 + (p.y - view.y) * world).toFixed(1);
      }).join(' ');
  }, [route, view, world, size]);

  const pins: Pin[] = [
    {id:'origin',lat:origin.lat,lng:origin.lng,title:'Origem: '+origin.name,kind:'stop',label:'A'},
    ...waypoints.map(w => ({id:'stop-'+w.id,lat:w.lat,lng:w.lng,title:w.name,kind:'stop' as const,label:w.label})),
    {id:'dest',lat:destination.lat,lng:destination.lng,title:'Destino: '+destination.name,kind:'stop',label:destination.label || 'B'},
  ];
  if (showTolls) for(const p of tollPlazas) pins.push({
    id:'toll-'+p.id,lat:p.lat,lng:p.lng,kind:'toll',title:p.name,label:'R$ '+p.rates.car.toFixed(2).replace('.',','),
    onClick:()=>onSelectToll(p)
  });
  if (showPrf) for(const p of prfStations) pins.push({
    id:'prf-'+p.id,lat:p.lat,lng:p.lng,kind:'prf',title:p.name,label:'PRF',onClick:()=>onSelectPrf(p)
  });
  if (showGasStations) for(const p of gasStations) pins.push({
    id:'fuel-'+p.id,lat:p.lat,lng:p.lng,kind:'fuel',title:p.name,label:'⛽'
  });

  function handlePointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest('button, a')) return;
    drag.current = {x:e.clientX,y:e.clientY};
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    drag.current = {x:e.clientX,y:e.clientY};
    setView(p => ({...p,x:p.x-dx/(TILE*Math.pow(2,p.zoom)),y:clamp(p.y-dy/(TILE*Math.pow(2,p.zoom)),0,1)}));
  }
  function changeZoom(delta: number) {
    setView(p=>({...p,zoom:clamp(p.zoom+delta,MIN_ZOOM,MAX_ZOOM)}));
  }
  function wheel(e: WheelEvent<HTMLDivElement>) {
    e.preventDefault();
    changeZoom(e.deltaY < 0 ? 1 : -1);
  }
  const current = inverseMercator(view.x,view.y);
  const actualStops = [origin,...waypoints,destination];

  return <div
    ref={el}
    role="region"
    aria-label="Mapa geográfico da viagem, com pedágios, PRF e rota"
    className="relative h-full min-h-[500px] w-full overflow-hidden bg-slate-200 touch-none cursor-grab active:cursor-grabbing"
    onPointerDown={handlePointerDown}
    onPointerMove={handlePointerMove}
    onPointerUp={()=>{drag.current=null;}}
    onPointerCancel={()=>{drag.current=null;}}
    onWheel={wheel}
  >
    {tiles.map(t=><img
      key={t.key}
      alt=""
      src={t.url}
      width={256} height={256}
      draggable={false}
      loading="eager"
      referrerPolicy="strict-origin-when-cross-origin"
      onError={()=>setTileFailed(true)}
      className="pointer-events-none absolute max-w-none select-none"
      style={{left:t.left,top:t.top,width:TILE,height:TILE}}
    />)}
    <svg className="pointer-events-none absolute inset-0" width={size.width} height={size.height}
      viewBox={'0 0 '+size.width+' '+size.height} aria-hidden="true">
      <polyline points={geometry} fill="none" stroke="#153b76" strokeWidth="9" strokeLinejoin="round" strokeLinecap="round" opacity=".75" />
      <polyline points={geometry} fill="none" stroke={routeStatus==='online'?'#0284c7':'#f97316'} strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
    {pins.map(pin=>{
      const p=px(pin.lat,pin.lng);
      if(p.left < -80 || p.left > size.width+80 || p.top < -80 || p.top > size.height+80) return null;
      const className=pin.kind==='toll'
        ? 'bg-orange-600 text-white border-orange-100'
        :pin.kind==='prf' ? 'bg-blue-800 text-yellow-100 border-amber-300'
        :pin.kind==='fuel' ? 'bg-emerald-700 text-white border-white'
        :pin.id==='dest' ? 'bg-emerald-600 text-white border-white'
        :'bg-sky-700 text-white border-white';
      return <button key={pin.id} type="button" title={pin.title} aria-label={pin.title}
        onClick={pin.onClick} className={'absolute z-10 whitespace-nowrap border-2 shadow-lg rounded-full font-bold text-[11px] px-2 py-1 '+className}
        style={{left:p.left,top:p.top,transform:'translate(-50%, -50%)'}}>{pin.label}</button>;
    })}
    <div className="absolute left-3 bottom-8 z-20 max-w-[70%] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-800 shadow-lg">
      <span className="font-semibold">Mapa geográfico · OpenStreetMap</span>
      <span className="block text-[10px]">
        {routeStatus==='online'?'Traçado rodoviário consultado (OSRM, estimativo)':
          routeStatus==='checking'?'Consultando traçado rodoviário…':
            'Traçado local aproximado; confira no Google Maps'}
      </span>
      {tileFailed && <span className="block font-semibold text-red-700">Algumas imagens do mapa não carregaram. Verifique sua conexão.</span>}
    </div>
    <div className="absolute top-16 right-3 z-20 flex flex-col gap-2">
      <button type="button" onClick={()=>changeZoom(1)} aria-label="Aproximar mapa" className="rounded-lg bg-white p-2 font-bold text-slate-800 shadow">+</button>
      <button type="button" onClick={()=>changeZoom(-1)} aria-label="Afastar mapa" className="rounded-lg bg-white p-2 font-bold text-slate-800 shadow">−</button>
      <button type="button" onClick={()=>setView(routeFit)} title="Enquadrar a rota" className="rounded-lg bg-white p-2 text-xs font-semibold text-slate-800 shadow">Rota</button>
    </div>
    <div className="absolute top-3 right-3 left-3 z-20 flex flex-wrap gap-1.5">
      <a href={mapsDirectionsUrl(actualStops)} target="_blank" rel="noopener noreferrer"
        className="rounded-lg bg-white/95 px-2 py-1.5 text-[11px] font-bold text-sky-900 shadow">Google Maps ↗</a>
      <a href={streetViewUrl(current.lat,current.lng)} target="_blank" rel="noopener noreferrer"
        className="rounded-lg bg-white/95 px-2 py-1.5 text-[11px] font-bold text-sky-900 shadow" title="Street View próximo ao centro atual do mapa">Street View ↗</a>
      <a href={satelliteUrl(current.lat,current.lng)} target="_blank" rel="noopener noreferrer"
        className="rounded-lg bg-white/95 px-2 py-1.5 text-[11px] font-bold text-sky-900 shadow">Satélite ↗</a>
    </div>
    <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"
      className="absolute bottom-1 right-2 z-20 rounded bg-white/90 px-2 text-[10px] text-slate-800">© OpenStreetMap contributors</a>
  </div>;
}
