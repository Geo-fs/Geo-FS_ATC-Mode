export interface ChatMessage {
  id: string;
  direction: "inbound" | "outbound" | "system";
  timestamp: number;
  senderUserId?: string | null;
  senderAircraftId?: string | null;
  callsign: string;
  message: string;
  roomScope?: string | null;
  targetCallsign?: string | null;
  deliveryState?: "queued" | "sent" | "failed" | "echoed";
}

export interface MessageTemplate {
  id: string;
  packId?: string | null;
  role?: "approach" | "tower" | "ground" | "general";
  label: string;
  category:
    | "taxi"
    | "hold_short"
    | "line_up_and_wait"
    | "takeoff_clearance"
    | "pattern_entry"
    | "landing_clearance"
    | "go_around"
    | "heading_altitude_instruction"
    | "emergency_assistance"
    | "handoff_transition"
    | "general_advisory";
  compactBody: string;
  referenceBody: string;
  variables: Array<"callsign" | "runway" | "altitude" | "heading" | "destination">;
  tags: string[];
  referenceDocumentIds: string[];
}

export interface PhrasePack {
  id: string;
  label: string;
  role: "approach" | "tower" | "ground" | "general";
  templateIds: string[];
}

export interface ClearanceDraft {
  role: "approach" | "tower" | "ground";
  templateCategory: MessageTemplate["category"];
  callsign: string;
  runway: string;
  altitude: string;
  heading: string;
  destination: string;
  holdShortRunway: string;
}

export interface RenderedTemplate {
  value: string;
  fitsLimit: boolean;
  remaining: number;
}
