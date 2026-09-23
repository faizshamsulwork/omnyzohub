import { PDF_COLORS, type PdfDocumentModel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatDateOnly } from "../../utils";
import type { NdaPayload } from "../types";

export function buildNdaPdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as NdaPayload;

  return {
    filename: `${doc.doc_no}_NDA.pdf`,
    title: "Non-Disclosure Agreement",
    accent: PDF_COLORS.black,
    meta: [
      { label: "NDA No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      { label: "Type", value: payload.mutual ? "Mutual" : "One-way" },
      { label: "Status", value: (doc.status || "").toUpperCase() },
    ],
    party: {
      heading: "Counterparty",
      name: doc.counterparty_name,
      lines: [
        ...(doc.counterparty_pic ? [{ text: `Attn: ${doc.counterparty_pic}`, strong: true }] : []),
        ...(doc.counterparty_address ? [{ text: doc.counterparty_address }] : []),
        ...(doc.counterparty_email ? [{ text: doc.counterparty_email }] : []),
        ...(doc.counterparty_phone ? [{ text: doc.counterparty_phone }] : []),
      ],
    },
    columns: [
      { header: "NDA Term", width: 40, align: "left" },
      { header: "Detail", width: 60, align: "left" },
    ],
    rows: [
      { type: "item" as const, description: "Disclosing Party", values: [payload.disclosing_party || "-"] },
      { type: "item" as const, description: "Receiving Party", values: [payload.receiving_party || doc.counterparty_name] },
      { type: "item" as const, description: "Term", values: [payload.term_years ? `${payload.term_years} year(s)` : "-"] },
      { type: "item" as const, description: "Governing Law", values: [payload.governing_law || "-"] },
    ],
    panels: [
      payload.purpose || payload.confidential_info_definition
        ? {
            kind: "notes",
            blocks: [
              ...(payload.purpose ? [{ heading: "Purpose of Disclosure", body: payload.purpose }] : []),
              ...(payload.confidential_info_definition ? [{ heading: "Confidential Information", body: payload.confidential_info_definition }] : []),
            ],
          }
        : null,
      {
        kind: "acceptance",
        heading: "Acknowledgement & Agreement",
        intro: "I/We agree to keep the information disclosed under this Agreement confidential in accordance with the terms above.",
        fields: ["Signature", "Name", "Date"],
      },
    ],
    subject: `Non-Disclosure Agreement ${doc.doc_no} for ${doc.counterparty_name}`,
    keywords: [doc.doc_no, doc.counterparty_name, "nda", "non-disclosure agreement"],
  };
}
