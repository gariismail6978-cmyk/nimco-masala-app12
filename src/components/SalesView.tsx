import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  FileText,
  Minus,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { PaymentMethod, Product, ProductCategory } from '../types';

interface CartItem {
  productId: string;
  productName: string;
  productNameUr?: string;
  unit: string;
  availableStock: number;
  quantity: number;
  unitPrice: number;
}

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'Bank Transfer',
  'Easypaisa',
  'JazzCash',
  'Other',
];

const CATEGORIES: ProductCategory[] = [
  'Nimco',
  'Masala',
  'Chips',
  'Spices',
  'Snacks',
  'Dry Fruits',
  'Grocery',
];

export const SalesView: React.FC = () => {
  const {
    db,
    lang,
    t,
    formatCurrency,
    formatBalanceStatus,
    getNextInvoiceNumber,
    createSale,
    selectedCustomerForSale,
    setSelectedCustomerForSale,
    setActiveInvoiceModal,
  } = useApp();

  const [customerId, setCustomerId] = useState<string>(
    selectedCustomerForSale || (db.customers[0]?.id ?? '')
  );
  const [saleDate, setSaleDate] = useState<string>('2026-09-30');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [additionalCharges, setAdditionalCharges] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [notes, setNotes] = useState<string>('');

  // Product picker filters
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCustomerForSale) {
      setCustomerId(selectedCustomerForSale);
      setSelectedCustomerForSale(null);
    }
  }, [selectedCustomerForSale, setSelectedCustomerForSale]);

  const selectedCustomer = db.customers.find((c) => c.id === customerId);
  const previousBalance = selectedCustomer ? selectedCustomer.currentBalance : 0;

  // Calculations
  const subtotal = cart.reduce(
    (sum, item) => sum + Math.round(item.quantity * item.unitPrice),
    0
  );
  const grandTotal = Math.max(
    0,
    subtotal + (Number(additionalCharges) || 0) - (Number(discount) || 0)
  );
  const totalPayable = previousBalance + grandTotal;
  const newNetBalance = totalPayable - (Number(paidAmount) || 0);
  const isAdvanceAfterSale = newNetBalance < 0;
  const remainingPending = newNetBalance > 0 ? newNetBalance : 0;
  const creditAdvance = newNetBalance < 0 ? Math.abs(newNetBalance) : 0;

  const addProductToCart = (prod: Product) => {
    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === prod.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === prod.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          productId: prod.id,
          productName: prod.name,
          productNameUr: prod.nameUr,
          unit: prod.unit,
          availableStock: prod.currentStock,
          quantity: 1,
          unitPrice: prod.salePrice,
        },
      ];
    });
  };

  const updateCartQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, quantity: qty } : i))
    );
  };

  const updateCartPrice = (productId: string, price: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, unitPrice: Math.max(0, price) } : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const handleClear = () => {
    setCart([]);
    setDiscount(0);
    setAdditionalCharges(0);
    setPaidAmount(0);
    setNotes('');
    setErrorMsg(null);
  };

  const handleCompleteSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setErrorMsg('Please select a customer/store first.');
      return;
    }
    if (cart.length === 0) {
      setErrorMsg('Please add at least one product to create a sale.');
      return;
    }

    const newSale = createSale({
      customerId,
      date: saleDate,
      items: cart.map((c) => ({
        productId: c.productId,
        quantity: c.quantity,
        unitPrice: c.unitPrice,
      })),
      discount: Number(discount) || 0,
      additionalCharges: Number(additionalCharges) || 0,
      paidAmount: Number(paidAmount) || 0,
      paymentMethod,
      notes,
    });

    handleClear();
    setActiveInvoiceModal(newSale);
  };

  const filteredProducts = db.products.filter((p) => {
    const q = productSearch.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameUr && p.nameUr.includes(q)) ||
      p.sku.toLowerCase().includes(q);
    const matchesCat =
      categoryFilter === 'all' || p.category === categoryFilter;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('newSaleHeading')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">{t('newSaleSub')}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-mono-num">
            <span className="text-slate-400">{t('invoiceNumber')}: </span>
            <span className="font-bold text-amber-400">
              {getNextInvoiceNumber()}
            </span>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 cols): Product Selector Catalog */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <h2 className="text-sm font-bold text-slate-900">
            {t('selectProductsAdd')}
          </h2>

          {/* Search & Category Filter */}
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder={t('searchProductsPlaceholder')}
                className="w-full ps-9 pe-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t('viewAll')}
              </button>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-slate-900 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {t(cat)}
                </button>
              ))}
            </div>
          </div>

          {/* Product List */}
          <div className="divide-y divide-slate-200 max-h-[520px] overflow-y-auto border border-slate-200 rounded-lg">
            {filteredProducts.map((prod) => {
              const inCart = cart.find((c) => c.productId === prod.id);
              const isLow = prod.currentStock <= prod.minStockAlert;
              return (
                <div
                  key={prod.id}
                  onClick={() => addProductToCart(prod)}
                  className={`p-3 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                    inCart ? 'bg-amber-50/70 hover:bg-amber-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm text-slate-900 truncate">
                      {lang === 'ur' ? prod.nameUr || prod.name : prod.name}
                    </div>
                    {prod.nameUr && lang !== 'ur' && (
                      <div className="font-urdu text-xs text-slate-500">
                        {prod.nameUr}
                      </div>
                    )}
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                      <span>{t(prod.category)}</span>
                      <span>·</span>
                      <span
                        className={`font-mono-num ${
                          isLow ? 'text-rose-600 font-semibold' : 'text-slate-600'
                        }`}
                      >
                        {t('stockAvailable')}: {prod.currentStock} {prod.unit}
                      </span>
                    </div>
                  </div>

                  <div className="text-end shrink-0">
                    <div className="font-mono-num font-bold text-sm text-slate-900">
                      {formatCurrency(prod.salePrice)}
                      <span className="text-xs font-normal text-slate-500">
                        /{prod.unit}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="mt-1 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-amber-600 text-white rounded-md hover:bg-amber-500"
                    >
                      <Plus className="w-3 h-3" />
                      <span>
                        {inCart ? `${inCart.quantity} ${prod.unit}` : t('sales')}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column (7 cols): Invoice Builder & Calculations */}
        <form
          onSubmit={handleCompleteSale}
          className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-5 space-y-5"
        >
          {/* Step 1: Customer & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('selectCustomerStore')} *
              </label>
              <select
                required
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-sm font-semibold border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-amber-600"
              >
                <option value="" disabled>
                  {t('chooseStorePlaceholder')}
                </option>
                {db.customers.map((c) => {
                  const bal = formatBalanceStatus(c.currentBalance);
                  return (
                    <option key={c.id} value={c.id}>
                      {c.storeName} ({c.city}) — {bal.label}: {bal.formatted}
                    </option>
                  );
                })}
              </select>
              {selectedCustomer && (
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-600">
                  <span>
                    {t('ownerName')}: <strong>{selectedCustomer.ownerName}</strong>
                  </span>
                  <span>·</span>
                  <span className="font-mono-num">{selectedCustomer.phone}</span>
                  <span>·</span>
                  <span>
                    {formatBalanceStatus(selectedCustomer.currentBalance).label}:{' '}
                    <strong
                      className={`font-mono-num ${
                        selectedCustomer.currentBalance > 0
                          ? 'text-rose-700'
                          : selectedCustomer.currentBalance < 0
                          ? 'text-sky-700'
                          : 'text-slate-800'
                      }`}
                    >
                      {
                        formatBalanceStatus(selectedCustomer.currentBalance)
                          .formatted
                      }
                    </strong>
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                {t('saleDate')}
              </label>
              <input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono-num border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          {/* Step 2: Selected Products Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">
                {t('invoiceItemsTable')} ({cart.length})
              </h3>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-xs text-rose-600 hover:underline font-medium cursor-pointer"
                >
                  {t('clearCartBtn')}
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="border border-dashed border-slate-300 rounded-lg p-8 text-center text-sm text-slate-500">
                {t('noItemsInSale')}
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                      <th className="py-2.5 px-3 text-start">{t('products')}</th>
                      <th className="py-2.5 px-3 text-center">{t('qty')}</th>
                      <th className="py-2.5 px-3 text-end">{t('unitPrice')}</th>
                      <th className="py-2.5 px-3 text-end">{t('lineTotal')}</th>
                      <th className="py-2.5 px-2 text-center w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {cart.map((item) => {
                      const lineTotal = Math.round(
                        item.quantity * item.unitPrice
                      );
                      return (
                        <tr key={item.productId}>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">
                              {lang === 'ur'
                                ? item.productNameUr || item.productName
                                : item.productName}
                            </div>
                            <div className="text-xs text-slate-500 font-mono-num">
                              {t('stockAvailable')}: {item.availableStock}{' '}
                              {item.unit}
                            </div>
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartQuantity(
                                    item.productId,
                                    Math.max(0.5, item.quantity - 1)
                                  )
                                }
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <input
                                type="number"
                                min="0.1"
                                step="any"
                                value={item.quantity}
                                onChange={(e) =>
                                  updateCartQuantity(
                                    item.productId,
                                    Number(e.target.value)
                                  )
                                }
                                className="w-16 text-center px-1.5 py-1 text-sm font-mono-num font-bold border border-slate-200 rounded"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  updateCartQuantity(
                                    item.productId,
                                    item.quantity + 1
                                  )
                                }
                                className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-xs text-slate-500 ms-1">
                                {item.unit}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 text-end">
                            <input
                              type="number"
                              min="0"
                              value={item.unitPrice}
                              onChange={(e) =>
                                updateCartPrice(
                                  item.productId,
                                  Number(e.target.value)
                                )
                              }
                              className="w-24 text-end px-2 py-1 text-sm font-mono-num border border-slate-200 rounded"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-end font-mono-num font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(lineTotal)}
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.productId)}
                              className="p-1 text-rose-600 hover:bg-rose-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Step 3: Pricing, Discount, Paid Amount & Automatic Balance Calculation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t border-slate-200">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('discount')} ({db.settings.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                  className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('additionalCharges')} ({db.settings.currency})
                </label>
                <input
                  type="number"
                  min="0"
                  value={additionalCharges}
                  onChange={(e) =>
                    setAdditionalCharges(Math.max(0, Number(e.target.value)))
                  }
                  className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('paymentMethod')}
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('notes')}
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('saleNotesPlaceholder')}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* Live Totals & Balance Box */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>{t('subtotal')}:</span>
                  <span className="font-mono-num font-semibold text-slate-900">
                    {formatCurrency(subtotal)}
                  </span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-emerald-700 text-xs">
                    <span>{t('discount')}:</span>
                    <span className="font-mono-num">
                      -{formatCurrency(discount)}
                    </span>
                  </div>
                )}

                {additionalCharges > 0 && (
                  <div className="flex justify-between text-slate-700 text-xs">
                    <span>{t('additionalCharges')}:</span>
                    <span className="font-mono-num">
                      +{formatCurrency(additionalCharges)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-base text-slate-900">
                  <span>{t('grandTotal')}:</span>
                  <span className="font-mono-num text-amber-700">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                <div className="flex justify-between text-xs text-slate-600 pt-1">
                  <span>{t('previousBalanceLabel')}:</span>
                  <span className="font-mono-num">
                    {formatCurrency(previousBalance)}
                  </span>
                </div>

                <div className="flex justify-between text-xs font-bold text-slate-800">
                  <span>{t('totalPayableWithPrev')}:</span>
                  <span className="font-mono-num">
                    {formatCurrency(totalPayable)}
                  </span>
                </div>

                {/* Amount Paid Input */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-emerald-800">
                      {t('amountPaidNow')} ({db.settings.currency})
                    </label>
                    <button
                      type="button"
                      onClick={() => setPaidAmount(grandTotal)}
                      className="text-[11px] font-semibold text-amber-700 hover:underline cursor-pointer"
                    >
                      Pay Full Bill ({formatCurrency(grandTotal)})
                    </button>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={paidAmount}
                    onChange={(e) =>
                      setPaidAmount(Math.max(0, Number(e.target.value)))
                    }
                    className="w-full px-3 py-2 text-base font-mono-num font-bold text-emerald-800 bg-white border-2 border-emerald-500 rounded-lg focus:outline-none"
                  />
                </div>

                {/* Automatic Pending / Advance Calculation Result */}
                <div
                  className={`flex justify-between items-center pt-3 border-t border-slate-300 font-bold text-base ${
                    isAdvanceAfterSale ? 'text-sky-700' : 'text-rose-700'
                  }`}
                >
                  <span>
                    {isAdvanceAfterSale
                      ? t('newCreditAdvanceBalance')
                      : t('remainingPendingBalance')}
                    :
                  </span>
                  <span className="font-mono-num text-lg">
                    {formatCurrency(
                      isAdvanceAfterSale ? creditAdvance : remainingPending
                    )}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-amber-400" />
                <span>{t('completeSaleBtn')}</span>
                <FileText className="w-4 h-4 ms-1 opacity-75" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
