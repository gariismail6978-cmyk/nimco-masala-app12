import React, { useState } from 'react';
import {
  Check,
  Download,
  MessageCircle,
  Printer,
  Share2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Sale } from '../types';

interface InvoiceModalProps {
  sale: Sale;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ sale, onClose }) => {
  const { db, lang, t, formatCurrency } = useApp();
  const [invoiceLang, setInvoiceLang] = useState<'en' | 'ur' | 'both'>(
    db.settings.invoiceLanguage || (lang === 'ur' ? 'ur' : 'both')
  );
  const [copiedFeedback, setCopiedFeedback] = useState<string | null>(null);

  const settings = db.settings;
  const isUrduOnly = invoiceLang === 'ur';
  const isBoth = invoiceLang === 'both';

  // Calculate net pending or credit advance after this invoice
  const netAfterSale = sale.newBalance;
  const isAdvanceAfterSale = netAfterSale < 0;
  const pendingAfterSale = netAfterSale > 0 ? netAfterSale : 0;
  const advanceAfterSale = netAfterSale < 0 ? Math.abs(netAfterSale) : 0;

  const buildInvoicePlainText = () => {
    const lines = [
      `*${settings.businessName}*`,
      settings.businessNameUr ? `${settings.businessNameUr}` : '',
      `Phone: ${settings.phone}`,
      `--------------------------------`,
      `*INVOICE / بل نمبر:* ${sale.invoiceNumber}`,
      `*Date / تاریخ:* ${sale.date}`,
      `*Store / دکان:* ${sale.storeName}`,
      sale.customerPhone ? `*Phone:* ${sale.customerPhone}` : '',
      `--------------------------------`,
      `*Items / تفصیل:*`,
      ...sale.items.map(
        (it, idx) =>
          `${idx + 1}. ${it.productName} ${it.productNameUr ? `(${it.productNameUr})` : ''} — ${it.quantity} ${it.unit} × ${formatCurrency(it.unitPrice)} = *${formatCurrency(it.total)}*`
      ),
      `--------------------------------`,
      `Subtotal (سب ٹوٹل): ${formatCurrency(sale.subtotal)}`,
      sale.discount > 0 ? `Discount (رعایت): -${formatCurrency(sale.discount)}` : '',
      sale.additionalCharges > 0
        ? `Additional Charges (اضافی چارجز): +${formatCurrency(sale.additionalCharges)}`
        : '',
      `*Grand Total (موجودہ بل): ${formatCurrency(sale.grandTotal)}*`,
      `Previous Balance (سابقہ بقایا): ${formatCurrency(sale.previousBalance)}`,
      `Paid Amount (وصول شدہ): ${formatCurrency(sale.paidAmount)} (${sale.paymentMethod})`,
      isAdvanceAfterSale
        ? `*Credit / Advance (ایڈوانس جمع): ${formatCurrency(advanceAfterSale)}*`
        : `*Remaining Pending (موجودہ بقایا): ${formatCurrency(pendingAfterSale)}*`,
      `--------------------------------`,
      settings.footerNote,
    ].filter(Boolean);

    return lines.join('\n');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdfHtml = () => {
    const dir = isUrduOnly ? 'rtl' : 'ltr';
    const htmlContent = `<!DOCTYPE html>
<html lang="${isUrduOnly ? 'ur' : 'en'}" dir="${dir}">
<head>
  <meta charset="UTF-8" />
  <title>Invoice ${sale.invoiceNumber} - ${sale.storeName}</title>
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@500;700&family=Noto+Nastaliq+Urdu:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', 'Noto Nastaliq Urdu', sans-serif;
      max-width: 820px;
      margin: 24px auto;
      padding: 32px;
      color: #0f172a;
      border: 1px solid #e2e8f0;
    }
    .urdu { font-family: 'Noto Nastaliq Urdu', serif; line-height: 2.1; }
    .mono { font-family: 'JetBrains Mono', monospace; font-variant-numeric: tabular-nums; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 18px; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 10px 12px; text-align: ${isUrduOnly ? 'right' : 'left'}; }
    th { background: #f8fafc; font-weight: 700; font-size: 13px; }
    .num { text-align: right; font-family: 'JetBrains Mono', monospace; }
    .totals { width: 340px; margin-left: auto; border: 1px solid #cbd5e1; padding: 14px; background: #f8fafc; }
    .row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 14px; }
    .row.bold { font-weight: 700; font-size: 16px; border-top: 1px solid #94a3b8; margin-top: 6px; padding-top: 8px; }
    @media print { body { border: none; margin: 0; padding: 12px; } }
  </style>
</head>
<body onload="window.print()">
  <div class="header">
    <div>
      <h1 style="margin:0;font-size:22px;">${isUrduOnly ? settings.businessNameUr : settings.businessName}</h1>
      ${isBoth && settings.businessNameUr ? `<div class="urdu" style="font-size:17px;font-weight:600;color:#334155;">${settings.businessNameUr}</div>` : ''}
      <div style="font-size:13px;color:#475569;margin-top:4px;">${isUrduOnly ? settings.addressUr : settings.address}</div>
      <div class="mono" style="font-size:13px;color:#0f172a;margin-top:4px;">Phone: ${settings.phone} | WhatsApp: ${settings.whatsapp}</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:12px;text-transform:uppercase;color:#64748b;font-weight:700;">Wholesale Invoice / بل</div>
      <div class="mono" style="font-size:22px;font-weight:700;color:#b45309;">${sale.invoiceNumber}</div>
      <div class="mono" style="font-size:13px;color:#334155;">Date: ${sale.date}</div>
      <div style="font-size:13px;font-weight:600;margin-top:4px;">Status: ${sale.status}</div>
    </div>
  </div>

  <div style="background:#f8fafc;padding:14px 16px;border:1px solid #e2e8f0;margin-bottom:18px;display:flex;justify-content:space-between;">
    <div>
      <div style="font-size:12px;color:#64748b;font-weight:600;">BILL TO / بنام دکان:</div>
      <div style="font-size:17px;font-weight:700;margin-top:2px;">${sale.storeName}</div>
      <div style="font-size:13px;color:#334155;">Owner: ${sale.ownerName || '-'}</div>
      <div style="font-size:13px;color:#475569;">${sale.customerAddress}${sale.customerCity ? `, ${sale.customerCity}` : ''}</div>
    </div>
    <div style="text-align:right;">
      <div class="mono" style="font-size:13px;">Phone: ${sale.customerPhone || '-'}</div>
      <div style="font-size:13px;color:#475569;margin-top:4px;">Payment Mode: <strong>${sale.paymentMethod}</strong></div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width:40px;">#</th>
        <th>${isUrduOnly ? 'پروڈکٹ کا نام' : isBoth ? 'Product / پروڈکٹ' : 'Product Description'}</th>
        <th class="num">${isUrduOnly ? 'مقدار' : 'Qty'}</th>
        <th class="num">${isUrduOnly ? 'ریٹ' : 'Unit Price'}</th>
        <th class="num">${isUrduOnly ? 'کل رقم' : 'Total'}</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items
        .map(
          (item, i) => `
        <tr>
          <td class="num">${i + 1}</td>
          <td>
            <div style="font-weight:600;">${isUrduOnly ? item.productNameUr || item.productName : item.productName}</div>
            ${isBoth && item.productNameUr ? `<div class="urdu" style="font-size:13px;color:#475569;">${item.productNameUr}</div>` : ''}
          </td>
          <td class="num">${item.quantity} ${item.unit}</td>
          <td class="num">${formatCurrency(item.unitPrice)}</td>
          <td class="num" style="font-weight:700;">${formatCurrency(item.total)}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="row"><span>Subtotal / سب ٹوٹل:</span><span class="mono">${formatCurrency(sale.subtotal)}</span></div>
    ${sale.discount > 0 ? `<div class="row"><span>Discount / رعایت (-):</span><span class="mono">-${formatCurrency(sale.discount)}</span></div>` : ''}
    ${sale.additionalCharges > 0 ? `<div class="row"><span>Charges / کرایہ (+):</span><span class="mono">+${formatCurrency(sale.additionalCharges)}</span></div>` : ''}
    <div class="row bold"><span>Grand Total / کل بل:</span><span class="mono">${formatCurrency(sale.grandTotal)}</span></div>
    <div class="row"><span>Previous Balance / سابقہ بقایا:</span><span class="mono">${formatCurrency(sale.previousBalance)}</span></div>
    <div class="row"><span>Paid Amount / وصول شدہ:</span><span class="mono" style="color:#15803d;font-weight:700;">${formatCurrency(sale.paidAmount)}</span></div>
    <div class="row bold" style="color:${isAdvanceAfterSale ? '#0369a1' : '#b91c1c'};">
      <span>${isAdvanceAfterSale ? 'Credit Advance / ایڈوانس جمع:' : 'Remaining Pending / موجودہ بقایا:'}</span>
      <span class="mono">${formatCurrency(isAdvanceAfterSale ? advanceAfterSale : pendingAfterSale)}</span>
    </div>
  </div>

  <div style="margin-top:28px;font-size:12px;color:#475569;border-top:1px solid #e2e8f0;padding-top:12px;">
    <div>${isUrduOnly ? settings.footerNoteUr : settings.footerNote}</div>
    ${isBoth && settings.footerNoteUr ? `<div class="urdu" style="margin-top:4px;">${settings.footerNoteUr}</div>` : ''}
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sale.invoiceNumber}-${sale.storeName.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setCopiedFeedback('Downloaded printable Invoice file!');
    setTimeout(() => setCopiedFeedback(null), 3000);
  };

  const handleShare = async () => {
    const text = buildInvoicePlainText();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${sale.invoiceNumber} - ${sale.storeName}`,
          text,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedFeedback(
        lang === 'ur'
          ? 'بل کی تفصیل کاپی ہو گئی ہے!'
          : 'Invoice summary copied to clipboard!'
      );
      setTimeout(() => setCopiedFeedback(null), 3000);
    } catch {
      // Ignore
    }
  };

  const rawPhone = (sale.customerWhatsapp || sale.customerPhone || '').replace(/[^0-9]/g, '');
  const normalizedWaPhone = rawPhone.startsWith('0')
    ? `92${rawPhone.slice(1)}`
    : rawPhone;
  const whatsappUrl = `https://wa.me/${normalizedWaPhone}?text=${encodeURIComponent(
    buildInvoicePlainText()
  )}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Top Action Bar (Hidden in Print) */}
        <div className="no-print flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-slate-900 text-white border-b border-slate-800">
          <div className="flex items-center gap-3">
            <span className="font-mono-num text-sm font-semibold text-amber-400">
              {sale.invoiceNumber}
            </span>
            <span className="text-slate-500">·</span>
            <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setInvoiceLang('en')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  invoiceLang === 'en'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setInvoiceLang('ur')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  invoiceLang === 'ur'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                اردو
              </button>
              <button
                type="button"
                onClick={() => setInvoiceLang('both')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  invoiceLang === 'both'
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {t('bilingualBoth')}
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t('printInvoice')}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdfHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('downloadPdf')}</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors whitespace-nowrap"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>{t('shareInvoice')}</span>
            </button>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>{t('whatsappInvoice')}</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              aria-label="Close invoice"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {copiedFeedback && (
          <div className="no-print bg-emerald-50 border-b border-emerald-200 px-5 py-2 text-xs font-medium text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>{copiedFeedback}</span>
          </div>
        )}

        {/* Printable Invoice Canvas */}
        <div
          id="printable-area"
          dir={isUrduOnly ? 'rtl' : 'ltr'}
          className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-white text-slate-900"
        >
          {/* Business Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div className="flex items-start gap-4">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.businessName}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-900 text-amber-400 flex items-center justify-center font-bold text-xl shrink-0 border border-slate-800">
                  {settings.logoText || 'BW'}
                </div>
              )}
              <div>
                {!isUrduOnly && (
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {settings.businessName}
                  </h2>
                )}
                {(isUrduOnly || isBoth) && settings.businessNameUr && (
                  <div className="font-urdu text-lg font-bold text-slate-800 mt-0.5">
                    {settings.businessNameUr}
                  </div>
                )}
                <p className="text-xs text-slate-600 mt-1">
                  {isUrduOnly ? settings.addressUr : settings.address}
                </p>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono-num text-slate-700 mt-1.5">
                  <span>Tel: {settings.phone}</span>
                  <span>·</span>
                  <span>WhatsApp: {settings.whatsapp}</span>
                </div>
              </div>
            </div>

            <div className={isUrduOnly ? 'text-left' : 'text-right'}>
              <div className="text-xs font-semibold text-slate-500">
                {isUrduOnly
                  ? 'ہول سیل بل / انوائس'
                  : isBoth
                  ? 'WHOLESALE INVOICE / ہول سیل بل'
                  : 'WHOLESALE INVOICE'}
              </div>
              <div className="text-2xl font-bold font-mono-num text-amber-700 mt-0.5">
                {sale.invoiceNumber}
              </div>
              <div className="text-xs text-slate-600 font-mono-num mt-1">
                {isUrduOnly ? 'تاریخ:' : 'Date:'} {sale.date}
              </div>
              <div className="text-xs font-medium text-slate-700 mt-1">
                {isUrduOnly ? 'حیثیت:' : 'Status:'}{' '}
                <span className="font-semibold">{t(sale.status)}</span>
              </div>
            </div>
          </div>

          {/* Customer / Store Details Box */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div>
              <div className="text-xs font-medium text-slate-500">
                {isUrduOnly
                  ? 'بنام دکان / کسٹمر:'
                  : isBoth
                  ? 'Bill To / بنام دکان:'
                  : 'Bill To (Store / Customer):'}
              </div>
              <div className="text-base font-bold text-slate-900 mt-0.5">
                {sale.storeName}
              </div>
              {sale.ownerName && (
                <div className="text-xs text-slate-700 mt-0.5">
                  {isUrduOnly ? 'مالک:' : 'Proprietor:'} {sale.ownerName}
                </div>
              )}
              <div className="text-xs text-slate-600 mt-0.5">
                {sale.customerAddress}
                {sale.customerCity ? `, ${sale.customerCity}` : ''}
              </div>
            </div>

            <div className={isUrduOnly ? 'sm:text-left' : 'sm:text-right'}>
              <div className="text-xs text-slate-600 font-mono-num">
                {isUrduOnly ? 'فون نمبر:' : 'Phone:'} {sale.customerPhone || '—'}
              </div>
              <div className="text-xs text-slate-600 mt-1">
                {isUrduOnly ? 'ادائیگی کا طریقہ:' : 'Payment Method:'}{' '}
                <span className="font-semibold text-slate-900">
                  {t(sale.paymentMethod)}
                </span>
              </div>
              {sale.notes && (
                <div className="text-xs text-slate-500 mt-1 italic">
                  {sale.notes}
                </div>
              )}
            </div>
          </div>

          {/* Itemized Products Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs">
                  <th className="py-2.5 px-3 text-center w-10">#</th>
                  <th className="py-2.5 px-3 text-start">
                    {isUrduOnly
                      ? 'پروڈکٹ کی تفصیل'
                      : isBoth
                      ? 'Product / پروڈکٹ کا نام'
                      : 'Product Description'}
                  </th>
                  <th className="py-2.5 px-3 text-end">
                    {isUrduOnly ? 'مقدار' : isBoth ? 'Qty / مقدار' : 'Quantity'}
                  </th>
                  <th className="py-2.5 px-3 text-end">
                    {isUrduOnly ? 'فی یونٹ قیمت' : isBoth ? 'Price / ریٹ' : 'Unit Price'}
                  </th>
                  <th className="py-2.5 px-3 text-end">
                    {isUrduOnly ? 'کل رقم' : isBoth ? 'Total / ٹوٹل' : 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sale.items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-3 text-center font-mono-num text-xs text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2.5 px-3">
                      {!isUrduOnly && (
                        <div className="font-semibold text-slate-900">
                          {item.productName}
                        </div>
                      )}
                      {(isUrduOnly || isBoth) && (
                        <div
                          className={`font-urdu ${
                            isUrduOnly
                              ? 'font-bold text-slate-900 text-sm'
                              : 'text-xs text-slate-600'
                          }`}
                        >
                          {item.productNameUr || item.productName}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono-num font-medium text-slate-800 whitespace-nowrap">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono-num text-slate-700 whitespace-nowrap">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-2.5 px-3 text-end font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Calculation & Ledger Summary */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
            <div className="text-xs text-slate-500 space-y-2 max-w-sm">
              {!isUrduOnly && <p>{settings.footerNote}</p>}
              {(isUrduOnly || isBoth) && settings.footerNoteUr && (
                <p className="font-urdu text-slate-600">{settings.footerNoteUr}</p>
              )}
              <div className="pt-8 grid grid-cols-2 gap-8">
                <div className="border-t border-slate-300 pt-1.5 text-center text-slate-600">
                  {t('authorizedSignature')}
                </div>
                <div className="border-t border-slate-300 pt-1.5 text-center text-slate-600">
                  {t('receiverSignature')}
                </div>
              </div>
            </div>

            <div className="w-full sm:w-80 bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>
                  {isUrduOnly ? 'سب ٹوٹل:' : isBoth ? 'Subtotal / سب ٹوٹل:' : 'Subtotal:'}
                </span>
                <span className="font-mono-num font-medium text-slate-900">
                  {formatCurrency(sale.subtotal)}
                </span>
              </div>

              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>
                    {isUrduOnly ? 'رعایت (-):' : isBoth ? 'Discount / رعایت (-):' : 'Discount (-):'}
                  </span>
                  <span className="font-mono-num">
                    -{formatCurrency(sale.discount)}
                  </span>
                </div>
              )}

              {sale.additionalCharges > 0 && (
                <div className="flex justify-between text-slate-700">
                  <span>
                    {isUrduOnly
                      ? 'اضافی چارجز (+):'
                      : isBoth
                      ? 'Charges / اضافی چارجز (+):'
                      : 'Additional Charges (+):'}
                  </span>
                  <span className="font-mono-num">
                    +{formatCurrency(sale.additionalCharges)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-slate-900 text-base">
                <span>
                  {isUrduOnly
                    ? 'موجودہ بل ٹوٹل:'
                    : isBoth
                    ? 'Grand Total / کل بل:'
                    : 'Grand Total:'}
                </span>
                <span className="font-mono-num">
                  {formatCurrency(sale.grandTotal)}
                </span>
              </div>

              <div className="flex justify-between text-slate-600 pt-1 text-xs">
                <span>
                  {isUrduOnly
                    ? 'سابقہ بقایا بیلنس:'
                    : isBoth
                    ? 'Previous Balance / سابقہ بقایا:'
                    : 'Previous Balance:'}
                </span>
                <span className="font-mono-num font-medium">
                  {formatCurrency(sale.previousBalance)}
                </span>
              </div>

              <div className="flex justify-between text-slate-800 text-xs font-semibold">
                <span>
                  {isUrduOnly
                    ? 'کل واجب الادا رقم:'
                    : isBoth
                    ? 'Total Payable / کل واجب الادا:'
                    : 'Total Payable:'}
                </span>
                <span className="font-mono-num">
                  {formatCurrency(sale.previousBalance + sale.grandTotal)}
                </span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>
                  {isUrduOnly
                    ? 'وصول شدہ رقم:'
                    : isBoth
                    ? 'Paid Amount / وصول شدہ:'
                    : 'Paid Amount:'}
                </span>
                <span className="font-mono-num">
                  {formatCurrency(sale.paidAmount)}
                </span>
              </div>

              <div
                className={`flex justify-between pt-2 border-t border-slate-300 font-bold text-base ${
                  isAdvanceAfterSale ? 'text-sky-700' : 'text-rose-700'
                }`}
              >
                <span>
                  {isAdvanceAfterSale
                    ? isUrduOnly
                      ? 'ایڈوانس / جمع بیلنس:'
                      : isBoth
                      ? 'Credit Advance / ایڈوانس جمع:'
                      : 'Credit / Advance:'
                    : isUrduOnly
                    ? 'موجودہ بقایا بیلنس:'
                    : isBoth
                    ? 'Remaining Pending / بقایا:'
                    : 'Remaining Pending:'}
                </span>
                <span className="font-mono-num">
                  {formatCurrency(
                    isAdvanceAfterSale ? advanceAfterSale : pendingAfterSale
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
