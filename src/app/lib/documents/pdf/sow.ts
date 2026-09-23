import { COMPANY_PROFILE } from "../../company";
import { PDF_COLORS, type PdfDocumentModel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatCurrency, formatDateOnly, toMoney, toNumber } from "../../utils";
import type { SowPayload } from "../types";

export function buildSowPdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as SowPayload;
  const lineItems = doc.line_items || [];
  const totalFee = lineItems.reduce((sum, item) => sum + toNumber(item.total), 0);

  const rosterText = payload.creator_roster
    .filter((entry) => entry.name.trim())
    .map((entry) => `- ${entry.name}${entry.role ? ` (${entry.role})` : ""}`)
    .join("\n");

  const deliverablesText = payload.deliverables
    .filter((deliverable) => deliverable.format.trim())
    .map((deliverable) => `- ${deliverable.format} (Qty: ${deliverable.quantity || "-"}${deliverable.due_date ? `, due ${formatDateOnly(deliverable.due_date)}` : ""})`)
    .join("\n");

  const targetsText = payload.performance_targets
    .filter((target) => target.metric.trim())
    .map((target) => `- ${target.metric}: ${target.target || "-"}`)
    .join("\n");

  return {
    filename: `${doc.doc_no}_Statement_of_Work.pdf`,
    title: "Statement of Work",
    accent: PDF_COLORS.black,
    meta: [
      { label: "SOW No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      ...(payload.campaign_name ? [{ label: "Campaign", value: payload.campaign_name }] : []),
      { label: "Status", value: (doc.status || "").toUpperCase() },
    ],
    party: {
      heading: "Client",
      name: doc.counterparty_name,
      lines: [
        ...(doc.counterparty_pic ? [{ text: `Attn: ${doc.counterparty_pic}`, strong: true }] : []),
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
    grandTotal: { label: "Total Campaign Fee", value: formatCurrency(totalFee) },
    panels: [
      {
        kind: "notes",
        blocks: [
          ...(payload.objectives ? [{ heading: "Objectives", body: payload.objectives }] : []),
          ...(rosterText ? [{ heading: "Creator Roster", body: rosterText }] : []),
          ...(deliverablesText ? [{ heading: "Deliverables", body: deliverablesText }] : []),
          ...(targetsText ? [{ heading: "Performance Targets", body: targetsText }] : []),
        ],
      },
      {
        kind: "acceptance",
        heading: "Client Acceptance",
        intro: "I/We approve this Statement of Work and the deliverables, fee, and performance targets described above.",
        fields: ["Signature", "Name", "Date"],
      },
    ],
    subject: `Statement of Work ${doc.doc_no} for ${doc.counterparty_name}`,
    keywords: [doc.doc_no, doc.counterparty_name, "statement of work"],
  };
}
