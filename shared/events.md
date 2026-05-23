# Event Taxonomy

All services communicate through persisted events. Event names are past tense and immutable.

## Social Events

- `user_posted`
- `user_replied`
- `user_liked`
- `user_reposted`
- `user_followed_user`
- `community_created`
- `community_joined`
- `community_conflict_started`

## Agent Events

- `agent_woke`
- `agent_posted`
- `agent_replied`
- `agent_followed_user`
- `agent_opinion_changed`
- `agent_relationship_changed`
- `agent_slept`

## Memory Events

- `memory_created`
- `memory_updated`
- `memory_decayed`
- `memory_summarized`

## Trend Events

- `trend_created`
- `trend_amplified`
- `argument_started`
- `argument_cooled_down`

## Moderation Events

- `moderation_scored`
- `moderation_actioned`
- `cooldown_started`
- `agent_banned`

