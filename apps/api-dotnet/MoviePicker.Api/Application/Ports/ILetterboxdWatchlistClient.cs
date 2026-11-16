namespace MoviePicker.Api.Application.Ports;

public sealed record LetterboxdFilm(string Slug, string Title, string Year, int? Rating = null, DateOnly? WatchedOn = null);

public sealed record LetterboxdFilmsSnapshot(
    IReadOnlyList<LetterboxdFilm> Films,
    bool IsComplete,
    int? AnnouncedTotal = null,
    bool HasCounter = true)
{
    public int Total => Math.Max(AnnouncedTotal ?? 0, Films.Count);

    public bool IsTruncated => IsComplete && Total > Films.Count;

    public bool ConfirmsDepartures => IsComplete && HasCounter && !IsTruncated;

    public static LetterboxdFilmsSnapshot Failed() => new([], false);

    public static LetterboxdFilmsSnapshot EmptyWithoutCounter() => new([], true, HasCounter: false);

    public static LetterboxdFilmsSnapshot Truncated(IReadOnlyList<LetterboxdFilm> films, int announcedTotal) =>
        new(films, true, announcedTotal);
}

public interface ILetterboxdWatchlistClient
{
    Task<LetterboxdFilmsSnapshot> GetWatchlistAsync(string username, CancellationToken ct = default);

    Task<LetterboxdFilmsSnapshot> GetWatchedFilmsAsync(string username, CancellationToken ct = default);
}
