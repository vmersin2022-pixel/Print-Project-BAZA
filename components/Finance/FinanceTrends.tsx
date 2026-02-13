import React, { useMemo } from 'react';
import { SavedFinancialReport } from '../../types';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, BarChart2, AlertCircle } from 'lucide-react';

interface FinanceTrendsProps {
  reports: SavedFinancialReport[];
}

const FinanceTrends: React.FC<FinanceTrendsProps> = ({ reports }) => {
  
  // Transform reports into chart data
  const chartData = useMemo(() => {
    // Sort by creation date (older first)
    const sorted = [...reports].sort((a, b) => new Date(a.dateCreated).getTime() - new Date(b.dateCreated).getTime());
    
    return sorted.map(r => ({
      name: r.name.split(' ').slice(0, 2).join(' '), // Short name
      fullDate: r.dateCreated,
      revenue: r.summary.revenue,
      netProfit: r.summary.netProfit,
      cogs: r.summary.revenue - r.summary.netProfit - r.summary.toPay, // Approximate (Needs precise calc if stored, using simple deduction for visual)
      expenses: r.summary.revenue - r.summary.netProfit // Everything not profit
    }));
  }, [reports]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 border border-white/10 p-4 rounded-xl shadow-2xl">
          <p className="text-slate-300 text-xs font-bold mb-2">{label}</p>
          {payload.map((p: any) => (
            <p key={p.name} className="text-xs font-mono" style={{ color: p.color }}>
              {p.name === 'revenue' ? 'Выручка' : 
               p.name === 'netProfit' ? 'Прибыль' : 
               p.name === 'expenses' ? 'Расходы' : p.name}: {p.value.toLocaleString()} ₽
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (reports.length < 2) {
    return (
      <div className="w-full max-w-7xl mx-auto min-h-[500px] flex flex-col items-center justify-center text-center animate-fade-in">
        <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mb-6 border border-white/5">
           <BarChart2 className="text-slate-600 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Недостаточно данных для трендов</h2>
        <p className="text-slate-400 max-w-md">
          Сохраните хотя бы 2 финансовых отчета в разделе "Детализация", чтобы увидеть динамику роста.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8 pb-20 animate-fade-in px-4">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
          <TrendingUp className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Аналитика трендов</h2>
          <p className="text-slate-400 text-sm">Динамика показателей на основе {reports.length} сохраненных отчетов</p>
        </div>
      </div>

      {/* Main Revenue vs Profit Chart */}
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl h-[400px]">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Выручка vs Прибыль</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorProf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
            <Area type="monotone" dataKey="netProfit" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorProf)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Bar Chart: Profit vs Expenses */}
      <div className="bg-slate-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur-xl h-[400px]">
        <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">Структура: Расходы vs Прибыль</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="name" stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
            <YAxis stroke="#64748b" tick={{fontSize: 10}} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{fontSize: '12px', paddingTop: '10px'}} />
            <Bar dataKey="expenses" name="Расходы" stackId="a" fill="#334155" radius={[0, 0, 4, 4]} />
            <Bar dataKey="netProfit" name="Прибыль" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default FinanceTrends;