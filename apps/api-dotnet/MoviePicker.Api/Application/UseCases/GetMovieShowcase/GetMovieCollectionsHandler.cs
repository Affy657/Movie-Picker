using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public sealed class GetMovieCollectionsHandler : IGetMovieCollectionsHandler
{

    private readonly ITmdbMovieSearch _tmdb;
    private readonly SharedCacheReadThrough _cache;
    private readonly MoviePickerOptions _options;

    public GetMovieCollectionsHandler(
        ITmdbMovieSearch tmdb,
        SharedCacheReadThrough cache,
        IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _cache = cache;
        _options = options.Value;
    }

    public async Task<MovieCollectionListResponse> HandleAsync(CatalogLanguage language, CancellationToken ct = default)
    {
        try
        {
            var items = await _cache.GetOrLoadCheckedAsync(
                CacheKeyFor(language),
                CacheTtl(),
                token => LoadCollectionsAsync(language, token),
                ct: ct);
            return Build(items);
        }
        catch (TimeoutException)
        {
            throw Errors.ShowcaseUnavailable();
        }
    }

    public async Task<bool> RefreshAsync(CatalogLanguage language, CancellationToken ct = default)
    {
        try
        {
            return await _cache.RefreshAsync(
                CacheKeyFor(language),
                CacheTtl(),
                token => LoadCollectionsAsync(language, token),
                ct);
        }
        catch (MoviePickerException)
        {
            return false;
        }
    }

    private static string CacheKeyFor(CatalogLanguage language) => $"showcase-collections-v4:{language.TmdbCode()}";

    private TimeSpan CacheTtl() => TimeSpan.FromHours(Math.Clamp(_options.MovieShowcaseCacheHours, 1, 168));

    private async Task<CacheLoad<IReadOnlyList<MovieCollectionResponse>>> LoadCollectionsAsync(
        CatalogLanguage language,
        CancellationToken ct)
    {
        if (!_options.HasTmdbCredentials)
            throw Errors.ShowcaseUnavailable();

        var ids = MovieShowcaseCatalog.CollectionIds;
        var summaries = new TmdbCollectionSummary?[ids.Count];
        var failures = 0;
        await Parallel.ForEachAsync(
            Enumerable.Range(0, ids.Count),
            new ParallelOptions
            {
                MaxDegreeOfParallelism = MovieShowcaseCatalog.CollectionFetchParallelism,
                CancellationToken = ct,
            },
            async (index, token) =>
            {
                var (summary, failed) = await TryGetCollectionAsync(ids[index], language, token);
                summaries[index] = summary;
                if (failed)
                    Interlocked.Increment(ref failures);
            });

        var items = summaries
            .OfType<TmdbCollectionSummary>()
            .Select(summary => new MovieCollectionResponse
            {
                Id = summary.Id,
                Name = summary.Name,
                Overview = summary.Overview,
                PosterPath = summary.PosterPath,
                MovieCount = summary.MovieCount,
                PreviewPosterPaths = summary.PartPosterPaths.Take(MovieShowcaseCatalog.PreviewPosterCount).ToList(),
                MovieIds = summary.PartIds,
            })
            .ToList();

        if (items.Count == 0)
            throw Errors.ShowcaseUnavailable();

        return new CacheLoad<IReadOnlyList<MovieCollectionResponse>>(items, IsComplete: failures == 0);
    }

    private async Task<(TmdbCollectionSummary? Summary, bool Failed)> TryGetCollectionAsync(
        int id,
        CatalogLanguage language,
        CancellationToken ct)
    {
        try
        {
            return (await _tmdb.GetCollectionAsync(id, language, ct), false);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return (null, true);
        }
    }

    private static MovieCollectionListResponse Build(IReadOnlyList<MovieCollectionResponse> items) => new()
    {
        Items = items,
        Disclaimer = TmdbIndicativeCopy.Disclaimer,
    };
}
