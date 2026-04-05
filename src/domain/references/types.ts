export type ReferenceDocumentType = "image" | "pdf" | "text";
export type ReferenceViewRole =
  | "ground_reference"
  | "airspace_reference"
  | "weather_reference"
  | "procedure_reference"
  | "reading_reference";

export type ReferenceSourceKind =
  | "bundled_asset"
  | "imported_file"
  | "remote_url"
  | "generated_reference";

export type ReferenceCategory =
  | "airport_diagram"
  | "tac"
  | "sectional"
  | "runway_map"
  | "metar_reference"
  | "atc_phraseology"
  | "regulation_reference"
  | "procedure_reference"
  | "miscellaneous";

export interface GeoreferenceControlPoint {
  id: string;
  label: string;
  imageX: number;
  imageY: number;
  latitude: number;
  longitude: number;
}

export interface GeoreferenceImageDimensions {
  width: number;
  height: number;
}

export interface GeoreferenceCornerQuad {
  topLeft: [number, number];
  topRight: [number, number];
  bottomRight: [number, number];
  bottomLeft: [number, number];
}

export interface GeoreferenceQuadTransform {
  kind: "corner_quad";
  imageDimensions: GeoreferenceImageDimensions;
  cornerQuad: GeoreferenceCornerQuad;
}

export interface GeoreferenceAffineTransform {
  kind: "affine_control_points";
  imageDimensions: GeoreferenceImageDimensions;
  controlPoints: GeoreferenceControlPoint[];
}

export type GeoreferenceTransform =
  | GeoreferenceQuadTransform
  | GeoreferenceAffineTransform;

export interface GeoreferenceMetadata {
  aligned: boolean;
  method: "manual" | "none" | "future";
  quality?: "approximate" | "tuned";
  notes?: string;
  transform?: GeoreferenceTransform | null;
  anchorPoints?: GeoreferenceControlPoint[];
}

export interface ReferenceDocument {
  id: string;
  title: string;
  type: ReferenceDocumentType;
  airportIcao: string | null;
  sourceKind: ReferenceSourceKind;
  sourcePath: string;
  effectiveDate?: string | null;
  expirationDate?: string | null;
  category: ReferenceCategory;
  parsedText?: string | null;
  georeference?: GeoreferenceMetadata | null;
  tags: string[];
  versionTag?: string | null;
}

export interface ReferenceShelfState {
  activeDocumentId: string | null;
  favoriteDocumentIds: string[];
  pinnedDocumentIds: string[];
  pinnedByRole: Partial<Record<ReferenceViewRole, string>>;
  notesByDocumentId: Record<string, string>;
}

export interface ReferenceSearchResult {
  documentId: string;
  title: string;
  category: ReferenceCategory;
  airportIcao: string | null;
  snippet: string;
  score: number;
  matchReason: string;
}

export interface ReferenceResolution {
  document: ReferenceDocument;
  score: number;
  reasons: string[];
}

export interface ReferenceSelectionContext {
  airportIcao: string;
  selectedAircraftGrounded: boolean;
  hasSelectedAircraft: boolean;
  focusModes: Array<"approach" | "tower" | "ground">;
  hasWeather: boolean;
  destinationIcao?: string | null;
  role: ReferenceViewRole;
}

export interface ReferenceTextCacheEntry {
  documentId: string;
  versionKey: string;
  extractedAt: number;
  ok: boolean;
  pageTexts: Array<{
    pageNumber: number;
    text: string;
  }>;
  error?: string;
}
