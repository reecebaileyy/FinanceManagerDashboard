import type { ReactElement, ReactNode } from "react";

import { QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";

import { createTestQueryClient } from "@lib/react-query";

export function renderWithProviders(ui: ReactElement, options?: RenderOptions): RenderResult {
  const queryClient = createTestQueryClient();

  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  const result = render(ui, { wrapper: Wrapper, ...options });

  return {
    ...result,
    unmount: () => {
      queryClient.clear();
      result.unmount();
    },
  };
}
