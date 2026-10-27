import type { GarageDesignMaterial, GarageDesignTemplate } from "@/lib/garage-design-templates";

type RowRun = { profile: GarageDesignMaterial[]; sourceRows: number; weight: number };

function allocateSections(weights: number[], total: number): number[] {
  const sum = weights.reduce((value, weight) => value + weight, 0);
  const targets = weights.map(weight => total * weight / sum);
  const counts = targets.map(target => Math.max(1, Math.floor(target)));
  let allocated = counts.reduce((value, count) => value + count, 0);
  while (allocated !== total) {
    const add = allocated < total;
    let selected = -1;
    let best = -Infinity;
    counts.forEach((count, index) => {
      if (!add && count <= 1) return;
      const priority = add ? targets[index] - count : count - targets[index];
      if (priority > best) { selected = index; best = priority; }
    });
    if (selected < 0) break;
    counts[selected] += add ? 1 : -1;
    allocated += add ? 1 : -1;
  }
  return counts;
}

/** Adapt a catalog's material arrangement to the door's physical sections. */
export function garageSectionLayout(template: GarageDesignTemplate | null, sectionCount?: number) {
  if (sectionCount === undefined) return template ?? {
    version: 1 as const,
    columns: [1],
    rows: [0.2, 0.2, 0.2, 0.2, 0.2],
    cells: Array.from({ length: 5 }, () => ["glass" as const]),
  };

  const rows = Array.from({ length: sectionCount }, () => 1 / sectionCount);
  if (!template) return {
    version: 1 as const, columns: [1], rows,
    cells: rows.map(() => ["glass" as const]),
  };

  const runs: RowRun[] = [];
  template.cells.forEach((profile, index) => {
    const previous = runs.at(-1);
    if (previous && profile.every((material, column) => material === previous.profile[column])) {
      previous.sourceRows += 1;
      previous.weight += template.rows[index];
    } else {
      runs.push({ profile: [...profile], sourceRows: 1, weight: template.rows[index] });
    }
  });

  let profiles: GarageDesignMaterial[][];
  if (sectionCount < runs.length) {
    // When there are fewer physical sections than material bands, sample the
    // stored proportions without adding nonphysical horizontal divisions.
    profiles = rows.map((_, index) => {
      const position = (index + 0.5) / sectionCount;
      let boundary = 0;
      return [...(runs.find(run => { boundary += run.weight; return position < boundary; }) ?? runs[runs.length - 1]).profile];
    });
  } else {
    const hasRepeatingRows = runs.some(run => run.sourceRows > 1);
    // A single top/bottom band stays one section when the other material is
    // repeated. This preserves a top-glass layout at every supported height
    // without recognizing design names or storing a second pattern catalog.
    const fixed = runs.map(run => hasRepeatingRows && run.sourceRows === 1);
    const flexible = runs.map((run, index) => ({ ...run, index })).filter(run => !fixed[run.index]);
    const available = sectionCount - fixed.filter(Boolean).length;
    const allocated = allocateSections(flexible.map(run => run.weight), available);
    let flexIndex = 0;
    profiles = runs.flatMap((run, index) => Array.from({ length: fixed[index] ? 1 : allocated[flexIndex++] }, () => [...run.profile]));
  }
  return { version: 1 as const, columns: [...template.columns], rows, cells: profiles };
}
