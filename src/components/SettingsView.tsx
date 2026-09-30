import React, { useState } from 'react';
import {
  CheckCircle2,
  Cloud,
  Download,
  LogOut,
  RotateCcw,
  Save,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Language } from '../types';

export const SettingsView: React.FC = () => {
  const {
    db,
    lang,
    setLang,
    t,
    updateSettings,
    resetDatabaseToDemo,
    currentUser,
    signInWithGoogle,
    signOutUser,
  } = useApp();

  const [formData, setFormData] = useState({ ...db.settings });
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    if (formData.defaultLanguage !== lang) {
      setLang(formData.defaultLanguage);
    }
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3500);
  };

  const handleExportBackup = () => {
    const json = JSON.stringify(db, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Barkat_Wholesale_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('settingsHeading')}
        </h1>
        <p className="text-sm text-slate-600 mt-0.5">{t('settingsSub')}</p>
      </div>

      {savedNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{t('settingsSavedMsg')}</span>
        </div>
      )}

      {/* Cloud Sync Account Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <Cloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Firebase Cloud Database Synchronization
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              {currentUser
                ? `Signed in as ${currentUser.email}. All customers, invoices, ledgers, and stock records are automatically synced to Cloud Firestore.`
                : 'Your data is saved locally and on the server. Sign in with Google to also sync across devices via Cloud Firestore.'}
            </p>
          </div>
        </div>

        <div>
          {currentUser ? (
            <button
              type="button"
              onClick={signOutUser}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
            >
              <Cloud className="w-3.5 h-3.5 text-amber-400" />
              <span>Sign in with Google</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Business Settings Form */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-slate-200 rounded-xl p-6 space-y-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('businessNameLabel')} *
            </label>
            <input
              type="text"
              required
              value={formData.businessName}
              onChange={(e) =>
                setFormData({ ...formData, businessName: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('businessNameUrLabel')}
            </label>
            <input
              type="text"
              dir="rtl"
              value={formData.businessNameUr}
              onChange={(e) =>
                setFormData({ ...formData, businessNameUr: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-urdu border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
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
              className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('address')} (English)
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('address')} (اردو)
            </label>
            <input
              type="text"
              dir="rtl"
              value={formData.addressUr}
              onChange={(e) =>
                setFormData({ ...formData, addressUr: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-urdu border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('logoMonogramLabel')}
            </label>
            <input
              type="text"
              maxLength={3}
              value={formData.logoText}
              onChange={(e) =>
                setFormData({ ...formData, logoText: e.target.value })
              }
              className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('logoUrlLabel')}
            </label>
            <input
              type="text"
              value={formData.logoUrl}
              onChange={(e) =>
                setFormData({ ...formData, logoUrl: e.target.value })
              }
              placeholder="https://..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('currencyLabel')}
            </label>
            <input
              type="text"
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              placeholder="Rs."
              className="w-full px-3 py-2 text-sm font-mono-num font-bold border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('invoicePrefixLabel')}
            </label>
            <input
              type="text"
              value={formData.invoicePrefix}
              onChange={(e) =>
                setFormData({ ...formData, invoicePrefix: e.target.value })
              }
              placeholder="INV-"
              className="w-full px-3 py-2 text-sm font-mono-num font-bold border border-slate-200 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('defaultLanguageLabel')}
            </label>
            <select
              value={formData.defaultLanguage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  defaultLanguage: e.target.value as Language,
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="en">English (LTR)</option>
              <option value="ur">اردو (Urdu RTL)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t('defaultInvoiceLangLabel')}
            </label>
            <select
              value={formData.invoiceLanguage}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  invoiceLanguage: e.target.value as 'en' | 'ur' | 'both',
                })
              }
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white"
            >
              <option value="both">Bilingual (English + اردو)</option>
              <option value="en">English Only</option>
              <option value="ur">صرف اردو (Urdu Only)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-500 rounded-lg transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{t('saveSettingsBtn')}</span>
          </button>
        </div>
      </form>

      {/* Database Backup & Demo Reset */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-bold text-slate-900">
          {t('backupRestoreSection')}
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{t('exportBackupBtn')}</span>
          </button>

          <button
            type="button"
            onClick={() => resetDatabaseToDemo()}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('resetDemoDataBtn')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
