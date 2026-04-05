# Charts And References

## Purpose

The chart/reference layer exists so the workspace can behave more like a controller console and less like a collection of disconnected widgets. Instead of forcing the controller to keep airport diagrams, TACs, phraseology notes, and PDF references open in separate tools, the extension can now carry those materials as first-class workspace data.

This subsystem is not just a viewer. It now includes:

- typed document metadata
- airport association
- chart categorization
- searchable extracted text
- role-aware ranking
- favorites and workflow pinning
- panel integration
- early georeferenced map-overlay support

## What is bundled today

### KMSP bundled assets

Packaged chart assets currently live in:

- `public/charts/kmsp/kmsp-airport-diagram-ground.png`
- `public/charts/kmsp/kmsp-airspace-faa-chart.png`
- `public/charts/kmsp/kmsp-airport-diagram.pdf`
- `public/charts/kmsp/minneapolis-st-paul-tac.pdf`

These are exposed through the reference registry as bundled documents with categories, tags, airport scope, and version metadata.

Larger regional references such as sectional PDFs should be treated as optional local imports rather than bundled repo assets. That keeps the public repository pushable without Git LFS while preserving the same in-app viewer workflow.

### Generated references

The workspace also includes generated text references such as:

- FAA-inspired ATC phraseology quick reference
- surface-ops and runway-crossing notes

These are intentionally framed as operational assistance rather than training or compliance authority.

## Supported document types

- image charts: PNG, JPG, JPEG
- PDF documents via `pdf.js`
- text references and generated notes

Every document flows through the same `ReferenceDocument` model, which makes searching, recommendation, and role-aware panel behavior consistent across asset types.

## What the controller can do with references

### Shelf workflow

The chart library panel acts like a controller reference shelf, not a generic file browser.

- browse bundled and imported references together
- filter through search
- mark favorites
- pin documents
- attach short controller notes
- open a document into the viewer

### Viewer workflow

The reference viewer handles three different workloads:

- read and browse chart images
- render and search PDFs
- read text references or generated notes

The viewer is still the best place for reading/search tasks, while the map layer only consumes references that are usable as live overlays.

### Workflow binding

The reference system is now tied directly into controller workflow:

- map panels expose a reference role
- focus cards can open the best chart for an aircraft/context
- role pins let the operator lock a specific document to a workflow role
- the surface map can resolve a renderable aligned overlay rather than just opening a chart in the viewer

## Reference categories and roles

### Categories

The current system recognizes categories such as:

- `airport_diagram`
- `tac`
- `sectional`
- `runway_map`
- `metar_reference`
- `atc_phraseology`
- `regulation_reference`
- `procedure_reference`
- `miscellaneous`

### View roles

The resolver currently works with these workflow roles:

- `ground_reference`
- `airspace_reference`
- `weather_reference`
- `procedure_reference`
- `reading_reference`

These roles represent controller intent, not file formats. That distinction matters: the question is not “should I open an image or a PDF,” but “what kind of reference am I trying to use right now?”

## Reference resolution

Reference choice is resolved in the domain layer rather than scattered across UI components.

### What the resolver looks at

- selected airport
- whether a selected aircraft is grounded
- whether a selected aircraft is airborne
- focused aircraft modes such as approach, tower, or ground
- destination-aware airspace context
- weather availability
- document category
- document type
- role pins
- whether a document is renderable as a map overlay

### Current role preferences

- `ground_reference` leans toward airport diagrams first, especially image-based and renderable ones
- `airspace_reference` favors TAC and sectional material
- `weather_reference` boosts runway/procedure/metar-style material when weather context exists
- `procedure_reference` favors text/PDF help material
- `reading_reference` prioritizes searchable PDFs and text-heavy references

### Why this matters operationally

The resolver is what keeps the workspace from behaving like a pile of links.

Examples:

- a grounded aircraft near KMSP should raise the airport diagram immediately
- an arrival/departure context should push TAC or sectional references upward
- a reading/search task should prefer a searchable PDF over a pretty image
- a surface map should prefer a renderable aligned image instead of a PDF that cannot be drawn into the live map

## PDF support

The PDF path is built for in-workspace use rather than relying on VS Code or external viewers.

### Current PDF capabilities

- page rendering inside the workspace
- page navigation
- extracted-text search when text exists
- cache-aware loading
- bundled or imported PDFs

### Extracted text caching

PDF extracted text is cached in `chrome.storage.local`.

- cache keys are based on `document.id` plus version metadata such as source path and version tag
- successful extraction results are reused when the version key still matches
- failed extraction attempts are also cached so the UI can fail gracefully instead of reparsing the same broken or image-only file on every open

This keeps large TAC/sectional PDFs from feeling slow every time they are revisited.

### Limits of PDF extraction

- scanned/image-only PDFs may render correctly but remain unsearchable
- imported local files can still be cached, but reuse across full reloads is limited because object URLs are session-scoped

## Georeferenced overlays

This subsystem now begins real chart alignment instead of just carrying placeholder metadata.

### Current model

`ReferenceDocument.georeference` supports typed alignment metadata, including:

- alignment status
- method
- quality marker
- notes
- manual control points
- image dimensions
- practical render transforms such as a corner quad

### Current implementation

The first live-map use of this model is the KMSP airport-diagram image.

- the bundled airport-diagram image has manual alignment metadata
- the surface map resolves it as the best renderable ground-reference overlay
- the overlay is drawn into MapLibre as an image source
- vector surface geometry and runway centerlines remain above it
- multiplayer traffic remains above both, preserving interactivity and readability

### Controller controls

The surface panel currently supports:

- show/hide aligned overlay
- opacity slider
- quick reset to panel defaults

Overlay state is persisted per map panel, which means it behaves like part of the workspace layout rather than a throwaway local toggle.

### Accuracy

The current KMSP overlay is intentionally documented as approximate.

It is useful for:

- runway and taxi context
- surface awareness
- controller orientation inside the KMSP field environment

It is not yet appropriate to describe as:

- exact taxiway geometry
- authoritative aeronautical positioning
- survey-grade movement-area alignment

## Performance decisions

The reference layer tries to stay useful without dominating startup cost.

- the PDF/reference viewer is code-split and lazy-loaded
- `pdf.js` is only loaded when a PDF is opened
- extracted text is cached so repeated reads are cheaper
- live map overlays are limited to documents that are actually renderable and enabled

This means the reference system is no longer just passive documentation. It participates in map workflows while still avoiding unnecessary startup work.

## Current limits

- imported local files are session-only in this phase and are not persisted across full reloads
- PDF text search depends on extractable text; scanned/image-only PDFs may render but remain unsearchable
- only the KMSP airport-diagram image currently has live map-overlay alignment metadata
- current KMSP alignment is manual and approximate; additional tuning or better source calibration will improve fidelity later
- PDF charts are still reference-viewer assets in this phase and are not yet drawn directly into the interactive map
- the resolver is workflow-aware but still heuristic, not operationally authoritative
- panel-level role assignment exists, but only map panels currently expose direct role switching in the UI
- reference content is operational assistance, not certified training, legal guidance, or procedural compliance software
