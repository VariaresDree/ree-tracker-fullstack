// src/components/SmartText.jsx
import React from 'react';
import LatexRenderer from './LatexRenderer';

const DICTIONARY = {
  "EPIRA": "Electric Power Industry Reform Act of 2001 (RA 9136)",
  "PEC": "Philippine Electrical Code",
  "NEC": "National Electrical Code",
  "permittivity": "Vacuum permittivity (ε₀) ≈ 8.854 x 10^-12 F/m",
  "permeability": "Vacuum permeability (μ₀) ≈ 4π x 10^-7 H/m",
  "KAIC": "Kilo Ampere Interrupting Capacity"
};

export default function SmartText({ text }) {
  if (!text) return null;

  // Split text by dictionary keys to inject tooltips
  const regex = new RegExp(`\\b(${Object.keys(DICTIONARY).join('|')})\\b`, 'gi');
  const parts = text.split(regex);

  return (
    <span className="leading-relaxed selection:bg-reeCyan/30 selection:text-reeCyan">
      {parts.map((part, i) => {
        const lowerPart = part.toLowerCase();
        const foundKey = Object.keys(DICTIONARY).find(k => k.toLowerCase() === lowerPart);

        if (foundKey) {
          return (
            <span key={i} className="relative group cursor-help inline-block mx-1">
              <span className="text-reeCyan border-b border-dashed border-reeCyan font-bold">{part}</span>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-surface2 border border-border2 rounded-lg shadow-xl text-[0.65rem] text-textMain z-50 text-center pointer-events-none">
                <span className="block text-reePurple font-black uppercase mb-1">{part}</span>
                {DICTIONARY[foundKey]}
              </div>
            </span>
          );
        }
        
        // Fallback to standard LaTeX parsing for normal text segments
        return <LatexRenderer key={i} content={part} />;
      })}
    </span>
  );
}