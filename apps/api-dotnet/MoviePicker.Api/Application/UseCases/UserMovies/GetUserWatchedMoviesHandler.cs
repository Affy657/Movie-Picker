using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

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
    private readonly IMovieRatingRepository _ratings;
    private readonly TimeProvider _clock;

    public GetUserWatchedMoviesHandler(
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        IMovieRatingRepository ratings,
        TimeProvider clock)
    {
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
        _ratings = ratings;
        _clock = clock;
    }

    public async Task<UserWatchedMoviesResponse> HandleAsync(string handle, int take, CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);
        return await HandleForUserAsync(user.Id, take, ct);
    }

    public async Task<UserWatchedMoviesResponse> HandleForUserAsync(
        string userId,
        int take,
        CancellationToken ct = default)
    {
        var effectiveTake = take <= 0 ? DefaultTake : Math.Min(take, MaxTake);

        var participants = await _participants.ListByUserIdAsync(userId, ParticipantsCap, ct);
        if (participants.Count == 0)
            return new UserWatchedMoviesResponse { Items = [] };

        var eventIds = participants.Select(p => p.EventId).Distinct().ToList();
        var events = await _events.ListByIdsAsync(eventIds, ct);
        var now = _clock.GetUtcNow();

        var qualifying = events
            .Where(e => e.HasWinner && e.IsFinished(now))
            .SelectMany(e => e.GetWinnerMovieIds().Select(id => (MovieId: id, WatchedAt: WatchedAtOf(e))))
            .OrderByDescending(x => x.WatchedAt)
            .Take(effectiveTake)
            .ToList();

        if (qualifying.Count == 0)
            return new UserWatchedMoviesResponse { Items = [] };

        var winnerMovieIds = qualifying.Select(x => x.MovieId).Distinct().ToList();
        var moviesTask = _movies.ListByIdsAsync(winnerMovieIds, ct);
        var ratingsTask = _ratings.ListByParticipantIdsAsync(participants.Select(p => p.Id).ToList(), ct);
        await Task.WhenAll(moviesTask, ratingsTask);
        var movies = await moviesTask;
        var movieById = movies.ToDictionary(m => m.Id);
        var myRatingByMovie = (await ratingsTask)
            .GroupBy(r => r.MovieId)
            .ToDictionary(g => g.Key, g => g.First().Value);

        var items = qualifying
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
                MyRating = myRatingByMovie.TryGetValue(x.Movie.Id, out var myRating) ? myRating : null,
            })
            .ToList();

        return new UserWatchedMoviesResponse { Items = items };
    }

    private static DateTimeOffset WatchedAtOf(Event evt) =>
        EventSchedule.TryGetStartUtc(evt.Date, evt.Time, out var start) ? start : evt.ClosedAt ?? evt.UpdatedAt;
}
