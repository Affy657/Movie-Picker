namespace MoviePicker.Api.Application.Ports;

public sealed record LetterboxdDiaryEntry(int? TmdbId, string FilmTitle, string FilmYear);

public interface ILetterboxdRssClient
{
    Task<IReadOnlyList<LetterboxdDiaryEntry>> GetRecentDiaryAsync(string username, CancellationToken ct = default);
}
