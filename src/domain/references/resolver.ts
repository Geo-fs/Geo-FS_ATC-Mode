import type {
  ReferenceDocument,
  ReferenceResolution,
  ReferenceSelectionContext,
  ReferenceViewRole
} from "./types";
import { hasRenderableGeoreference } from "./georeference";

const categoryPreferenceByRole: Record<ReferenceViewRole, string[]> = {
  ground_reference: ["airport_diagram", "procedure_reference", "atc_phraseology"],
  airspace_reference: ["tac", "sectional", "procedure_reference", "atc_phraseology"],
  weather_reference: ["runway_map", "metar_reference", "procedure_reference", "tac"],
  procedure_reference: ["procedure_reference", "atc_phraseology", "airport_diagram"],
  reading_reference: ["tac", "sectional", "procedure_reference", "atc_phraseology", "airport_diagram"]
};

const typePreferenceByRole: Record<ReferenceViewRole, Array<ReferenceDocument["type"]>> = {
  ground_reference: ["image", "pdf", "text"],
  airspace_reference: ["pdf", "image", "text"],
  weather_reference: ["text", "pdf", "image"],
  procedure_reference: ["text", "pdf", "image"],
  reading_reference: ["pdf", "text", "image"]
};

const scoreTypePreference = (
  role: ReferenceViewRole,
  documentType: ReferenceDocument["type"]
): number => {
  const index = typePreferenceByRole[role].indexOf(documentType);
  return index >= 0 ? 4 - index : 0;
};

const scoreCategoryPreference = (
  role: ReferenceViewRole,
  category: ReferenceDocument["category"]
): number => {
  const index = categoryPreferenceByRole[role].indexOf(category);
  return index >= 0 ? 8 - index : 0;
};

export const buildReferenceSelectionContext = (params: {
  airportIcao: string;
  selectedAircraftGrounded: boolean;
  hasSelectedAircraft: boolean;
  focusModes: Array<"approach" | "tower" | "ground">;
  hasWeather: boolean;
  destinationIcao?: string | null;
  role: ReferenceViewRole;
}): ReferenceSelectionContext => params;

export const rankReferenceDocuments = (
  documents: ReferenceDocument[],
  context: ReferenceSelectionContext
): ReferenceResolution[] =>
  documents
    .filter(
      (document) => document.airportIcao == null || document.airportIcao === context.airportIcao
    )
    .map((document) => {
      let score = 0;
      const reasons: string[] = [];

      if (document.airportIcao === context.airportIcao) {
        score += 5;
        reasons.push(`matches ${context.airportIcao}`);
      }

      const categoryScore = scoreCategoryPreference(context.role, document.category);
      score += categoryScore;
      if (categoryScore > 0) {
        reasons.push(`${document.category.replaceAll("_", " ")} fits ${context.role.replaceAll("_", " ")}`);
      }

      const typeScore = scoreTypePreference(context.role, document.type);
      score += typeScore;
      if (typeScore > 0) {
        reasons.push(`${document.type.toUpperCase()} suits this role`);
      }

      if (context.selectedAircraftGrounded && document.category === "airport_diagram") {
        score += 7;
        reasons.push("grounded aircraft favors airport diagram");
      }

      if (context.hasSelectedAircraft && !context.selectedAircraftGrounded && document.category === "tac") {
        score += 5;
        reasons.push("airborne aircraft favors TAC context");
      }

      if (context.destinationIcao && context.role === "airspace_reference" && ["tac", "sectional"].includes(document.category)) {
        score += 3;
        reasons.push(`destination ${context.destinationIcao} makes enroute/airspace context more useful`);
      }

      if (context.focusModes.includes("ground") && document.category === "airport_diagram") {
        score += 6;
        reasons.push("ground focus raises diagram priority");
      }

      if (context.focusModes.includes("approach") && ["tac", "sectional"].includes(document.category)) {
        score += 6;
        reasons.push("approach focus raises airspace charts");
      }

      if (context.focusModes.includes("tower") && ["airport_diagram", "tac"].includes(document.category)) {
        score += 4;
        reasons.push("tower focus favors airport/terminal references");
      }

      if (context.hasWeather && ["runway_map", "procedure_reference", "metar_reference"].includes(document.category)) {
        score += 4;
        reasons.push("weather context boosts runway/procedure references");
      }

      if (document.type === "pdf" && context.role === "reading_reference" && document.parsedText) {
        score += 4;
        reasons.push("searchable PDF preferred for reading/search");
      }

      if (document.type === "image" && context.role === "ground_reference") {
        score += 2;
        reasons.push("image clarity helps surface work");
      }

      if (hasRenderableGeoreference(document) && context.role === "ground_reference") {
        score += 5;
        reasons.push("aligned image overlay is usable in the surface map");
      }

      if (document.expirationDate) {
        reasons.push(`expires ${document.expirationDate}`);
      }

      return { document, score, reasons };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

export const selectBestReferenceDocument = (
  documents: ReferenceDocument[],
  context: ReferenceSelectionContext,
  pinnedByRole?: Partial<Record<ReferenceViewRole, string>>
): ReferenceDocument | null => {
  const pinnedId = pinnedByRole?.[context.role];
  if (pinnedId) {
    const pinned = documents.find((document) => document.id === pinnedId);
    if (pinned) {
      return pinned;
    }
  }

  return rankReferenceDocuments(documents, context)[0]?.document ?? null;
};

export const resolveReferenceForContext = (
  documents: ReferenceDocument[],
  context: ReferenceSelectionContext,
  pinnedByRole?: Partial<Record<ReferenceViewRole, string>>
): ReferenceResolution | null => {
  const pinnedId = pinnedByRole?.[context.role];
  if (pinnedId) {
    const pinned = documents.find((document) => document.id === pinnedId);
    if (pinned) {
      return {
        document: pinned,
        score: Number.POSITIVE_INFINITY,
        reasons: [`pinned to ${context.role.replaceAll("_", " ")}`]
      };
    }
  }

  return rankReferenceDocuments(documents, context)[0] ?? null;
};

export const selectBestRenderableOverlayDocument = (
  documents: ReferenceDocument[],
  context: ReferenceSelectionContext,
  pinnedByRole?: Partial<Record<ReferenceViewRole, string>>
): ReferenceDocument | null => {
  const resolutions = rankReferenceDocuments(documents, context);
  const pinnedId = pinnedByRole?.[context.role];

  if (pinnedId) {
    const pinned = documents.find(
      (document) => document.id === pinnedId && hasRenderableGeoreference(document)
    );
    if (pinned) {
      return pinned;
    }
  }

  return resolutions.find((entry) => hasRenderableGeoreference(entry.document))?.document ?? null;
};
