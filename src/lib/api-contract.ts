// Shared contract between frontend and backend.
// Frontend currently uses Zustand + localStorage.
// Backend (when ready) should return the same shapes.

export type {
  Alcohol,
  Dietary,
  GuestStatus,
  Approval,
  EventKind,
  ApprovalKey,
  Receipt,
  Interest,
  RunItem,
  BudgetLine,
  RotaSlot,
  Guest,
  Promo,
  Brief,
  CommunityEvent,
  Listing,
  Digest,
} from "./domain";

export {
  APPROVAL_KEYS,
  PIECE_MINUTES,
  DIGEST_MINUTES,
  LEAD_MINUTES,
  APPROVAL_LABEL,
} from "./domain";

// Future API endpoints (backend will implement these).
// Frontend can keep using the local store until they exist.

export interface CreatePackInput {
  idea: string;
  date: string;
  start: string;
  end: string;
  area: string;
  venue: string;
  capacity: number;
  budgetCap: number;
  alcohol: Alcohol;
}

export interface PackResponse {
  event: CommunityEvent;
}

export interface DigestResponse {
  digest: Digest;
}
