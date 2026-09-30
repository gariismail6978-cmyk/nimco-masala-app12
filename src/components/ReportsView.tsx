import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Printer,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCategory } from '../types';

type ReportType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'customer'
  | 'product'
  | 'paid'
  | 'pending'
  | 'profit'
  | 'stock'
  | 'collections';

const CATEGORIES: ProductCategory[] = [
  'Nimco',
  'Masala',
  'Chips',
  'Spices',
  'Snacks',
  'Dry Fruits',
  'Grocery',
];

export const ReportsView: React.FC = () => {
  const { db, lang, t, formatCurrency, formatBalanceStatus } = useApp();

  const [reportType, setReportType] = useState<ReportType>('daily');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [productFilter, setProductFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const REPORT_TABS: { id: ReportType; labelKey: string }[] = [
    { id: 'daily', labelKey: 'dailySalesReport' },
    { id: 'weekly', labelKey: 'weeklySalesReport' },
    { id: 'monthly', labelKey: 'monthlySalesReport' },
    { id: 'customer', labelKey: 'customerWiseSales' },
    { id: 'product', labelKey: 'productWiseSales' },
    { id: 'paid', labelKey: 'paidAmountReport' },
    { id: 'pending', labelKey: 'pendingAmountReport' },
    { id: 'profit', labelKey: 'profitReport' },
    { id: 'stock', labelKey: 'stockReport' },
    { id: 'collections', labelKey: 'paymentCollectionReport' },
  ];

  // Filtered Sales base
  const filteredSales = db.sales.filter((s) => {
    if (startDate && s.date < startDate) return false;
    if (endDate && s.date > endDate) return false;
    if (customerFilter !== 'all' && s.customerId !== customerFilter) return false;
    if (
      productFilter !== 'all' &&
      !s.items.some((i) => i.productId === productFilter)
    )
      return false;
    if (
      categoryFilter !== 'all' &&
      !s.items.some((i) => i.category === categoryFilter)
    )
      return false;
    return true;
  });

  // Filtered Sale Items
  const filteredSaleItems = filteredSales.flatMap((s) =>
    s.items
      .filter((it) => {
        if (productFilter !== 'all' && it.productId !== productFilter)
          return false;
        if (categoryFilter !== 'all' && it.category !== categoryFilter)
          return false;
        return true;
      })
      .map((it) => ({
        ...it,
        date: s.date,
        storeName: s.storeName,
        customerId: s.customerId,
      }))
  );

  // Filtered Payments
  const filteredPayments = db.payments.filter((p) => {
    if (startDate && p.date < startDate) return false;
    if (endDate && p.date > endDate) return false;
    if (customerFilter !== 'all' && p.customerId !== customerFilter) return false;
    return true;
  });

  // Profit calculation on filteredSaleItems
  const totalItemRevenue = filteredSaleItems.reduce((sum, i) => sum + i.total, 0);
  const totalItemCost = filteredSaleItems.reduce(
    (sum, i) => sum + Math.round(i.quantity * i.purchasePrice),
    0
  );
  const totalGrossProfit = totalItemRevenue - totalItemCost;
  const overallMarginPct =
    totalItemRevenue > 0
      ? ((totalGrossProfit / totalItemRevenue) * 100).toFixed(1)
      : '0.0';

  // Build rows & headers dynamically for the active report so both UI table and Excel/CSV Export share exact data
  const buildReportTable = (): {
    headers: string[];
    rows: (string | number)[][];
  } => {
    if (reportType === 'daily' || reportType === 'weekly' || reportType === 'monthly') {
      const grouped = new Map<
        string,
        { count: number; subtotal: number; discount: number; grandTotal: number; paid: number; pending: number }
      >();

      filteredSales.forEach((s) => {
        let periodKey = s.date;
        if (reportType === 'weekly') {
          periodKey = `Week of ${s.date.slice(0, 8)}01–${s.date}`;
        } else if (reportType === 'monthly') {
          periodKey = s.date.slice(0, 7); // YYYY-MM
        }
        const curr = grouped.get(periodKey) || {
          count: 0,
          subtotal: 0,
          discount: 0,
          grandTotal: 0,
          paid: 0,
          pending: 0,
        };
        curr.count += 1;
        curr.subtotal += s.subtotal;
        curr.discount += s.discount;
        curr.grandTotal += s.grandTotal;
        curr.paid += s.paidAmount;
        curr.pending += s.invoicePending;
        grouped.set(periodKey, curr);
      });

      return {
        headers: [
          t('date'),
          t('invoicesCount'),
          t('subtotal'),
          t('discount'),
          t('grandTotal'),
          t('totalPaid'),
          t('pendingBalance'),
        ],
        rows: Array.from(grouped.entries()).map(([period, val]) => [
          period,
          val.count,
          formatCurrency(val.subtotal),
          formatCurrency(val.discount),
          formatCurrency(val.grandTotal),
          formatCurrency(val.paid),
          formatCurrency(val.pending),
        ]),
      };
    }

    if (reportType === 'customer') {
      const custRows = db.customers
        .filter((c) => customerFilter === 'all' || c.id === customerFilter)
        .map((c) => {
          const salesForCust = filteredSales.filter((s) => s.customerId === c.id);
          const billed = salesForCust.reduce((sum, s) => sum + s.grandTotal, 0);
          const paid = salesForCust.reduce((sum, s) => sum + s.paidAmount, 0);
          const bal = formatBalanceStatus(c.currentBalance);
          return [
            c.storeName,
            c.city,
            salesForCust.length,
            formatCurrency(billed),
            formatCurrency(paid),
            `${bal.formatted} (${bal.label})`,
          ];
        });

      return {
        headers: [
          t('storeName'),
          t('city'),
          t('invoicesCount'),
          t('totalSales'),
          t('totalPaid'),
          t('currentBalance'),
        ],
        rows: custRows,
      };
    }

    if (reportType === 'product') {
      const prodRows = db.products
        .filter((p) => {
          if (productFilter !== 'all' && p.id !== productFilter) return false;
          if (categoryFilter !== 'all' && p.category !== categoryFilter)
            return false;
          return true;
        })
        .map((p) => {
          const items = filteredSaleItems.filter((i) => i.productId === p.id);
          const qtySold = items.reduce((sum, i) => sum + i.quantity, 0);
          const rev = items.reduce((sum, i) => sum + i.total, 0);
          return [
            lang === 'ur' ? p.nameUr || p.name : p.name,
            t(p.category),
            `${qtySold} ${p.unit}`,
            formatCurrency(p.salePrice),
            formatCurrency(rev),
            `${p.currentStock} ${p.unit}`,
          ];
        });

      return {
        headers: [
          t('products'),
          t('category'),
          t('quantitySold'),
          t('unitPrice'),
          t('revenue'),
          t('currentStock'),
        ],
        rows: prodRows,
      };
    }

    if (reportType === 'paid') {
      return {
        headers: [
          t('date'),
          t('receiptNo'),
          t('storeName'),
          t('paymentMethod'),
          t('referenceNumber'),
          t('amount'),
        ],
        rows: filteredPayments.map((p) => [
          p.date,
          p.receiptNumber,
          p.storeName,
          t(p.paymentMethod),
          p.referenceNumber || '—',
          formatCurrency(p.amount),
        ]),
      };
    }

    if (reportType === 'pending') {
      const pendingCusts = db.customers.filter(
        (c) => customerFilter === 'all' || c.id === customerFilter
      );
      return {
        headers: [
          t('storeName'),
          t('ownerName'),
          t('phoneNumber'),
          t('city'),
          t('openingBalance'),
          t('totalPurchased'),
          t('totalPaid'),
          t('currentBalance'),
        ],
        rows: pendingCusts.map((c) => {
          const bal = formatBalanceStatus(c.currentBalance);
          return [
            c.storeName,
            c.ownerName,
            c.phone,
            c.city,
            formatCurrency(c.openingBalance),
            formatCurrency(c.totalSales),
            formatCurrency(c.totalPaid),
            `${bal.formatted} (${bal.label})`,
          ];
        }),
      };
    }

    if (reportType === 'profit') {
      return {
        headers: [
          t('date'),
          t('invoiceNumber'),
          t('products'),
          t('qty'),
          t('costOfGoods'),
          t('revenue'),
          t('grossProfit'),
          t('profitMargin'),
        ],
        rows: filteredSaleItems.map((it) => {
          const cost = Math.round(it.quantity * it.purchasePrice);
          const profit = it.total - cost;
          const pct =
            it.total > 0 ? ((profit / it.total) * 100).toFixed(1) + '%' : '0%';
          return [
            it.date,
            it.invoiceNumber,
            lang === 'ur' ? it.productNameUr || it.productName : it.productName,
            `${it.quantity} ${it.unit}`,
            formatCurrency(cost),
            formatCurrency(it.total),
            formatCurrency(profit),
            pct,
          ];
        }),
      };
    }

    if (reportType === 'stock') {
      return {
        headers: [
          t('skuCode'),
          t('products'),
          t('category'),
          t('currentStock'),
          t('purchasePrice'),
          t('salePrice'),
          t('inventoryCostValue'),
          t('inventoryWholesaleValue'),
        ],
        rows: db.products
          .filter((p) => {
            if (productFilter !== 'all' && p.id !== productFilter) return false;
            if (categoryFilter !== 'all' && p.category !== categoryFilter)
              return false;
            return true;
          })
          .map((p) => [
            p.sku,
            lang === 'ur' ? p.nameUr || p.name : p.name,
            t(p.category),
            `${p.currentStock} ${p.unit}`,
            formatCurrency(p.purchasePrice),
            formatCurrency(p.salePrice),
            formatCurrency(p.currentStock * p.purchasePrice),
            formatCurrency(p.currentStock * p.salePrice),
          ]),
      };
    }

    // 'collections' by payment method
    const methods = ['Cash', 'Bank Transfer', 'Easypaisa', 'JazzCash', 'Other'];
    return {
      headers: [t('paymentMethod'), t('payments'), t('amount')],
      rows: methods.map((m) => {
        const list = filteredPayments.filter((p) => p.paymentMethod === m);
        const sum = list.reduce((acc, p) => acc + p.amount, 0);
        return [t(m), list.length, formatCurrency(sum)];
      }),
    };
  };

  const { headers, rows } = buildReportTable();

  const handleExportExcelCsv = () => {
    const csvLines = [
      headers.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(','),
      ...rows.map((r) =>
        r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
      ),
    ];
    const csvContent = '\uFEFF' + csvLines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
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
            {t('reportsHeading')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">{t('reportsSub')}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('exportPdfBtn')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportExcelCsv}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t('exportExcelBtn')}</span>
          </button>
        </div>
      </div>

      {/* 10 Report Type Tabs */}
      <div className="no-print bg-white border border-slate-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100 rounded-lg">
          {REPORT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                reportType === tab.id
                  ? 'bg-slate-900 text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          ))}
        </div>

        {/* 4 Filters: Date Range, Customer, Product, Category */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2 border-t border-slate-200">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t('startDate')}
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono-num border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t('endDate')}
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs font-mono-num border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t('filterByCustomer')}
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">{t('allCustomers')}</option>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.storeName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t('filterByProduct')}
            </label>
            <select
              value={productFilter}
              onChange={(e) => setProductFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">{t('allProducts')}</option>
              {db.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              {t('filterByCategory')}
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">{t('allCategories')}</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {t(cat)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Printable Report Canvas */}
      <div
        id="printable-area"
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-200">
          <div>
            <div className="text-xs font-semibold text-amber-700">
              {lang === 'ur'
                ? db.settings.businessNameUr || db.settings.businessName
                : db.settings.businessName}
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              {t(
                REPORT_TABS.find((rt) => rt.id === reportType)?.labelKey ||
                  'reportsHeading'
              )}
            </h2>
          </div>

          <div className="text-xs font-mono-num text-slate-500">
            {startDate || 'All Dates'} → {endDate || 'Present'}
          </div>
        </div>

        {/* Summary KPI Strip for Sales & Profit */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">{t('revenue')}</div>
            <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
              {formatCurrency(totalItemRevenue)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">{t('costOfGoods')}</div>
            <div className="text-lg font-bold font-mono-num text-slate-700 mt-1">
              {formatCurrency(totalItemCost)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">{t('grossProfit')}</div>
            <div className="text-lg font-bold font-mono-num text-emerald-700 mt-1">
              {formatCurrency(totalGrossProfit)}
            </div>
          </div>

          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="text-xs text-slate-500">{t('profitMargin')}</div>
            <div className="text-lg font-bold font-mono-num text-amber-700 mt-1">
              {overallMarginPct}%
            </div>
          </div>
        </div>

        {/* Dynamic Report Data Table */}
        <div className="border border-slate-200 rounded-lg overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 text-xs">
                {headers.map((h, i) => (
                  <th
                    key={i}
                    className={`py-3 px-4 ${
                      i >= headers.length - 3 ? 'text-end' : 'text-start'
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-slate-50/80">
                  {row.map((cell, cIdx) => (
                    <td
                      key={cIdx}
                      className={`py-2.5 px-4 ${
                        cIdx >= row.length - 3
                          ? 'text-end font-mono-num font-medium'
                          : 'text-start'
                      } text-slate-800 whitespace-nowrap`}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
