import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { brasilQuerySchema, checkBrasilQuota, lookupBrasil } from "./client";

/** Somente leitura; exige sessão autenticada e não altera cadastros. */
export const consultarBrasil=createServerFn({method:"POST"})
  .middleware([requireSupabaseAuth])
  .inputValidator(brasilQuerySchema)
  .handler(async({context,data})=>{
    checkBrasilQuota(context.userId);
    return lookupBrasil(data);
  });
