using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain;
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
    private readonly TimeProvider _clock;

    public GetFollowedWatchedMoviesHandler(
        IFollowRepository follows,
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        TimeProvider clock)
    {
        _follows = follows;
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
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
        var now = _clock.GetUtcNow();

        var watched = events
            .Where(e => e.HasWinner && e.IsFinished(now))
            .SelectMany(e => e.WinnerMovieIds.Select(id => (MovieId: id, WatchedAt: WatchedAtOf(e))))
            .GroupBy(x => x.MovieId)
            .Select(g => g.OrderByDescending(x => x.WatchedAt).First())
            .OrderByDescending(x => x.WatchedAt)
            .Take(take <= 0 ? DefaultTake : Math.Min(take, MaxTake))
            .ToList();

        if (watched.Count == 0)
            return empty;

        var movies = await _movies.ListByIdsAsync(watched.Select(x => x.MovieId).ToList(), ct);
        var movieById = movies.ToDictionary(m => m.Id);

        var items = watched
            .Select(x => (x.WatchedAt, Movie: movieById.GetValueOrDefault(x.MovieId)))
            .Where(x => x.Movie is not null)
            .Select(x => new UserWatchedMovieItem
            {
                TmdbId = x.Movie!.TmdbId,
                Title = x.Movie.Title,
                Year = x.Movie.Year,
                PosterPath = x.Movie.PosterPath,
                GenreIds = x.Movie.GenreIds,
                MediaType = x.Movie.MediaType,
                WatchedAt = x.WatchedAt,
            })
            .ToList();

        return new UserWatchedMoviesResponse { Items = items };
    }

    private static DateTimeOffset WatchedAtOf(Event evt) =>
        EventSchedule.TryGetStartUtc(evt.Date, evt.Time, out var start) ? start : evt.ClosedAt ?? evt.UpdatedAt;
}
