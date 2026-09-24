using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Configuration;

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

        var watched = WatchedMoviesFacts.FinishedWinners(events, _clock.GetUtcNow())
            .GroupBy(x => x.MovieId)
            .Select(g => g.OrderByDescending(x => x.WatchedAt).First())
            .OrderByDescending(x => x.WatchedAt)
            .Take(take <= 0 ? DefaultTake : Math.Min(take, MaxTake))
            .ToList();

        return await WatchedMoviesFacts.ToResponseAsync(watched, _movies, _tmdb, _options, ct);
    }
}
