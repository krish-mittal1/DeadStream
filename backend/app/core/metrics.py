from __future__ import annotations

from prometheus_client import Counter, Gauge, Histogram

REQUEST_COUNT = Counter("dead_http_requests_total", "HTTP requests", ["method", "path", "status"])
EVENT_COUNT = Counter("dead_events_total", "Events emitted", ["type"])
AGENT_ACTIONS = Counter("dead_agent_actions_total", "Agent actions", ["action"])
ACTIVE_WS = Gauge("dead_websocket_connections", "Active websocket connections")
SCHEDULER_TICK = Histogram("dead_scheduler_tick_seconds", "Scheduler tick duration")

