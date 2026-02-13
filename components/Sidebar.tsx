import React, { useState } from 'react';
import { AppState } from '../types';
import { 
  LayoutGrid, Package, Calculator, Sparkles, 
  FileText, ChevronDown, ChevronRight, TrendingUp,
  NotebookPen, Cloud, X
} from 'lucide-react';

interface SidebarProps {
  state: AppState;
  setState: (s: AppState) => void;
  cardsCount: number;
  onUploadClick: () => void;
  className?: string;
  onClose?: () => void; // Callback for mobile close
}

const Sidebar: React.FC<SidebarProps> = ({ state, setState, cardsCount, onUploadClick, className = '', onClose }) => {
  const [isReportsOpen, setIsReportsOpen] = useState(true);

  const handleNav = (targetState: AppState) => {
    setState(targetState);
    if (onClose) onClose();
  };

  const handleUpload = () => {
    onUploadClick();
    if (onClose) onClose();
  };

  const menuClass = (isActive: boolean) => `
    flex items-center gap-3 px-3 py-3 rounded-xl font-medium border transition-all relative overflow-hidden group text-left w-full
    ${isActive 
      ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
      : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border-transparent hover:border-white/5'
    }
  `;

  return (
    <aside className={`w-64 bg-slate-950/90 backdrop-blur-md border-r border-white/5 flex flex-col h-full shrink-0 ${className}`}>
      
      {/* Mobile Header with Close Button */}
      {onClose && (
        <div className="flex items-center justify-between p-4 md:hidden border-b border-white/5">
          <span className="text-sm font-bold text-white">Меню</span>
          <button onClick={onClose} className="p-2 bg-white/5 rounded-lg text-slate-400">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Scrollable Navigation Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-2">
          SEO & Товары
        </div>
        
        <button onClick={handleUpload} className={menuClass([AppState.DASHBOARD, AppState.UPLOAD, AppState.MAPPING, AppState.PROCESSING].includes(state))}>
          <LayoutGrid className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Анализ запросов</span>
        </button>
        
        <button onClick={() => handleNav(AppState.PRODUCT_CARDS)} className={menuClass(state === AppState.PRODUCT_CARDS)}>
          <Package className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Карточки товаров</span>
          <span className="relative z-10 ml-auto bg-slate-800 text-xs font-bold px-2 py-0.5 rounded-full text-slate-400">
            {cardsCount}
          </span>
        </button>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-6">
          Бизнес
        </div>

        <button onClick={() => handleNav(AppState.BUSINESS_NOTES)} className={menuClass(state === AppState.BUSINESS_NOTES)}>
          <NotebookPen className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Заметки и идеи</span>
        </button>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-6">
          Финансы
        </div>

        <div>
          <button 
            onClick={() => setIsReportsOpen(!isReportsOpen)}
            className="flex items-center justify-between w-full px-3 py-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText size={16} /> Отчеты
            </div>
            {isReportsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
          
          {isReportsOpen && (
            <div className="pl-4 mt-1 space-y-1">
              <button 
                onClick={() => handleNav(AppState.FINANCE_DETAILS)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${state === AppState.FINANCE_DETAILS ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Детализация
              </button>
              <button 
                onClick={() => handleNav(AppState.FINANCE_TRENDS)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${state === AppState.FINANCE_TRENDS ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Аналитика трендов
              </button>
              <button 
                onClick={() => handleNav(AppState.FINANCE_HISTORY)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${state === AppState.FINANCE_HISTORY ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                История расчетов
              </button>
              <button 
                onClick={() => handleNav(AppState.FINANCE_COGS)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${state === AppState.FINANCE_COGS ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Себестоимость
              </button>
            </div>
          )}
        </div>

        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-2 mt-6">
          Инструменты
        </div>

        <button onClick={() => handleNav(AppState.UNIT_ECONOMICS)} className={menuClass(state === AppState.UNIT_ECONOMICS)}>
          <Calculator className="w-5 h-5 relative z-10" />
          <span className="relative z-10">Юнит-экономика</span>
        </button>
      </div>

      {/* Footer Area (Pinned to bottom) */}
      <div className="p-4 space-y-3 bg-slate-950 border-t border-white/5 shrink-0 z-20">
        <div className="px-4 py-3 rounded-2xl bg-slate-900 border border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <Cloud size={14} className="text-emerald-500" />
             <span className="text-xs font-bold text-slate-300">Облако</span>
           </div>
           <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-900/20 to-violet-900/20 border border-white/5">
          <div className="flex items-center gap-2 mb-2 text-indigo-300">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold">AI Assistant</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Gemini 3 Flash активирован для анализа трендов.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;