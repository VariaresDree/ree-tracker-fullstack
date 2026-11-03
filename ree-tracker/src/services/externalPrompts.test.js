import { describe, it, expect } from 'vitest';
import { buildCardImportPrompt, buildQuestionImportPrompt, MAX_PER_MESSAGE } from './externalPrompts';
import { EXPLANATION_RULES, JSON_MATH_RULE, MATH_RULES } from './aiPrompts';

describe('buildQuestionImportPrompt', () => {
  const prompt = (over) => buildQuestionImportPrompt({ subject: 'EE', topic: 'Electric Circuits 2', count: 10, ...over });

  it('carries the app’s rules and format, and asks for one code block', () => {
    const p = prompt();
    expect(p).toContain(EXPLANATION_RULES);
    expect(p).toContain(MATH_RULES);
    expect(p).toContain('===QUESTION===');
    expect(p).toMatch(/ONE code block/);
    expect(p).toContain('topic "Electric Circuits 2"');
  });

  it('never asks for doubled backslashes: this isn’t JSON', () => {
    expect(prompt()).not.toContain(JSON_MATH_RULE);
    expect(prompt()).toMatch(/single backslashes/);
  });

  it('lists the live topics when none is picked', () => {
    expect(prompt({ topic: 'All', topics: ['A one', 'B two'] })).toContain('A one | B two');
  });

  it('caps a message at what a free app can finish', () => {
    expect(prompt({ count: 500 })).toContain(`Write ${MAX_PER_MESSAGE} original`);
  });

  it('mentions an attached file only when there is one', () => {
    expect(prompt({ fromFile: true })).toMatch(/file I attached/);
    expect(prompt()).not.toMatch(/file I attached/);
  });
});

describe('buildCardImportPrompt', () => {
  it('passes the names to skip and the tags to reuse', () => {
    const p = buildCardImportPrompt({ subject: 'EE', topic: 'Electric Circuits 2', existingNames: ['Ohm law'], existingTags: ['AC Power'] });
    expect(p).toContain('skip these: Ohm law');
    expect(p).toContain('Reuse one of these when it fits: AC Power');
    expect(p).toContain('===CARD===');
  });
});
