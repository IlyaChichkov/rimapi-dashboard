// src/lib/rimworldWork.ts
import { ColonistDetailed, Skill as SkillType, Trait } from '../types';
import { rimworldApi } from './rimworldApi';

/** Normalize any work id/name to a stable key (lowercase, alnum only). */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');

/**
 * Central mapping (use normalized keys).
 * Include every work name the backend can return (see /work-list).
 */
const RAW_WORK_SKILLS: Record<string, string[]> = {
  // basics / utility
  [norm('Firefighter')]: [],
  [norm('Patient')]: [],
  [norm('PatientBedRest')]: [],
  [norm('BasicWorker')]: [],
  [norm('Childcare')]: [],
  [norm('DarkStudy')]: [],
  [norm('Hauling')]: [],
  [norm('Cleaning')]: [],

  // skill-driven
  [norm('Doctor')]: ['Medicine'],
  [norm('Construction')]: ['Construction'],
  [norm('Mining')]: ['Mining'],
  [norm('Growing')]: ['Plants', 'Growing'],
  [norm('PlantCutting')]: ['Plants'],
  [norm('Cooking')]: ['Cooking'],
  [norm('Research')]: ['Intellectual'],
  [norm('Warden')]: ['Social'],
  [norm('Handling')]: ['Animals'],
  [norm('Crafting')]: ['Crafting'],
  [norm('Art')]: ['Artistic'],
  [norm('Smithing')]: ['Crafting'],
  [norm('Tailoring')]: ['Crafting'],
  [norm('Hunting')]: ['Shooting', 'Melee'],
};

// Export for UI code that previously imported this name
export const WORKTYPE_TO_SKILLS: Record<string, string[]> = RAW_WORK_SKILLS;

export type Assignment = {
  colonist: ColonistDetailed['colonist'];
  priority: number;
  skills: ColonistDetailed['colonist_work_info']['skills'];
  detailed?: ColonistDetailed;
};

export type WorkTypeLite = { id: string; name: string; icon: string; category: string };

/** Which works are basic (no passion requirement for P1). */
const BASIC_WORKS = new Set([
  'firefighter',
  'patient',
  'patientbedrest',
  'basicworker',
  'childcare',
  'darkstudy',
  // hauling/cleaning feel “basic”, but we let the scoring handle them
]);

// Policy / knobs
const MIN_LEVEL = 6;          // skip below this
const PASSION_BONUS = 0.6;    // scoring boost for non-basic P1 contention
const BUSYNESS_PENALTY = 0.5; // scoring malus as colonist accumulates jobs
const MAX_PRIMARY = 1;
const MAX_SECONDARY = 3;
const MAX_TOTAL = 6;

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const stdev = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(mean(a.map(v => (v - m) ** 2)));
};

export function getRelevantSkillNamesForWorkType(workTypeIdOrName: string): string[] {
  const k = norm(workTypeIdOrName);
  return RAW_WORK_SKILLS[k] ?? [];
}

export function bestRelevantLevel(
  skills: SkillType[] | undefined,
  relevant: string[]
): number {
  if (!skills || !relevant.length) return -1;
  let best = -1;
  for (const r of relevant) {
    const s = skills.find(k => k.name === r || (k as any).skill === r);
    if (s) best = Math.max(best, s.level);
  }
  return best;
}

function bestRelevantSkill(skills: SkillType[] | undefined, relevant: string[]): SkillType | null {
  if (!skills || !relevant.length) return null;
  let best: SkillType | null = null;
  for (const s of skills) {
    if (!relevant.includes(s.name)) continue;
    if (!best || s.level > best.level) best = s;
  }
  return best;
}

/** Sort least qualified first for visual emphasis. */
export function sortAssignmentsBySkill(list: Assignment[], workTypeIdOrName: string): Assignment[] {
  const names = getRelevantSkillNamesForWorkType(workTypeIdOrName);
  if (!names.length) return [...list];
  return [...list].sort((a, b) => {
    const la = bestRelevantLevel(a.skills, names);
    const lb = bestRelevantLevel(b.skills, names);
    return (la < 0 ? -1 : la) - (lb < 0 ? -1 : lb);
  });
}

export function getAffectingTraits(_workTypeIdOrName: string, traits: Trait[] | undefined): string[] {
  // Hook for disabled tags when available
  return (traits ?? []).filter(() => false).map(t => t.label || t.name);
}

const getCurrentPriorityFor = (
  assignments: Record<string, Assignment[]>,
  workTypeId: string,
  colonistId: number
) => (assignments[workTypeId] || []).find(a => a.colonist.id === colonistId)?.priority ?? 0;

const workIdToName = (id: string, workTypes: WorkTypeLite[]) =>
  workTypes.find(w => norm(w.id) === norm(id))?.name ?? id;

const workNameToId = (name: string, workTypes: WorkTypeLite[]) =>
  workTypes.find(w => norm(w.name) === norm(name))?.id ?? null;

function isSkillDisabled(s?: SkillType | null): boolean {
  if (!s) return false;
  const any = s as any;
  return Boolean(any.totally_disabled || any.permanently_disabled || (any.disabled_work_tags ?? 0) > 0);
}

function normalizedBusy(nonBasicAssignedCount: number): number {
  return Math.min(nonBasicAssignedCount / MAX_TOTAL, 1);
}

function tryAssignAndBumpCaps(
  maps: { p1: Map<number, number>; p2p3: Map<number, number>; total: Map<number, number> },
  colonistId: number,
  priority: 1 | 2 | 3 | 4,
  isBasic: boolean
): boolean {
  if (isBasic) {
    const t = maps.total.get(colonistId) || 0;
    if (t >= MAX_TOTAL) return false;
    maps.total.set(colonistId, t + 1);
    return true;
  }
  const total = maps.total.get(colonistId) || 0;
  if (total >= MAX_TOTAL) return false;

  if (priority === 1) {
    const p1 = maps.p1.get(colonistId) || 0;
    if (p1 >= MAX_PRIMARY) return false;
    maps.p1.set(colonistId, p1 + 1);
    maps.total.set(colonistId, total + 1);
    return true;
  }
  const sec = maps.p2p3.get(colonistId) || 0;
  if (sec >= MAX_SECONDARY) return false;
  maps.p2p3.set(colonistId, sec + 1);
  maps.total.set(colonistId, total + 1);
  return true;
}

function desiredCountsForWork(colonistCount: number) {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const p1 = clamp(Math.round(colonistCount / 8), 1, 3);
  const p2 = clamp(Math.round(colonistCount / 6), 1, 4);
  const p3 = clamp(Math.round(colonistCount / 5), 1, 5);
  return { p1, p2, p3 };
}

// ───────────────────────────────────────────────────────────────────────────────
// OPTIMIZER
// ───────────────────────────────────────────────────────────────────────────────

export async function optimizeAllWorkTypes({
  colonistsDetailed,
  assignments,
  workTypes,
}: {
  colonistsDetailed: ColonistDetailed[];
  assignments: Record<string, Assignment[]>;
  workTypes: WorkTypeLite[];
}): Promise<{ nextAssignments: Record<string, Assignment[]>; changes: number }> {
  const next: Record<string, Assignment[]> = {};
  let changes = 0;

  const canonicalNames = await rimworldApi.fetchWorkList()

  // Precompute current non-basic load from existing assignments (for busyness penalty)
  const nonBasicLoad = new Map<number, number>();
  for (const [workId, list] of Object.entries(assignments)) {
    const name = workIdToName(workId, workTypes);
    if (BASIC_WORKS.has(norm(name))) continue;
    for (const a of list) {
      if (a.priority >= 1 && a.priority <= 3) {
        nonBasicLoad.set(a.colonist.id, (nonBasicLoad.get(a.colonist.id) || 0) + 1);
      }
    }
  }

  const caps = { p1: new Map<number, number>(), p2p3: new Map<number, number>(), total: new Map<number, number>() };
  const bulk: { id: number; work: string; priority: number }[] = [];

  for (const wt of workTypes) {
    // Resolve relevant skills robustly (id OR name)
    const relevant =
      getRelevantSkillNamesForWorkType(wt.id).length
        ? getRelevantSkillNamesForWorkType(wt.id)
        : getRelevantSkillNamesForWorkType(wt.name);

    if (!relevant.length) {
      console.log(`[OPTIMIZE] Skip work "${wt.name}" (id="${wt.id}") – no relevant skills mapping.`);
      next[wt.id] = [];
      continue;
    }

    const isBasic = BASIC_WORKS.has(norm(wt.name));
    type Cand = {
      cd: ColonistDetailed;
      best: SkillType | null;
      level: number;
      passion: number;
      disabled: boolean;
      busy: number;
      current: number;
      z: number;
      score: number;
    };

    const raw: Cand[] = colonistsDetailed.map(cd => {
      const best = bestRelevantSkill(cd.colonist_work_info.skills, relevant);
      const lvl = best?.level ?? 0;
      const disabled = isSkillDisabled(best);
      const busy = normalizedBusy(nonBasicLoad.get(cd.colonist.id) || 0);
      const current = getCurrentPriorityFor(assignments, wt.id, cd.colonist.id);
      return {
        cd,
        best,
        level: lvl,
        passion: best?.passion ?? 0,
        disabled,
        busy,
        current,
        z: 0,
        score: -Infinity,
      };
    });

    const eligible = raw.filter(x => !x.disabled && x.level >= MIN_LEVEL);
    if (!eligible.length) {
      console.log(`[OPTIMIZE] Skip work "${wt.name}" – no eligible colonists (min level ${MIN_LEVEL} or disabled).`);
      next[wt.id] = [];
      continue;
    }

    // Score (z-score of level) + passion bonus (non-basic) − busyness
    const levels = eligible.map(e => e.level);
    const m = mean(levels), s = stdev(levels);
    for (const e of eligible) {
      const z = s === 0 ? 0 : (e.level - m) / s;
      e.z = z;
      let score = z - BUSYNESS_PENALTY * e.busy;
      if (!isBasic && e.passion > 0) score += PASSION_BONUS;
      e.score = score;
    }

    eligible.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.current !== b.current) return a.current - b.current;
      return a.cd.colonist.id - b.cd.colonist.id;
    });

    const { p1, p2, p3 } = desiredCountsForWork(colonistsDetailed.length);
    const picked = new Map<number, number>();

    // P1: for non-basic, passion required
    if (!isBasic) {
      let need = p1;
      for (const e of eligible) {
        if (need <= 0) break;
        if ((e.passion ?? 0) <= 0) continue;
        if (!tryAssignAndBumpCaps(caps, e.cd.colonist.id, 1 as const, false)) continue;
        picked.set(e.cd.colonist.id, 1);
        need--;
      }
    }

    // P2
    {
      let need = p2;
      for (const e of eligible) {
        if (need <= 0) break;
        if (picked.has(e.cd.colonist.id)) continue;
        if (!tryAssignAndBumpCaps(caps, e.cd.colonist.id, 2 as const, isBasic)) continue;
        picked.set(e.cd.colonist.id, 2);
        need--;
      }
    }

    // P3
    {
      let need = p3;
      for (const e of eligible) {
        if (need <= 0) break;
        if (picked.has(e.cd.colonist.id)) continue;
        if (!tryAssignAndBumpCaps(caps, e.cd.colonist.id, 3 as const, isBasic)) continue;
        picked.set(e.cd.colonist.id, 3);
        need--;
      }
    }

    // P4 conservative fill
    for (const e of eligible) {
      if (picked.has(e.cd.colonist.id)) continue;
      if (!tryAssignAndBumpCaps(caps, e.cd.colonist.id, 4 as const, isBasic)) continue;
      picked.set(e.cd.colonist.id, 4);
    }

    // Build UI & collect API changes
    const updated: Assignment[] = [];
for (const e of raw) { // <-- use the full list, not only `eligible`
  const desired = picked.get(e.cd.colonist.id) ?? 0; // unpicked or ineligible => 0
  const cur = e.current;

  // UI list contains only enabled assignments
  if (desired > 0) {
    updated.push({
      colonist: e.cd.colonist,
      priority: desired,
      skills: e.cd.colonist_work_info.skills,
      detailed: e.cd,
    });
  }

  // Emit change when different (this also DOWNGRADES low-skill to 0)
  if (desired !== cur) {
    bulk.push({ id: e.cd.colonist.id, work: wt.name, priority: desired });
    changes++;
    console.log(
      `[OPTIMIZE] ${wt.name} | ${e.cd.colonist.name} (#${e.cd.colonist.id}) ` +
      `best=${e.best?.name ?? 'None'} lvl=${e.level} passion=${e.passion} busy=${e.busy.toFixed(2)} z=${e.z.toFixed(2)} ` +
      `current=${cur} -> new=${desired}`
    );
  }
}

next[wt.id] = sortAssignmentsBySkill(updated, wt.id);
  }

  // Completion pass: include skilled-but-missing colonists using canonical names
  for (const name of canonicalNames) {
    const workId = workNameToId(name, workTypes);
    if (!workId) continue;
    const relevant = getRelevantSkillNamesForWorkType(name);
    if (!relevant.length) continue;

    const have = new Set<number>((next[workId] || []).map(a => a.colonist.id));
    const isBasic = BASIC_WORKS.has(norm(name));

    for (const cd of colonistsDetailed) {
      if (have.has(cd.colonist.id)) continue;
      const best = bestRelevantSkill(cd.colonist_work_info.skills, relevant);
      if (!best || best.level < MIN_LEVEL || isSkillDisabled(best)) continue;

      if (!tryAssignAndBumpCaps(caps, cd.colonist.id, 4 as const, isBasic)) continue;

      const cur = getCurrentPriorityFor(assignments, workId, cd.colonist.id);
      if (cur !== 4) {
        bulk.push({ id: cd.colonist.id, work: name, priority: 4 });
        changes++;
        console.log(
          `[OPTIMIZE+FILL] ${name} | ${cd.colonist.name} (#${cd.colonist.id}) ` +
          `best=${best.name} lvl=${best.level} passion=${best.passion} current=${cur} -> new=4`
        );
      }

      const arr = next[workId] || [];
      arr.push({
        colonist: cd.colonist,
        priority: 4,
        skills: cd.colonist_work_info.skills,
        detailed: cd,
      });
      next[workId] = sortAssignmentsBySkill(arr, workId);
      have.add(cd.colonist.id);
    }
  }

  // Deduplicate & apply bulk
  if (bulk.length) {
    const key = (x: { id: number; work: string }) => `${x.id}::${norm(x.work)}`;
    const map = new Map<string, { id: number; work: string; priority: number }>();
    for (const b of bulk) map.set(key(b), b);
    const deduped = Array.from(map.values());
    await rimworldApi.setColonistsWorkPriorities(deduped);
    console.log(`[OPTIMIZE] Applied ${deduped.length} updates (changes tracked: ${changes}).`);
  } else {
    console.log('[OPTIMIZE] No changes to apply (IDs/names mapped; rules resulted in no diffs).');
  }

  return { nextAssignments: next, changes };
}
