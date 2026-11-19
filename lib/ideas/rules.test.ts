import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IDEA_LIMITS,
  canDelete,
  canEdit,
  canSubmit,
  canViewIdea,
  deleteRejection,
  editRejection,
  ideaSummaryLine,
  isPubliclyVisible,
  parseIdeaForm,
  submitRejection,
  type IdeaFormValues,
  type IdeaStatus,
} from './rules.ts';

/** A submission that clears every limit — individual tests override one field. */
const VALID: IdeaFormValues = {
  title: 'کوتاه کردن زمان تأیید مرخصی',
  problemStatement: 'ب'.repeat(IDEA_LIMITS.problemStatement.min),
  proposedSolution: 'س'.repeat(IDEA_LIMITS.proposedSolution.min),
  targetUsers: 'کارشناسان منابع انسانی',
  successCriteria: 'میانگین زمان تأیید از دو روز به چهار ساعت برسد.',
  feasibilityNote: '',
  currentWorkaround: 'امروز هر درخواست از سه نفر امضا می‌گیرد و دو روز طول می‌کشد.',
  whyAgent: 'حجم درخواست تکراری است و قوانین مشخص‌اند، پس یک عامل می‌تواند بررسی کند.',
  dataNeeded: 'قوانین مرخصی و تاریخچه‌ی درخواست‌های شش ماه اخیر.',
  teamCapability: 'یک کارشناس منابع انسانی و یک توسعه‌دهنده، پنج ساعت در هفته.',
  challengeId: '',
  ipTerms: '',
};

function form(over: Partial<IdeaFormValues> = {}): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries({ ...VALID, ...over })) fd.append(k, v);
  return fd;
}

/** Longest string that still passes / shortest that still fails, per field. */
const atLength = (n: number) => 'x'.repeat(n);

describe('parseIdeaForm — happy path', () => {
  it('accepts a submission that clears every limit', () => {
    const r = parseIdeaForm(form());
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.title, VALID.title);
    assert.equal(r.data.feasibilityNote, null, 'an empty optional note normalises to null');
    assert.equal(r.data.challengeId, null);
  });

  it('trims each field before validating and storing', () => {
    const r = parseIdeaForm(form({ title: '   یک عنوان   ' }));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.title, 'یک عنوان');
  });

  it('returns the raw values so a failed submit can repopulate the form', () => {
    const r = parseIdeaForm(form({ title: '' }));
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.equal(r.values.problemStatement, VALID.problemStatement, 'nothing typed is discarded');
  });

  it('reports every failing field at once, not just the first', () => {
    const r = parseIdeaForm(form({ title: '', targetUsers: '', successCriteria: '' }));
    assert.equal(r.ok, false);
    if (r.ok) return;
    assert.deepEqual(Object.keys(r.errors).sort(), ['successCriteria', 'targetUsers', 'title']);
  });
});

describe('parseIdeaForm — field boundaries', () => {
  it('title: accepts exactly 80, rejects 81, rejects empty', () => {
    assert.equal(parseIdeaForm(form({ title: atLength(80) })).ok, true);

    const over = parseIdeaForm(form({ title: atLength(81) }));
    assert.equal(over.ok, false);
    if (!over.ok) assert.equal(over.errors.title, 'too_long');

    const empty = parseIdeaForm(form({ title: '' }));
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.errors.title, 'required');
  });

  it('problemStatement: rejects 99, accepts 100 and 600, rejects 601', () => {
    const short = parseIdeaForm(form({ problemStatement: atLength(99) }));
    assert.equal(short.ok, false);
    if (!short.ok) assert.equal(short.errors.problemStatement, 'too_short');

    assert.equal(parseIdeaForm(form({ problemStatement: atLength(100) })).ok, true);
    assert.equal(parseIdeaForm(form({ problemStatement: atLength(600) })).ok, true);

    const long = parseIdeaForm(form({ problemStatement: atLength(601) }));
    assert.equal(long.ok, false);
    if (!long.ok) assert.equal(long.errors.problemStatement, 'too_long');
  });

  it('proposedSolution: rejects 149, accepts 150 and 1500, rejects 1501', () => {
    const short = parseIdeaForm(form({ proposedSolution: atLength(149) }));
    assert.equal(short.ok, false);
    if (!short.ok) assert.equal(short.errors.proposedSolution, 'too_short');

    assert.equal(parseIdeaForm(form({ proposedSolution: atLength(150) })).ok, true);
    assert.equal(parseIdeaForm(form({ proposedSolution: atLength(1500) })).ok, true);

    const long = parseIdeaForm(form({ proposedSolution: atLength(1501) }));
    assert.equal(long.ok, false);
    if (!long.ok) assert.equal(long.errors.proposedSolution, 'too_long');
  });

  it('targetUsers: accepts exactly 200, rejects 201, rejects empty', () => {
    assert.equal(parseIdeaForm(form({ targetUsers: atLength(200) })).ok, true);

    const over = parseIdeaForm(form({ targetUsers: atLength(201) }));
    assert.equal(over.ok, false);
    if (!over.ok) assert.equal(over.errors.targetUsers, 'too_long');

    const empty = parseIdeaForm(form({ targetUsers: '   ' }));
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.errors.targetUsers, 'required');
  });

  it('successCriteria: accepts exactly 300, rejects 301, rejects empty', () => {
    assert.equal(parseIdeaForm(form({ successCriteria: atLength(300) })).ok, true);

    const over = parseIdeaForm(form({ successCriteria: atLength(301) }));
    assert.equal(over.ok, false);
    if (!over.ok) assert.equal(over.errors.successCriteria, 'too_long');

    const empty = parseIdeaForm(form({ successCriteria: '' }));
    assert.equal(empty.ok, false);
    if (!empty.ok) assert.equal(empty.errors.successCriteria, 'required');
  });

  it('feasibilityNote: optional, accepts exactly 500, rejects 501', () => {
    assert.equal(parseIdeaForm(form({ feasibilityNote: '' })).ok, true, 'omitting it is fine');
    assert.equal(parseIdeaForm(form({ feasibilityNote: atLength(500) })).ok, true);

    const over = parseIdeaForm(form({ feasibilityNote: atLength(501) }));
    assert.equal(over.ok, false);
    if (!over.ok) assert.equal(over.errors.feasibilityNote, 'too_long');
  });

  it('keeps a provided feasibilityNote rather than nulling it', () => {
    const r = parseIdeaForm(form({ feasibilityNote: 'به دسترسی خواندنی نیاز دارد.' }));
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.feasibilityNote, 'به دسترسی خواندنی نیاز دارد.');
  });

  it('challengeId: passes a uuid through and rejects a malformed one', () => {
    const uuid = '11111111-2222-4333-8444-555555555555';
    const ok = parseIdeaForm(form({ challengeId: uuid }));
    assert.equal(ok.ok, true);
    if (ok.ok) assert.equal(ok.data.challengeId, uuid);

    const bad = parseIdeaForm(form({ challengeId: 'not-a-uuid' }));
    assert.equal(bad.ok, false);
    if (!bad.ok) assert.equal(bad.errors.challengeId, 'invalid');
  });

  it('keeps feasibilityNote optional and requires the four Orbit signal answers', () => {
    const original = parseIdeaForm(
      form({ title: '', problemStatement: '', proposedSolution: '', targetUsers: '', successCriteria: '', feasibilityNote: '' }),
    );
    assert.equal(original.ok, false);
    if (!original.ok) {
      assert.equal(Object.keys(original.errors).length, 5);
      assert.equal(original.errors.feasibilityNote, undefined);
    }

    const signal = parseIdeaForm(form({ currentWorkaround: '', whyAgent: '', dataNeeded: '', teamCapability: '' }));
    assert.equal(signal.ok, false);
    if (!signal.ok) assert.equal(Object.keys(signal.errors).length, 4);
  });
});

describe('submitRejection', () => {
  const owner = 'user-1';

  it('allows the owner to submit a draft', () => {
    assert.equal(submitRejection({ currentUserId: owner, idea: { userId: owner, status: 'draft' } }), null);
  });

  it('refuses submitting from any status other than draft', () => {
    for (const status of ['submitted', 'needs_work', 'approved', 'rejected'] as IdeaStatus[]) {
      assert.equal(
        submitRejection({ currentUserId: owner, idea: { userId: owner, status } }),
        'not_draft',
        `${status} must not be submittable`,
      );
    }
  });

  it('refuses a non-owner even when the idea is a draft', () => {
    assert.equal(
      submitRejection({ currentUserId: 'someone-else', idea: { userId: owner, status: 'draft' } }),
      'not_owner',
    );
  });

  it('reports a missing idea', () => {
    assert.equal(submitRejection({ currentUserId: owner, idea: null }), 'not_found');
  });
});

describe('editRejection', () => {
  const owner = 'user-1';

  it('allows the owner to edit a draft', () => {
    assert.equal(editRejection({ currentUserId: owner, idea: { userId: owner, status: 'draft' } }), null);
  });

  it('refuses a non-owner', () => {
    assert.equal(
      editRejection({ currentUserId: 'someone-else', idea: { userId: owner, status: 'draft' } }),
      'not_owner',
    );
  });

  it('keeps editing OPEN while the idea is still under review', () => {
    for (const status of ['submitted', 'needs_work'] as IdeaStatus[]) {
      assert.equal(
        editRejection({ currentUserId: owner, idea: { userId: owner, status } }),
        null,
        `${status} must stay editable — needs_work exists so the author can fix it`,
      );
    }
  });

  it('locks editing only once a final decision has been made', () => {
    for (const status of ['approved', 'rejected'] as IdeaStatus[]) {
      assert.equal(editRejection({ currentUserId: owner, idea: { userId: owner, status } }), 'locked');
    }
  });

  it('checks ownership before status, so a stranger never learns the status', () => {
    assert.equal(
      editRejection({ currentUserId: 'someone-else', idea: { userId: owner, status: 'approved' } }),
      'not_owner',
    );
  });
});

describe('directory visibility', () => {
  it('shows approved ideas only', () => {
    assert.equal(isPubliclyVisible('approved'), true);
    for (const status of ['draft', 'submitted', 'needs_work', 'rejected'] as IdeaStatus[]) {
      assert.equal(isPubliclyVisible(status), false, `${status} must not appear publicly`);
    }
  });

  it('lets anyone open an approved idea', () => {
    assert.equal(canViewIdea('approved', 'user-1', null), true);
    assert.equal(canViewIdea('approved', 'user-1', 'user-2'), true);
  });

  it('lets the author open their own unapproved idea', () => {
    assert.equal(canViewIdea('draft', 'user-1', 'user-1'), true);
    assert.equal(canViewIdea('rejected', 'user-1', 'user-1'), true);
  });

  it('hides an unapproved idea from everyone else, signed in or not', () => {
    assert.equal(canViewIdea('submitted', 'user-1', 'user-2'), false);
    assert.equal(canViewIdea('draft', 'user-1', null), false);
  });
});

describe('ideaSummaryLine', () => {
  it('takes the first line of the problem statement', () => {
    assert.equal(ideaSummaryLine('خط اول\nخط دوم'), 'خط اول');
  });

  it('handles CRLF and surrounding whitespace', () => {
    assert.equal(ideaSummaryLine('  خط اول  \r\nخط دوم'), 'خط اول');
  });

  it('returns the whole string when there is no line break', () => {
    assert.equal(ideaSummaryLine('یک خط'), 'یک خط');
  });
});

describe('deleteRejection', () => {
  const owner = 'user-1';

  it('allows the owner to delete a draft', () => {
    assert.equal(deleteRejection({ currentUserId: owner, idea: { userId: owner, status: 'draft' } }), null);
  });

  it('refuses to delete anything already submitted', () => {
    for (const status of ['submitted', 'needs_work', 'approved', 'rejected'] as IdeaStatus[]) {
      assert.equal(
        deleteRejection({ currentUserId: owner, idea: { userId: owner, status } }),
        'not_draft',
        `${status} is a reviewer's workload too — withdrawn by decision, not deleted`,
      );
    }
  });

  it('refuses a non-owner', () => {
    assert.equal(
      deleteRejection({ currentUserId: 'someone-else', idea: { userId: owner, status: 'draft' } }),
      'not_owner',
    );
  });
});

describe('boolean predicates mirror the rejection functions', () => {
  const owner = 'user-1';
  const guard = (status: IdeaStatus, viewer = owner) => ({
    currentUserId: viewer,
    idea: { userId: owner, status },
  });

  it('canEdit is true exactly when editRejection is null', () => {
    for (const status of ['draft', 'submitted', 'needs_work', 'approved', 'rejected'] as IdeaStatus[]) {
      assert.equal(canEdit(guard(status)), editRejection(guard(status)) === null);
    }
  });

  it('canSubmit is true only for the owner of a draft', () => {
    assert.equal(canSubmit(guard('draft')), true);
    assert.equal(canSubmit(guard('submitted')), false);
    assert.equal(canSubmit(guard('draft', 'someone-else')), false);
  });

  it('canDelete is true only for the owner of a draft', () => {
    assert.equal(canDelete(guard('draft')), true);
    assert.equal(canDelete(guard('needs_work')), false);
    assert.equal(canDelete(guard('draft', 'someone-else')), false);
  });
});

describe('ip_terms', () => {
  it("defaults to 'developer' when the field is absent", () => {
    const fd = new FormData();
    for (const [k, v] of Object.entries({ ...VALID })) if (k !== 'ipTerms') fd.append(k, v);
    const r = parseIdeaForm(fd);
    assert.equal(r.ok, true);
    if (!r.ok) return;
    assert.equal(r.data.ipTerms, 'developer');
  });

  it("defaults to 'developer' when the field is an empty string", () => {
    const r = parseIdeaForm(form({ ipTerms: '' }));
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.data.ipTerms, 'developer');
  });

  it('accepts each of the three declared positions', () => {
    for (const t of ['developer', 'organization', 'shared'] as const) {
      const r = parseIdeaForm(form({ ipTerms: t }));
      assert.equal(r.ok, true);
      if (r.ok) assert.equal(r.data.ipTerms, t);
    }
  });

  it("falls back to 'developer' for an unknown value rather than failing the form", () => {
    const r = parseIdeaForm(form({ ipTerms: 'whatever' }));
    assert.equal(r.ok, true, 'a bad IP value must not cost the author six fields of typing');
    if (r.ok) assert.equal(r.data.ipTerms, 'developer');
  });
});
