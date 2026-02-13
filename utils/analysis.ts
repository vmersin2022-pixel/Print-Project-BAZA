import { AnalyzedRow, ColumnMapping } from '../types';
import * as XLSX from 'xlsx';

const parseNum = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === 'number') return val;
  const cleanStr = String(val).replace(/[^\d.,-]/g, '').replace(',', '.');
  const num = parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

// Функция для генерации тегов (улучшение без изменения структуры)
const generateTags = (row: any) => {
  const tags: string[] = [];
  
  // Тег: Высокая конверсия (CR > 12% и есть продажи)
  if (row.convToOrder > 12 && row.orders > 3) {
    tags.push('HIGH_CR');
  }
  
  // Тег: Свободная ниша (Мало товаров с заказами при наличии спроса)
  if (row.itemsWithOrders < 40 && row.orders > 5) {
    tags.push('LOW_COMPETITION');
  }

  // Тег: Взрывной рост (Динамика > 150%)
  if (row.diffPercent > 150) {
    tags.push('EXPLOSIVE');
  }

  return tags;
};

export const detectColumns = (headers: string[]): Partial<ColumnMapping> => {
  const mapping: Partial<ColumnMapping> = {};
  const h = headers.map(header => ({ orig: header, low: String(header).toLowerCase().trim() }));
  
  mapping.query = h.find(x => x.low.includes('поисковый запрос') || x.low === 'запрос')?.orig;
  mapping.t1 = h.find(x => x.low.includes('количество запросов') && !x.low.includes('предыдущ'))?.orig;
  mapping.t0 = h.find(x => x.low.includes('количество запросов') && x.low.includes('предыдущ'))?.orig;
  mapping.subject = h.find(x => x.low.includes('предмет'))?.orig;
  mapping.dailyT1 = h.find(x => x.low.includes('запросов в среднем за день') && !x.low.includes('предыдущ'))?.orig;

  mapping.clicks = h.find(x => x.low.includes('перешли в карточку товара') && !x.low.includes('предыдущ'))?.orig;
  mapping.orders = h.find(x => x.low.includes('заказали товаров') && !x.low.includes('предыдущ'))?.orig;
  mapping.convToOrder = h.find(x => x.low.includes('конверсия в заказ') && !x.low.includes('предыдущ'))?.orig;
  mapping.itemsWithOrders = h.find(x => x.low.includes('предметов с заказами'))?.orig;
  
  return mapping;
};

export const analyzeData = (data: any[], mapping: ColumnMapping): AnalyzedRow[] => {
  return data.map((row, index) => {
    const t1 = parseNum(row[mapping.t1]);
    const t0 = parseNum(row[mapping.t0]);
    const query = String(row[mapping.query] || '');
    
    const absDiff = t1 - t0;
    const diffP = t0 === 0 ? (t1 > 0 ? 100 : 0) : ((t1 - t0) / Math.max(t0, 1)) * 100;
    const isEarly = t0 <= 30 && t1 >= 80;

    let D = 1.0;
    if (diffP > 200) D = 2.0;
    else if (diffP > 100) D = 1.8;
    else if (diffP > 60) D = 1.6;
    else if (diffP > 30) D = 1.3;

    let V = 1.0;
    if (t1 > 3000) V = 1.5;
    else if (t1 > 1000) V = 1.3;
    else if (t1 < 300) V = 0.8;

    const N = isEarly ? 1.35 : 1.0;
    const pp = Number((D * V * N).toFixed(2));

    // Предварительный объект для расчета тегов
    const analyzedBase = {
      t1, t0, diffPercent: diffP, isEarlyTrend: isEarly, ppScore: pp,
      clicks: parseNum(row[mapping.clicks || '']),
      orders: parseNum(row[mapping.orders || '']),
      convToOrder: parseNum(row[mapping.convToOrder || '']),
      itemsWithOrders: parseNum(row[mapping.itemsWithOrders || ''])
    };

    return {
      id: `row-${index}`,
      query,
      ...analyzedBase,
      absDiff,
      subject: String(row[mapping.subject] || '—'),
      dailyT1: parseNum(row[mapping.dailyT1]),
      // Добавляем поле tags (нужно убедиться, что оно есть в интерфейсе AnalyzedRow в types.ts)
      tags: generateTags(analyzedBase)
    };
  }).filter(r => r.query.length > 0);
};

export const readExcelFile = (file: File): Promise<{ headers: string[], data: any[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        const headers = XLSX.utils.sheet_to_json(sheet, { header: 1 })[0] as string[];
        if (!json.length) throw new Error("Таблица пустая");
        resolve({ headers, data: json });
      } catch (err) { reject(err); }
    };
    reader.readAsArrayBuffer(file);
  });
};