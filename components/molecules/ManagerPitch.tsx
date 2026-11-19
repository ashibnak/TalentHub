import { saveManagerPitchAction } from '@/lib/actions/orbit';
import { btnSecondary, inputClass, labelClass } from '@/lib/ui';
import { formatFaDate } from '@/lib/format';

/** Who heard the idea after it reached Next. The stage itself does not move. */
export function ManagerPitch({
  ideaId,
  at,
  audience,
  canEdit,
}: {
  ideaId: string;
  at: Date | null;
  audience: string | null;
  canEdit: boolean;
}) {
  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-body-sm text-text-tertiary mb-2">ارائه به مدیران</h2>
      {at && audience ? (
        <p className="text-body text-fg">
          {formatFaDate(at)} · {audience}
        </p>
      ) : (
        <p className="text-body-sm text-text-muted">هنوز ثبت نشده که این ایده برای چه کسانی ارائه شده است.</p>
      )}
      {canEdit && (
        <form action={saveManagerPitchAction} className="mt-4 flex flex-wrap items-end gap-3">
          <label className={labelClass}>
            زمان
            <input name="managerPitchAt" type="datetime-local" required className={`mt-1 ${inputClass}`} />
          </label>
          <label className={labelClass}>
            شنوندگان
            <input name="managerPitchTo" required minLength={2} maxLength={200} className={`mt-1 ${inputClass}`} />
          </label>
          <input type="hidden" name="ideaId" value={ideaId} />
          <button type="submit" className={btnSecondary}>
            ثبت ارائه
          </button>
        </form>
      )}
    </section>
  );
}
