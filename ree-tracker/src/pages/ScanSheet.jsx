// src/pages/ScanSheet.jsx
// /scan and /scan/:setId: the answer-sheet scanner, full screen and outside
// the app shell (like /focus and /print/:setId), lazy with its own
// stylesheet. MainLayout isn't mounted here, so the page applies the theme
// itself (useAppearance).
//
// The code in the link is read however it was typed (K7P2-9QXA-M3TD, lower
// case), as the print preview reads it.
import { useParams } from 'react-router-dom';
import { normalizePrintId } from '@ree/shared';
import { useAppearance } from '../hooks/useAppearance';
import Scanner from '../features/paper-sets/scan/Scanner';
import '../features/paper-sets/scan/scan.css';

export default function ScanSheet() {
  useAppearance();
  const { setId } = useParams();
  const id = setId ? normalizePrintId(setId) : null;
  return <Scanner key={id || setId || 'pick'} setId={id} badId={!!setId && !id} />;
}
