// src/lib/rimworldWork.ts
import { ColonistDetailed, Skill as SkillType, Trait } from '../types';

// Keep this mapping centralized so UI + logic agree.
// Keys are your workType *ids* (lowercase) from WORK_TYPES in WorkTab.
export const WORKTYPE_TO_SKILLS: Record<string, string[]> = {
  // combat/utility: choose to leave empty if you don't want skill-driven priority here
  firefighter: [],      // (often not skill-based)
  patient: [],

  doctor: ['Medicine'],
  construction: ['Construction'],
  mining: ['Mining'],
  growing: ['Plants', 'Growing'],
  cooking: ['Cooking'],
  research: ['Intellectual'],
  warden: ['Social'],
  handling: ['Animals'],
  crafting: ['Crafting'],
  art: ['Artistic'],
  smithing: ['Crafting'],
  tailoring: ['Crafting'],
  hauling: [],
  cleaning: [],
};

export type Assignment = {
  colonist: ColonistDetailed['colonist'];
  priority: number;
  skills: ColonistDetailed['colonist_work_info']['skills'];
  detailed?: ColonistDetailed;
};

export type WorkTypeLite = { id: string; name: string; icon: string, category: string };

export function getRelevantSkillNamesForWorkType(workTypeId: string): string[] {
  return WORKTYPE_TO_SKILLS[workTypeId] || [];
}

export function bestRelevantLevel(
  skills: SkillType[] | undefined,
  relevant: string[]
): number {
  if (!skills || relevant.length === 0) return -1;
  let best = -1;
  for (const r of relevant) {
    const s = skills.find(k => k.name === r || (k as any).skill === r);
    if (s) best = Math.max(best, s.level);
  }
  return best;
}

// Priority policy: 0–4 relative to colony average.
// Tweak bands here and all callers benefit.
export function priorityFromLevelRelativeToAvg(level: number, avg: number): number {
  if (level <= 0) return 0;                 // disabled/missing
  if (level <= 2) return 0;                 // disabled/missing
  if (level >= avg + 4) return 1;           // great at it
  if (level >= avg + 1) return 2;           // above average
  if (level >= Math.max(1, avg - 2)) return 3; // around average
  return 4;                                  // below average, still enabled
}

// Sort helper (least qualified first) for consistent display
export function sortAssignmentsBySkill(list: Assignment[], workTypeId: string): Assignment[] {
  const names = getRelevantSkillNamesForWorkType(workTypeId);
  if (!names.length) return [...list];
  return [...list].sort((a, b) => {
    const la = bestRelevantLevel(a.skills, names);
    const lb = bestRelevantLevel(b.skills, names);
    const va = la < 0 ? -1 : la;
    const vb = lb < 0 ? -1 : lb;
    return va - vb;
  });
}

// Placeholder for future rules: convert Trait objects into labels that *affect* a work type.
// Keep it here so UI can just call one place.
export function getAffectingTraits(
  workTypeId: string,
  traits: Trait[] | undefined
): string[] {
  // TODO: Use traits.disabled_work_tags and a tag→workType map.
  return (traits ?? [])
    .filter(() => false)
    .map(t => t.label || t.name);
}

/**
 * Compute optimized priorities (0–4) for every colonist for a given work type.
 * Returns a map colonistId -> newPriority and the colony average used.
 */
export function computeRelativePrioritiesForWork(
  colonists: ColonistDetailed[],
  workTypeId: string
): { avg: number; priorities: Map<number, number> } {
  const relevant = getRelevantSkillNamesForWorkType(workTypeId);
  if (!relevant.length) return { avg: 0, priorities: new Map() };

  const levels = colonists.map(cd => ({
    id: cd.colonist.id,
    level: bestRelevantLevel(cd.colonist_work_info?.skills, relevant),
  }));

  const valid = levels.filter(x => x.level >= 0);
  if (valid.length === 0) return { avg: 0, priorities: new Map() };

  const avg = valid.reduce((s, x) => s + x.level, 0) / valid.length;

  const priorities = new Map<number, number>();
  for (const { id, level } of levels) {
    priorities.set(id, priorityFromLevelRelativeToAvg(level, avg));
  }

  return { avg, priorities };
}

/**
 * Optimize all work types at once relative to colony averages.
 * - Decides a 0–4 priority for every colonist & every work type with skills.
 * - Calls the provided setter (API) only when a change is needed.
 * - Returns a fully rebuilt assignments map for the UI + total change count.
 */
export async function optimizeAllWorkTypes({
  colonistsDetailed,
  assignments,
  workTypes,
  getCurrentPriorityFor,
  setPriority,
  setWorkPrioritiesBulk,
  fetchWorkList, // <-- Pass the new function to fetch work list
}: {
  colonistsDetailed: ColonistDetailed[];
  assignments: Record<string, Assignment[]>;
  workTypes: WorkTypeLite[];
  getCurrentPriorityFor: (workTypeId: string, colonistId: number) => number;
  setPriority: (colonistId: number, workName: string, priority: number) => Promise<void>;
  setWorkPrioritiesBulk: (workPriorities: { id: number; work: string; priority: number }[]) => Promise<void>;
  fetchWorkList: () => Promise<string[]>; // <-- New function to fetch work list
}): Promise<{ nextAssignments: Record<string, Assignment[]>; changes: number }> {
  let changes = 0;
  const next: Record<string, Assignment[]> = { ...assignments };

  // Fetch the full list of available work types
  const allWorkTypes = await fetchWorkList();

  const bulkWorkPriorities: { id: number; work: string; priority: number }[] = [];

  for (const wt of workTypes) {
    const relevant = getRelevantSkillNamesForWorkType(wt.id);
    if (!relevant.length) continue;

    const { priorities } = computeRelativePrioritiesForWork(colonistsDetailed, wt.id);

    const updated: Assignment[] = [];
    for (const cd of colonistsDetailed) {
      const newPriority = priorities.get(cd.colonist.id) ?? 0;
      const current = getCurrentPriorityFor(wt.id, cd.colonist.id);

      if (current !== newPriority) {
        // Add to bulk list
        bulkWorkPriorities.push({
          id: cd.colonist.id,
          work: wt.name,
          priority: newPriority,
        });

        changes++;
      }

      if (newPriority > 0) {
        updated.push({
          colonist: cd.colonist,
          priority: newPriority,
          skills: cd.colonist_work_info.skills,
          detailed: cd,
        });
      }
    }

    next[wt.id] = sortAssignmentsBySkill(updated, wt.id);
  }

  // Now, ensure that any work type the colonist has skills for is included,
  // even if they aren't currently assigned.
  for (const cd of colonistsDetailed) {
    const { skills } = cd.colonist_work_info;

    // Find work types the colonist has skills for
    const potentialWorkTypes = allWorkTypes.filter(workType => {
      const relevantSkills = WORKTYPE_TO_SKILLS[workType.toLowerCase()] || [];
      const bestSkillLevel = bestRelevantLevel(skills, relevantSkills);
      return bestSkillLevel > 0; // Only consider if the colonist has a relevant skill
    });

    // For each of these work types, check if they are assigned or not
    for (const workType of potentialWorkTypes) {
      const currentPriority = getCurrentPriorityFor(workType, cd.colonist.id);
      if (currentPriority === 0) {
        // If priority is currently 0 (not assigned), set a new priority
        const newPriority = priorityFromLevelRelativeToAvg(bestRelevantLevel(skills, WORKTYPE_TO_SKILLS[workType.toLowerCase()] || []), 0); // use a default avg of 0
        if (newPriority > 0) {
          bulkWorkPriorities.push({
            id: cd.colonist.id,
            work: workType,
            priority: newPriority,
          });
          changes++;
        }
      }
    }
  }

  // After collecting all changes, send them in one batch
  if (bulkWorkPriorities.length > 0) {
    await setWorkPrioritiesBulk(bulkWorkPriorities);
  }

  return { nextAssignments: next, changes };
}
