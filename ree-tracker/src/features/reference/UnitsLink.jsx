// src/features/reference/UnitsLink.jsx
//
// "Convert these units", beside a formula card and not on it: the whole card is
// the button that flips it. It opens the converter over the card, at the quantity
// the card uses, so a study session isn't lost to get there. No conversion for this
// card's units, no link.
import { Suspense, useState } from 'react';
import { lazy } from '../../utils/lazyWithRetry';
import { Button } from '../../components/ui';
import { Calculator } from '../../components/ui/icons';
import { categoryForCard } from '../conversion/unitLink';

const ToolsSheet = lazy(() => import('../conversion/ToolsSheet'));

export default function UnitsLink({ card }) {
  const [open, setOpen] = useState(false);
  const category = categoryForCard(card);
  if (!category) return null;
  return (
    <>
      <Button variant="ghost" size="sm" className="self-end text-xs text-[var(--accent-text)]" onClick={() => setOpen(true)}>
        <Calculator size={12} strokeWidth={1.75} aria-hidden="true" /> Convert these units
      </Button>
      {open && (
        <Suspense fallback={null}>
          <ToolsSheet category={category} onClose={() => setOpen(false)} />
        </Suspense>
      )}
    </>
  );
}
