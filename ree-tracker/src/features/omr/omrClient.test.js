// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { createOmrClient, REASON_HINTS } from './omrClient';
import { handleOmrRequest } from './omrHandler';
import { answerSheetGeometry } from '../exam-export/sheetLayout';
import { mulberry32, renderSheet, sheetToRGBA } from './__fixtures__/synthSheet';

const optionCounts = Array(30).fill(4);
const printId = 'K7P29QXAM3TD';
const page = answerSheetGeometry({ optionCounts, paper: 'a4', printId }).pages[0];
const sheet = renderSheet(page, { ppm: 4, marks: { 1: [2], 2: [0] }, rng: mulberry32(2) });
const scan = () => sheetToRGBA(sheet);
const blank = () => ({ data: new Uint8ClampedArray(64 * 48 * 4).fill(200), width: 64, height: 48 });

// Answers like omr.worker.js, a tick later; `ready: false` never says ready.
class FakeWorker {
  constructor({ ready = true } = {}) {
    this.posted = [];
    if (ready) setTimeout(() => this.onmessage && this.onmessage({ data: { type: 'ready' } }), 0);
  }

  postMessage(msg, transfer) {
    this.posted.push({ msg, transfer });
    setTimeout(() => {
      if (this.dead) return;
      const { reply } = handleOmrRequest(msg);
      this.onmessage({ data: reply });
    }, 0);
  }

  terminate() {
    this.dead = true;
  }
}

const tick = () => new Promise((r) => { setTimeout(r, 5); });

describe('handleOmrRequest', () => {
  it('answers detect, read and ping, and reports errors as replies', () => {
    expect(handleOmrRequest({ id: 1, type: 'ping' }).reply).toEqual({ id: 1, ok: true, result: 'pong' });
    const read = handleOmrRequest({ id: 2, type: 'read', img: scan(), opts: { printId, optionCounts, reviewPpm: 1 } });
    expect(read.reply.ok).toBe(true);
    expect(read.reply.result.answers.slice(0, 3)).toBe('CA-');
    expect(read.transfer).toEqual([read.reply.result.review.data.buffer]);
    expect(handleOmrRequest({ id: 3, type: 'detect', img: blank() }).reply.result.reason).toBe('no-sheet');
    expect(handleOmrRequest({ id: 4, type: 'nope' }).reply).toMatchObject({ id: 4, ok: false });
    expect(handleOmrRequest({ id: 5, type: 'read', img: null }).reply).toMatchObject({ id: 5, ok: false });
  });
});

describe('createOmrClient', () => {
  it('runs on the main thread where there is no Worker (node)', async () => {
    const omr = createOmrClient();
    expect(omr.mode).toBe('main');
    const res = await omr.read(scan(), { printId, optionCounts });
    expect(res.ok).toBe(true);
    expect(res.answers.slice(0, 3)).toBe('CA-');
    expect((await omr.detect(blank())).reason).toBe('no-sheet');
    await expect(omr.read(null, {})).rejects.toThrow();
  });

  it('uses the worker once it says ready, moving the image buffer to it', async () => {
    let fake;
    const omr = createOmrClient({ createWorker: () => { fake = new FakeWorker(); return fake; } });
    expect(omr.mode).toBe('pending');
    const img = scan();
    const pending = omr.read(img, { printId, optionCounts }); // asked before ready: waits
    await tick();
    expect(omr.mode).toBe('worker');
    const res = await pending;
    expect(res.ok).toBe(true);
    expect(fake.posted[0].transfer).toEqual([img.data.buffer]);
    const kept = scan();
    await omr.detect(kept, {}, { transfer: false });
    expect(fake.posted[1].transfer).toEqual([]);
    omr.terminate();
    expect(fake.dead).toBe(true);
    expect(omr.mode).toBe('closed');
    await expect(omr.detect(blank())).rejects.toThrow('closed');
  });

  it('falls back to the main thread when the worker fails to start, running what was waiting', async () => {
    let fake;
    const omr = createOmrClient({ createWorker: () => { fake = new FakeWorker({ ready: false }); return fake; } });
    const waiting = omr.read(scan(), { printId, optionCounts });
    fake.onerror({ preventDefault() {} });
    expect(omr.mode).toBe('main');
    expect((await waiting).ok).toBe(true);
    expect(fake.dead).toBe(true);
  });

  it('falls back when the worker never says ready', async () => {
    const omr = createOmrClient({ createWorker: () => new FakeWorker({ ready: false }), readyTimeoutMs: 10 });
    const res = await omr.detect(blank());
    expect(omr.mode).toBe('main');
    expect(res.reason).toBe('no-sheet');
  });

  it('a worker that dies mid-request fails that request, then the main thread takes over', async () => {
    let fake;
    const omr = createOmrClient({ createWorker: () => { fake = new FakeWorker(); return fake; } });
    await tick();
    fake.postMessage = function post(msg, transfer) { this.posted.push({ msg, transfer }); };
    const lost = omr.detect(blank());
    fake.onerror({});
    await expect(lost).rejects.toThrow('stopped');
    expect((await omr.detect(blank())).reason).toBe('no-sheet');
  });

  it('passes worker errors on as rejections', async () => {
    const omr = createOmrClient({ createWorker: () => new FakeWorker() });
    await tick();
    await expect(omr.read({ width: 1 }, {})).rejects.toThrow();
  });

  it('re-exports the hints', () => {
    expect(REASON_HINTS['no-sheet']).toMatch(/four black squares/);
  });
});
