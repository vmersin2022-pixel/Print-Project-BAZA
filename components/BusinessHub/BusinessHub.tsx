import React, { useState, useMemo } from 'react';
import { 
  Plus, Search, X, Tag, Link as LinkIcon, 
  Calendar, Trash2, Edit3, Lightbulb, Phone, 
  Target, DollarSign, ChevronRight,
  NotebookPen, Brain, Globe, ExternalLink
} from 'lucide-react';
import { BusinessNote, NoteCategory, ProductCard, SavedFinancialReport } from '../../types';

interface BusinessHubProps {
  notes: BusinessNote[];
  productCards: ProductCard[];
  reports: SavedFinancialReport[];
  onAddNote: (note: Omit<BusinessNote, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (note: BusinessNote) => void;
  onDeleteNote: (id: string) => void;
  onGoToProduct?: (id: string) => void;
}

const CATEGORIES: { id: NoteCategory; label: string; icon: any; color: string; bg: string }[] = [
  { id: 'idea', label: 'Идеи', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 'contact', label: 'Контакты', icon: Phone, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  { id: 'strategy', label: 'Стратегия', icon: Target, color: 'text-indigo-400', bg: 'bg-indigo-400/10' },
  { id: 'finance', label: 'Финансы', icon: DollarSign, color: 'text-rose-400', bg: 'bg-rose-400/10' },
  { id: 'neuro', label: 'Нейросети', icon: Brain, color: 'text-violet-400', bg: 'bg-violet-400/10' },
];

const BusinessHub: React.FC<BusinessHubProps> = ({ 
  notes, productCards, reports, onAddNote, onUpdateNote, onDeleteNote, onGoToProduct 
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<NoteCategory | 'all'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<BusinessNote | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState<NoteCategory>('idea');
  const [linkedId, setLinkedId] = useState('');
  const [linkedType, setLinkedType] = useState<'product' | 'report' | ''>('');

  const filteredNotes = useMemo(() => {
    return notes.filter(n => {
      const matchesSearch = n.title.toLowerCase().includes(search.toLowerCase()) || 
                           n.content.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = activeCategory === 'all' || n.category === activeCategory;
      return matchesSearch && matchesCategory;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [notes, search, activeCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingNote) {
      onUpdateNote({
        ...editingNote,
        title,
        content,
        category,
        url,
        linkedId: linkedId || undefined,
        linkedType: linkedType ? (linkedType as any) : undefined,
        updatedAt: new Date().toISOString()
      });
    } else {
      onAddNote({
        title,
        content,
        category,
        url,
        linkedId: linkedId || undefined,
        linkedType: linkedType ? (linkedType as any) : undefined
      });
    }
    closeModal();
  };

  const openEdit = (note: BusinessNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setUrl(note.url || '');
    setCategory(note.category);
    setLinkedId(note.linkedId || '');
    setLinkedType(note.linkedType || '');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingNote(null);
    setTitle('');
    setContent('');
    setUrl('');
    setCategory('idea');
    setLinkedId('');
    setLinkedType('');
  };

  const getLinkedName = (id?: string, type?: string) => {
    if (!id) return null;
    if (type === 'product') return productCards.find(p => p.id === id)?.query;
    if (type === 'report') return reports.find(r => r.id === id)?.name;
    return null;
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 animate-fade-in pb-20 px-4 md:px-0">
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <NotebookPen className="text-indigo-500" /> Бизнес-хаб
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Хранилище идей, контактов и стратегии вашего бизнеса</p>
        </div>
        
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold shadow-xl shadow-indigo-600/20 transition-all transform hover:-translate-y-1 active:scale-95"
        >
          <Plus size={20} /> Создать заметку
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Поиск по заметкам..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900/60 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-slate-200 outline-none focus:border-indigo-500/30 transition-all"
          />
        </div>
        
        <div className="flex bg-slate-900/40 p-1 rounded-2xl border border-white/5 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => setActiveCategory('all')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeCategory === 'all' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Все
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeCategory === cat.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <cat.icon size={14} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredNotes.map(note => {
          const cat = CATEGORIES.find(c => c.id === note.category)!;
          // Fallback if category not found in CATEGORIES list (e.g. legacy data)
          const displayCat = cat || { label: note.category, icon: Tag, color: 'text-slate-400', bg: 'bg-slate-800' };
          
          const linkedName = getLinkedName(note.linkedId, note.linkedType);
          
          return (
            <div 
              key={note.id} 
              className="group bg-slate-900/40 backdrop-blur-xl border border-white/5 hover:border-white/10 rounded-[2rem] p-6 transition-all hover:-translate-y-1 flex flex-col min-h-[250px] relative overflow-hidden"
            >
              {/* Category Badge */}
              <div className="flex justify-between items-start mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${displayCat.bg} ${displayCat.color} text-[10px] font-black uppercase tracking-widest`}>
                  <displayCat.icon size={12} />
                  {displayCat.label}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(note)} className="p-2 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-colors">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => onDeleteNote(note.id)} className="p-2 hover:bg-red-500/10 text-slate-400 hover:text-red-400 rounded-xl transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-3 leading-tight">{note.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed whitespace-pre-wrap flex-1 mb-6">
                {note.content}
              </p>

              <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-3">
                 {/* External Link (From n8n/Neuro) */}
                 {note.url && (
                   <a 
                     href={note.url}
                     target="_blank"
                     rel="noreferrer"
                     className="flex items-center gap-2 text-xs font-bold text-indigo-400 hover:text-white transition-colors p-2 bg-indigo-500/10 rounded-xl hover:bg-indigo-500 border border-indigo-500/20"
                   >
                      <Globe size={14} />
                      <span className="truncate flex-1">{note.url}</span>
                      <ExternalLink size={12} />
                   </a>
                 )}

                {/* Linked Content Indicator */}
                {linkedName && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                      <LinkIcon size={12} />
                      {note.linkedType === 'product' ? 'Товар:' : 'Отчет:'} {linkedName}
                    </div>
                    {note.linkedType === 'product' && onGoToProduct && (
                       <button 
                         onClick={() => onGoToProduct(note.linkedId!)}
                         className="p-1 hover:bg-indigo-500/20 text-indigo-400 rounded-lg"
                         title="Перейти к товару"
                       >
                         <ChevronRight size={14} />
                       </button>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium mt-1">
                  <span className="flex items-center gap-1">
                    <Calendar size={10} /> {new Date(note.createdAt).toLocaleDateString()}
                  </span>
                  {note.updatedAt !== note.createdAt && <span>ред.</span>}
                </div>
              </div>

              {/* Subtle background glow based on category */}
              <div className={`absolute -bottom-10 -right-10 w-32 h-32 rounded-full blur-[60px] opacity-10 pointer-events-none ${displayCat.bg}`}></div>
            </div>
          );
        })}

        {filteredNotes.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-[3rem]">
            <Search size={48} className="opacity-10 mb-4" />
            <p className="text-lg font-medium">Заметки не найдены</p>
            <button onClick={() => setIsModalOpen(true)} className="mt-4 text-indigo-400 font-bold hover:underline">
              Создать первую заметку
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
           <form 
            onSubmit={handleSubmit}
            className="bg-[#0b0f19] border border-white/10 rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
           >
             <div className="p-8 border-b border-white/5 flex items-center justify-between bg-slate-900/30">
               <h3 className="text-2xl font-black text-white">{editingNote ? 'Редактировать заметку' : 'Новая бизнес-заметка'}</h3>
               <button type="button" onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                 <X size={24} />
               </button>
             </div>

             <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Категория</label>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategory(cat.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          category === cat.id 
                            ? `bg-indigo-600 border-indigo-500 text-white shadow-lg` 
                            : 'bg-slate-950 border-white/5 text-slate-400 hover:text-white'
                        }`}
                      >
                        <cat.icon size={14} />
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Заголовок</label>
                  <input 
                    autoFocus
                    required
                    type="text" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Название заметки..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Ссылка (URL)</label>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                    <input 
                      type="url" 
                      value={url}
                      onChange={e => setUrl(e.target.value)}
                      placeholder="https://..."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:border-indigo-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Содержание</label>
                  <textarea 
                    required
                    rows={5}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Текст вашей идеи или контакта..."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none resize-none"
                  />
                </div>

                {/* Linking Section */}
                <div className="pt-4 border-t border-white/5 grid grid-cols-2 gap-4">
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Привязать к типу</label>
                      <select 
                        value={linkedType}
                        onChange={e => { setLinkedType(e.target.value as any); setLinkedId(''); }}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none"
                      >
                        <option value="">Без привязки</option>
                        <option value="product">Карточка товара</option>
                        <option value="report">Фин. отчет</option>
                      </select>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Выберите объект</label>
                      <select 
                        disabled={!linkedType}
                        value={linkedId}
                        onChange={e => setLinkedId(e.target.value)}
                        className="w-full bg-slate-950 border border-white/5 rounded-xl px-4 py-3 text-sm text-slate-300 outline-none disabled:opacity-30"
                      >
                        <option value="">-- Выберите --</option>
                        {linkedType === 'product' && productCards.map(p => (
                          <option key={p.id} value={p.id}>{p.query}</option>
                        ))}
                        {linkedType === 'report' && reports.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                   </div>
                </div>
             </div>

             <div className="p-8 bg-slate-900/30 flex justify-end gap-3">
                <button type="button" onClick={closeModal} className="px-6 py-3 text-slate-400 hover:text-white font-bold transition-colors">
                  Отмена
                </button>
                <button type="submit" className="px-10 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all">
                  {editingNote ? 'Сохранить изменения' : 'Создать заметку'}
                </button>
             </div>
           </form>
        </div>
      )}
    </div>
  );
};

export default BusinessHub;