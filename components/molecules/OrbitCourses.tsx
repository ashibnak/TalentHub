import { openOrbitCourseAction } from '@/lib/actions/orbit-team';
import { ORBIT_COURSES } from '@/lib/ideas/courses';
import { btnSecondary } from '@/lib/ui';

/** Seven Campus courses. Opening records the key, then leaves for the lesson site. */
export function OrbitCourses({
  ideaId,
  opened,
  available,
}: {
  ideaId: string;
  opened: string[];
  available: Set<string>;
}) {
  const openedSet = new Set(opened);
  return (
    <section className="mt-6 rounded-xl border border-border-subtle bg-surface p-6 shadow-sm">
      <h2 className="text-body-sm text-text-tertiary mb-1">دوره‌های پیشنهادی</h2>
      <p className="mb-4 text-body-sm text-text-muted">ویدیوها سر جای خودشان می‌مانند. با باز کردن هر دوره، برای خودت علامت می‌گذاری که سراغش رفته‌ای.</p>
      <ul className="flex flex-col gap-3">
        {ORBIT_COURSES.map((course) => (
          <li key={course.key} className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-body text-fg">
              {course.title}
              {openedSet.has(course.key) && <span className="mr-2 text-body-sm text-success">باز کردی</span>}
            </span>
            {available.has(course.lessonSlug) ? (
              <form action={openOrbitCourseAction}>
                <input type="hidden" name="ideaId" value={ideaId} />
                <input type="hidden" name="courseKey" value={course.key} />
                <button type="submit" className={btnSecondary}>
                  مشاهده‌ی دوره
                </button>
              </form>
            ) : (
              <span className="text-body-sm text-text-muted">لینک این دوره هنوز آماده نیست</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
