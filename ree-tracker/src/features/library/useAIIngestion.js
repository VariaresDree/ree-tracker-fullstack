// src/features/library/useAIIngestion.js
import { useState } from 'react';
import { generateQuestionsAI, generateQuestionsFromText, generateQuestionsFromImages } from '../../services/geminiApi';
import { saveQuestionToBank } from '../../services/dbQueries';
import { useStore } from '../../store/useStore';
import { labelForGenerated } from '../../utils/topicLabels';
import toast from 'react-hot-toast';
import PdfWorker from './pdfWorker?worker';

export const useAIIngestion = (onIngestSuccess) => {
  // --- INGESTION SETTINGS ---
  const [genSubject, setGenSubject] = useState('EE');
  // Default to the neutral "All" sentinel — NOT a real topic. Previously this
  // defaulted to TOS['EE'][0] ('Quantities/Units/Constants'), so any generation
  // launched without opening the Topic dropdown silently targeted that one
  // topic. getStrictRules() treats 'All' as "categorize into any valid subtopic".
  const [genSubtopic, setGenSubtopic] = useState('All');
  // Optional free-text steering finer than the TOS dropdown (a sub-subtopic,
  // device, or question style). Blank = generation behaves exactly as before.
  const [genFocus, setGenFocus] = useState('');
  const [genLoading, setGenLoading] = useState(false);
  const [genStatus, setGenStatusText] = useState('');
  // 'success' | 'error' | null — colours the result strip. It used to be read
  // off a ✅ / ❌ at the start of the message.
  const [genTone, setGenTone] = useState(null);
  const setGenStatus = (text, tone = null) => { setGenStatusText(text); setGenTone(tone); };
  const [recentGenerations, setRecentGenerations] = useState([]);

  // --- VISION & UPLOAD STATES ---
  const [parsingPdf, setParsingPdf] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- QA MATRIX STATES ---
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showQAModal, setShowQAModal] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // The subtopic a generated question is filed under: the picked topic, or the
  // model's label snapped to the live taxonomy (see utils/topicLabels).
  const labelFor = (q) => labelForGenerated(q.subtopic, {
    target: genSubtopic,
    topics: useStore.getState().dynamicTOS?.[genSubject],
  });

  // =========================================================================
  // STANDARD AI GENERATION (LEFT PANEL)
  // =========================================================================
  const handleGenerate = async (useWeb) => {
    setGenLoading(true);
    setGenStatus(useWeb ? 'Generating from web sources…' : 'Generating…');
    try {
      const newQs = await generateQuestionsAI(genSubject, genSubtopic, useWeb, 5, recentGenerations, genFocus.trim() || null);

      if (newQs && newQs.length > 0) {
        for (const q of newQs) {
          const payload = { 
              ...q, 
              subject: genSubject, 
              subtopic: labelFor(q), 
              source: useWeb ? 'web' : 'ai', 
              type: q.type || 'calculation', 
              status: 'quarantined', // <-- SECURITY PIPELINE: Force to Admin Queue
              createdAt: new Date().toISOString() 
          };
          await saveQuestionToBank(payload);
        }

        setRecentGenerations(prev => {
          const updated = [...prev, ...newQs.map(q => q.text)];
          return updated.slice(-15);
        });

        setGenStatus(`Generated ${newQs.length} questions. They wait in the review queue until approved.`, 'success');
        toast.success(`${newQs.length} questions sent to the review queue.`);
        if(onIngestSuccess) onIngestSuccess(true);
      } else {
        setGenStatus("Couldn't save the generated questions. Check the connection and try again.", 'error');
      }
    } catch (err) {
      setGenStatus('Generation failed. Try again.', 'error');
      toast.error(`AI generation failed: ${err.message}`);
    }
    setGenLoading(false);
  };

  // =========================================================================
  // DRAG & DROP HANDLERS (RIGHT PANEL)
  // =========================================================================
  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragging(false); };
  
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer ? e.dataTransfer.files[0] : e.target.files?.[0];
    if (!file) { setSelectedPdf(null); setGenStatus(''); return; }
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) return toast.error("Invalid format. Please use PDF or Image.");
    
    setSelectedPdf(file);
    setGenStatus(`${file.name} is ready. Extract the questions when you are.`);
  };

  const handlePdfSelect = (e) => handleDrop(e);

  // =========================================================================
  // AI VISION EXTRACTION PIPELINE
  // =========================================================================
  const handleExtractionSuccess = (newQs) => {
      if (newQs && newQs.length > 0) {
          setGeneratedQuestions(newQs);
          setShowQAModal(true);
          setGenStatus(`Extracted ${newQs.length} questions. Check them before they go to the bank.`, 'success');
      } else {
          setGenStatus("Couldn't extract questions from this file.", 'error');
      }
      setParsingPdf(false);
      setSelectedPdf(null);
  };

  const executePdfExtraction = async () => {
    if (!selectedPdf) return;
    setParsingPdf(true);
    setGenStatus('Starting extraction…');

    try {
      if (selectedPdf.type.startsWith('image/')) {
         setGenStatus('Reading the image…');
         if (typeof generateQuestionsFromImages === 'function') {
             const newQs = await generateQuestionsFromImages(selectedPdf, genSubject, genSubtopic, 5);
             handleExtractionSuccess(newQs);
         } else {
             throw new Error("Vision AI module missing or disconnected.");
         }
      } else if (selectedPdf.type === 'application/pdf') {
         setGenStatus('Reading the PDF…');
         const arrayBuffer = await selectedPdf.arrayBuffer();
         const worker = new PdfWorker();

         worker.onmessage = async (e) => {
           const { type, text, message, error } = e.data;
           if (type === 'progress') {
             setGenStatus(message);
           } else if (type === 'success') {
             setGenStatus('Finding the questions in the text…');
             try {
               const newQs = await generateQuestionsFromText(text, genSubject, genSubtopic, 5);
               handleExtractionSuccess(newQs);
             } catch (err) {
               setGenStatus("Couldn't process the file. Try again.", 'error');
               toast.error(`Error: ${err.message}`);
               setParsingPdf(false);
             }
             worker.terminate();
           } else if (type === 'error') {
             setGenStatus("Couldn't read the PDF. Try again.", 'error');
             toast.error(`Error: ${error}`);
             worker.terminate();
             setParsingPdf(false);
           }
         };
         worker.postMessage({ arrayBuffer });
      }
    } catch (error) {
       setGenStatus('Extraction failed. Try again.', 'error');
       toast.error(`Error: ${error.message}`);
       setParsingPdf(false);
    }
  };

  // =========================================================================
  // QA MATRIX ACTIONS
  // =========================================================================
  const removeQuestion = (index) => {
      setGeneratedQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleCommitToMatrix = async (currentUser) => {
      if (generatedQuestions.length === 0) return;
      
      setIsCommitting(true);
      const toastId = toast.loading("Adding questions to the review queue…");
      
      try {
          for (const q of generatedQuestions) {
              const payload = { 
                  ...q, 
                  subject: genSubject, 
                  subtopic: labelFor(q), 
                  source: 'AI_Vision_Module', 
                  type: q.type || 'conceptual', 
                  status: 'quarantined', // <-- SECURITY PIPELINE: Force to Admin Queue
                  createdAt: new Date().toISOString(),
                  uploadedBy: currentUser?.uid || 'system'
              };
              await saveQuestionToBank(payload);
          }
          
          toast.success(`${generatedQuestions.length} questions added to the review queue.`, { id: toastId });
          setShowQAModal(false);
          setGeneratedQuestions([]);
          if(onIngestSuccess) onIngestSuccess(true);
      } catch {
          toast.error("Couldn't add the questions. Please try again.", { id: toastId });
      } finally {
          setIsCommitting(false);
      }
  };

  return {
    genSubject, setGenSubject, genSubtopic, setGenSubtopic,
    genFocus, setGenFocus,
    genLoading, genStatus, genTone, parsingPdf, selectedPdf,
    isDragging, handleDragOver, handleDragLeave, handleDrop,
    generatedQuestions, showQAModal, setShowQAModal, isCommitting,
    handleGenerate, handlePdfSelect, executePdfExtraction,
    removeQuestion, handleCommitToMatrix
  };
};