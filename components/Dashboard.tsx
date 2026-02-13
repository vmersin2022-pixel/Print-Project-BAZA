import React, { useMemo, useState } from 'react';
import { AnalyzedRow } from '../types';
import { 
  TrendingUp, Rocket, Diamond, ChevronRight, 
  ArrowUpDown, Filter, Search, List, 
  Package, Check, Plus, Sparkles, X, MessageCircle, Globe, Loader2, ExternalLink
} from 'lucide-react';
import { analyzeTrendOrigin, TrendAnalysisResult } from '../utils/ai';

interface DashboardProps {
  data: AnalyzedRow[];
  onReset: () => void;
  onAddToPlanner: (query: string) => void;
  plannedQueries: string[];
}

type TabType = 'growing' | 'early' | 'pp' | 'all';
type SortField = 't1' | 'diffPercent' | 'ppScore' | 'orders' | 'clicks' | 'itemsWithOrders' | 'topItemName';

// --- TREND MODAL COMPONENT ---
const TrendAnalysisModal = ({ 
  query, 
  onClose 
}: { 
  query: string, 
  onClose: () => void 
}) => {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TrendAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    const fetchTrend = async () => {
      try {
        const data = await analyzeTrendOrigin(query);
        setResult(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTrend();
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
      <div className="bg-[#0b0f19] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden relative flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-white/5 bg-slate-900/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
               <Sparkles className="text-white w-5 h-5 animate-pulse" />
             </div>
             <div>
               <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">AI Анализ тренда</h3>
               <h2 className="text-xl font-black text-white">{query}</h2>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-slate-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
              <div className="text-center space-y-1">
                <p className="text-white font-bold">Нейросеть ищет информацию...</p>
                <p className="text-xs text-slate-500">Сканирую TikTok, соцсети и новости</p>
              </div>
            </div>
          ) : error ? (
             <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-center gap-3">
               <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
               {error}
             </div>
          ) : result ? (
            <div className="space-y-6 animate-in slide-in-from-bottom-2">
              
              {/* Text Analysis */}
              <div className="bg-slate-900/40 rounded-xl p-5 border border-white/5">
                <div className="flex items-center gap-2 mb-3 text-indigo-300 font-bold text-sm">
                  <MessageCircle size={16} />
                  <span>Откуда пришел тренд?</span>
                </div>
                <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
                  {result.text}
                </div>
              </div>

              {/* Sources */}
              {result.sources.length > 0 && (
                <div>
                   <div className="flex items-center gap-2 mb-3 text-emerald-400 font-bold text-sm">
                      <Globe size={16} />
                      <span>Найденные источники</span>
                   </div>
                   <div className="grid gap-2">
                     {result.sources.map((source, idx) => (
                       <a 
                         key={idx} 
                         href={source.uri} 
                         target="_blank" 
                         rel="noreferrer"
                         className="flex items-center justify-between p-3 rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/30 hover:bg-white/5 transition-all group"
                       >
                         <div className="flex items-center gap-3 overflow-hidden">
                           <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center text-slate-500 text-xs font-bold group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                             {idx + 1}
                           </div>
                           <span className="text-sm text-slate-300 truncate group-hover:text-indigo-200 transition-colors">
                             {source.title}
                           </span>
                         </div>
                         <ExternalLink size={14} className="text-slate-600 group-hover:text-white shrink-0" />
                       </a>
                     ))}
                   </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const PaginatedTable = ({ 
  items, 
  type, 
  onAddToPlanner, 
  plannedQueries 
}: { 
  items: AnalyzedRow[], 
  type: TabType,
  onAddToPlanner: (query: string) => void,
  plannedQueries: string[]
}) => {
  const [limit, setLimit] = useState(50);
  const [sortField, setSortField] = useState<SortField>(
    type === 'pp' ? 'ppScore' : type === 'early' ? 't1' : 'diffPercent'
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [subjectSearch, setSubjectSearch] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Modal State
  const [trendModalQuery, setTrendModalQuery] = useState<string | null>(null);

  const allSubjects = useMemo(() => {
    return Array.from(new Set(items.map(i => i.subject)))
      .filter(s => s && s !== '—')
      .sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filteredSubjectsList = useMemo(() => {
    return allSubjects.filter(s => s.toLowerCase().includes(subjectSearch.toLowerCase()));
  }, [allSubjects, subjectSearch]);

  const processedItems = useMemo(() => {
    let result = selectedSubjects.length > 0 
      ? items.filter(i => selectedSubjects.includes(i.subject))
      : [...items];

    result.sort((a: any, b: any) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'topItemName') {
        aVal = a.topItemName || a["Больше всего заказов в предмете"] || '';
        bVal = b.topItemName || b["Больше всего заказов в предмете"] || '';
      }

      aVal = aVal ?? '';
      bVal = bVal ?? '';
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortOrder === 'desc' 
          ? bVal.localeCompare(aVal) 
          : aVal.localeCompare(bVal);
      }
      
      return sortOrder === 'desc' 
        ? (Number(bVal) - Number(aVal)) 
        : (Number(aVal) - Number(bVal));
    });

    return result;
  }, [items, sortField, sortOrder, selectedSubjects]);

  const visibleItems = processedItems.slice(0, limit);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const SortBtn = ({ field, label, align = 'right' }: { field: SortField, label: string, align?: 'left' | 'right' }) => (
    <button 
      onClick={() => toggleSort(field)} 
      className={`flex items-center gap-1.5 hover:text-indigo-400 transition-colors group ${align === 'right' ? 'ml-auto' : ''} uppercase tracking-widest text-[10px] font-black ${
        sortField === field ? 'text-indigo-400' : 'text-slate-500'
      }`}
    >
      {label} 
      <ArrowUpDown size={12} className={`${sortField === field ? 'text-indigo-500' : 'text-slate-700'}`} />
    </button>
  );

  return (
    <>
      {trendModalQuery && (
        <TrendAnalysisModal 
          query={trendModalQuery} 
          onClose={() => setTrendModalQuery(null)} 
        />
      )}

      <div className="space-y-4">
        <div className="flex justify-end relative z-30">
          <button 
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold border transition-all ${
              selectedSubjects.length > 0 ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-900/80 border-white/10 text-slate-400'
            }`}
          >
            <Filter size={16} />
            <span>Предметы {selectedSubjects.length > 0 && `(${selectedSubjects.length})`}</span>
          </button>

          {isFilterOpen && (
            <div className="absolute top-14 right-0 w-72 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-4 z-50 ring-1 ring-white/5 animate-in fade-in zoom-in duration-150">
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                <input 
                  autoFocus
                  type="text"
                  placeholder="Поиск предмета..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-white/5 rounded-lg py-2 pl-9 pr-3 text-xs text-slate-200 outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
                {filteredSubjectsList.map(sub => (
                  <label key={sub} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={selectedSubjects.includes(sub)}
                      onChange={() => setSelectedSubjects(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub])}
                      className="w-4 h-4 rounded border-white/10 bg-slate-800 text-indigo-600 focus:ring-0"
                    />
                    <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200 truncate">{sub}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="bg-slate-900/40 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/5 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 min-w-[200px]">Запрос / Действия</th>
                  <th className="px-4 py-5"><SortBtn field="topItemName" label="Больше заказов в предмете" align="left" /></th>
                  <th className="px-4 py-5 text-right"><SortBtn field="t1" label="T1" /></th>
                  <th className="px-4 py-5 text-right"><SortBtn field="diffPercent" label="Динамика" /></th>
                  <th className="px-4 py-5 text-right"><SortBtn field="clicks" label="Клики" /></th>
                  <th className="px-4 py-5 text-right"><SortBtn field="orders" label="Заказы" /></th>
                  <th className="px-4 py-5 text-right"><SortBtn field="itemsWithOrders" label="Конкуренция" /></th>
                  <th className="px-8 py-5 text-right"><SortBtn field="ppScore" label="PP Score" /></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {visibleItems.map((r) => {
                  const isPlanned = plannedQueries.includes(r.query);
                  return (
                    <tr key={r.id} className="hover:bg-indigo-500/5 transition-all duration-150 group">
                      <td className="px-8 py-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-slate-200 group-hover:text-white transition-colors uppercase tracking-tight text-sm">
                                {r.query}
                            </div>
                            {/* AI BUTTON */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTrendModalQuery(r.query);
                                }}
                                className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transform scale-90 hover:scale-100"
                                title="AI Анализ тренда"
                            >
                                <Sparkles size={14} />
                            </button>
                          </div>

                          {/* Add to Planner Button */}
                          <button
                            onClick={() => !isPlanned && onAddToPlanner(r.query)}
                            disabled={isPlanned}
                            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all w-fit border ${
                              isPlanned
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 cursor-default'
                                : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white hover:border-white/20 hover:bg-white/5'
                            }`}
                          >
                            {isPlanned ? (
                              <>
                                <Check size={12} />
                                <span>В работе</span>
                              </>
                            ) : (
                              <>
                                <Plus size={12} />
                                <span>В работу</span>
                              </>
                            )}
                          </button>

                          <div className="flex flex-wrap gap-1 mt-1">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-tighter bg-slate-950 px-1.5 py-0.5 rounded border border-white/5">
                              {r.subject}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                         <div className="flex items-start gap-2 max-w-[220px]">
                            <Package size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
                            <div className="text-[11px] font-bold text-sky-400/80 leading-tight line-clamp-2 uppercase tracking-tighter">
                              {(r as any).topItemName || (r as any)["Больше всего заказов в предмете"] || 'Неизвестно'}
                            </div>
                         </div>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-400 group-hover:text-indigo-300">{r.t1.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-[9px] font-black border ${
                          r.diffPercent > 0 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : r.diffPercent < 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-slate-800 text-slate-500 border-white/5'
                        }`}>
                          {r.diffPercent > 0 ? '+' : ''}{r.diffPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-slate-400">{r.clicks.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right font-mono text-xs text-emerald-400/80 font-bold">{r.orders.toLocaleString()}</td>
                      <td className="px-4 py-4 text-right">
                        <div className="text-[10px] text-slate-500">
                          <span className="font-bold text-slate-300">{r.itemsWithOrders}</span> тов.
                          <div className="text-[8px] text-amber-500/40 uppercase font-black">CR: {r.convToOrder}%</div>
                        </div>
                      </td>
                      <td className="px-8 py-4 text-right">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-black border transition-all ${
                          r.ppScore >= 2.3 
                          ? 'bg-violet-500/20 text-violet-300 border-violet-500/30' 
                          : r.ppScore >= 1.8 ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' : 'bg-slate-800/40 text-slate-500 border-white/5'
                        }`}>
                          {r.ppScore.toFixed(2)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {limit < processedItems.length && (
            <div className="px-8 py-6 bg-white/5 border-t border-white/5 flex justify-center">
                <button 
                  onClick={() => setLimit(l => l + 50)}
                  className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/20 rounded-xl text-[10px] font-black uppercase text-indigo-400 tracking-widest transition-all"
                >
                  Загрузить еще <ChevronRight className="w-4 h-4" />
                </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// Dashboard компонент
const Dashboard: React.FC<DashboardProps> = ({ data, onReset, onAddToPlanner, plannedQueries }) => {
  const [activeTab, setActiveTab] = useState<TabType>('growing');

  const filteredData = useMemo(() => ({
    growing: data.filter(r => r.t1 > r.t0),
    early: data.filter(r => r.isEarlyTrend),
    pp: data.filter(r => r.t1 > r.t0 || r.isEarlyTrend),
    all: data
  }), [data]);

  const tabs = [
    { id: 'growing', label: 'Растущие', icon: TrendingUp, count: filteredData.growing.length },
    { id: 'early', label: 'Тренды', icon: Rocket, count: filteredData.early.length },
    { id: 'pp', label: 'Potential', icon: Diamond, count: filteredData.pp.length },
    { id: 'all', label: 'Все запросы', icon: List, count: filteredData.all.length },
  ];

  return (
    <div className="space-y-8 animate-fade-in w-full max-w-7xl mx-auto pb-20">
      <div className="flex items-center p-1.5 bg-slate-900/60 backdrop-blur-xl rounded-2xl w-fit border border-white/10 shadow-xl overflow-x-auto max-w-full no-scrollbar">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-6 py-3 flex items-center gap-3 text-[11px] font-black uppercase tracking-widest transition-all rounded-xl relative whitespace-nowrap ${
                isActive ? 'text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {isActive && (
                <div className="absolute inset-0 bg-indigo-600/20 rounded-xl border border-indigo-500/30"></div>
              )}
              <tab.icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]' : 'text-slate-600'}`} />
              <span className="relative z-10">{tab.label}</span>
              <span className={`ml-2 text-[9px] py-0.5 px-2 rounded-full relative z-10 ${
                isActive ? 'bg-indigo-500/30 text-indigo-300' : 'bg-slate-800 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="min-h-[600px] animate-in slide-in-from-bottom-4 duration-500">
        <PaginatedTable 
          items={filteredData[activeTab]} 
          type={activeTab} 
          onAddToPlanner={onAddToPlanner}
          plannedQueries={plannedQueries}
        />
      </div>
    </div>
  );
};

export default Dashboard;