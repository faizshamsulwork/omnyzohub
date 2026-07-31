"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import type { Invoice } from "../lib/types";
import {
  formatMonthLabel,
  getMonthKey,
  isPartialStatus,
  isPaidStatus,
  isSuperadminEmail,
  parseStoredJson,
  toMoney,
  toNumber,
} from "../lib/utils";

const DEFAULT_NISAB_2026_MAIWP = 33996;
const DEFAULT_ZAKAT_RATE = 2.5;
const DEFAULT_PERSONAL_TAX_RELIEF = 9000;
const CURRENT_YEAR = new Date().getFullYear();

type ZakatSettings = {
  monthlySalary: number;
  otherIncome: number;
  allowableDeductions: number;
  taxReliefs: number;
  nisab: number;
  zakatRate: number;
};

const defaultSettings: ZakatSettings = {
  monthlySalary: 0,
  otherIncome: 0,
  allowableDeductions: 0,
  taxReliefs: DEFAULT_PERSONAL_TAX_RELIEF,
  nisab: DEFAULT_NISAB_2026_MAIWP,
  zakatRate: DEFAULT_ZAKAT_RATE,
};

const residentTaxBrackets = [
  { over: 0, notOver: 5000, baseTax: 0, excessRate: 0 },
  { over: 5000, notOver: 20000, baseTax: 0, excessRate: 1 },
  { over: 20000, notOver: 35000, baseTax: 150, excessRate: 3 },
  { over: 35000, notOver: 50000, baseTax: 600, excessRate: 6 },
  { over: 50000, notOver: 70000, baseTax: 1500, excessRate: 11 },
  { over: 70000, notOver: 100000, baseTax: 3700, excessRate: 19 },
  { over: 100000, notOver: 400000, baseTax: 9400, excessRate: 25 },
  { over: 400000, notOver: 600000, baseTax: 84400, excessRate: 26 },
  { over: 600000, notOver: 2000000, baseTax: 136400, excessRate: 28 },
  { over: 2000000, notOver: Number.POSITIVE_INFINITY, baseTax: 528400, excessRate: 30 },
];

const getInvoiceCashReceived = (invoice: Invoice) => {
  if (isPaidStatus(invoice.status)) return toNumber(invoice.amount);
  if (isPartialStatus(invoice.status)) return toNumber(invoice.amount_paid);
  return 0;
};

const calculateResidentIncomeTax = (chargeableIncome: number) => {
  const income = Math.max(0, chargeableIncome);
  const bracket = residentTaxBrackets.find((item) => income <= item.notOver) || residentTaxBrackets[residentTaxBrackets.length - 1];
  return bracket.baseTax + Math.max(0, income - bracket.over) * (bracket.excessRate / 100);
};

export default function ZakatPage() {
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(CURRENT_YEAR));
  const [settings, setSettings] = useState<ZakatSettings>(defaultSettings);

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    const { data: { session } } = await supabase.auth.getSession();

    if (!isSuperadminEmail(session?.user?.email)) {
      setIsLoading(false);
      router.replace("/");
      return;
    }

    const savedSettings = parseStoredJson<ZakatSettings>(
      localStorage.getItem("omnyzo_zakat_settings_v1"),
      defaultSettings
    );
    const savedYear = localStorage.getItem("omnyzo_zakat_year");

    setSettings({ ...defaultSettings, ...savedSettings });
    if (savedYear) setSelectedYear(savedYear);

    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error("Error fetching zakat invoices:", error);
    if (data) setInvoices(data as Invoice[]);
    setIsLoading(false);
  }, [router]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  useEffect(() => {
    if (isLoading) return;
    localStorage.setItem("omnyzo_zakat_settings_v1", JSON.stringify(settings));
    localStorage.setItem("omnyzo_zakat_year", selectedYear);
  }, [isLoading, selectedYear, settings]);

  const availableYears = useMemo(() => {
    const years = new Set<string>([String(CURRENT_YEAR)]);
    invoices.forEach((invoice) => {
      const year = getMonthKey(invoice.created_at).slice(0, 4);
      if (/^\d{4}$/.test(year)) years.add(year);
    });
    return [...years].sort((a, b) => b.localeCompare(a));
  }, [invoices]);

  const receivedInvoices = useMemo(() => {
    return invoices
      .map((invoice) => ({ invoice, cashReceived: getInvoiceCashReceived(invoice) }))
      .filter(({ invoice, cashReceived }) => cashReceived > 0 && getMonthKey(invoice.created_at).startsWith(selectedYear));
  }, [invoices, selectedYear]);

  const monthlyCollections = useMemo(() => {
    const groups = receivedInvoices.reduce<Record<string, { total: number; count: number }>>((acc, item) => {
      const monthKey = getMonthKey(item.invoice.created_at);
      acc[monthKey] = acc[monthKey] || { total: 0, count: 0 };
      acc[monthKey].total += item.cashReceived;
      acc[monthKey].count += 1;
      return acc;
    }, {});

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [receivedInvoices]);

  const annualSalary = settings.monthlySalary * 12;
  const invoiceIncome = receivedInvoices.reduce((sum, item) => sum + item.cashReceived, 0);
  const grossAnnualIncome = annualSalary + invoiceIncome + settings.otherIncome;
  const zakatableIncome = Math.max(0, grossAnnualIncome - settings.allowableDeductions);
  const isAboveNisab = zakatableIncome >= settings.nisab;
  const zakatDue = isAboveNisab ? zakatableIncome * (settings.zakatRate / 100) : 0;
  const monthlyProvision = zakatDue / 12;
  const estimatedChargeableIncome = Math.max(0, grossAnnualIncome - settings.taxReliefs);
  const incomeTaxBeforeZakat = calculateResidentIncomeTax(estimatedChargeableIncome);
  const zakatTaxRebate = Math.min(zakatDue, incomeTaxBeforeZakat);
  const incomeTaxAfterZakat = Math.max(0, incomeTaxBeforeZakat - zakatTaxRebate);
  const unusedZakatRebate = Math.max(0, zakatDue - zakatTaxRebate);

  const updateSetting = (key: keyof ZakatSettings, value: string) => {
    const numberValue = Number(value);
    setSettings((current) => ({
      ...current,
      [key]: Number.isFinite(numberValue) ? numberValue : 0,
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-bold text-gray-500">
        Loading Zakat Calculator...
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-12 relative transition-colors duration-500 pb-32 md:pb-12">
      <div className="max-w-6xl mx-auto relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.24em] text-emerald-500 mb-3">Personal Finance</p>
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Zakat Calculator</h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm md:text-base font-medium">
              Estimate zakat pendapatan from salary and received invoice income.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedYear}
              onChange={(event) => setSelectedYear(event.target.value)}
              className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-6">
          <div className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-emerald-200 dark:border-emerald-900/40 rounded-[24px] p-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-2">Estimated Zakat</h2>
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">RM {toMoney(zakatDue)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Monthly provision: RM {toMoney(monthlyProvision)}</p>
          </div>

          <div className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[24px] p-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Zakatable Income</h2>
            <p className="text-3xl font-black text-gray-900 dark:text-white">RM {toMoney(zakatableIncome)}</p>
            <p className={`text-xs mt-2 font-bold ${isAboveNisab ? "text-emerald-500" : "text-orange-500"}`}>
              {isAboveNisab ? "Above nisab threshold" : "Below nisab threshold"}
            </p>
          </div>

          <div className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-blue-200 dark:border-blue-900/40 rounded-[24px] p-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-blue-500 mb-2">Received Invoices</h2>
            <p className="text-3xl font-black text-blue-600 dark:text-blue-400">RM {toMoney(invoiceIncome)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{receivedInvoices.length} received invoice records in {selectedYear}</p>
          </div>

          <div className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-purple-200 dark:border-purple-900/40 rounded-[24px] p-6">
            <h2 className="text-[11px] font-black uppercase tracking-widest text-purple-500 mb-2">Tax Lowered By</h2>
            <p className="text-3xl font-black text-purple-600 dark:text-purple-400">RM {toMoney(zakatTaxRebate)}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Est. tax after zakat: RM {toMoney(incomeTaxAfterZakat)}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6 mb-8">
          <div className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[28px] p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Inputs</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Saved on this device for quick monthly checks.</p>
              </div>
              <span className="rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {settings.zakatRate}% Rate
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Monthly Salary</label>
                <input
                  type="number"
                  min="0"
                  value={settings.monthlySalary}
                  onChange={(event) => updateSetting("monthlySalary", event.target.value)}
                  className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Other Annual Income</label>
                <input
                  type="number"
                  min="0"
                  value={settings.otherIncome}
                  onChange={(event) => updateSetting("otherIncome", event.target.value)}
                  className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Allowable Deductions / Had Kifayah</label>
                <input
                  type="number"
                  min="0"
                  value={settings.allowableDeductions}
                  onChange={(event) => updateSetting("allowableDeductions", event.target.value)}
                  className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Personal Tax Reliefs</label>
                <input
                  type="number"
                  min="0"
                  value={settings.taxReliefs}
                  onChange={(event) => updateSetting("taxReliefs", event.target.value)}
                  className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <p className="mt-2 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  Separate from had kifayah. Use this for LHDN personal reliefs before zakat rebate.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Nisab</label>
                  <input
                    type="number"
                    min="0"
                    value={settings.nisab}
                    onChange={(event) => updateSetting("nisab", event.target.value)}
                    className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 mb-2">Zakat Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    value={settings.zakatRate}
                    onChange={(event) => updateSetting("zakatRate", event.target.value)}
                    className="w-full bg-white dark:bg-black border border-gray-200 dark:border-gray-800 rounded-2xl px-4 py-3 text-gray-900 dark:text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[28px] p-6">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-lg font-black text-gray-900 dark:text-white">Calculation</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Cash received only, not outstanding invoices.</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                ["Annual salary", annualSalary],
                ["Received invoice income", invoiceIncome],
                ["Other income", settings.otherIncome],
                ["Gross annual income", grossAnnualIncome],
                ["Less deductions / had kifayah", -settings.allowableDeductions],
                ["Zakatable income", zakatableIncome],
                ["Nisab threshold", settings.nisab],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800/80 pb-3">
                  <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{label}</span>
                  <span className="text-sm font-black text-gray-900 dark:text-white">RM {toMoney(value as number)}</span>
                </div>
              ))}

              <div className="pt-4 flex items-center justify-between gap-4">
                <span className="text-base font-black text-gray-900 dark:text-white">Zakat payable</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">RM {toMoney(zakatDue)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-purple-200 dark:border-purple-900/40 rounded-[28px] p-6 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Tax Impact From Zakat</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Zakat is treated here as a tax rebate estimate, so it reduces tax payable directly but only up to the tax amount.
              </p>
            </div>
            <span className="rounded-full bg-purple-50 dark:bg-purple-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">
              Resident individual estimate
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-5">
            <div className="rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Chargeable Income</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">RM {toMoney(estimatedChargeableIncome)}</p>
            </div>
            <div className="rounded-2xl bg-gray-50 dark:bg-black/40 border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Tax Before Zakat</p>
              <p className="text-xl font-black text-gray-900 dark:text-white">RM {toMoney(incomeTaxBeforeZakat)}</p>
            </div>
            <div className="rounded-2xl bg-purple-50 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-900/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2">Zakat Rebate</p>
              <p className="text-xl font-black text-purple-600 dark:text-purple-400">RM {toMoney(zakatTaxRebate)}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-900/40 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-2">Tax After Zakat</p>
              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">RM {toMoney(incomeTaxAfterZakat)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            {[
              ["Gross annual income", grossAnnualIncome],
              ["Less LHDN personal tax reliefs", -settings.taxReliefs],
              ["Estimated chargeable income", estimatedChargeableIncome],
              ["Estimated resident income tax", incomeTaxBeforeZakat],
              ["Less zakat rebate claimable", -zakatTaxRebate],
              ["Estimated income tax payable after zakat", incomeTaxAfterZakat],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 px-4 py-3 border-b border-gray-100 last:border-b-0 dark:border-gray-800/80">
                <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{label}</span>
                <span className="text-sm font-black text-gray-900 dark:text-white">RM {toMoney(value as number)}</span>
              </div>
            ))}
          </div>

          {unusedZakatRebate > 0 && (
            <p className="mt-4 rounded-2xl bg-orange-50 dark:bg-orange-500/10 border border-orange-100 dark:border-orange-900/40 px-4 py-3 text-xs font-bold text-orange-700 dark:text-orange-300">
              RM {toMoney(unusedZakatRebate)} zakat is above the estimated tax payable, so this estimate caps the tax reduction at RM {toMoney(incomeTaxBeforeZakat)}.
            </p>
          )}
        </section>

        <section className="bg-white/70 dark:bg-[#111111]/70 backdrop-blur-xl border border-gray-200 dark:border-gray-800 rounded-[28px] overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">Invoice Income by Month</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Paid invoices and recorded partial payments for {selectedYear}.</p>
            </div>
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
              Default nisab: PPZ-MAIWP 2026 RM {toMoney(DEFAULT_NISAB_2026_MAIWP)}
            </p>
          </div>

          {monthlyCollections.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm font-bold text-gray-500">
              No received invoice income found for {selectedYear}.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800/80">
              {monthlyCollections.map(([monthKey, month]) => (
                <div key={monthKey} className="px-6 py-5 grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3 md:items-center">
                  <div>
                    <p className="text-base font-black text-gray-900 dark:text-white">{formatMonthLabel(monthKey)}</p>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{month.count} records</p>
                  </div>
                  <p className="text-sm font-bold text-gray-500 dark:text-gray-400">Cash received</p>
                  <p className="text-lg font-black text-blue-600 dark:text-blue-400">RM {toMoney(month.total)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
