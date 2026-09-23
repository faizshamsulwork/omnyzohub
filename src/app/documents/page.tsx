"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../lib/supabase";
import DocumentAction from "../components/DocumentAction";
import { DOCUMENT_TYPES, getDocumentTypeMeta } from "../lib/documents/types";
import type { AgencyDocument, DocumentType } from "../lib/types";
import {
  formatDateOnly,
  formatMonthLabel,
  getCurrentMonthKeyInMalaysia,
  getMonthKey,
  getPreviousMonthKey,
  sortMonthKeysDescending,
} from "../lib/utils";

type MonthFilter = "current" | "previous" | "all" | "custom";
type TypeFilter = "all" | DocumentType;

const statusBadgeClass = (status: string) => {
  const normalised = (status || "").toLowerCase();
  if (["accepted", "signed", "completed"].includes(normalised)) {
    return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
  }
  if (["expired", "void", "rejected"].includes(normalised)) {
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }
  if (["sent"].includes(normalised)) {
    return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
  }
  return "bg-gray-100 text-gray-600 dark:bg-gray-800/60 dark:text-gray-400";
};

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<AgencyDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [monthFilter, setMonthFilter] = useState<MonthFilter>("all");
  const [customMonth, setCustomMonth] = useState(getCurrentMonthKeyInMalaysia());

  const fetchDocuments = useCallback(async (showLoader = true) => {
    if (showLoader) setIsLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching documents:", error);
    if (data) setDocuments(data as AgencyDocument[]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDocuments(false);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [fetchDocuments]);

  const currentMonthKey = getCurrentMonthKeyInMalaysia();
  const previousMonthKey = getPreviousMonthKey(currentMonthKey);
  const activeMonthKey = monthFilter === "current"
    ? currentMonthKey
    : monthFilter === "previous"
      ? previousMonthKey
      : monthFilter === "custom"
        ? customMonth
        : null;

  const filteredDocuments = documents.filter((doc) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query
      || doc.counterparty_name?.toLowerCase().includes(query)
      || doc.doc_no?.toLowerCase().includes(query)
      || doc.title?.toLowerCase().includes(query);
    const matchesType = typeFilter === "all" || doc.document_type === typeFilter;
    const matchesMonth = !activeMonthKey || getMonthKey(doc.created_at) === activeMonthKey;

    return matchesSearch && matchesType && matchesMonth;
  });

  const documentGroups = filteredDocuments.reduce<Record<string, AgencyDocument[]>>((groups, doc) => {
    const monthKey = getMonthKey(doc.created_at);
    groups[monthKey] = [...(groups[monthKey] || []), doc];
    return groups;
  }, {});
  const documentMonthKeys = Object.keys(documentGroups).sort(sortMonthKeysDescending);
  const selectedPeriodLabel = activeMonthKey ? formatMonthLabel(activeMonthKey) : "All Months";

  return (
    <div className="min-h-screen p-6 md:p-12 relative transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">

        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Documents</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base font-medium">Agreements, briefs, SOWs, reports &mdash; every agency document in one place.</p>
          </div>

          <Link
            href="/documents/new"
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
            New Document
          </Link>
        </header>

        <div className="mb-8 flex flex-col lg:flex-row gap-4 lg:items-center justify-between">
          <div className="relative w-full lg:max-w-md">
            <div className="absolute inset-y-0 left-0 z-10 pl-4 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </div>
            <input
              type="text"
              placeholder="Search by counterparty, doc no, or title..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm transition-all"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <select
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as TypeFilter)}
              className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {DOCUMENT_TYPES.map((meta) => (
                <option key={meta.type} value={meta.type}>{meta.shortLabel}</option>
              ))}
            </select>
            <select
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value as MonthFilter)}
              className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="current">This Month</option>
              <option value="previous">Previous Month</option>
              <option value="all">All Months</option>
              <option value="custom">Custom Month</option>
            </select>
            {monthFilter === "custom" && (
              <input
                type="month"
                value={customMonth}
                onChange={(event) => setCustomMonth(event.target.value)}
                className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:[color-scheme:dark]"
              />
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl p-12 rounded-[32px] border border-gray-200 dark:border-gray-800 text-center">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-gray-500 text-sm">Create your first document or try a different search term.</p>
            <p className="text-gray-400 text-xs mt-2">{selectedPeriodLabel}</p>
          </div>
        ) : (
          <div className="bg-white/60 dark:bg-[#111111]/60 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[32px] overflow-hidden shadow-lg">
            {documentMonthKeys.map((monthKey, index) => {
              const monthDocuments = documentGroups[monthKey];

              return (
                <section key={monthKey} className={index > 0 ? "border-t border-gray-200 dark:border-gray-800" : ""}>
                  <div className="px-6 py-5 bg-gray-50/60 dark:bg-black/20">
                    <h2 className="text-lg font-black text-gray-900 dark:text-white">{formatMonthLabel(monthKey)}</h2>
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{monthDocuments.length} documents</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[900px] table-fixed text-left border-collapse">
                      <colgroup>
                        <col className="w-[28%]" />
                        <col className="w-[20%]" />
                        <col className="w-[16%]" />
                        <col className="w-[16%]" />
                        <col className="w-[20%]" />
                      </colgroup>
                      <thead>
                        <tr className="border-y border-gray-200 dark:border-gray-800 text-[10px] uppercase tracking-widest text-gray-500 bg-gray-50/50 dark:bg-black/20">
                          <th className="px-6 py-4 font-bold">Document Info</th>
                          <th className="px-6 py-4 font-bold">Type</th>
                          <th className="px-6 py-4 font-bold hidden md:table-cell">Date</th>
                          <th className="px-6 py-4 font-bold text-center">Status</th>
                          <th className="px-6 py-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                        {monthDocuments.map((doc) => (
                          <tr key={doc.id} className="hover:bg-white/40 dark:hover:bg-white/5 transition-colors">
                            <td className="px-6 py-5">
                              <div className="flex flex-col">
                                <span className="font-bold text-gray-900 dark:text-white">{doc.doc_no}</span>
                                <span className="text-sm text-gray-500 truncate max-w-full">{doc.counterparty_name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-5 text-sm text-gray-600 dark:text-gray-400 font-medium">
                              {getDocumentTypeMeta(doc.document_type)?.shortLabel || doc.document_type}
                            </td>
                            <td className="px-6 py-5 hidden md:table-cell text-sm text-gray-600 dark:text-gray-400 font-medium whitespace-nowrap">
                              {formatDateOnly(doc.issue_date)}
                            </td>
                            <td className="px-6 py-5 text-center">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${statusBadgeClass(doc.status)}`}>
                                {doc.status}
                              </span>
                            </td>
                            <td className="px-6 py-5">
                              <DocumentAction document={doc} onChanged={() => fetchDocuments(false)} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
