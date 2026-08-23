using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class GetUserWatchedMoviesHandler : IGetUserWatchedMoviesHandler
{
    private const int ParticipantsCap = 500;
    private const int DefaultTake = 6;
    private const int MaxTake = 200;

    private readonly IUserRepository _users;
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly TimeProvider _clock;

    public GetUserWatchedMoviesHandler(
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        TimeProvider clock)
    {
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
        _clock = clock;
    }

    public async Task<UserWatchedMoviesResponse> HandleAsync(string handle, int take, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await _users.GetByHandleAsync(normalized, ct);

        // 404 (not 403) for both "unknown" and "private", same policy as the profile/stats/movies endpoints.
        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        var effectiveTake = take <= 0 ? DefaultTake : Math.Min(take, MaxTake);

        var participants = await _participants.ListByUserIdAsync(user.Id, ParticipantsCap, ct);
        if (participants.Count == 0)
            return new UserWatchedMoviesResponse { Items = [] };

        var eventIds = participants.Select(p => p.EventId).Distinct().ToList();
        var events = await _events.ListByIdsAsync(eventIds, ct);
        var now = _clock.GetUtcNow();

        var qualifying = events
            .Where(e => e.WinnerMovieId is not null && e.IsFinished(now))
            .Select(e => (Event: e, WatchedAt: WatchedAtOf(e)))
            .OrderByDescending(x => x.WatchedAt)
            .Take(effectiveTake)
            .ToList();

        if (qualifying.Count == 0)
            return new UserWatchedMoviesResponse { Items = [] };

        var movies = await Task.WhenAll(
            qualifying.Select(x => _movies.GetByIdAsync(x.Event.WinnerMovieId!, ct)));

        var items = qualifying
            .Zip(movies, (x, movie) => (x.WatchedAt, Movie: movie))
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
