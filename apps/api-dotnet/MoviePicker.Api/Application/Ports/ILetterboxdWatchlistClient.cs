namespace MoviePicker.Api.Application.Ports;

public sealed record LetterboxdFilm(string Slug, string Title, string Year);

public sealed record LetterboxdWatchlistSnapshot(
    IReadOnlyList<LetterboxdFilm> Films,
    bool IsComplete,
    int? AnnouncedTotal = null)
{
    public int Total => Math.Max(AnnouncedTotal ?? 0, Films.Count);

    public bool IsTruncated => IsComplete && Total > Films.Count;

    public static LetterboxdWatchlistSnapshot Failed() => new([], false);

    public static LetterboxdWatchlistSnapshot Truncated(IReadOnlyList<LetterboxdFilm> films, int announcedTotal) =>
        new(films, true, announcedTotal);
}

public interface ILetterboxdWatchlistClient
{
    Task<LetterboxdWatchlistSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default);
}
