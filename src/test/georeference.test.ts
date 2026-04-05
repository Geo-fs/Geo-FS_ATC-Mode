import { describe, expect, it } from "vitest";
import {
  getGeoreferenceSummary,
  hasRenderableGeoreference,
  resolveGeoreferenceQuad
} from "../domain/references/georeference";
import { BUNDLED_REFERENCE_DOCUMENTS } from "../domain/references/registry";
import {
  buildReferenceSelectionContext,
  selectBestRenderableOverlayDocument
} from "../domain/references/resolver";

describe("georeferenced chart overlays", () => {
  it("resolves a usable KMSP airport-diagram quad", () => {
    const document = BUNDLED_REFERENCE_DOCUMENTS.find(
      (entry) => entry.id === "kmsp-airport-diagram-image"
    );

    expect(document).toBeTruthy();
    expect(hasRenderableGeoreference(document!)).toBe(true);

    const quad = resolveGeoreferenceQuad(document!);
    expect(quad).toBeTruthy();
    expect(quad?.topLeft[0]).toBeLessThan(quad?.topRight[0] ?? 0);
    expect(quad?.topLeft[1]).toBeGreaterThan(quad?.bottomLeft[1] ?? 0);
  });

  it("selects the aligned KMSP diagram for ground overlay work", () => {
    const best = selectBestRenderableOverlayDocument(
      BUNDLED_REFERENCE_DOCUMENTS,
      buildReferenceSelectionContext({
        airportIcao: "KMSP",
        selectedAircraftGrounded: true,
        hasSelectedAircraft: true,
        focusModes: ["ground"],
        hasWeather: false,
        role: "ground_reference"
      })
    );

    expect(best?.id).toBe("kmsp-airport-diagram-image");
  });

  it("reports alignment quality for renderable chart overlays", () => {
    const document = BUNDLED_REFERENCE_DOCUMENTS.find(
      (entry) => entry.id === "kmsp-airport-diagram-image"
    );

    expect(getGeoreferenceSummary(document!)).toContain("approximate");
  });
});
