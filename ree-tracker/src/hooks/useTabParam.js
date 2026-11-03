// src/hooks/useTabParam.js
//
// A hub page's active tab, kept in ?tab= so a deep link or a reload lands on
// the same tab. An unknown value falls back to the default, and the default is
// left out of the URL. Changes REPLACE the history entry: on a phone, Back
// should leave the page, not walk back through every tab.
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function useTabParam(validIds, fallback, key = 'tab') {
  const [params, setParams] = useSearchParams();
  const raw = params.get(key);
  const tab = validIds.includes(raw) ? raw : fallback;

  const setTab = useCallback((next) => {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (!next || next === fallback) p.delete(key);
      else p.set(key, next);
      return p;
    }, { replace: true });
  }, [setParams, fallback, key]);

  return [tab, setTab];
}
