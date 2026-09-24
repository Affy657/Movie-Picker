using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Infrastructure.Migrations;

public sealed class RewriteLegacyPosterPathsMigration : IRepeatableDataMigration
{
    private const int BatchSize = 100;

    private readonly IMovieRepository _movies;
    private readonly IWatchlistRepository _watchlist;
    private readonly IPosterImageStore _posters;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly ILogger<RewriteLegacyPosterPathsMigration> _logger;

    public RewriteLegacyPosterPathsMigration(
        IMovieRepository movies,
        IWatchlistRepository watchlist,
        IPosterImageStore posters,
        ITmdbMovieSearch tmdb,
        ILogger<RewriteLegacyPosterPathsMigration> logger)
    {
        _movies = movies;
        _watchlist = watchlist;
        _posters = posters;
        _tmdb = tmdb;
        _logger = logger;
    }

    public string Id => "2026-09-23-001-rewrite-legacy-poster-paths";

    public async Task<long> ExecuteAsync(CancellationToken ct = default)
    {
        var movies = await BackfillSteps.RunBatchesAsync<Movie>(
            _movies.ListWithLegacyPosterPathAsync,
            movie => movie.Id,
            async (movie, token) =>
            {
                var path = await ResolveRoutePathAsync(movie.PosterPath, movie.TmdbId, movie.MediaType, token);
                await _movies.UpdatePosterPathAsync(movie.Id, path, token);
                return true;
            },
            (movie, ex) => _logger.LogWarning(ex, "Legacy poster path kept for movie {MovieId} (TMDB {TmdbId})", movie.Id, movie.TmdbId),
            BatchSize,
            ct);

        var watchlist = await BackfillSteps.RunBatchesAsync<WatchlistItem>(
            _watchlist.ListWithLegacyPosterPathAsync,
            item => item.Id,
            async (item, token) =>
            {
                var path = await ResolveRoutePathAsync(item.PosterPath, item.TmdbId, item.MediaType, token);
                await _watchlist.UpdatePosterPathAsync(item.Id, path, token);
                return true;
            },
            (item, ex) => _logger.LogWarning(ex, "Legacy poster path kept for watchlist item {ItemId} (TMDB {TmdbId})", item.Id, item.TmdbId),
            BatchSize,
            ct);

        return (movies + watchlist).Completed(Id);
    }

    private async Task<string?> ResolveRoutePathAsync(
        string? legacyPath,
        int tmdbId,
        MovieMediaType mediaType,
        CancellationToken ct)
    {
        var cached = TmdbPosterUrlNormalizer.TryParsePosterKey(legacyPath, out var key)
            ? await _posters.FindSourceUrlAsync(key, ct)
            : null;
        var source = cached ?? await FetchTmdbPosterAsync(tmdbId, mediaType, ct);
        return source is null ? null : TmdbPosterUrlNormalizer.ToPublicPosterPath(source);
    }

    private async Task<string?> FetchTmdbPosterAsync(int tmdbId, MovieMediaType mediaType, CancellationToken ct)
    {
        var details = await _tmdb.GetDetailsAsync(tmdbId, mediaType, ct);
        return details?.PosterUrl is { } posterUrl
            ? TmdbPosterUrlNormalizer.UpgradeTmdbSize(posterUrl, TmdbPosterUrlNormalizer.PreferredPosterSize)
            : null;
    }
}
