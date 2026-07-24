import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfileForm, parseAddSkillForm } from './rules.ts';

function fd(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe('profile form rules', () => {
  it('accepts a valid profile and strips a leading @ from github (happy path)', () => {
    const r = parseProfileForm(fd([['name', 'Ali Reza'], ['githubUsername', '@ali-r']]));
    assert.ok(!('error' in r));
    if ('error' in r) return;
    assert.equal(r.name, 'Ali Reza');
    assert.equal(r.githubUsername, 'ali-r');
    assert.equal(r.roleTitle, null);
  });

  it('rejects a non-http linkedin URL with code "linkedin"', () => {
    const r = parseProfileForm(fd([['name', 'Ali'], ['linkedinUrl', 'javascript:alert(1)']]));
    assert.deepEqual(r, { error: 'linkedin' });
  });
});

describe('add-skill rules', () => {
  it('accepts slug + level (happy path)', () => {
    const r = parseAddSkillForm(fd([['skillSlug', 'ml'], ['claimedLevel', '3']]));
    assert.deepEqual(r, { skillSlug: 'ml', claimedLevel: 3 });
  });

  it('rejects an out-of-range level with code "level"', () => {
    const r = parseAddSkillForm(fd([['skillSlug', 'ml'], ['claimedLevel', '9']]));
    assert.deepEqual(r, { error: 'level' });
  });
});
