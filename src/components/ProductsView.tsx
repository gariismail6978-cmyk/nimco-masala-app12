import React, { useState } from 'react';
import {
  AlertTriangle,
  Edit2,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Product, ProductCategory, ProductUnit } from '../types';

const CATEGORIES: ProductCategory[] = [
  'Nimco',
  'Masala',
  'Chips',
  'Spices',
  'Snacks',
  'Dry Fruits',
  'Grocery',
];

const UNITS: ProductUnit[] = [
  'KG',
  'Gram',
  'Packet',
  'Box',
  'Carton',
  'Dozen',
  'Jar',
];

export const ProductsView: React.FC = () => {
  const {
    db,
    lang,
    t,
    formatCurrency,
    addProduct,
    updateProduct,
    deleteProduct,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    nameUr: '',
    category: 'Nimco' as ProductCategory,
    unit: 'KG' as ProductUnit,
    purchasePrice: 400,
    salePrice: 520,
    currentStock: 50,
    minStockAlert: 15,
    description: '',
  });

  const openAddModal = () => {
    setEditingProduct(null);
    const nextCode = `PRD-${String(db.products.length + 1).padStart(3, '0')}`;
    setFormData({
      sku: nextCode,
      name: '',
      nameUr: '',
      category: 'Nimco',
      unit: 'KG',
      purchasePrice: 0,
      salePrice: 0,
      currentStock: 0,
      minStockAlert: 10,
      description: '',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      name: prod.name,
      nameUr: prod.nameUr || '',
      category: prod.category,
      unit: prod.unit,
      purchasePrice: prod.purchasePrice,
      salePrice: prod.salePrice,
      currentStock: prod.currentStock,
      minStockAlert: prod.minStockAlert,
      description: prod.description,
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingProduct) {
      updateProduct(editingProduct.id, {
        ...formData,
        purchasePrice: Number(formData.purchasePrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        currentStock: Number(formData.currentStock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 0,
      });
    } else {
      addProduct({
        ...formData,
        purchasePrice: Number(formData.purchasePrice) || 0,
        salePrice: Number(formData.salePrice) || 0,
        currentStock: Number(formData.currentStock) || 0,
        minStockAlert: Number(formData.minStockAlert) || 0,
      });
    }
    setIsModalOpen(false);
  };

  const filteredProducts = db.products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      (p.nameUr && p.nameUr.includes(q)) ||
      p.sku.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;

    const matchesLowStock = !lowStockOnly || p.currentStock <= p.minStockAlert;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {t('productManagement')}
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            {t('productManagementSub')}
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('addNewProduct')}</span>
        </button>
      </div>

      {/* Category Filter Bar & Search */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 start-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchProductsPlaceholder')}
              className="w-full ps-10 pe-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
            />
          </div>

          <button
            type="button"
            onClick={() => setLowStockOnly(!lowStockOnly)}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              lowStockOnly
                ? 'bg-rose-600 text-white border-rose-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('lowStockOnly')}</span>
          </button>
        </div>

        {/* Category Segmented Buttons */}
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('allCategories')} ({db.products.length})
          </button>
          {CATEGORIES.map((cat) => {
            const count = db.products.filter((p) => p.category === cat).length;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-white text-slate-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(cat)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 text-xs">
                <th className="py-3 px-4 text-start">{t('skuCode')}</th>
                <th className="py-3 px-4 text-start">{t('products')}</th>
                <th className="py-3 px-4 text-start">{t('category')}</th>
                <th className="py-3 px-4 text-start">{t('unit')}</th>
                <th className="py-3 px-4 text-end">{t('purchasePrice')}</th>
                <th className="py-3 px-4 text-end">{t('salePrice')}</th>
                <th className="py-3 px-4 text-end">{t('profitPerUnit')}</th>
                <th className="py-3 px-4 text-end">{t('currentStock')}</th>
                <th className="py-3 px-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredProducts.map((prod) => {
                const margin = prod.salePrice - prod.purchasePrice;
                const isLow = prod.currentStock <= prod.minStockAlert;
                return (
                  <tr key={prod.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono-num text-xs font-semibold text-slate-500 whitespace-nowrap">
                      {prod.sku}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">
                        {lang === 'ur' ? prod.nameUr || prod.name : prod.name}
                      </div>
                      {prod.nameUr && lang !== 'ur' && (
                        <div className="font-urdu text-xs text-slate-600">
                          {prod.nameUr}
                        </div>
                      )}
                      {prod.description && (
                        <div className="text-xs text-slate-500 mt-0.5 max-w-md truncate">
                          {prod.description}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {t(prod.category)}
                    </td>
                    <td className="py-3 px-4 font-mono-num text-xs text-slate-600 whitespace-nowrap">
                      {prod.unit}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-slate-600 whitespace-nowrap">
                      {formatCurrency(prod.purchasePrice)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num font-bold text-slate-900 whitespace-nowrap">
                      {formatCurrency(prod.salePrice)}
                    </td>
                    <td className="py-3 px-4 text-end font-mono-num text-emerald-700 font-medium whitespace-nowrap">
                      +{formatCurrency(margin)}
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap">
                      <div
                        className={`font-mono-num font-bold ${
                          isLow ? 'text-rose-700' : 'text-slate-900'
                        }`}
                      >
                        {prod.currentStock} {prod.unit}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {isLow ? (
                          <span className="text-rose-700 font-semibold">
                            {t('lowStock')} (Min: {prod.minStockAlert})
                          </span>
                        ) : (
                          <span>Min: {prod.minStockAlert}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-end whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEditModal(prod)}
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          title={t('edit')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProduct(prod.id)}
                          className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          title={t('delete')}
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

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-xl max-w-xl w-full p-6 shadow-xl">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                {editingProduct ? t('editProduct') : t('addNewProduct')}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('productName')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="e.g. Nimco Mix Special"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('productNameUr')}
                  </label>
                  <input
                    type="text"
                    dir="rtl"
                    value={formData.nameUr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameUr: e.target.value })
                    }
                    placeholder="مثال: اسپیشل مکس نمکو"
                    className="w-full px-3 py-2 text-sm font-urdu border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('category')}
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        category: e.target.value as ProductCategory,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {t(cat)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('unit')}
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unit: e.target.value as ProductUnit,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-amber-600"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u}>
                        {t(u)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('purchasePrice')} ({db.settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.purchasePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        purchasePrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('salePrice')} ({db.settings.currency}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.salePrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        salePrice: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('currentStock')} ({formData.unit}) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    required
                    value={formData.currentStock}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        currentStock: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('minStockAlert')} ({formData.unit})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStockAlert}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        minStockAlert: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm font-mono-num border border-slate-200 rounded-lg focus:outline-none focus:border-amber-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('productDescription')}
                  </label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Pack size, ingredients, or wholesale carton details..."
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
    </div>
  );
};
