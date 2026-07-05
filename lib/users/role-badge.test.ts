import { describe, it, expect } from 'vitest';
import { computeRoleBadge } from './role-badge';

describe('computeRoleBadge', () => {
  it('returns "builder" for technical skills and no domains', () => {
    expect(computeRoleBadge({ technicalSkillCount: 8, domainCount: 0 })).toBe('builder');
  });

  it('returns "domain_expert" for domains and no technical skills', () => {
    expect(computeRoleBadge({ technicalSkillCount: 0, domainCount: 2 })).toBe('domain_expert');
  });

  it('returns "domain_expert" for domains with only a few technical skills (< threshold)', () => {
    // e.g. an HR expert who lists ChatGPT + one other tool
    expect(computeRoleBadge({ technicalSkillCount: 2, domainCount: 1 })).toBe('domain_expert');
  });

  it('returns "hybrid" for both domains and enough technical skills', () => {
    expect(computeRoleBadge({ technicalSkillCount: 6, domainCount: 2 })).toBe('hybrid');
  });

  it('is "hybrid" exactly at the builder skill threshold', () => {
    expect(computeRoleBadge({ technicalSkillCount: 3, domainCount: 1 })).toBe('hybrid');
  });

  it('defaults to "builder" for an empty profile', () => {
    expect(computeRoleBadge({ technicalSkillCount: 0, domainCount: 0 })).toBe('builder');
  });
});
