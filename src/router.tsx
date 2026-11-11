import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  // Uma nova tentativa rápida e depois erro visível: evita a usuária esperando
  // dezenas de segundos sem resposta quando a nuvem está fora do ar.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: 1, retryDelay: 800, staleTime: 30_000 },
      mutations: { retry: 0 },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
