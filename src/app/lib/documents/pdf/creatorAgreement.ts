import { COMPANY_PROFILE } from "../../company";
import { PDF_COLORS, type PdfDocumentModel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatCurrency, formatDateOnly, toMoney, toNumber } from "../../utils";
import type { CreatorAgreementPayload } from "../types";

export function buildCreatorAgreementPdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as CreatorAgreementPayload;
  const lineItems = doc.line_items || [];
  const totalFee = lineItems.reduce((sum, item) => sum + toNumber(item.total), 0);

  const deliverablesText = payload.deliverables
    .filter((deliverable) => deliverable.format.trim())
    .map((deliverable) => `- ${deliverable.format} (Qty: ${deliverable.quantity || "-"}${deliverable.due_date ? `, due ${formatDateOnly(deliverable.due_date)}` : ""})`)
    .join("\n");

  const usageRightsText = [
    payload.usage_rights_scope ? `Scope: ${payload.usage_rights_scope}` : null,
    payload.usage_rights_duration ? `Duration: ${payload.usage_rights_duration}` : null,
    payload.exclusivity_clause ? `Exclusivity: ${payload.exclusivity_clause}` : null,
  ].filter(Boolean).join("\n");

  const closingText = [
    payload.termination_clause ? `Termination: ${payload.termination_clause}` : null,
    payload.governing_law ? `Governing Law: ${payload.governing_law}` : null,
  ].filter(Boolean).join("\n");

  return {
    filename: `${doc.doc_no}_Creator_Agreement.pdf`,
    title: "Creator Agreement",
    accent: PDF_COLORS.purple,
    meta: [
      { label: "Agreement No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      ...(payload.campaign_ref ? [{ label: "Campaign Ref", value: payload.campaign_ref }] : []),
      ...(doc.valid_until ? [{ label: "Term Ends", value: formatDateOnly(doc.valid_until) || "-" }] : []),
      { label: "Status", value: (doc.status || "").toUpperCase() },
    ],
    party: {
      heading: "Creator",
      name: doc.counterparty_name,
      lines: [
        ...(payload.creator_ic_or_reg_no ? [{ text: `IC/Reg No: ${payload.creator_ic_or_reg_no}`, strong: true }] : []),
        ...(doc.counterparty_address ? [{ text: doc.counterparty_address }] : []),
        ...(doc.counterparty_email ? [{ text: doc.counterparty_email }] : []),
        ...(doc.counterparty_phone ? [{ text: doc.counterparty_phone }] : []),
      ],
    },
    columns: [
      { header: "Fee Item", width: 70, align: "left" },
      { header: `Amount (${COMPANY_PROFILE.currencyCode})`, width: 30, align: "right" },
    ],
    rows: lineItems.map((item) => ({
      type: "item" as const,
      description: item.description,
      values: [toMoney(item.total)],
    })),
    grandTotal: { label: "Total Fee", value: formatCurrency(totalFee), color: PDF_COLORS.purple },
    panels: [
      {
        kind: "notes",
        blocks: [
          ...(deliverablesText ? [{ heading: "Deliverables", body: deliverablesText }] : []),
          ...(payload.payment_terms ? [{ heading: "Payment Terms", body: payload.payment_terms }] : []),
          ...(usageRightsText ? [{ heading: "Usage Rights", body: usageRightsText }] : []),
          ...(closingText ? [{ heading: "Termination & Governing Law", body: closingText }] : []),
        ],
      },
      {
        kind: "acceptance",
        heading: "Creator Acceptance",
        intro: "I/We agree to the deliverables, fee, and terms stated in this agreement.",
        fields: ["Signature", "Name", "Date"],
      },
    ],
    subject: `Creator Agreement ${doc.doc_no} for ${doc.counterparty_name}`,
    keywords: [doc.doc_no, doc.counterparty_name, "creator agreement"],
  };
}
