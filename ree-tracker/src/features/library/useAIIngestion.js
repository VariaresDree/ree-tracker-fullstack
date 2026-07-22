// src/features/library/useAIIngestion.js
import { useState } from 'react';
import { generateQuestionsAI, generateQuestionsFromText, generateQuestionsFromImages } from '../../services/geminiApi';
import { saveQuestionToBank } from '../../services/dbQueries';
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
  const [genLoading, setGenLoading] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [recentGenerations, setRecentGenerations] = useState([]);

  // --- VISION & UPLOAD STATES ---
  const [parsingPdf, setParsingPdf] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // --- QA MATRIX STATES ---
  const [generatedQuestions, setGeneratedQuestions] = useState([]);
  const [showQAModal, setShowQAModal] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // =========================================================================
  // STANDARD AI GENERATION (LEFT PANEL)
  // =========================================================================
  const handleGenerate = async (useWeb) => {
    setGenLoading(true);
    setGenStatus(useWeb ? 'Querying grounded web data...' : 'Querying internal logic core...');
    try {
      const newQs = await generateQuestionsAI(genSubject, genSubtopic, useWeb, 5, recentGenerations);

      if (newQs && newQs.length > 0) {
        for (const q of newQs) {
          const payload = { 
              ...q, 
              subject: genSubject, 
              subtopic: q.subtopic || genSubtopic, 
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

        setGenStatus(`✅ Generated ${newQs.length} items! Routed to Quarantine Queue.`);
        toast.success(`${newQs.length} items sent to Quarantine.`);
        if(onIngestSuccess) onIngestSuccess(true);
      } else {
        setGenStatus('❌ Sync Error. Confirm AI network state.');
      }
    } catch (err) {
      setGenStatus('❌ Generation failed.');
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
    setGenStatus(`File acquired: ${file.name}. Ready for extraction block.`);
  };

  const handlePdfSelect = (e) => handleDrop(e);

  // =========================================================================
  // AI VISION EXTRACTION PIPELINE
  // =========================================================================
  const handleExtractionSuccess = (newQs) => {
      if (newQs && newQs.length > 0) {
          setGeneratedQuestions(newQs);
          setShowQAModal(true);
          setGenStatus(`✅ Successfully extracted ${newQs.length} items! QA required.`);
      } else {
          setGenStatus('❌ AI failed to forge questions from source.');
      }
      setParsingPdf(false);
      setSelectedPdf(null);
  };

  const executePdfExtraction = async () => {
    if (!selectedPdf) return;
    setParsingPdf(true);
    setGenStatus('Initiating extraction matrix...');

    try {
      if (selectedPdf.type.startsWith('image/')) {
         setGenStatus('Scanning image topology...');
         if (typeof generateQuestionsFromImages === 'function') {
             const newQs = await generateQuestionsFromImages(selectedPdf, genSubject, genSubtopic, 5);
             handleExtractionSuccess(newQs);
         } else {
             throw new Error("Vision AI module missing or disconnected.");
         }
      } else if (selectedPdf.type === 'application/pdf') {
         setGenStatus('Booting background worker thread...');
         const arrayBuffer = await selectedPdf.arrayBuffer();
         const worker = new PdfWorker();

         worker.onmessage = async (e) => {
           const { type, text, message, error } = e.data;
           if (type === 'progress') {
             setGenStatus(message);
           } else if (type === 'success') {
             setGenStatus('Transmitting extracted text to Gemini Core...');
             try {
               const newQs = await generateQuestionsFromText(text, genSubject, genSubtopic, 5);
               handleExtractionSuccess(newQs);
             } catch (err) {
               setGenStatus('❌ AI Processing failed.');
               toast.error(`Error: ${err.message}`);
               setParsingPdf(false);
             }
             worker.terminate();
           } else if (type === 'error') {
             setGenStatus('❌ Worker thread failed.');
             toast.error(`Error: ${error}`);
             worker.terminate();
             setParsingPdf(false);
           }
         };
         worker.postMessage({ arrayBuffer });
      }
    } catch (error) {
       setGenStatus('❌ Extraction failed.');
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
      const toastId = toast.loading("Injecting verified items into Quarantine Queue...");
      
      try {
          for (const q of generatedQuestions) {
              const payload = { 
                  ...q, 
                  subject: genSubject, 
                  subtopic: q.subtopic || genSubtopic, 
                  source: 'AI_Vision_Module', 
                  type: q.type || 'conceptual', 
                  status: 'quarantined', // <-- SECURITY PIPELINE: Force to Admin Queue
                  createdAt: new Date().toISOString(),
                  uploadedBy: currentUser?.uid || 'system'
              };
              await saveQuestionToBank(payload);
          }
          
          toast.success(`${generatedQuestions.length} items routed to Admin Quarantine!`, { id: toastId });
          setShowQAModal(false);
          setGeneratedQuestions([]);
          if(onIngestSuccess) onIngestSuccess(true);
      } catch (error) {
          toast.error("Injection failed. Database restricted.", { id: toastId });
      } finally {
          setIsCommitting(false);
      }
  };

  return {
    genSubject, setGenSubject, genSubtopic, setGenSubtopic,
    genLoading, genStatus, parsingPdf, selectedPdf,
    isDragging, handleDragOver, handleDragLeave, handleDrop,
    generatedQuestions, showQAModal, setShowQAModal, isCommitting,
    handleGenerate, handlePdfSelect, executePdfExtraction,
    removeQuestion, handleCommitToMatrix
  };
};