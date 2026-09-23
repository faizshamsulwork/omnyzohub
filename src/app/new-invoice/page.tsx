import { Suspense } from "react";
import InvoiceForm from "../components/InvoiceForm";

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-bold animate-pulse text-gray-500">Loading invoice editor...</div>}>
      <InvoiceForm mode="create" />
    </Suspense>
  );
}
