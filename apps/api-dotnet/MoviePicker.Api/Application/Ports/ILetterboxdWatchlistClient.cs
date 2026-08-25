namespace MoviePicker.Api.Application.Ports;

public sealed record LetterboxdFilm(string Slug, string Title, string Year);

public sealed record LetterboxdWatchlistSnapshot(IReadOnlyList<LetterboxdFilm> Films, bool IsComplete)
{
    public static LetterboxdWatchlistSnapshot Failed() => new([], false);
}

public interface ILetterboxdWatchlistClient
{
    Task<LetterboxdWatchlistSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default);
}
