import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, X, Check, Calendar, 
  Package, Palette, Image as ImageIcon, FileText, UploadCloud,
  MoreHorizontal, ChevronRight, Sparkles, ExternalLink, Loader2
} from 'lucide-react';
import { ProductCard, ProductStatus } from '../types';
import { generateSeoWithTrends } from '../utils/ai';

interface ProductPlannerProps {
  cards: ProductCard[];
  onAddCard: (query: string) => void;
  onUpdateCard: (card: ProductCard) => void;
}

const ProductPlanner: React.FC<ProductPlannerProps> = ({ cards, onAddCard, onUpdateCard }) => {
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newQuery, setNewQuery] = useState('');
  const [selectedCard, setSelectedCard] = useState<ProductCard | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Filter cards
  const filteredCards = useMemo(() => {
    return cards.filter(c => c.query.toLowerCase().includes(search.toLowerCase()));
  }, [cards, search]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuery.trim()) {
      onAddCard(newQuery);
      setNewQuery('');
      setIsAddOpen(false);
    }
  };

  const updateStage = (key: keyof ProductCard['stages']) => {
    if (!selectedCard) return;
    const updated = {
      ...selectedCard,
      stages: { ...selectedCard.stages, [key]: !selectedCard.stages[key] }
    };
    // Auto-update status logic (optional simplified)
    if (updated.stages.published) updated.status = 'published';
    else if (Object.values(updated.stages).some(v => v)) updated.status = 'in_work';
    
    setSelectedCard(updated);
    onUpdateCard(updated);
  };

  const updateSeo = (key: keyof ProductCard['seo'], value: string) => {
    if (!selectedCard) return;
    const updated = {
      ...selectedCard,
      seo: { ...selectedCard.seo, [key]: value }
    };
    setSelectedCard(updated);
    onUpdateCard(updated);
  };

  const handleAiGeneration = async () => {
    if (!selectedCard) return;
    setIsAiLoading(true);
    try {
      const data = await generateSeoWithTrends(selectedCard.query);
      
      const updated = {
        ...selectedCard,
        seo: {
          ...selectedCard.seo,
          title: data.title,
          description: data.description,
          mainKey: data.mainKey,
          additionalKeys: data.additionalKeys,
          bullets: data.bullets,
          aiSearchLinks: data.searchLinks
        }
      };
      
      setSelectedCard(updated);
      onUpdateCard(updated);
    } catch (e: any) {
      alert("Ошибка AI: " + e.message);
    } finally {
      setIsAiLoading(false);
    }
  };

  const getStatusColor = (s: ProductStatus) => {
    switch (s) {
      case 'published': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'in_work': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default: return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    }
  };

  const getStatusLabel = (s: ProductStatus) => {
    switch (s) {
      case 'published': return 'Опубликовано';
      case 'in_work': return 'В работе';
      default: return 'Идея';
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-20">
      {/* Top Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input 
            type="text" 
            placeholder="Поиск по карточкам..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/50 transition-all"
          />
        </div>
        <button 
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5"
        >
          <Plus size={18} />
          <span>Добавить карточку</span>
        </button>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredCards.map(card => (
          <div 
            key={card.id}
            onClick={() => setSelectedCard(card)}
            className="group bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-indigo-500/30 rounded-2xl p-5 cursor-pointer transition-all hover:bg-slate-800/40 relative overflow-hidden"
          >
            <div className="flex justify-between items-start mb-4">
               <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${getStatusColor(card.status)}`}>
                 {getStatusLabel(card.status)}
               </span>
               <span className="text-[10px] text-slate-500 font-mono">{card.createdAt}</span>
            </div>
            
            <h3 className="text-lg font-bold text-slate-200 mb-6 line-clamp-2 group-hover:text-white transition-colors">
              {card.query}
            </h3>

            {/* Mini Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><Palette size={12} /> Принт</span>
                {card.stages.printDev ? <Check size={14} className="text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><FileText size={12} /> Карточка</span>
                {card.stages.cardCreated ? <Check size={14} className="text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/10" />}
              </div>
            </div>

            {/* Hover Glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          </div>
        ))}

        {filteredCards.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/10 rounded-2xl">
            <Package size={48} className="mb-4 opacity-20" />
            <p className="text-sm">Карточек не найдено. Создайте новую!</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <form onSubmit={handleCreate} className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button type="button" onClick={() => setIsAddOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-white mb-6">Новая идея товара</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-2 uppercase">Поисковый запрос</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newQuery}
                  onChange={e => setNewQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-white focus:border-indigo-500 outline-none"
                  placeholder="Например: футболка с котом"
                />
              </div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-bold transition-colors">
                Создать
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {selectedCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-[#0b0f19] border border-white/10 rounded-3xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-start justify-between bg-slate-900/50">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${getStatusColor(selectedCard.status)}`}>
                    {getStatusLabel(selectedCard.status)}
                  </span>
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Calendar size={12} /> {selectedCard.createdAt}
                  </span>
                </div>
                <h2 className="text-2xl font-bold text-white">{selectedCard.query}</h2>
              </div>
              <button onClick={() => setSelectedCard(null)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto flex flex-col md:flex-row">
              {/* Left Column: Tracking */}
              <div className="md:w-1/3 p-6 border-r border-white/5 bg-slate-900/20 space-y-8 overflow-y-auto">
                <div>
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Трекер этапов</h3>
                  <div className="space-y-3">
                    {[
                      { key: 'printDev', label: 'Принт разработан', icon: Palette },
                      { key: 'layout', label: 'Макет подготовлен', icon: FileText },
                      { key: 'photos', label: 'Фото готовы', icon: ImageIcon },
                      { key: 'cardCreated', label: 'Карточка создана', icon: UploadCloud },
                      { key: 'published', label: 'Опубликована', icon: Package },
                    ].map((stage) => (
                      <label key={stage.key} className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/5 cursor-pointer transition-colors group">
                        <div className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all ${
                          selectedCard.stages[stage.key as keyof ProductCard['stages']] 
                          ? 'bg-indigo-600 border-indigo-500 text-white' 
                          : 'border-white/20 bg-slate-950 group-hover:border-indigo-500/50'
                        }`}>
                          {selectedCard.stages[stage.key as keyof ProductCard['stages']] && <Check size={14} />}
                        </div>
                        <input 
                          type="checkbox" 
                          className="hidden"
                          checked={selectedCard.stages[stage.key as keyof ProductCard['stages']]}
                          onChange={() => updateStage(stage.key as keyof ProductCard['stages'])}
                        />
                        <div className="flex items-center gap-2 text-sm font-medium text-slate-300 group-hover:text-white">
                          <stage.icon size={16} className="text-slate-500" />
                          {stage.label}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* AI SOURCES SECTION */}
                {selectedCard.seo.aiSearchLinks && selectedCard.seo.aiSearchLinks.length > 0 && (
                  <div className="pt-6 border-t border-white/5 animate-in fade-in slide-in-from-left-2">
                    <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Sparkles size={12} /> Источники трендов
                    </h3>
                    <div className="space-y-2">
                      {selectedCard.seo.aiSearchLinks.map((link, i) => (
                        <a 
                          key={i}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 p-2 rounded-lg bg-indigo-900/10 border border-indigo-500/10 hover:bg-indigo-900/20 hover:border-indigo-500/30 transition-all group"
                        >
                          <div className="min-w-[4px] h-[4px] rounded-full bg-indigo-500"></div>
                          <span className="text-[10px] text-slate-300 line-clamp-1 group-hover:text-indigo-200">{link.title}</span>
                          <ExternalLink size={10} className="ml-auto text-slate-500 group-hover:text-indigo-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: SEO */}
              <div className="md:w-2/3 p-6 bg-slate-950/30 overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-indigo-400">
                     <FileText size={18} />
                     <h3 className="text-sm font-black uppercase tracking-widest">SEO и Контент</h3>
                  </div>
                  
                  <button 
                    onClick={handleAiGeneration}
                    disabled={isAiLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAiLoading ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    <span>{isAiLoading ? 'Анализирую тренды...' : 'AI-анализ трендов'}</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Название товара</label>
                    <input 
                      type="text" 
                      value={selectedCard.seo.title}
                      onChange={e => updateSeo('title', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="Название для WB..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Основной ключ</label>
                    <input 
                      type="text" 
                      value={selectedCard.seo.mainKey}
                      onChange={e => updateSeo('mainKey', e.target.value)}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all"
                      placeholder="Главный поисковый запрос"
                    />
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Дополнительные ключи</label>
                    <textarea 
                      value={selectedCard.seo.additionalKeys}
                      onChange={e => updateSeo('additionalKeys', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                      placeholder="Список ключей через запятую..."
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Описание (SEO-текст)</label>
                    <textarea 
                      value={selectedCard.seo.description}
                      onChange={e => updateSeo('description', e.target.value)}
                      rows={6}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                      placeholder="Черновик описания товара..."
                    />
                  </div>

                   <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Буллеты (Преимущества)</label>
                    <textarea 
                      value={selectedCard.seo.bullets}
                      onChange={e => updateSeo('bullets', e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                      placeholder="100% хлопок; Сделано в России..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400">Черновик (Seo Text)</label>
                    <textarea 
                      value={selectedCard.seo.seoText}
                      onChange={e => updateSeo('seoText', e.target.value)}
                      rows={2}
                      className="w-full bg-slate-900 border border-white/10 rounded-lg px-4 py-3 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 outline-none transition-all resize-none"
                      placeholder="Дополнительные заметки..."
                    />
                  </div>
                </div>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductPlanner;