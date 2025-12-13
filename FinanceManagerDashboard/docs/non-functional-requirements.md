# Non-Functional Requirements Checklist

This checklist formalizes the performance, security, and operational targets referenced in CS490 Starter 26 and the architecture guide. It completes backlog Task: "Establish non-functional requirements checklist".

## Performance & Scalability
- **Page Load**: Core Web Vitals (LCP < 2.5s, FID < 100ms, CLS < 0.1) on median broadband for landing and dashboard pages.
- **API Latency**: P95 under 300ms for gateway endpoints; Auth and Transactions critical paths maintain P99 < 500ms.
- **Throughput**: System supports 10k concurrent authenticated sessions with auto-scaling ECS tasks and read replica routing.
- **Data Volume**: Transactions service handles imports up to 50k records per batch without degradation by streaming ingestion.
- **Scalability Strategy**: Horizontal scaling on ECS, read replicas for reporting, Redis sharding for queues and cache.

## Reliability & Availability
- **Uptime Target**: 99.9% monthly uptime for customer-facing endpoints.
- **Failover**: Multi-AZ RDS deployment; Redis configured with auto-failover; CloudFront + Route 53 health checks for API gateway.
- **Backups**: Daily automated backups with point-in-time recovery (7 day retention) plus weekly S3 cold storage snapshot for compliance.
- **Disaster Recovery**: RTO 4 hours, RPO 15 minutes using Terraform-driven environment recreation and database snapshots.

## Security & Privacy
- **Authentication**: JWT access tokens + rotating refresh tokens; session cookies marked HttpOnly, Secure, SameSite=Lax.
- **Authorization**: RBAC enforced in gateway; service-level ABAC for sensitive resources (admin endpoints, exports).
- **Encryption**: TLS 1.2+ in transit; AES-256 at rest for RDS, S3, Redis.
- **Secret Management**: AWS Secrets Manager with automatic rotation policies for Plaid, Twilio, Azure OpenAI credentials.
- **Data Privacy**: GDPR/CCPA compliant data handling, consent logging, and right-to-be-forgotten workflows executed via purge jobs.
- **Vulnerability Management**: Monthly Snyk/Trivy scans; critical findings patched within 7 days.

## Compliance & Auditability
- **Logging**: Structured JSON logs with correlation IDs; retention 13 months; log integrity assured via immutability on S3 Glacier deep archive.
- **Audit Trails**: `audit_events` capture security-relevant actions (login, MFA changes, data exports) with IP/device metadata.
- **Policies**: Documented incident response (acknowledge < 15 min, mitigate < 2 hr), change management, and access reviews every quarter.

## Accessibility & Usability
- **Standards**: WCAG 2.2 AA compliance for all frontend features.
- **Keyboard Support**: 100% interactive elements reachable; focus states visible; skip navigation available.
- **Screen Reader**: ARIA landmarks for layout, descriptive labels for graphs, live region for AI assistant responses.
- **Internationalization**: Currency and locale formatting using `Intl` APIs; copy stored as translation keys to prep for multi-language rollout.

## Observability & Supportability
- **Monitoring**: Prometheus + Grafana dashboards for KPIs (daily active users, transaction ingestion rate, job queue depth).
- **Tracing**: OpenTelemetry instrumentation across gateway and services with traces retained 14 days.
- **Alerting**: OpsGenie routing for Sev1 (availability, auth failure spikes) with on-call escalation matrix; Slack notifications for lower severity.
- **Analytics**: PostHog funnels for onboarding, retention cohorts, and AI usage metrics updated hourly.

## Operational Processes
- **Deployments**: GitHub Actions with mandatory lint, type-check, unit, integration tests; blue/green releases for gateway/services.
- **Change Control**: PR reviews required; production deploys only via protected branches with automated changelog generation.
- **Support**: In-app support widget (Helpscout) with SLA 1 business day; knowledge base updated release-by-release.

## Quality Assurance
- **Testing Coverage**: Unit test coverage >= 80% for services and frontend components; critical flows (auth, budgets, AI suggestions) covered by Playwright E2E.
- **Performance Testing**: k6 load tests executed before major releases with baseline results stored for regression comparison.
- **Accessibility Testing**: axe-core automated checks integrated in CI; manual screen reader smoke test once per release.

## Future Enhancements
- **Regional Redundancy**: Evaluate cross-region replication to improve RTO/RPO beyond baseline after MVP launch.
- **Data Governance**: Implement data catalog tooling (OpenMetadata) once data warehouse integration begins (post-MVP).
