export type Language = 'en' | 'ur';

export type NavTab =
  | 'dashboard'
  | 'customers'
  | 'products'
  | 'sales'
  | 'payments'
  | 'invoices'
  | 'ledger'
  | 'stock'
  | 'reports'
  | 'settings';

export type CustomerType = 'Wholesale' | 'Retail' | 'Distributor' | 'Supermarket';

export interface Customer {
  id: string;
  storeName: string;
  ownerName: string;
  phone: string;
  whatsapp: string;
  address: string;
  city: string;
  customerType: CustomerType;
  openingBalance: number;
  /**
   * Positive = Pending / Receivable from customer.
   * Negative = Credit / Advance paid by customer.
   * Zero = Settled.
   */
  currentBalance: number;
  totalSales: number;
  totalPaid: number;
  notes: string;
  createdAt: string;
}

export type ProductCategory =
  | 'Nimco'
  | 'Masala'
  | 'Chips'
  | 'Spices'
  | 'Snacks'
  | 'Dry Fruits'
  | 'Grocery';

export type ProductUnit = 'KG' | 'Gram' | 'Packet' | 'Box' | 'Carton' | 'Dozen' | 'Jar';

export interface Product {
  id: string;
  sku: string;
  name: string;
  nameUr?: string;
  category: ProductCategory;
  unit: ProductUnit;
  purchasePrice: number;
  salePrice: number;
  currentStock: number;
  minStockAlert: number;
  description: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  invoiceNumber: string;
  productId: string;
  productName: string;
  productNameUr?: string;
  category: ProductCategory;
  unit: ProductUnit;
  quantity: number;
  purchasePrice: number;
  unitPrice: number;
  total: number;
}

export type SaleStatus = 'Paid' | 'Partially Paid' | 'Pending';

export type PaymentMethod =
  | 'Cash'
  | 'Bank Transfer'
  | 'Easypaisa'
  | 'JazzCash'
  | 'Other';

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId: string;
  storeName: string;
  ownerName: string;
  customerPhone: string;
  customerWhatsapp: string;
  customerAddress: string;
  customerCity: string;
  date: string; // YYYY-MM-DD
  items: SaleItem[];
  subtotal: number;
  discount: number;
  additionalCharges: number;
  grandTotal: number;
  paidAmount: number;
  /**
   * Pending from this specific invoice: Math.max(0, grandTotal - paidAmount)
   */
  invoicePending: number;
  /**
   * Customer's balance right before this sale
   */
  previousBalance: number;
  /**
   * Customer's balance right after this sale: previousBalance + grandTotal - paidAmount
   */
  newBalance: number;
  status: SaleStatus;
  paymentMethod: PaymentMethod;
  notes: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  receiptNumber: string;
  customerId: string;
  storeName: string;
  date: string; // YYYY-MM-DD
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNumber: string;
  previousBalance: number;
  newBalance: number;
  notes: string;
  saleId?: string;
  invoiceNumber?: string;
  createdAt: string;
}

export type StockTransactionType = 'Stock In' | 'Stock Out' | 'Sale' | 'Adjustment';

export interface StockTransaction {
  id: string;
  productId: string;
  productName: string;
  productNameUr?: string;
  category: ProductCategory;
  unit: ProductUnit;
  type: StockTransactionType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reference: string;
  date: string; // YYYY-MM-DD
  notes: string;
  createdAt: string;
}

export interface BusinessSettings {
  businessName: string;
  businessNameUr: string;
  tagline: string;
  taglineUr: string;
  logoText: string;
  logoUrl: string;
  phone: string;
  whatsapp: string;
  address: string;
  addressUr: string;
  currency: string;
  invoiceLanguage: 'en' | 'ur' | 'both';
  defaultLanguage: Language;
  invoicePrefix: string;
  nextInvoiceSequence: number;
  nextReceiptSequence: number;
  footerNote: string;
  footerNoteUr: string;
}

export interface LedgerEntry {
  id: string;
  date: string;
  createdAt: string;
  referenceNumber: string;
  type: 'Opening Balance' | 'Sale' | 'Payment';
  description: string;
  descriptionUr: string;
  itemsSummary?: string;
  debitSale: number; // + adds to balance
  creditPayment: number; // - reduces balance
  runningBalance: number; // positive = Pending, negative = Advance/Credit
  saleObj?: Sale;
  paymentObj?: Payment;
}

export interface DatabaseSchema {
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  stockTransactions: StockTransaction[];
  settings: BusinessSettings;
}
