import React, { useState, useEffect } from 'react';
import { CloudLightning, Check, Save, Terminal, Wallet, AlertCircle, Play, Loader2, Key } from 'lucide-react';
import { fetchBalance, fetchSalesReports } from '../../utils/wbApi';
import { FinancialReportRow } from '../../types';

interface ApiIntegrationProps {
  onLoadData: (rows: FinancialReportRow[]) => void;
}

const ApiIntegration: React.FC<ApiIntegrationProps> = ({ onLoadData }) => {
  const [token, setToken] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [balance, setBalance] = useState<{ current: number; for_withdraw: number } | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(false);
  
  // Date Range (Default: last 7 days)
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('wb_api_token');
    if (saved) {
      setToken(saved);
      setIsSaved(true);
      loadBalance(saved);
    }
  }, []);

  const saveToken = () => {
    if (!token.trim()) return;
    localStorage.setItem('wb_api_token', token.trim());
    setIsSaved(true);
    loadBalance(token.trim());
  };

  const loadBalance = async (apiKey: string) => {
    setLoadingBalance(true);
    const data = await fetchBalance(apiKey);
    if (data) setBalance(data);
    setLoadingBalance(false);
  };

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const handleStartLoad = async () => {
    if (!token) return;
    setIsProcessing(true);
    setLogs([]);
    
    try {
      const rows = await fetchSalesReports(token, dateFrom, dateTo, addLog);
      if (rows.length > 0) {
        // Success
        setTimeout(() => {
          onLoadData(rows);
        }, 1500); // Small delay to read "Success"
      } else {
        addLog('⚠️ Данные за выбранный период не найдены.');
      }
    } catch (e) {
      addLog('🔴 Процесс остановлен из-за ошибки.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-fade-in pb-20 px-4">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <CloudLightning className="text-indigo-500" /> WB Синхронизация
          </h2>
          <p className="text-slate-500 mt-1 font-medium">Автоматическая загрузка отчетов через API Статистики</p>
        </div>
        
        {/* Balance Widget */}
        {balance && (
          <div className="bg-gradient-to-r from-emerald-900/40 to-emerald-800/40 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-right">
             <div className="p-3 bg-emerald-500/20 rounded-xl">
               <Wallet className="text-emerald-400 w-6 h-6" />
             </div>
             <div>
               <p className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider">Доступно к выводу</p>
               <p className="text-2xl font-black text-white">{balance.for_withdraw.toLocaleString()} ₽</p>
             </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Settings Column */}
        <div className="space-y-6">
          
          {/* Token Card */}
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
             <div className="flex items-center justify-between mb-4">
               <h3 className="text-lg font-bold text-white flex items-center gap-2">
                 <Key size={18} className="text-slate-400" />
                 API Токен
               </h3>
               {isSaved && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg"><Check size={12}/> Сохранен</span>}
             </div>
             
             <div className="space-y-3">
               <input 
                 type="password" 
                 value={token}
                 onChange={e => { setToken(e.target.value); setIsSaved(false); }}
                 placeholder="Вставьте токен 'Статистика'..."
                 className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-all font-mono text-sm"
               />
               <button 
                 onClick={saveToken}
                 disabled={!token}
                 className="w-full py-3 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl font-bold transition-all disabled:opacity-50"
               >
                 Сохранить ключ
               </button>
             </div>
             
             <div className="mt-4 flex items-start gap-2 text-[10px] text-slate-500 bg-black/20 p-3 rounded-lg">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <p>Ключ сохраняется только в вашем браузере. Используйте токен типа "Статистика" для отчетов и "Финансы" для баланса.</p>
             </div>
          </div>

          {/* Load Actions */}
          <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6">
             <h3 className="text-lg font-bold text-white mb-6">Параметры загрузки</h3>
             
             <div className="grid grid-cols-2 gap-4 mb-6">
               <div>
                 <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Дата с</label>
                 <input 
                   type="date" 
                   value={dateFrom}
                   onChange={e => setDateFrom(e.target.value)}
                   className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                 />
               </div>
               <div>
                 <label className="text-xs font-bold text-slate-400 mb-2 block uppercase">Дата по</label>
                 <input 
                   type="date" 
                   value={dateTo}
                   onChange={e => setDateTo(e.target.value)}
                   className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                 />
               </div>
             </div>

             <button 
               onClick={handleStartLoad}
               disabled={!token || isProcessing}
               className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 transition-all ${
                 isProcessing 
                 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                 : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 hover:-translate-y-1'
               }`}
             >
               {isProcessing ? <Loader2 className="animate-spin" /> : <Play fill="currentColor" />}
               {isProcessing ? 'Загрузка...' : 'Загрузить отчет'}
             </button>
          </div>

        </div>

        {/* Logs Column */}
        <div className="bg-black/40 border border-white/10 rounded-3xl p-6 font-mono text-sm relative flex flex-col h-full min-h-[400px]">
           <div className="flex items-center gap-2 text-slate-500 mb-4 border-b border-white/5 pb-4">
             <Terminal size={16} />
             <span className="font-bold uppercase tracking-wider text-xs">Лог выполнения</span>
           </div>
           
           <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
             {logs.length === 0 && (
               <div className="text-slate-600 italic text-xs">Ожидание запуска...</div>
             )}
             {logs.map((log, i) => (
               <div key={i} className="text-slate-300 animate-in fade-in slide-in-from-left-2">
                 <span className="text-slate-600 mr-2">{log.split(']')[0]}]</span>
                 <span className={log.includes('❌') ? 'text-red-400' : log.includes('✅') ? 'text-emerald-400' : 'text-slate-300'}>
                   {log.split(']')[1]}
                 </span>
               </div>
             ))}
             {isProcessing && (
               <div className="flex items-center gap-2 text-indigo-400 animate-pulse mt-2">
                 <span className="w-2 h-4 bg-indigo-500 block"></span>
               </div>
             )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default ApiIntegration;