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

    public Task<IReadOnlyList<TmdbSearchItem>> SearchTitlesAsync(
        string query,
        bool allowSeries,
        int? yearFrom = null,
        int? yearTo = null,
        CancellationToken ct = default) =>
        SearchAsync(query, allowSeries, ct: ct);

    private static TmdbMovieEnrichment StubEnrichment()
    {
        var offers = new[]
        {
            new TmdbWatchProviderOffer(8, "Netflix Stub", null, "flatrate"),
        };
        return new TmdbMovieEnrichment(8.0, offers, null, 120);
    }

    public Task<TmdbMovieEnrichment?> GetEnrichmentAsync(int tmdbId, MovieMediaType mediaType, string region, CancellationToken ct = default)
        => Task.FromResult<TmdbMovieEnrichment?>(StubEnrichment());

    public Task<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>> GetEnrichmentsAsync(
        IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)> keys,
        string region,
        CancellationToken ct = default)
        => Task.FromResult<IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>>(
            keys.Distinct().ToDictionary(key => key, _ => (TmdbMovieEnrichment?)StubEnrichment()));

    private static readonly string[] Cast = new[] { "Actrice Stub", "Acteur Stub" };
    private static readonly string[] Genres = new[] { "Science-fiction", "Drame" };
    private static readonly int[] GenreIds = new[] { 878, 18 };

    private const int StubDirectorId = 4_242;
    private const int StubCollectionId = 1_241;
    private static readonly string[] FilmCountries = ["US", "FR"];
    private static readonly string[] SeriesCountries = ["US"];

    private static readonly TmdbCastMember[] CastMembers =
    [
        new("Actrice Stub", "Héroïne Stub", null),
        new("Acteur Stub", null, null),
    ];

    private static TmdbMovieDetailsExtras StubExtras(MovieMediaType mediaType) =>
        mediaType == MovieMediaType.Tv
            ? new TmdbMovieDetailsExtras(
                "Stub E2E Series",
                "en",
                SeriesCountries,
                null,
                640,
                "12",
                null,
                null,
                CastMembers,
                [new TmdbCrewCredit(TmdbCrewJobs.Creator, "Réalisateur Stub"), new TmdbCrewCredit(TmdbCrewJobs.Composer, "Compositeur Stub")],
                [])
            : new TmdbMovieDetailsExtras(
                "Stub E2E Film",
                "en",
                FilmCountries,
                42_000_000,
                1_280,
                "12",
                new TmdbCollectionReference(StubCollectionId, $"Saga stub {StubCollectionId}"),
                StubDirectorId,
                CastMembers,
                [
                    new TmdbCrewCredit(TmdbCrewJobs.Director, "Réalisateur Stub"),
                    new TmdbCrewCredit(TmdbCrewJobs.Writer, "Scénariste Stub"),
                    new TmdbCrewCredit(TmdbCrewJobs.Composer, "Compositeur Stub"),
                    new TmdbCrewCredit(TmdbCrewJobs.Photography, "Chef opérateur Stub"),
                ],
                []);

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
            null,
            7.3,
            null,
            null,
            mediaType == MovieMediaType.Tv ? 2 : null,
            mediaType == MovieMediaType.Tv ? 16 : null,
            StubExtras(mediaType));
        return Task.FromResult<TmdbMovieDetails?>(details);
    }

    public Task<IReadOnlyList<TmdbSearchItem>> GetTrendingMoviesAsync(int pages, CancellationToken ct = default) =>
        Section(700_000, "Tendance stub", pages);

    public Task<IReadOnlyList<TmdbSearchItem>> GetNowPlayingMoviesAsync(string region, int pages, CancellationToken ct = default) =>
        Section(710_000, "En salles stub", pages);

    public Task<IReadOnlyList<TmdbSearchItem>> DiscoverMoviesAsync(TmdbDiscoveryCriteria criteria, int pages, CancellationToken ct = default)
    {
        var firstGenre = criteria.GenreIds is { Count: > 0 } ? criteria.GenreIds[0] : 0;
        return Section(720_000 + (firstGenre * 1_000), "Sélection stub", pages, firstGenre);
    }

    public Task<TmdbCollectionSummary?> GetCollectionAsync(int collectionId, CancellationToken ct = default) =>
        Task.FromResult<TmdbCollectionSummary?>(
            new TmdbCollectionSummary(collectionId, $"Saga stub {collectionId}", "Collection générée par le stub TMDB.", null, 4, []));

    public Task<IReadOnlyList<TmdbSearchItem>> GetRecommendationsAsync(
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct = default) =>
        Section(740_000 + tmdbId, $"Recommandation stub {tmdbId}", 1, itemCount: 6);

    public Task<IReadOnlyList<TmdbSearchItem>> GetCollectionMoviesAsync(int collectionId, CancellationToken ct = default) =>
        Section(730_000 + collectionId, $"Saga stub {collectionId}", 1, itemCount: 4);

    public Task<IReadOnlyList<TmdbSearchItem>> GetDirectedMoviesAsync(int personId, CancellationToken ct = default) =>
        Section(750_000 + personId, $"Réalisation stub {personId}", 1, itemCount: 5);

    private static Task<IReadOnlyList<TmdbSearchItem>> Section(
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
        return Task.FromResult<IReadOnlyList<TmdbSearchItem>>(items);
    }
}
