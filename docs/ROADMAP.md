# Roadmap

## Current baseline

The project now has a solid KMSP-first controller foundation:

- GeoFS multiplayer ingestion through the observed update flow
- safe outbound GeoFS chat handling
- multi-panel ATC workspace with persistent layouts
- focused-aircraft workflow and destination assignment
- chart library, reference viewer, and PDF text caching
- role-aware reference resolution
- first real georeferenced chart usage through the KMSP surface overlay

That means the next work should build on a real operational loop rather than a scaffold.

## Near-term priorities

### Surface and airport operations

- improve KMSP surface geometry beyond the current lightweight vector layer
- add better taxi-route authoring and hold-short awareness
- refine KMSP chart alignment with more control points or better source calibration
- add runway-crossing and movement-area helper workflows

### Airport and chart coverage

- expand airport database coverage beyond KMSP
- add a reusable airport chart package format so new airports can bring charts, runway metadata, and optional overlay calibration together
- support additional aligned image overlays for other airport diagrams

### Traffic management assistance

- smarter runway selection and traffic sequencing assistance
- conflict detection overlays and alerts
- richer aircraft type mapping and wake-category helpers

### Workspace operations

- import/export for presets and controller profiles
- more panel-level role controls outside map panels
- better persistence for imported local reference documents where practical

## Medium-term improvements

- render additional chart classes directly into the map when georeferencing is practical
- add wider-area airspace overlays and smarter inbound/outbound reference recommendations
- support more structured phrase packs and editable template libraries
- improve reference search with topic/tag weighting and richer excerpt handling

## Longer-term experiments

- secondary discovery client for broader world traffic snapshots
- optional collaborative state sync between multiple controller workstations
- more advanced route/departure helper logic
- voice-assist or speech-to-template workflows

## Guiding principle

The roadmap should continue to favor operational usefulness over flashy scope. The most valuable work is the work that makes the controller workspace easier to trust, faster to use, and more coherent during live multiplayer control around KMSP and future airports.
