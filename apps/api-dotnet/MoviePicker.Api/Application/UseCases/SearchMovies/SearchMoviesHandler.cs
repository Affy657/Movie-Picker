using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public sealed class SearchMoviesHandler : ISearchMoviesHandler
{
    private const string TmdbHomeUrl = "https://www.themoviedb.org/";

    private readonly ITmdbMovieSearch _tmdb;
    private readonly IEventRepository _events;
    private readonly MoviePickerOptions _options;

    public SearchMoviesHandler(
        ITmdbMovieSearch tmdb,
        IEventRepository events,
        IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _events = events;
        _options = options.Value;
    }

    public async Task<MovieSearchListResponse> HandleAsync(
        string query,
        string? eventSlug,
        MovieSearchFilters? filters = null,
        bool includeSeries = false,
        CancellationToken ct = default)
    {
        if (!_options.HasTmdbCredentials)
            throw Errors.SearchUnavailable();

        var allowSeries = string.IsNullOrWhiteSpace(eventSlug)
            ? includeSeries
            : await AllowsSeriesAsync(eventSlug, ct);

        IReadOnlyList<TmdbSearchItem> rows;
        try
        {
            rows = await _tmdb.SearchAsync(
                query,
                allowSeries,
                filters?.GenreIds,
                filters?.YearFrom,
                filters?.YearTo,
                filters?.VoteMin,
                filters?.OriginalLanguage,
                filters?.RuntimeMin,
                filters?.RuntimeMax,
                ct);
        }
        catch (HttpRequestException)
        {
            throw Errors.SearchUnavailable();
        }

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var maxLookups = Math.Clamp(_options.TmdbSearchMaxWatchProviderLookups, 0, 20);

        var hasTextQuery = !string.IsNullOrWhiteSpace(query);
        var hasRuntimeFilter = filters?.RuntimeMin.HasValue == true || filters?.RuntimeMax.HasValue == true;
        var runtimeFilterNeedsEnrichment = hasRuntimeFilter && hasTextQuery;
        var lookupCount = runtimeFilterNeedsEnrichment ? rows.Count : maxLookups;

        var toEnrich = rows.Take(lookupCount).Select(r => (r.Id, r.MediaType)).Distinct().ToList();
        IReadOnlyDictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?> enrichmentsByKey = toEnrich.Count > 0
            ? await _tmdb.GetEnrichmentsAsync(toEnrich, region, ct).ConfigureAwait(false)
            : new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>();

        var items = new List<MovieSearchItemResponse>(rows.Count);
        foreach (var row in rows)
        {
            IReadOnlyList<WatchProviderOfferResponse>? providers = null;
            string? watchPage = null;
            double? vote = row.VoteAverage;
            int? runtime = null;

            if (enrichmentsByKey.TryGetValue((row.Id, row.MediaType), out var enr) && enr is not null)
            {
                providers = WatchProviderMapping.ToDto(enr.WatchProviders);
                watchPage = enr.TmdbWatchPageUrl;
                vote ??= enr.VoteAverage;
                runtime = enr.RuntimeMinutes;
            }

            if (runtimeFilterNeedsEnrichment && !MatchesRuntime(runtime, filters!.RuntimeMin, filters.RuntimeMax))
                continue;

            items.Add(
                new MovieSearchItemResponse
                {
                    Id = row.Id,
                    MediaType = row.MediaType,
                    Title = row.Title,
                    Year = row.Year,
                    PosterPath = row.PosterPath,
                    VoteAverage = vote,
                    RuntimeMinutes = runtime,
                    WatchProviders = providers,
                    TmdbWatchPageUrl = watchPage,
                    GenreIds = row.GenreIds ?? Array.Empty<int>()
                });
        }

        return new MovieSearchListResponse
        {
            Items = items,
            WatchProvidersRegion = region,
            Disclaimer = TmdbIndicativeCopy.Disclaimer,
            TmdbAttributionUrl = TmdbHomeUrl
        };
    }

    private async Task<bool> AllowsSeriesAsync(string? eventSlug, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(eventSlug))
            return false;

        var evt = await _events.GetByIdOrSlugAsync(eventSlug.Trim(), ct);
        return evt?.Config?.AllowSeries ?? false;
    }

    private static bool MatchesRuntime(int? runtime, int? runtimeMin, int? runtimeMax) =>
        runtime.HasValue
        && (!runtimeMin.HasValue || runtime.Value >= runtimeMin.Value)
        && (!runtimeMax.HasValue || runtime.Value <= runtimeMax.Value);
}
