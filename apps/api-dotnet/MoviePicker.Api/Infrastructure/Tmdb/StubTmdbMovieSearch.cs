using MoviePicker.Api.Application.Ports;

namespace MoviePicker.Api.Infrastructure.Tmdb;

/// <summary>
/// TMDB factice pour E2E / CI (variable d’environnement E2E_STUB_TMDB=1).
/// </summary>
public sealed class StubTmdbMovieSearch : ITmdbMovieSearch
{
    public Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, CancellationToken ct = default)
    {
        IReadOnlyList<TmdbSearchItem> list =
            string.IsNullOrWhiteSpace(query)
                ? Array.Empty<TmdbSearchItem>()
                : new[]
                {
                    new TmdbSearchItem(999_001, "Film E2E Stub", "2024", null),
                    new TmdbSearchItem(999_002, "Autre film test", "2023", null),
                };
        return Task.FromResult(list);
    }
}
