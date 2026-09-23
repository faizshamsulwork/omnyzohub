import { PDF_COLORS, type PdfDocumentModel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatDateOnly } from "../../utils";
import type { SubcontractorDisclosurePayload } from "../types";

export function buildSubcontractorDisclosurePdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as SubcontractorDisclosurePayload;

  const reference = [payload.agreement_reference, payload.clause_reference].filter(Boolean).join(", ");
  const signatoryLine = [payload.agency_signatory_name, payload.agency_signatory_title].filter(Boolean).join(" — ");

  return {
    filename: `${doc.doc_no}_Subcontractor_Disclosure.pdf`,
    title: "Sub-contractor Disclosure",
    accent: PDF_COLORS.black,
    meta: [
      { label: "Disclosure No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      ...(payload.campaign_name ? [{ label: "Campaign", value: payload.campaign_name }] : []),
      ...(reference ? [{ label: "Reference", value: reference }] : []),
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
      { header: "Sub-contractor Detail", width: 40, align: "left" },
      { header: "", width: 60, align: "left" },
    ],
    rows: [
      { type: "item" as const, description: "Registered Name", values: [payload.vendor_name || "-"] },
      ...(payload.vendor_trading_as ? [{ type: "item" as const, description: "Trading As", values: [payload.vendor_trading_as] }] : []),
      { type: "item" as const, description: "SSM Registration No.", values: [payload.vendor_registration_no || "-"] },
      ...(payload.vendor_registration_date
        ? [{ type: "item" as const, description: "Date of Registration", values: [formatDateOnly(payload.vendor_registration_date) || "-"] }]
        : []),
      ...(payload.vendor_registered_state ? [{ type: "item" as const, description: "Registered State", values: [payload.vendor_registered_state] }] : []),
    ],
    panels: [
      {
        kind: "notes",
        blocks: [
          ...(payload.scope_of_engagement ? [{ heading: "Scope of Engagement", body: payload.scope_of_engagement }] : []),
          ...(payload.liability_confirmation.length > 0
            ? [{ heading: "Relationship & Liability Confirmation", body: payload.liability_confirmation.map((line) => `- ${line}`).join("\n") }]
            : []),
          ...(signatoryLine ? [{ heading: "Approved for Omnyzo Agency", body: signatoryLine }] : []),
        ],
      },
      {
        kind: "acceptance",
        heading: "Client Acknowledgement",
        intro: "I/We acknowledge and accept the disclosure of the above sub-contractor's engagement as described in this form.",
        fields: ["Signature", "Name", "Date"],
      },
    ],
    subject: `Sub-contractor Disclosure ${doc.doc_no} for ${doc.counterparty_name}`,
    keywords: [doc.doc_no, doc.counterparty_name, "subcontractor disclosure"],
  };
}
