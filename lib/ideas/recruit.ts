export type RecruitOverlap = {
  userId: string;
  name: string;
  username: string | null;
  skills: number;
  domains: number;
};

/** People who share a skill or a domain with the idea's team, strongest overlap first. */
export function rankRecruitSuggestions(rows: RecruitOverlap[], limit = 8): RecruitOverlap[] {
  return rows
    .filter((row) => row.username && row.skills + row.domains > 0)
    .sort((a, b) => b.skills + b.domains - (a.skills + a.domains) || a.name.localeCompare(b.name, 'fa'))
    .slice(0, limit);
}
