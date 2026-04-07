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

    public async Task<MovieSearchListResponse> HandleAsync(string query, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(_options.TmdbApiKey))
            throw new ServiceUnavailableException("Recherche films temporairement indisponible");

        IReadOnlyList<TmdbSearchItem> rows;
        try
        {
            rows = await _tmdb.SearchAsync(query, ct);
        }
        catch (HttpRequestException)
        {
            throw new ServiceUnavailableException("Recherche films temporairement indisponible");
        }

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        var maxLookups = Math.Clamp(_options.TmdbSearchMaxWatchProviderLookups, 0, 20);

        var items = new List<MovieSearchItemResponse>(rows.Count);
        for (var i = 0; i < rows.Count; i++)
        {
            var row = rows[i];
            IReadOnlyList<WatchProviderOfferResponse> providers = Array.Empty<WatchProviderOfferResponse>();
            string? watchPage = null;
            double? vote = row.VoteAverage;

            if (i < maxLookups)
            {
                var enr = await _tmdb.GetEnrichmentAsync(row.Id, region, ct);
                if (enr is not null)
                {
                    providers = WatchProviderMapping.ToDto(enr.WatchProviders);
                    watchPage = enr.TmdbWatchPageUrl;
                    vote ??= enr.VoteAverage;
                }
            }

            items.Add(
                new MovieSearchItemResponse
                {
                    Id = row.Id,
                    Title = row.Title,
                    Year = row.Year,
                    PosterPath = row.PosterPath,
                    VoteAverage = vote,
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
