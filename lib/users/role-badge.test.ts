import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeRoleBadge } from './role-badge.ts';

describe('computeRoleBadge', () => {
  it('returns "builder" for technical skills and no domains', () => {
    assert.equal(computeRoleBadge({ technicalSkillCount: 8, domainCount: 0 }), 'builder');
  });

  it('returns "domain_expert" for domains and no technical skills', () => {
    assert.equal(computeRoleBadge({ technicalSkillCount: 0, domainCount: 2 }), 'domain_expert');
  });

  it('returns "domain_expert" for domains with only a few technical skills (< threshold)', () => {
    assert.equal(computeRoleBadge({ technicalSkillCount: 2, domainCount: 1 }), 'domain_expert');
  });

  it('returns "hybrid" for both domains and enough technical skills', () => {
    assert.equal(computeRoleBadge({ technicalSkillCount: 6, domainCount: 2 }), 'hybrid');
  });

  it('is "hybrid" exactly at the builder skill threshold', () => {
    assert.equal(computeRoleBadge({ technicalSkillCount: 3, domainCount: 1 }), 'hybrid');
  });

  it('defaults to "builder" for an empty profile', () => {
    assert.equal(computeRoleBadge({ technicalSkillCount: 0, domainCount: 0 }), 'builder');
  });
});
