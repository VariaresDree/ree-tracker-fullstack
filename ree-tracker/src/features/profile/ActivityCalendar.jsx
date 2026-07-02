// src/features/profile/ActivityCalendar.jsx
import React, { useState } from 'react';

export default function ActivityCalendar({ activityCalendar = {}, targetQuota = 50 }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const getDaysInMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const blanks = Array(firstDay).fill(null);
  const days = Array.from({length: daysInMonth}, (_, i) => i + 1);

  const today = new Date();

  // Color Intensity Logic based on Question Count Target
  const getIntensityClass = (count) => {
      if (!count || count === 0) return 'bg-surface2 border-border2 text-muted2';
      const pct = count / targetQuota;
      if (pct < 0.3) return 'bg-reeGreen/20 border-reeGreen/30 text-reeGreen';
      if (pct < 0.7) return 'bg-reeGreen/50 border-reeGreen/60 text-white shadow-sm';
      if (pct < 1.0) return 'bg-reeGreen/80 border-reeGreen text-white shadow-md';
      return 'bg-reeGreen border-green-400 text-white shadow-[0_0_15px_rgba(34,197,94,0.6)] font-black';
  };

  return (
    <div className="bg-surface border border-border2 p-6 md:p-8 rounded-xl shadow-sm w-full flex flex-col relative">
      {/* Header */}
      <div className="w-full flex flex-col md:flex-row md:justify-between md:items-end mb-6 border-b border-border2 pb-4 gap-3">
        <div>
          <h3 className="text-lg font-black text-textMain flex items-center gap-2 tracking-tight">
            <span>📅</span> Consistency Matrix
          </h3>
          <p className="text-sm text-muted mt-1 font-medium">Calendar Heatmap (Daily Target: {targetQuota} Qs)</p>
        </div>
        
        {/* Month Navigation */}
        <div className="flex items-center gap-4 bg-bg border border-border2 px-2 py-1.5 rounded-lg shadow-inner">
           <button onClick={prevMonth} className="p-1 text-muted hover:text-textMain transition-colors cursor-pointer text-xl font-black">&lt;</button>
           <div className="w-40 text-center font-bold text-sm uppercase tracking-widest text-textMain">
              {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
           </div>
           <button onClick={nextMonth} disabled={currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear()} className="p-1 text-muted hover:text-textMain transition-colors cursor-pointer text-xl font-black disabled:opacity-30 disabled:cursor-not-allowed">&gt;</button>
        </div>
      </div>

      {/* Grid Canvas */}
      <div className="w-full border-t border-l border-border2 bg-surface2/30 rounded-lg overflow-hidden">
        {/* Days of Week */}
        <div className="grid grid-cols-7 text-center text-[11px] md:text-xs font-black text-muted uppercase tracking-widest bg-surface border-b border-border2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                <div key={d} className="py-2 border-r border-border2 last:border-r-0">{d}</div>
            ))}
        </div>
        
        {/* Calendar Blocks */}
        <div className="grid grid-cols-7">
            {blanks.map((_, i) => (
                <div key={`blank-${i}`} className="aspect-square border-r border-b border-border2/50 bg-bg opacity-50"></div>
            ))}
            {days.map(d => {
                const month = String(currentDate.getMonth() + 1).padStart(2, '0');
                const day = String(d).padStart(2, '0');
                const dateString = `${currentDate.getFullYear()}-${month}-${day}`;
                
                const count = activityCalendar[dateString] || 0;
                const colorClass = getIntensityClass(count);
                
                return (
                    <div key={d} className={`aspect-square border-r border-b border-border2/50 relative transition-all group ${colorClass}`}>
                        <span className="absolute top-1 left-1.5 text-[11px] md:text-sm font-bold opacity-80">{d}</span>
                        {count > 0 && (
                            <span className="absolute bottom-1 right-1.5 text-[11px] md:text-xs font-mono opacity-90">{count}</span>
                        )}
                        
                        {/* Hover Tooltip */}
                        <div className="absolute opacity-0 group-hover:opacity-100 bottom-full left-1/2 -translate-x-1/2 mb-1 bg-black text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none transition-opacity shadow-xl font-mono">
                            {count} Questions Answered
                        </div>
                    </div>
                );
            })}
        </div>
      </div>
      
      {/* Dynamic Spectrum Legend */}
      <div className="w-full flex flex-wrap justify-between items-center gap-4 mt-6 pt-4 border-t border-border2 text-xs text-muted uppercase font-bold tracking-widest">
        <span className="shrink-0 text-textMain">Activity Intensity Spectrum</span>
        <div className="flex items-center gap-3 md:gap-4 flex-wrap">
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-surface2 border border-border2"></div> <span className="hidden md:inline text-[11px]">0 Qs</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-reeGreen/20 border border-reeGreen/30"></div> <span className="hidden md:inline text-[11px]">1-{(targetQuota*0.3).toFixed(0)} Qs</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-reeGreen/50 border border-reeGreen/60"></div> <span className="hidden md:inline text-[11px]">{(targetQuota*0.3).toFixed(0)}-{(targetQuota*0.7).toFixed(0)} Qs</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-reeGreen/80 border border-reeGreen"></div> <span className="hidden md:inline text-[11px]">{(targetQuota*0.7).toFixed(0)}-{targetQuota-1} Qs</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-4 rounded bg-reeGreen border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div> <span className="hidden md:inline text-[11px]">{targetQuota}+ Qs</span></div>
        </div>
      </div>
    </div>
  );
}