import { ORBIT_STAGES, ORBIT_STAGE_LABEL, type OrbitStage } from '@/lib/ideas/orbit';
import { toFaDigits } from '@/lib/format';

/** The eight Orbit stages. The current one is filled; earlier ones stay readable. */
export function OrbitTrack({ stage }: { stage: OrbitStage }) {
  const current = ORBIT_STAGES.indexOf(stage);
  return (
    <ol className="flex flex-wrap gap-2">
      {ORBIT_STAGES.map((item, index) => {
        const state = index === current ? 'current' : index < current ? 'done' : 'ahead';
        const className =
          state === 'current'
            ? 'bg-action text-on-action'
            : state === 'done'
              ? 'bg-info-subtle text-info'
              : 'bg-fg/5 text-text-muted';
        return (
          <li key={item} className={`rounded-full px-2.5 py-1 text-micro ${className}`}>
            {toFaDigits(index + 1)} {ORBIT_STAGE_LABEL[item]}
          </li>
        );
      })}
    </ol>
  );
}
