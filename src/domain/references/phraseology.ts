import { createId } from "../../shared/utils/id";
import type { MessageTemplate } from "../chat/types";

export const FAA_INSPIRED_TEMPLATE_PACK: MessageTemplate[] = [
  {
    id: createId("tpl"),
    packId: "ground-core",
    role: "ground",
    label: "Taxi",
    category: "taxi",
    compactBody: "{callsign} taxi rwy {runway} via alpha",
    referenceBody: "{callsign}, taxi to runway {runway} via alpha.",
    variables: ["callsign", "runway"],
    tags: ["ground", "taxi", "faa-inspired"],
    referenceDocumentIds: ["faa-surface-ops-reference", "faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "ground-core",
    role: "ground",
    label: "Hold Short",
    category: "hold_short",
    compactBody: "{callsign} hold short rwy {runway}",
    referenceBody: "{callsign}, hold short of runway {runway}.",
    variables: ["callsign", "runway"],
    tags: ["ground", "hold short"],
    referenceDocumentIds: ["faa-surface-ops-reference", "faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "tower-core",
    role: "tower",
    label: "Line Up",
    category: "line_up_and_wait",
    compactBody: "{callsign} line up and wait rwy {runway}",
    referenceBody: "{callsign}, runway {runway}, line up and wait.",
    variables: ["callsign", "runway"],
    tags: ["tower", "departure"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "tower-core",
    role: "tower",
    label: "Takeoff",
    category: "takeoff_clearance",
    compactBody: "{callsign} clr tkof rwy {runway} fly hdg {heading}",
    referenceBody: "{callsign}, runway {runway}, cleared for takeoff, fly heading {heading}.",
    variables: ["callsign", "runway", "heading"],
    tags: ["tower", "departure"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "tower-core",
    role: "tower",
    label: "Landing",
    category: "landing_clearance",
    compactBody: "{callsign} clr land rwy {runway}",
    referenceBody: "{callsign}, runway {runway}, cleared to land.",
    variables: ["callsign", "runway"],
    tags: ["tower", "arrival"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "tower-core",
    role: "tower",
    label: "Pattern",
    category: "pattern_entry",
    compactBody: "{callsign} enter left traffic rwy {runway}",
    referenceBody: "{callsign}, enter left traffic for runway {runway}.",
    variables: ["callsign", "runway"],
    tags: ["tower", "pattern"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "tower-core",
    role: "tower",
    label: "Go Around",
    category: "go_around",
    compactBody: "{callsign} go around fly hdg {heading}",
    referenceBody: "{callsign}, go around, fly heading {heading}.",
    variables: ["callsign", "heading"],
    tags: ["tower", "safety"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "approach-core",
    role: "approach",
    label: "Vector/Descend",
    category: "heading_altitude_instruction",
    compactBody: "{callsign} fly hdg {heading} descend {altitude}",
    referenceBody: "{callsign}, fly heading {heading}, descend and maintain {altitude}.",
    variables: ["callsign", "heading", "altitude"],
    tags: ["approach", "vector"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "tower-core",
    role: "general",
    label: "Emergency",
    category: "emergency_assistance",
    compactBody: "{callsign} roger say souls fuel and intentions",
    referenceBody: "{callsign}, roger, say souls on board, fuel remaining, and intentions.",
    variables: ["callsign"],
    tags: ["emergency"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "approach-core",
    role: "approach",
    label: "Monitor",
    category: "handoff_transition",
    compactBody: "{callsign} monitor tower report field in sight",
    referenceBody: "{callsign}, monitor tower and report the field in sight.",
    variables: ["callsign"],
    tags: ["transition", "handoff"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  },
  {
    id: createId("tpl"),
    packId: "approach-core",
    role: "approach",
    label: "Advisory",
    category: "general_advisory",
    compactBody: "{callsign} traffic {heading} at {altitude}",
    referenceBody: "{callsign}, traffic twelve o'clock, same altitude, advise in sight.",
    variables: ["callsign", "heading", "altitude"],
    tags: ["advisory", "traffic"],
    referenceDocumentIds: ["faa-atc-phraseology-reference"]
  }
];
