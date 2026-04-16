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
                    new TmdbSearchItem(999_001, "Film E2E Stub", "2024", null, 8.1),
                    new TmdbSearchItem(999_002, "Autre film test", "2023", null, 7.0),
                };
        return Task.FromResult(list);
    }

    public Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, string region, CancellationToken ct = default)
    {
        var offers = new[]
        {
            new TmdbWatchProviderOffer(8, "Netflix Stub", null, "flatrate"),
        };
        return Task.FromResult<TmdbMovieEnrichment?>(new TmdbMovieEnrichment(8.0, offers, null, 120));
    }

    public Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, CancellationToken ct = default)
    {
        var details = new TmdbMovieDetails(
            tmdbId,
            "Film E2E Stub",
            "Synopsis généré par le stub TMDB pour les tests E2E.",
            "Tagline test",
            "Réalisateur Stub",
            new[] { "Actrice Stub", "Acteur Stub" },
            120,
            new[] { "Science-fiction", "Drame" },
            "2024-01-01");
        return Task.FromResult<TmdbMovieDetails?>(details);
    }
}
