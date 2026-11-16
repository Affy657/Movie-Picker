/**
 * The verdict of one Lighthouse category on one page, and the choice of the pages one run
 * measures, kept apart from `lighthouse-run.mjs`, which builds and measures as soon as it is
 * imported. Tested by `scripts/lighthouse-budget.test.mjs`.
 */
export function median(values) {
  return [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
}

export function reviewCategory(lhrs, category, { min, ignoreThreshold = false }) {
  const scores = lhrs
    .map((lhr) => lhr.categories[category])
    .filter((entry) => entry && typeof entry.score === 'number')
    .map((entry) => Math.round(entry.score * 100));
  if (scores.length === 0) return { score: null, failure: `no score in ${lhrs.length} run(s)` };
  const score = median(scores);
  if (!ignoreThreshold && score < min) return { score, failure: `${score} < ${min}` };
  return { score, failure: null };
}

/**
 * `only` narrows the run to some slugs (`LH_ONLY`, comma-separated). `shard` (`LH_SHARD`, read as
 * `<index>/<count>`, the index starting at 1) keeps every count-th page, so that `deploy.yml`
 * measures the pages on several runners at once: a page added to the list lands in a shard by
 * itself, no workflow list to keep in step.
 */
export function selectPages(pages, { only = '', shard = '' } = {}) {
  const slugs = only
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const chosen = slugs.length > 0 ? pages.filter((page) => slugs.includes(page.slug)) : pages;
  if (shard.trim() === '') return chosen;
  const match = /^(\d+)\/(\d+)$/.exec(shard.trim());
  const index = match ? Number(match[1]) : 0;
  const count = match ? Number(match[2]) : 0;
  if (count < 1 || index < 1 || index > count) {
    throw new Error(`LH_SHARD must read <index>/<count> with 1 <= index <= count, got "${shard}"`);
  }
  return chosen.filter((_, position) => position % count === index - 1);
}
