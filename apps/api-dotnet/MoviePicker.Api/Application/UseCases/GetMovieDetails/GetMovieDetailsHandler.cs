using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.GetMovieDetails;

public sealed class GetMovieDetailsHandler : IGetMovieDetailsHandler
{
    private readonly ITmdbMovieSearch _tmdb;

    public GetMovieDetailsHandler(ITmdbMovieSearch tmdb)
    {
        _tmdb = tmdb;
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
            TrailerUrl = details.TrailerUrl
        };
    }
}
