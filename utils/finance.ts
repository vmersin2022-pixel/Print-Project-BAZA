import * as XLSX from 'xlsx';
import { FinancialReportRow, CostItem } from '../types';

// Helper to safely parse numbers
const pNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const str = String(val).replace(/\s/g, '').replace(',', '.');
  return parseFloat(str) || 0;
};

// Helper to safely parse strings
const pStr = (val: any): string => String(val || '').trim();

export const parseFinancialReport = (file: File): Promise<FinancialReportRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(sheet);

        const rows: FinancialReportRow[] = json.map(row => ({
          // Базовая информация
          id: pStr(row['Srid']) || pStr(row['ШК']),
          barcode: pStr(row['Баркод']),
          vendorCode: pStr(row['Артикул поставщика']),
          subject: pStr(row['Предмет']),
          nomenclatureCode: pNum(row['Код номенклатуры']),
          brand: pStr(row['Бренд']),
          title: pStr(row['Название']),
          size: pStr(row['Размер']),
          docType: pStr(row['Тип документа']),
          paymentReason: pStr(row['Обоснование для оплаты']),
          
          // Даты
          orderDate: pStr(row['Дата заказа покупателем']),
          saleDate: pStr(row['Дата продажи']),
          
          // Количества и розничные цены
          quantity: pNum(row['Кол-во']),
          retailPrice: pNum(row['Цена розничная']),
          wbRealized: pNum(row['Вайлдберриз реализовал Товар (Пр)']),
          prodDiscount: pNum(row['Согласованная скидка, %']),
          promoCodePercent: pNum(row['Промокод %']),
          totalDiscountPercent: pNum(row['Итоговая согласованная скидка %']),
          retailPriceWithDisc: pNum(row['Цена розничная с учетом согласованной скидки']),
          
          // Коэффициенты и кВВ
          ratingVvvReduction: pNum(row['Размер снижения кВВ из-за рейтинга, %']),
          actionVvvChange: pNum(row['Размер снижения кВВ за счет акции, %']),
          sppPercent: pNum(row['СПП, %']),
          commissionPercent: pNum(row['Размер кВВ, %']),
          commissionPercentNoVat: pNum(row['Размер кВВ без НДС, % Base Reward %']),
          baseKvvNoVat: pNum(row['Базовый размер кВВ, без НДС']),
          rewardBeforeService: pNum(row['Вознаграждение с продаж до вычета услуг поверенного, без НДС']),
          pvzReward: pNum(row['Возмещение за выдачу и возврат товаров на ПВЗ']),
          
          // Финансы, Налоги, Эквайринг
          acquiringRub: pNum(row['Эквайринг/Комиссии за организацию платежей'] || row['Комиссии за организацию платежей']),
          acquiringPercent: pNum(row['Размер комиссии за эквайринг/Комиссии за организацию платежей, %']),
          acquiringType: pStr(row['Тип начисления'] || ''),
          commissionRub: pNum(row['Вознаграждение Вайлдберриз (ВВ), без НДС']),
          vatOnCommission: pNum(row['НДС с Вознаграждения Вайлдберриз']),
          ppvzForPay: pNum(row['К перечислению Продавцу за реализованный Товар']),
          
          // Логистика и удержания
          deliveryCount: pNum(row['Количество доставок']),
          returnCount: pNum(row['Количество возврата']),
          deliveryRub: pNum(row['Услуги по доставке товара покупателю']),
          logisticsRub: pNum(row['Услуги по доставке товара покупателю']),
          fine: pNum(row['Общая сумма штрафов']),
          storageRub: pNum(row['Хранение']),
          otherDeductionsRub: pNum(row['Удержания']) + pNum(row['Прочие удержания']),
          acceptanceRub: pNum(row['Платная приемка']),
          additionalPayment: pNum(row['Доплаты']),
          warehouseFixCoeff: pNum(row['Коэффициент логистики и хранения']),
          
          // Дополнительно
          warehouse: pStr(row['Склад']),
          country: pStr(row['Страна']),
          // Updated to support 'Тип операции' which corresponds to Column AQ in some reports
          // Важно: WB часто меняет заголовки, добавляем самый актуальный длинный вариант
          logisticsType: pStr(
            row['Виды логистики, штрафов и корректировок ВВ'] || 
            row['Тип логистики'] || 
            row['Вид логистики'] || 
            row['Тип операции']
          ),
          srid: pStr(row['Srid']),
          
          // Служебные поля
          raw: row
        }));

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.readAsArrayBuffer(file);
  });
};

export const updateCostRegistry = (
  currentRegistry: CostItem[], 
  newRows: FinancialReportRow[]
): CostItem[] => {
  const registryMap = new Map(currentRegistry.map(i => [i.barcode, i]));
  let hasChanges = false;

  newRows.forEach(row => {
    if (row.barcode && !registryMap.has(row.barcode)) {
      registryMap.set(row.barcode, {
        barcode: row.barcode,
        vendorCode: row.vendorCode,
        title: row.title,
        cost: 0,
        updatedAt: new Date().toISOString()
      });
      hasChanges = true;
    }
  });

  return hasChanges ? Array.from(registryMap.values()) : currentRegistry;
};