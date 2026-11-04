// An unfinished exam on a shared browser belongs to whoever sat it. The three
// drafts carried no owner, so the next account could resume, and submit, the
// last account's exam.
import { describe, it, expect, beforeEach } from 'vitest';
import { claimDraftsFor } from './draftOwner';

const DRAFTS = ['ree_sim_cache', 'ree_gauntlet_cache', 'ree_full_board'];
const put = () => DRAFTS.forEach((k) => localStorage.setItem(k, '{"x":1}'));
const left = () => DRAFTS.filter((k) => localStorage.getItem(k) != null);

describe('claimDraftsFor', () => {
  beforeEach(() => localStorage.clear());

  it('another account signing in does not inherit the drafts', () => {
    claimDraftsFor('a');
    put();
    claimDraftsFor('b');
    expect(left()).toEqual([]);
  });

  it('the same account coming back keeps them', () => {
    claimDraftsFor('a');
    put();
    claimDraftsFor('a');
    expect(left()).toEqual(DRAFTS);
  });

  it('a draft from before owners were recorded stays with whoever is here, so a deploy can’t end a running exam', () => {
    put();
    claimDraftsFor('a');
    expect(left()).toEqual(DRAFTS);
    claimDraftsFor('b');
    expect(left()).toEqual([]);
  });

  it('touches nothing else on the device', () => {
    claimDraftsFor('a');
    localStorage.setItem('ree-theme', 'dark');
    claimDraftsFor('b');
    expect(localStorage.getItem('ree-theme')).toBe('dark');
  });

  it('signed out, it does nothing', () => {
    claimDraftsFor('a');
    put();
    claimDraftsFor(null);
    expect(left()).toEqual(DRAFTS);
    expect(localStorage.getItem('ree-drafts-owner')).toBe('a');
  });
});
