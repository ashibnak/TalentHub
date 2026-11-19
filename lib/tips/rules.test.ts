import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dayOfYearTehran, filterByAudience, pickTipsForDay, type Tip } from './rules.ts';

const tip = (slug: string, audience: Tip['audience'] = 'all'): Tip => ({
  slug,
  audience,
  category: 'platform',
  title: `title ${slug}`,
  body: `body ${slug}`,
});

/** A pool with a mix of audiences, deliberately NOT in slug order. */
const POOL: Tip[] = [
  tip('c-all'),
  tip('a-builder', 'builder'),
  tip('d-domain', 'domain_expert'),
  tip('b-all'),
  tip('e-builder', 'builder'),
];

describe('dayOfYearTehran', () => {
  it('is 1 on 1 January (Tehran)', () => {
    assert.equal(dayOfYearTehran(new Date('2026-01-01T09:00:00.000Z')), 1);
  });

  it('rolls over at Tehran midnight, not UTC midnight', () => {
    // 20:15 UTC is 23:45 Tehran — still the same Tehran day…
    const before = dayOfYearTehran(new Date('2026-03-10T20:15:00.000Z'));
    // …while 20:45 UTC is 00:15 Tehran the next day.
    const after = dayOfYearTehran(new Date('2026-03-10T20:45:00.000Z'));
    assert.equal(after, before + 1);
  });
});

describe('filterByAudience', () => {
  it('gives a builder the shared and builder tips only', () => {
    const slugs = filterByAudience(POOL, 'builder').map((t) => t.slug);
    assert.deepEqual(slugs, ['a-builder', 'b-all', 'c-all', 'e-builder']);
  });

  it('gives a domain expert the shared and domain tips only', () => {
    const slugs = filterByAudience(POOL, 'domain_expert').map((t) => t.slug);
    assert.deepEqual(slugs, ['b-all', 'c-all', 'd-domain']);
  });

  it('gives a hybrid everything', () => {
    assert.equal(filterByAudience(POOL, 'hybrid').length, POOL.length);
  });

  it('sorts by slug so DB row order can never change what today shows', () => {
    const shuffled = [...POOL].reverse();
    assert.deepEqual(
      filterByAudience(shuffled, 'builder').map((t) => t.slug),
      filterByAudience(POOL, 'builder').map((t) => t.slug),
    );
  });
});

describe('pickTipsForDay — determinism', () => {
  const day = new Date('2026-08-30T09:00:00.000Z');

  it('returns the same tips for the same day and audience', () => {
    const a = pickTipsForDay(POOL, 'builder', day);
    const b = pickTipsForDay(POOL, 'builder', day);
    assert.deepEqual(a, b);
  });

  it('is stable across different times WITHIN the same Tehran day', () => {
    const morning = pickTipsForDay(POOL, 'builder', new Date('2026-08-30T06:00:00.000Z'));
    const evening = pickTipsForDay(POOL, 'builder', new Date('2026-08-30T19:00:00.000Z'));
    assert.deepEqual(morning, evening);
  });

  it('does not depend on the order the pool arrives in', () => {
    const fromShuffled = pickTipsForDay([...POOL].reverse(), 'builder', day);
    assert.deepEqual(fromShuffled, pickTipsForDay(POOL, 'builder', day));
  });

  it('changes on the next day', () => {
    const today = pickTipsForDay(POOL, 'builder', day);
    const tomorrow = pickTipsForDay(POOL, 'builder', new Date('2026-08-31T09:00:00.000Z'));
    assert.notDeepEqual(today, tomorrow);
  });

  it('gives two different tips, the second being the "next tip"', () => {
    const picked = pickTipsForDay(POOL, 'builder', day);
    assert.equal(picked.length, 2);
    assert.notEqual(picked[0].slug, picked[1].slug);
  });

  it('shows every member of the same role the same tip today', () => {
    // The whole point of determinism: it is a shared talking point.
    const memberA = pickTipsForDay(POOL, 'builder', day);
    const memberB = pickTipsForDay(POOL, 'builder', day);
    assert.equal(memberA[0].slug, memberB[0].slug);
  });

  it('never shows a builder a domain-expert tip', () => {
    for (let d = 0; d < 40; d++) {
      const day = new Date(2026, 0, 1 + d, 12);
      for (const t of pickTipsForDay(POOL, 'builder', day)) {
        assert.notEqual(t.audience, 'domain_expert');
      }
    }
  });

  it('wraps around the end of the pool instead of returning a short list', () => {
    // Force the start index onto the final element.
    const two = [tip('x'), tip('y')];
    for (let d = 0; d < 10; d++) {
      const picked = pickTipsForDay(two, 'builder', new Date(2026, 0, 1 + d, 12));
      assert.equal(picked.length, 2, 'always a full pair while the pool allows it');
    }
  });

  it('returns an empty list for an empty pool, so the block renders nothing', () => {
    assert.deepEqual(pickTipsForDay([], 'builder', day), []);
  });

  it('returns a single tip when only one is available to that audience', () => {
    assert.equal(pickTipsForDay([tip('only-de', 'domain_expert')], 'builder', day).length, 0);
    assert.equal(pickTipsForDay([tip('only-all')], 'builder', day).length, 1);
  });
});
