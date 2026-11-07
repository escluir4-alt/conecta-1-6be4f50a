import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const point = z.object({ lat: z.number().finite().min(-90).max(90), lon: z.number().finite().min(-180).max(180) });
let lastRequest = 0;

export const axionTripRoutes = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ origin: point, destination: point }).refine(v => v.origin.lat !== v.destination.lat || v.origin.lon !== v.destination.lon, "Origem e destino devem ser diferentes."))
  .handler(async ({ context, data }) => {
    const access = await (context.supabase as unknown as SupabaseClient).rpc("axion_is_owner");
    if (access.error || access.data !== true) throw new Error("Pesquisa de rotas disponível ao titular da Axion.");
    if (Date.now() - lastRequest < 1100) throw new Error("Aguarde antes de pesquisar outra rota.");
    lastRequest = Date.now();
    const { origin, destination } = data;
    const coords = [origin, destination].map(p => `${p.lon.toFixed(5)},${p.lat.toFixed(5)}`).join(";");
    try {
      const r = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coords}?alternatives=true&overview=false&steps=true&generate_hints=false`, {
        headers: { "User-Agent": "Conecta-Axion/1.0 (comparador pessoal de viagens)", Accept: "application/json" },
        signal: AbortSignal.timeout(12000), redirect: "error",
      });
      if (!r.ok) throw new Error();
      const result = z.object({ code: z.literal("Ok"), routes: z.array(z.object({
        distance: z.number().finite().positive(), duration: z.number().finite().positive(),
        legs: z.array(z.object({ summary: z.string().optional() })).optional(),
      })).min(1) }).parse(await r.json());
      return result.routes.slice(0, 3).map((x, i) => ({ name: `Rota ${i+1}`, km: x.distance / 1000, minutes: x.duration / 60, via: (x.legs ?? []).map(leg => leg.summary).filter(Boolean).join(" · ").slice(0, 160) }));
    } catch { throw new Error("O serviço gratuito de rotas não respondeu ou não encontrou trajeto. Use a comparação manual."); }
  });
