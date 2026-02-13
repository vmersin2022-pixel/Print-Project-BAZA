import React, { useState, useEffect, useMemo } from 'react';
import { AppState, ColumnMapping, AnalyzedRow, ProductCard, CostItem, SavedFinancialReport, FinancialReportRow, BusinessNote, EconomicsData, TaxFlags } from './types';
import { readExcelFile, detectColumns, analyzeData } from './utils/analysis';
import { updateCostRegistry } from './utils/finance'; 
import FileUpload from './components/FileUpload';
import Dashboard from './components/Dashboard';
import ColumnMapper from './components/ColumnMapper';
import ProcessingState from './components/ProcessingState';
import ProductPlanner from './components/ProductPlanner';
import UnitEconomics from './components/UnitEconomics';
import Sidebar from './components/Sidebar';
import CostRegistry from './components/Finance/CostRegistry';
import ReportHistory from './components/Finance/ReportHistory';
import { FinanceDashboard } from './components/Finance/FinanceDashboard';
import FinanceTrends from './components/Finance/FinanceTrends';
import ApiIntegration from './components/Finance/ApiIntegration'; 
import BusinessHub from './components/BusinessHub/BusinessHub';
import { Upload, Menu } from 'lucide-react';
import { supabase } from './utils/supabase';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.UPLOAD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // --- SEO STATE ---
  const [rawData, setRawData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Partial<ColumnMapping>>({});
  const [analyzedData, setAnalyzedData] = useState<AnalyzedRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  // --- PRODUCT CARDS STATE (Local + Supabase) ---
  const [productCards, setProductCards] = useState<ProductCard[]>(() => {
    try {
      const saved = localStorage.getItem('wb_planner_cards');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // --- FINANCE STATE ---
  const [costRegistry, setCostRegistry] = useState<CostItem[]>([]);
  const [savedReports, setSavedReports] = useState<SavedFinancialReport[]>([]);
  const [financeData, setFinanceData] = useState<FinancialReportRow[]>([]);

  // --- BUSINESS HUB STATE ---
  const [businessNotes, setBusinessNotes] = useState<BusinessNote[]>(() => {
    try {
      const saved = localStorage.getItem('wb_business_notes');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // --- UNIT ECONOMICS STATE ---
  const [ecoData, setEcoData] = useState<EconomicsData | undefined>(undefined);
  const [ecoFlags, setEcoFlags] = useState<TaxFlags | undefined>(undefined);

  // Persist local changes
  useEffect(() => {
    localStorage.setItem('wb_business_notes', JSON.stringify(businessNotes));
  }, [businessNotes]);

  useEffect(() => {
    localStorage.setItem('wb_planner_cards', JSON.stringify(productCards));
  }, [productCards]);

  // --- GLOBAL SYNC ---
  useEffect(() => {
    const fetchData = async () => {
      // 1. Costs
      const { data: costs } = await supabase.from('product_costs').select('*');
      if (costs) {
        setCostRegistry(costs.map(c => ({
          barcode: c.barcode,
          vendorCode: c.vendor_code,
          title: c.title,
          cost: c.cost,
          updatedAt: c.updated_at || new Date().toISOString()
        })));
      }

      // 2. Reports
      const { data: reports } = await supabase
        .from('financial_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reports) {
        setSavedReports(reports.map(r => ({
          id: r.id,
          name: r.name,
          dateCreated: new Date(r.created_at).toLocaleString(),
          summary: r.summary,
          rows: r.rows_data
        })));
      }

      // 3. Notes
      const { data: notes } = await supabase
        .from('business_notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (notes) {
        setBusinessNotes(notes.map(n => ({
          id: n.id,
          title: n.title,
          content: n.content,
          category: n.category,
          url: n.url,
          tags: n.tags,
          linkedId: n.linked_id,
          linkedType: n.linked_type,
          createdAt: n.created_at,
          updatedAt: n.updated_at || n.created_at
        })));
      }

      // 4. Product Cards
      const { data: cards } = await supabase
        .from('product_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (cards) {
        setProductCards(cards.map(c => ({
          id: c.id,
          query: c.query,
          source: c.source,
          status: c.status,
          createdAt: new Date(c.created_at).toLocaleDateString('ru-RU'),
          stages: c.stages,
          seo: c.seo
        })));
      }

      // 5. Unit Economics
      const { data: eco } = await supabase.from('unit_economics').select('*').eq('id', 1).single();
      if (eco) {
        setEcoData(eco.data);
        setEcoFlags(eco.flags);
      }
    };

    fetchData();
  }, []);

  const handleSaveEconomics = async (data: EconomicsData, flags: TaxFlags) => {
     setEcoData(data);
     setEcoFlags(flags);
     await supabase.from('unit_economics').upsert({
        id: 1,
        data: data,
        flags: flags,
        updated_at: new Date().toISOString()
     });
  };

  const addProductCard = async (query: string, source: 'manual' | 'analysis' = 'manual') => {
    if (productCards.some(c => c.query === query)) return;
    
    const tempId = `temp-${Date.now()}`;
    const now = new Date();
    const newCard: ProductCard = {
      id: tempId,
      query,
      status: 'idea',
      source,
      createdAt: now.toLocaleDateString('ru-RU'),
      stages: { printDev: false, layout: false, photos: false, cardCreated: false, published: false },
      seo: { title: '', mainKey: query, additionalKeys: '', description: '', bullets: '', seoText: '' }
    };
    setProductCards(prev => [newCard, ...prev]);

    const { data, error } = await supabase
      .from('product_cards')
      .insert([{
        query: newCard.query,
        source: newCard.source,
        status: newCard.status,
        stages: newCard.stages,
        seo: newCard.seo
      }])
      .select();

    if (data && !error) {
      const realId = data[0].id;
      setProductCards(prev => prev.map(c => c.id === tempId ? { ...c, id: realId } : c));
    }
  };

  const updateProductCard = async (updated: ProductCard) => {
    setProductCards(prev => prev.map(c => c.id === updated.id ? updated : c));
    if (updated.id.startsWith('temp-')) return;
    await supabase
      .from('product_cards')
      .update({
        status: updated.status,
        stages: updated.stages,
        seo: updated.seo
      })
      .eq('id', updated.id);
  };

  const handleAddNote = async (newNote: Omit<BusinessNote, 'id' | 'createdAt' | 'updatedAt'>) => {
    const tempId = `local-${Date.now()}`;
    const now = new Date().toISOString();
    const optimisticNote: BusinessNote = { ...newNote, id: tempId, createdAt: now, updatedAt: now };
    
    setBusinessNotes(prev => [optimisticNote, ...prev]);

    const { data, error } = await supabase
      .from('business_notes')
      .insert([{
        title: newNote.title,
        content: newNote.content,
        category: newNote.category,
        url: newNote.url,
        tags: newNote.tags,
        linked_id: newNote.linkedId,
        linked_type: newNote.linkedType
      }])
      .select();

    if (data && !error) {
      const serverNote: BusinessNote = {
        ...newNote,
        id: data[0].id,
        createdAt: data[0].created_at,
        updatedAt: data[0].updated_at || data[0].created_at
      };
      setBusinessNotes(prev => prev.map(n => n.id === tempId ? serverNote : n));
    }
  };

  const handleUpdateNote = async (updated: BusinessNote) => {
    setBusinessNotes(prev => prev.map(n => n.id === updated.id ? updated : n));
    if (updated.id.startsWith('local-')) return;

    await supabase
      .from('business_notes')
      .update({
        title: updated.title,
        content: updated.content,
        category: updated.category,
        url: updated.url,
        tags: updated.tags,
        linked_id: updated.linkedId,
        linked_type: updated.linkedType,
        updated_at: new Date().toISOString()
      })
      .eq('id', updated.id);
  };

  const handleDeleteNote = async (id: string) => {
    setBusinessNotes(prev => prev.filter(n => n.id !== id));
    if (id.startsWith('local-')) return;
    await supabase.from('business_notes').delete().eq('id', id);
  };

  const handleSEOFileSelect = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/)) {
      setError("Файл должен быть в формате .xlsx");
      return;
    }
    setError(null);
    setState(AppState.PROCESSING);

    try {
      const { headers, data } = await readExcelFile(file);
      const detected = detectColumns(headers);
      setRawData(data);
      setHeaders(headers);
      setMapping(detected);

      if (detected.query && detected.t1 && detected.t0) {
        setAnalyzedData(analyzeData(data, detected as ColumnMapping));
        setState(AppState.DASHBOARD);
      } else {
        setState(AppState.MAPPING);
      }
    } catch (e: any) {
      setError(e.message || "Ошибка чтения файла");
      setState(AppState.UPLOAD);
    }
  };

  const handleResetSEO = () => {
    setState(AppState.UPLOAD);
    setRawData([]);
    setAnalyzedData([]);
  };

  const handleUpdateCost = async (newRegistry: CostItem[]) => {
    setCostRegistry(newRegistry);
    await supabase.from('product_costs').upsert(newRegistry.map(item => ({
        barcode: item.barcode,
        vendor_code: item.vendorCode,
        title: item.title,
        cost: item.cost,
        updated_at: new Date().toISOString()
      })), { onConflict: 'barcode' });
  };

  const handleSaveReport = async (report: SavedFinancialReport) => {
    const newReport = { ...report, dateCreated: new Date().toLocaleString() };
    setSavedReports(prev => [newReport, ...prev]);

    const { data, error } = await supabase
      .from('financial_reports')
      .insert([{
        name: report.name,
        summary: report.summary,
        rows_data: report.rows
      }])
      .select();

    if (data && !error) {
      const serverReport = { ...report, id: data[0].id, dateCreated: new Date(data[0].created_at).toLocaleString() };
      setSavedReports(prev => prev.map(r => r.id === report.id ? serverReport : r));
    }
  };

  const handleDeleteReport = async (id: string) => {
    setSavedReports(prev => prev.filter(r => r.id !== id));
    await supabase.from('financial_reports').delete().eq('id', id);
  };

  const handleApiDataLoaded = (rows: FinancialReportRow[]) => {
    setFinanceData(rows);
    const updatedRegistry = updateCostRegistry(costRegistry, rows);
    if (updatedRegistry.length !== costRegistry.length) {
      handleUpdateCost(updatedRegistry);
    }
    setState(AppState.FINANCE_DETAILS);
  };

  const plannedQueries = useMemo(() => productCards.map(c => c.query), [productCards]);

  return (
    <div className="flex flex-col h-screen bg-[#020617] font-sans text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      
      {/* Background Decor */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      </div>

      <header className="h-16 bg-slate-950/60 backdrop-blur-xl border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 sticky top-0">
        <div className="flex items-center gap-3 group">
          {/* Hamburger Menu (Mobile Only) */}
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="md:hidden p-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
          >
            <Menu size={24} />
          </button>

          <div className="relative w-8 h-8 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-lg flex items-center justify-center text-white font-bold shadow-lg border border-white/10">P</div>
          <div className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span className="hidden xs:inline">Print Project</span>
            <span className="inline xs:hidden">PP</span>
             <span className="text-[10px] text-indigo-400 font-medium">PRO</span>
          </div>
        </div>
        
        {state === AppState.DASHBOARD && (
          <button onClick={handleResetSEO} className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-full text-xs md:text-sm border border-white/5">
            <Upload className="w-4 h-4" /> <span className="hidden sm:inline">Загрузить новый</span>
          </button>
        )}
      </header>

      <div className="flex flex-1 overflow-hidden z-10 relative">
        {/* Desktop Sidebar */}
        <Sidebar 
          className="hidden md:flex"
          state={state} 
          setState={setState} 
          cardsCount={productCards.length}
          onUploadClick={() => analyzedData.length > 0 ? setState(AppState.DASHBOARD) : setState(AppState.UPLOAD)}
        />

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Backdrop */}
            <div 
              className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
              onClick={() => setIsMobileMenuOpen(false)}
            ></div>
            
            {/* Sidebar */}
            <div className="relative h-full animate-in slide-in-from-left w-64 shadow-2xl">
              <Sidebar 
                state={state} 
                setState={setState} 
                cardsCount={productCards.length}
                onUploadClick={() => analyzedData.length > 0 ? setState(AppState.DASHBOARD) : setState(AppState.UPLOAD)}
                onClose={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-4 md:p-10 relative flex flex-col">
          <div className={`flex-1 flex flex-col relative z-10 ${[AppState.UPLOAD, AppState.PROCESSING, AppState.MAPPING].includes(state) ? 'items-center justify-center' : ''}`}>
            
            {state === AppState.UPLOAD && <FileUpload onFileSelect={handleSEOFileSelect} error={error} />}
            
            {state === AppState.PROCESSING && <ProcessingState onComplete={() => setState(AppState.DASHBOARD)} />}
            
            {state === AppState.MAPPING && (
              <ColumnMapper 
                headers={headers} 
                initialMapping={mapping} 
                onConfirm={(m) => { setMapping(m); setAnalyzedData(analyzeData(rawData, m)); setState(AppState.DASHBOARD); }}
                onCancel={handleResetSEO}
              />
            )}
            
            {state === AppState.DASHBOARD && (
              <Dashboard data={analyzedData} onReset={handleResetSEO} onAddToPlanner={(q) => addProductCard(q, 'analysis')} plannedQueries={plannedQueries} />
            )}

            {state === AppState.PRODUCT_CARDS && (
              <ProductPlanner cards={productCards} onAddCard={(q) => addProductCard(q, 'manual')} onUpdateCard={updateProductCard} />
            )}

            {state === AppState.BUSINESS_NOTES && (
              <BusinessHub 
                notes={businessNotes}
                productCards={productCards}
                reports={savedReports}
                onAddNote={handleAddNote}
                onUpdateNote={handleUpdateNote}
                onDeleteNote={handleDeleteNote}
                onGoToProduct={(id) => {
                  setState(AppState.PRODUCT_CARDS);
                }}
              />
            )}

            {state === AppState.FINANCE_DETAILS && (
              <FinanceDashboard 
                registry={costRegistry} 
                onUpdateRegistry={handleUpdateCost}
                initialData={financeData}
                onDataLoaded={setFinanceData}
                onSaveReport={handleSaveReport}
              />
            )}

            {state === AppState.FINANCE_API && (
              <ApiIntegration onLoadData={handleApiDataLoaded} />
            )}

            {state === AppState.FINANCE_TRENDS && <FinanceTrends reports={savedReports} />}
            {state === AppState.FINANCE_COGS && <CostRegistry registry={costRegistry} onUpdateRegistry={handleUpdateCost} />}
            
            {state === AppState.FINANCE_HISTORY && (
              <ReportHistory 
                reports={savedReports} 
                onDelete={handleDeleteReport}
                onLoad={(report) => {
                  setFinanceData(report.rows);
                  setState(AppState.FINANCE_DETAILS);
                }}
                onMerge={(reports) => {
                  setFinanceData(reports.flatMap(r => r.rows));
                  setState(AppState.FINANCE_DETAILS);
                }}
              />
            )}

            {state === AppState.UNIT_ECONOMICS && (
              <UnitEconomics 
                initialData={ecoData}
                initialFlags={ecoFlags}
                onSave={handleSaveEconomics}
                reports={savedReports}
              />
            )}
          </div>
          <div className="text-center py-8 text-[10px] text-slate-600 uppercase tracking-[0.3em] font-bold">WB Analyzer Pro v2.1</div>
        </main>
      </div>
    </div>
  );
};

export default App;