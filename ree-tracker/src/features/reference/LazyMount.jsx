// src/features/reference/LazyMount.jsx
//
// Renders its children only once they come near the screen (2026-11-18): a
// subject's quick sheet held 900 rows and a big topic 150 cards, all typeset at
// once before the page could scroll. Until then it holds a block of about the
// right height, so the scrollbar and "On this page" jumps stay roughly right.
// Once shown it stays shown. Without IntersectionObserver (tests, old
// browsers) it renders straight away.
import { useEffect, useRef, useState } from 'react';

export default function LazyMount({ estimate = 400, eager = false, children }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(() => eager || typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (shown || !ref.current) return undefined;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { setShown(true); io.disconnect(); }
    }, { rootMargin: '1000px 0px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [shown]);
  if (shown) return children;
  return <div ref={ref} aria-hidden="true" style={{ minHeight: `${estimate}px` }} />;
}

