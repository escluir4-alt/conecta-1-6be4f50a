import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it('opens an individual revenue contract',()=>{const router=createRouter({routeTree,context:{queryClient:new QueryClient()}});expect(router.matchRoutes('/contratos-receitas/123').at(-1)?.routeId).toBe('/contratos-receitas/$contractId');});
  it.each(["/receitas", "/contas-a-receber", "/crediario", "/historico-receitas"])("matches revenue destination %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    expect(router.matchRoutes(path).at(-1)?.routeId).toBe(path);
  });
  it.each(["/despesas/anuais", "/despesas/parceladas"])("matches the expense child page for %s", (path) => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
    const matches = router.matchRoutes(path);
    expect(matches.at(-1)?.routeId).toBe(path);
    expect(matches.at(-2)?.routeId).toBe("/despesas");
  });

  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});
