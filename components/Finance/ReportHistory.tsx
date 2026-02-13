import React, { useState } from 'react';
import { SavedFinancialReport } from '../../types';
import { FileText, Trash2, Calendar, DollarSign, ArrowRight, CheckSquare, Square, Layers } from 'lucide-react';

interface ReportHistoryProps {
  reports: SavedFinancialReport[];
  onLoad: (report: SavedFinancialReport) => void;
  onDelete: (id: string) => void;
  onMerge: (reports: SavedFinancialReport[]) => void;
}

const ReportHistory: React.FC<ReportHistoryProps> = ({ reports, onLoad, onDelete, onMerge }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id) 
        : [...prev, id]
    );
  };

  const handleMergeClick = () => {
    const selectedReports = reports.filter(r => selectedIds.includes(r.id));
    if (selectedReports.length > 0) {
      onMerge(selectedReports);
      setSelectedIds([]); // Reset selection after merge
    }
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  return (
    <div className="w-full max-w-7xl mx-auto pb-32 animate-fade-in relative">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <FileText className="text-indigo-400" /> История расчетов
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Выберите несколько отчетов галочками, чтобы создать сводный (например, за месяц).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(report => (
          <div 
            key={report.id} 
            onClick={() => toggleSelection(report.id)}
            className={`
              relative rounded-2xl p-6 transition-all group overflow-hidden cursor-pointer border
              ${isSelected(report.id) 
                ? 'bg-indigo-900/20 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.2)]' 
                : 'bg-slate-900/40 border-white/5 hover:border-indigo-500/30'
              }
            `}
          >
            {/* Selection Checkbox */}
            <div className="absolute top-4 right-4 z-10">
              {isSelected(report.id) ? (
                <div className="bg-indigo-500 text-white rounded-lg p-1">
                  <CheckSquare size={20} />
                </div>
              ) : (
                <div className="text-slate-600 hover:text-indigo-400 transition-colors">
                  <Square size={20} />
                </div>
              )}
            </div>

            <div className="flex justify-between items-start mb-4 pr-8">
               <div>
                 <h3 className={`text-lg font-bold transition-colors ${isSelected(report.id) ? 'text-indigo-200' : 'text-white group-hover:text-indigo-300'}`}>
                   {report.name}
                 </h3>
                 <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                   <Calendar size={12} /> {report.dateCreated}
                 </div>
               </div>
            </div>

            <div className="space-y-3 mb-6 pointer-events-none">
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400">Выручка</span>
                 <span className="text-white font-bold">{report.summary.realized.toLocaleString()} ₽</span>
               </div>
               <div className="flex justify-between text-sm">
                 <span className="text-slate-400">К выплате</span>
                 <span className="text-indigo-300 font-bold">{report.summary.toPay.toLocaleString()} ₽</span>
               </div>
               <div className="h-px bg-white/5 my-2"></div>
               <div className="flex justify-between text-sm">
                 <span className="text-emerald-400 font-bold">Чистая прибыль</span>
                 <span className="text-emerald-400 font-black">{report.summary.netProfit.toLocaleString()} ₽</span>
               </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); onLoad(report); }}
                className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                Открыть <ArrowRight size={14} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(report.id); }}
                className="px-4 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                title="Удалить"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="col-span-full py-20 text-center text-slate-500 border border-dashed border-white/10 rounded-3xl">
            <p>Нет сохраненных отчетов</p>
          </div>
        )}
      </div>

      {/* Floating Action Bar for Merge */}
      {selectedIds.length > 1 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-10 fade-in zoom-in-95 duration-300 w-full max-w-md px-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 shadow-[0_0_40px_rgba(0,0,0,0.5)] rounded-2xl p-4 flex items-center justify-between ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg">
                {selectedIds.length}
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Выбрано отчетов</span>
                <span className="text-sm font-bold text-white">Готовы к объединению</span>
              </div>
            </div>
            
            <button 
              onClick={handleMergeClick}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-500/20 flex items-center gap-2 transition-all transform hover:scale-105"
            >
              <Layers size={18} />
              Сформировать
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportHistory;