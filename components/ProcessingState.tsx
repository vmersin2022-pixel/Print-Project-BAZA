import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface ProcessingStateProps {
  onComplete: () => void;
}

const ProcessingState: React.FC<ProcessingStateProps> = ({ onComplete }) => {
  const [step, setStep] = useState(0);
  const steps = [
    "Чтение структуры файла...",
    "Вычисление абсолютной разницы (Δ_abs)...",
    "Анализ процентного роста (Δ_%)...",
    "Расчет PP Score (Price Performance)...",
    "Подготовка отчета..."
  ];

  useEffect(() => {
    if (step < steps.length) {
      const timeout = setTimeout(() => {
        setStep(s => s + 1);
      }, 600); 
      return () => clearTimeout(timeout);
    } else {
      setTimeout(onComplete, 400);
    }
  }, [step, steps.length, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="relative mb-10">
        <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 animate-pulse"></div>
        <div className="w-24 h-24 rounded-full border-4 border-white/5 border-t-indigo-500 animate-spin relative z-10"></div>
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin-slow" />
        </div>
      </div>
      
      <div className="text-center space-y-3">
        <h3 className="text-2xl font-bold text-white tracking-tight drop-shadow-md">Обработка данных</h3>
        <div className="h-6 overflow-hidden relative w-full flex justify-center">
           <p className="text-indigo-300/80 font-medium animate-fade-in-up key={step} text-sm tracking-wide">
             {steps[Math.min(step, steps.length - 1)]}
           </p>
        </div>
      </div>
      
      <div className="mt-12 w-80 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-violet-500 transition-all duration-500 ease-out shadow-[0_0_15px_rgba(99,102,241,0.8)]"
          style={{ width: `${(step / steps.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default ProcessingState;