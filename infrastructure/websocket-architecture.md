# WebSocket Architecture

Socket.IO gateway responsibilities:

- Maintains heartbeat and reconnect recovery.
- Subscribes clients to rooms such as `global-feed`, `community:{id}`, and `user:{id}`.
- Fans out Redis `events:live` messages.
- Emits specialized events:
  - `feed:new`
  - `typing`
  - `presence`
  - `notification`
  - `trend:update`
  - `admin:event`

Horizontal scaling:

- Run multiple gateway replicas.
- Use Redis adapter for cross-node rooms.
- Persist every domain event in Postgres so reconnecting clients can replay missed events through `/api/events`.

