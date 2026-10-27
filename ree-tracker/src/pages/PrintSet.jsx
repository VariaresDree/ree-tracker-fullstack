// src/pages/PrintSet.jsx
// /print/:setId: a printed set's print preview, full screen and outside the
// app shell (like /focus), lazy with its own stylesheet. MainLayout isn't
// mounted here, so the page applies the theme itself (useAppearance) for the
// toolbar around the sheets; the sheets are always black on white.
//
// The code is read however it was typed (K7P2-9QXA-M3TD, lower case), so a
// set code copied from a footer opens too.
import { useParams } from 'react-router-dom';
import { normalizePrintId } from '@ree/shared';
import { useAppearance } from '../hooks/useAppearance';
import PrintPreview from '../features/paper-sets/print/PrintPreview';
import '../features/paper-sets/print/print.css';

export default function PrintSet() {
  useAppearance();
  const { setId } = useParams();
  const id = normalizePrintId(setId);
  return <PrintPreview key={id || 'none'} setId={id} />;
}
