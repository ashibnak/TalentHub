import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { rankRecruitSuggestions } from './recruit.ts';

describe('rankRecruitSuggestions', () => {
  it('keeps people who share a skill or a domain and drops the rest', () => {
    const ranked = rankRecruitSuggestions([
      { userId: '1', name: 'بدون اشتراک', username: 'none', skills: 0, domains: 0 },
      { userId: '2', name: 'مهارت', username: 'skill', skills: 1, domains: 0 },
      { userId: '3', name: 'هر دو', username: 'both', skills: 2, domains: 1 },
      { userId: '4', name: 'بدون نام کاربری', username: null, skills: 5, domains: 5 },
    ]);
    assert.deepEqual(
      ranked.map((row) => row.userId),
      ['3', '2'],
    );
  });
});
