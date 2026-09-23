import type { DocumentType } from "../types";

/**
 * Registry of every document type the generator knows about. `built`
 * gates whether a type has a real form + PDF builder — the "New Document"
 * picker in /documents/new shows any type with `built: false` as a
 * disabled "Coming soon" entry instead of a half-working form.
 */
export interface DocumentTypeMeta {
  type: DocumentType;
  label: string;
  shortLabel: string;
  /** doc_no prefix code, e.g. "20260912-CB01". */
  prefixCode: string;
  description: string;
  built: boolean;
  /** Hints which contacts list (Customer vs Freelancer) the counterparty picker should default to. */
  counterpartyContactType: "Customer" | "Freelancer";
}

export const DOCUMENT_TYPES: DocumentTypeMeta[] = [
  {
    type: "creator_brief",
    label: "Creator / Influencer Brief",
    shortLabel: "Brief",
    prefixCode: "CB",
    description: "Campaign brief sent to a creator — deliverables, platform, do's/don'ts, deadlines, usage rights.",
    built: true,
    counterpartyContactType: "Freelancer",
  },
  {
    type: "creator_agreement",
    label: "Creator Agreement / Contract",
    shortLabel: "Creator Agreement",
    prefixCode: "CA",
    description: "Simple agreement between Omnyzo and an individual creator — fee, deliverables, usage rights, payment terms.",
    built: true,
    counterpartyContactType: "Freelancer",
  },
  {
    type: "service_agreement",
    label: "Service Agreement / Commercial Term Sheet",
    shortLabel: "Service Agreement",
    prefixCode: "SA",
    description: "Client-facing contract — company details, term, scope, fees, milestones.",
    built: true,
    counterpartyContactType: "Customer",
  },
  {
    type: "sow",
    label: "Statement of Work (SOW)",
    shortLabel: "SOW",
    prefixCode: "SOW",
    description: "Campaign-specific deliverables, creator list, fee breakdown, performance targets.",
    built: true,
    counterpartyContactType: "Customer",
  },
  {
    type: "subcontractor_disclosure",
    label: "Sub-contractor Disclosure Form",
    shortLabel: "Disclosure Form",
    prefixCode: "SCD",
    description: "Declares a vendor/sub-contractor to a client — name, registration, scope, liability confirmation, signature block.",
    built: true,
    counterpartyContactType: "Customer",
  },
  {
    type: "performance_report",
    label: "Performance Report",
    shortLabel: "Performance Report",
    prefixCode: "PR",
    description: "Campaign wrap-up report — reach, engagement, deliverables completed, learnings.",
    built: true,
    counterpartyContactType: "Customer",
  },
  {
    type: "nda",
    label: "Non-Disclosure Agreement (NDA)",
    shortLabel: "NDA",
    prefixCode: "NDA",
    description: "New client/vendor onboarding confidentiality agreement.",
    built: true,
    // The NDA form lets the user toggle Client/Vendor itself (onboarding covers both) — this default just seeds the initial contact list.
    counterpartyContactType: "Customer",
  },
];

export function getDocumentTypeMeta(type: DocumentType) {
  return DOCUMENT_TYPES.find((meta) => meta.type === type);
}

// ---------------------------------------------------------------------------
// Payload shapes. Every field here lives inside documents.payload (jsonb).
// ---------------------------------------------------------------------------

export interface DeliverableItem {
  format: string;
  quantity: string;
  due_date: string;
}

/** Built this pass. */
export interface CreatorBriefPayload {
  campaign_name: string;
  brand_client: string;
  platforms: string[];
  deliverables: DeliverableItem[];
  dos: string[];
  donts: string[];
  content_guidelines: string;
  hashtags_mentions: string;
  usage_rights_scope: string;
  usage_rights_duration: string;
  exclusivity_period: string;
  submission_deadline: string;
  posting_window: string;
  contact_for_queries: string;
}

/** Built this pass. */
export interface CreatorAgreementPayload {
  creator_legal_name: string;
  creator_ic_or_reg_no: string;
  campaign_ref: string;
  deliverables: DeliverableItem[];
  payment_terms: string;
  usage_rights_scope: string;
  usage_rights_duration: string;
  exclusivity_clause: string;
  termination_clause: string;
  governing_law: string;
}

/** Built this pass. */
export interface ServiceAgreementPayload {
  client_legal_name: string;
  client_reg_no: string;
  engagement_term_start: string;
  engagement_term_end: string;
  scope_of_services: string[];
  fee_structure: string;
  renewal_clause: string;
  termination_clause: string;
  confidentiality_clause_ref: string;
  governing_law: string;
}

/** Built this pass. Fee breakdown lives in documents.line_items, not here. */
export interface SowPayload {
  campaign_name: string;
  objectives: string;
  creator_roster: { name: string; role: string }[];
  deliverables: DeliverableItem[];
  performance_targets: { metric: string; target: string }[];
}

/** Built this pass. */
export interface SubcontractorDisclosurePayload {
  campaign_name: string;
  agreement_reference: string;
  clause_reference: string;
  client_reg_no: string;
  vendor_name: string;
  vendor_trading_as: string;
  vendor_registration_no: string;
  vendor_registration_date: string;
  vendor_registered_state: string;
  scope_of_engagement: string;
  liability_confirmation: string[];
  agency_signatory_name: string;
  agency_signatory_title: string;
}

/** Built this pass. */
export interface PerformanceReportPayload {
  campaign_name: string;
  reporting_period: string;
  reach: string;
  impressions: string;
  engagement_rate: string;
  deliverables_completed: string[];
  learnings: string;
}

/** Built this pass. */
export interface NdaPayload {
  disclosing_party: string;
  receiving_party: string;
  mutual: boolean;
  purpose: string;
  confidential_info_definition: string;
  term_years: string;
  governing_law: string;
}

export type DocumentPayloadFor<T extends DocumentType> = T extends "creator_brief"
  ? CreatorBriefPayload
  : T extends "creator_agreement"
    ? CreatorAgreementPayload
    : T extends "service_agreement"
      ? ServiceAgreementPayload
      : T extends "sow"
        ? SowPayload
        : T extends "subcontractor_disclosure"
          ? SubcontractorDisclosurePayload
          : T extends "performance_report"
            ? PerformanceReportPayload
            : T extends "nda"
              ? NdaPayload
              : never;
