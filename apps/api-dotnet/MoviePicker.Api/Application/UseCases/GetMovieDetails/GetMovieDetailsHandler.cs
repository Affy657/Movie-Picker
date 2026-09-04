using Microsoft.Extensions.Options;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieDetails;

public sealed class GetMovieDetailsHandler : IGetMovieDetailsHandler
{
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;

    public GetMovieDetailsHandler(ITmdbMovieSearch tmdb, IOptions<MoviePickerOptions> options)
    {
        _tmdb = tmdb;
        _options = options.Value;
    }

    public async Task<MovieDetailsResponse?> HandleAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct = default)
    {
        if (tmdbId <= 0)
            return null;

        TmdbMovieDetails? details;
        try
        {
            details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct).ConfigureAwait(false);
        }
        catch (HttpRequestException)
        {
            throw new ServiceUnavailableException("Détails film temporairement indisponibles");
        }

        if (details is null)
            return null;

        var region = string.IsNullOrWhiteSpace(_options.TmdbWatchProvidersRegion)
            ? "FR"
            : _options.TmdbWatchProvidersRegion.Trim().ToUpperInvariant();
        // No try/catch here: unlike GetDetailsAsync, GetEnrichmentAsync already swallows
        // upstream TMDB failures internally and returns null, so it never throws.
        var enrichment = await _tmdb.GetEnrichmentAsync(tmdbId, mediaType, region, ct).ConfigureAwait(false);

        return new MovieDetailsResponse
        {
            TmdbId = details.Id,
            MediaType = mediaType,
            Title = details.Title,
            Overview = details.Overview,
            Tagline = details.Tagline,
            Director = details.Director,
            Cast = details.Cast,
            RuntimeMinutes = details.Runtime,
            Genres = details.Genres,
            ReleaseDate = details.ReleaseDate,
            TrailerUrl = details.TrailerUrl,
            WatchProviders = enrichment is null
                ? Array.Empty<WatchProviderOfferResponse>()
                : WatchProviderMapping.ToDto(enrichment.WatchProviders),
            TmdbWatchPageUrl = enrichment?.TmdbWatchPageUrl
        };
    }
}
