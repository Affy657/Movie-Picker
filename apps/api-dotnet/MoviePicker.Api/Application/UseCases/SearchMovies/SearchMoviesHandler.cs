using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.SearchMovies;

public sealed class SearchMoviesHandler : ISearchMoviesHandler
{
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public SearchMoviesHandler(ITmdbMovieSearch tmdb, IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<MovieSearchListResponse> HandleAsync(string query, bool allowSeries, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new ServiceUnavailableException("Recherche films temporairement indisponible");

        IReadOnlyList<TmdbSearchItem> rows;
        try
        {
            rows = await _tmdb.SearchAsync(query, allowSeries, ct);
        }
        catch (HttpRequestException)
        {
            throw new ServiceUnavailableException("Recherche films temporairement indisponible");
        }

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var maxLookups = Math.Clamp(_options.TmdbSearchMaxWatchProviderLookups, 0, 20);
        var maxParallelism = Math.Clamp(_options.TmdbListEnrichmentMaxParallelism, 1, 16);

        var enrichmentsByKey = new ConcurrentDictionary<(int, string), TmdbMovieEnrichment?>();
        var toEnrich = rows.Take(maxLookups).Select(r => (r.Id, r.MediaType)).Distinct().ToList();
        if (toEnrich.Count > 0)
        {
            await Parallel.ForEachAsync(
                    toEnrich,
                    new ParallelOptions { MaxDegreeOfParallelism = maxParallelism, CancellationToken = ct },
                    async (pair, c) =>
                    {
                        var (tmdbId, mediaType) = pair;
                        var key = (tmdbId, mediaType.ToString());
                        enrichmentsByKey[key] = await _tmdb.GetEnrichmentAsync(tmdbId, mediaType, region, c);
                    })
                .ConfigureAwait(false);
        }

        var items = new List<MovieSearchItemResponse>(rows.Count);
        foreach (var row in rows)
        {
            IReadOnlyList<WatchProviderOfferResponse> providers = Array.Empty<WatchProviderOfferResponse>();
            string? watchPage = null;
            double? vote = row.VoteAverage;
            int? runtime = null;

            var enrichKey = (row.Id, row.MediaType.ToString());
            if (enrichmentsByKey.TryGetValue(enrichKey, out var enr) && enr is not null)
            {
                providers = WatchProviderMapping.ToDto(enr.WatchProviders);
                watchPage = enr.TmdbWatchPageUrl;
                vote ??= enr.VoteAverage;
                runtime = enr.RuntimeMinutes;
            }

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
                    TmdbWatchPageUrl = watchPage
                });
        }

        return new MovieSearchListResponse
        {
            Items = items,
            WatchProvidersRegion = region,
            Disclaimer = TmdbIndicativeCopy.Disclaimer,
            TmdbAttributionUrl = "https://www.themoviedb.org/"
        };
    }
}
