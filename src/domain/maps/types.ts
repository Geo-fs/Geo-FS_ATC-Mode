import type { ReferenceViewRole } from "../references/types";

export type MapPanelKind = "traffic" | "runway" | "surface";

export interface MapLayerToggles {
  labels: boolean;
  headingVectors: boolean;
  trails: boolean;
  runways: boolean;
  wind: boolean;
  surface: boolean;
}

export interface MapViewportState {
  center: [number, number];
  zoom: number;
  bearing: number;
}

export interface MapChartOverlayState {
  enabled: boolean;
  opacity: number;
}

export interface MapPanelState {
  id: string;
  kind: MapPanelKind;
  title: string;
  syncGroup: string | null;
  referenceRole?: ReferenceViewRole | null;
  chartOverlay?: MapChartOverlayState;
  viewport: MapViewportState;
  toggles: MapLayerToggles;
}

export interface WorkspaceLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WorkspaceBreakpoint = "wide" | "standard" | "compact";

export interface WorkspacePreset {
  id: string;
  label: string;
  layout: WorkspaceLayoutItem[];
  responsiveLayouts?: Partial<Record<WorkspaceBreakpoint, WorkspaceLayoutItem[]>>;
}

export interface WorkspaceLayoutState {
  activePresetId: string;
  layouts: WorkspaceLayoutItem[];
  presets: WorkspacePreset[];
}

export interface FilterPreferences {
  callsignQuery: string;
  maxRangeNm: number;
  minAltitudeFeet: number;
  maxAltitudeFeet: number;
  groundedOnly: boolean;
  airborneOnly: boolean;
  focusedOnly: boolean;
  activeOnly: boolean;
}

export interface AirportPreferences {
  selectedAirportIcao: string;
  windPreferredRunwayId: string | null;
}
