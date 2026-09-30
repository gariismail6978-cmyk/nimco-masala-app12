import React, { useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Boxes,
  FileText,
  LayoutDashboard,
  Menu,
  Package,
  Plus,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Wallet,
  X,
} from 'lucide-react';
import { CustomersView } from './components/CustomersView';
import { DashboardView } from './components/DashboardView';
import { InvoiceModal } from './components/InvoiceModal';
import { InvoicesView } from './components/InvoicesView';
import { LedgerView } from './components/LedgerView';
import { PaymentsView } from './components/PaymentsView';
import { ProductsView } from './components/ProductsView';
import { ReportsView } from './components/ReportsView';
import { SalesView } from './components/SalesView';
import { SettingsView } from './components/SettingsView';
import { StockView } from './components/StockView';
import { AppProvider, useApp } from './context/AppContext';
import { NavTab } from './types';

const MainShell: React.FC = () => {
  const {
    db,
    lang,
    setLang,
    t,
    activeTab,
    setActiveTab,
    activeInvoiceModal,
    setActiveInvoiceModal,
    setSelectedCustomerIdForLedger,
    formatCurrency,
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalQuery, setGlobalQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const navItems: { id: NavTab; labelKey: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      labelKey: 'dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'customers',
      labelKey: 'customers',
      icon: <Store className="w-4 h-4" />,
    },
    {
      id: 'products',
      labelKey: 'products',
      icon: <Package className="w-4 h-4" />,
    },
    {
      id: 'sales',
      labelKey: 'sales',
      icon: <ShoppingCart className="w-4 h-4" />,
    },
    {
      id: 'payments',
      labelKey: 'payments',
      icon: <Wallet className="w-4 h-4" />,
    },
    {
      id: 'invoices',
      labelKey: 'invoices',
      icon: <FileText className="w-4 h-4" />,
    },
    {
      id: 'ledger',
      labelKey: 'ledger',
      icon: <BookOpen className="w-4 h-4" />,
    },
    {
      id: 'stock',
      labelKey: 'stock',
      icon: <Boxes className="w-4 h-4" />,
    },
    {
      id: 'reports',
      labelKey: 'reports',
      icon: <BarChart3 className="w-4 h-4" />,
    },
    {
      id: 'settings',
      labelKey: 'settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  // Fast Global Search across Customers, Invoices, and Products
  const q = globalQuery.trim().toLowerCase();
  const matchedCustomers = q
    ? db.customers
        .filter(
          (c) =>
            c.storeName.toLowerCase().includes(q) ||
            c.ownerName.toLowerCase().includes(q) ||
            c.phone.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedInvoices = q
    ? db.sales
        .filter(
          (s) =>
            s.invoiceNumber.toLowerCase().includes(q) ||
            s.storeName.toLowerCase().includes(q) ||
            s.customerPhone.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const matchedProducts = q
    ? db.products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.nameUr && p.nameUr.includes(q)) ||
            p.sku.toLowerCase().includes(q)
        )
        .slice(0, 4)
    : [];

  const hasMatches =
    matchedCustomers.length > 0 ||
    matchedInvoices.length > 0 ||
    matchedProducts.length > 0;

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar Navigation */}
      <aside className="no-print hidden lg:flex lg:flex-col w-64 bg-slate-900 text-slate-200 border-e border-slate-800 shrink-0">
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-800">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold text-sm flex items-center justify-center shrink-0">
            {db.settings.logoText || 'BW'}
          </div>
          <span className="font-bold text-base text-white tracking-tight truncate">
            {t('appTitle')}
          </span>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {item.icon}
                <span>{t(item.labelKey)}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Language Switcher in Sidebar */}
        <div className="p-4 border-t border-slate-800">
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-lg">
            <button
              type="button"
              onClick={() => setLang('en')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                lang === 'en'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => setLang('ur')}
              className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                lang === 'ur'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              اردو
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-72 max-w-[82vw] bg-slate-900 text-white flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-800">
              <span className="font-bold text-base text-white">
                {t('appTitle')}
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.icon}
                    <span>{t(item.labelKey)}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract */}
        <header className="no-print h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 sticky top-0 z-30">
          {/* Zone 1: Mobile Menu Trigger + Breadcrumb / Brand */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-bold text-slate-900 whitespace-nowrap">
              {t(
                navItems.find((n) => n.id === activeTab)?.labelKey ||
                  'dashboard'
              )}
            </span>
          </div>

          {/* Zone 2: Fast Global Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={globalQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              onChange={(e) => setGlobalQuery(e.target.value)}
              placeholder={t('globalSearchPlaceholder')}
              className="w-full ps-10 pe-4 py-1.5 text-xs sm:text-sm bg-slate-100 focus:bg-white border border-transparent focus:border-amber-600 rounded-lg focus:outline-none transition-colors"
            />

            {/* Instant Search Results Dropdown */}
            {searchFocused && q.length > 0 && (
              <div className="absolute top-full mt-1.5 start-0 end-0 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 max-h-96 overflow-y-auto space-y-3">
                {!hasMatches ? (
                  <div className="text-xs text-slate-500 py-3 text-center">
                    {t('noSearchResults')}
                  </div>
                ) : (
                  <>
                    {matchedCustomers.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 px-2 mb-1">
                          {t('customers')}
                        </div>
                        {matchedCustomers.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onMouseDown={() => {
                              setSelectedCustomerIdForLedger(c.id);
                              setActiveTab('ledger');
                              setGlobalQuery('');
                            }}
                            className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-900">
                              {c.storeName} ({c.ownerName})
                            </span>
                            <span className="font-mono-num text-slate-500">
                              {c.phone}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {matchedInvoices.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 px-2 mb-1">
                          {t('invoices')}
                        </div>
                        {matchedInvoices.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onMouseDown={() => {
                              setActiveInvoiceModal(s);
                              setGlobalQuery('');
                            }}
                            className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <span className="font-mono-num font-bold text-amber-700">
                              {s.invoiceNumber} — {s.storeName}
                            </span>
                            <span className="font-mono-num font-semibold text-slate-800">
                              {formatCurrency(s.grandTotal)}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {matchedProducts.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold text-slate-400 px-2 mb-1">
                          {t('products')}
                        </div>
                        {matchedProducts.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            onMouseDown={() => {
                              setActiveTab('products');
                              setGlobalQuery('');
                            }}
                            className="w-full text-start px-2.5 py-1.5 rounded-lg hover:bg-slate-50 flex items-center justify-between text-xs"
                          >
                            <span className="font-semibold text-slate-900">
                              {p.name}
                            </span>
                            <span className="font-mono-num text-slate-600">
                              {formatCurrency(p.salePrice)}/{p.unit}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Zone 3: Language Switcher (English | اردو) + Primary Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  lang === 'en'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLang('ur')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  lang === 'ur'
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                اردو
              </button>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab('sales')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('quickSaleBtn')}</span>
            </button>
          </div>
        </header>

        {/* Active Module Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'customers' && <CustomersView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'sales' && <SalesView />}
          {activeTab === 'payments' && <PaymentsView />}
          {activeTab === 'invoices' && <InvoicesView />}
          {activeTab === 'ledger' && <LedgerView />}
          {activeTab === 'stock' && <StockView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Printable / Shareable Invoice Modal */}
      {activeInvoiceModal && (
        <InvoiceModal
          sale={activeInvoiceModal}
          onClose={() => setActiveInvoiceModal(null)}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainShell />
    </AppProvider>
  );
}
