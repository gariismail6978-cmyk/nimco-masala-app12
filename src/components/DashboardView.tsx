import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Printer,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ProductCategory } from '../types';

export const DashboardView: React.FC = () => {
  const {
    db,
    lang,
    t,
    formatCurrency,
    formatBalanceStatus,
    setActiveTab,
    setActiveInvoiceModal,
    setSelectedCustomerIdForLedger,
    setSelectedCustomerForPayment,
  } = useApp();

  const todayStr = '2026-09-30'; // Matches current runtime date or latest today

  // Aggregate KPIs
  const totalSales = db.sales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalPaidAmount = db.payments.reduce((sum, p) => sum + p.amount, 0);
  const totalPendingAmount = db.customers.reduce(
    (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
    0
  );
  const totalCustomers = db.customers.length;

  // Today's metrics (match either runtime today or latest date in DB)
  const latestSaleDate =
    db.sales.length > 0
      ? db.sales.reduce((max, s) => (s.date > max ? s.date : max), db.sales[0].date)
      : todayStr;

  const todaysSales = db.sales
    .filter((s) => s.date === latestSaleDate)
    .reduce((sum, s) => sum + s.grandTotal, 0);

  const todaysCollections = db.payments
    .filter((p) => p.date === latestSaleDate)
    .reduce((sum, p) => sum + p.amount, 0);

  const outstandingCustomers = db.customers
    .filter((c) => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance);

  const lowStockProducts = db.products.filter(
    (p) => p.currentStock <= p.minStockAlert
  );

  // Daily chart data (group by date)
  const dateSet = new Set<string>();
  db.sales.forEach((s) => dateSet.add(s.date));
  db.payments.forEach((p) => dateSet.add(p.date));
  const sortedDates = Array.from(dateSet).sort().slice(-7);

  const chartDays = sortedDates.map((d) => {
    const daySales = db.sales
      .filter((s) => s.date === d)
      .reduce((acc, s) => acc + s.grandTotal, 0);
    const dayPaid = db.payments
      .filter((p) => p.date === d)
      .reduce((acc, p) => acc + p.amount, 0);
    return { date: d, sales: daySales, paid: dayPaid };
  });

  const maxChartVal = Math.max(
    1,
    ...chartDays.map((d) => Math.max(d.sales, d.paid))
  );

  // Category breakdown
  const categoryTotals: Record<ProductCategory, number> = {
    Nimco: 0,
    Masala: 0,
    Chips: 0,
    Spices: 0,
    Snacks: 0,
    'Dry Fruits': 0,
    Grocery: 0,
  };

  db.sales.forEach((s) => {
    s.items.forEach((it) => {
      categoryTotals[it.category] = (categoryTotals[it.category] || 0) + it.total;
    });
  });

  const categoryEntries = (Object.entries(categoryTotals) as [ProductCategory, number][])
    .filter(([, val]) => val > 0)
    .sort((a, b) => b[1] - a[1]);

  const totalItemSales = Math.max(
    1,
    categoryEntries.reduce((sum, [, v]) => sum + v, 0)
  );

  return (
    <div className="space-y-6">
      {/* Header Row with Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {lang === 'ur'
              ? db.settings.businessNameUr || db.settings.businessName
              : db.settings.businessName}{' '}
            <span aria-hidden="true">·</span>{' '}
            <span className="font-mono-num text-xs text-slate-500">
              {latestSaleDate}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setActiveTab('sales')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('createNewSale')}</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            <Wallet className="w-4 h-4" />
            <span>{t('recordPaymentBtn')}</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (8 Core Metrics Requested) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Total Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('totalSales')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
            {formatCurrency(totalSales)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="font-mono-num font-semibold text-slate-700">
              {db.sales.length}
            </span>
            <span>{t('invoices')}</span>
          </div>
        </div>

        {/* 2. Total Paid Amount */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('totalPaidAmount')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-emerald-700 mt-2">
            {formatCurrency(totalPaidAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="font-mono-num font-semibold text-emerald-700">
              {db.payments.length}
            </span>
            <span>{t('payments')}</span>
          </div>
        </div>

        {/* 3. Total Pending Amount */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('totalPendingAmount')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-rose-700 mt-2">
            {formatCurrency(totalPendingAmount)}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <span className="font-mono-num font-semibold text-rose-700">
              {outstandingCustomers.length}
            </span>
            <span>{t('outstandingPayments')}</span>
          </div>
        </div>

        {/* 4. Total Customers / Stores */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('totalCustomers')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
            {totalCustomers}
          </div>
          <div className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('customers')}
              className="text-amber-700 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
            >
              <span>{t('viewAll')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5. Today's Sales */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('todaysSales')} ({latestSaleDate})
          </div>
          <div className="text-xl font-bold font-mono-num text-slate-900 mt-2">
            {formatCurrency(todaysSales)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {
              db.sales.filter((s) => s.date === latestSaleDate).length
            }{' '}
            {t('invoices')}
          </div>
        </div>

        {/* 6. Today's Collections */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('todaysCollections')} ({latestSaleDate})
          </div>
          <div className="text-xl font-bold font-mono-num text-emerald-700 mt-2">
            {formatCurrency(todaysCollections)}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            {
              db.payments.filter((p) => p.date === latestSaleDate).length
            }{' '}
            {t('payments')}
          </div>
        </div>

        {/* 7. Outstanding Payments Count */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('outstandingPayments')}
          </div>
          <div className="text-xl font-bold font-mono-num text-amber-700 mt-2">
            {outstandingCustomers.length} / {totalCustomers}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className="text-amber-700 hover:underline font-medium cursor-pointer"
            >
              {t('receivePayment')} →
            </button>
          </div>
        </div>

        {/* 8. Low Stock Alerts */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('lowStockAlerts')}
          </div>
          <div
            className={`text-xl font-bold font-mono-num mt-2 ${
              lowStockProducts.length > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {lowStockProducts.length} {t('itemsCount')}
          </div>
          <div className="text-xs text-slate-500 mt-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('stock')}
              className="text-amber-700 hover:underline font-medium cursor-pointer"
            >
              {t('stock')} →
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Category Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Collections Bar Chart */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-5">
            <h2 className="text-base font-bold text-slate-900">
              {t('salesVsCollectionsChart')}
            </h2>
            <div className="flex items-center gap-4 text-xs text-slate-600">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-900 inline-block" />
                <span>{t('totalSales')}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                <span>{t('totalPaidAmount')}</span>
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {chartDays.map((day) => {
              const salesPct = Math.round((day.sales / maxChartVal) * 100);
              const paidPct = Math.round((day.paid / maxChartVal) * 100);
              return (
                <div key={day.date} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono-num font-semibold text-slate-700">
                      {day.date}
                    </span>
                    <div className="flex items-center gap-3 font-mono-num">
                      <span className="text-slate-900 font-medium">
                        {formatCurrency(day.sales)}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-emerald-700 font-medium">
                        {formatCurrency(day.paid)}
                      </span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2.5 rounded-sm overflow-hidden flex flex-col gap-0.5">
                    <div
                      className="bg-slate-900 h-1.5 transition-all"
                      style={{ width: `${Math.max(4, salesPct)}%` }}
                    />
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-sm overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 transition-all"
                      style={{ width: `${Math.max(4, paidPct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Category-wise Revenue Share */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-4">
              {t('categorySalesBreakdown')}
            </h2>
            <div className="space-y-3.5">
              {categoryEntries.map(([cat, amount]) => {
                const pct = Math.round((amount / totalItemSales) * 100);
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {t(cat)}
                      </span>
                      <span className="font-mono-num text-slate-600">
                        {formatCurrency(amount)} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-sm overflow-hidden">
                      <div
                        className="bg-amber-600 h-full"
                        style={{ width: `${Math.max(5, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Low Stock Mini Banner */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('lowStockAlerts')}</span>
              </span>
              <button
                type="button"
                onClick={() => setActiveTab('stock')}
                className="text-xs font-medium text-amber-700 hover:underline cursor-pointer"
              >
                {t('viewAll')}
              </button>
            </div>
            {lowStockProducts.length === 0 ? (
              <p className="text-xs text-emerald-700">{t('allStockHealthy')}</p>
            ) : (
              <div className="space-y-1.5">
                {lowStockProducts.slice(0, 3).map((prod) => (
                  <div
                    key={prod.id}
                    className="flex items-center justify-between text-xs text-slate-700"
                  >
                    <span className="truncate max-w-[180px]">
                      {lang === 'ur' ? prod.nameUr || prod.name : prod.name}
                    </span>
                    <span className="font-mono-num font-semibold text-rose-700">
                      {prod.currentStock} {prod.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Outstanding Payments & Recent Invoices Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Outstanding Customers */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {t('topOutstandingStores')}
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              {t('viewAll')}
            </button>
          </div>

          <div className="divide-y divide-slate-200 flex-1">
            {outstandingCustomers.map((cust) => {
              const balInfo = formatBalanceStatus(cust.currentBalance);
              return (
                <div
                  key={cust.id}
                  className="px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerIdForLedger(cust.id);
                        setActiveTab('ledger');
                      }}
                      className="font-semibold text-sm text-slate-900 hover:text-amber-700 text-start truncate block cursor-pointer"
                    >
                      {cust.storeName}
                    </button>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5">
                      <span>{cust.city}</span>
                      <span>·</span>
                      <span className="font-mono-num">{cust.phone}</span>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <div className="font-mono-num font-bold text-sm text-rose-700">
                      {balInfo.formatted}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomerForPayment(cust.id);
                        setActiveTab('payments');
                      }}
                      className="text-xs font-semibold text-emerald-700 hover:underline mt-0.5 cursor-pointer"
                    >
                      + {t('receivePayment')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Invoices Table */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {t('recentInvoices')}
            </h2>
            <button
              type="button"
              onClick={() => setActiveTab('invoices')}
              className="text-xs font-semibold text-amber-700 hover:underline cursor-pointer"
            >
              {t('viewAll')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <th className="py-2.5 px-4 text-start">{t('invoiceNumber')}</th>
                  <th className="py-2.5 px-4 text-start">{t('storeName')}</th>
                  <th className="py-2.5 px-4 text-start">{t('date')}</th>
                  <th className="py-2.5 px-4 text-end">{t('grandTotal')}</th>
                  <th className="py-2.5 px-4 text-end">{t('totalPaid')}</th>
                  <th className="py-2.5 px-4 text-start">{t('status')}</th>
                  <th className="py-2.5 px-4 text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {db.sales.slice(0, 6).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-num font-semibold text-amber-700 whitespace-nowrap">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {sale.storeName}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {sale.date}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-emerald-700 whitespace-nowrap">
                      {formatCurrency(sale.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          sale.status === 'Paid'
                            ? 'text-emerald-700'
                            : sale.status === 'Partially Paid'
                            ? 'text-amber-700'
                            : 'text-rose-700'
                        }
                      >
                        {t(sale.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceModal(sale)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-md transition-colors cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('viewInvoice')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Recent Sales Itemized Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            {t('recentSales')}
          </h2>
          <span className="text-xs text-slate-500">
            {db.sales.reduce((sum, s) => sum + s.items.length, 0)} {t('itemsCount')}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <th className="py-2.5 px-4 text-start">{t('date')}</th>
                <th className="py-2.5 px-4 text-start">{t('invoiceNumber')}</th>
                <th className="py-2.5 px-4 text-start">{t('storeName')}</th>
                <th className="py-2.5 px-4 text-start">{t('products')}</th>
                <th className="py-2.5 px-4 text-end">{t('qty')}</th>
                <th className="py-2.5 px-4 text-end">{t('unitPrice')}</th>
                <th className="py-2.5 px-4 text-end">{t('lineTotal')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {db.sales
                .flatMap((s) =>
                  s.items.map((item) => ({
                    ...item,
                    date: s.date,
                    storeName: s.storeName,
                    saleObj: s,
                  }))
                )
                .slice(0, 8)
                .map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 px-4 font-mono-num text-xs text-slate-500 whitespace-nowrap">
                      {row.date}
                    </td>
                    <td className="py-2.5 px-4 font-mono-num text-xs font-semibold text-amber-700 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceModal(row.saleObj)}
                        className="hover:underline cursor-pointer"
                      >
                        {row.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {row.storeName}
                    </td>
                    <td className="py-2.5 px-4 text-slate-800">
                      {lang === 'ur'
                        ? row.productNameUr || row.productName
                        : row.productName}{' '}
                      <span className="text-slate-400">·</span>{' '}
                      <span className="text-xs text-slate-500">
                        {t(row.category)}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono-num text-slate-800 whitespace-nowrap">
                      {row.quantity} {row.unit}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono-num text-slate-600 whitespace-nowrap">
                      {formatCurrency(row.unitPrice)}
                    </td>
                    <td className="py-2.5 px-4 text-end font-mono-num font-semibold text-slate-900 whitespace-nowrap">
                      {formatCurrency(row.total)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
