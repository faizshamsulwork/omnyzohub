"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import { getDocumentTypeMeta } from "../../../lib/documents/types";
import type { DocumentType } from "../../../lib/types";
import CreatorBriefForm from "../../../components/documents/CreatorBriefForm";
import CreatorAgreementForm from "../../../components/documents/CreatorAgreementForm";
import ServiceAgreementForm from "../../../components/documents/ServiceAgreementForm";
import SubcontractorDisclosureForm from "../../../components/documents/SubcontractorDisclosureForm";
import SowForm from "../../../components/documents/SowForm";
import PerformanceReportForm from "../../../components/documents/PerformanceReportForm";
import NdaForm from "../../../components/documents/NdaForm";

export default function EditDocumentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [documentType, setDocumentType] = useState<DocumentType | null | "not-found">(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("documents")
      .select("document_type")
      .eq("id", id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        setDocumentType(error || !data ? "not-found" : (data.document_type as DocumentType));
      });
    return () => { cancelled = true; };
  }, [id]);

  if (documentType === null) {
    return <div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading document...</div>;
  }

  if (documentType === "not-found") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Document not found</h1>
        <Link href="/documents" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">&larr; Back to Documents</Link>
      </div>
    );
  }

  const meta = getDocumentTypeMeta(documentType);
  if (!meta?.built) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">Editing not available for this type yet</h1>
        <Link href={`/documents/${id}`} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">&larr; Back to document</Link>
      </div>
    );
  }

  switch (documentType) {
    case "creator_brief":
      return <CreatorBriefForm mode="edit" documentId={id} />;
    case "creator_agreement":
      return <CreatorAgreementForm mode="edit" documentId={id} />;
    case "service_agreement":
      return <ServiceAgreementForm mode="edit" documentId={id} />;
    case "subcontractor_disclosure":
      return <SubcontractorDisclosureForm mode="edit" documentId={id} />;
    case "sow":
      return <SowForm mode="edit" documentId={id} />;
    case "performance_report":
      return <PerformanceReportForm mode="edit" documentId={id} />;
    case "nda":
      return <NdaForm mode="edit" documentId={id} />;
    default:
      return null;
  }
}
