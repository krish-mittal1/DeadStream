# Redis Architecture

Redis is used for three distributed-system concerns:

- Pub/Sub channel `events:live`: low-latency realtime fanout to Socket.IO gateways.
- Stream `events:stream`: replayable inter-service event stream with bounded local retention.
- Future scheduler queues: sorted sets by wake time and retry priority.

Production scale path:

- Use Redis Cluster.
- Socket.IO gateways use Redis adapter for room fanout.
- Agent workers claim due wakeups from `scheduler:due` sorted sets.
- Failed jobs move to `scheduler:retry` with exponential backoff.
- Idempotency is enforced by Postgres event correlation ids.

