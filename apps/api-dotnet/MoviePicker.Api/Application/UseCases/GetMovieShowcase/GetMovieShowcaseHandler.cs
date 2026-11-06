using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public sealed class GetMovieShowcaseHandler : IGetMovieShowcaseHandler
{
    private readonly ITmdbMovieSearch _tmdb;
    private readonly IMovieRepository _movies;
    private readonly SharedCacheReadThrough _cache;
    private readonly MoviePickerOptions _options;

    public GetMovieShowcaseHandler(
        ITmdbMovieSearch tmdb,
        IMovieRepository movies,
        SharedCacheReadThrough cache,
        IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _movies = movies;
        _cache = cache;
        _options = options.Value;
    }

    public async Task<MovieShowcaseListResponse> HandleAsync(
        MovieShowcaseQuery query,
        CancellationToken ct = default)
    {
        var section = SectionRequest.From(query);

        try
        {
            var items = await _cache.GetOrLoadCheckedAsync(
                section.CacheKey,
                CacheTtl(),
                token => LoadSectionAsync(section, token),
                section.IsSharedAcrossInstances,
                ct);

            return BuildResponse(section, items);
        }
        catch (TimeoutException)
        {
            throw Errors.ShowcaseUnavailable();
        }
    }

    public async Task<bool> RefreshAsync(MovieShowcaseQuery query, CancellationToken ct = default)
    {
        try
        {
            var section = SectionRequest.From(query);
            if (!section.IsSharedAcrossInstances)
                return false;

            return await _cache.RefreshAsync(
                section.CacheKey,
                CacheTtl(),
                token => LoadSectionAsync(section, token),
                ct);
        }
        catch (MoviePickerException)
        {
            return false;
        }
    }

    private async Task<CacheLoad<IReadOnlyList<MovieShowcaseItemResponse>>> LoadSectionAsync(
        SectionRequest section,
        CancellationToken ct)
    {
        if (section.Section == MovieShowcaseSections.MostProposed)
            return new CacheLoad<IReadOnlyList<MovieShowcaseItemResponse>>(await LoadMostProposedAsync(ct), IsComplete: true);

        RequireTmdbConfigured();

        try
        {
            var rows = await FetchTmdbSectionAsync(section, ct);
            return await WithRuntimesAsync(rows.Select(MapItem).ToList(), ct);
        }
        catch (HttpRequestException)
        {
            throw Errors.ShowcaseUnavailable();
        }
    }

    private Task<IReadOnlyList<TmdbSearchItem>> FetchTmdbSectionAsync(SectionRequest section, CancellationToken ct)
    {
        switch (section.Section)
        {
            case MovieShowcaseSections.Provider:
                var providerCriteria = MovieShowcaseCatalog.CriteriaForProvider(
                    section.Provider,
                    _options.TmdbWatchProvidersRegion)
                    ?? throw Errors.UnknownPlatform();
                return _tmdb.DiscoverMoviesAsync(
                    providerCriteria,
                    MovieShowcaseCatalog.PagesPerSection,
                    ct);

            case MovieShowcaseSections.Recommendations:
                return _tmdb.GetRecommendationsAsync(section.SeedTmdbId ?? 0, section.SeedMediaType, ct);

            case MovieShowcaseSections.NowPlaying:
                return _tmdb.GetNowPlayingMoviesAsync(
                    _options.TmdbWatchProvidersRegion,
                    MovieShowcaseCatalog.PagesPerSection,
                    ct);

            case MovieShowcaseSections.Collection:
                return _tmdb.GetCollectionMoviesAsync(section.CollectionId ?? 0, ct);

            case MovieShowcaseSections.Theme:
                var criteria = MovieShowcaseCatalog.CriteriaForTheme(section.Theme)
                    ?? throw Errors.UnknownTheme();
                return _tmdb.DiscoverMoviesAsync(criteria, MovieShowcaseCatalog.PagesPerSection, ct);

            default:
                if (section.GenreIds.Count == 0)
                    return _tmdb.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, ct);
                return _tmdb.DiscoverMoviesAsync(
                    new TmdbDiscoveryCriteria(GenreIds: section.GenreIds),
                    MovieShowcaseCatalog.PagesPerSection,
                    ct);
        }
    }

    private async Task<IReadOnlyList<MovieShowcaseItemResponse>> LoadMostProposedAsync(CancellationToken ct)
    {
        var ranking = await _movies.ListMostProposedAsync(
            MovieShowcaseCatalog.MostProposedMinEventCount,
            MovieShowcaseCatalog.MostProposedLimit,
            ct);

        if (ranking.Count < MovieShowcaseCatalog.MostProposedMinDistinctMovies)
            return [];

        return ranking
            .Select((row, index) => new MovieShowcaseItemResponse
            {
                Id = row.TmdbId,
                MediaType = row.MediaType,
                Title = row.Title,
                Year = row.Year,
                PosterPath = row.PosterPath,
                GenreIds = row.GenreIds,
                Rank = index + 1,
                EventCount = row.EventCount,
            })
            .ToList();
    }

    private async Task<CacheLoad<IReadOnlyList<MovieShowcaseItemResponse>>> WithRuntimesAsync(
        List<MovieShowcaseItemResponse> items,
        CancellationToken ct)
    {
        var count = Math.Clamp(_options.MovieShowcaseEnrichedCount, 0, 60);
        if (count == 0 || items.Count == 0)
            return new CacheLoad<IReadOnlyList<MovieShowcaseItemResponse>>(items, IsComplete: true);

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var parallelism = Math.Clamp(_options.TmdbListEnrichmentMaxParallelism, 1, 16);
        var head = items.Take(count).ToList();
        var runtimes = new ConcurrentDictionary<(int, MovieMediaType), int?>();
        var missing = 0;

        await Parallel.ForEachAsync(
            head.Select(item => (item.Id, item.MediaType)).Distinct(),
            new ParallelOptions { MaxDegreeOfParallelism = parallelism, CancellationToken = ct },
            async (pair, token) =>
            {
                var enrichment = await _tmdb.GetEnrichmentAsync(pair.Id, pair.MediaType, region, token);
                if (enrichment is null)
                    Interlocked.Increment(ref missing);
                else if (enrichment.RuntimeMinutes is int runtime)
                    runtimes[pair] = runtime;
            });

        var isComplete = missing == 0;
        if (runtimes.IsEmpty)
            return new CacheLoad<IReadOnlyList<MovieShowcaseItemResponse>>(items, isComplete);

        var withRuntimes = items
            .Select(item => runtimes.TryGetValue((item.Id, item.MediaType), out var runtime)
                ? new MovieShowcaseItemResponse
                {
                    Id = item.Id,
                    MediaType = item.MediaType,
                    Title = item.Title,
                    Year = item.Year,
                    PosterPath = item.PosterPath,
                    VoteAverage = item.VoteAverage,
                    RuntimeMinutes = runtime,
                    GenreIds = item.GenreIds,
                    Rank = item.Rank,
                    EventCount = item.EventCount,
                }
                : item)
            .ToList();
        return new CacheLoad<IReadOnlyList<MovieShowcaseItemResponse>>(withRuntimes, isComplete);
    }

    private void RequireTmdbConfigured()
    {
        if (!_options.HasTmdbCredentials)
            throw Errors.ShowcaseUnavailable();
    }

    private TimeSpan CacheTtl() =>
        TimeSpan.FromHours(Math.Clamp(_options.MovieShowcaseCacheHours, 1, 168));

    private static MovieShowcaseItemResponse MapItem(TmdbSearchItem row) => new()
    {
        Id = row.Id,
        MediaType = row.MediaType,
        Title = row.Title,
        Year = row.Year,
        PosterPath = row.PosterPath,
        VoteAverage = row.VoteAverage,
        GenreIds = row.GenreIds ?? [],
    };

    private static MovieShowcaseListResponse BuildResponse(
        SectionRequest section,
        IReadOnlyList<MovieShowcaseItemResponse> items) => new()
        {
            Section = section.Section,
            Theme = section.Theme,
            Items = items,
            Disclaimer = TmdbIndicativeCopy.Disclaimer,
        };

    private sealed record SectionRequest(
        string Section,
        string? Theme = null,
        IReadOnlyList<int>? Genres = null,
        int? CollectionId = null,
        string? Provider = null,
        int? SeedTmdbId = null,
        MovieMediaType SeedMediaType = MovieMediaType.Movie)
    {
        public IReadOnlyList<int> GenreIds => Genres ?? [];

        public bool IsSharedAcrossInstances => Section switch
        {
            MovieShowcaseSections.Recommendations or MovieShowcaseSections.Collection => false,
            MovieShowcaseSections.Trending => GenreIds.Count <= 1,
            _ => true,
        };

        public string CacheKey =>
            $"showcase-v1:{Section}:{Theme ?? "-"}:{(GenreIds.Count == 0 ? "-" : string.Join(",", GenreIds))}"
            + $":{CollectionId?.ToString() ?? "-"}:{Provider ?? "-"}:{SeedKey}";

        private string SeedKey => SeedTmdbId switch
        {
            int id when SeedMediaType == MovieMediaType.Tv => $"tv-{id}",
            int id => $"{id}",
            _ => "-",
        };

        public static SectionRequest From(MovieShowcaseQuery query)
        {
            var section = (query.Section ?? string.Empty).Trim().ToLowerInvariant();
            return section switch
            {
                MovieShowcaseSections.Trending => new SectionRequest(section, Genres: KnownGenreIds(query.GenreIds)),
                MovieShowcaseSections.NowPlaying or MovieShowcaseSections.MostProposed => new SectionRequest(section),
                MovieShowcaseSections.Theme => new SectionRequest(
                    section,
                    Theme: MovieShowcaseCatalog.ThemeKey(query.Theme) ?? throw Errors.UnknownTheme()),
                MovieShowcaseSections.Provider => new SectionRequest(
                    section,
                    Provider: MovieShowcaseCatalog.ProviderKey(query.Provider) ?? throw Errors.UnknownPlatform()),
                MovieShowcaseSections.Collection => new SectionRequest(
                    section,
                    CollectionId: KnownCollectionId(query.CollectionId)),
                MovieShowcaseSections.Recommendations => new SectionRequest(
                    section,
                    SeedTmdbId: query.SeedTmdbId is > 0 and <= MovieShowcaseCatalog.MaxSeedTmdbId
                        ? query.SeedTmdbId
                        : throw Errors.ReferenceMovieMissing(),
                    SeedMediaType: query.SeedMediaType == MovieMediaType.Tv ? MovieMediaType.Tv : MovieMediaType.Movie),
                _ => throw Errors.UnknownSection(),
            };
        }

        private static int KnownCollectionId(int? collectionId)
        {
            if (collectionId is not > 0)
                throw Errors.CollectionIdMissing();
            return MovieShowcaseCatalog.IsCatalogCollection(collectionId.Value)
                ? collectionId.Value
                : throw Errors.UnknownCollection();
        }

        private static List<int> KnownGenreIds(IReadOnlyList<int>? genreIds)
        {
            List<int> ids = genreIds is null ? [] : genreIds.Where(id => id > 0).Distinct().Order().ToList();
            return ids.TrueForAll(MovieShowcaseCatalog.IsTmdbMovieGenre) ? ids : throw Errors.UnknownGenre();
        }
    }
}
