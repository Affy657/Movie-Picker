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
        var section = (query.Section ?? string.Empty).Trim().ToLowerInvariant();
        if (!MovieShowcaseSections.IsKnown(section))
            throw Errors.UnknownSection();

        var genreIds = NormalizeGenreIds(query.GenreIds);
        var theme = string.IsNullOrWhiteSpace(query.Theme) ? null : query.Theme.Trim();
        var provider = string.IsNullOrWhiteSpace(query.Provider) ? null : query.Provider.Trim();
        RejectInvalidQuery(section, theme, provider, query);
        var cacheKey = BuildCacheKey(section, theme, genreIds, query.CollectionId, provider, query.SeedTmdbId);

        var items = await _cache.GetOrLoadAsync(
            cacheKey,
            CacheTtl(),
            token => LoadSectionAsync(section, theme, genreIds, query, provider, token),
            IsCatalogSection(section, genreIds),
            ct);

        return BuildResponse(section, theme, items);
    }

    private void RejectInvalidQuery(string section, string? theme, string? provider, MovieShowcaseQuery query)
    {
        switch (section)
        {
            case MovieShowcaseSections.Provider
                when MovieShowcaseCatalog.CriteriaForProvider(provider, _options.TmdbWatchProvidersRegion) is null:
                throw Errors.UnknownPlatform();
            case MovieShowcaseSections.Recommendations when query.SeedTmdbId is not > 0:
                throw Errors.ReferenceMovieMissing();
            case MovieShowcaseSections.Collection when query.CollectionId is not > 0:
                throw Errors.CollectionIdMissing();
            case MovieShowcaseSections.Theme when MovieShowcaseCatalog.CriteriaForTheme(theme) is null:
                throw Errors.UnknownTheme();
        }
    }

    private static bool IsCatalogSection(string section, List<int> genreIds) =>
        section is not (MovieShowcaseSections.Recommendations or MovieShowcaseSections.Collection)
        && genreIds.Count <= 1;

    private async Task<IReadOnlyList<MovieShowcaseItemResponse>> LoadSectionAsync(
        string section,
        string? theme,
        IReadOnlyList<int> genreIds,
        MovieShowcaseQuery query,
        string? provider,
        CancellationToken ct)
    {
        if (section == MovieShowcaseSections.MostProposed)
            return await LoadMostProposedAsync(ct);

        RequireTmdbConfigured();

        try
        {
            var rows = await FetchTmdbSectionAsync(section, theme, genreIds, query, provider, ct);
            return await WithRuntimesAsync(rows.Select(MapItem).ToList(), ct);
        }
        catch (HttpRequestException)
        {
            throw Errors.ShowcaseUnavailable();
        }
    }

    private Task<IReadOnlyList<TmdbSearchItem>> FetchTmdbSectionAsync(
        string section,
        string? theme,
        IReadOnlyList<int> genreIds,
        MovieShowcaseQuery query,
        string? provider,
        CancellationToken ct)
    {
        switch (section)
        {
            case MovieShowcaseSections.Provider:
                var providerCriteria = MovieShowcaseCatalog.CriteriaForProvider(
                    provider,
                    _options.TmdbWatchProvidersRegion)
                    ?? throw Errors.UnknownPlatform();
                return _tmdb.DiscoverMoviesAsync(
                    providerCriteria,
                    MovieShowcaseCatalog.PagesPerSection,
                    ct);

            case MovieShowcaseSections.Recommendations:
                if (query.SeedTmdbId is not > 0)
                    throw Errors.ReferenceMovieMissing();
                return _tmdb.GetRecommendationsAsync(query.SeedTmdbId.Value, ct);

            case MovieShowcaseSections.NowPlaying:
                return _tmdb.GetNowPlayingMoviesAsync(
                    _options.TmdbWatchProvidersRegion,
                    MovieShowcaseCatalog.PagesPerSection,
                    ct);

            case MovieShowcaseSections.Collection:
                if (query.CollectionId is not > 0)
                    throw Errors.CollectionIdMissing();
                return _tmdb.GetCollectionMoviesAsync(query.CollectionId.Value, ct);

            case MovieShowcaseSections.Theme:
                var criteria = MovieShowcaseCatalog.CriteriaForTheme(theme)
                    ?? throw Errors.UnknownTheme();
                return _tmdb.DiscoverMoviesAsync(criteria, MovieShowcaseCatalog.PagesPerSection, ct);

            default:
                if (genreIds.Count == 0)
                    return _tmdb.GetTrendingMoviesAsync(MovieShowcaseCatalog.PagesPerSection, ct);
                return _tmdb.DiscoverMoviesAsync(
                    new TmdbDiscoveryCriteria(GenreIds: genreIds),
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

    private async Task<IReadOnlyList<MovieShowcaseItemResponse>> WithRuntimesAsync(
        List<MovieShowcaseItemResponse> items,
        CancellationToken ct)
    {
        var count = Math.Clamp(_options.MovieShowcaseEnrichedCount, 0, 60);
        if (count == 0 || items.Count == 0)
            return items;

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var parallelism = Math.Clamp(_options.TmdbListEnrichmentMaxParallelism, 1, 16);
        var head = items.Take(count).ToList();
        var runtimes = new ConcurrentDictionary<(int, MovieMediaType), int?>();

        await Parallel.ForEachAsync(
            head.Select(item => (item.Id, item.MediaType)).Distinct(),
            new ParallelOptions { MaxDegreeOfParallelism = parallelism, CancellationToken = ct },
            async (pair, token) =>
            {
                var enrichment = await _tmdb.GetEnrichmentAsync(pair.Id, pair.MediaType, region, token);
                if (enrichment?.RuntimeMinutes is int runtime)
                    runtimes[pair] = runtime;
            });

        if (runtimes.IsEmpty)
            return items;

        return items
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
    }

    private void RequireTmdbConfigured()
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
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
        string section,
        string? theme,
        IReadOnlyList<MovieShowcaseItemResponse> items) => new()
        {
            Section = section,
            Theme = theme,
            Items = items,
            Disclaimer = TmdbIndicativeCopy.Disclaimer,
        };

    private static List<int> NormalizeGenreIds(IReadOnlyList<int>? genreIds) =>
        genreIds is null ? [] : genreIds.Where(id => id > 0).Distinct().Order().ToList();

    private static string BuildCacheKey(
        string section,
        string? theme,
        List<int> genreIds,
        int? collectionId,
        string? provider,
        int? seedTmdbId) =>
        $"showcase-v1:{section}:{theme ?? "-"}:{(genreIds.Count == 0 ? "-" : string.Join(",", genreIds))}"
        + $":{collectionId?.ToString() ?? "-"}:{provider ?? "-"}:{seedTmdbId?.ToString() ?? "-"}";
}
