// src/features/paper-sets/print/qr.js
//
// The answer sheet's QR codes: the same encoder as the LaTeX sheet
// (paperFormat's loadQrEncoder: the qrcode package, level M), drawn as one
// SVG path.
import { useEffect, useState } from 'react';
import { loadQrEncoder } from '../paperText';

const num = (v) => Number(v.toFixed(3));

/** The QR's dark modules as one path, a run of modules per subpath, in page mm. */
export function qrPath(modules, x0, y0, size) {
  const n = modules?.size;
  if (!n || typeof modules.get !== 'function') return '';
  const u = size / n;
  let d = '';
  for (let r = 0; r < n; r += 1) {
    let start = -1;
    for (let c = 0; c <= n; c += 1) {
      const dark = c < n && !!modules.get(r, c);
      if (dark && start < 0) start = c;
      if (!dark && start >= 0) {
        d += `M${num(x0 + start * u)} ${num(y0 + r * u)}h${num((c - start) * u)}v${num(u)}h${num(-(c - start) * u)}z`;
        start = -1;
      }
    }
  }
  return d;
}

/**
 * The module grids for each page's payload: null while loading, false where
 * none could be made (the sheet then prints the payload as text).
 * @returns {{ modules: (object|false)[]|null, ready: boolean }}
 */
export function useQrModules(payloads) {
  const key = payloads.join('|');
  const [state, setState] = useState({ key: null, modules: [] });
  useEffect(() => {
    let live = true;
    const list = key ? key.split('|') : [];
    loadQrEncoder()
      .then((encode) => list.map((p) => (encode ? encode(p) : null)))
      .catch(() => list.map(() => null))
      .then((modules) => { if (live) setState({ key, modules: modules.map((x) => x || false) }); });
    return () => { live = false; };
  }, [key]);
  return { modules: state.key === key ? state.modules : null, ready: state.key === key };
}
