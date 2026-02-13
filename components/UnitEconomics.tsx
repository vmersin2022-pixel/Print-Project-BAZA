import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calculator, ChevronDown, ChevronUp, 
  Truck, Package, Info, Target, TrendingUp, Save,
  FileDown
} from 'lucide-react';
import { EconomicsData, TaxFlags, SavedFinancialReport } from '../types';

interface UnitEconomicsProps {
  initialData?: EconomicsData;
  initialFlags?: TaxFlags;
  onSave: (data: EconomicsData, flags: TaxFlags) => void;
  reports?: SavedFinancialReport[];
}

// Default Values if nothing is saved
const DEFAULT_DATA: EconomicsData = {
  printManualCost: '0', printGlue: '0', printFoil: '0', printWhiteInk: '0', printColorInk: '0', printAmortization: '0',
  tshirtCost: '0', pressWorkCost: '0', packagingPackage: '0', packagingTape: '0', packagingBarcode: '0', 
  packagingLabel: '0', packagingWork: '0',
  logisticsToWb: '0', dimLength: '30', dimWidth: '20', dimHeight: '2', volumeLiters: '1.2',
  tariffBaseLogistics: '33', tariffNextLiter: '8', tariffWarehouseCoeff: '125', tariffReturnLogistics: '33',
  retailPrice: '0', buyOutPercent: '90', commissionPercent: '25',
  hypoOrdersPerDay: '10',
  hypoBuyoutPercent: '90',
  hypoPrice: '', // Default empty, so it falls back to retailPrice or user input
  acquiringPercent: '3',
  advertising: '0', taxSystem: 'usn6', vatRate: '0', batchSize: '100'
};

const DEFAULT_FLAGS: TaxFlags = {
  printGlue: true, printFoil: true, printWhiteInk: true, printColorInk: true, printAmortization: true,
  tshirtCost: true, pressWorkCost: true, packagingPackage: true, packagingTape: true,
  packagingBarcode: true, packagingLabel: true, packagingWork: true, logisticsToWb: true, acquiring: true,
  logisticsWb: true, advertising: true, commissionWB: true
};

// Helper Input Component
const InputRow = ({ label, valKey, suffix, data, updateData, hasCheck = false, checkKey = '', taxFlags, toggleFlag }: any) => (
  <div className="flex items-center justify-between py-1.5 group border-b border-white/[0.03] last:border-0">
    <div className="flex items-center gap-2">
      {hasCheck && (
        <input 
          type="checkbox" 
          checked={taxFlags[checkKey]}
          onChange={() => toggleFlag(checkKey)}
          className="w-3.5 h-3.5 rounded border-white/20 bg-slate-800 text-indigo-500 focus:ring-0 cursor-pointer"
        />
      )}
      <label className="text-[11px] text-slate-400 font-medium leading-tight">{label}</label>
    </div>
    <div className="flex items-center gap-2">
      <input 
        type="text"
        inputMode="decimal"
        value={data[valKey]} 
        onChange={(e) => updateData(valKey, e.target.value)}
        className="w-20 bg-slate-900 border border-white/10 rounded px-2 py-1 text-right text-xs text-white focus:border-indigo-500 outline-none font-mono"
      />
      {suffix && <span className="text-[10px] text-slate-600 font-bold w-4">{suffix}</span>}
    </div>
  </div>
);

const UnitEconomics: React.FC<UnitEconomicsProps> = ({ initialData, initialFlags, onSave, reports = [] }) => {
  const [data, setData] = useState<EconomicsData>(initialData || DEFAULT_DATA);
  const [taxFlags, setTaxFlags] = useState<TaxFlags>(initialFlags || DEFAULT_FLAGS);
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // Sync with props if they load later
  useEffect(() => {
    if (initialData) setData(initialData);
    if (initialFlags) setTaxFlags(initialFlags);
  }, [initialData, initialFlags]);

  // Auto-save on change (debounce could be added in parent, but we do simple effect here)
  useEffect(() => {
    const timer = setTimeout(() => {
      onSave(data, taxFlags);
    }, 1000); // 1 sec debounce
    return () => clearTimeout(timer);
  }, [data, taxFlags, onSave]);

  useEffect(() => {
    const l = parseFloat(data.dimLength) || 0;
    const w = parseFloat(data.dimWidth) || 0;
    const h = parseFloat(data.dimHeight) || 0;
    const liters = (l * w * h) / 1000;
    setData(prev => ({ ...prev, volumeLiters: liters.toFixed(2) }));
  }, [data.dimLength, data.dimWidth, data.dimHeight]);

  const handleImportReport = (reportId: string) => {
    if (!reportId) return;
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Calculate Averages from Report
    let totalQty = 0;
    let totalReturns = 0;
    let totalLogisticsSum = 0;
    let totalCommissionSum = 0;
    let totalRevenue = 0;
    let totalRetailWithDisc = 0;

    report.rows.forEach(r => {
      if (r.paymentReason?.toLowerCase().includes('продажа')) {
        totalQty += r.quantity;
        totalRevenue += r.wbRealized;
        totalRetailWithDisc += (r.retailPriceWithDisc * r.quantity);
        totalCommissionSum += r.commissionRub; // Note: Check if column exists, otherwise calc
      }
      if (r.paymentReason?.toLowerCase().includes('логистика')) {
        totalReturns += r.returnCount;
        totalLogisticsSum += r.logisticsRub;
      }
    });

    // 1. Avg Price
    const avgPrice = totalQty > 0 ? totalRetailWithDisc / totalQty : 0;
    
    // 2. Buyout Percent
    const totalFlow = totalQty + totalReturns;
    const buyoutPct = totalFlow > 0 ? (totalQty / totalFlow) * 100 : 0;

    // 3. Avg Logistics (Cost per sold unit, covering all movements)
    // NOTE: User wants "Average from report". Total Logistics / Sold Qty gives effective cost per sold unit.
    const avgLogisticsPerUnit = totalQty > 0 ? totalLogisticsSum / totalQty : 0;

    // 4. Effective Commission %
    const avgCommissionPct = totalRevenue > 0 ? (totalCommissionSum / totalRevenue) * 100 : 0;

    // Update State
    setData(prev => ({
      ...prev,
      retailPrice: avgPrice.toFixed(0),
      buyoutPercent: buyoutPct.toFixed(0),
      // We set "Tariff Base" to the calculated avg to simplify, or we can assume Warehouse Coeff.
      // Simplest way to match the "Fact" is to force the logistics calculation to match the report average.
      // However, our calculator uses (Base + Liter) * Coeff + Return.
      // Let's set the "Base Logistics" to the avg value and reset others to 0/100 to match the fact exactly if possible,
      // OR just set the Base and let user tweak. 
      // BETTER APPROACH: Just set the base tariff to the calculated avg and reset return logic for this snapshot?
      // No, let's just populate the fields we can map directly.
      
      // Since our calculator logic is strict (Forward + Return), mapping "Total Avg Logistics" back to "Base Tariff" is hard.
      // Instead, we will set the "Base Logistics" to match the `avgLogisticsPerUnit` roughly, assuming 0 returns for the input fields?
      // No, let's just set the "Base Logistics" field to the calculated value and maybe zero out the return tariff in inputs 
      // so the math (Forward + Return) equals the report's Total Logistics per unit.
      // But we have a Buyout %...
      
      // Let's just set retail price and buyout, and maybe commission.
      // Logistics is too complex to reverse-engineer into "Base Tariff" without breaking the logic.
      // We will leave logistics inputs alone or just hint them.
      
      // Actually, user wants to see "Fact".
      commissionPercent: avgCommissionPct > 0 ? avgCommissionPct.toFixed(1) : prev.commissionPercent,
    }));
    
    // We can alert or toast that data is loaded
    // For logistics, we can't easily overwrite "Base Tariff" because `TotalLogistics = Forward + Return`.
    // We'd have to solve for `Base` given `Total`, `Buyout`, etc.
    // Let's keep it simple: Import Price, Buyout, and Commission.
  };

  const calc = useMemo(() => {
    const n = (val: any) => parseFloat(val) || 0;

    // --- MAIN UNIT ECONOMICS (TOP BLOCK) ---
    const P = n(data.retailPrice);
    const b = n(data.buyOutPercent) / 100;
    const r = 1 - b;
    const vol = n(data.volumeLiters);

    const printSum = n(data.printGlue) + n(data.printFoil) + n(data.printWhiteInk) + n(data.printColorInk) + n(data.printAmortization);
    const packSum = n(data.packagingPackage) + n(data.packagingTape) + n(data.packagingBarcode) + n(data.packagingLabel) + n(data.packagingWork);
    const totalCOGS = printSum + packSum + n(data.tshirtCost) + n(data.pressWorkCost) + n(data.logisticsToWb);

    const baseL = vol <= 1 ? n(data.tariffBaseLogistics) : n(data.tariffBaseLogistics) + (vol - 1) * n(data.tariffNextLiter);
    const L_forward = baseL * (n(data.tariffWarehouseCoeff) / 100);
    const L_return = b > 0 ? (r / b) * n(data.tariffReturnLogistics) : 0;
    const totalLogisticsWB = L_forward + L_return;

    const commission = P * (n(data.commissionPercent) / 100);
    const ads = n(data.advertising);
    const acquiring = P * (n(data.acquiringPercent) / 100);

    let totalTaxes = 0;
    let taxBaseValue = 0;
    let deductibleValue = 0;
    const vatAmount = P * (n(data.vatRate) / 100);

    // Calculate Deductibles (Shared logic)
    const getDeductible = () => {
      let d = 0;
      const keys = ['printGlue','printFoil','printWhiteInk','printColorInk','printAmortization','tshirtCost','pressWorkCost','packagingPackage','packagingTape','packagingBarcode','packagingLabel','packagingWork','logisticsToWb'];
      keys.forEach(k => { if (taxFlags[k]) d += n((data as any)[k]); });
      if (taxFlags.advertising) d += ads;
      if (taxFlags.logisticsWb) d += totalLogisticsWB;
      if (taxFlags.commissionWB) d += commission;
      return d;
    };

    if (data.taxSystem === 'usn6') {
      taxBaseValue = P;
      totalTaxes = (P * 0.06) + vatAmount;
    } else {
      deductibleValue = getDeductible();
      taxBaseValue = Math.max(0, P - deductibleValue);
      totalTaxes = (taxBaseValue * 0.15) + vatAmount;
    }

    const netProfit = P - (totalCOGS + totalLogisticsWB + commission + ads + acquiring + totalTaxes);
    
    // --- HYPOTHESIS CALCULATION (BOTTOM BLOCK) ---
    // Uses separate Price but same Costs (absolute values for COGS/Logistics, but recalculated % for Commission/Tax)
    
    // 1. Determine Hypo Price
    const H_Price = data.hypoPrice && data.hypoPrice !== '' ? n(data.hypoPrice) : P;
    
    // 2. Recalculate variable costs based on H_Price
    const H_Commission = H_Price * (n(data.commissionPercent) / 100);
    const H_Acquiring = H_Price * (n(data.acquiringPercent) / 100);
    const H_Vat = H_Price * (n(data.vatRate) / 100);
    
    let H_Tax = 0;
    if (data.taxSystem === 'usn6') {
      H_Tax = (H_Price * 0.06) + H_Vat;
    } else {
      // Re-calc deductible for Hypothesis (Commission changes!)
      let H_Deductible = 0;
      const keys = ['printGlue','printFoil','printWhiteInk','printColorInk','printAmortization','tshirtCost','pressWorkCost','packagingPackage','packagingTape','packagingBarcode','packagingLabel','packagingWork','logisticsToWb'];
      keys.forEach(k => { if (taxFlags[k]) H_Deductible += n((data as any)[k]); });
      if (taxFlags.advertising) H_Deductible += ads;
      if (taxFlags.logisticsWb) H_Deductible += totalLogisticsWB; // Logistics stays same (absolute cost)
      if (taxFlags.commissionWB) H_Deductible += H_Commission; // Commission changes
      
      const H_TaxBase = Math.max(0, H_Price - H_Deductible);
      H_Tax = (H_TaxBase * 0.15) + H_Vat;
    }

    const H_NetProfit = H_Price - (totalCOGS + totalLogisticsWB + H_Commission + ads + H_Acquiring + H_Tax);

    const hypoOrders = n(data.hypoOrdersPerDay);
    const hypoBuyout = n(data.hypoBuyoutPercent) / 100;
    const hypoSoldUnits = hypoOrders * hypoBuyout;
    const hypoTotalNetProfit = hypoSoldUnits * H_NetProfit;
    const hypoTotalRevenue = hypoSoldUnits * H_Price;
    
    return {
      printSum, totalCOGS, totalLogisticsWB, netProfit, 
      margin: P > 0 ? (netProfit / P) * 100 : 0,
      roi: totalCOGS > 0 ? (netProfit / totalCOGS) * 100 : 0,
      totalTaxes, taxBaseValue, deductibleValue, commission,
      L_forward, L_return, hypoTotalNetProfit, hypoSoldUnits,
      hypoTotalRevenue, acquiring, vatAmount,
      // Hypo Specifics for display if needed
      H_NetProfit, H_Price
    };
  }, [data, taxFlags]);

  const updateData = (key: keyof EconomicsData, value: string) => 
    setData(prev => ({ ...prev, [key]: value.replace(',', '.') }));

  const toggleFlag = (key: string) => 
    setTaxFlags(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 pb-48 px-4 pt-6 bg-slate-950 text-slate-200 animate-fade-in">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 px-2">
         <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="text-indigo-400" />
            Юнит-экономика
         </h2>
         
         <div className="flex items-center gap-2">
            {/* Reports Dropdown */}
            {reports.length > 0 && (
              <div className="relative group">
                 <div className="flex items-center gap-2 bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5">
                   <FileDown size={14} className="text-indigo-400" />
                   <select 
                     onChange={(e) => handleImportReport(e.target.value)}
                     className="bg-transparent text-[10px] font-bold text-slate-300 outline-none w-32 md:w-48 appearance-none cursor-pointer hover:text-white"
                     defaultValue=""
                   >
                     <option value="" disabled>Загрузить из отчета...</option>
                     {reports.map(r => (
                       <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                         {r.name} ({new Date(r.dateCreated).toLocaleDateString()})
                       </option>
                     ))}
                   </select>
                   <ChevronDown size={12} className="text-slate-500 pointer-events-none" />
                 </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[10px] text-slate-500 bg-white/5 px-3 py-1.5 rounded-full">
                <Save size={12} className="animate-pulse text-emerald-500" />
                <span className="hidden xs:inline">Автосохранение</span>
            </div>
         </div>
      </div>

      {/* 1. СЕБЕСТОИМОСТЬ */}
      <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
        <div className="px-4 py-3 bg-white/5 flex justify-between items-center border-b border-white/5">
          <h2 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
            <Package size={14}/> 1. Себестоимость
          </h2>
          <span className="text-xs font-mono font-bold text-indigo-400">{calc.totalCOGS.toFixed(1)} ₽</span>
        </div>
        
        <div className="p-4 space-y-3">
          <div className="bg-slate-950/50 border border-white/5 rounded-xl">
            <button 
              onClick={() => setIsPrintOpen(!isPrintOpen)} 
              className="w-full flex items-center justify-between p-3"
            >
              <span className="text-[10px] font-bold uppercase text-slate-500">Себестоимость принта</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono">{calc.printSum.toFixed(1)} ₽</span>
                {isPrintOpen ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
              </div>
            </button>
            {isPrintOpen && (
              <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-2">
                <div className="bg-indigo-500/5 p-2 rounded-lg mb-2 border border-indigo-500/10">
                  <InputRow label="Своя цена (ручной ввод)" valKey="printManualCost" hasCheck checkKey="printManualCost" {...{data, updateData, taxFlags, toggleFlag}} />
                  <p className="text-[8px] text-indigo-400/60 px-1 mt-1 uppercase font-bold">При вводе значения ниже компоненты игнорируются</p>
                </div>
                <InputRow label="Клей" valKey="printGlue" hasCheck checkKey="printGlue" {...{data, updateData, taxFlags, toggleFlag}} />
                <InputRow label="Пленка" valKey="printFoil" hasCheck checkKey="printFoil" {...{data, updateData, taxFlags, toggleFlag}} />
                <InputRow label="Краска (Б)" valKey="printWhiteInk" hasCheck checkKey="printWhiteInk" {...{data, updateData, taxFlags, toggleFlag}} />
                <InputRow label="Краска (Ц)" valKey="printColorInk" hasCheck checkKey="printColorInk" {...{data, updateData, taxFlags, toggleFlag}} />
                <InputRow label="Амортизация" valKey="printAmortization" hasCheck checkKey="printAmortization" {...{data, updateData, taxFlags, toggleFlag}} />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <InputRow label="Заготовка (Футболка)" valKey="tshirtCost" hasCheck checkKey="tshirtCost" {...{data, updateData, taxFlags, toggleFlag}} />
            <InputRow label="Пресс (Работа)" valKey="pressWorkCost" hasCheck checkKey="pressWorkCost" {...{data, updateData, taxFlags, toggleFlag}} />
            
            <div className="bg-white/[0.02] p-2 rounded-lg my-2 border border-white/5">
              <p className="text-[9px] font-black text-slate-600 uppercase mb-1 px-1">Расходники и упаковка</p>
              <InputRow label="Пакет" valKey="packagingPackage" hasCheck checkKey="packagingPackage" {...{data, updateData, taxFlags, toggleFlag}} />
              <InputRow label="Скотч" valKey="packagingTape" hasCheck checkKey="packagingTape" {...{data, updateData, taxFlags, toggleFlag}} />
              <InputRow label="Штрихкод" valKey="packagingBarcode" hasCheck checkKey="packagingBarcode" {...{data, updateData, taxFlags, toggleFlag}} />
              <InputRow label="Наклейка (работа)" valKey="packagingLabel" hasCheck checkKey="packagingLabel" {...{data, updateData, taxFlags, toggleFlag}} />
              <InputRow label="Упаковка (работа)" valKey="packagingWork" hasCheck checkKey="packagingWork" {...{data, updateData, taxFlags, toggleFlag}} />
            </div>

            <InputRow label="Логистика до WB" valKey="logisticsToWb" hasCheck checkKey="logisticsToWb" {...{data, updateData, taxFlags, toggleFlag}} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 2. ЛОГИСТИКА WB */}
        <div className="bg-slate-900/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 bg-white/5 flex justify-between items-center border-b border-white/5">
            <h2 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
              <Truck size={14}/> 2. Логистика WB
            </h2>
            <span className="text-xs font-mono font-bold text-amber-500">{calc.totalLogisticsWB.toFixed(1)} ₽</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              {['dimLength', 'dimWidth', 'dimHeight'].map(k => (
                <div key={k} className="bg-slate-950 p-2 rounded-lg border border-white/5">
                  <label className="text-[8px] text-slate-500 block uppercase text-center mb-1">
                    {k.replace('dim', '')}
                  </label>
                  <input 
                    type="text" 
                    value={(data as any)[k]} 
                    onChange={e => updateData(k as any, e.target.value)} 
                    className="w-full bg-transparent text-center text-xs font-bold outline-none" 
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20 text-[10px] font-bold">
              <span className="text-indigo-300 uppercase">Объем:</span>
              <span className="font-mono text-white">{data.volumeLiters} L</span>
            </div>
            <div className="space-y-0.5">
              <InputRow label="База" valKey="tariffBaseLogistics" {...{data, updateData}} />
              <InputRow label="Доп. литр" valKey="tariffNextLiter" {...{data, updateData}} />
              <InputRow label="Коэфф. склада" valKey="tariffWarehouseCoeff" suffix="%" {...{data, updateData}} />
              <InputRow label="Обратка" valKey="tariffReturnLogistics" {...{data, updateData}} />
              <div className="h-px bg-white/5 my-2" />
              <InputRow label="Процент выкупа" valKey="buyOutPercent" suffix="%" {...{data, updateData}} />
              <InputRow label="Цена продажи" valKey="retailPrice" suffix="₽" {...{data, updateData}} />
              <InputRow 
                label="Комиссия" 
                valKey="commissionPercent" 
                suffix="%" 
                hasCheck 
                checkKey="commissionWB" 
                {...{data, updateData, taxFlags, toggleFlag}} 
              />
              <InputRow 
                label="Эквайринг" 
                valKey="acquiringPercent" 
                suffix="%" 
                hasCheck 
                checkKey="acquiring" 
                {...{data, updateData, taxFlags, toggleFlag}} 
              />
              <InputRow 
                label="Итого логистика" 
                valKey="totalLogisticsWB" 
                hasCheck 
                checkKey="logisticsWb" 
                data={{totalLogisticsWB: calc.totalLogisticsWB.toFixed(1)}}
                updateData={()=>{}} 
                taxFlags={taxFlags} 
                toggleFlag={toggleFlag} 
              />
            </div>
          </div>
        </div>

        {/* 3 & 4. МАРКЕТИНГ И НАЛОГИ */}
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <h2 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 mb-3">
              <Target size={14} className="text-emerald-400"/> 3. Маркетинг
            </h2>
            <InputRow label="Реклама на ед." valKey="advertising" hasCheck checkKey="advertising" {...{data, updateData, taxFlags, toggleFlag}} />
          </div>

          <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4">
            <h2 className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2 mb-3">
              <Info size={14} className="text-sky-400"/> 4. Налоги
            </h2>
            <div className="flex gap-2 mb-4">
              {(['usn6', 'usn15'] as const).map(s => (
                <button 
                  key={s} 
                  onClick={() => setData(prev => ({...prev, taxSystem: s}))} 
                  className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase border transition-all ${
                    data.taxSystem === s 
                      ? 'bg-indigo-500 border-indigo-400 text-white' 
                      : 'bg-slate-950 border-white/5 text-slate-500'
                  }`}
                >
                  {s === 'usn6' ? '6%' : '15%'}
                </button>
              ))}
            </div>
            <InputRow label="НДС 2025" valKey="vatRate" suffix="%" {...{data, updateData}} />
            
            <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
              <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Расшифровка расчета:</p>
              <div className="bg-black/20 rounded-lg p-2.5 font-mono text-[10px] space-y-1 text-slate-300">
                <div className="flex justify-between">
                  <span>Доход (P):</span>
                  <span className="text-white">{parseFloat(data.retailPrice || '0').toFixed(1)} ₽</span>
                </div>
    
                {data.taxSystem === 'usn15' && (
                  <div className="flex justify-between text-red-400/80">
                    <span>Вычеты (E):</span>
                    <span>-{calc.deductibleValue.toFixed(1)} ₽</span>
                  </div>
                )}

                <div className="h-px bg-white/10 my-1" />
    
                <div className="flex justify-between font-bold text-indigo-300">
                  <span>Налоговая база:</span>
                  <span>{calc.taxBaseValue.toFixed(1)} ₽</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span>Налог {data.taxSystem === 'usn6' ? '6%' : '15%'}:</span>
                  <span className="text-white">{(calc.totalTaxes - calc.vatAmount).toFixed(1)} ₽</span>
                </div>

                {calc.vatAmount > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>НДС:</span>
                    <span>{calc.vatAmount.toFixed(1)} ₽</span>
                  </div>
                )}

                <div className="flex justify-between border-t border-indigo-500/30 pt-1 mt-1 font-black text-emerald-400 text-[11px]">
                  <span className="uppercase">Всего налоги:</span>
                  <span>{calc.totalTaxes.toFixed(1)} ₽</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <div className="mt-4 pt-3 border-t border-white/5 space-y-2">
      <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest px-1">Детализация логистики:</p>
      <div className="bg-black/20 rounded-lg p-2.5 font-mono text-[10px] space-y-1 text-slate-300">
        <div className="flex justify-between">
          <span>Прямая (склад-клиент):</span>
          <span className="text-white">{calc.L_forward.toFixed(1)} ₽</span>
        </div>
    
        <div className="flex justify-between text-slate-400">
          <span>Обратка (с учетом выкупа):</span>
          <span className="text-white">{calc.L_return.toFixed(1)} ₽</span>
        </div>

        <div className="h-px bg-white/10 my-1" />

        <div className="flex justify-between">
          <span>Комиссия маркетплейса:</span>
          <span className="text-white">{calc.commission.toFixed(1)} ₽</span>
        </div>

        <div className="flex justify-between border-t border-amber-500/30 pt-1 mt-1 font-black text-amber-500 text-[11px]">
          <span className="uppercase">Итого расходы WB:</span>
          <span>{(calc.totalLogisticsWB + calc.commission).toFixed(1)} ₽</span>
        </div>
      </div>
    </div>

<div className="bg-gradient-to-br from-slate-900 to-indigo-950/30 border border-indigo-500/20 rounded-2xl overflow-hidden mt-8">
  <div className="px-4 py-3 bg-indigo-500/10 border-b border-indigo-500/10 flex items-center justify-between">
    <div className="flex items-center gap-2">
      <TrendingUp size={16} className="text-indigo-400"/>
      <h2 className="text-[11px] font-black uppercase text-indigo-300 tracking-wider">Гипотеза прибыли в день</h2>
    </div>
    <div className="text-[10px] text-slate-500">
       Изолированный расчет
    </div>
  </div>

  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-3">
      {/* HYPOTHESIS PRICE INPUT */}
      <div className="flex items-center justify-between py-1 border-b border-white/5">
        <label className="text-[11px] text-indigo-300 font-bold">Моя цена (Гипотеза)</label>
        <div className="flex items-center gap-2">
           <input 
            type="text"
            value={data.hypoPrice}
            onChange={(e) => updateData('hypoPrice', e.target.value)}
            placeholder={data.retailPrice} // Placeholder shows current FACT price
            className="w-20 bg-indigo-500/20 border border-indigo-500/50 rounded px-2 py-1 text-right text-xs text-white outline-none focus:ring-1 focus:ring-indigo-400 font-bold"
          />
          <span className="text-[10px] text-slate-600 font-bold w-4">₽</span>
        </div>
      </div>

      <div className="flex items-center justify-between py-1 border-b border-white/5">
        <label className="text-[11px] text-slate-400">Заказов в день, шт</label>
        <input 
          type="text"
          value={data.hypoOrdersPerDay}
          onChange={(e) => updateData('hypoOrdersPerDay', e.target.value)}
          className="w-16 bg-slate-950 border border-white/10 rounded px-2 py-1 text-right text-xs text-white outline-none focus:border-indigo-500"
        />
      </div>
      <div className="flex items-center justify-between py-1 border-b border-white/5">
        <label className="text-[11px] text-slate-400">Ожидаемый выкуп, %</label>
        <input 
          type="text"
          value={data.hypoBuyoutPercent}
          onChange={(e) => updateData('hypoBuyoutPercent', e.target.value)}
          className="w-16 bg-slate-950 border border-white/10 rounded px-2 py-1 text-right text-xs text-white outline-none focus:border-indigo-500"
        />
      </div>
      
      <div className="flex justify-between items-center pt-2 px-1">
        <span className="text-[10px] text-slate-500 uppercase font-bold">Общая выручка:</span>
        <span className="text-xs font-mono text-slate-300">
          {calc.hypoTotalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} ₽
        </span>
      </div>
    </div> 

    <div className="bg-indigo-500/5 rounded-xl p-4 flex flex-col justify-center items-center border border-indigo-500/10 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-2 opacity-10">
        <Target size={40} />
      </div>
      <p className="text-[9px] font-black text-indigo-400/70 uppercase mb-1">Итого чистая прибыль в день</p>
      <p className="text-3xl font-black text-white font-mono">
        {calc.hypoTotalNetProfit.toLocaleString(undefined, {maximumFractionDigits: 0})} ₽
      </p>
      <p className="text-[10px] text-slate-500 mt-1">
        При продаже {calc.hypoSoldUnits.toFixed(1)} шт/день по цене {calc.H_Price} ₽
      </p>
      {calc.H_NetProfit < 0 && (
         <p className="text-[10px] text-red-400 font-bold mt-1 bg-red-500/10 px-2 py-0.5 rounded">Убыток с единицы: {calc.H_NetProfit.toFixed(0)} ₽</p>
      )}
    </div>
  </div>
</div>

      <div className="fixed bottom-0 left-0 right-0 z-[100] bg-slate-950/90 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex gap-6">
            <div>
              <p className="text-[9px] text-slate-500 uppercase font-black">Прибыль / Unit (Факт)</p>
              <p className={`text-2xl font-black ${calc.netProfit >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>
                {calc.netProfit.toFixed(0)} ₽
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-[9px] text-slate-500 uppercase font-black">ROI</p>
              <p className="text-xl font-black text-indigo-400">{calc.roi.toFixed(0)}%</p>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <p className="text-[9px] text-slate-500 uppercase font-black">Партия ({data.batchSize} шт)</p>
            <p className="text-xl font-black text-white">
              {(calc.netProfit * parseFloat(data.batchSize || '0')).toLocaleString()} ₽
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitEconomics;