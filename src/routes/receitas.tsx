import { createFileRoute } from "@tanstack/react-router";
import { RevenueWorkspace } from "@/components/finance/RevenueWorkspace";

export const Route = createFileRoute("/receitas")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Receitas — Casa Clara" },
      { name: "description", content: "Cadastro e acompanhamento das suas receitas." },
      { property: "og:title", content: "Receitas — Casa Clara" },
      { property: "og:description", content: "Cadastro e acompanhamento das suas receitas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RevenueWorkspace,
});

