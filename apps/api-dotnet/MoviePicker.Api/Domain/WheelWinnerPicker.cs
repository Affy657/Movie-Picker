using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class WheelWinnerPicker
{
    public static Movie Pick(
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
    }
}
