// src/features/quiz/useAiExplanation.js
//
// One AI-explanation state for a whole screen, keyed by question. Practice and
// the mock review kept a single "current explanation" and wrote the reply into
// whatever question was current when it arrived — so moving on while it loaded
// attached it to the next question (and in Practice, recorded it into that
// question's object).
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  explanationKey, readSavedExplanations, requestExplanation, saveExplanation,
} from '../../services/aiExplanations';

export function useAiExplanation(uid) {
  // key → { text?, loading? }
  const [byKey, setByKey] = useState({});
  const byKeyRef = useRef(byKey);
  const mounted = useRef(true);

  useEffect(() => { byKeyRef.current = byKey; }, [byKey]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  // Saved explanations, so "Explain with AI" works offline for any question
  // explained before on this device.
  useEffect(() => {
    if (!uid) return undefined;
    let cancelled = false;
    readSavedExplanations(uid).then((map) => {
      if (cancelled || !mounted.current) return;
      setByKey((prev) => {
        const next = { ...prev };
        for (const [key, entry] of Object.entries(map)) {
          if (entry?.text && !next[key]?.text) next[key] = { text: entry.text };
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [uid]);

  /**
   * The explanation for `question`: the saved one unless `force` (Regenerate),
   * else a fresh one. Resolves to the text, or null when none could be had.
   */
  const explain = useCallback(async (question, { force = false } = {}) => {
    const key = explanationKey(question);
    if (!key) return null;
    const current = byKeyRef.current[key];
    if (current?.loading) return null;
    if (!force && current?.text) return current.text;

    const update = (patch) => {
      if (!mounted.current) return;
      setByKey((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
    };
    // Marked loading in the ref too, so a second tap before the re-render
    // doesn't start a second request.
    byKeyRef.current = { ...byKeyRef.current, [key]: { ...current, loading: true } };
    update({ loading: true });
    try {
      const text = await requestExplanation(question);
      update({ text, loading: false });
      saveExplanation(uid, key, text).catch(() => {});
      return text;
    } catch {
      update({ loading: false });
      return null;
    }
  }, [uid]);

  const entryFor = (question) => byKey[explanationKey(question)] || null;

  return {
    explain,
    textFor: (question) => entryFor(question)?.text || null,
    isLoading: (question) => !!entryFor(question)?.loading,
  };
}
