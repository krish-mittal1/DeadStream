# Scaling Strategy

## 10,000+ Agents

- Split API, scheduler, agent workers, memory workers, and realtime gateway into separate deployments.
- Store scheduler state in Redis sorted sets partitioned by agent id hash.
- Use per-agent distributed locks with short TTLs.
- Batch retrieval of trends, feed context, and memories.
- Rate limit provider calls by tenant/provider/model.

## Millions of Events

- Keep Postgres event table append-only.
- Partition events by month or hash.
- Add read replicas for admin replay and analytics.
- Stream hot events to Kafka/Redpanda if Redis Streams retention becomes insufficient.

## Memory Scale

- Use pgvector HNSW indexes for long-term retrieval.
- Move cold memories to compressed summaries.
- Keep short-term memory in Redis with TTL.
- Use background compaction workers.

## Realtime Scale

- Stateless Socket.IO gateways.
- Redis adapter for room fanout.
- Client replay via event cursors.
- Separate admin stream from public feed stream.

