import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ProjectFormSchema, parseProjectForm } from './rules.ts';

function fd(entries: [string, string][]): FormData {
  const f = new FormData();
  for (const [k, v] of entries) f.append(k, v);
  return f;
}

describe('project form rules', () => {
  it('accepts a valid project and dedups skills (happy path)', () => {
    const r = parseProjectForm(
      fd([
        ['title', 'My Project'],
        ['description', 'A sufficiently long description.'],
        ['stage', 'building'],
        ['githubUrl', 'https://github.com/a/b'],
        ['confirmed', 'on'],
        ['publish', 'on'],
        ['skills', 'ml'],
        ['skills', 'ml'],
      ]),
    );
    assert.ok(!('error' in r));
    if ('error' in r) return;
    assert.equal(r.title, 'My Project');
    assert.equal(r.publish, true);
    assert.deepEqual(r.skillSlugs, ['ml']);
  });

  it('rejects a missing IP-confirmation checkbox with code "confirm"', () => {
    const r = parseProjectForm(
      fd([
        ['title', 'My Project'],
        ['description', 'A sufficiently long description.'],
        ['stage', 'building'],
      ]),
    );
    assert.deepEqual(r, { error: 'confirm' });
  });

  it('schema rejects a too-short title', () => {
    const res = ProjectFormSchema.safeParse({
      title: 'ab',
      description: 'x'.repeat(20),
      stage: 'building',
      githubUrl: null,
      demoUrl: null,
      confirmed: true,
    });
    assert.equal(res.success, false);
  });
});
