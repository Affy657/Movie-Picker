// Généré par apps/web/scripts/generate-tech-metrics.mjs — ne pas éditer à la main.

export const TECH_METRICS = {
  linesOfCode: 122000,
  endpoints: 69,
  testFiles: 329,
  webTestFiles: 156,
  apiTestFiles: 173,
  e2eScenarios: 5,
  ciJobs: 15,
  commits: 882,
  controllers: 13,
  ports: 27,
  useCases: 63,
  doubledRepositories: 14,
  sharedComponents: 27,
  features: 7,
  a11yViews: 20,
  migrations: 3,
  architectureScriptLines: 260,
  coverageLines: 82,
  coverageFunctions: 76,
  coverageBranches: 74,
} as const;

export const TECH_METRICS_BUILD_DATE = '2026-09-06';

export const TECH_WHEEL_SNIPPET = `public static Movie Pick(
    IReadOnlyList<Movie> movies,
    Func<string, int> getNetVoteScore,
    WheelMode mode,
    Random random,
    string? excludedMovieId = null)
{
    if (movies.Count == 0)
        throw new InvalidOperationException("Liste de films vide.");

    var eligible = movies.Where(m => !m.ExcludedFromWheel).ToList();
    if (eligible.Count == 0)
        throw new InvalidOperationException("Tous les films sont exclus du tirage.");
    if (eligible.Count == 1)
        return eligible[0];

    List<Movie> pool = eligible;
    if (!string.IsNullOrEmpty(excludedMovieId))
    {
        var filtered = eligible.Where(m => !string.Equals(m.Id, excludedMovieId, StringComparison.Ordinal)).ToList();
        if (filtered.Count > 0)
            pool = filtered;
    }

    if (pool.Count == 1)
        return pool[0];

    if (mode == WheelMode.StrictRandom)
        return pool[random.Next(pool.Count)];

    var weights = new int[pool.Count];
    for (var i = 0; i < pool.Count; i++)
    {
        var net = getNetVoteScore(pool[i].Id);
        weights[i] = Math.Max(1, 1 + net);
    }

    var total = 0;
    foreach (var w in weights)
        total += w;

    var r = random.Next(total);
    var acc = 0;
    for (var i = 0; i < pool.Count; i++)
    {
        acc += weights[i];
        if (r < acc)
            return pool[i];
    }

    return pool[^1];
}`;
