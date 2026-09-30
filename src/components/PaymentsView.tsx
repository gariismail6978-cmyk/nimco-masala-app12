import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Search,
  Wallet,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentMethod } from '../types';

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'Easypaisa',
  'JazzCash',
  'Other',
];

export const PaymentsView: React.FC = () => {
  const {
    db,
    t,
    formatCurrency,
    formatBalanceStatus,
    recordPayment,
    selectedCustomerForPayment,
    setSelectedCustomerForPayment,
    setSelectedCustomerIdForLedger,
    setActiveTab,
  } = useApp();

  const [customerId, setCustomerId] = useState<string>(
    selectedCustomerForPayment || (db.customers[0]?.id ?? '')
  );
  const [date, setDate] = useState<string>('2026-09-30');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const [historySearch, setHistorySearch] = useState('');
  const [methodFilter, setMethodFilter] = useState<string>('all');

  useEffect(() => {
    if (selectedCustomerForPayment) {
      setCustomerId(selectedCustomerForPayment);
      const cust = db.customers.find((c) => c.id === selectedCustomerForPayment);
      if (cust && cust.currentBalance > 0) {
        setAmount(cust.currentBalance);
      }
      setSelectedCustomerForPayment(null);
    }
  }, [selectedCustomerForPayment, setSelectedCustomerForPayment, db.customers]);

  const selectedCustomer = db.customers.find((c) => c.id === customerId);
  const prevBalance = selectedCustomer ? selectedCustomer.currentBalance : 0;
  const projectedBalance = prevBalance - (Number(amount) || 0);
  const projectedInfo = formatBalanceStatus(projectedBalance);

  // Total Outstanding across all customers
  const totalOutstanding = db.customers.reduce(
    (sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0),
    0
  );
  const totalCollectedAllTime = db.payments.reduce((sum, p) => sum + p.amount, 0);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || amount <= 0) return;

    const payment = recordPayment({
      customerId,
      date,
      amount: Number(amount),
      paymentMethod,
      referenceNumber,
      notes,
    });

    setAmount(0);
    setReferenceNumber('');
    setNotes('');
    setSavedNotice(
      `${payment.receiptNumber}: ${formatCurrency(payment.amount)} received from ${payment.storeName}.`
    );
    setTimeout(() => setSavedNotice(null), 4000);
  };

  const filteredPayments = db.payments.filter((p) => {
    const q = historySearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.storeName.toLowerCase().includes(q) ||
      p.receiptNumber.toLowerCase().includes(q) ||
      p.referenceNumber.toLowerCase().includes(q) ||
      p.notes.toLowerCase().includes(q);
    const matchesMethod =
      methodFilter === 'all' || p.paymentMethod === methodFilter;
    return matchesSearch && matchesMethod;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('paymentManagement')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('paymentManagementSub')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-500">
              {t('totalOutstandingAllStores')}:{' '}
            </span>
            <span className="font-mono-num font-bold text-sm text-rose-700">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>
          <div className="px-4 py-2 bg-white border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-500">
              {t('totalPaidAmount')}:{' '}
            </span>
            <span className="font-mono-num font-bold text-sm text-emerald-700">
              {formatCurrency(totalCollectedAllTime)}
            </span>
          </div>
        </div>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{savedNotice}</span>
        </div>
      )}

      {/* Top Grid: Record Payment Form + Customer-wise Outstanding */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Record Payment Form (5 cols) */}
        <form
          onSubmit={handleRecordPayment}
          className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
            <Wallet className="w-4 h-4 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">
              {t('recordNewPayment')}
            </h2>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('storeName')} *
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => {
                setCustomerId(e.target.value);
                const c = db.customers.find((cust) => cust.id === e.target.value);
                if (c && c.currentBalance > 0) {
                  setAmount(c.currentBalance);
                } else {
                  setAmount(0);
                }
              }}
              className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
            >
              {db.customers.map((c) => {
                const bal = formatBalanceStatus(c.currentBalance);
                return (
                  <option key={c.id} value={c.id}>
                    {c.storeName} — {bal.label}: {bal.formatted}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('paymentDate')} *
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('paymentMethod')} *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
              >
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {t(pm)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('paymentAmount')} ({db.settings.currency}) *
            </label>
            <input
              type="number"
              min="1"
              required
              value={amount || ''}
              onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
              placeholder="0"
              className="w-full px-3 py-2.5 text-lg font-mono-num font-bold text-emerald-800 border-2 border-emerald-500 rounded-lg focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('referenceNumber')}
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder={t('referencePlaceholder')}
              className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('notes')}
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received via collection rider..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          {/* Live Balance Impact Preview */}
          {selectedCustomer && (
            <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>{t('prevBal')}:</span>
                <span className="font-mono-num font-semibold">
                  {formatBalanceStatus(prevBalance).formatted} (
                  {formatBalanceStatus(prevBalance).label})
                </span>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>{t('paymentAmount')} (-):</span>
                <span className="font-mono-num font-bold">
                  -{formatCurrency(Number(amount) || 0)}
                </span>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-slate-200 font-bold text-sm">
                <span>{projectedInfo.label}:</span>
                <span
                  className={`font-mono-num ${
                    projectedInfo.type === 'pending'
                      ? 'text-rose-700'
                      : projectedInfo.type === 'advance'
                      ? 'text-sky-700'
                      : 'text-emerald-700'
                  }`}
                >
                  {projectedInfo.formatted}
                </span>
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-lg transition-colors cursor-pointer"
          >
            {t('savePaymentBtn')}
          </button>
        </form>

        {/* Customer-wise Outstanding Balances (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {t('customerWiseOutstanding')}
            </h2>
            <span className="text-xs font-mono-num font-semibold text-rose-700">
              {t('total')}: {formatCurrency(totalOutstanding)}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <th className="py-2.5 px-4 text-start">{t('storeName')}</th>
                  <th className="py-2.5 px-4 text-start">{t('phoneNumber')}</th>
                  <th className="py-2.5 px-4 text-end">{t('totalPurchased')}</th>
                  <th className="py-2.5 px-4 text-end">{t('totalPaid')}</th>
                  <th className="py-2.5 px-4 text-end">{t('currentBalance')}</th>
                  <th className="py-2.5 px-4 text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {db.customers.map((cust) => {
                  const balInfo = formatBalanceStatus(cust.currentBalance);
                  return (
                    <tr key={cust.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerIdForLedger(cust.id);
                            setActiveTab('ledger');
                          }}
                          className="font-bold text-slate-900 hover:text-amber-700 text-start cursor-pointer"
                        >
                          {cust.storeName}
                        </button>
                        <div className="text-xs text-slate-500">{cust.city}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                        {cust.phone}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num text-slate-800 whitespace-nowrap">
                        {formatCurrency(cust.totalSales)}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num text-emerald-700 whitespace-nowrap">
                        {formatCurrency(cust.totalPaid)}
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <div
                          className={`font-mono-num font-bold ${
                            balInfo.type === 'pending'
                              ? 'text-rose-700'
                              : balInfo.type === 'advance'
                              ? 'text-sky-700'
                              : 'text-slate-600'
                          }`}
                        >
                          {balInfo.formatted}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {balInfo.label}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerId(cust.id);
                            setAmount(
                              cust.currentBalance > 0 ? cust.currentBalance : 1000
                            );
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md transition-colors cursor-pointer"
                        >
                          {t('receivePayment')}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Complete Payment History Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-900">
            {t('allPaymentHistory')} ({filteredPayments.length})
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                placeholder={t('search')}
                className="ps-8 pe-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
              />
            </div>

            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="all">{t('paymentMethod')}: {t('viewAll')}</option>
              {PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {t(pm)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <th className="py-2.5 px-4 text-start">{t('receiptNo')}</th>
                <th className="py-2.5 px-4 text-start">{t('date')}</th>
                <th className="py-2.5 px-4 text-start">{t('storeName')}</th>
                <th className="py-2.5 px-4 text-start">{t('paymentMethod')}</th>
                <th className="py-2.5 px-4 text-start">{t('referenceNumber')}</th>
                <th className="py-2.5 px-4 text-end">{t('amount')}</th>
                <th className="py-2.5 px-4 text-end">{t('newBal')}</th>
                <th className="py-2.5 px-4 text-start">{t('notes')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredPayments.map((pay) => {
                const newBalInfo = formatBalanceStatus(pay.newBalance);
                return (
                  <tr key={pay.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-num text-xs font-bold text-slate-800 whitespace-nowrap">
                      {pay.receiptNumber}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {pay.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {pay.storeName}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {t(pay.paymentMethod)}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600">
                      {pay.referenceNumber || '—'}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-bold text-emerald-700 whitespace-nowrap">
                      {formatCurrency(pay.amount)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-xs whitespace-nowrap">
                      <span
                        className={
                          newBalInfo.type === 'pending'
                            ? 'text-rose-700 font-semibold'
                            : newBalInfo.type === 'advance'
                            ? 'text-sky-700 font-semibold'
                            : 'text-slate-600'
                        }
                      >
                        {newBalInfo.formatted} ({newBalInfo.label})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {pay.notes || '—'}
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
