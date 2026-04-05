import { describe, expect, it } from "vitest";
import { DEFAULT_MESSAGE_TEMPLATES, renderTemplate } from "../domain/chat/templates";

describe("phraseology templates", () => {
  it("keeps compact and reference variants separate", () => {
    const template = DEFAULT_MESSAGE_TEMPLATES.find((entry) => entry.label === "Takeoff");
    expect(template).toBeTruthy();

    const compact = renderTemplate(
      template!,
      { callsign: "DAL123", runway: "12R", heading: "120", altitude: "3000", destination: "" },
      85,
      "compact"
    );
    const reference = renderTemplate(
      template!,
      { callsign: "DAL123", runway: "12R", heading: "120", altitude: "3000", destination: "" },
      200,
      "reference"
    );

    expect(compact.value.length).toBeLessThan(reference.value.length);
    expect(reference.value).toContain("cleared for takeoff");
  });
});
