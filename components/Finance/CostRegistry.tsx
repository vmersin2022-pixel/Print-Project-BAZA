import React, { useState, useMemo, useEffect } from 'react';
import { Search, Save, Package, AlertCircle, ArrowUp, CheckCircle } from 'lucide-react';
import { CostItem } from '../../types';

interface CostRegistryProps {
  registry: CostItem[];
  onUpdateRegistry: (items: CostItem[]) => void;
}

const CostRegistry: React.FC<CostRegistryProps> = ({ registry, onUpdateRegistry }) => {
  const [search, setSearch] = useState('');
  const [localRegistry, setLocalRegistry] = useState<CostItem[]>(registry);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  // New States
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Sync prop changes (e.g. after save or new upload)
  useEffect(() => {
    setLocalRegistry(registry);
  }, [registry]);

  // STABLE SORTING LOGIC
  // Мы определяем порядок на основе 'registry' (пропсов), а не 'localRegistry' (стейта ввода).
  // Это предотвращает прыжки строк: даже если вы введете цену, товар останется на месте (как "нулевой"),
  // пока вы не нажмете кнопку "Сохранить".
  const displayItems = useMemo(() => {
    // 1. Фильтруем исходный (стабильный) список
    let items = registry.filter(item => 
      item.vendorCode.toLowerCase().includes(search.toLowerCase()) ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.barcode.includes(search)
    );

    // 2. Сортируем: Нулевые (по сохраненным данным) сверху
    items.sort((a, b) => {
      if (a.cost === 0 && b.cost !== 0) return -1;
      if (a.cost !== 0 && b.cost === 0) return 1;
      return a.vendorCode.localeCompare(b.vendorCode);
    });

    // 3. Подменяем данные на локальные (чтобы видеть то, что вводим)
    const localMap = new Map(localRegistry.map(i => [i.barcode, i]));
    
    return items.map(item => localMap.get(item.barcode) || item);
  }, [registry, localRegistry, search]);

  useEffect(() => {
    const checkScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener('scroll', checkScroll);
    return () => window.removeEventListener('scroll', checkScroll);
  }, []);

  const handleCostChange = (barcode: string, val: string) => {
    // Разрешаем пустую строку для удобства стирания
    const numVal = val === '' ? 0 : parseFloat(val);
    
    setLocalRegistry(prev => prev.map(item => 
      item.barcode === barcode ? { ...item, cost: isNaN(numVal) ? 0 : numVal } : item
    ));
    setHasUnsavedChanges(true);
  };

  const saveChanges = () => {
    onUpdateRegistry(localRegistry);
    setHasUnsavedChanges(false);
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000); // Скрыть через 3 сек
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in relative">
      
      {/* SUCCESS TOAST */}
      {showSuccess && (
        <div className="fixed top-24 right-6 z-50 bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right duration-300">
           <CheckCircle className="w-5 h-5" />
           <span className="font-bold text-sm">Успешно сохранено!</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 p-6 rounded-3xl border border-white/5 backdrop-blur-xl">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Package className="text-indigo-400" />
            Себестоимость товаров
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Справочник для расчета чистой прибыли. Товары с ценой 0 показываются первыми.
          </p>
        </div>
        
        {hasUnsavedChanges && (
          <button 
            onClick={saveChanges}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20 transition-all animate-pulse"
          >
            <Save size={18} />
            Сохранить изменения
          </button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Поиск по артикулу, названию или баркоду..." 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900/60 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:border-indigo-500/50 transition-all shadow-xl"
        />
      </div>

      <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5 border-b border-white/5 text-[11px] uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4 font-black">Артикул / Товар</th>
                <th className="px-6 py-4 font-black">Баркод</th>
                <th className="px-6 py-4 font-black text-right">Себестоимость (₽)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {displayItems.map(item => (
                <tr key={item.barcode} className={`hover:bg-white/5 transition-colors group ${item.cost === 0 ? 'bg-amber-500/5' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-200 text-sm flex items-center gap-2">
                        {item.vendorCode}
                        {/* Показываем индикатор "нулевой цены" основываясь на ТЕКУЩЕМ значении, чтобы пользователь видел результат ввода */}
                        {item.cost === 0 && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>}
                      </span>
                      <span className="text-xs text-slate-500 line-clamp-1">{item.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-mono text-slate-400">
                    {item.barcode}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <input 
                      type="number" 
                      // Если цена 0 и мы не редактировали (нет несохраненных), можно показать пустоту или 0.
                      // Для удобства показываем значение как есть.
                      value={item.cost === 0 && !hasUnsavedChanges ? '' : item.cost} 
                      placeholder="0"
                      onChange={(e) => handleCostChange(item.barcode, e.target.value)}
                      className={`w-32 bg-slate-950 border rounded-lg px-3 py-2 text-right text-sm font-bold text-white outline-none transition-all group-hover:border-white/20 ${
                        item.cost === 0 ? 'border-amber-500/30 focus:border-amber-500' : 'border-white/10 focus:border-indigo-500'
                      }`}
                    />
                  </td>
                </tr>
              ))}
              {displayItems.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-slate-500">
                    <div className="flex flex-col items-center gap-2">
                      <AlertCircle className="w-8 h-8 opacity-50" />
                      <span>Товары не найдены. Загрузите отчет для авто-добавления.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SCROLL TO TOP BUTTON */}
      {showScrollTop && (
        <button 
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 p-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full shadow-2xl shadow-indigo-500/40 transition-all hover:-translate-y-1 animate-in zoom-in duration-300"
        >
          <ArrowUp size={24} />
        </button>
      )}
    </div>
  );
};

export default CostRegistry;