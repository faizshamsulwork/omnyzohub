"use client";

import type { Contact } from "../../lib/types";
import { formatContactOptionLabel } from "../../lib/utils";

/**
 * Counterparty picker shared by every document form — same dropdown-plus-
 * autofill idea as InvoiceForm.tsx's client select, just filtered to one
 * contact_type and handed off as a plain callback instead of owning state.
 */
export default function ContactSelect({
  contacts,
  contactType,
  selectedContactId,
  onSelect,
  label,
}: {
  contacts: Contact[];
  contactType: "Customer" | "Freelancer";
  selectedContactId: string;
  onSelect: (contactId: string) => void;
  label?: string;
}) {
  const filtered = contacts.filter((contact) => contact.contact_type === contactType);

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-gray-500">
        {label || `Select ${contactType}`}
      </label>
      <select
        className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 p-4 text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-800 dark:bg-[#0A0A0A] dark:text-white"
        value={selectedContactId}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="">Manual / current details</option>
        {filtered.length === 0 && <option value="">No {contactType.toLowerCase()}s found.</option>}
        {filtered.map((contact) => (
          <option key={contact.id} value={contact.id}>
            {formatContactOptionLabel(contact)}
          </option>
        ))}
      </select>
    </div>
  );
}
