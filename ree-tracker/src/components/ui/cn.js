// Tiny classname joiner — replaces clsx for primitives without a dep.
export const cn = (...parts) => parts.filter(Boolean).join(' ');
