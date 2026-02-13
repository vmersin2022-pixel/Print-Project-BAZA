import React, { useState, useMemo } from 'react';
import { FinancialReportRow, CostItem, SavedFinancialReport } from '../../types';
import { 
  TrendingUp, Table as TableIcon, 
  LayoutDashboard, Save, Wallet,
  ArrowDownToLine,
  ArrowUp, ArrowDown, ArrowUpDown, Box, Search, Upload, RefreshCcw, Tag
} from 'lucide-react';
import { updateCostRegistry, parseFinancialReport } from '../../utils/finance';
import FileUpload from '../FileUpload';

interface FinanceDashboardProps {
  registry: CostItem[];
  onUpdateRegistry: (items: CostItem[]) => void;
  onSaveReport: (report: SavedFinancialReport) => void;
  initialData?: FinancialReportRow[];
  onDataLoaded: (rows: FinancialReportRow[]) => void;
}

type SortField = 'qtySold' | 'buyoutPercent' | 'revenue' | 'cogs' | 'totalLogistics' | 'netProfit' | 'margin';
type SortOrder = 'asc' | 'desc';
type ABCGroup = 'A' | 'B' | 'C' | 'D' | 'All';
type TaxSystem = 'usn6' | 'usn15';

export const FinanceDashboard: React.FC<FinanceDashboardProps> = ({ 
  registry, onUpdateRegistry, onSaveReport, initialData, onDataLoaded 
}) => {
  const [data, setData] = useState<FinancialReportRow[]>(initialData || []);
  const [view, setView] = useState<'pnl' | 'table' | 'sku'>('pnl');
  const [isProcessing, setIsProcessing] = useState(false);
  const [skuSearch, setSkuSearch] = useState('');
  
  // Sorting State
  const [sortField, setSortField] = useState<SortField>('netProfit');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // ABC Filter
  const [abcFilter, setAbcFilter] = useState<ABCGroup>('All');
  
  // Tax System State
  const [taxSystem, setTaxSystem] = useState<TaxSystem>('usn6');
  
  // Save Modal State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [reportName, setReportName] = useState('');

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    try {
      const rows = await parseFinancialReport(file);
      setData(rows);
      onDataLoaded(rows);
      
      // Auto-update registry with new items
      const updatedRegistry = updateCostRegistry(registry, rows);
      if (updatedRegistry.length !== registry.length) {
        onUpdateRegistry(updatedRegistry);
      }
    } catch (e) {
      console.error(e);
      alert('Ошибка чтения файла');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setData([]);
    onDataLoaded([]);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // --- UPDATED CALCULATION LOGIC (STRICT) ---
  const stats = useMemo(() => {
    if (!data.length) return null;

    // Инициализация накопителей
    let qtySold: number = 0;          // Продажи (шт) из Col N (Продажа)
    let qtyReturned: number = 0;      // Возвраты (шт) из Col AJ (Логистика)

    let logisticsCostForward: number = 0; // Сумма доставки ДО клиента
    let logisticsCountForward: number = 0; // Кол-во доставок (AI)

    let logisticsCostReturn: number = 0;  // Сумма доставки ОТ клиента (Возврат)
    let logisticsCountReturn: number = 0; // Кол-во возвратов (AJ)
    
    let totalLogisticsRub: number = 0; // Общая сумма логистики из файла (Col AK)
    
    // ASP Accumulator
    let totalRetailWithDisc: number = 0; // Накопитель для Col T

    // Остальные метрики
    let revenue: number = 0;
    let payoutBase: number = 0;
    
    // Прочие расходы
    let storage: number = 0;
    let fines: number = 0;
    let deductions: number = 0;
    let acceptance: number = 0;
    let adjustments: number = 0;
    
    // Себестоимость map
    const costMap = new Map(registry.map(i => [i.vendorCode, i.cost] as [string, number]));
    let totalCogs: number = 0;

    data.forEach(r => {
      const reason = (r.paymentReason || '').toLowerCase();
      const isSale = reason.includes('продажа');
      const isLogistics = reason.includes('логистика');
      const isReturnOp = reason.includes('возврат'); // Для Revenue/COGS коррекции (операция возврата денег)

      // 1. BUYOUT RATE COMPONENTS (Qty) & ASP
      if (isSale) {
        qtySold += r.quantity;
        // Расчет средней цены (Col T * Qty)
        totalRetailWithDisc += (r.retailPriceWithDisc * r.quantity);
      }
      if (isLogistics) {
        // Считаем общее кол-во возвратов для метрики выкупа
        qtyReturned += r.returnCount; 
        totalLogisticsRub += r.logisticsRub;
      }

      // 2. LOGISTICS SPLIT (MONEY & COUNTS) - STRICT LOGIC
      // Используем колонку AQ (logisticsType) для точного разделения
      if (isLogistics) {
        const type = (r.logisticsType || '').toLowerCase();
        
        // --- FORWARD (Доставка до клиента) ---
        // Условие: K=Логистика, AI>0, AQ="К клиенту при продаже"
        if (r.deliveryCount > 0 && type.includes('к клиенту при продаже')) {
          logisticsCountForward += r.deliveryCount;
          logisticsCostForward += r.logisticsRub;
        }

        // --- RETURN (Возврат) ---
        // Условие: K=Логистика, AJ>0, AQ IN ["К клиенту при отмене", "От клиента при возврате", "От клиента при отмене"]
        const isReturnType = 
          type.includes('к клиенту при отмене') || 
          type.includes('от клиента при возврате') || 
          type.includes('от клиента при отмене');

        if (r.returnCount > 0 && isReturnType) {
          logisticsCountReturn += r.returnCount;
          logisticsCostReturn += r.logisticsRub;
        }
      }

      // 3. REVENUE & PAYOUT
      if (isSale) {
        revenue += r.wbRealized;
        payoutBase += r.ppvzForPay;
      } else if (isReturnOp) {
        revenue -= r.wbRealized;
        payoutBase -= r.ppvzForPay;
      }

      // 4. OTHER EXPENSES
      storage += r.storageRub;
      fines += r.fine;
      deductions += r.otherDeductionsRub;
      acceptance += r.acceptanceRub;
      adjustments += r.additionalPayment;

      // 5. COGS (Себестоимость)
      const unitCost = Number(costMap.get(r.vendorCode) || 0);
      if (isSale) totalCogs += (unitCost * r.quantity);
      if (isReturnOp) totalCogs -= (unitCost * r.quantity);
    });

    // --- CALCULATED METRICS ---

    // Real Buyout Percent
    // Buyout% = Sold / (Sold + Returned)
    const totalFlow = qtySold + qtyReturned;
    const buyoutPercent = totalFlow > 0 ? (qtySold / totalFlow) * 100 : 0;

    // Average Selling Price (ASP)
    const avgPrice = qtySold > 0 ? totalRetailWithDisc / qtySold : 0;

    // Average Logistics Costs (Based on strict split)
    const avgCostForward = logisticsCountForward > 0 ? logisticsCostForward / logisticsCountForward : 0;
    const avgCostReturn = logisticsCountReturn > 0 ? logisticsCostReturn / logisticsCountReturn : 0;
    
    // Unclassified Logistics (Costs that didn't match strict filters but exist in the file)
    // Это важно, чтобы P&L сходился с реальностью
    const unclassifiedLogistics = totalLogisticsRub - (logisticsCostForward + logisticsCostReturn);

    // Total Expenses
    // Используем totalLogisticsRub (сумма из файла), чтобы результат был точным
    const totalExpenses = totalLogisticsRub + storage + fines + deductions + acceptance;

    // Financial Results (Pre-Tax)
    const netCash = payoutBase - totalExpenses + adjustments;
    
    // --- TAX CALCULATION ---
    let tax = 0;
    if (taxSystem === 'usn6') {
      tax = revenue * 0.06;
    } else {
      // USN 15% (Income - Expenses)
      // Logic: Tax Base = NetCash (Money in Hand) - COGS
      const taxBase = Math.max(0, netCash - totalCogs);
      tax = taxBase * 0.15;
    }

    // --- VAT 5% CALCULATION ---
    const vat = revenue * 0.05;

    // Net Profit: Cash - Taxes - VAT - COGS
    const netProfit = netCash - tax - vat - totalCogs;
    
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    const roi = totalCogs > 0 ? (netProfit / totalCogs) * 100 : 0;
    
    // Profit Per Unit
    const profitPerUnit = qtySold > 0 ? netProfit / qtySold : 0;
    // Logistics Per Unit (LPU)
    const logisticsPerUnit = qtySold > 0 ? totalLogisticsRub / qtySold : 0;

    // Pie Chart Data
    const wbShare = revenue - netCash; 
    const pieData = [
      { name: 'Чистая прибыль', value: netProfit > 0 ? netProfit : 0, color: '#10b981' },
      { name: 'Себестоимость', value: totalCogs, color: '#3b82f6' },
      { name: 'Налоги и НДС', value: tax + vat, color: '#f59e0b' },
      { name: 'WB (Комиссия и услуги)', value: wbShare, color: '#6366f1' },
    ].filter(d => d.value > 0);

    let gradientString = '';
    let currentDeg = 0;
    const totalPieValue = pieData.reduce((acc, cur) => acc + cur.value, 0);
    pieData.forEach((segment, i) => {
      const deg = (segment.value / totalPieValue) * 360;
      gradientString += `${segment.color} ${currentDeg}deg ${currentDeg + deg}deg${i < pieData.length - 1 ? ', ' : ''}`;
      currentDeg += deg;
    });
    const pieGradient = `conic-gradient(${gradientString})`;

    return {
      revenue,
      payoutBase,
      avgPrice, // New Metric
      
      // Logistics Breakdown
      logisticsCostForward,
      logisticsCostReturn,
      logisticsCountForward,
      logisticsCountReturn,
      avgCostForward,
      avgCostReturn,
      totalLogisticsRub,
      unclassifiedLogistics,

      storage,
      fines,
      deductions,
      acceptance,
      adjustments,
      totalExpenses,

      tax,
      vat,
      totalCogs,
      netCash,
      netProfit,
      margin,
      roi,
      profitPerUnit, 
      logisticsPerUnit,

      // Buyout Stats
      qtySold,
      qtyReturned,
      buyoutPercent,

      pieData,
      pieGradient
    };
  }, [data, registry, taxSystem]);

  // --- SKU LEVEL ANALYTICS WITH ABC ---
  const skuStats = useMemo(() => {
    if (!data.length) return [];
    
    const costMap = new Map(registry.map(i => [i.vendorCode, i.cost]));
    const skuMap = new Map<string, any>();

    data.forEach(r => {
      const key = r.vendorCode || 'Не определено';
      if (!skuMap.has(key)) {
        skuMap.set(key, {
          vendorCode: key,
          barcode: r.barcode,
          title: r.title || 'Товар без названия',
          qtySold: 0,
          qtyReturned: 0,
          revenue: 0,
          cogs: 0,
          logisticsForward: 0,
          logisticsReturn: 0,
          logisticsOther: 0,
          storage: 0,
          fines: 0,
          deductions: 0,
          acceptance: 0,
          adjustments: 0,
          payoutBase: 0
        });
      }
      
      const stat = skuMap.get(key);
      const reason = (r.paymentReason || '').toLowerCase();
      const isSale = reason.includes('продажа');
      const isLogistics = reason.includes('логистика');
      const isReturnOp = reason.includes('возврат');

      if (isSale) {
        stat.qtySold += r.quantity;
        stat.revenue += r.wbRealized;
        stat.payoutBase += r.ppvzForPay;
        const unitCost = Number(costMap.get(key) || 0);
        stat.cogs += (unitCost * r.quantity);
      } else if (isReturnOp) {
        stat.revenue -= r.wbRealized;
        stat.payoutBase -= r.ppvzForPay;
        const unitCost = Number(costMap.get(key) || 0);
        stat.cogs -= (unitCost * r.quantity);
      }

      if (isLogistics) {
        stat.qtyReturned += r.returnCount;
        
        const type = (r.logisticsType || '').toLowerCase();
        // Strict logic match
        const isForward = r.deliveryCount > 0 && type.includes('к клиенту при продаже');
        const isReturn = r.returnCount > 0 && (
           type.includes('к клиенту при отмене') || 
           type.includes('от клиента при возврате') || 
           type.includes('от клиента при отмене')
        );

        if (isForward) stat.logisticsForward += r.logisticsRub;
        else if (isReturn) stat.logisticsReturn += r.logisticsRub;
        else stat.logisticsOther += r.logisticsRub;
      }

      stat.storage += r.storageRub;
      stat.fines += r.fine;
      stat.deductions += r.otherDeductionsRub;
      stat.acceptance += r.acceptanceRub;
      stat.adjustments += r.additionalPayment;
    });

    const calculated = Array.from(skuMap.values()).map(s => {
      const totalFlow = s.qtySold + s.qtyReturned;
      const buyoutPercent = totalFlow > 0 ? (s.qtySold / totalFlow) * 100 : 0;
      
      const totalLogistics = s.logisticsForward + s.logisticsReturn + s.logisticsOther;
      
      const totalExpenses = totalLogistics + s.storage + s.fines + s.deductions + s.acceptance;
      const netCash = s.payoutBase - totalExpenses + s.adjustments;

      // Tax Logic for SKU
      let tax = 0;
      if (taxSystem === 'usn6') {
        tax = s.revenue * 0.06;
      } else {
        // USN 15%
        const taxBase = Math.max(0, netCash - s.cogs);
        tax = taxBase * 0.15;
      }

      // VAT 5% for SKU
      const vat = s.revenue * 0.05;
      
      const netProfit = netCash - tax - vat - s.cogs;
      const margin = s.revenue > 0 ? (netProfit / s.revenue) * 100 : 0;
      const roi = s.cogs > 0 ? (netProfit / s.cogs) * 100 : 0;

      return {
        ...s,
        buyoutPercent,
        totalLogistics,
        tax,
        vat,
        netProfit,
        margin,
        roi
      };
    });

    // --- ABC ANALYSIS ---
    // 1. Sort by Profit Descending
    const sortedForABC = [...calculated].sort((a, b) => b.netProfit - a.netProfit);
    
    // 2. Calculate Total Positive Profit (Negative items are group D/Loss)
    const positiveItems = sortedForABC.filter(i => i.netProfit > 0);
    const totalPositiveProfit = positiveItems.reduce((acc, i) => acc + i.netProfit, 0);

    let currentSum = 0;
    const finalWithABC = sortedForABC.map(item => {
      let group: ABCGroup = 'D';
      
      if (item.netProfit > 0 && totalPositiveProfit > 0) {
        currentSum += item.netProfit;
        const share = (currentSum / totalPositiveProfit) * 100;
        
        if (share <= 80) group = 'A';
        else if (share <= 95) group = 'B';
        else group = 'C';
      }

      return { ...item, abcGroup: group };
    });

    return finalWithABC;

  }, [data, registry, taxSystem]);

  const filteredSkuStats = useMemo(() => {
    // 1. Filter
    let filtered = skuStats.filter(s => 
      s.vendorCode.toLowerCase().includes(skuSearch.toLowerCase()) || 
      s.title.toLowerCase().includes(skuSearch.toLowerCase())
    );

    if (abcFilter !== 'All') {
      filtered = filtered.filter(s => s.abcGroup === abcFilter);
    }

    // 2. Sort
    return filtered.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];
      
      if (sortOrder === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });
  }, [skuStats, skuSearch, sortField, sortOrder, abcFilter]);

  const handleSave = () => {
    if (!stats) return;
    const report: SavedFinancialReport = {
      id: Date.now().toString(),
      name: reportName || `Отчет от ${new Date().toLocaleDateString()}`,
      dateCreated: new Date().toLocaleString(),
      rows: data,
      summary: {
        revenue: stats.revenue,
        realized: stats.revenue,
        toPay: stats.netCash,
        netProfit: stats.netProfit,
        period: data[0]?.saleDate 
      }
    };
    onSaveReport(report);
    setShowSaveModal(false);
    setReportName('');
  };

  // UI Helpers
  const StatCard = ({ label, value, subValue, colorClass, icon: Icon }: any) => (
    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden group hover:border-white/10 transition-all">
      <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass}`}>
        <Icon size={48} />
      </div>
      <div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">{label}</p>
        <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      </div>
      {subValue && <div className="mt-2 pt-2 border-t border-white/5">{subValue}</div>}
    </div>
  );

  const ExpenseRow = ({ label, value, percent, highlight = false, subtext = null }: any) => (
    <div className={`flex flex-col py-2.5 border-b border-white/5 last:border-0 ${highlight ? 'bg-white/5 -mx-2 px-2 rounded-lg' : ''}`}>
       <div className="flex items-center justify-between">
         <span className="text-xs font-bold text-slate-400">{label}</span>
         <div className="flex items-center gap-4">
           <span className={`text-[10px] font-bold w-12 text-right ${percent > 10 ? 'text-amber-500' : 'text-slate-600'}`}>
             {percent > 0 ? `${percent.toFixed(1)}%` : '-'}
           </span>
           <span className={`text-sm font-bold min-w-[90px] text-right ${highlight ? 'text-white' : 'text-slate-300'}`}>
             {value.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₽
           </span>
         </div>
       </div>
       {subtext && <div className="text-[10px] text-slate-500 mt-1 pl-1">{subtext}</div>}
    </div>
  );

  const SortableHeader = ({ field, label, align = 'right' }: { field: SortField, label: string, align?: 'left' | 'right' }) => (
    <th 
      className={`px-4 py-4 ${align === 'right' ? 'text-right' : 'text-left'} cursor-pointer hover:text-white transition-colors group select-none`}
      onClick={() => handleSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : 'justify-start'}`}>
        {label}
        <span className="text-slate-600 group-hover:text-indigo-400">
          {sortField === field ? (
            sortOrder === 'desc' ? <ArrowDown size={12} /> : <ArrowUp size={12} />
          ) : (
            <ArrowUpDown size={12} />
          )}
        </span>
      </div>
    </th>
  );

  if (!data.length) {
    return (
      <div className="w-full flex flex-col items-center justify-center min-h-[600px] animate-fade-in">
        <FileUpload onFileSelect={handleFileUpload} error={null} />
        {isProcessing && <p className="mt-4 text-indigo-400 font-bold animate-pulse">Обработка отчета...</p>}
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1400px] mx-auto space-y-6 pb-20 animate-fade-in px-4 md:px-8">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-slate-900/40 p-4 rounded-2xl border border-white/5 backdrop-blur-xl gap-4">
        <div className="flex gap-2">
           <button 
             onClick={() => setView('pnl')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
               view === 'pnl' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white'
             }`}
           >
             <LayoutDashboard size={16} /> Детализация
           </button>
           <button 
             onClick={() => setView('sku')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
               view === 'sku' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white'
             }`}
           >
             <Box size={16} /> По товарам
           </button>
           <button 
             onClick={() => setView('table')}
             className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
               view === 'table' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white/5 text-slate-400 hover:text-white'
             }`}
           >
             <TableIcon size={16} /> Таблица
           </button>
        </div>
        
        <div className="flex items-center gap-3">
           {/* Tax Switcher */}
           <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setTaxSystem('usn6')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  taxSystem === 'usn6' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                УСН 6%
              </button>
              <button 
                onClick={() => setTaxSystem('usn15')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  taxSystem === 'usn15' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'
                }`}
              >
                УСН 15%
              </button>
           </div>
           
           <button 
             onClick={handleReset}
             className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all text-slate-300 hover:text-white"
           >
             <Upload size={16} /> 
             <span className="hidden md:inline">Новый отчет</span>
           </button>

           <button 
             onClick={() => setShowSaveModal(true)}
             className="flex items-center gap-2 px-6 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-xl text-sm font-bold transition-all"
           >
             <Save size={16} /> <span className="hidden md:inline">Сохранить</span>
           </button>
        </div>
      </div>

      {view === 'pnl' && stats && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4">
          
          {/* TOP METRICS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            
            {/* 1. Revenue */}
            <StatCard 
              label="Валовая Выручка" 
              value={`${stats.revenue.toLocaleString()} ₽`}
              icon={TrendingUp}
              colorClass="text-blue-500"
              subValue={
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Продаж: {stats.qtySold} шт</span>
                  <span className="text-blue-400 font-bold">Налоговая база</span>
                </div>
              }
            />

            {/* NEW: Average Price */}
            <StatCard 
              label="Средний чек" 
              value={`${stats.avgPrice.toFixed(0)} ₽`}
              icon={Tag}
              colorClass="text-violet-500"
              subValue={
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>До скидки СПП</span>
                  <span className="text-violet-400 font-bold">ASP</span>
                </div>
              }
            />

            {/* 2. Buyout Rate (NEW) */}
            <StatCard 
              label="Процент Выкупа" 
              value={`${stats.buyoutPercent.toFixed(1)}%`}
              icon={RefreshCcw}
              colorClass={stats.buyoutPercent > 85 ? "text-emerald-500" : stats.buyoutPercent > 50 ? "text-amber-500" : "text-red-500"}
              subValue={
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Возвратов: {stats.qtyReturned} шт</span>
                  <span className={stats.buyoutPercent > 85 ? "text-emerald-400 font-bold" : "text-amber-400 font-bold"}>
                    Цель: 90%+
                  </span>
                </div>
              }
            />

            {/* 3. Net Cash */}
            <StatCard 
              label="Итого к оплате" 
              value={`${stats.netCash.toLocaleString()} ₽`}
              icon={Wallet}
              colorClass="text-emerald-500"
              subValue={
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>От выручки:</span>
                  <span className="text-emerald-400 font-bold">{((stats.netCash / stats.revenue) * 100).toFixed(1)}%</span>
                </div>
              }
            />

             {/* 4. Profit */}
             <div className="bg-gradient-to-br from-indigo-900/50 to-violet-900/50 border border-indigo-500/30 rounded-2xl p-5 flex flex-col justify-between relative overflow-hidden shadow-2xl">
               <div>
                  <div className="flex justify-between items-start">
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-2">Чистая Прибыль</p>
                    <div className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/10 backdrop-blur-sm">
                      <span className="text-[9px] text-indigo-200 font-bold uppercase">1 шт:</span>
                      <span className="text-sm font-black text-emerald-400">{stats.profitPerUnit > 0 ? '+' : ''}{stats.profitPerUnit.toFixed(0)} ₽</span>
                    </div>
                  </div>
                  <p className="text-3xl font-black text-white tracking-tight">{stats.netProfit.toLocaleString()} ₽</p>
               </div>
               <div className="mt-2 pt-2 border-t border-white/10 grid grid-cols-2 gap-2">
                 <div>
                   <span className="block text-[9px] text-indigo-200 uppercase">Маржа</span>
                   <span className="block text-lg font-bold text-white">{stats.margin.toFixed(1)}%</span>
                 </div>
                 <div>
                   <span className="block text-[9px] text-indigo-200 uppercase">ROI</span>
                   <span className="block text-lg font-bold text-white">{stats.roi.toFixed(0)}%</span>
                 </div>
               </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT: CALCULATION WATERFALL */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 rounded-3xl p-6">
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                <ArrowDownToLine size={16} /> 
                Структура расходов (Waterfall)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                
                {/* Column 1: From Revenue to Payout */}
                <div className="space-y-1">
                  <ExpenseRow label="Валовая Выручка (P)" value={stats.revenue} percent={100} highlight />
                  <div className="py-2 flex justify-center text-slate-600"><ArrowDownToLine size={12} /></div>
                  <ExpenseRow label="Чистое перечисление (AH)" value={stats.payoutBase} percent={(stats.payoutBase / stats.revenue) * 100} />
                  
                  <div className="my-4 pt-4 border-t border-white/10">
                     <p className="text-[10px] font-black uppercase text-red-400 mb-2">Удержания WB (Операционные)</p>
                     
                     {/* SPLIT LOGISTICS */}
                     <div className="bg-white/5 rounded-xl p-3 mb-3 border border-white/5">
                        <ExpenseRow 
                          label="Прямая логистика (До клиента)" 
                          value={stats.logisticsCostForward} 
                          percent={(stats.logisticsCostForward / stats.revenue) * 100} 
                          subtext={`~${stats.avgCostForward.toFixed(0)} ₽/шт • ${stats.logisticsCountForward} доставок`}
                        />
                        <ExpenseRow 
                          label="Обратная логистика (Возвраты)" 
                          value={stats.logisticsCostReturn} 
                          percent={(stats.logisticsCostReturn / stats.revenue) * 100} 
                          subtext={`~${stats.avgCostReturn.toFixed(0)} ₽/шт • ${stats.logisticsCountReturn} возвратов`}
                        />
                        
                        {Math.abs(stats.unclassifiedLogistics) > 10 && (
                           <ExpenseRow 
                             label="Прочая логистика (Сторно/Коррекции)" 
                             value={stats.unclassifiedLogistics} 
                             percent={(stats.unclassifiedLogistics / stats.revenue) * 100} 
                             subtext="Не попало под фильтры прямой/обратной"
                           />
                        )}

                        <div className="mt-2 pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-400">
                           <span>Логистика на 1 шт. (продажа):</span>
                           <span className="font-bold text-slate-200">{stats.logisticsPerUnit.toFixed(1)} ₽</span>
                        </div>

                        <div className="mt-2 text-[9px] text-right text-slate-500">
                          Доля возвратов в логистике: <span className="text-red-400 font-bold">{stats.totalLogisticsRub > 0 ? (((stats.logisticsCostReturn + stats.unclassifiedLogistics) / stats.totalLogisticsRub) * 100).toFixed(0) : 0}%</span>
                        </div>
                     </div>

                     <ExpenseRow label="Хранение (BH)" value={stats.storage} percent={(stats.storage / stats.revenue) * 100} />
                     <ExpenseRow label="Штрафы (AO)" value={stats.fines} percent={(stats.fines / stats.revenue) * 100} />
                     <ExpenseRow label="Прочие удержания (BI)" value={stats.deductions} percent={(stats.deductions / stats.revenue) * 100} />
                     <ExpenseRow label="Приемка (BJ)" value={stats.acceptance} percent={(stats.acceptance / stats.revenue) * 100} />
                     {stats.adjustments !== 0 && (
                        <ExpenseRow label="Доплаты (AP)" value={stats.adjustments} percent={0} highlight />
                     )}
                  </div>
                </div>

                {/* Column 2: From NetCash to NetProfit */}
                <div className="space-y-1 md:border-l md:border-white/5 md:pl-12">
                   <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 mb-6">
                      <p className="text-[10px] font-bold text-emerald-400 uppercase mb-1">Денежный поток (На руки)</p>
                      <p className="text-2xl font-black text-white">{stats.netCash.toLocaleString()} ₽</p>
                   </div>

                   <ExpenseRow 
                     label={taxSystem === 'usn6' ? "Налог (6% от Выручки)" : "Налог (15% Д-Р)"} 
                     value={stats.tax} 
                     percent={(stats.tax / stats.revenue) * 100}
                     subtext={taxSystem === 'usn15' ? "База = На руки - Себестоимость" : undefined}
                   />
                   <ExpenseRow 
                     label="НДС (5% от Выручки)" 
                     value={stats.vat} 
                     percent={(stats.vat / stats.revenue) * 100}
                   />
                   <ExpenseRow label="Себестоимость товара" value={stats.totalCogs} percent={(stats.totalCogs / stats.revenue) * 100} />
                   
                   <div className="mt-8 pt-4 border-t border-white/10">
                      <div className="flex justify-between items-end">
                         <span className="text-sm font-black uppercase text-slate-400">Чистая Прибыль</span>
                         <span className="text-2xl font-black text-white">{stats.netProfit.toLocaleString()} ₽</span>
                      </div>
                   </div>
                </div>

              </div>
            </div>

            {/* RIGHT: CHART */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-slate-900/40 rounded-3xl p-6 border border-white/5 flex flex-col items-center justify-center relative min-h-[300px]">
                 <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest absolute top-6 left-6">Распределение выручки</h4>
                 
                 <div className="relative w-56 h-56 rounded-full shadow-2xl mt-4" style={{ background: stats.pieGradient }}>
                   <div className="absolute inset-4 bg-slate-900 rounded-full flex flex-col items-center justify-center z-10 shadow-inner">
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Маржинальность</p>
                      <p className="text-3xl font-black text-white">{stats.margin.toFixed(1)}%</p>
                   </div>
                 </div>

                 <div className="mt-8 w-full space-y-2">
                   {stats.pieData.map((d, i) => (
                     <div key={i} className="flex items-center justify-between text-xs">
                       <div className="flex items-center gap-2">
                         <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }}></div>
                         <span className="text-slate-300 font-medium">{d.name}</span>
                       </div>
                       <span className="font-mono font-bold text-slate-400">{((d.value / stats.revenue) * 100).toFixed(1)}%</span>
                     </div>
                   ))}
                 </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SKU TABLE VIEW */}
      {view === 'sku' && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
           {/* Filters */}
           <div className="flex flex-col md:flex-row items-center gap-4 bg-slate-900/60 p-4 rounded-2xl border border-white/5">
             <div className="relative flex-1 w-full md:max-w-md">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
               <input 
                 type="text" 
                 placeholder="Поиск по артикулу или названию..." 
                 value={skuSearch}
                 onChange={(e) => setSkuSearch(e.target.value)}
                 className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-200 outline-none focus:border-indigo-500/50"
               />
             </div>
             
             {/* ABC Filter Buttons */}
             <div className="flex gap-1 bg-slate-950 p-1 rounded-xl border border-white/5">
                {(['All', 'A', 'B', 'C', 'D'] as ABCGroup[]).map((grp) => (
                  <button
                    key={grp}
                    onClick={() => setAbcFilter(grp)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      abcFilter === grp 
                      ? 'bg-indigo-600 text-white shadow-lg' 
                      : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {grp === 'All' ? 'Все' : grp}
                  </button>
                ))}
             </div>

             <div className="ml-auto text-xs text-slate-500 font-medium">
               Показано {filteredSkuStats.length} из {skuStats.length} товаров
             </div>
           </div>

           <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-xl">
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead>
                   <tr className="bg-white/5 border-b border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500">
                     <th className="px-6 py-4">Товар</th>
                     <th className="px-4 py-4 text-center">ABC</th>
                     <SortableHeader field="qtySold" label="Продажи" />
                     <SortableHeader field="buyoutPercent" label="Выкуп" />
                     <SortableHeader field="revenue" label="Выручка" />
                     <SortableHeader field="cogs" label="Себест." />
                     <SortableHeader field="totalLogistics" label="Логистика" />
                     <SortableHeader field="netProfit" label="Прибыль" />
                     <SortableHeader field="margin" label="Маржа" />
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-white/5">
                   {filteredSkuStats.map((item) => (
                     <tr key={item.vendorCode} className="hover:bg-white/5 transition-colors group">
                       <td className="px-6 py-4">
                         <div className="flex flex-col gap-1">
                           <span className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                             {item.vendorCode}
                           </span>
                           <span className="text-[10px] text-slate-500 line-clamp-1 max-w-[200px]">
                             {item.title}
                           </span>
                         </div>
                       </td>
                       <td className="px-4 py-4 text-center">
                         <span className={`inline-flex items-center justify-center w-6 h-6 rounded-md text-[10px] font-black border ${
                           item.abcGroup === 'A' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                           item.abcGroup === 'B' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' :
                           item.abcGroup === 'C' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                           'bg-red-500/10 text-red-400 border-red-500/20'
                         }`}>
                           {item.abcGroup}
                         </span>
                       </td>
                       <td className="px-4 py-4 text-right">
                         <div className="flex flex-col items-end">
                           <span className="text-sm font-bold text-slate-200">{item.qtySold}</span>
                           <span className="text-[9px] text-red-400">-{item.qtyReturned} возвр</span>
                         </div>
                       </td>
                       <td className="px-4 py-4 text-right">
                         <span className={`text-xs font-bold ${
                           item.buyoutPercent > 90 ? 'text-emerald-400' : 
                           item.buyoutPercent > 50 ? 'text-amber-400' : 'text-red-400'
                         }`}>
                           {item.buyoutPercent.toFixed(0)}%
                         </span>
                       </td>
                       <td className="px-4 py-4 text-right font-mono text-xs text-slate-300">
                         {item.revenue.toLocaleString()}
                       </td>
                       <td className="px-4 py-4 text-right font-mono text-xs text-slate-500">
                         {item.cogs.toLocaleString()}
                       </td>
                       <td className="px-4 py-4 text-right font-mono text-xs text-slate-400">
                         {item.totalLogistics.toLocaleString()}
                       </td>
                       <td className="px-6 py-4 text-right">
                         <span className={`text-sm font-black ${item.netProfit > 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                           {item.netProfit.toLocaleString()}
                         </span>
                       </td>
                       <td className="px-4 py-4 text-right">
                         <span className="text-xs font-bold text-slate-400">
                           {item.margin.toFixed(1)}%
                         </span>
                       </td>
                     </tr>
                   ))}
                   {filteredSkuStats.length === 0 && (
                     <tr>
                       <td colSpan={9} className="px-6 py-12 text-center text-slate-500">
                         Товары не найдены
                       </td>
                     </tr>
                   )}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}

      {/* RAW TABLE VIEW REMAINS THE SAME (Just hidden if not selected) */}
      {view === 'table' && (
        <div className="space-y-4 animate-in fade-in duration-500">
           <div className="bg-slate-900/60 border border-white/5 rounded-3xl p-6 text-center text-slate-500">
              <p>Таблица исходных данных доступна, но расчеты ведутся по новой методологии (Col F, K, etc).</p>
           </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
             <h3 className="text-xl font-bold text-white mb-4">Сохранить отчет</h3>
             <input 
               autoFocus
               type="text"
               placeholder="Например: Неделя 25 (Май)"
               value={reportName}
               onChange={(e) => setReportName(e.target.value)}
               className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white mb-6 focus:border-indigo-500 outline-none"
             />
             <div className="flex gap-3">
               <button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 text-slate-400 hover:text-white font-bold">Отмена</button>
               <button onClick={handleSave} className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold">Сохранить</button>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};