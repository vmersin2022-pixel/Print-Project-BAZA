import React, { useCallback } from 'react';
import { BarChart3, CloudUpload, FileSpreadsheet } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  error: string | null;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, error }) => {
  
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileSelect(file);
    }
  }, [onFileSelect]);

  return (
    <div className="w-full max-w-lg animate-fade-in-up perspective-1000">
      <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] shadow-[0_0_40px_-10px_rgba(0,0,0,0.5)] border border-white/10 p-12 text-center relative overflow-hidden group hover:border-white/20 transition-all duration-500">
        
        {/* Animated Glows */}
        <div className="absolute top-[-50%] left-[-20%] w-[150%] h-[150%] bg-gradient-to-b from-indigo-500/5 to-transparent rounded-full pointer-events-none blur-3xl group-hover:from-indigo-500/10 transition-colors duration-700"></div>
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-violet-500/20 rounded-full blur-[60px] animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px] animate-pulse delay-700"></div>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-white/10 to-white/5 rounded-2xl flex items-center justify-center mb-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)] border border-white/10 backdrop-blur-sm group-hover:scale-110 transition-transform duration-500">
            <BarChart3 className="w-10 h-10 text-indigo-400 drop-shadow-[0_0_8px_rgba(129,140,248,0.5)]" />
          </div>

          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 mb-4 tracking-tight">
            Аналитика Поиска
          </h1>
          <p className="text-slate-400 font-medium mb-12 text-sm leading-relaxed max-w-xs">
            Загрузите отчет для <span className="text-indigo-400 font-semibold shadow-[0_0_10px_rgba(129,140,248,0.2)] shadow-indigo-500/0">быстрой обработки</span> через систему пагинации
          </p>

          {/* Airy Button */}
          <div className="relative w-full group/btn">
            <input 
              type="file" 
              accept=".xlsx,.xls" 
              onChange={handleFileChange} 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
            />
            <button className="w-full py-4 relative bg-transparent rounded-xl font-bold text-lg text-white overflow-hidden transition-all duration-300 group-hover/btn:scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.2)] hover:shadow-[0_0_30px_rgba(99,102,241,0.4)]">
               {/* Button Background Gradient */}
               <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-violet-600 opacity-80 group-hover/btn:opacity-100 transition-opacity"></div>
               
               {/* Shine Effect */}
               <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 ease-in-out"></div>
               
               {/* Border Ring */}
               <div className="absolute inset-0 rounded-xl border border-white/20 pointer-events-none"></div>

               <div className="relative flex items-center justify-center gap-3">
                 <CloudUpload className="w-6 h-6 text-indigo-100" />
                 <span className="text-indigo-50 tracking-wide">Выберите файл .xlsx</span>
               </div>
            </button>
            
            <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
              <FileSpreadsheet className="w-3 h-3 text-slate-600" />
              <span>Безопасная обработка данных</span>
            </div>
          </div>

          {error && (
            <div className="mt-8 p-4 bg-red-500/10 backdrop-blur-md text-red-300 text-sm font-semibold rounded-xl border border-red-500/20 w-full animate-fade-in flex items-center justify-center gap-2 shadow-lg shadow-red-900/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 shadow-[0_0_5px_rgba(248,113,113,1)]"></span>
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;