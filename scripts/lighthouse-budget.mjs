/**
 * The verdict of one Lighthouse category on one page, kept apart from `lighthouse-run.mjs`, which
 * builds and measures as soon as it is imported. Tested by `scripts/lighthouse-budget.test.mjs`.
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
