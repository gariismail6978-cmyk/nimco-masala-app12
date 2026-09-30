import React, { useState } from 'react';
import {
  FileText,
  MessageCircle,
  Plus,
  Printer,
  Search,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SaleStatus } from '../types';

export const InvoicesView: React.FC = () => {
  const {
    db,
    t,
    formatCurrency,
    setActiveTab,
    setActiveInvoiceModal,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SaleStatus>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('');

  const filteredInvoices = db.sales.filter((sale) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      sale.invoiceNumber.toLowerCase().includes(q) ||
      sale.storeName.toLowerCase().includes(q) ||
      sale.ownerName.toLowerCase().includes(q) ||
      sale.customerPhone.toLowerCase().includes(q) ||
      sale.items.some(
        (it) =>
          it.productName.toLowerCase().includes(q) ||
          (it.productNameUr && it.productNameUr.includes(q))
      );

    const matchesStatus =
      statusFilter === 'all' || sale.status === statusFilter;

    const matchesCustomer =
      customerFilter === 'all' || sale.customerId === customerFilter;

    const matchesDate = !dateFilter || sale.date === dateFilter;

    return matchesSearch && matchesStatus && matchesCustomer && matchesDate;
  });

  const totalFilteredBilled = filteredInvoices.reduce(
    (sum, s) => sum + s.grandTotal,
    0
  );
  const totalFilteredPaid = filteredInvoices.reduce(
    (sum, s) => sum + s.paidAmount,
    0
  );
  const totalFilteredPending = filteredInvoices.reduce(
    (sum, s) => sum + s.invoicePending,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('invoicesHeading')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">{t('invoicesSub')}</p>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab('sales')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('createNewSale')}</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('globalSearchPlaceholder')}
              className="w-full ps-10 pe-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
            >
              <option value="all">{t('allCustomers')}</option>
              {db.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.storeName}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="md:col-span-2 flex items-center">
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setCustomerFilter('all');
                setDateFilter('');
              }}
              className="w-full px-3 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              {t('resetFilters')}
            </button>
          </div>
        </div>

        {/* Status Filter Segmented Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'Paid', 'Partially Paid', 'Pending'] as const).map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {st === 'all' ? t('allStatuses') : t(st)}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono-num text-slate-600">
            <span>
              {t('grandTotal')}:{' '}
              <strong className="text-slate-900">
                {formatCurrency(totalFilteredBilled)}
              </strong>
            </span>
            <span>·</span>
            <span>
              {t('totalPaid')}:{' '}
              <strong className="text-emerald-700">
                {formatCurrency(totalFilteredPaid)}
              </strong>
            </span>
            <span>·</span>
            <span>
              {t('pendingBalance')}:{' '}
              <strong className="text-rose-700">
                {formatCurrency(totalFilteredPending)}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <th className="py-3 px-4 text-start">{t('invoiceNumber')}</th>
                <th className="py-3 px-4 text-start">{t('invoiceDate')}</th>
                <th className="py-3 px-4 text-start">{t('storeName')}</th>
                <th className="py-3 px-4 text-start">{t('products')}</th>
                <th className="py-3 px-4 text-end">{t('grandTotal')}</th>
                <th className="py-3 px-4 text-end">{t('totalPaid')}</th>
                <th className="py-3 px-4 text-end">{t('pendingBalance')}</th>
                <th className="py-3 px-4 text-start">{t('status')}</th>
                <th className="py-3 px-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInvoices.map((sale) => {
                const rawPhone = (
                  sale.customerWhatsapp ||
                  sale.customerPhone ||
                  ''
                ).replace(/[^0-9]/g, '');
                const waPhone = rawPhone.startsWith('0')
                  ? `92${rawPhone.slice(1)}`
                  : rawPhone;
                const waText = `*${db.settings.businessName}*\nInvoice: ${sale.invoiceNumber}\nDate: ${sale.date}\nStore: ${sale.storeName}\nGrand Total: ${formatCurrency(sale.grandTotal)}\nPaid: ${formatCurrency(sale.paidAmount)}\nBalance: ${formatCurrency(sale.newBalance > 0 ? sale.newBalance : 0)}`;

                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-num font-bold text-amber-700 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setActiveInvoiceModal(sale)}
                        className="hover:underline cursor-pointer"
                      >
                        {sale.invoiceNumber}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {sale.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {sale.storeName}
                      </div>
                      <div className="text-xs text-slate-500 font-mono-num">
                        {sale.customerPhone}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {sale.items
                        .map((i) => `${i.productName} (${i.quantity} ${i.unit})`)
                        .join(', ')}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-emerald-700 whitespace-nowrap">
                      {formatCurrency(sale.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-semibold text-rose-700 whitespace-nowrap">
                      {formatCurrency(sale.invoicePending)}
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
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setActiveInvoiceModal(sale)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>{t('viewInvoice')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveInvoiceModal(sale)}
                          title={t('downloadPdf')}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                        <a
                          href={`https://wa.me/${waPhone}?text=${encodeURIComponent(
                            waText
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={t('whatsappInvoice')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
