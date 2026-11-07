import { createFileRoute } from "@tanstack/react-router";
import { FiscalWorkspace } from "@/components/finance/FiscalWorkspace";
export const Route=createFileRoute("/notas-fiscais")({ssr:false,head:()=>({meta:[{title:"Notas Fiscais — Axion"}]}),component:()=> <FiscalWorkspace view="notas"/>});
