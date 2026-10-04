using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class GetFollowedWatchedMoviesHandler : IGetFollowedWatchedMoviesHandler
{
    private const int FollowingCap = 200;
    private const int ParticipantsCap = 1_000;
    private const int DefaultTake = 20;
    private const int MaxTake = 60;

    private readonly IFollowRepository _follows;
    private readonly IUserRepository _users;
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;

    public GetFollowedWatchedMoviesHandler(
        IFollowRepository follows,
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        ITmdbMovieSearch tmdb,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock)
    {
        _follows = follows;
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
        _tmdb = tmdb;
        _options = options.Value;
        _clock = clock;
    }

    public async Task<UserWatchedMoviesResponse> HandleAsync(
        string userId,
        int take,
        CancellationToken ct = default)
    {
        var empty = new UserWatchedMoviesResponse { Items = [] };
        if (string.IsNullOrWhiteSpace(userId))
            return empty;

        var followingIds = await _follows.GetFollowingIdsAsync(userId, FollowingCap, ct);
        if (followingIds.Count == 0)
            return empty;

        var followed = await _users.ListByIdsAsync(followingIds, ct);
        var publicIds = followed.Where(u => u.IsProfilePublic).Select(u => u.Id).ToList();
        if (publicIds.Count == 0)
            return empty;

        var participants = await _participants.ListByUserIdsAsync(publicIds, ParticipantsCap, ct);
        if (participants.Count == 0)
            return empty;

        var eventIds = participants.Select(p => p.EventId).Distinct().ToList();
        var events = await _events.ListByIdsAsync(eventIds, ct);

        var latestFirst = WatchedMoviesFacts.FinishedWinners(events, _clock.GetUtcNow())
            .OrderByDescending(x => x.WatchedAt)
            .ToList();
        var watched = await LatestNightPerFilmAsync(
            latestFirst,
            take <= 0 ? DefaultTake : Math.Min(take, MaxTake),
            ct);

        return await WatchedMoviesFacts.ToResponseAsync(watched, _tmdb, _options, ct);
    }

    private async Task<List<(Movie Movie, DateTimeOffset WatchedAt)>> LatestNightPerFilmAsync(
        List<(string MovieId, DateTimeOffset WatchedAt)> latestFirst,
        int limit,
        CancellationToken ct)
    {
        var films = new List<(Movie Movie, DateTimeOffset WatchedAt)>(limit);
        var seen = new HashSet<(int TmdbId, MovieMediaType MediaType)>();
        foreach (var nights in latestFirst.Chunk(limit))
        {
            var movies = await _movies.ListByIdsAsync(nights.Select(x => x.MovieId).Distinct().ToList(), ct);
            var movieById = movies.ToDictionary(m => m.Id);
            foreach (var (movieId, watchedAt) in nights)
            {
                if (movieById.TryGetValue(movieId, out var movie) && seen.Add((movie.TmdbId, movie.MediaType)))
                    films.Add((movie, watchedAt));
                if (films.Count == limit)
                    return films;
            }
        }

        return films;
    }
}
