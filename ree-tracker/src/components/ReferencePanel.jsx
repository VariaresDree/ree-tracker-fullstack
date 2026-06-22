import React, { useState, useMemo } from 'react';
import LatexRenderer from './LatexRenderer';
import { EE_CONSTANTS } from '../config/knowledgeBase';

const SUBTOPIC_CATEGORIES = {
  'Electromagnetism': ['Physical Constants', 'Conversions'],
  'Electric Circuits 1': ['Physical Constants', 'Conversions', 'PEC Wiring (THHN)'],
  'Electric Circuits 2': ['Physical Constants', 'Conversions', 'PEC Wiring (THHN)'],
  'Electrical Apparatus & Devices': ['Equipment Standards', 'PEC Wiring (THHN)', 'Conversions'],
  'Electrical Machinery 1': ['Equipment Standards', 'Conversions'],
  'Electrical Machinery 2': ['Equipment Standards', 'Conversions'],
  'Electrical System & Illumination Design': ['Equipment Standards', 'PEC Wiring (THHN)', 'Regulatory'],
  'Distribution Systems & Substation Design': ['Equipment Standards', 'PEC Wiring (THHN)', 'Regulatory'],
  'Power System Analysis': ['Equipment Standards', 'Conversions'],
  'Power Plant Engineering': ['Conversions', 'Regulatory'],
  'EE Laws, Codes, & Professional Ethics': ['Regulatory'],
  'Physics for Engineers': ['Physical Constants', 'Conversions'],
  'Chemistry for Engineers': ['Physical Constants', 'Conversions'],
  'Basic Thermodynamics': ['Conversions'],
  'Fluid Mechanics': ['Conversions'],
  'Engineering Economics': ['Regulatory'],
};

export default function ReferencePanel({ question }) {
  const [isOpen, setIsOpen] = useState(false);

  const relevantConstants = useMemo(() => {
    if (!question) return [];

    const subtopic = question.subtopic || '';
    const categories = SUBTOPIC_CATEGORIES[subtopic];

    if (categories) {
      return EE_CONSTANTS.filter(c => categories.includes(c.category));
    }

    const subject = question.subject || '';
    if (subject === 'EE' || subject === 'Electrical Engineering' || subject === 'Electrical Engineering Professional Subjects') {
      return EE_CONSTANTS.filter(c => ['Equipment Standards', 'PEC Wiring (THHN)', 'Conversions'].includes(c.category));
    }
    if (subject === 'ESAS' || subject === 'Engineering Sciences and Allied Subjects') {
      return EE_CONSTANTS.filter(c => ['Physical Constants', 'Conversions', 'Regulatory'].includes(c.category));
    }
    if (subject === 'Math' || subject === 'Mathematics') {
      return EE_CONSTANTS.filter(c => c.category === 'Conversions');
    }

    return EE_CONSTANTS.slice(0, 15);
  }, [question?.subtopic, question?.subject]);

  if (relevantConstants.length === 0) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-[0.65rem] font-black uppercase tracking-widest text-reeCyan hover:text-reeCyan/80 transition-colors cursor-pointer"
      >
        <span>{isOpen ? '▼' : '▶'}</span>
        <span>Reference Constants ({relevantConstants.length})</span>
      </button>

      {isOpen && (
        <div className="mt-3 max-h-[300px] overflow-y-auto custom-scrollbar bg-bg border border-border2 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {relevantConstants.map((item, idx) => (
              <div
                key={idx}
                className="p-3 bg-surface border border-border2/50 rounded-lg text-xs"
              >
                <div className="text-muted2 font-bold text-[0.6rem] uppercase tracking-wider mb-1">
                  <LatexRenderer content={item.name} />
                </div>
                <div className="text-textMain font-medium">
                  <LatexRenderer content={item.value} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
