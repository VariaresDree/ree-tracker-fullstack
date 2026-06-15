// src/features/library/EditQuestionModal.jsx
import React, { useState } from 'react';
import FocusTrap from '../../components/FocusTrap';
import { TOS } from '../../config/constants';

export default function EditQuestionModal({ question, onClose, onSave }) {
    const [editData, setEditData] = useState({ ...question });
    // Find which option matches the current answer
    const initialCorrectIdx = question.options?.indexOf(question.answer) >= 0 ? question.options.indexOf(question.answer) : 0;
    const [correctIndex, setCorrectIndex] = useState(initialCorrectIdx);

    const handleOptionChange = (idx, value) => {
        const newOptions = [...(editData.options || ['', '', '', ''])];
        newOptions[idx] = value;
        setEditData({ ...editData, options: newOptions });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Force the answer to exactly match the selected option string
        const finalData = {
            ...editData,
            answer: editData.options[correctIndex],
            isFlagged: false // <-- CRITICAL FIX: Explicitly clear the error flag when saved by admin!
        };
        onSave(finalData);
    };

    return (
        <div className="fixed inset-0 bg-bg/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <FocusTrap active={true}>
                <form onSubmit={handleSubmit} className="bg-surface border border-reeBlue/40 p-6 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-6 border-b border-border2 pb-4">
                        <h3 className="text-lg font-black text-textMain flex items-center gap-2"><span>✏️</span> Edit Matrix Data</h3>
                        <button type="button" onClick={onClose} className="text-muted hover:text-reeRed font-bold transition-colors cursor-pointer">✕ Close</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-1">Subject</label>
                            <select value={editData.subject} onChange={e => setEditData({...editData, subject: e.target.value, subtopic: TOS[e.target.value][0]})} className="w-full bg-bg border border-border2 p-2.5 rounded text-xs text-textMain outline-none cursor-pointer focus:border-reeBlue transition-colors">
                                {Object.keys(TOS).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-1">Subtopic</label>
                            <select value={editData.subtopic} onChange={e => setEditData({...editData, subtopic: e.target.value})} className="w-full bg-bg border border-border2 p-2.5 rounded text-xs text-textMain outline-none cursor-pointer focus:border-reeBlue transition-colors">
                                {TOS[editData.subject]?.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-[0.65rem] font-bold text-muted uppercase tracking-wider mb-1">Question Content Text</label>
                        <textarea value={editData.text} onChange={e => setEditData({...editData, text: e.target.value})} className="w-full bg-bg border border-border2 p-3 rounded text-sm text-textMain h-24 outline-none focus:border-reeBlue font-mono custom-scrollbar transition-colors" />
                    </div>

                    <div className="bg-bg border border-border2 p-4 rounded-xl mb-4">
                        <label className="block text-[0.65rem] font-bold text-reeAmber uppercase tracking-wider mb-3">Options & Answer Mapping</label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[0, 1, 2, 3].map(idx => (
                                <div key={idx} className={`flex items-center gap-2 p-2 border rounded-lg transition-colors ${correctIndex === idx ? 'border-reeGreen bg-reeGreen/10 shadow-[inset_0_0_10px_rgba(34,197,94,0.05)]' : 'border-border2 hover:border-reeGreen/30'}`}>
                                    <input type="radio" name="correctAnswer" checked={correctIndex === idx} onChange={() => setCorrectIndex(idx)} className="w-4 h-4 accent-reeGreen cursor-pointer" />
                                    <input type="text" value={editData.options?.[idx] || ''} onChange={(e) => handleOptionChange(idx, e.target.value)} placeholder={`Option ${String.fromCharCode(65+idx)}`} className="bg-transparent text-sm text-textMain outline-none flex-1 font-mono w-full" required />
                                </div>
                            ))}
                        </div>
                        <p className="text-[0.65rem] text-muted mt-2">Select the radio button next to the correct option. The system guarantees an exact string match to prevent evaluation errors.</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-[0.65rem] font-bold text-reeCyan uppercase tracking-wider mb-1">Offline Explanation / Derivation</label>
                        <textarea value={editData.fixedExplanation || ''} onChange={e => setEditData({...editData, fixedExplanation: e.target.value})} className="w-full bg-surface2 border border-border2 p-3 rounded text-sm text-textMain h-20 outline-none focus:border-reeCyan font-mono custom-scrollbar transition-colors" />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-border2">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 bg-surface2 hover:bg-surface3 border border-border2 text-textMain font-bold rounded-lg text-xs cursor-pointer transition-colors">Cancel</button>
                        <button type="submit" className="px-5 py-2.5 bg-reeBlue hover:bg-reeBlue2 text-white font-bold rounded-lg text-xs tracking-wider uppercase cursor-pointer transition-colors shadow-md">Deploy Updates</button>
                    </div>
                </form>
            </FocusTrap>
        </div>
    );
}