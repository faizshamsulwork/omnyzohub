"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import PrintButton from "../../components/PrintButton";
import { getDocumentTypeMeta } from "../../lib/documents/types";
import { buildCreatorBriefPdf } from "../../lib/documents/pdf/creatorBrief";
import { buildCreatorAgreementPdf } from "../../lib/documents/pdf/creatorAgreement";
import { buildServiceAgreementPdf } from "../../lib/documents/pdf/serviceAgreement";
import { buildSubcontractorDisclosurePdf } from "../../lib/documents/pdf/subcontractorDisclosure";
import { buildSowPdf } from "../../lib/documents/pdf/sow";
import { buildPerformanceReportPdf } from "../../lib/documents/pdf/performanceReport";
import { buildNdaPdf } from "../../lib/documents/pdf/nda";
import type { AgencyDocument, DocumentType } from "../../lib/types";
import { formatCurrency, formatDateOnly } from "../../lib/utils";
import type { PdfDocumentModel } from "../../lib/pdf";

const PDF_BUILDERS: Partial<Record<DocumentType, (doc: AgencyDocument) => PdfDocumentModel>> = {
  creator_brief: buildCreatorBriefPdf,
  creator_agreement: buildCreatorAgreementPdf,
  service_agreement: buildServiceAgreementPdf,
  subcontractor_disclosure: buildSubcontractorDisclosurePdf,
  sow: buildSowPdf,
  performance_report: buildPerformanceReportPdf,
  nda: buildNdaPdf,
};

const humaniseKey = (key: string) => key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const renderPayloadValue = (value: unknown): string => {
  if (value === null || value === undefined || value === "") return "-";
  if (Array.isArray(value)) {
    if (value.length === 0) return "-";
    if (typeof value[0] === "object") {
      // Postgres jsonb does not preserve object key insertion order, so
      // Object.values() here can silently print fields in the wrong order.
      // Label every field by name instead — order-independent by design.
      return value
        .map((entry) =>
          Object.entries(entry as Record<string, unknown>)
            .filter(([, fieldValue]) => fieldValue !== "" && fieldValue !== null && fieldValue !== undefined)
            .map(([fieldKey, fieldValue]) => `${humaniseKey(fieldKey)}: ${fieldValue}`)
            .join(", "),
        )
        .join("; ");
    }
    return value.join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

export default function DocumentViewerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<AgencyDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) console.error("Error fetching document:", error);
        setDoc((data as AgencyDocument) || null);
        setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading document...</div>;
  if (!doc) return <div className="min-h-screen flex items-center justify-center text-red-500 font-bold text-xl">Document not found.</div>;

  const meta = getDocumentTypeMeta(doc.document_type);
  const buildPdf = PDF_BUILDERS[doc.document_type];
  const payloadEntries = Object.entries(doc.payload || {}).filter(([, value]) => renderPayloadValue(value) !== "-");

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0A0A0A] py-8 px-2 md:px-8 pb-32 transition-colors duration-300">
      <div className="max-w-4xl mx-auto mb-6 flex justify-between items-center print:hidden">
        <Link href="/documents" className="text-gray-500 hover:text-black dark:hover:text-white flex items-center gap-2 font-bold text-sm transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Back
        </Link>
        <div className="flex items-center gap-3">
          {meta?.built && (
            <Link
              href={`/documents/${doc.id}/edit`}
              className="px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 dark:bg-[#111111] dark:text-gray-300 dark:border-gray-800 dark:hover:bg-gray-900"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 14v4.75A2.25 2.25 0 0115.75 21h-10.5A2.25 2.25 0 013 18.75v-10.5A2.25 2.25 0 015.25 6H10" /></svg>
              Edit
            </Link>
          )}
          {buildPdf && <PrintButton documentName={`${meta?.label || doc.document_type} ${doc.doc_no}`} buildDocument={() => buildPdf(doc)} />}
        </div>
      </div>

      <div className="max-w-4xl mx-auto bg-white dark:bg-[#111111] rounded-[32px] border border-gray-200 dark:border-gray-800 shadow-xl p-8 md:p-12">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-8 mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-1">{meta?.label || doc.document_type}</p>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">{doc.doc_no}</h1>
            {doc.title && <p className="text-gray-500 mt-1">{doc.title}</p>}
          </div>
          <div className="text-right">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400">
              {doc.status}
            </span>
            <p className="text-sm text-gray-500 mt-2">{formatDateOnly(doc.issue_date)}</p>
            {doc.valid_until && <p className="text-xs text-gray-400">Valid until {formatDateOnly(doc.valid_until)}</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Counterparty</p>
            <p className="font-bold text-gray-900 dark:text-white">{doc.counterparty_name}</p>
            {doc.counterparty_pic && <p className="text-sm text-gray-500">Attn: {doc.counterparty_pic}</p>}
            {doc.counterparty_email && <p className="text-sm text-gray-500">{doc.counterparty_email}</p>}
            {doc.counterparty_phone && <p className="text-sm text-gray-500">{doc.counterparty_phone}</p>}
            {doc.counterparty_address && <p className="text-sm text-gray-500 whitespace-pre-line">{doc.counterparty_address}</p>}
          </div>

          {doc.line_items && doc.line_items.length > 0 && (
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Fee Breakdown</p>
              <div className="space-y-1">
                {doc.line_items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{item.description}</span>
                    <span className="font-bold text-gray-900 dark:text-white">{formatCurrency(item.total)}</span>
                  </div>
                ))}
                <div className="flex justify-between text-sm pt-2 border-t border-gray-200 dark:border-gray-800 font-black">
                  <span>Total</span>
                  <span>{formatCurrency(doc.line_items.reduce((sum, item) => sum + Number(item.total || 0), 0))}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {payloadEntries.length > 0 && (
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Details</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {payloadEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4 text-sm border-b border-gray-100 dark:border-gray-800/60 pb-2">
                  <span className="text-gray-500">{humaniseKey(key)}</span>
                  <span className="text-right font-medium text-gray-900 dark:text-white">{renderPayloadValue(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {doc.notes && (
          <div className="mb-6">
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Notes</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{doc.notes}</p>
          </div>
        )}
        {doc.terms && (
          <div>
            <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Terms</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-line">{doc.terms}</p>
          </div>
        )}
      </div>
    </div>
  );
}
