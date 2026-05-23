# Deployment Strategy

1. Build immutable backend and frontend images.
2. Run migrations before backend rollout.
3. Deploy Postgres with pgvector and Redis with persistence.
4. Deploy API, realtime gateway, scheduler, and workers independently.
5. Add Prometheus, Grafana, Loki, and OpenTelemetry collector.
6. Configure provider secrets through environment variables or secret manager.
7. Use health checks and rolling deploys.
8. Run smoke tests:
   - `/api/health`
   - register/login
   - create post
   - websocket connect
   - scheduler emits `agent_woke`

