// src/features/library/useManualIngestion.js
import { useState } from 'react';
import { saveQuestionToBank } from '../../services/dbQueries';
import toast from 'react-hot-toast';

export const useManualIngestion = (onSuccessCallback) => {
    const [manualMode, setManualMode] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [manualQ, setManualQ] = useState({
        type: 'calculation', 
        difficulty: '2', 
        text: '', 
        answer: '', 
        distractor1: '', 
        distractor2: '', 
        distractor3: '', 
        fixedExplanation: ''
    });

    const handleManualSubmit = async (e, subject, subtopic) => {
        e.preventDefault();

        // Guard against a double-tap on a slow write minting duplicate questions.
        if (isSubmitting) return;

        // 🚀 FIXED: Bulletproof validation that safely handles numeric strings and whitespace
        const requiredFields = [manualQ.text, manualQ.answer, manualQ.distractor1, manualQ.distractor2, manualQ.distractor3];
        const isFormValid = requiredFields.every(field => typeof field === 'string' && field.trim().length > 0);

        if (!isFormValid || !subject || !subtopic) {
            toast.error("Complete all fields. Ensure the subject, question, answer, and 3 distractors are filled.");
            return;
        }

        const optionsArray = [
            manualQ.answer.trim(), 
            manualQ.distractor1.trim(), 
            manualQ.distractor2.trim(), 
            manualQ.distractor3.trim()
        ].sort(() => Math.random() - 0.5);

        const payload = {
            subject,
            subtopic,
            type: manualQ.type,
            difficulty: parseInt(manualQ.difficulty),
            text: manualQ.text.trim(),
            answer: manualQ.answer.trim(),
            options: optionsArray,
            fixedExplanation: manualQ.fixedExplanation ? manualQ.fixedExplanation.trim() : null,
            isFlagged: false 
        };

        setIsSubmitting(true);
        try {
            await saveQuestionToBank(payload);
            toast.success("Question injected successfully into the Matrix.");

            setManualQ({
                type: 'calculation', difficulty: '2', text: '', answer: '',
                distractor1: '', distractor2: '', distractor3: '', fixedExplanation: ''
            });

            if (onSuccessCallback) onSuccessCallback();
        } catch (err) {
            toast.error("Failed to inject question.");
            console.error(err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return { manualMode, setManualMode, manualQ, setManualQ, handleManualSubmit, isSubmitting };
};