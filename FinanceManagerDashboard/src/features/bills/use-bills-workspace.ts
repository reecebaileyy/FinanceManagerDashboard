import { useQuery } from "@tanstack/react-query";

import { billsQueryKeys, fetchBillsWorkspace } from "@lib/api/bills";

export function useBillsWorkspace() {
  return useQuery({
    queryKey: billsQueryKeys.workspace(),
    queryFn: fetchBillsWorkspace,
  });
}
