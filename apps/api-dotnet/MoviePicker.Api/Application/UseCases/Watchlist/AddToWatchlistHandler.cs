using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.Watchlist;

public sealed class AddToWatchlistHandler : IAddToWatchlistHandler
{
    private readonly IWatchlistRepository _watchlist;
    private readonly IPosterImageStore _posterImageStore;
    private readonly TimeProvider _clock;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly ILogger<AddToWatchlistHandler> _logger;

    public AddToWatchlistHandler(
        IWatchlistRepository watchlist,
        IPosterImageStore posterImageStore,
        TimeProvider clock,
        ITmdbMovieSearch tmdb,
        ILogger<AddToWatchlistHandler> logger)
    {
        _watchlist = watchlist;
        _posterImageStore = posterImageStore;
        _clock = clock;
        _tmdb = tmdb;
        _logger = logger;
    }

    public async Task<WatchlistItemResponse> HandleAsync(string userId, AddWatchlistItemRequest request, CancellationToken ct = default)
    {
        var poster = await ResolvePosterAsync(request.PosterPath, ct);
        var details = await FetchDetailsBestEffortAsync(request.TmdbId, request.MediaType, ct);

        var item = new WatchlistItem
        {
            Id = string.Empty,
            UserId = userId,
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = request.Title.Trim(),
            Year = request.Year,
            PosterPath = poster,
            VoteAverage = request.VoteAverage ?? details?.VoteAverage,
            RuntimeMinutes = KnownRuntime(request.RuntimeMinutes) ?? KnownRuntime(details?.Runtime) ?? request.RuntimeMinutes,
            LetterboxdSlug = string.IsNullOrWhiteSpace(request.LetterboxdSlug)
                ? null
                : request.LetterboxdSlug.Trim(),
            GenreIds = details?.GenreIds ?? SearchResultGenres(request.GenreIds),
            CreatedAt = _clock.GetUtcNow()
        };

        var inserted = await _watchlist.AddAsync(item, ct);
        if (!inserted)
        {
            var existing = await _watchlist.GetOneAsync(userId, request.TmdbId, request.MediaType, ct);
            if (existing is not null)
                return WatchlistItemResponse.FromDomain(existing);
        }

        return WatchlistItemResponse.FromDomain(item);
    }

    private async Task<string?> ResolvePosterAsync(string? posterPath, CancellationToken ct)
    {
        var poster = string.IsNullOrWhiteSpace(posterPath) ? null : posterPath.Trim();
        if (poster is not null && !TmdbPosterUrlNormalizer.IsAcceptedPosterReference(poster))
            throw Errors.InvalidPosterPath();

        return await _posterImageStore.ToStoredPosterPathAsync(poster, ct);
    }

    private static int? KnownRuntime(int? runtimeMinutes) => runtimeMinutes is > 0 ? runtimeMinutes : null;

    private static List<int> SearchResultGenres(IReadOnlyList<int>? genreIds) =>
        genreIds is null ? [] : genreIds.Where(id => id > 0).Distinct().ToList();

    private async Task<TmdbMovieDetails?> FetchDetailsBestEffortAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        try
        {
            return await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(
                ex,
                "TMDB details lookup failed for {TmdbId}, item added to the watchlist with the genres of its search result and without facts",
                tmdbId);
            return null;
        }
    }
}
