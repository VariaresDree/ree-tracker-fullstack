// Handout links (2026-11-18): each pasted link is read as what it is, so a
// Drive folder or a website no longer opens as a blank frame.
import { describe, it, expect } from 'vitest';
import { driveFolderId, googleDocPreview, linkHint, readHandoutLink, youtubeEmbed } from './handoutLink';

describe('readHandoutLink', () => {
  it.each([
    ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'video'],
    ['https://youtu.be/dQw4w9WgXcQ?si=abc', 'video'],
    ['https://youtube.com/shorts/dQw4w9WgXcQ', 'video'],
    ['https://www.youtube.com/playlist?list=PL123abc', 'video'],
    ['https://drive.google.com/drive/folders/1AbC_dEf-gh?usp=sharing', 'folder'],
    ['https://drive.google.com/drive/u/0/folders/1AbC_dEf-gh', 'folder'],
    ['https://drive.google.com/file/d/1XyZ/view?usp=drive_link', 'pdf'],
    ['https://docs.google.com/presentation/d/1PqR/edit#slide=id.p', 'doc'],
    ['https://docs.google.com/forms/d/e/1Form/viewform', 'link'],
    ['https://www.youtube.com/@SomeChannel', 'link'],
    ['https://nptel.ac.in/courses/108105053', 'link'],
  ])('%s is a %s', (url, type) => {
    expect(readHandoutLink(url).type).toBe(type);
  });

  it('adds https to a bare address and refuses anything not http(s)', () => {
    expect(readHandoutLink('nptel.ac.in/courses')).toEqual({ url: 'https://nptel.ac.in/courses', type: 'link', host: 'nptel.ac.in' });
    expect(readHandoutLink('javascript:alert(1)')).toBeNull();
    expect(readHandoutLink('')).toBeNull();
  });
});

describe('how each one shows in the app', () => {
  it('YouTube videos, shorts and playlists get the embeddable player', () => {
    expect(youtubeEmbed('https://youtu.be/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(youtubeEmbed('https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=30')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(youtubeEmbed('https://www.youtube.com/live/dQw4w9WgXcQ')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    expect(youtubeEmbed('https://www.youtube.com/playlist?list=PL1')).toBe('https://www.youtube.com/embed/videoseries?list=PL1');
    expect(youtubeEmbed('https://vimeo.com/123')).toBeNull();
  });

  it('a Drive folder\'s id, and a Google file\'s preview', () => {
    expect(driveFolderId('https://drive.google.com/drive/folders/1AbC_dEf-gh?usp=sharing')).toBe('1AbC_dEf-gh');
    expect(driveFolderId('https://drive.google.com/file/d/1XyZ/view')).toBeNull();
    expect(googleDocPreview('https://docs.google.com/document/d/1Doc/edit?usp=sharing')).toBe('https://docs.google.com/document/d/1Doc/preview');
    expect(googleDocPreview('https://docs.google.com/spreadsheets/d/1Sheet/edit#gid=0')).toBe('https://docs.google.com/spreadsheets/d/1Sheet/preview');
  });

  it('tells the admin what learners will get', () => {
    expect(linkHint(readHandoutLink('https://drive.google.com/drive/folders/1F'))).toMatch(/learners see its files here/);
    expect(linkHint(readHandoutLink('https://www.electrical4u.com/x'))).toBe("Website (electrical4u.com): opens in the learner's browser.");
    expect(linkHint(null)).toBeNull();
  });
});
