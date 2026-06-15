import { useState } from 'react';
import { saveQuestionToBank } from '../../services/dbQueries';
import toast from 'react-hot-toast';

export const useManualIngestion = (onIngestSuccess) => {
  const [manualMode, setManualMode] = useState(false);
  const [manualQ, setManualQ] = useState({ 
    text: '', correctAnswer: '', distractors: ['', '', ''], 
    fixedExplanation: '', difficulty: 2, type: 'calculation' 
  });

  const shuffleArray = (array) => [...array].sort(() => Math.random() - 0.5);

  const handleManualSubmit = async (e, targetSubject, targetSubtopic) => {
    e.preventDefault();
    if (!manualQ.text || !manualQ.correctAnswer || manualQ.distractors.some(d => !d)) { 
        toast.error("Complete all fields."); 
        return; 
    }
    
    try {
      const combinedOptions = [manualQ.correctAnswer, ...manualQ.distractors];
      const documentPayload = { 
          text: manualQ.text, 
          options: shuffleArray(combinedOptions), 
          answer: manualQ.correctAnswer, 
          fixedExplanation: manualQ.fixedExplanation, 
          difficulty: manualQ.difficulty, 
          type: manualQ.type, 
          subject: targetSubject, 
          subtopic: targetSubtopic, 
          source: 'manual_entry', 
          createdAt: new Date().toISOString() 
      };
      
      await saveQuestionToBank(documentPayload);
      toast.success('Question added.');
      setManualQ({ text: '', correctAnswer: '', distractors: ['', '', ''], fixedExplanation: '', difficulty: 2, type: 'calculation' });
      setManualMode(false);
      
      if(onIngestSuccess) onIngestSuccess(true);
    } catch (err) { 
      toast.error(`Save failed: ${err.message}`); 
    }
  };

  return { manualMode, setManualMode, manualQ, setManualQ, handleManualSubmit };
};