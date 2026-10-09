// shouldIgnoreHotkey: the one guard every single-key shortcut goes through.
import { describe, it, expect, afterEach } from 'vitest';
import { shouldIgnoreHotkey } from './hotkeys';

const key = (k, mods = {}) => new KeyboardEvent('keydown', { key: k, ...mods });

afterEach(() => { document.body.innerHTML = ''; });

describe('shouldIgnoreHotkey', () => {
  it('lets a plain key through', () => {
    expect(shouldIgnoreHotkey(key('c'))).toBe(false);
  });

  it('ignores copy/select-all and other modifier chords', () => {
    expect(shouldIgnoreHotkey(key('c', { ctrlKey: true }))).toBe(true);
    expect(shouldIgnoreHotkey(key('c', { metaKey: true }))).toBe(true);
    expect(shouldIgnoreHotkey(key('a', { altKey: true }))).toBe(true);
  });

  it('ignores keys typed into a form field', () => {
    document.body.innerHTML = '<input id="f" />';
    document.getElementById('f').focus();
    expect(shouldIgnoreHotkey(key('a'))).toBe(true);
  });

  it('ignores keys while a modal dialog sits over the surface', () => {
    document.body.innerHTML = '<div id="card"></div><div role="dialog" aria-modal="true"></div>';
    expect(shouldIgnoreHotkey(key('b'))).toBe(true);
  });

  it('allows keys for a surface that is itself inside the dialog', () => {
    document.body.innerHTML = '<div role="dialog" aria-modal="true"><div id="card"></div></div>';
    expect(shouldIgnoreHotkey(key('b'), { scope: document.getElementById('card') })).toBe(false);
  });
});
