using Microsoft.Extensions.Options;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Configuration;

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
    private readonly ITmdbMovieSearch _tmdb;
    private readonly MoviePickerOptions _options;
    private readonly TimeProvider _clock;

    public GetUserWatchedMoviesHandler(
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        ITmdbMovieSearch tmdb,
        IOptions<MoviePickerOptions> options,
        TimeProvider clock)
    {
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
        _tmdb = tmdb;
        _options = options.Value;
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

        var qualifying = WatchedMoviesFacts.FinishedWinners(events, _clock.GetUtcNow())
            .OrderByDescending(x => x.WatchedAt)
            .Take(effectiveTake)
            .ToList();

        return await WatchedMoviesFacts.ToResponseAsync(qualifying, _movies, _tmdb, _options, ct);
    }
}
