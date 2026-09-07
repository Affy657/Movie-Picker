using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Tmdb;

public sealed class StubTmdbMovieSearch : ITmdbMovieSearch
{
    private const int ShowcaseItemsPerPage = 20;

    private static readonly int[] SciFiAdventureGenreIds = [878, 12];
    private static readonly int[] DramaGenreIds = [18];

    public Task<IReadOnlyList<TmdbSearchItem>> SearchAsync(string query, bool allowSeries, IReadOnlyList<int>? genreIds = null, int? yearFrom = null, int? yearTo = null, double? voteMin = null, string? originalLanguage = null, int? runtimeMin = null, int? runtimeMax = null, CancellationToken ct = default)
    {
        IReadOnlyList<TmdbSearchItem> list =
            string.IsNullOrWhiteSpace(query)
                ? Array.Empty<TmdbSearchItem>()
                : new[]
                {
                    new TmdbSearchItem(999_001, MovieMediaType.Movie, "Film E2E Stub", "2024", null, 8.1, GenreIds: SciFiAdventureGenreIds),
                    new TmdbSearchItem(999_002, MovieMediaType.Movie, "Autre film test", "2023", null, 7.0, GenreIds: DramaGenreIds),
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
    private static readonly string[] Genres = new[] { "Science-fiction", "Drame" };
    private static readonly int[] GenreIds = new[] { 878, 18 };

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
            Genres,
            GenreIds,
            "2024-01-01",
            null);
        return Task.FromResult<TmdbMovieDetails?>(details);
    }

    public Task<IReadOnlyList<TmdbSearchItem>> GetTrendingMoviesAsync(int pages, CancellationToken ct = default) =>
        Task.FromResult(BuildSection(700_000, "Tendance stub", pages));

    public Task<IReadOnlyList<TmdbSearchItem>> GetNowPlayingMoviesAsync(string region, int pages, CancellationToken ct = default) =>
        Task.FromResult(BuildSection(710_000, "En salles stub", pages));

    public Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(TmdbDiscoveryCriteria criteria, int pages, CancellationToken ct = default)
    {
        var firstGenre = criteria.GenreIds is { Count: > 0 } ? criteria.GenreIds[0] : 0;
        return Task.FromResult(BuildSection(720_000 + (firstGenre * 1_000), "Sélection stub", pages, firstGenre));
    }

    public Task<TmdbCollectionSummary?> GetCollectionAsync(int collectionId, CancellationToken ct = default) =>
        Task.FromResult<TmdbCollectionSummary?>(
            new TmdbCollectionSummary(collectionId, $"Saga stub {collectionId}", "Collection générée par le stub TMDB.", null, 4));

    public Task<IReadOnlyList<TmdbSearchItem>> GetRecommendationsAsync(int tmdbId, CancellationToken ct = default) =>
        Task.FromResult(BuildSection(740_000 + tmdbId, $"Recommandation stub {tmdbId}", 1, itemCount: 6));

    public Task<IReadOnlyList<TmdbSearchItem>> GetCollectionMoviesAsync(int collectionId, CancellationToken ct = default) =>
        Task.FromResult(BuildSection(730_000 + collectionId, $"Saga stub {collectionId}", 1, itemCount: 4));

    private static IReadOnlyList<TmdbSearchItem> BuildSection(
        int idBase,
        string titlePrefix,
        int pages,
        int genreId = 0,
        int? itemCount = null)
    {
        var count = itemCount ?? (Math.Clamp(pages, 1, 10) * ShowcaseItemsPerPage);
        var genreIds = genreId > 0 ? new[] { genreId } : SciFiAdventureGenreIds;
        var items = new List<TmdbSearchItem>(count);
        for (var index = 0; index < count; index++)
        {
            items.Add(new TmdbSearchItem(
                idBase + index,
                MovieMediaType.Movie,
                $"{titlePrefix} {index + 1}",
                (2026 - (index % 12)).ToString(System.Globalization.CultureInfo.InvariantCulture),
                null,
                Math.Round(9.0 - (index % 30) * 0.1, 1),
                GenreIds: genreIds));
        }
        return items;
    }
}
