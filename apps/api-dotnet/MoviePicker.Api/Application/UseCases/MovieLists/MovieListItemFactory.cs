using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.MovieLists;

public sealed class MovieListItemFactory
{
    private readonly IPosterImageStore _posters;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly ILogger<MovieListItemFactory> _logger;

    public MovieListItemFactory(IPosterImageStore posters, ITmdbMovieSearch tmdb, ILogger<MovieListItemFactory> logger)
    {
        _posters = posters;
        _tmdb = tmdb;
        _logger = logger;
    }

    public async Task<MovieListItem> CreateAsync(
        ITmdbTitleFactsRequest request,
        DateTimeOffset addedAt,
        CancellationToken ct = default)
    {
        var requestedPoster = await TmdbPosterPathResolver.ResolveAsync(_posters, request.PosterPath, ct);
        var details = await TmdbTitleFacts.FetchDetailsBestEffortAsync(_tmdb, _logger, request.TmdbId, request.MediaType, ct);

        return new MovieListItem
        {
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = string.IsNullOrWhiteSpace(details?.Title) ? request.Title.Trim() : details.Title.Trim(),
            Year = TmdbTitleFacts.ReleaseYear(details?.ReleaseDate) ?? request.Year,
            PosterPath = requestedPoster ?? await _posters.ToStoredPosterPathAsync(details?.PosterUrl, ct),
            VoteAverage = details?.VoteAverage ?? request.VoteAverage,
            RuntimeMinutes = details?.Runtime is > 0
                ? details.Runtime
                : TmdbTitleFacts.RuntimeMinutes(request.RuntimeMinutes, details),
            GenreIds = TmdbTitleFacts.GenreIds(request.GenreIds, details),
            AddedAt = addedAt
        };
    }
}
