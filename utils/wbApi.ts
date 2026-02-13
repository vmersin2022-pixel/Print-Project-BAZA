import { FinancialReportRow } from '../types';

const STATS_PROXY = '/wb-api/stats';
const FINANCE_PROXY = '/wb-api/finance';

interface LogCallback {
  (message: string): void;
}

// Простой sleep
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Retry fetch wrapper for 429 errors
async function fetchWithRetry(url: string, options: RequestInit, onLog?: LogCallback, retries = 5): Promise<Response> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.status === 429) {
        const delay = 30000; // 30 sec delay for 429
        if (onLog) onLog(`⚠️ Превышен лимит запросов (429). Ждем ${delay/1000} сек...`);
        await sleep(delay);
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      return response;
    } catch (e) {
      if (i === retries - 1) throw e;
      if (onLog) onLog(`Ошибка сети. Повторная попытка (${i + 1}/${retries})...`);
      await sleep(2000); // 2 sec delay for network error
    }
  }
  throw new Error('Max retries reached');
}

export const fetchBalance = async (token: string) => {
  try {
    const response = await fetchWithRetry(`${FINANCE_PROXY}/api/v1/account/balance`, {
      headers: { 'Authorization': token }
    });
    return await response.json();
  } catch (e) {
    console.error('Balance fetch failed', e);
    return null;
  }
};

export const fetchSalesReports = async (
  token: string, 
  dateFrom: string, 
  dateTo: string, 
  onLog: LogCallback
): Promise<FinancialReportRow[]> => {
  let allRows: any[] = [];
  let rrdid = 0;
  let hasMore = true;
  
  onLog(`🚀 Старт загрузки за период: ${dateFrom} - ${dateTo}`);

  while (hasMore) {
    const url = new URL(`${window.location.origin}${STATS_PROXY}/api/v5/supplier/reportDetailByPeriod`);
    url.searchParams.append('dateFrom', dateFrom);
    url.searchParams.append('dateTo', dateTo);
    url.searchParams.append('rrdid', rrdid.toString());
    url.searchParams.append('limit', '100000'); // Max limit

    try {
      onLog(`⏳ Запрос данных (rrdid: ${rrdid})...`);
      
      const response = await fetchWithRetry(url.toString(), {
        headers: { 'Authorization': token }
      }, onLog);

      const data = await response.json();

      if (!data || data.length === 0) {
        hasMore = false;
        onLog(`✅ Загрузка завершена. Получено строк: ${allRows.length}`);
        break;
      }

      onLog(`📥 Получено пачка: ${data.length} строк`);
      allRows = [...allRows, ...data];
      
      // Update cursor for next page
      rrdid = data[data.length - 1].rrd_id;
      
      // Safety break to prevent infinite loops if API is weird
      if (data.length < 100) { 
         // Sometimes small chunks mean end, but standard is empty array. 
         // Keep going until empty array if adhering strictly to docs, 
         // but usually max limit is not hit if < 100.
         // Let's rely on empty array check above.
      }

      // Small throttle to be nice
      await sleep(500); 

    } catch (e: any) {
      onLog(`❌ Ошибка: ${e.message}`);
      throw e;
    }
  }

  // Convert to App Format
  onLog(`🔄 Обработка и маппинг данных...`);
  return mapApiRowsToApp(allRows);
};

const mapApiRowsToApp = (apiRows: any[]): FinancialReportRow[] => {
  return apiRows.map((row: any) => ({
    // IDs
    id: row.rrd_id ? String(row.rrd_id) : `gen-${Math.random()}`,
    rid: row.rid ? String(row.rid) : undefined,
    srid: row.srid || row.rid || '',
    
    // Product Info
    barcode: row.barcode || '',
    vendorCode: row.sa_name || '', // Articul Supplier
    brand: row.brand_name || '',
    subject: row.subject_name || '',
    nomenclatureCode: Number(row.nm_id) || 0,
    title: row.subject_name ? `${row.subject_name} ${row.sa_name}` : row.sa_name || '', // Construct title if missing
    size: row.ts_name || '',
    
    // Document Types
    docType: row.doc_type_name || '',
    paymentReason: row.supplier_oper_name || '', // "Продажа", "Логистика", etc.
    logisticsType: row.supplier_oper_name || '', // Fallback for strict split logic
    
    // Dates
    orderDate: row.order_dt || '',
    saleDate: row.sale_dt || '',
    
    // Metrics
    quantity: Number(row.quantity) || 0,
    retailPrice: Number(row.retail_price) || 0,
    wbRealized: Number(row.retail_amount) || 0, // Realized Amount
    ppvzForPay: Number(row.ppvz_for_pay) || 0, // To Pay
    
    // Commission & Discounts
    prodDiscount: Number(row.product_discount_for_report) || 0,
    promoCodePercent: 0, // Not always in API
    totalDiscountPercent: 0,
    retailPriceWithDisc: Number(row.retail_price_withdisc_rub) || 0,
    commissionPercent: Number(row.commission_percent) || 0,
    commissionRub: 0, // Need to calc or find specific field if available (ppvz_sales_commission)
    vatOnCommission: 0, 
    
    // Logistics & Fines
    deliveryRub: Number(row.delivery_rub) || 0,
    logisticsRub: Number(row.delivery_rub) || 0, // Usually the main cost field
    fine: Number(row.penalty) || 0,
    additionalPayment: Number(row.additional_payment) || 0,
    storageRub: 0, // Usually separate report
    otherDeductionsRub: 0,
    acceptanceRub: 0,
    
    // Counters (Inferred)
    deliveryCount: (row.supplier_oper_name === 'Логистика' && Number(row.delivery_rub) > 0) ? 1 : 0,
    returnCount: (row.doc_type_name === 'Возврат') ? 1 : 0,
    
    // Extra
    warehouse: row.office_name || '',
    country: row.site_country || '',
    raw: row // Keep original for debug
  } as FinancialReportRow));
};