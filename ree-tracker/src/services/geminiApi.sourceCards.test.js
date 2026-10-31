// Admin › Formula cards › From a file: a reviewer's formulas and constants
// become draft cards, filed under the live topics, with no concept cards.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./dbQueries', () => ({ apiRequest: vi.fn() }));

import { apiRequest } from './dbQueries';
import { generateReferenceCardsFromSource } from './geminiApi';

const answer = (items) => ({ text: JSON.stringify({ items }), model: 'm' });
const TOPICS = ['AC Circuits', 'DC Circuits'];

beforeEach(() => apiRequest.mockReset());

describe('generateReferenceCardsFromSource', () => {
  it('keeps formulas and constants, snaps each topic to the live spelling, and sets the subject', async () => {
    apiRequest.mockResolvedValueOnce(answer([
      { kind: 'formula', name: 'Ohm’s law', topic: 'dc circuits', subject: 'X' },
      { kind: 'concept', name: 'Skin effect', topic: 'AC Circuits' },
      { kind: 'constant', name: 'Permittivity', topic: 'AC Circuits' },
    ]));
    const rows = await generateReferenceCardsFromSource({ subject: 'EE', topics: TOPICS, text: 'V = IR ...' });
    expect(rows.map((r) => [r.name, r.subject, r.topic])).toEqual([
      ['Ohm’s law', 'EE', 'DC Circuits'],
      ['Permittivity', 'EE', 'AC Circuits'],
    ]);
    const body = apiRequest.mock.calls[0][2];
    expect(body.task).toBe('author');
    expect(body.contents).toMatch(/AC Circuits \| DC Circuits/);
  });

  it('reads a long PDF in parts and drops a card a later part repeats, or one already in the library', async () => {
    apiRequest
      .mockResolvedValueOnce(answer([{ kind: 'formula', name: 'Ohm’s law', topic: 'DC Circuits' }, { kind: 'formula', name: 'Power', topic: 'DC Circuits' }]))
      .mockResolvedValueOnce(answer([{ kind: 'formula', name: 'ohm’s law ', topic: 'DC Circuits' }, { kind: 'formula', name: 'KVL', topic: 'DC Circuits' }]));
    const onProgress = vi.fn();
    const rows = await generateReferenceCardsFromSource(
      { subject: 'EE', topics: TOPICS, text: 'x'.repeat(30_000), existingNames: ['Power'] },
      onProgress,
    );
    expect(rows.map((r) => r.name)).toEqual(['Ohm’s law', 'KVL']);
    expect(onProgress).toHaveBeenCalledWith(2, 2);
  });

  it('sends photos to the image chain, with the topic the admin picked', async () => {
    apiRequest.mockResolvedValueOnce(answer([{ kind: 'formula', name: 'Slip', topic: 'Anything' }]));
    const rows = await generateReferenceCardsFromSource({ subject: 'EE', topic: 'AC Circuits', topics: TOPICS, images: ['data:image/png;base64,QUJD'] });
    expect(rows[0].topic).toBe('AC Circuits');
    const body = apiRequest.mock.calls[0][2];
    expect(body.task).toBe('vision');
    expect(body.contents[1]).toEqual({ inlineData: { data: 'QUJD', mimeType: 'image/png' } });
  });
});
