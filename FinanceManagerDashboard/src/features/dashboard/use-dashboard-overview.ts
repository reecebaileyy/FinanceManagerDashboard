import { useQuery } from "@tanstack/react-query";

import { dashboardQueryKeys, fetchDashboardOverview } from "@lib/api/dashboard";

export function useDashboardOverview() {
  return useQuery({
    queryKey: dashboardQueryKeys.overview(),
    queryFn: fetchDashboardOverview,
  });
}
