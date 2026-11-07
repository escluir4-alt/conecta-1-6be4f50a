import { createFileRoute } from "@tanstack/react-router";
import { FiscalWorkspace } from "@/components/finance/FiscalWorkspace";
export const Route=createFileRoute("/mercado-fiscal")({ssr:false,head:()=>({meta:[{title:"Notas de Mercado — Axion"}]}),component:()=> <FiscalWorkspace view="mercado"/>});
