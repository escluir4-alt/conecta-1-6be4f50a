import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brl } from "@/lib/axion/free-mode";
import { cheapestTrip, decimalInput, TRIP_CITIES, tripCost } from "@/lib/axion/domains";
import { axionTripRoutes } from "@/lib/axion/trips.functions";

type RouteInput = { name: string; km: string; minutes: string; via: string; toll: string; source: "manual" | "OSRM" };
const blank = (n: number): RouteInput => ({ name: `Rota ${n}`, km: "", minutes: "", via: "", toll: "", source: "manual" });
const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const point = (id: string, custom: string) => {
  if (id !== "custom") return TRIP_CITIES[Number(id)];
  if (!/^\s*-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?\s*$/.test(custom)) return undefined;
  const [lat, lon] = custom.split(",").map(Number);
  if (lat === undefined || lon === undefined || Math.abs(lat) > 90 || Math.abs(lon) > 180) return undefined;
  return { lat, lon };
};

export function AxionTripCompare() {
  const fetchRoutes = useServerFn(axionTripRoutes);
  const [origin, setOrigin] = useState("0"), [destination, setDestination] = useState("1");
  const [originCoords, setOriginCoords] = useState(""), [destinationCoords, setDestinationCoords] = useState("");
  const [kmpl, setKmpl] = useState(""), [price, setPrice] = useState("");
  const [roundTrip, setRoundTrip] = useState(false);
  const [rows, setRows] = useState([blank(1), blank(2)]);
  const [busy, setBusy] = useState(false), [note, setNote] = useState("");
  const consumption = decimalInput(kmpl), fuelPrice = decimalInput(price);
  const results = rows.map(r => {
    const km = decimalInput(r.km), min = decimalInput(r.minutes), toll = decimalInput(r.toll);
    const totalKm = km === null ? null : km * (roundTrip ? 2 : 1);
    const totalMin = min === null ? null : min * (roundTrip ? 2 : 1);
    const cost = totalKm !== null && consumption !== null && fuelPrice !== null
      ? tripCost(totalKm, consumption, fuelPrice, toll === null ? null : Math.round(toll * 100)) : null;
    return { totalKm, totalMin, cost, toll };
  });
  const winner = cheapestTrip(results.map(r => ({ totalCents: r.cost?.totalCents ?? null })));
  function edit(i: number, patch: Partial<RouteInput>) {
    setRows(old => old.map((r, n) => n === i ? { ...r, ...patch } : r));
  }
  async function lookup() {
    if (busy) return;
    const a = point(origin, originCoords), b = point(destination, destinationCoords);
    if (!a || !b || (a.lat === b.lat && a.lon === b.lon)) { setNote("Informe origem e destino diferentes e coordenadas válidas."); return; }
    if (!window.confirm("Pesquisar substitui as alternativas preenchidas e envia as coordenadas ao serviço público de rotas. Continuar?")) return;
    setBusy(true); setNote("");
    try {
      const routes = await fetchRoutes({ data: { origin: { lat: a.lat, lon: a.lon }, destination: { lat: b.lat, lon: b.lon } } });
      setRows(routes.map(r => ({ name: r.name, km: r.km.toFixed(3), minutes: r.minutes.toFixed(1), via: r.via, toll: "", source: "OSRM" })));
      setNote(routes.length === 1 ? "A fonte retornou uma rota. Adicione outra manualmente se quiser comparar." : "Alternativas carregadas. Informe os pedágios verificados para comparar o custo total.");
    } catch (e) { setNote(e instanceof Error ? e.message : "Pesquisa indisponível. Preencha as alternativas manualmente."); }
    finally { setBusy(false); }
  }
  return <section id="comparar-viagens" aria-label="Comparar viagens" className="mt-8 space-y-4 rounded-2xl border bg-card p-5 scroll-mt-4">
    <h2 className="text-xl font-semibold">Comparar viagens</h2>
    <p className="text-sm text-muted-foreground">Busque alternativas de carro ou informe distância e tempo manualmente. Não usa Gemini nem OpenAI.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      {([{ label: "Origem", value: origin, set: setOrigin, coords: originCoords, setCoords: setOriginCoords }, { label: "Destino", value: destination, set: setDestination, coords: destinationCoords, setCoords: setDestinationCoords }]).map(f =>
        <div className="space-y-2" key={f.label}>
          <label className="block text-sm">{f.label}<select disabled={busy} value={f.value} onChange={e => f.set(e.target.value)} className="mt-1 w-full rounded border bg-background p-2">
            {TRIP_CITIES.map((city, i) => <option key={city.name} value={i}>{city.name}</option>)}
            <option value="custom">Coordenadas</option>
          </select></label>
          {f.value === "custom" && <Input disabled={busy} value={f.coords} onChange={e => f.setCoords(e.target.value)} aria-label={`Coordenadas de ${f.label.toLowerCase()}`} placeholder="Latitude, longitude (ex.: -15.79, -47.88)" />}
        </div>)}
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" disabled={busy} onClick={() => void lookup()}>{busy ? "Buscando…" : "Buscar rotas gratuitas"}</Button>
      <a href="https://routing.openstreetmap.de/about.html" target="_blank" rel="noreferrer" className="text-xs underline">Roteamento FOSSGIS / OSRM</a>
      <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="text-xs underline">© colaboradores do OpenStreetMap</a>
      <a href="https://www.openstreetmap.org/fixthemap" target="_blank" rel="noreferrer" className="text-xs underline">Corrigir o mapa</a>
    </div>
    <p className="text-xs text-muted-foreground">Pontos de referência nas cidades; tempos estimados, sem informação de trânsito em tempo real.</p>
    {note && <p role="status" className="text-sm">{note}</p>}
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Consumo (km/l)<Input inputMode="decimal" value={kmpl} onChange={e => setKmpl(e.target.value)} placeholder="Ex.: 12" /></label>
      <label className="text-sm">Combustível (R$/l)<Input inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} placeholder="Ex.: 6,20" /></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={roundTrip} onChange={e => { setRoundTrip(e.target.checked); setRows(old => old.map(row => ({ ...row, toll: "" }))); }} /> Estimar ida e volta pelo mesmo trajeto</label>
    <p className="text-sm text-muted-foreground">Informe o total verificado de pedágios e Free Flow do percurso selecionado ({roundTrip ? "ida e volta" : "só ida"}). Em branco significa desconhecido; use zero somente se confirmou que não há cobrança. <a className="underline" href="https://dados.antt.gov.br/dataset/praca-de-pedagio" target="_blank" rel="noreferrer">Praças da ANTT</a> · <a className="underline" href="https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos/levantamento-de-precos-de-combustiveis-ultimas-semanas-pesquisadas" target="_blank" rel="noreferrer">Preços pesquisados pela ANP</a>.</p>
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map((r, i) => {
        const result = results[i]!;
        const cost = result.cost;
        return <fieldset key={i} className="space-y-2 rounded-xl border p-3">
          <legend className="px-1 text-sm font-semibold">{`Alternativa ${i+1}`}</legend>
          <label className="block text-sm">Nome<Input value={r.name} maxLength={60} disabled={busy} onChange={e => edit(i,{ name: e.target.value })} /></label>
          <label className="block text-sm">Distância de ida (km)<Input inputMode="decimal" value={r.km} disabled={busy} onChange={e => edit(i,{ km: e.target.value, source: "manual", via: "" })} /></label>
          <label className="block text-sm">Tempo de ida (min)<Input inputMode="decimal" value={r.minutes} disabled={busy} onChange={e => edit(i,{ minutes: e.target.value, source: "manual", via: "" })} /></label>
          <label className="block text-sm">Pedágios do percurso (R$)<Input inputMode="decimal" value={r.toll} disabled={busy} onChange={e => edit(i,{ toll: e.target.value })} placeholder="Desconhecido" /></label>
          <p className="text-xs text-muted-foreground">Trajeto: {r.source === "OSRM" ? "OSRM / OpenStreetMap" : "informado manualmente"}.</p>
          {r.via && <p className="text-xs">Via: {r.via}</p>}
          {result.totalKm !== null && <p className="text-sm">{fmt.format(result.totalKm)} km{result.totalMin !== null ? ` · ${fmt.format(result.totalMin)} min estimados` : ""}</p>}
          {cost && <p className="text-sm">Combustível: {fmt.format(cost.liters)} l · {brl(cost.fuelCents)}. Pedágio: {result.toll === null ? "desconhecido" : brl(Math.round(result.toll * 100))}.</p>}
          {cost && <p className="font-medium">{cost.totalCents === null ? `Parcial: ${brl(cost.fuelCents)}, sem pedágio` : `Total estimado: ${brl(cost.totalCents)}`}{winner === i ? " — menor custo estimado" : ""}</p>}
          {rows.length > 1 && <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setRows(old => old.filter((_, n) => i !== n))}>Remover alternativa</Button>}
        </fieldset>;
      })}
    </div>
    {rows.length < 3 && <Button type="button" variant="outline" disabled={busy} onClick={() => setRows(old => [...old, blank(old.length + 1)])}>Adicionar alternativa manual</Button>}
    {rows.length > 1 && winner === null && <p className="text-xs text-muted-foreground">O menor custo só é indicado quando todas as alternativas têm total estimado e não há empate.</p>}
  </section>;
}
