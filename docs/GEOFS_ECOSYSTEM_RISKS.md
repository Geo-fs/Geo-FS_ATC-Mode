# GeoFS Ecosystem Risks

This note captures external GeoFS ecosystem behaviors that should influence extension design.

## What the current ecosystem suggests

- GeoFS addons are still largely an unofficial injection ecosystem.
  - The GeoFS Plugin System docs describe plugins as scripts loaded by a Chrome extension, but also state that installation details were still pending as of April 18, 2022.
  - The same docs state there was no testing infrastructure and developers were expected to build code and paste it into the GeoFS devtools console.
- Community addons break often when GeoFS internals or browser-extension behavior shifts.
  - `Realism-pack` warns that the Tampermonkey version may not work properly and recommends the bookmarklet path if needed.
  - `GeoFS-All-in-one-Addon` documents keybind conflicts between bundled addons and recommends injection before GeoFS loads.
  - `Geofs-Multiliveries` says older versions no longer work and requires a specific 2.0 update path.
- Chat and multiplayer behavior are operationally unstable enough to matter to ATC tooling.
  - Community-maintained GeoFS Wiki pages describe chat lag, temporary chat removal in December 2023, a multiplayer outage on November 20, 2024, and chat-filter/chat-delay changes reported on January 5, 2026.

## Foreseeable issues for this project

### 1. Protocol drift on `/update` and `/map`

The current workspace depends on observed multiplayer behavior, not a supported API contract. Any payload-shape drift can silently degrade contact fidelity, chat send, or discovery.

Mitigation:

- keep all raw GeoFS parsing isolated
- preserve degraded-state indicators
- keep fallback copy-only chat behavior
- prefer tolerant parsing over strict schema assumptions

### 2. Timing-sensitive send behavior

The addon ecosystem repeatedly shows that execution timing around page load matters. This is consistent with the current chat bridge model, which stages a message and waits for the next outbound GeoFS update.

Mitigation:

- keep send behavior idempotent and single-message staged
- surface delivery status clearly
- assume a send can be delayed, dropped, or echoed late

### 3. Extension and userscript interference

Many community addons are loaded through Tampermonkey, bookmarklets, or direct console injection. Several bundle UI overlays, keybinds, chat helpers, aircraft mods, or network behavior changes.

Risk:

- duplicate fetch/XHR hooks
- DOM collisions
- keybind collisions
- chat send interception conflicts
- separate-window workflow conflicts

Mitigation:

- keep this workspace independent of GeoFS DOM scraping
- avoid global keyboard shortcuts unless scoped to the workspace window
- expect that the attached GeoFS tab may be running other injected code

### 4. Browser/platform variance

Community reports and addon READMEs point to platform-specific failures, especially around Tampermonkey and browser behavior.

Mitigation:

- prefer Chrome-extension runtime messaging over userscript-only assumptions
- avoid requiring privileged page-global mutations beyond the minimum bridge
- test tab lifecycle, backgrounding, and popup-window behavior explicitly

### 5. Chat moderation/filter side effects

Community reports indicate chat filtering and lag can change independently of flight state. That makes GeoFS chat less deterministic than an internal message bus.

Mitigation:

- keep messages short and conservative
- do not assume immediate chat round-trip visibility
- treat missing echo as a possible platform issue, not automatic send failure

### 6. Performance pressure from large addon stacks

The larger community addon bundles combine UI, vehicle, sound, and automation logic in a single injected runtime. That increases the odds of main-thread contention inside the GeoFS tab.

Mitigation:

- keep heavy logic in the extension workspace/background where possible
- avoid polling faster than operationally necessary
- keep regional discovery optional

## Working assumptions

- GeoFS should be treated as an unstable upstream integration boundary.
- Community addon practices are useful for reconnaissance, but not a reliable architecture template.
- This project should continue favoring observability, graceful degradation, and bounded coupling over deep in-page modification.
