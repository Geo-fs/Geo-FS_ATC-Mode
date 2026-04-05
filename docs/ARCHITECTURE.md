# Architecture

## Overview

GeoFS ATC Workspace is organized as a small multi-surface extension rather than a single page script. That split is deliberate: GeoFS itself remains responsible for multiplayer session behavior, while the extension owns controller state, presentation, and workflow tools.

The current system has four important layers:

1. GeoFS integration surfaces that observe and relay live multiplayer behavior
2. background/session coordination that acts as the extension’s source of truth
3. a shared domain layer that turns raw multiplayer and reference inputs into typed operational models
4. a workspace UI that renders those models into controller workflows

This separation keeps the GeoFS-specific pieces isolated, makes the React workspace easier to evolve, and gives the chart/reference system a place to grow without turning map components into logic sinks.

## Runtime surfaces

### Content script

The content script is intentionally lightweight.

- injects the page bridge into GeoFS
- listens for sanitized events from the page context
- forwards those events into the extension runtime
- relays outbound chat requests back toward the page bridge

It is not supposed to become a second application. Its job is to bridge GeoFS and the extension safely and with minimal DOM dependence.

### Page bridge

The injected page bridge is the GeoFS-facing integration boundary.

- hooks `fetch` and `XMLHttpRequest` for GeoFS multiplayer endpoints
- observes `/update` and `/map` request/response pairs
- extracts nearby-aircraft and chat information from the observed payloads
- accepts one pending outbound chat message and writes it into the next `/update` request `m` field

This approach is more stable than UI scraping and keeps GeoFS itself as the live multiplayer authority.

### Background service worker

The background service worker is the authoritative extension coordinator.

- holds the current session snapshot
- tracks which GeoFS tab is active and attached
- tracks workspace clients
- persists durable workspace state
- broadcasts session snapshots and send results

The background layer is the right place for state fan-out and persistence because it survives beyond a single React page and decouples the controller workspace from the GeoFS tab lifecycle.

### Workspace UI

The React workspace is the primary operator surface.

- receives state snapshots from background
- renders traffic, maps, chat, focus cards, weather, and references
- sends intent actions rather than mutating GeoFS directly
- persists controller-driven workspace state through the background layer

The workspace is intentionally treated as the product surface. It is not a small popup and it is not an afterthought to the content script.

## Shared domain layer

The shared domain layer is what keeps the project from collapsing into integration code plus UI code.

It currently includes:

- aircraft models, tracking, and stale-contact logic
- airport/runway metadata and helpers
- weather snapshot types and runway-wind reasoning
- chat templates and outbound safety validation
- focus-target state
- map panel and layout models
- reference/chart models, ranking, search, cache behavior, and georeference support

This layer is where the project converts raw inputs into reusable controller concepts.

## Data flow

The current end-to-end flow looks like this:

1. GeoFS performs multiplayer network activity.
2. The injected page bridge observes `/update` or `/map`.
3. The content script receives the bridge payload.
4. The background session normalizes and stores the latest session state.
5. The workspace receives a state snapshot and rerenders relevant panels.
6. The controller performs an action such as selecting an aircraft, sending chat, pinning a reference, or changing a map-panel role.
7. The workspace sends that action to the background.
8. The background persists durable state or relays the action back toward GeoFS if needed.

This keeps the direction of responsibility clear:

- GeoFS owns multiplayer session behavior
- background owns extension coordination and persistence
- the domain layer owns interpretation and ranking logic
- the workspace owns presentation and operator interaction

## State boundaries

### Ephemeral state

Lives primarily in background memory and mirrored workspace state:

- live contacts
- live chat log
- health/update timing
- current weather snapshot
- selected aircraft

### Durable state

Lives in `chrome.storage.local`:

- layout and presets
- map panel configuration
- reference shelf state
- role pins and notes
- focus targets and destinations
- settings and filters

### Session-local state

Lives only in the current workspace runtime:

- imported local file object URLs
- non-persisted temporary reference binaries

This split is intentional. Persisting operator intent is valuable. Persisting transient imported-file blobs is not yet worth the complexity.

## Controller workflow model

The current workspace tries to reflect ATC tasks instead of generic dashboard categories.

### Traffic workflow

- the operator selects or filters traffic
- contacts can be pinned into focus
- map and table interaction stay synchronized through shared selection state

### Chat workflow

- templates can prefill the composer
- the composer validates outbound length before any send attempt
- the background and bridge send through GeoFS’s observed update path rather than a synthetic transport

### Reference workflow

- panels and focus cards ask the reference domain for context-appropriate material
- the reference shelf remains the browsing surface
- the viewer is still the place for reading/searching
- the map can now consume a subset of references as aligned overlays when georeference metadata exists

### Surface workflow

The surface map is now the best example of cross-layer integration:

- reference resolver selects a ground-appropriate renderable image
- georeference logic converts chart metadata into map-usable image coordinates
- the map draws the chart image underneath vector geometry
- runways and live traffic remain interactive above the chart

That makes the reference system operationally useful inside the live controller map, not just in a separate viewer.

## Document intelligence layer

The chart/reference system is now its own subsystem rather than a few ad hoc viewer components.

### Core model

All documents use the same `ReferenceDocument` shape:

- document identity and title
- document type: image, PDF, or text
- airport association
- source kind
- category
- parsed or generated text
- optional georeference metadata
- tags and version metadata

### Resolver

The resolver ranks references by operational context instead of just document type.

Current signals include:

- airport match
- category fit for the panel role
- document type fit for the panel role
- grounded vs airborne context
- approach, tower, or ground focus
- weather presence
- destination-aware airspace context
- role pins
- whether a chart is renderable as a live overlay

### Search and indexing

- generated text references are searchable immediately
- PDFs can expose extracted text when available
- cached PDF extraction results reduce repeat cost for large documents

### Georeference support

The reference model now carries map-usable alignment metadata instead of only descriptive notes.

Current support includes:

- manual corner-quad image alignment
- control-point-oriented transform types for future work
- alignment quality markers such as approximate vs tuned
- helper functions that resolve renderable map quads from document metadata

The first real use of this system is the KMSP airport-diagram image overlay in the surface map.

## Map architecture

Map panels share a common rendering shell but differ by role and default behavior.

### Traffic map

- wider-area situational awareness
- airspace-oriented reference role by default
- intended to carry future conflict and traffic management layers

### Runway / wind map

- airport-scale runway and wind context
- runway-related reference role by default
- intended as the runway-usage decision surface

### Surface map

- closer-in airport movement context
- ground-reference role by default
- now supports the KMSP airport-diagram image overlay

### Layer strategy

The current layer ordering is intentionally simple:

- aligned chart image at the bottom when enabled
- vector surface geometry and runway layers above it
- traffic points above the static reference layers
- marker/UI affordances above the map itself

That keeps traffic readable while still letting the chart act as a real movement reference.

## Persistence design

Persistent state is versioned through default-state creation and migration helpers.

This is already used for:

- reference shelf evolution
- panel-role and chart-overlay additions
- future-safe default filling when new fields are introduced

The project is still early, but this structure matters because workspace customization is part of the product, not an optional extra.

## Extensibility points

- `WeatherProvider` for GeoFS weather, NOAA, or future sources
- `AirportDataProvider` for bundled airports, runtime-discovered airports, or external navdata
- `MessageSuggestionProvider` for new ATC phrase packs or controller modes
- `MapLayerDefinition` for future overlays such as conflict detection or taxi routes
- `ReferenceDocument` registry for bundled charts, imported files, remote docs, and future georeferenced overlays
- `ReferenceResolver` for role-aware PDF/image/text preference selection
- `GeoreferenceMetadata` plus overlay helpers for airport-specific chart alignment beyond KMSP

## Performance notes

The project already includes a few targeted performance choices:

- the reference viewer is lazy-loaded through React `lazy`/`Suspense`
- `pdf.js` is dynamically imported only when a PDF is opened
- PDF text extraction is cached in extension storage
- surface-map chart overlays are panel-local and opt-in
- Vite manual chunking separates PDF, map, layout, and state dependencies

The biggest remaining performance tradeoff is still the size of the `maplibre` chunk. The chart/reference layer is no longer the primary startup concern.

## Georeferenced overlay path

The current overlay path is intentionally narrow and practical.

- only image documents are renderable into the live map today
- only charts with usable georeference metadata are eligible
- the resolver chooses the best renderable document for the panel role
- the map layer helper converts the document’s transform into MapLibre image-source coordinates
- the controller can toggle visibility, change opacity, and reset panel overlay settings

KMSP is the first aligned-airport implementation, not the final model. The goal of this phase is to make chart alignment visibly useful while keeping the code modular enough for better calibration and more airports later.

## Known architectural boundaries

- GeoFS-specific network assumptions are still an external dependency and can change
- imported local references are intentionally session-scoped
- PDF charts are still viewer assets, not live map overlays
- the KMSP chart alignment is approximate and controller-assistive, not aeronautically authoritative
