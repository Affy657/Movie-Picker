using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieShowcase;

public sealed class GetMovieCollectionsHandler : IGetMovieCollectionsHandler
{
    private const string CacheKey = "showcase-collections-v1";

    private readonly ITmdbMovieSearch _tmdb;
    private readonly IMemoryCache _cache;
    private readonly MoviePickerOptions _options;

    public GetMovieCollectionsHandler(
        ITmdbMovieSearch tmdb,
        IMemoryCache cache,
        IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _cache = cache;
        _options = options.Value;
    }

    public async Task<MovieCollectionListResponse> HandleAsync(CancellationToken ct = default)
    {
        if (_cache.TryGetValue(CacheKey, out object? boxed)
            && boxed is IReadOnlyList<MovieCollectionResponse> cached)
            return Build(cached);

        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new ServiceUnavailableException("Sélections de films temporairement indisponibles");

        var ids = MovieShowcaseCatalog.CollectionIds;
        var summaries = new TmdbCollectionSummary?[ids.Count];
        await Parallel.ForEachAsync(
            Enumerable.Range(0, ids.Count),
            new ParallelOptions
            {
                MaxDegreeOfParallelism = MovieShowcaseCatalog.CollectionFetchParallelism,
                CancellationToken = ct,
            },
            async (index, token) =>
            {
                summaries[index] = await TryGetCollectionAsync(ids[index], token);
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
            })
            .ToList();

        if (items.Count == 0)
            throw new ServiceUnavailableException("Sélections de films temporairement indisponibles");

        var ttl = TimeSpan.FromHours(Math.Clamp(_options.MovieShowcaseCacheHours, 1, 168));
        _cache.Set(CacheKey, (IReadOnlyList<MovieCollectionResponse>)items,
            new MemoryCacheEntryOptions { AbsoluteExpirationRelativeToNow = ttl });

        return Build(items);
    }

    private async Task<TmdbCollectionSummary?> TryGetCollectionAsync(int id, CancellationToken ct)
    {
        try
        {
            return await _tmdb.GetCollectionAsync(id, ct);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException && !ct.IsCancellationRequested)
        {
            return null;
        }
    }

    private static MovieCollectionListResponse Build(IReadOnlyList<MovieCollectionResponse> items) => new()
    {
        Items = items,
        Disclaimer = TmdbIndicativeCopy.Disclaimer,
    };
}
