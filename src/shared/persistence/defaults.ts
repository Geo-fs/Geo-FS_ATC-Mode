import { DEFAULT_AIRPORT_ICAO, DEFAULT_CHAT_SAFE_MAX, DEFAULT_MAP_SYNC_GROUP, STORAGE_SCHEMA_VERSION } from "../config/constants";
import { createId } from "../utils/id";
import { DEFAULT_LINKED_PHRASE_PACKS, DEFAULT_MESSAGE_TEMPLATES } from "../../domain/chat/templates";
import { createDefaultChartOverlayState } from "../../domain/maps/chartOverlay";
import type { PersistedWorkspaceState } from "../contracts/storage";

export const createDefaultWorkspaceState = (): PersistedWorkspaceState => {
  const layout: PersistedWorkspaceState["layout"] = {
    activePresetId: "approach",
    layouts: [
      { i: "status", x: 0, y: 0, w: 12, h: 2 },
      { i: "traffic-table", x: 0, y: 2, w: 3, h: 8 },
      { i: "traffic-map", x: 3, y: 2, w: 5, h: 8 },
      { i: "runway-map", x: 8, y: 2, w: 4, h: 4 },
      { i: "surface-map", x: 8, y: 6, w: 4, h: 4 },
      { i: "chat", x: 0, y: 10, w: 4, h: 6 },
      { i: "focus", x: 4, y: 10, w: 4, h: 6 },
      { i: "weather", x: 8, y: 10, w: 4, h: 3 },
      { i: "settings", x: 8, y: 13, w: 4, h: 3 },
      { i: "chart-library", x: 0, y: 16, w: 5, h: 6 },
      { i: "reference-viewer", x: 5, y: 16, w: 7, h: 6 }
    ],
    presets: [
      {
        id: "approach",
        label: "Approach",
        layout: [
          { i: "status", x: 0, y: 0, w: 12, h: 2 },
          { i: "traffic-table", x: 0, y: 2, w: 3, h: 8 },
          { i: "traffic-map", x: 3, y: 2, w: 5, h: 8 },
          { i: "runway-map", x: 8, y: 2, w: 4, h: 4 },
          { i: "surface-map", x: 8, y: 6, w: 4, h: 4 },
          { i: "chat", x: 0, y: 10, w: 4, h: 6 },
          { i: "focus", x: 4, y: 10, w: 4, h: 6 },
          { i: "weather", x: 8, y: 10, w: 4, h: 3 },
          { i: "settings", x: 8, y: 13, w: 4, h: 3 },
          { i: "chart-library", x: 0, y: 16, w: 5, h: 6 },
          { i: "reference-viewer", x: 5, y: 16, w: 7, h: 6 }
        ],
        responsiveLayouts: {
          standard: [
            { i: "status", x: 0, y: 0, w: 12, h: 2 },
            { i: "traffic-table", x: 0, y: 2, w: 4, h: 7 },
            { i: "traffic-map", x: 4, y: 2, w: 8, h: 7 },
            { i: "runway-map", x: 0, y: 9, w: 6, h: 5 },
            { i: "surface-map", x: 6, y: 9, w: 6, h: 5 },
            { i: "chat", x: 0, y: 14, w: 4, h: 6 },
            { i: "focus", x: 4, y: 14, w: 4, h: 6 },
            { i: "weather", x: 8, y: 14, w: 4, h: 3 },
            { i: "settings", x: 8, y: 17, w: 4, h: 3 },
            { i: "chart-library", x: 0, y: 20, w: 5, h: 6 },
            { i: "reference-viewer", x: 5, y: 20, w: 7, h: 6 }
          ],
          compact: [
            { i: "status", x: 0, y: 0, w: 12, h: 3 },
            { i: "traffic-table", x: 0, y: 3, w: 12, h: 6 },
            { i: "traffic-map", x: 0, y: 9, w: 12, h: 7 },
            { i: "runway-map", x: 0, y: 16, w: 6, h: 5 },
            { i: "surface-map", x: 6, y: 16, w: 6, h: 5 },
            { i: "chat", x: 0, y: 21, w: 6, h: 6 },
            { i: "focus", x: 6, y: 21, w: 6, h: 6 },
            { i: "weather", x: 0, y: 27, w: 12, h: 3 },
            { i: "settings", x: 0, y: 30, w: 12, h: 4 },
            { i: "chart-library", x: 0, y: 34, w: 12, h: 6 },
            { i: "reference-viewer", x: 0, y: 40, w: 12, h: 7 }
          ]
        }
      },
      {
        id: "tower",
        label: "Tower",
        layout: [
          { i: "status", x: 0, y: 0, w: 12, h: 2 },
          { i: "runway-map", x: 0, y: 2, w: 6, h: 7 },
          { i: "surface-map", x: 6, y: 2, w: 6, h: 7 },
          { i: "traffic-table", x: 0, y: 9, w: 3, h: 8 },
          { i: "traffic-map", x: 3, y: 9, w: 5, h: 8 },
          { i: "chat", x: 8, y: 9, w: 4, h: 4 },
          { i: "focus", x: 8, y: 13, w: 4, h: 4 },
          { i: "weather", x: 0, y: 17, w: 4, h: 3 },
          { i: "settings", x: 4, y: 17, w: 4, h: 5 },
          { i: "chart-library", x: 8, y: 17, w: 4, h: 5 },
          { i: "reference-viewer", x: 0, y: 20, w: 12, h: 5 }
        ],
        responsiveLayouts: {
          compact: [
            { i: "status", x: 0, y: 0, w: 12, h: 3 },
            { i: "runway-map", x: 0, y: 3, w: 12, h: 6 },
            { i: "surface-map", x: 0, y: 9, w: 12, h: 6 },
            { i: "traffic-table", x: 0, y: 15, w: 12, h: 5 },
            { i: "traffic-map", x: 0, y: 20, w: 12, h: 6 },
            { i: "chat", x: 0, y: 26, w: 6, h: 5 },
            { i: "focus", x: 6, y: 26, w: 6, h: 5 },
            { i: "weather", x: 0, y: 31, w: 12, h: 3 },
            { i: "settings", x: 0, y: 34, w: 12, h: 4 },
            { i: "chart-library", x: 0, y: 38, w: 12, h: 5 },
            { i: "reference-viewer", x: 0, y: 43, w: 12, h: 6 }
          ]
        }
      },
      {
        id: "ground",
        label: "Ground",
        layout: [
          { i: "status", x: 0, y: 0, w: 12, h: 2 },
          { i: "surface-map", x: 0, y: 2, w: 7, h: 10 },
          { i: "traffic-table", x: 7, y: 2, w: 5, h: 5 },
          { i: "chat", x: 7, y: 7, w: 5, h: 5 },
          { i: "focus", x: 0, y: 12, w: 7, h: 5 },
          { i: "runway-map", x: 7, y: 12, w: 5, h: 5 },
          { i: "weather", x: 0, y: 17, w: 4, h: 3 },
          { i: "settings", x: 4, y: 17, w: 4, h: 5 },
          { i: "chart-library", x: 8, y: 17, w: 4, h: 5 },
          { i: "reference-viewer", x: 0, y: 20, w: 12, h: 5 }
        ],
        responsiveLayouts: {
          compact: [
            { i: "status", x: 0, y: 0, w: 12, h: 3 },
            { i: "surface-map", x: 0, y: 3, w: 12, h: 8 },
            { i: "traffic-table", x: 0, y: 11, w: 12, h: 5 },
            { i: "chat", x: 0, y: 16, w: 12, h: 5 },
            { i: "focus", x: 0, y: 21, w: 12, h: 6 },
            { i: "runway-map", x: 0, y: 27, w: 12, h: 5 },
            { i: "weather", x: 0, y: 32, w: 12, h: 3 },
            { i: "settings", x: 0, y: 35, w: 12, h: 4 },
            { i: "chart-library", x: 0, y: 39, w: 12, h: 5 },
            { i: "reference-viewer", x: 0, y: 44, w: 12, h: 6 }
          ]
        }
      },
      {
        id: "chartops",
        label: "Chart Ops",
        layout: [
          { i: "status", x: 0, y: 0, w: 12, h: 2 },
          { i: "traffic-map", x: 0, y: 2, w: 6, h: 8 },
          { i: "surface-map", x: 6, y: 2, w: 6, h: 8 },
          { i: "settings", x: 0, y: 10, w: 4, h: 5 },
          { i: "chart-library", x: 0, y: 15, w: 4, h: 7 },
          { i: "reference-viewer", x: 4, y: 10, w: 8, h: 12 }
        ]
      }
    ]
  };

  const filters: PersistedWorkspaceState["filters"] = {
    callsignQuery: "",
    maxRangeNm: 60,
    minAltitudeFeet: 0,
    maxAltitudeFeet: 20000,
    groundedOnly: false,
    airborneOnly: false,
    focusedOnly: false,
    activeOnly: true
  };

  const mapPanels: PersistedWorkspaceState["mapPanels"] = [
    {
      id: createId("map"),
      kind: "traffic",
      title: "Traffic / Airspace",
      syncGroup: DEFAULT_MAP_SYNC_GROUP,
      referenceRole: "airspace_reference",
      chartOverlay: createDefaultChartOverlayState("traffic"),
      viewport: { center: [-93.2223, 44.8848], zoom: 9.5, bearing: 0 },
      toggles: {
        labels: true,
        headingVectors: true,
        trails: true,
        runways: true,
        wind: false,
        surface: false
      }
    },
    {
      id: createId("map"),
      kind: "runway",
      title: "Wind / Runway",
      syncGroup: DEFAULT_MAP_SYNC_GROUP,
      referenceRole: "weather_reference",
      chartOverlay: createDefaultChartOverlayState("runway"),
      viewport: { center: [-93.2223, 44.8848], zoom: 11, bearing: 0 },
      toggles: {
        labels: true,
        headingVectors: false,
        trails: false,
        runways: true,
        wind: true,
        surface: false
      }
    },
    {
      id: createId("map"),
      kind: "surface",
      title: "Airport Surface",
      syncGroup: null,
      referenceRole: "ground_reference",
      chartOverlay: createDefaultChartOverlayState("surface"),
      viewport: { center: [-93.221, 44.8837], zoom: 13, bearing: 0 },
      toggles: {
        labels: true,
        headingVectors: false,
        trails: false,
        runways: true,
        wind: false,
        surface: true
      }
    }
  ];

  const templates = DEFAULT_MESSAGE_TEMPLATES;
  const phrasePacks = DEFAULT_LINKED_PHRASE_PACKS;
  const airportPreferences = {
    selectedAirportIcao: DEFAULT_AIRPORT_ICAO,
    windPreferredRunwayId: null
  };
  const referenceShelf: PersistedWorkspaceState["referenceShelf"] = {
    activeDocumentId: "kmsp-airport-diagram-pdf",
    favoriteDocumentIds: [
      "kmsp-airport-diagram-pdf",
      "kmsp-tac-pdf"
    ],
    pinnedDocumentIds: ["kmsp-airport-diagram-pdf"],
    pinnedByRole: {
      ground_reference: "kmsp-airport-diagram-image",
      airspace_reference: "kmsp-tac-pdf",
      reading_reference: "kmsp-airport-diagram-pdf"
    },
    notesByDocumentId: {
      "kmsp-airport-diagram-pdf":
        "PDF airport diagram is now the default KMSP ground reference. Vector surface map remains the live traffic overlay.",
      "kmsp-tac-pdf": "Use for KMSP arrival/departure and terminal-area context."
    }
  };

  const defaultProfile = {
    id: "profile-default",
    name: "Default Console",
    layout,
    filters,
    mapPanels,
    referenceShelf,
    airportPreferences,
    templateIds: templates.map((template) => template.id),
    phrasePackIds: phrasePacks.map((pack) => pack.id)
  };

  return {
    schemaVersion: STORAGE_SCHEMA_VERSION,
    layout,
    filters,
    mapPanels,
    focusTargets: [],
    templates,
    phrasePacks,
    controllerProfiles: [defaultProfile],
    activeProfileId: defaultProfile.id,
    referenceShelf,
    airportPreferences,
    recentDestinations: [],
    settings: {
      chatSafeMax: DEFAULT_CHAT_SAFE_MAX,
      copyOnlyFallback: true,
      hideBlankCallsigns: true,
      hideFooCallsigns: true,
      hideNullAcid: false,
      discoveryEnabled: false
    }
  };
};
