// src/features/profile/ThemingArchitecture.jsx
import React from 'react';

export default function ThemingArchitecture({ theme, setTheme }) {
  const availableThemes = [
    { id: 'dark', icon: '🌌', label: 'Original', desc: 'Deep Space Matrix' },
    { id: 'light', icon: '☀️', label: 'Light', desc: 'PRC Standard' },
    { id: 'midnight', icon: '🌃', label: 'Midnight', desc: 'OLED Pure Black' },
    { id: 'paper', icon: '📜', label: 'Paper', desc: 'Warm Sepia' },
    { id: 'cyberpunk', icon: '🌆', label: 'Cyberpunk', desc: 'Neon Edge' },
    { id: 'retrowave', icon: '🌴', label: 'Retrowave', desc: 'Synth Vibe' },
    { id: 'forest', icon: '🌲', label: 'Forest', desc: 'Deep Woods' },
    { id: 'ocean', icon: '🌊', label: 'Ocean', desc: 'Abyssal Depth' },
    { id: 'sakura', icon: '🌸', label: 'Sakura', desc: 'Cherry Blossom' },
    { id: 'terminal', icon: '💻', label: 'Terminal', desc: 'Hacker Green' },
    { id: 'organs', icon: '🫀', label: 'Organs', desc: 'Flesh & Crimson' },
    { id: 'math', icon: '📐', label: 'Math', desc: 'Blueprint Grid' },
    { id: 'electrical', icon: '⚡', label: 'Electrical', desc: 'Copper & Amber' }
  ];

  return (
    <div className="bg-surface border border-border2 p-6 rounded-2xl shadow-sm">
      <div className="border-b border-border2 pb-4 mb-6">
        <h3 className="text-sm font-bold uppercase tracking-widest text-textMain flex items-center gap-2">
          <span>🎨</span> Theming Architecture
        </h3>
        <p className="text-[0.65rem] text-muted mt-1 uppercase tracking-widest">Configure your visual interface environment matrix.</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {availableThemes.map(t => (
          <button 
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-2 transition-all cursor-pointer text-center ${theme === t.id ? 'bg-surface3 border-textMain shadow-[0_0_10px_rgba(255,255,255,0.1)]' : 'bg-bg border-border2 hover:border-muted hover:bg-surface2'}`}
          >
            <span className="text-2xl mb-1">{t.icon}</span>
            <span className={`block text-xs font-bold ${theme === t.id ? 'text-textMain' : 'text-muted'}`}>{t.label}</span>
            <span className="text-[0.55rem] text-muted2 uppercase tracking-widest block leading-tight">{t.desc}</span>
          </button>
        ))}
      </div>
    </div>
  );
}