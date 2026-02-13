import React, { useState, useMemo } from 'react';
import { ArrowRight, FileSpreadsheet, CheckCircle2 } from 'lucide-react';
import { ColumnMapping } from '../types';

interface ColumnMapperProps {
  headers: string[];
  initialMapping: Partial<ColumnMapping>;
  onConfirm: (config: ColumnMapping) => void;
  onCancel: () => void;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({ headers, initialMapping, onConfirm, onCancel }) => {
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>(initialMapping);

  const isValid = useMemo(() => {
    return mapping.query && mapping.t1 && mapping.t0;
  }, [mapping]);

  const fields: { key: keyof ColumnMapping; label: string; desc: string; required: boolean }[] = [
    { key: 'query', label: 'Поисковый запрос', desc: 'Колонка с текстом запроса', required: true },
    { key: 't1', label: 'Частота (Сейчас)', desc: 'Текущее количество запросов', required: true },
    { key: 't0', label: 'Частота (Ранее)', desc: 'Предыдущий период', required: true },
    { key: 'subject', label: 'Предмет', desc: 'Категория товара (необязательно)', required: false },
    { key: 'dailyT1', label: 'Ср. запросов в день', desc: 'Дневная динамика (необязательно)', required: false },
  ];

  return (
    <div className="w-full max-w-3xl animate-fade-in">
      <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 overflow-hidden ring-1 ring-white/5">
        <div className="p-10 border-b border-white/5 bg-white/5">
           <div className="flex items-center gap-5 mb-2">
             <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center shadow-inner border border-white/10 text-indigo-400">
               <FileSpreadsheet className="w-7 h-7" />
             </div>
             <div>
               <h2 className="text-2xl font-black text-white tracking-tight">Настройка колонок</h2>
               <p className="text-slate-400 font-medium mt-1">Система автоматически определила структуру.</p>
             </div>
           </div>
        </div>

        <div className="p-10 space-y-8">
          {fields.map((field) => (
            <div key={field.key} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center group">
              <div className="md:col-span-4">
                <label className="block text-sm font-bold text-slate-200 flex items-center gap-1.5">
                  {field.label}
                  {field.required && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_5px_rgba(99,102,241,0.8)]"></span>}
                </label>
                <p className="text-xs text-slate-500 mt-1 font-medium">{field.desc}</p>
              </div>
              <div className="md:col-span-8">
                <div className="relative">
                  <select
                    className={`w-full p-4 bg-slate-950/50 border rounded-xl focus:ring-2 outline-none transition-all font-semibold text-slate-200 appearance-none cursor-pointer ${
                       !mapping[field.key] && field.required 
                       ? 'border-amber-500/30 focus:border-amber-500/50 focus:ring-amber-500/20 bg-amber-900/10' 
                       : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20 hover:border-white/20'
                    }`}
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                  >
                    <option value="" className="bg-slate-900 text-slate-400">-- Не выбрано --</option>
                    {headers.map(h => (
                      <option key={h} value={h} className="bg-slate-900 text-slate-200">{h}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-slate-500">
                     {mapping[field.key] ? (
                       <CheckCircle2 className="w-5 h-5 text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.5)]" />
                     ) : (
                       <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                     )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 bg-white/5 border-t border-white/5 flex justify-between items-center">
          <button
            onClick={onCancel}
            className="px-6 py-3 text-slate-400 font-bold hover:text-white transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={() => isValid && onConfirm(mapping as ColumnMapping)}
            disabled={!isValid}
            className={`flex items-center gap-3 px-10 py-4 rounded-xl font-bold shadow-lg transition-all transform hover:-translate-y-0.5 ${
              isValid
                ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:shadow-indigo-500/30 border border-white/10'
                : 'bg-white/5 text-slate-600 cursor-not-allowed shadow-none border border-transparent'
            }`}
          >
            <span>Начать анализ</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ColumnMapper;