// src/utils/hotkeys.js
//
// One rule for every single-key shortcut on an answering surface (option
// 1-4/A-D, confidence Q/W/E, Enter/arrows to move on). The handlers used to
// check only for a focused form field, so:
//   - Ctrl/Cmd+C (copying a question) picked option C, and Ctrl+A picked A;
//   - a shortcut pressed while a confirm dialog sat over the exam ("Submit this
//     exam?") changed the answer underneath it.

const FORM_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True when a modal dialog is open that does not contain `scope`. */
function blockingDialogOpen(scope) {
  if (typeof document === 'undefined') return false;
  const dialogs = document.querySelectorAll('[role="dialog"][aria-modal="true"], [role="alertdialog"]');
  for (const d of dialogs) {
    if (!scope || !d.contains(scope)) return true;
  }
  return false;
}

/**
 * Should a page-level shortcut ignore this key event?
 * `scope` is the element the shortcuts belong to, when the surface itself may
 * sit inside a dialog.
 */
export function shouldIgnoreHotkey(e, { scope } = {}) {
  if (!e) return true;
  if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return true;
  const el = typeof document !== 'undefined' ? document.activeElement : null;
  if (el && (FORM_TAGS.has(el.tagName) || el.isContentEditable)) return true;
  return blockingDialogOpen(scope);
}
