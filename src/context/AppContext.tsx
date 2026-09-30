import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initialSeedDatabase } from '../data/seedData';
import { auth, dbFirestore, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import { translations } from '../i18n/translations';
import {
  BusinessSettings,
  Customer,
  DatabaseSchema,
  Language,
  LedgerEntry,
  NavTab,
  Payment,
  PaymentMethod,
  Product,
  Sale,
  SaleItem,
  SaleStatus,
  StockTransaction,
  StockTransactionType,
} from '../types';

const LOCAL_STORAGE_KEY = 'barkat_wholesale_erp_db_v1';
const LANG_STORAGE_KEY = 'barkat_wholesale_erp_lang_v1';

interface CreateSaleInput {
  customerId: string;
  date: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
  }[];
  discount: number;
  additionalCharges: number;
  paidAmount: number;
  paymentMethod: PaymentMethod;
  notes: string;
}

interface RecordPaymentInput {
  customerId: string;
  date: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  notes: string;
}

interface AdjustStockInput {
  productId: string;
  type: StockTransactionType;
  quantity: number;
  reference: string;
  date: string;
  notes: string;
}

interface AppContextType {
  db: DatabaseSchema;
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
  isRtl: boolean;
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  selectedCustomerIdForLedger: string | null;
  setSelectedCustomerIdForLedger: (id: string | null) => void;
  selectedCustomerForSale: string | null;
  setSelectedCustomerForSale: (id: string | null) => void;
  selectedCustomerForPayment: string | null;
  setSelectedCustomerForPayment: (id: string | null) => void;
  activeInvoiceModal: Sale | null;
  setActiveInvoiceModal: (sale: Sale | null) => void;

  // Formatters
  formatCurrency: (amount: number) => string;
  getPendingAmount: (balance: number) => number;
  getAdvanceCreditAmount: (balance: number) => number;
  formatBalanceStatus: (balance: number) => {
    type: 'pending' | 'advance' | 'settled';
    amount: number;
    formatted: string;
    label: string;
  };
  getNextInvoiceNumber: () => string;

  // Customer CRUD
  addCustomer: (data: Omit<Customer, 'id' | 'currentBalance' | 'totalSales' | 'totalPaid' | 'createdAt'>) => Customer;
  updateCustomer: (id: string, data: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  getCustomerLedger: (customerId: string) => LedgerEntry[];

  // Product CRUD
  addProduct: (data: Omit<Product, 'id' | 'createdAt'>) => Product;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;

  // Sales & Invoices
  createSale: (input: CreateSaleInput) => Sale;

  // Payments
  recordPayment: (input: RecordPaymentInput) => Payment;

  // Stock
  adjustStock: (input: AdjustStockInput) => StockTransaction;

  // Settings & System
  updateSettings: (settings: Partial<BusinessSettings>) => void;
  resetDatabaseToDemo: () => Promise<void>;
  currentUser: User | null;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

/**
 * Recalculates a customer's totalSales, totalPaid, and currentBalance from their openingBalance, sales, and standalone payments
 * so that mathematical invariants are 100% guaranteed at all times.
 */
function recalculateCustomerTotals(
  customer: Customer,
  sales: Sale[],
  payments: Payment[]
): Customer {
  const custSales = sales.filter((s) => s.customerId === customer.id);
  // Standalone payments (payments not already counted inside sale.paidAmount, or we can sum ALL payments since every sale with paidAmount > 0 also creates a payment record)
  const custPayments = payments.filter((p) => p.customerId === customer.id);

  const totalSales = custSales.reduce((acc, s) => acc + Number(s.grandTotal || 0), 0);
  const totalPaid = custPayments.reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const currentBalance = Number(customer.openingBalance || 0) + totalSales - totalPaid;

  return {
    ...customer,
    totalSales,
    totalPaid,
    currentBalance,
  };
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<DatabaseSchema>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as DatabaseSchema;
        if (parsed && Array.isArray(parsed.customers) && Array.isArray(parsed.products)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to load DB from localStorage:', e);
    }
    return initialSeedDatabase;
  });

  const [lang, setLangState] = useState<Language>(() => {
    const savedLang = localStorage.getItem(LANG_STORAGE_KEY);
    if (savedLang === 'en' || savedLang === 'ur') return savedLang;
    return initialSeedDatabase.settings.defaultLanguage || 'en';
  });

  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [selectedCustomerIdForLedger, setSelectedCustomerIdForLedger] = useState<string | null>('cust-1');
  const [selectedCustomerForSale, setSelectedCustomerForSale] = useState<string | null>(null);
  const [selectedCustomerForPayment, setSelectedCustomerForPayment] = useState<string | null>(null);
  const [activeInvoiceModal, setActiveInvoiceModal] = useState<Sale | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Listen to Firebase Auth state and load cloud workspace if signed in
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        const wsPath = `workspaces/${user.uid}`;
        try {
          const snap = await getDoc(doc(dbFirestore, 'workspaces', user.uid));
          if (snap.exists()) {
            const data = snap.data();
            if (data.db && Array.isArray(data.db.customers)) {
              setDb(data.db as DatabaseSchema);
              localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data.db));
            }
          } else {
            await setDoc(doc(dbFirestore, 'workspaces', user.uid), {
              ownerId: user.uid,
              updatedAt: new Date().toISOString(),
              db,
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, wsPath);
        }
      }
    });
    return () => unsub();
  }, []);

  // Sync with backend server on mount
  useEffect(() => {
    let mounted = true;
    fetch('/api/db')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverDb: DatabaseSchema | null) => {
        if (!mounted || !serverDb || !Array.isArray(serverDb.customers)) return;
        const localSaved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (!localSaved) {
          setDb(serverDb);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(serverDb));
        }
      })
      .catch(() => {
        // Offline or preview fallback uses localStorage seamlessly
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Persist DB changes to localStorage, Express backend, and Firestore
  const persistDatabase = (nextDb: DatabaseSchema) => {
    setDb(nextDb);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(nextDb));
    } catch (e) {
      console.error('Failed to save DB to localStorage:', e);
    }
    fetch('/api/db', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextDb),
    }).catch(() => {
      // Handled by localStorage when offline
    });
    if (auth.currentUser) {
      const wsPath = `workspaces/${auth.currentUser.uid}`;
      setDoc(doc(dbFirestore, 'workspaces', auth.currentUser.uid), {
        ownerId: auth.currentUser.uid,
        updatedAt: new Date().toISOString(),
        db: nextDb,
      }).catch((err) => {
        handleFirestoreError(err, OperationType.WRITE, wsPath);
      });
    }
  };

  // Update HTML dir and lang attributes for Urdu RTL support
  useEffect(() => {
    const isUrdu = lang === 'ur';
    document.documentElement.dir = isUrdu ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  }, [lang]);

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
  };

  const t = (key: string): string => {
    return translations[lang][key] ?? translations.en[key] ?? key;
  };

  const isRtl = lang === 'ur';

  const formatCurrency = (amount: number): string => {
    const currency = db.settings.currency || 'Rs.';
    const safeNum = Number.isFinite(amount) ? Math.round(amount) : 0;
    return `${currency} ${safeNum.toLocaleString('en-PK')}`;
  };

  const getPendingAmount = (balance: number): number => {
    return balance > 0 ? Math.round(balance) : 0;
  };

  const getAdvanceCreditAmount = (balance: number): number => {
    return balance < 0 ? Math.round(Math.abs(balance)) : 0;
  };

  const formatBalanceStatus = (balance: number) => {
    const rounded = Math.round(balance);
    if (rounded > 0) {
      return {
        type: 'pending' as const,
        amount: rounded,
        formatted: formatCurrency(rounded),
        label: t('pendingBalance'),
      };
    }
    if (rounded < 0) {
      const credit = Math.abs(rounded);
      return {
        type: 'advance' as const,
        amount: credit,
        formatted: formatCurrency(credit),
        label: t('creditAdvance'),
      };
    }
    return {
      type: 'settled' as const,
      amount: 0,
      formatted: formatCurrency(0),
      label: t('settled'),
    };
  };

  const getNextInvoiceNumber = (): string => {
    const prefix = db.settings.invoicePrefix || 'INV-';
    let seq = db.settings.nextInvoiceSequence || db.sales.length + 1;
    const existingSet = new Set(db.sales.map((s) => s.invoiceNumber.toUpperCase()));
    let candidate = `${prefix}${String(seq).padStart(5, '0')}`;
    while (existingSet.has(candidate.toUpperCase())) {
      seq += 1;
      candidate = `${prefix}${String(seq).padStart(5, '0')}`;
    }
    return candidate;
  };

  // --- CUSTOMER OPERATIONS ---
  const addCustomer = (
    data: Omit<Customer, 'id' | 'currentBalance' | 'totalSales' | 'totalPaid' | 'createdAt'>
  ): Customer => {
    const openingBal = Number(data.openingBalance) || 0;
    const newCustomer: Customer = {
      ...data,
      id: `cust-${Date.now()}`,
      openingBalance: openingBal,
      currentBalance: openingBal,
      totalSales: 0,
      totalPaid: 0,
      createdAt: new Date().toISOString(),
    };
    const nextDb: DatabaseSchema = {
      ...db,
      customers: [newCustomer, ...db.customers],
    };
    persistDatabase(nextDb);
    return newCustomer;
  };

  const updateCustomer = (id: string, data: Partial<Customer>) => {
    const nextCustomers = db.customers.map((c) => {
      if (c.id !== id) return c;
      const updated = { ...c, ...data };
      return recalculateCustomerTotals(updated, db.sales, db.payments);
    });
    persistDatabase({ ...db, customers: nextCustomers });
  };

  const deleteCustomer = (id: string) => {
    persistDatabase({
      ...db,
      customers: db.customers.filter((c) => c.id !== id),
    });
  };

  // Build chronological customer ledger
  const getCustomerLedger = (customerId: string): LedgerEntry[] => {
    const customer = db.customers.find((c) => c.id === customerId);
    if (!customer) return [];

    const entries: LedgerEntry[] = [];
    let runningBalance = Number(customer.openingBalance || 0);

    entries.push({
      id: `open-${customer.id}`,
      date: customer.createdAt.slice(0, 10),
      createdAt: customer.createdAt,
      referenceNumber: 'OPEN-BAL',
      type: 'Opening Balance',
      description: 'Opening Account Balance',
      descriptionUr: 'ابتدائی بقایا بیلنس (اوپننگ بیلنس)',
      debitSale: runningBalance > 0 ? runningBalance : 0,
      creditPayment: runningBalance < 0 ? Math.abs(runningBalance) : 0,
      runningBalance,
    });

    // Combine sales and standalone payments chronologically
    type RawEvent =
      | { kind: 'sale'; date: string; createdAt: string; sale: Sale }
      | { kind: 'payment'; date: string; createdAt: string; payment: Payment };

    const events: RawEvent[] = [];

    db.sales
      .filter((s) => s.customerId === customerId)
      .forEach((sale) => {
        events.push({
          kind: 'sale',
          date: sale.date,
          createdAt: sale.createdAt,
          sale,
        });
      });

    // Standalone payments (where saleId is not set, because payments made at the time of sale can be shown right after or as part of the sale ledger flow)
    db.payments
      .filter((p) => p.customerId === customerId && !p.saleId)
      .forEach((payment) => {
        events.push({
          kind: 'payment',
          date: payment.date,
          createdAt: payment.createdAt,
          payment,
        });
      });

    events.sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.createdAt.localeCompare(b.createdAt);
    });

    events.forEach((ev) => {
      if (ev.kind === 'sale') {
        const s = ev.sale;
        const itemsSummary = s.items
          .map((i) => `${i.productName} (${i.quantity} ${i.unit} × ${i.unitPrice})`)
          .join(', ');
        const itemsSummaryUr = s.items
          .map((i) => `${i.productNameUr || i.productName} (${i.quantity} ${i.unit} × ${i.unitPrice})`)
          .join('، ');

        // 1. Add the Sale Debit entry or Combined Sale + Paid entry
        runningBalance = runningBalance + s.grandTotal - s.paidAmount;
        entries.push({
          id: `led-sale-${s.id}`,
          date: s.date,
          createdAt: s.createdAt,
          referenceNumber: s.invoiceNumber,
          type: 'Sale',
          description: `Sale Invoice ${s.invoiceNumber}: ${itemsSummary}`,
          descriptionUr: `بل نمبر ${s.invoiceNumber}: ${itemsSummaryUr}`,
          itemsSummary,
          debitSale: s.grandTotal,
          creditPayment: s.paidAmount,
          runningBalance,
          saleObj: s,
        });
      } else {
        const p = ev.payment;
        runningBalance = runningBalance - p.amount;
        entries.push({
          id: `led-pay-${p.id}`,
          date: p.date,
          createdAt: p.createdAt,
          referenceNumber: p.receiptNumber,
          type: 'Payment',
          description: `Payment Received (${p.paymentMethod})${p.referenceNumber ? ` - Ref: ${p.referenceNumber}` : ''}${p.notes ? ` - ${p.notes}` : ''}`,
          descriptionUr: `وصولی (${p.paymentMethod})${p.referenceNumber ? ` - حوالہ: ${p.referenceNumber}` : ''}${p.notes ? ` - ${p.notes}` : ''}`,
          debitSale: 0,
          creditPayment: p.amount,
          runningBalance,
          paymentObj: p,
        });
      }
    });

    return entries;
  };

  // --- PRODUCT OPERATIONS ---
  const addProduct = (data: Omit<Product, 'id' | 'createdAt'>): Product => {
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...data,
      id: `prod-${Date.now()}`,
      purchasePrice: Number(data.purchasePrice) || 0,
      salePrice: Number(data.salePrice) || 0,
      currentStock: Number(data.currentStock) || 0,
      minStockAlert: Number(data.minStockAlert) || 0,
      createdAt: now,
    };

    const nextStockTx: StockTransaction[] = [...db.stockTransactions];
    if (newProduct.currentStock > 0) {
      nextStockTx.unshift({
        id: `stk-${Date.now()}`,
        productId: newProduct.id,
        productName: newProduct.name,
        productNameUr: newProduct.nameUr,
        category: newProduct.category,
        unit: newProduct.unit,
        type: 'Stock In',
        quantity: newProduct.currentStock,
        previousStock: 0,
        newStock: newProduct.currentStock,
        reference: 'OPENING-STOCK',
        date: now.slice(0, 10),
        notes: 'Initial opening stock upon product creation',
        createdAt: now,
      });
    }

    persistDatabase({
      ...db,
      products: [newProduct, ...db.products],
      stockTransactions: nextStockTx,
    });
    return newProduct;
  };

  const updateProduct = (id: string, data: Partial<Product>) => {
    const nextProducts = db.products.map((p) => (p.id === id ? { ...p, ...data } : p));
    persistDatabase({ ...db, products: nextProducts });
  };

  const deleteProduct = (id: string) => {
    persistDatabase({
      ...db,
      products: db.products.filter((p) => p.id !== id),
    });
  };

  // --- CREATE NEW SALE ---
  const createSale = (input: CreateSaleInput): Sale => {
    const customer = db.customers.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const now = new Date().toISOString();
    const invoiceNumber = getNextInvoiceNumber();
    const saleId = `sale-${Date.now()}`;

    const saleItems: SaleItem[] = input.items.map((item, idx) => {
      const product = db.products.find((p) => p.id === item.productId);
      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }
      const qty = Math.max(0.01, Number(item.quantity) || 0);
      const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
      const lineTotal = Math.round(qty * unitPrice);
      return {
        id: `sitem-${Date.now()}-${idx}`,
        saleId,
        invoiceNumber,
        productId: product.id,
        productName: product.name,
        productNameUr: product.nameUr,
        category: product.category,
        unit: product.unit,
        quantity: qty,
        purchasePrice: product.purchasePrice,
        unitPrice,
        total: lineTotal,
      };
    });

    const subtotal = saleItems.reduce((sum, item) => sum + item.total, 0);
    const discount = Math.max(0, Number(input.discount) || 0);
    const additionalCharges = Math.max(0, Number(input.additionalCharges) || 0);
    // Formula: Grand Total = Subtotal + Additional Charges - Discount
    const grandTotal = Math.max(0, subtotal + additionalCharges - discount);
    const paidAmount = Math.max(0, Number(input.paidAmount) || 0);
    const invoicePending = Math.max(0, grandTotal - paidAmount);

    const previousBalance = customer.currentBalance;
    // Formula: Pending Amount = Previous Balance + Grand Total - Amount Paid
    const newBalance = previousBalance + grandTotal - paidAmount;

    let status: SaleStatus = 'Pending';
    if (paidAmount >= grandTotal && grandTotal > 0) {
      status = 'Paid';
    } else if (paidAmount > 0 && paidAmount < grandTotal) {
      status = 'Partially Paid';
    } else if (grandTotal === 0) {
      status = 'Paid';
    }

    const newSale: Sale = {
      id: saleId,
      invoiceNumber,
      customerId: customer.id,
      storeName: customer.storeName,
      ownerName: customer.ownerName,
      customerPhone: customer.phone,
      customerWhatsapp: customer.whatsapp || customer.phone,
      customerAddress: customer.address,
      customerCity: customer.city,
      date: input.date || now.slice(0, 10),
      items: saleItems,
      subtotal,
      discount,
      additionalCharges,
      grandTotal,
      paidAmount,
      invoicePending,
      previousBalance,
      newBalance,
      status,
      paymentMethod: input.paymentMethod,
      notes: input.notes,
      createdAt: now,
    };

    // 1. Reduce product stock and create stockTransactions
    const newStockTxs: StockTransaction[] = [];
    const nextProducts = db.products.map((prod) => {
      const soldItemsForProd = saleItems.filter((si) => si.productId === prod.id);
      if (soldItemsForProd.length === 0) return prod;

      const totalQtySold = soldItemsForProd.reduce((sum, si) => sum + si.quantity, 0);
      const prevStock = prod.currentStock;
      const remainingStock = Math.max(0, Number((prevStock - totalQtySold).toFixed(2)));

      newStockTxs.push({
        id: `stk-${Date.now()}-${prod.id}`,
        productId: prod.id,
        productName: prod.name,
        productNameUr: prod.nameUr,
        category: prod.category,
        unit: prod.unit,
        type: 'Sale',
        quantity: totalQtySold,
        previousStock: prevStock,
        newStock: remainingStock,
        reference: invoiceNumber,
        date: newSale.date,
        notes: `Sold to ${customer.storeName} (${invoiceNumber})`,
        createdAt: now,
      });

      return {
        ...prod,
        currentStock: remainingStock,
      };
    });

    // 2. If paidAmount > 0, record in payments table linked to this invoice
    const nextPayments = [...db.payments];
    let nextReceiptSeq = db.settings.nextReceiptSequence || db.payments.length + 1;
    if (paidAmount > 0) {
      const receiptNumber = `PAY-${String(nextReceiptSeq).padStart(5, '0')}`;
      nextReceiptSeq += 1;
      nextPayments.unshift({
        id: `pay-${Date.now()}`,
        receiptNumber,
        customerId: customer.id,
        storeName: customer.storeName,
        date: newSale.date,
        amount: paidAmount,
        paymentMethod: input.paymentMethod,
        referenceNumber: `${input.paymentMethod.toUpperCase()}-${invoiceNumber}`,
        previousBalance: previousBalance + grandTotal,
        newBalance,
        notes: `Payment received with Invoice ${invoiceNumber}`,
        saleId: newSale.id,
        invoiceNumber,
        createdAt: now,
      });
    }

    const nextSales = [newSale, ...db.sales];

    // 3. Update customer balance & totals
    const nextCustomers = db.customers.map((c) =>
      c.id === customer.id ? recalculateCustomerTotals(c, nextSales, nextPayments) : c
    );

    // 4. Increment invoice sequence
    const nextSeq = (db.settings.nextInvoiceSequence || db.sales.length + 1) + 1;

    persistDatabase({
      ...db,
      customers: nextCustomers,
      products: nextProducts,
      sales: nextSales,
      payments: nextPayments,
      stockTransactions: [...newStockTxs, ...db.stockTransactions],
      settings: {
        ...db.settings,
        nextInvoiceSequence: nextSeq,
        nextReceiptSequence: nextReceiptSeq,
      },
    });

    return newSale;
  };

  // --- RECORD CUSTOMER PAYMENT ---
  const recordPayment = (input: RecordPaymentInput): Payment => {
    const customer = db.customers.find((c) => c.id === input.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const now = new Date().toISOString();
    const amount = Math.max(0, Number(input.amount) || 0);
    const previousBalance = customer.currentBalance;
    // Formula: New Pending Balance = Previous Pending Balance - Payment
    const newBalance = previousBalance - amount;

    const nextReceiptSeq = (db.settings.nextReceiptSequence || db.payments.length + 1) + 1;
    const receiptNumber = `PAY-${String(nextReceiptSeq - 1).padStart(5, '0')}`;

    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      receiptNumber,
      customerId: customer.id,
      storeName: customer.storeName,
      date: input.date || now.slice(0, 10),
      amount,
      paymentMethod: input.paymentMethod,
      referenceNumber: input.referenceNumber,
      previousBalance,
      newBalance,
      notes: input.notes,
      createdAt: now,
    };

    const nextPayments = [newPayment, ...db.payments];
    const nextCustomers = db.customers.map((c) =>
      c.id === customer.id ? recalculateCustomerTotals(c, db.sales, nextPayments) : c
    );

    persistDatabase({
      ...db,
      customers: nextCustomers,
      payments: nextPayments,
      settings: {
        ...db.settings,
        nextReceiptSequence: nextReceiptSeq,
      },
    });

    return newPayment;
  };

  // --- STOCK ADJUSTMENTS ---
  const adjustStock = (input: AdjustStockInput): StockTransaction => {
    const product = db.products.find((p) => p.id === input.productId);
    if (!product) {
      throw new Error('Product not found');
    }

    const now = new Date().toISOString();
    const qty = Math.max(0, Number(input.quantity) || 0);
    const prevStock = product.currentStock;
    let newStock = prevStock;

    if (input.type === 'Stock In') {
      newStock = Number((prevStock + qty).toFixed(2));
    } else if (input.type === 'Stock Out') {
      newStock = Math.max(0, Number((prevStock - qty).toFixed(2)));
    } else if (input.type === 'Adjustment') {
      newStock = Number(qty.toFixed(2));
    }

    const tx: StockTransaction = {
      id: `stk-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      productNameUr: product.nameUr,
      category: product.category,
      unit: product.unit,
      type: input.type,
      quantity: input.type === 'Adjustment' ? Math.abs(newStock - prevStock) : qty,
      previousStock: prevStock,
      newStock,
      reference: input.reference || 'MANUAL-ADJ',
      date: input.date || now.slice(0, 10),
      notes: input.notes,
      createdAt: now,
    };

    const nextProducts = db.products.map((p) =>
      p.id === product.id ? { ...p, currentStock: newStock } : p
    );

    persistDatabase({
      ...db,
      products: nextProducts,
      stockTransactions: [tx, ...db.stockTransactions],
    });

    return tx;
  };

  // --- SETTINGS ---
  const updateSettings = (newSettings: Partial<BusinessSettings>) => {
    const merged = { ...db.settings, ...newSettings };
    persistDatabase({
      ...db,
      settings: merged,
    });
  };

  const resetDatabaseToDemo = async () => {
    persistDatabase(initialSeedDatabase);
    try {
      await fetch('/api/reset', { method: 'POST' });
    } catch {
      // Ignore offline error
    }
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const signOutUser = async () => {
    await signOut(auth);
  };

  return (
    <AppContext.Provider
      value={{
        db,
        lang,
        setLang,
        t,
        isRtl,
        activeTab,
        setActiveTab,
        selectedCustomerIdForLedger,
        setSelectedCustomerIdForLedger,
        selectedCustomerForSale,
        setSelectedCustomerForSale,
        selectedCustomerForPayment,
        setSelectedCustomerForPayment,
        activeInvoiceModal,
        setActiveInvoiceModal,
        formatCurrency,
        getPendingAmount,
        getAdvanceCreditAmount,
        formatBalanceStatus,
        getNextInvoiceNumber,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        getCustomerLedger,
        addProduct,
        updateProduct,
        deleteProduct,
        createSale,
        recordPayment,
        adjustStock,
        updateSettings,
        resetDatabaseToDemo,
        currentUser,
        signInWithGoogle,
        signOutUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return ctx;
};
