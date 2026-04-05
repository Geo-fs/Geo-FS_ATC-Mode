# GeoFS Integration

## Purpose

The GeoFS integration layer is responsible for one thing: turning GeoFS multiplayer behavior into a reliable input/output boundary for the controller workspace.

The extension does not try to replace GeoFS as the multiplayer client. Instead, it observes GeoFS’s existing behavior, normalizes what it sees, and uses that stream as the data source for the ATC workspace.

## Current observed behavior

From the current implementation and notes gathered during development:

- GeoFS multiplayer uses `https://mps.geo-fs.com/update` roughly every 500 ms
- `/update` carries nearby aircraft updates, inbound chat, and outbound chat through the request field `m`
- `/map` provides a broader multiplayer snapshot at a slower cadence
- GeoFS may throttle or freeze multiplayer activity when the tab is heavily backgrounded

These observations are treated as implementation assumptions, not permanent guarantees. The extension is structured so parser or protocol drift does not immediately crash the workspace.

## Integration approach

The extension does not scrape the GeoFS UI as its primary data source.

Instead it uses a network-observation bridge:

1. inject a small page-context bridge into GeoFS
2. observe relevant multiplayer requests and responses
3. sanitize those payloads
4. forward typed events into the extension

### Why this approach

- more stable than chasing DOM changes
- lower overhead than trying to run a second multiplayer client
- keeps GeoFS as the source of truth for session-bound behavior
- allows outbound chat to follow the observed GeoFS path instead of inventing a synthetic send channel

## Runtime responsibilities

### Page bridge

- hooks `fetch` and `XMLHttpRequest`
- watches `/update` and `/map`
- extracts traffic/chat payloads
- holds one pending outbound chat message for the next send opportunity

### Content script

- injects the bridge
- receives sanitized page messages
- forwards them to background
- relays outbound send intents back to the bridge

### Background service worker

- receives runtime events from content
- updates the authoritative extension session
- tracks health and connection state
- exposes state snapshots to the workspace

### Workspace

- never talks to GeoFS directly
- sends intent actions to background
- renders current health, traffic, chat, and degraded-state indicators

## Sanitization and normalization rules

The integration layer is intentionally conservative about what it forwards and persists.

- do not persist GeoFS session identifiers or raw auth/session material
- strip request fields that are not needed for controller coordination
- normalize aircraft and chat data into shared typed models immediately
- isolate GeoFS-specific payload handling in the integration path instead of scattering shape assumptions through the UI

This helps keep privacy risk down and prevents the rest of the codebase from depending on raw GeoFS payload shape.

## Outbound chat handling

Outbound chat follows the same layered path as the rest of the extension:

1. the workspace validates the message against the configured safe length
2. the background receives a send request
3. the request is relayed to the attached GeoFS tab
4. the content script posts the send intent into the injected page bridge
5. the page bridge stores one pending outbound message
6. on the next GeoFS `/update` request, the bridge writes that message into `m`

### Why the hard length guard matters

GeoFS chat is short and easy to overflow. The workspace therefore keeps a safe default maximum below the observed hard limit so a controller can work quickly without constant truncation risk.

The extension guards against:

- typing beyond the safe maximum
- sending templates that exceed the safe maximum
- accidental UI-side overflow that would otherwise be truncated by GeoFS

## Health and observability

The integration layer also feeds controller-facing health signals.

The workspace can surface:

- whether a GeoFS tab is attached
- whether the content script is attached
- whether the bridge appears alive
- last update and last map activity
- approximate update cadence and jitter
- backgrounded/throttled conditions

This is important because GeoFS tab state directly affects controller confidence. A frozen traffic feed is an operational issue, not just a technical detail.

## Failure handling

- if no active GeoFS tab is attached, sending is blocked and the workspace can fall back to copy-only behavior
- if the content script or page bridge heartbeat is stale, the workspace indicates degraded link state
- if GeoFS changes its payload shape, parser failures are isolated and surfaced through diagnostics without crashing the UI

## Current limits

- the integration is still based on observed GeoFS behavior, not an official API contract
- background throttling or browser tab suspension can reduce fidelity
- outbound chat currently assumes the observed `/update.m` path remains valid
- the current approach is optimized for a controller workspace with GeoFS open, not for full headless or detached multiplayer operation
