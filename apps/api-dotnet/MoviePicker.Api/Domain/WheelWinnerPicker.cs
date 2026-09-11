using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class WheelWinnerPicker
{
    public static Movie Pick(
        IReadOnlyList<Movie> movies,
        Func<string, int> getNetVoteScore,
        WheelMode mode,
        Random random,
        IReadOnlyCollection<string>? excludedMovieIds = null)
    {
        if (movies.Count == 0)
            throw new InvalidOperationException("Liste de films vide.");

        var eligible = movies.Where(m => !m.ExcludedFromWheel).ToList();
        if (eligible.Count == 0)
            throw new InvalidOperationException("Tous les films sont exclus du tirage.");

        var pool = RemoveAlreadyPicked(eligible, excludedMovieIds);
        if (pool.Count == 0)
            throw new InvalidOperationException("Tous les films éligibles ont déjà été tirés.");

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

    private static List<Movie> RemoveAlreadyPicked(
        List<Movie> eligible,
        IReadOnlyCollection<string>? excludedMovieIds)
    {
        if (excludedMovieIds is null || excludedMovieIds.Count == 0)
            return eligible;

        var excluded = excludedMovieIds
            .Where(id => !string.IsNullOrWhiteSpace(id))
            .ToHashSet(StringComparer.Ordinal);

        return excluded.Count == 0
            ? eligible
            : eligible.Where(m => !excluded.Contains(m.Id)).ToList();
    }
}
