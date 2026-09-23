import { COMPANY_PROFILE } from "../../company";
import { PDF_COLORS, type PdfDocumentModel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatCurrency, formatDateOnly, toMoney, toNumber } from "../../utils";
import type { ServiceAgreementPayload } from "../types";

export function buildServiceAgreementPdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as ServiceAgreementPayload;
  const lineItems = doc.line_items || [];
  const totalFee = lineItems.reduce((sum, item) => sum + toNumber(item.total), 0);

  const scopeText = payload.scope_of_services.map((line) => `- ${line}`).join("\n");

  const termText = [
    `Start: ${formatDateOnly(payload.engagement_term_start) || "-"}`,
    `End: ${formatDateOnly(payload.engagement_term_end) || "-"}`,
    payload.renewal_clause ? `Renewal: ${payload.renewal_clause}` : null,
  ].filter(Boolean).join("\n");

  const closingText = [
    payload.termination_clause ? `Termination: ${payload.termination_clause}` : null,
    payload.confidentiality_clause_ref ? `Confidentiality: ${payload.confidentiality_clause_ref}` : null,
    payload.governing_law ? `Governing Law: ${payload.governing_law}` : null,
  ].filter(Boolean).join("\n");

  return {
    filename: `${doc.doc_no}_Service_Agreement.pdf`,
    title: "Service Agreement",
    accent: PDF_COLORS.black,
    meta: [
      { label: "Agreement No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      { label: "Term", value: `${formatDateOnly(payload.engagement_term_start) || "-"} – ${formatDateOnly(payload.engagement_term_end) || "-"}` },
      { label: "Status", value: (doc.status || "").toUpperCase() },
    ],
    party: {
      heading: "Client",
      name: doc.counterparty_name,
      lines: [
        ...(payload.client_reg_no ? [{ text: `Registration No: ${payload.client_reg_no}`, strong: true }] : []),
        ...(doc.counterparty_address ? [{ text: doc.counterparty_address }] : []),
        ...(doc.counterparty_pic ? [{ text: `Attn: ${doc.counterparty_pic}` }] : []),
        ...(doc.counterparty_email ? [{ text: doc.counterparty_email }] : []),
        ...(doc.counterparty_phone ? [{ text: doc.counterparty_phone }] : []),
      ],
    },
    columns: [
      { header: "Fee / Milestone", width: 70, align: "left" },
      { header: `Amount (${COMPANY_PROFILE.currencyCode})`, width: 30, align: "right" },
    ],
    rows: lineItems.map((item) => ({
      type: "item" as const,
      description: item.description,
      values: [toMoney(item.total)],
    })),
    grandTotal: { label: "Total Contract Value", value: formatCurrency(totalFee) },
    panels: [
      {
        kind: "notes",
        blocks: [
          ...(scopeText ? [{ heading: "Scope of Services", body: scopeText }] : []),
          ...(payload.fee_structure ? [{ heading: "Fee Structure", body: payload.fee_structure }] : []),
          { heading: "Engagement Term", body: termText },
          ...(closingText ? [{ heading: "Termination, Confidentiality & Law", body: closingText }] : []),
        ],
      },
      {
        kind: "acceptance",
        heading: "Client Acceptance",
        intro: "I/We agree to the terms, scope, and fees stated in this Service Agreement and authorize commencement of the engagement.",
        fields: ["Signature", "Name", "Date"],
      },
    ],
    subject: `Service Agreement ${doc.doc_no} for ${doc.counterparty_name}`,
    keywords: [doc.doc_no, doc.counterparty_name, "service agreement"],
  };
}
