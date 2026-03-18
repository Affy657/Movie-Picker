namespace MoviePicker.Api.Application.Ports;

public sealed record TmdbSearchItem(int Id, string Title, string Year, string? PosterPath);

public interface ITmdbMovieSearch
{
    Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, CancellationToken ct = default);
}
