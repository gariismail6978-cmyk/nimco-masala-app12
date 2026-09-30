import React, { useState } from 'react';
import {
  BookOpen,
  Edit2,
  Eye,
  MessageCircle,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Customer, CustomerType } from '../types';

const CUSTOMER_TYPES: CustomerType[] = [
  'Wholesale',
  'Retail',
  'Distributor',
  'Supermarket',
];

export const CustomersView: React.FC = () => {
  const {
    db,
    lang,
    t,
    formatCurrency,
    formatBalanceStatus,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    setActiveTab,
    setSelectedCustomerIdForLedger,
    setSelectedCustomerForSale,
    setSelectedCustomerForPayment,
    setActiveInvoiceModal,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'pending' | 'advance' | 'settled'>('all');

  // Add / Edit Customer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState({
    storeName: '',
    ownerName: '',
    phone: '',
    whatsapp: '',
    address: '',
    city: '',
    customerType: 'Retail' as CustomerType,
    openingBalance: 0,
    notes: '',
  });

  // Detailed Customer Account Drawer/Modal State
  const [viewingCustomer, setViewingCustomer] = useState<Customer | null>(null);

  const openAddModal = () => {
    setEditingCustomer(null);
    setFormData({
      storeName: '',
      ownerName: '',
      phone: '',
      whatsapp: '',
      address: '',
      city: 'Lahore',
      customerType: 'Retail',
      openingBalance: 0,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setFormData({
      storeName: cust.storeName,
      ownerName: cust.ownerName,
      phone: cust.phone,
      whatsapp: cust.whatsapp,
      address: cust.address,
      city: cust.city,
      customerType: cust.customerType,
      openingBalance: cust.openingBalance,
      notes: cust.notes,
    });
    setIsModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.storeName.trim()) return;

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        ...formData,
        openingBalance: Number(formData.openingBalance) || 0,
      });
    } else {
      addCustomer({
        ...formData,
        openingBalance: Number(formData.openingBalance) || 0,
      });
    }
    setIsModalOpen(false);
  };

  const filteredCustomers = db.customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      c.storeName.toLowerCase().includes(q) ||
      c.ownerName.toLowerCase().includes(q) ||
      c.phone.toLowerCase().includes(q) ||
      c.whatsapp.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q);

    const matchesType = typeFilter === 'all' || c.customerType === typeFilter;

    const balStatus = formatBalanceStatus(c.currentBalance).type;
    const matchesBal = balanceFilter === 'all' || balStatus === balanceFilter;

    return matchesSearch && matchesType && matchesBal;
  });

  // Keep viewingCustomer synced with latest DB
  const activeViewingCustomer = viewingCustomer
    ? db.customers.find((c) => c.id === viewingCustomer.id) || null
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('customerManagement')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('customerManagementSub')}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewCustomer')}</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('searchCustomersPlaceholder')}
            className="w-full ps-10 pe-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Balance Filter Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {(['all', 'pending', 'advance', 'settled'] as const).map((bf) => (
              <button
                key={bf}
                type="button"
                onClick={() => setBalanceFilter(bf)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  balanceFilter === bf
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {bf === 'all'
                  ? t('viewAll')
                  : bf === 'pending'
                  ? t('pendingBalance')
                  : bf === 'advance'
                  ? t('creditAdvance')
                  : t('settled')}
              </button>
            ))}
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-amber-600"
          >
            <option value="all">{t('customerType')}: {t('viewAll')}</option>
            {CUSTOMER_TYPES.map((ct) => (
              <option key={ct} value={ct}>
                {t(ct)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Customers Directory Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <th className="py-3 px-4 text-start">{t('storeName')}</th>
                <th className="py-3 px-4 text-start">{t('ownerName')}</th>
                <th className="py-3 px-4 text-start">{t('phoneNumber')}</th>
                <th className="py-3 px-4 text-start">{t('city')}</th>
                <th className="py-3 px-4 text-end">{t('openingBalance')}</th>
                <th className="py-3 px-4 text-end">{t('totalPurchased')}</th>
                <th className="py-3 px-4 text-end">{t('totalPaid')}</th>
                <th className="py-3 px-4 text-end">{t('currentBalance')}</th>
                <th className="py-3 px-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredCustomers.map((cust) => {
                const balInfo = formatBalanceStatus(cust.currentBalance);
                return (
                  <tr key={cust.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() => setViewingCustomer(cust)}
                        className="font-bold text-slate-900 hover:text-amber-700 text-start cursor-pointer"
                      >
                        {cust.storeName}
                      </button>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {t(cust.customerType)}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-800">{cust.ownerName}</td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-700 whitespace-nowrap">
                      {cust.phone}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{cust.city}</td>
                    <td className="py-3 px-4 text-end font-mono-num text-slate-600 whitespace-nowrap">
                      {formatCurrency(cust.openingBalance)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-slate-900 font-medium whitespace-nowrap">
                      {formatCurrency(cust.totalSales)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-emerald-700 font-medium whitespace-nowrap">
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
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setViewingCustomer(cust)}
                          title={t('customerAccountDetails')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-md transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('viewLedger')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerForSale(cust.id);
                            setActiveTab('sales');
                          }}
                          title={t('newInvoice')}
                          className="p-1.5 text-amber-700 hover:bg-amber-50 rounded-md transition-colors cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCustomerForPayment(cust.id);
                            setActiveTab('payments');
                          }}
                          title={t('receivePayment')}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Wallet className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditModal(cust)}
                          title={t('edit')}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomer(cust.id)}
                          title={t('delete')}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingCustomer ? t('editCustomer') : t('addNewCustomer')}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('storeName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeName}
                    onChange={(e) =>
                      setFormData({ ...formData, storeName: e.target.value })
                    }
                    placeholder="e.g. ABC General Store"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('ownerName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ownerName}
                    onChange={(e) =>
                      setFormData({ ...formData, ownerName: e.target.value })
                    }
                    placeholder="e.g. Haji Muhammad Tariq"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('phoneNumber')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="0300-1234567"
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('whatsappNumber')}
                  </label>
                  <input
                    type="text"
                    value={formData.whatsapp}
                    onChange={(e) =>
                      setFormData({ ...formData, whatsapp: e.target.value })
                    }
                    placeholder="923001234567"
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('city')}
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="Lahore, Karachi, Rawalpindi..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('customerType')}
                  </label>
                  <select
                    value={formData.customerType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customerType: e.target.value as CustomerType,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
                  >
                    {CUSTOMER_TYPES.map((ct) => (
                      <option key={ct} value={ct}>
                        {t(ct)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('address')}
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData({ ...formData, address: e.target.value })
                    }
                    placeholder="Shop #, Market Name, Area"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('openingBalance')} ({db.settings.currency})
                  </label>
                  <input
                    type="number"
                    value={formData.openingBalance}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        openingBalance: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('notes')}
                  </label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Credit terms, delivery day..."
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Customer Account / Ledger Modal */}
      {activeViewingCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Top Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-slate-900 text-white">
              <div>
                <h2 className="text-lg font-bold">{activeViewingCustomer.storeName}</h2>
                <div className="text-xs text-slate-300 flex flex-wrap items-center gap-2 mt-0.5">
                  <span>{activeViewingCustomer.ownerName}</span>
                  <span>·</span>
                  <span className="font-mono-num">{activeViewingCustomer.phone}</span>
                  <span>·</span>
                  <span>
                    {activeViewingCustomer.address}, {activeViewingCustomer.city}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = activeViewingCustomer.id;
                    setViewingCustomer(null);
                    setSelectedCustomerIdForLedger(id);
                    setActiveTab('ledger');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg transition-colors cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{t('ledger')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = activeViewingCustomer.id;
                    setViewingCustomer(null);
                    setSelectedCustomerForSale(id);
                    setActiveTab('sales');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{t('newInvoice')}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const id = activeViewingCustomer.id;
                    setViewingCustomer(null);
                    setSelectedCustomerForPayment(id);
                    setActiveTab('payments');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer"
                >
                  <Wallet className="w-3.5 h-3.5" />
                  <span>{t('receivePayment')}</span>
                </button>

                <a
                  href={`https://wa.me/${(
                    activeViewingCustomer.whatsapp || activeViewingCustomer.phone
                  ).replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                    `Assalam-o-Alaikum ${activeViewingCustomer.storeName},\nAccount Summary with ${db.settings.businessName}:\nOpening Balance: ${formatCurrency(activeViewingCustomer.openingBalance)}\nTotal Purchased: ${formatCurrency(activeViewingCustomer.totalSales)}\nTotal Paid: ${formatCurrency(activeViewingCustomer.totalPaid)}\nCurrent Balance: ${formatBalanceStatus(activeViewingCustomer.currentBalance).formatted} (${formatBalanceStatus(activeViewingCustomer.currentBalance).label})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700 transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <button
                  type="button"
                  onClick={() => setViewingCustomer(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary KPI Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">{t('openingBalance')}</div>
                  <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                    {formatCurrency(activeViewingCustomer.openingBalance)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">{t('totalPurchased')}</div>
                  <div className="text-lg font-bold font-mono-num text-slate-900 mt-1">
                    {formatCurrency(activeViewingCustomer.totalSales)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">{t('totalPaid')}</div>
                  <div className="text-lg font-bold font-mono-num text-emerald-700 mt-1">
                    {formatCurrency(activeViewingCustomer.totalPaid)}
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="text-xs text-slate-500">
                    {formatBalanceStatus(activeViewingCustomer.currentBalance).label}
                  </div>
                  <div
                    className={`text-lg font-bold font-mono-num mt-1 ${
                      activeViewingCustomer.currentBalance > 0
                        ? 'text-rose-700'
                        : activeViewingCustomer.currentBalance < 0
                        ? 'text-sky-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {formatBalanceStatus(activeViewingCustomer.currentBalance).formatted}
                  </div>
                </div>
              </div>

              {/* 1. Products Purchased History */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-2.5">
                  {t('purchasedProductsHistory')}
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                        <th className="py-2 px-3 text-start">{t('date')}</th>
                        <th className="py-2 px-3 text-start">{t('invoiceNumber')}</th>
                        <th className="py-2 px-3 text-start">{t('products')}</th>
                        <th className="py-2 px-3 text-end">{t('qty')}</th>
                        <th className="py-2 px-3 text-end">{t('unitPrice')}</th>
                        <th className="py-2 px-3 text-end">{t('lineTotal')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {db.sales
                        .filter((s) => s.customerId === activeViewingCustomer.id)
                        .flatMap((s) =>
                          s.items.map((it) => ({
                            ...it,
                            date: s.date,
                            saleObj: s,
                          }))
                        )
                        .map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono-num text-slate-600">
                              {item.date}
                            </td>
                            <td className="py-2 px-3 font-mono-num font-semibold text-amber-700">
                              <button
                                type="button"
                                onClick={() => setActiveInvoiceModal(item.saleObj)}
                                className="hover:underline cursor-pointer"
                              >
                                {item.invoiceNumber}
                              </button>
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900">
                              {lang === 'ur'
                                ? item.productNameUr || item.productName
                                : item.productName}
                            </td>
                            <td className="py-2 px-3 text-end font-mono-num">
                              {item.quantity} {item.unit}
                            </td>
                            <td className="py-2 px-3 text-end font-mono-num">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-2 px-3 text-end font-mono-num font-semibold text-slate-900">
                              {formatCurrency(item.total)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 2. Invoice History & 3. Payment History Side by Side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2.5">
                    {t('invoiceHistory')}
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2 px-3 text-start">{t('date')}</th>
                          <th className="py-2 px-3 text-start">{t('invoiceNumber')}</th>
                          <th className="py-2 px-3 text-end">{t('grandTotal')}</th>
                          <th className="py-2 px-3 text-end">{t('totalPaid')}</th>
                          <th className="py-2 px-3 text-end">{t('pendingBalance')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {db.sales
                          .filter((s) => s.customerId === activeViewingCustomer.id)
                          .map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono-num text-slate-600">
                                {s.date}
                              </td>
                              <td className="py-2 px-3 font-mono-num font-semibold text-amber-700">
                                <button
                                  type="button"
                                  onClick={() => setActiveInvoiceModal(s)}
                                  className="hover:underline cursor-pointer"
                                >
                                  {s.invoiceNumber}
                                </button>
                              </td>
                              <td className="py-2 px-3 text-end font-mono-num font-semibold">
                                {formatCurrency(s.grandTotal)}
                              </td>
                              <td className="py-2 px-3 text-end font-mono-num text-emerald-700">
                                {formatCurrency(s.paidAmount)}
                              </td>
                              <td className="py-2 px-3 text-end font-mono-num text-rose-700 font-semibold">
                                {formatCurrency(s.invoicePending)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-2.5">
                    {t('paymentHistory')}
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-x-auto">
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                          <th className="py-2 px-3 text-start">{t('date')}</th>
                          <th className="py-2 px-3 text-start">{t('receiptNo')}</th>
                          <th className="py-2 px-3 text-start">{t('paymentMethod')}</th>
                          <th className="py-2 px-3 text-end">{t('amount')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {db.payments
                          .filter((p) => p.customerId === activeViewingCustomer.id)
                          .map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="py-2 px-3 font-mono-num text-slate-600">
                                {p.date}
                              </td>
                              <td className="py-2 px-3 font-mono-num font-medium text-slate-800">
                                {p.receiptNumber}
                              </td>
                              <td className="py-2 px-3 text-slate-700">
                                {t(p.paymentMethod)}
                              </td>
                              <td className="py-2 px-3 text-end font-mono-num font-semibold text-emerald-700">
                                {formatCurrency(p.amount)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
