export enum AppState {
  UPLOAD = 'UPLOAD',
  MAPPING = 'MAPPING',
  DASHBOARD = 'DASHBOARD',
  PROCESSING = 'PROCESSING',
  PRODUCT_CARDS = 'PRODUCT_CARDS',
  UNIT_ECONOMICS = 'UNIT_ECONOMICS',
  // New States
  FINANCE_DETAILS = 'FINANCE_DETAILS',
  FINANCE_HISTORY = 'FINANCE_HISTORY',
  FINANCE_COGS = 'FINANCE_COGS',
  FINANCE_TRENDS = 'FINANCE_TRENDS',
  FINANCE_API = 'FINANCE_API',
  BUSINESS_NOTES = 'BUSINESS_NOTES'
}

export type NoteCategory = 'idea' | 'contact' | 'finance' | 'strategy' | 'neuro';

export interface BusinessNote {
  id: string;
  title: string;
  content: string;
  category: NoteCategory;
  url?: string; // Поле для ссылки (например, на нейросеть)
  tags?: string[]; // Теги
  linkedId?: string; // ID of ProductCard or FinancialReport
  linkedType?: 'product' | 'report';
  createdAt: string;
  updatedAt: string;
}

export interface ColumnMapping {
  query: string;
  t1: string;
  t0: string;
  subject?: string;
  dailyT1?: string;
  dailyT0?: string;
  clicks?: string;
  orders?: string;
  convToOrder?: string;
  itemsWithOrders?: string;
}

export interface AnalyzedRow {
  id: string;
  query: string;
  t1: number;
  t0: number;
  diffPercent: number;
  absDiff: number;
  ppScore: number;
  isEarlyTrend: boolean;
  subject: string;
  dailyT1: number;
  clicks: number;
  orders: number;
  convToOrder: number;
  itemsWithOrders: number;
  tags?: string[];
}

export interface AnalysisSummary {
  totalQueries: number;
  totalVolumeT1: number;
  totalVolumeT0: number;
  avgPPScore: number;
}

export type ProductStatus = 'idea' | 'in_work' | 'published';

export interface ProductCard {
  id: string;
  query: string;
  createdAt: string;
  source: 'manual' | 'analysis';
  status: ProductStatus;
  stages: {
    printDev: boolean;
    layout: boolean;
    photos: boolean;
    cardCreated: boolean;
    published: boolean;
  };
  seo: {
    mainKey: string;
    additionalKeys: string;
    title: string;
    description: string;
    bullets: string;
    seoText: string;
    aiSearchLinks?: { title: string; uri: string }[];
  };
}

// --- FINANCIAL TYPES ---

export interface FinancialReportRow {
  id?: string | number;
  barcode: string;
  vendorCode: string;
  subject: string;
  nomenclatureCode?: number;
  brand: string;
  title: string;
  size: string;
  docType: string;
  paymentReason: string;
  orderDate: string;
  saleDate: string;
  quantity: number;
  retailPrice: number;
  wbRealized: number;
  prodDiscount: number;
  promoCodePercent: number;
  totalDiscountPercent: number;
  retailPriceWithDisc: number;
  ratingVvvReduction: number;
  actionVvvChange: number;
  sppPercent: number;
  commissionPercent: number;
  commissionPercentNoVat: number;
  baseKvvNoVat: number;
  rewardBeforeService: number;
  pvzReward: number;
  acquiringRub: number;
  acquiringPercent: number;
  acquiringType: string;
  commissionRub: number;
  vatOnCommission: number;
  ppvzForPay: number;
  deliveryCount: number;
  returnCount: number;
  deliveryRub?: number;
  logisticsRub: number;
  fine: number;
  storageRub: number;
  otherDeductionsRub: number;
  acceptanceRub: number;
  additionalPayment: number;
  warehouseFixCoeff: number;
  warehouse: string;
  country: string;
  logisticsType: string;
  rid?: string;
  srid: string;
  raw?: any; 
}

export interface CostItem {
  barcode: string;
  vendorCode: string;
  title: string;
  cost: number;
  updatedAt: string;
}

export interface SavedFinancialReport {
  id: string;
  name: string;
  dateCreated: string;
  rows: FinancialReportRow[];
  summary: {
    revenue: number;
    realized: number;
    toPay: number;
    netProfit: number;
    period: string;
  };
}

// --- UNIT ECONOMICS TYPES ---
export interface EconomicsData {
  printGlue: string; printFoil: string; printWhiteInk: string; printColorInk: string; printAmortization: string;
  tshirtCost: string; pressWorkCost: string; 
  packagingPackage: string; packagingTape: string; packagingBarcode: string; packagingLabel: string;
  packagingWork: string; 
  logisticsToWb: string; dimLength: string; dimWidth: string; dimHeight: string; volumeLiters: string;
  tariffBaseLogistics: string; tariffNextLiter: string; tariffWarehouseCoeff: string; tariffReturnLogistics: string;
  retailPrice: string; buyOutPercent: string; commissionPercent: string;
  advertising: string; taxSystem: 'usn6' | 'usn15'; vatRate: string; batchSize: string;
  printManualCost: string;
  hypoOrdersPerDay: string;
  hypoBuyoutPercent: string;
  hypoPrice: string; // New field for Hypothesis Price
  acquiringPercent: string;
}

export type TaxFlags = Record<string, boolean>;