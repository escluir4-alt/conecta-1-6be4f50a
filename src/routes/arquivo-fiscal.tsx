import { createFileRoute } from "@tanstack/react-router";
import { FiscalWorkspace } from "@/components/finance/FiscalWorkspace";
export const Route=createFileRoute("/arquivo-fiscal")({ssr:false,head:()=>({meta:[{title:"Arquivo Fiscal — Axion"}]}),component:()=> <FiscalWorkspace view="arquivo"/>});
