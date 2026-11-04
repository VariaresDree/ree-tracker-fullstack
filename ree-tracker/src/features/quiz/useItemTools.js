// src/features/quiz/useItemTools.js
//
// Report and save for screens that look back over items (a sitting's review, a
// session's summary, results lists), where no engine holds them. What's saved is
// known only from this screen.
import { useState } from 'react';
import toast from 'react-hot-toast';
import { removeBookmark, saveBookmark } from '../../services/bookmarks';
import { reportQuestion } from '../../services/reportQuestion';

const toggled = (set, id, on) => {
  const next = new Set(set);
  if (on) next.add(id); else next.delete(id);
  return next;
};

export function useItemTools(uid) {
  const [saved, setSaved] = useState(() => new Set());
  const [reported, setReported] = useState(() => new Set());

  const report = async (id, reason) => {
    try {
      await reportQuestion(id, reason);
      setReported((set) => toggled(set, id, true));
      toast.success('Thanks — we\'ll review this question.');
    } catch {
      toast.error('Couldn\'t report that. Try again.');
    }
  };

  const toggleSave = async (id) => {
    const had = saved.has(id);
    setSaved((set) => toggled(set, id, !had));
    try {
      if (had) await removeBookmark(uid, id);
      else await saveBookmark(uid, { questionId: id });
    } catch {
      setSaved((set) => toggled(set, id, had));
      toast.error('Bookmark failed.');
    }
  };

  return { saved, reported, report, toggleSave };
}
