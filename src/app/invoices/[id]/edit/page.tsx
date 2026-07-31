"use client";

import { use } from "react";
import InvoiceForm from "../../../components/InvoiceForm";

export default function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);

  return <InvoiceForm mode="edit" invoiceId={resolvedParams.id} />;
}
