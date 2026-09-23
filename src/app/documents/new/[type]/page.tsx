import { Suspense } from "react";
import Link from "next/link";
import { getDocumentTypeMeta } from "../../../lib/documents/types";
import type { DocumentType } from "../../../lib/types";
import CreatorBriefForm from "../../../components/documents/CreatorBriefForm";
import CreatorAgreementForm from "../../../components/documents/CreatorAgreementForm";
import ServiceAgreementForm from "../../../components/documents/ServiceAgreementForm";
import SubcontractorDisclosureForm from "../../../components/documents/SubcontractorDisclosureForm";
import SowForm from "../../../components/documents/SowForm";
import PerformanceReportForm from "../../../components/documents/PerformanceReportForm";
import NdaForm from "../../../components/documents/NdaForm";

const FORM_BY_TYPE: Partial<Record<DocumentType, () => React.JSX.Element>> = {
  creator_brief: () => <CreatorBriefForm mode="create" />,
  creator_agreement: () => <CreatorAgreementForm mode="create" />,
  service_agreement: () => <ServiceAgreementForm mode="create" />,
  subcontractor_disclosure: () => <SubcontractorDisclosureForm mode="create" />,
  sow: () => <SowForm mode="create" />,
  performance_report: () => <PerformanceReportForm mode="create" />,
  nda: () => <NdaForm mode="create" />,
};

export default async function NewDocumentByTypePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const meta = getDocumentTypeMeta(type as DocumentType);
  const renderForm = meta?.built ? FORM_BY_TYPE[type as DocumentType] : undefined;

  if (!meta || !renderForm) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-6">
        <h1 className="text-2xl font-black text-gray-900 dark:text-white">
          {meta ? `${meta.label} is coming soon` : "Unknown document type"}
        </h1>
        <p className="text-gray-500 max-w-sm">
          {meta
            ? "This document type has its schema ready but the form hasn't been built yet."
            : "That document type doesn't exist."}
        </p>
        <Link href="/documents/new" className="text-blue-600 dark:text-blue-400 font-bold hover:underline">
          &larr; Back to document types
        </Link>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading editor...</div>}>
      {renderForm()}
    </Suspense>
  );
}
