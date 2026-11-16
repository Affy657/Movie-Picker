using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain.Entities;

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
        var poster = await TmdbPosterPathResolver.ResolveAsync(_posterImageStore, request.PosterPath, ct);
        var details = await TmdbTitleFacts.FetchDetailsBestEffortAsync(_tmdb, _logger, request.TmdbId, request.MediaType, ct);

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
            RuntimeMinutes = TmdbTitleFacts.RuntimeMinutes(request.RuntimeMinutes, details),
            LetterboxdSlug = string.IsNullOrWhiteSpace(request.LetterboxdSlug)
                ? null
                : request.LetterboxdSlug.Trim(),
            GenreIds = TmdbTitleFacts.GenreIds(request.GenreIds, details),
            CreatedAt = _clock.GetUtcNow()
        };

        var inserted = await _watchlist.AddAsync(item, ct);
        if (!inserted)
        {
            var existing = await _watchlist.GetOneAsync(userId, request.TmdbId, request.MediaType, ct);
            if (existing is not null)
                return WatchlistItemResponse.FromDomain(existing, includeLetterboxd: true);
        }

        return WatchlistItemResponse.FromDomain(item, includeLetterboxd: true);
    }
}
