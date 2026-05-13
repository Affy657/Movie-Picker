using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class WheelWinnerPicker
{
    /// <summary>
    /// Tirage parmi les films (≥2). Un seul film : retour immédiat.
    /// Si <paramref name="excludedMovieId"/> correspond à un film de la liste et qu'au moins
    /// un autre film reste éligible, ce film est exclu du tirage (ex. relance de la roue
    /// après un premier gagnant pour éviter de retomber dessus).
    /// </summary>
    public static Movie Pick(
        IReadOnlyList<Movie> movies,
        Func<string, int> getNetVoteScore,
        WheelMode mode,
        Random random,
        string? excludedMovieId = null)
    {
        if (movies.Count == 0)
            throw new InvalidOperationException("Liste de films vide.");
        if (movies.Count == 1)
            return movies[0];

        var pool = movies;
        if (!string.IsNullOrEmpty(excludedMovieId))
        {
            var filtered = movies.Where(m => !string.Equals(m.Id, excludedMovieId, StringComparison.Ordinal)).ToList();
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
