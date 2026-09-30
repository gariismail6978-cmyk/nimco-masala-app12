import React, { useState } from 'react';
import {
  Download,
  FileSpreadsheet,
  MessageCircle,
  Printer,
  ShoppingBag,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const LedgerView: React.FC = () => {
  const {
    db,
    lang,
    t,
    formatCurrency,
    formatBalanceStatus,
    selectedCustomerIdForLedger,
    setSelectedCustomerIdForLedger,
    getCustomerLedger,
    setActiveInvoiceModal,
    setSelectedCustomerForSale,
    setSelectedCustomerForPayment,
    setActiveTab,
  } = useApp();

  const activeCustomerId =
    selectedCustomerIdForLedger || (db.customers[0]?.id ?? '');
  const customer = db.customers.find((c) => c.id === activeCustomerId);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const allEntries = customer ? getCustomerLedger(customer.id) : [];
  const filteredEntries = allEntries.filter((entry) => {
    if (entry.type === 'Opening Balance') return true;
    if (startDate && entry.date < startDate) return false;
    if (endDate && entry.date > endDate) return false;
    return true;
  });

  const handlePrintLedger = () => {
    window.print();
  };

  const handleDownloadPdfHtml = () => {
    if (!customer) return;
    const isUr = lang === 'ur';
    const balInfo = formatBalanceStatus(customer.currentBalance);
    const html = `<!DOCTYPE html>
<html lang="${lang}" dir="${isUr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8" />
  <title>Ledger - ${customer.storeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', 'Noto Nastaliq Urdu', sans-serif; max-width: 860px; margin: 24px auto; padding: 24px; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 13px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: ${isUr ? 'right' : 'left'}; }
    th { background: #f8fafc; font-weight: 700; }
    .num { text-align: right; font-family: 'JetBrains Mono', monospace; }
  </style>
</head>
<body onload="window.print()">
  <h1 style="margin:0;font-size:20px;">${isUr ? db.settings.businessNameUr : db.settings.businessName}</h1>
  <p style="margin:4px 0 16px;font-size:13px;color:#475569;">Customer Account Ledger (Khata) — <strong>${customer.storeName}</strong> (${customer.phone})</p>
  <div style="display:flex;gap:20px;background:#f8fafc;padding:12px 16px;border:1px solid #cbd5e1;font-size:13px;">
    <div>Opening Balance: <strong>${formatCurrency(customer.openingBalance)}</strong></div>
    <div>Total Sales: <strong>${formatCurrency(customer.totalSales)}</strong></div>
    <div>Total Paid: <strong>${formatCurrency(customer.totalPaid)}</strong></div>
    <div>${balInfo.label}: <strong>${balInfo.formatted}</strong></div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Invoice / Ref #</th>
        <th>Description</th>
        <th class="num">Sale (+)</th>
        <th class="num">Payment (-)</th>
        <th class="num">Balance</th>
      </tr>
    </thead>
    <tbody>
      ${filteredEntries
        .map(
          (e) => `
        <tr>
          <td class="num">${e.date}</td>
          <td class="num">${e.referenceNumber}</td>
          <td>${isUr ? e.descriptionUr : e.description}</td>
          <td class="num">${e.debitSale > 0 ? formatCurrency(e.debitSale) : '—'}</td>
          <td class="num">${e.creditPayment > 0 ? formatCurrency(e.creditPayment) : '—'}</td>
          <td class="num"><strong>${formatBalanceStatus(e.runningBalance).formatted} (${formatBalanceStatus(e.runningBalance).label})</strong></td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger-${customer.storeName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportCsv = () => {
    if (!customer) return;
    const headers = [
      'Date',
      'Reference / Invoice #',
      'Type',
      'Description',
      'Sale (+)',
      'Payment (-)',
      'Running Balance',
      'Balance Status',
    ];
    const rows = filteredEntries.map((e) => {
      const bal = formatBalanceStatus(e.runningBalance);
      return [
        e.date,
        e.referenceNumber,
        e.type,
        `"${(lang === 'ur' ? e.descriptionUr : e.description).replace(/"/g, '""')}"`,
        e.debitSale,
        e.creditPayment,
        bal.amount,
        bal.label,
      ].join(',');
    });
    // Prepend UTF-8 BOM so Excel opens Urdu characters properly
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ledger_${customer.storeName.replace(/\s+/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('customerLedgerHeading')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('customerLedgerSub')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePrintLedger}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('printLedger')}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdfHtml}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('downloadLedgerPdf')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t('exportLedgerCsv')}</span>
          </button>
        </div>
      </div>

      {/* Customer Selector & Date Range Filters */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5">
          <label className="block text-xs font-bold text-slate-700 mb-1">
            {t('selectCustomerForLedger')}
          </label>
          <select
            value={activeCustomerId}
            onChange={(e) => setSelectedCustomerIdForLedger(e.target.value)}
            className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-amber-600"
          >
            {db.customers.map((c) => {
              const bal = formatBalanceStatus(c.currentBalance);
              return (
                <option key={c.id} value={c.id}>
                  {c.storeName} ({c.city}) — {bal.label}: {bal.formatted}
                </option>
              );
            })}
          </select>
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            {t('startDate')}
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-lg"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-xs font-semibold text-slate-600 mb-1">
            {t('endDate')}
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-xs font-mono-num border border-slate-200 rounded-lg"
          />
        </div>

        <div className="md:col-span-3 flex items-center gap-2">
          {customer && (
            <>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerForSale(customer.id);
                  setActiveTab('sales');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>{t('newInvoice')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomerForPayment(customer.id);
                  setActiveTab('payments');
                }}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>{t('receivePayment')}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Printable Ledger Statement */}
      {customer && (
        <div
          id="printable-area"
          className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
        >
          {/* Store Header & Summary */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200">
            <div>
              <div className="text-xs font-semibold text-amber-700">
                {lang === 'ur'
                  ? db.settings.businessNameUr || db.settings.businessName
                  : db.settings.businessName}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1">
                {customer.storeName}
              </h2>
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center gap-2">
                <span>
                  {t('ownerName')}: <strong>{customer.ownerName}</strong>
                </span>
                <span>·</span>
                <span className="font-mono-num">{customer.phone}</span>
                <span>·</span>
                <span>
                  {customer.address}, {customer.city}
                </span>
              </div>
            </div>

            <div className="no-print">
              <a
                href={`https://wa.me/${(
                  customer.whatsapp || customer.phone
                ).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `*${db.settings.businessName} - Account Statement*\nStore: ${customer.storeName}\nOpening Balance: ${formatCurrency(customer.openingBalance)}\nTotal Sales: ${formatCurrency(customer.totalSales)}\nTotal Paid: ${formatCurrency(customer.totalPaid)}\n*${formatBalanceStatus(customer.currentBalance).label}: ${formatBalanceStatus(customer.currentBalance).formatted}*`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg transition-colors"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>{t('sendWhatsAppReminder')}</span>
              </a>
            </div>
          </div>

          {/* 4 Account Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">{t('openingBalance')}</div>
              <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                {formatCurrency(customer.openingBalance)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">{t('totalPurchased')}</div>
              <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                {formatCurrency(customer.totalSales)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">{t('totalPaid')}</div>
              <div className="text-lg font-bold font-mono-num text-emerald-700 mt-1">
                {formatCurrency(customer.totalPaid)}
              </div>
            </div>

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
              <div className="text-xs text-slate-500">
                {formatBalanceStatus(customer.currentBalance).label}
              </div>
              <div
                className={`text-lg font-bold font-mono-num mt-1 ${
                  customer.currentBalance > 0
                    ? 'text-rose-700'
                    : customer.currentBalance < 0
                    ? 'text-sky-700'
                    : 'text-slate-900'
                }`}
              >
                {formatBalanceStatus(customer.currentBalance).formatted}
              </div>
            </div>
          </div>

          {/* Chronological Ledger Table */}
          <div className="border border-slate-200 rounded-lg overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs">
                  <th className="py-3 px-4 text-start">{t('transactionDate')}</th>
                  <th className="py-3 px-4 text-start">{t('refInvoiceNo')}</th>
                  <th className="py-3 px-4 text-start">{t('description')}</th>
                  <th className="py-3 px-4 text-end">{t('saleDebit')}</th>
                  <th className="py-3 px-4 text-end">{t('paymentCredit')}</th>
                  <th className="py-3 px-4 text-end">{t('runningBalance')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEntries.map((entry) => {
                  const balInfo = formatBalanceStatus(entry.runningBalance);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {entry.date}
                      </td>
                      <td className="py-3 px-4 font-mono-num text-xs font-bold whitespace-nowrap">
                        {entry.saleObj ? (
                          <button
                            type="button"
                            onClick={() => setActiveInvoiceModal(entry.saleObj!)}
                            className="text-amber-700 hover:underline cursor-pointer"
                          >
                            {entry.referenceNumber}
                          </button>
                        ) : (
                          <span className="text-slate-700">
                            {entry.referenceNumber}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-800 text-xs">
                        {lang === 'ur' ? entry.descriptionUr : entry.description}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                        {entry.debitSale > 0
                          ? formatCurrency(entry.debitSale)
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num font-semibold text-emerald-700 whitespace-nowrap">
                        {entry.creditPayment > 0
                          ? formatCurrency(entry.creditPayment)
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <div
                          className={`font-mono-num font-bold ${
                            balInfo.type === 'pending'
                              ? 'text-rose-700'
                              : balInfo.type === 'advance'
                              ? 'text-sky-700'
                              : 'text-slate-700'
                          }`}
                        >
                          {balInfo.formatted}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {balInfo.label}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
