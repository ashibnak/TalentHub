import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterByAudience, pickLessonsForDay, LESSON_LEVEL_LABEL_FA, type Lesson } from './rules.ts';

const lesson = (slug: string, audience: Lesson['audience'] = 'all', level: Lesson['level'] = 'beginner'): Lesson => ({
  slug,
  audience,
  level,
  provider: 'Provider',
  title: `title ${slug}`,
  description: `desc ${slug}`,
  url: `https://example.test/${slug}`,
  durationMinutes: null,
});

/** Deliberately NOT in slug order, to catch order-dependence. */
const POOL: Lesson[] = [
  lesson('c-all'),
  lesson('a-builder', 'builder', 'advanced'),
  lesson('d-domain', 'domain_expert'),
  lesson('b-all', 'all', 'intermediate'),
  lesson('e-builder', 'builder'),
];

describe('filterByAudience', () => {
  it('gives a builder the shared and builder lessons only', () => {
    assert.deepEqual(
      filterByAudience(POOL, 'builder').map((l) => l.slug),
      ['a-builder', 'b-all', 'c-all', 'e-builder'],
    );
  });

  it('never shows a domain expert a builder-only lesson', () => {
    for (const l of filterByAudience(POOL, 'domain_expert')) {
      assert.notEqual(l.audience, 'builder');
    }
  });

  it('gives a hybrid everything', () => {
    assert.equal(filterByAudience(POOL, 'hybrid').length, POOL.length);
  });

  it('sorts by slug so DB row order cannot change what today shows', () => {
    assert.deepEqual(
      filterByAudience([...POOL].reverse(), 'builder').map((l) => l.slug),
      filterByAudience(POOL, 'builder').map((l) => l.slug),
    );
  });
});

describe('pickLessonsForDay — determinism', () => {
  const day = new Date('2026-08-30T09:00:00.000Z');

  it('returns the same lessons for the same day and role', () => {
    assert.deepEqual(pickLessonsForDay(POOL, 'builder', day), pickLessonsForDay(POOL, 'builder', day));
  });

  it('is stable across times within the same Tehran day', () => {
    assert.deepEqual(
      pickLessonsForDay(POOL, 'builder', new Date('2026-08-30T06:00:00.000Z')),
      pickLessonsForDay(POOL, 'builder', new Date('2026-08-30T19:00:00.000Z')),
    );
  });

  it('changes on the next day', () => {
    assert.notDeepEqual(
      pickLessonsForDay(POOL, 'builder', day),
      pickLessonsForDay(POOL, 'builder', new Date('2026-08-31T09:00:00.000Z')),
    );
  });

  it('gives two distinct lessons — the second is the "next" one', () => {
    const picked = pickLessonsForDay(POOL, 'builder', day);
    assert.equal(picked.length, 2);
    assert.notEqual(picked[0].slug, picked[1].slug);
  });

  it('shows everyone in the same role the same lesson today', () => {
    const a = pickLessonsForDay(POOL, 'builder', day);
    const b = pickLessonsForDay(POOL, 'builder', day);
    assert.equal(a[0].slug, b[0].slug);
  });

  it('returns an empty list for an empty pool, so the block renders nothing', () => {
    assert.deepEqual(pickLessonsForDay([], 'builder', day), []);
  });

  it('returns nothing when no lesson targets that role', () => {
    assert.deepEqual(pickLessonsForDay([lesson('only-de', 'domain_expert')], 'builder', day), []);
  });

  it('covers the whole pool over a full rotation, never stranding a lesson', () => {
    const builderPool = filterByAudience(POOL, 'builder');
    const seen = new Set<string>();
    for (let d = 0; d < 60; d++) {
      for (const l of pickLessonsForDay(POOL, 'builder', new Date(2026, 0, 1 + d, 12))) seen.add(l.slug);
    }
    assert.equal(seen.size, builderPool.length, 'every lesson in the pool eventually surfaces');
  });
});

describe('level labels', () => {
  it('has Persian copy for every level', () => {
    assert.deepEqual(Object.keys(LESSON_LEVEL_LABEL_FA).sort(), ['advanced', 'beginner', 'intermediate']);
    for (const v of Object.values(LESSON_LEVEL_LABEL_FA)) assert.ok(v.length > 0);
  });
});
