import { QueryClient, type DefaultOptions, type QueryClientConfig } from "@tanstack/react-query";

const defaultOptions: DefaultOptions = {
  queries: {
    retry: 2,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,
  },
  mutations: {
    retry: 1,
  },
};

function mergeDefaultOptions(options?: DefaultOptions): DefaultOptions {
  return {
    queries: {
      ...defaultOptions.queries,
      ...options?.queries,
    },
    mutations: {
      ...defaultOptions.mutations,
      ...options?.mutations,
    },
  };
}

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    ...config,
    defaultOptions: mergeDefaultOptions(config?.defaultOptions),
  });
}

export function createTestQueryClient(config?: QueryClientConfig): QueryClient {
  return createQueryClient({
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {},
    },
    ...config,
    defaultOptions: mergeDefaultOptions({
      queries: {
        retry: false,
        ...config?.defaultOptions?.queries,
      },
      mutations: {
        retry: false,
        ...config?.defaultOptions?.mutations,
      },
    }),
  });
}
