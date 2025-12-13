import { FeaturePlaceholder } from "@features/placeholders";

export default function AdminPage() {
  return (
    <FeaturePlaceholder
      id="admin"
      title="Admin & Controls"
      description="Manage feature flags, operational metrics, and curated content that powers the dashboard experience."
      highlights={[
        "Toggle rollout of experiments and premium modules",
        "Monitor service health and product KPIs at a glance",
        "Publish contextual tips that surface across the app",
      ]}
      nextSteps="Connect this panel to the Admin service endpoints and secure it behind RBAC once authentication is wired up."
      badge="admin"
    />
  );
}
