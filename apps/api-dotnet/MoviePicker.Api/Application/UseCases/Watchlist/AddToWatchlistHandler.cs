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
        var genreIds = await FetchGenreIdsBestEffortAsync(request.TmdbId, request.MediaType, ct);

        var item = new WatchlistItem
        {
            Id = string.Empty,
            UserId = userId,
            TmdbId = request.TmdbId,
            MediaType = request.MediaType,
            Title = request.Title.Trim(),
            Year = request.Year,
            PosterPath = poster,
            VoteAverage = request.VoteAverage,
            RuntimeMinutes = request.RuntimeMinutes,
            LetterboxdSlug = string.IsNullOrWhiteSpace(request.LetterboxdSlug)
                ? null
                : request.LetterboxdSlug.Trim(),
            GenreIds = genreIds,
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
        if (poster is not null && !IsAcceptablePosterPath(poster))
            throw new BadRequestException("posterPath doit être une URL https absolue, un chemin /api/v1/posters/… ou null");

        if (poster is not null && TmdbPosterUrlNormalizer.TryNormalizeToHttpsTmdb(poster, out var norm))
            await _posterImageStore.RegisterTmdbSourceAsync(norm, ct);
        return _posterImageStore.ToPublicPosterPath(poster);
    }

    private static bool IsAcceptablePosterPath(string p)
    {
        if (Uri.TryCreate(p, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps)
            return true;
        return TmdbPosterUrlNormalizer.TryParsePosterKey(p, out _);
    }

    private async Task<IReadOnlyList<int>> FetchGenreIdsBestEffortAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        try
        {
            var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct);
            return details?.GenreIds ?? [];
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Récupération des genres TMDB échouée pour {TmdbId} ; item ajouté à la watchlist sans genres", tmdbId);
            return [];
        }
    }
}
