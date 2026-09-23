import { PDF_COLORS, type PdfDocumentModel } from "../../pdf";
import type { AgencyDocument } from "../../types";
import { formatDateOnly } from "../../utils";
import type { PerformanceReportPayload } from "../types";

export function buildPerformanceReportPdf(doc: AgencyDocument): PdfDocumentModel {
  const payload = doc.payload as unknown as PerformanceReportPayload;

  const deliverablesText = payload.deliverables_completed.map((line) => `- ${line}`).join("\n");

  return {
    filename: `${doc.doc_no}_Performance_Report.pdf`,
    title: "Performance Report",
    accent: PDF_COLORS.success,
    meta: [
      { label: "Report No", value: doc.doc_no },
      { label: "Date", value: formatDateOnly(doc.issue_date) || "-" },
      ...(payload.campaign_name ? [{ label: "Campaign", value: payload.campaign_name }] : []),
      ...(payload.reporting_period ? [{ label: "Period", value: payload.reporting_period }] : []),
    ],
    party: {
      heading: "Prepared For",
      name: doc.counterparty_name,
      lines: [
        ...(doc.counterparty_pic ? [{ text: `Attn: ${doc.counterparty_pic}`, strong: true }] : []),
        ...(doc.counterparty_address ? [{ text: doc.counterparty_address }] : []),
        ...(doc.counterparty_email ? [{ text: doc.counterparty_email }] : []),
        ...(doc.counterparty_phone ? [{ text: doc.counterparty_phone }] : []),
      ],
    },
    columns: [
      { header: "Metric", width: 55, align: "left" },
      { header: "Result", width: 45, align: "right" },
    ],
    rows: [
      ...(payload.reach ? [{ type: "item" as const, description: "Reach", values: [payload.reach] }] : []),
      ...(payload.impressions ? [{ type: "item" as const, description: "Impressions", values: [payload.impressions] }] : []),
      ...(payload.engagement_rate ? [{ type: "item" as const, description: "Engagement Rate", values: [payload.engagement_rate] }] : []),
    ],
    panels: [
      deliverablesText || payload.learnings
        ? {
            kind: "notes",
            blocks: [
              ...(deliverablesText ? [{ heading: "Deliverables Completed", body: deliverablesText }] : []),
              ...(payload.learnings ? [{ heading: "Learnings & Recommendations", body: payload.learnings }] : []),
            ],
          }
        : null,
    ],
    subject: `Performance Report ${doc.doc_no} for ${doc.counterparty_name}`,
    keywords: [doc.doc_no, doc.counterparty_name, "performance report"],
  };
}
