using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Domain;

public static class WheelWinnerPicker
{
    /// <summary>Tirage parmi les films (≥2). Un seul film : retour immédiat.</summary>
    public static Movie Pick(
        IReadOnlyList<Movie> movies,
        Func<string, int> getNetVoteScore,
        WheelMode mode,
        Random random)
    {
        if (movies.Count == 0)
            throw new InvalidOperationException("Liste de films vide.");
        if (movies.Count == 1)
            return movies[0];

        if (mode == WheelMode.StrictRandom)
            return movies[random.Next(movies.Count)];

        var weights = new int[movies.Count];
        for (var i = 0; i < movies.Count; i++)
        {
            var net = getNetVoteScore(movies[i].Id);
            weights[i] = Math.Max(1, 1 + net);
        }

        var total = 0;
        foreach (var w in weights)
            total += w;

        var r = random.Next(total);
        var acc = 0;
        for (var i = 0; i < movies.Count; i++)
        {
            acc += weights[i];
            if (r < acc)
                return movies[i];
        }

        return movies[^1];
    }
}
