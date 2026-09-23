import { PDF_COLORS, type PdfDocumentModel, type PdfPanel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatDateOnly } from "../../utils";
import type { CreatorBriefPayload } from "../types";

/**
 * The shared PDF engine's drawPanels() lays every panel in `model.panels`
 * out in one fixed-width row (2-column width once there's more than one) —
 * it doesn't wrap to new rows, so every document builder here stays at a
 * maximum of 2 panels, mirroring quotation/invoice/voucher's own usage.
 */
export function buildCreatorBriefPdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as CreatorBriefPayload;

  const factsPanel: PdfPanel | null = (
    payload.platforms.length > 0
    || payload.usage_rights_scope
    || payload.usage_rights_duration
    || payload.exclusivity_period
    || payload.posting_window
    || payload.hashtags_mentions
  )
    ? {
        kind: "box",
        heading: "Platforms & Usage Rights",
        rows: [
          ...(payload.platforms.length > 0 ? [{ label: "Platforms", value: payload.platforms.join(", ") }] : []),
          ...(payload.usage_rights_scope ? [{ label: "Usage Scope", value: payload.usage_rights_scope }] : []),
          ...(payload.usage_rights_duration ? [{ label: "Usage Duration", value: payload.usage_rights_duration }] : []),
          ...(payload.exclusivity_period ? [{ label: "Exclusivity", value: payload.exclusivity_period }] : []),
          ...(payload.posting_window ? [{ label: "Posting Window", value: payload.posting_window }] : []),
          ...(payload.hashtags_mentions ? [{ label: "Hashtags/Mentions", value: payload.hashtags_mentions }] : []),
        ],
      }
    : null;

  const noteBlocks = [
    ...(payload.dos.length > 0 ? [{ heading: "Do's", body: payload.dos.map((line) => `- ${line}`).join("\n") }] : []),
    ...(payload.donts.length > 0 ? [{ heading: "Don'ts", body: payload.donts.map((line) => `- ${line}`).join("\n") }] : []),
    ...(payload.content_guidelines ? [{ heading: "Content Guidelines", body: payload.content_guidelines }] : []),
    ...(doc.notes ? [{ heading: "Notes", body: doc.notes }] : []),
    ...(doc.terms ? [{ heading: "Terms", body: doc.terms }] : []),
  ];
  const notesPanel: PdfPanel | null = noteBlocks.length > 0 ? { kind: "notes", blocks: noteBlocks } : null;

  return {
    filename: `${doc.doc_no}_Creator_Brief.pdf`,
    title: "Creator Brief",
    accent: PDF_COLORS.purple,
    meta: [
      { label: "Brief No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      { label: "Campaign", value: payload.campaign_name || "-" },
      ...(payload.submission_deadline
        ? [{ label: "Submission Deadline", value: formatDateOnly(payload.submission_deadline) || "-", color: PDF_COLORS.danger }]
        : []),
    ],
    party: {
      heading: "Creator",
      name: doc.counterparty_name,
      lines: [
        ...(doc.counterparty_pic ? [{ text: `Attn: ${doc.counterparty_pic}` }] : []),
        ...(doc.counterparty_email ? [{ text: doc.counterparty_email }] : []),
        ...(doc.counterparty_phone ? [{ text: doc.counterparty_phone }] : []),
        ...(payload.brand_client ? [{ text: `Brand/Client: ${payload.brand_client}`, strong: true }] : []),
        ...(payload.contact_for_queries ? [{ text: `Queries: ${payload.contact_for_queries}` }] : []),
      ],
    },
    columns: [
      { header: "Deliverable", width: 55, align: "left" },
      { header: "Qty", width: 15, align: "center" },
      { header: "Due Date", width: 30, align: "right" },
    ],
    rows: payload.deliverables
      .filter((deliverable) => deliverable.format.trim())
      .map((deliverable) => ({
        type: "item" as const,
        description: deliverable.format,
        values: [deliverable.quantity || "-", deliverable.due_date ? formatDateOnly(deliverable.due_date) || "-" : "-"],
      })),
    panels: [factsPanel, notesPanel],
    subject: `Creator Brief ${doc.doc_no}`,
    keywords: ["creator brief", payload.campaign_name].filter(Boolean),
  };
}
