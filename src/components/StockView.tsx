import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StockTransactionType } from '../types';

export const StockView: React.FC = () => {
  const { db, lang, t, formatCurrency, adjustStock } = useApp();

  const [subTab, setSubTab] = useState<'current' | 'history'>('current');
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockFilter, setLowStockFilter] = useState(false);

  // Stock Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productId, setProductId] = useState<string>(db.products[0]?.id ?? '');
  const [txType, setTxType] = useState<StockTransactionType>('Stock In');
  const [quantity, setQuantity] = useState<number>(10);
  const [reference, setReference] = useState<string>('');
  const [date, setDate] = useState<string>('2026-09-30');
  const [notes, setNotes] = useState<string>('');
  const [feedback, setFeedback] = useState<string | null>(null);

  const openStockModal = (
    prodId?: string,
    defaultType: StockTransactionType = 'Stock In'
  ) => {
    const targetId = prodId || db.products[0]?.id || '';
    setProductId(targetId);
    setTxType(defaultType);
    const prod = db.products.find((p) => p.id === targetId);
    setQuantity(defaultType === 'Adjustment' && prod ? prod.currentStock : 10);
    setReference('');
    setNotes('');
    setIsModalOpen(true);
  };

  const handleSaveStockTx = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || quantity < 0) return;

    const tx = adjustStock({
      productId,
      type: txType,
      quantity: Number(quantity),
      reference,
      date,
      notes,
    });

    setIsModalOpen(false);
    setFeedback(
      `${tx.productName}: ${tx.type} (${tx.quantity} ${tx.unit}) → Remaining Stock: ${tx.newStock} ${tx.unit}`
    );
    setTimeout(() => setFeedback(null), 4000);
  };

  const lowStockProducts = db.products.filter(
    (p) => p.currentStock <= p.minStockAlert
  );

  const totalCostValue = db.products.reduce(
    (sum, p) => sum + p.currentStock * p.purchasePrice,
    0
  );
  const totalWholesaleValue = db.products.reduce(
    (sum, p) => sum + p.currentStock * p.salePrice,
    0
  );

  const filteredProducts = db.products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameUr && p.nameUr.includes(q)) ||
      p.sku.toLowerCase().includes(q);
    const matchesLow = !lowStockFilter || p.currentStock <= p.minStockAlert;
    return matchesSearch && matchesLow;
  });

  const filteredHistory = db.stockTransactions.filter((tx) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      tx.productName.toLowerCase().includes(q) ||
      tx.reference.toLowerCase().includes(q) ||
      tx.type.toLowerCase().includes(q) ||
      tx.notes.toLowerCase().includes(q)
    );
  });

  const selectedModalProduct = db.products.find((p) => p.id === productId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('stockManagementHeading')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('stockManagementSub')}
          </p>
        </div>

        <button
          type="button"
          onClick={() => openStockModal(undefined, 'Stock In')}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('updateStockBtn')}</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* 4 Stock KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('totalProductsCount')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
            {db.products.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('lowStockCount')}
          </div>
          <div
            className={`text-2xl font-bold font-mono-num mt-2 ${
              lowStockProducts.length > 0 ? 'text-rose-700' : 'text-emerald-700'
            }`}
          >
            {lowStockProducts.length}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('inventoryCostValue')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-slate-900 mt-2">
            {formatCurrency(totalCostValue)}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs font-medium text-slate-500">
            {t('inventoryWholesaleValue')}
          </div>
          <div className="text-2xl font-bold font-mono-num text-emerald-700 mt-2">
            {formatCurrency(totalWholesaleValue)}
          </div>
        </div>
      </div>

      {/* Low Stock Alert Strip */}
      {lowStockProducts.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="text-xs font-bold text-slate-900">
                {t('lowStockAlerts')} ({lowStockProducts.length})
              </div>
              <div className="text-xs text-slate-700 mt-0.5">
                {lowStockProducts
                  .map(
                    (p) =>
                      `${lang === 'ur' ? p.nameUr || p.name : p.name} (${p.currentStock} ${p.unit})`
                  )
                  .join('  ·  ')}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setLowStockFilter(!lowStockFilter)}
            className="px-3 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg whitespace-nowrap cursor-pointer"
          >
            {lowStockFilter ? t('viewAll') : t('lowStockOnly')}
          </button>
        </div>
      )}

      {/* Sub-navigation & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSubTab('current')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              subTab === 'current'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('currentStockTab')} ({db.products.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('history')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
              subTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('stockHistoryTab')} ({db.stockTransactions.length})
          </button>
        </div>

        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchProductsPlaceholder')}
            className="w-full ps-9 pe-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
          />
        </div>
      </div>

      {/* Tab 1: Current Stock Table */}
      {subTab === 'current' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <th className="py-3 px-4 text-start">{t('skuCode')}</th>
                  <th className="py-3 px-4 text-start">{t('products')}</th>
                  <th className="py-3 px-4 text-start">{t('category')}</th>
                  <th className="py-3 px-4 text-end">{t('currentStock')}</th>
                  <th className="py-3 px-4 text-end">{t('minStockAlert')}</th>
                  <th className="py-3 px-4 text-end">{t('inventoryCostValue')}</th>
                  <th className="py-3 px-4 text-start">{t('status')}</th>
                  <th className="py-3 px-4 text-end">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredProducts.map((prod) => {
                  const isLow = prod.currentStock <= prod.minStockAlert;
                  const isOut = prod.currentStock <= 0;
                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80">
                      <td className="py-3 px-4 font-mono-num text-xs font-semibold text-slate-500">
                        {prod.sku}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">
                          {lang === 'ur' ? prod.nameUr || prod.name : prod.name}
                        </div>
                        {prod.nameUr && lang !== 'ur' && (
                          <div className="font-urdu text-xs text-slate-500">
                            {prod.nameUr}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        {t(prod.category)}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num font-bold text-slate-900 whitespace-nowrap">
                        {prod.currentStock} {prod.unit}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num text-slate-500 whitespace-nowrap">
                        {prod.minStockAlert} {prod.unit}
                      </td>
                      <td className="py-3 px-4 text-end font-mono-num text-slate-800 whitespace-nowrap">
                        {formatCurrency(prod.currentStock * prod.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                        <span
                          className={
                            isOut
                              ? 'text-rose-700'
                              : isLow
                              ? 'text-amber-700'
                              : 'text-emerald-700'
                          }
                        >
                          {isOut
                            ? t('outOfStock')
                            : isLow
                            ? t('lowStock')
                            : t('inStock')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-end whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => openStockModal(prod.id, 'Stock In')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-md transition-colors cursor-pointer"
                          >
                            <ArrowDownLeft className="w-3.5 h-3.5" />
                            <span>+ In</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openStockModal(prod.id, 'Stock Out')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 rounded-md transition-colors cursor-pointer"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                            <span>- Out</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openStockModal(prod.id, 'Adjustment')}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Adjust</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Tab 2: Stock Movement History */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                  <th className="py-3 px-4 text-start">{t('date')}</th>
                  <th className="py-3 px-4 text-start">{t('products')}</th>
                  <th className="py-3 px-4 text-start">{t('stockOperationType')}</th>
                  <th className="py-3 px-4 text-end">{t('qty')}</th>
                  <th className="py-3 px-4 text-end">{t('previousStock')}</th>
                  <th className="py-3 px-4 text-end">{t('newStock')}</th>
                  <th className="py-3 px-4 text-start">{t('refInvoiceNo')}</th>
                  <th className="py-3 px-4 text-start">{t('notes')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {lang === 'ur'
                        ? tx.productNameUr || tx.productName
                        : tx.productName}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold whitespace-nowrap">
                      <span
                        className={
                          tx.type === 'Stock In'
                            ? 'text-emerald-700'
                            : tx.type === 'Sale' || tx.type === 'Stock Out'
                            ? 'text-rose-700'
                            : 'text-amber-700'
                        }
                      >
                        {t(tx.type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-bold whitespace-nowrap">
                      {tx.type === 'Stock In' ? '+' : tx.type === 'Adjustment' ? '±' : '-'}
                      {tx.quantity} {tx.unit}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-slate-600 whitespace-nowrap">
                      {tx.previousStock} {tx.unit}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-bold text-slate-900 whitespace-nowrap">
                      {tx.newStock} {tx.unit}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs text-amber-700 font-semibold whitespace-nowrap">
                      {tx.reference}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500">
                      {tx.notes}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock In / Stock Out / Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {t('updateStockBtn')}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStockTx} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('products')} *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-semibold border border-slate-200 rounded-lg bg-white"
                >
                  {db.products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({t('currentStock')}: {p.currentStock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('stockOperationType')} *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Stock In', 'Stock Out', 'Adjustment'] as const).map(
                    (op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setTxType(op)}
                        className={`py-2 px-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                          txType === op
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {op}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {txType === 'Adjustment'
                      ? t('newExactStockQty')
                      : t('quantityToAdjust')}{' '}
                    ({selectedModalProduct?.unit || 'Unit'}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 text-sm font-mono-num font-bold border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('date')}
                  </label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('referenceDoc')}
                </label>
                <input
                  type="text"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="e.g. BATCH-OCT-01 or SUPPLIER-104"
                  className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg"
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
                  placeholder="Reason or supplier details..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
