using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class StubTmdbMovieSearch : ITmdbMovieSearch
{
    public Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, bool allowSeries, IReadOnlyList<int>? genreIds = null, int? yearFrom = null, int? yearTo = null, double? voteMin = null, string? originalLanguage = null, CancellationToken ct = default)
    {
        IReadOnlyList<TmdbSearchItem> list =
            string.IsNullOrWhiteSpace(query)
                ? Array.Empty<TmdbSearchItem>()
                : new[]
                {
                    new TmdbSearchItem(999_001, MovieMediaType.Movie, "Film E2E Stub", "2024", null, 8.1),
                    new TmdbSearchItem(999_002, MovieMediaType.Movie, "Autre film test", "2023", null, 7.0),
                };
        return Task.FromResult(list);
    }

    public Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, MovieMediaType mediaType, string region, CancellationToken ct = default)
    {
        var offers = new[]
        {
            new TmdbWatchProviderOffer(8, "Netflix Stub", null, "flatrate"),
        };
        return Task.FromResult<TmdbMovieEnrichment?>(new TmdbMovieEnrichment(8.0, offers, null, 120));
    }

    private static readonly string[] Cast = new[] { "Actrice Stub", "Acteur Stub" };

    public Task<TmdbMovieDetails?> GetDetailsAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        var details = new TmdbMovieDetails(
            tmdbId,
            "Film E2E Stub",
            "Synopsis généré par le stub TMDB pour les tests E2E.",
            "Tagline test",
            "Réalisateur Stub",
            Cast,
            120,
            new[] { "Science-fiction", "Drame" },
            new[] { 878, 18 },
            "2024-01-01",
            null);
        return Task.FromResult<TmdbMovieDetails?>(details);
    }
}
