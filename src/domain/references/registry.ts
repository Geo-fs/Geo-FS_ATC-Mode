import type { ReferenceDocument } from "./types";

export const BUNDLED_REFERENCE_DOCUMENTS: ReferenceDocument[] = [
  {
    id: "kmsp-airport-diagram-pdf",
    title: "KMSP Airport Diagram PDF",
    type: "pdf",
    airportIcao: "KMSP",
    sourceKind: "bundled_asset",
    sourcePath: "/charts/kmsp/kmsp-airport-diagram.pdf",
    category: "airport_diagram",
    effectiveDate: null,
    expirationDate: null,
    parsedText: "KMSP airport diagram PDF reference for ground and taxi operations.",
    versionTag: "bundled-kmsp-airport-diagram-pdf-v1",
    georeference: {
      aligned: false,
      method: "future",
      notes: "PDF reference available in viewer. Georeferenced overlay alignment is still a later phase."
    },
    tags: ["kmsp", "airport diagram", "pdf", "ground", "taxi"]
  },
  {
    id: "kmsp-airport-diagram-image",
    title: "KMSP Airport Diagram",
    type: "image",
    airportIcao: "KMSP",
    sourceKind: "bundled_asset",
    sourcePath: "/charts/kmsp/kmsp-airport-diagram-ground.png",
    category: "airport_diagram",
    effectiveDate: null,
    expirationDate: null,
    parsedText: "KMSP airport diagram ground reference. Use for taxi and surface awareness.",
    versionTag: "bundled-kmsp-airport-diagram-image-v1",
    georeference: {
      aligned: true,
      method: "manual",
      quality: "approximate",
      notes:
        "Manual KMSP ground-diagram overlay for the surface map. Useful for taxi context, but not survey-grade.",
      transform: {
        kind: "corner_quad",
        imageDimensions: {
          width: 896,
          height: 1263
        },
        cornerQuad: {
          topLeft: [-93.2536, 44.9249],
          topRight: [-93.1838, 44.9242],
          bottomRight: [-93.1816, 44.8543],
          bottomLeft: [-93.2514, 44.855]
        }
      },
      anchorPoints: [
        {
          id: "runway-17-threshold",
          label: "Runway 17 threshold",
          imageX: 452,
          imageY: 122,
          latitude: 44.9204,
          longitude: -93.2226
        },
        {
          id: "runway-12r-threshold",
          label: "Runway 12R threshold",
          imageX: 118,
          imageY: 478,
          latitude: 44.8995,
          longitude: -93.2471
        },
        {
          id: "runway-30r-threshold",
          label: "Runway 30R threshold",
          imageX: 742,
          imageY: 972,
          latitude: 44.8683,
          longitude: -93.1902
        }
      ]
    },
    tags: ["kmsp", "ground", "taxi", "airport diagram"]
  },
  {
    id: "kmsp-tac-pdf",
    title: "Minneapolis-St Paul TAC PDF",
    type: "pdf",
    airportIcao: "KMSP",
    sourceKind: "bundled_asset",
    sourcePath: "/charts/kmsp/minneapolis-st-paul-tac.pdf",
    category: "tac",
    effectiveDate: null,
    expirationDate: null,
    parsedText: "Twin Cities terminal area chart reference for KMSP arrivals, departures, and wider airspace management.",
    versionTag: "bundled-kmsp-tac-pdf-v1",
    georeference: {
      aligned: false,
      method: "future",
      notes: "Reference-only in this phase. Intended for future chart-aware map alignment."
    },
    tags: ["kmsp", "tac", "pdf", "airspace", "terminal area"]
  },
  {
    id: "kmsp-airspace-chart-image",
    title: "KMSP Airspace / FAA Chart",
    type: "image",
    airportIcao: "KMSP",
    sourceKind: "bundled_asset",
    sourcePath: "/charts/kmsp/kmsp-airspace-faa-chart.png",
    category: "tac",
    effectiveDate: null,
    expirationDate: null,
    parsedText: "KMSP airspace reference for wider traffic management, arrival and departure context.",
    versionTag: "bundled-kmsp-airspace-image-v1",
    georeference: {
      aligned: false,
      method: "future",
      notes: "Chart-aware reference support is ready. Georeferenced overlay alignment is a later phase."
    },
    tags: ["kmsp", "airspace", "tac", "departure", "arrival"]
  },
  {
    id: "faa-atc-phraseology-reference",
    title: "FAA-Inspired ATC Phraseology Quick Reference",
    type: "text",
    airportIcao: null,
    sourceKind: "generated_reference",
    sourcePath: "generated://faa-phraseology",
    category: "atc_phraseology",
    effectiveDate: null,
    expirationDate: null,
    parsedText:
      "Use concise controller phrasing. State callsign first when practical. Use hold short, line up and wait, cleared for takeoff, cleared to land, fly heading, descend and maintain in compact form suitable for GeoFS chat. This reference is assistance only and not a substitute for certified training or official FAA documents.",
    versionTag: "generated-faa-phraseology-v1",
    georeference: null,
    tags: ["faa", "phraseology", "tower", "ground", "approach"]
  },
  {
    id: "faa-surface-ops-reference",
    title: "Surface Ops and Runway Crossing Notes",
    type: "text",
    airportIcao: null,
    sourceKind: "generated_reference",
    sourcePath: "generated://surface-ops",
    category: "procedure_reference",
    effectiveDate: null,
    expirationDate: null,
    parsedText:
      "Surface movement assistance should emphasize taxi route clarity, runway crossing awareness, hold short language, and explicit runway identifiers. Use conservative, short wording in GeoFS text chat and prefer one instruction at a time when congestion is high.",
    versionTag: "generated-surface-ops-v1",
    georeference: null,
    tags: ["ground", "runway crossing", "hold short", "procedure"]
  }
];
