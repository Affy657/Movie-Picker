using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;

namespace MoviePicker.Api.Application.UseCases.UserMovies;

public sealed class GetUserMoviesHandler : IGetUserMoviesHandler
{
    private const int ParticipantsCap = 500;
    private const int DefaultTake = 6;
    private const int MaxTake = 60;

    private readonly IUserRepository _users;
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly TimeProvider _clock;

    public GetUserMoviesHandler(
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

    public async Task<UserMoviesResponse> HandleAsync(string handle, int skip, int take, CancellationToken ct = default)
    {
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);

        var effectiveSkip = Math.Max(0, skip);
        var effectiveTake = take <= 0 ? DefaultTake : Math.Min(take, MaxTake);

        var participants = await _participants.ListByUserIdAsync(user.Id, ParticipantsCap, ct);
        var participantIds = participants.Select(p => p.Id).ToList();

        if (participantIds.Count == 0)
            return new UserMoviesResponse { Items = [], TotalCount = 0 };

        var totalCountTask = _movies.CountByParticipantIdsAsync(participantIds, ct);
        var moviesTask = _movies.ListByParticipantIdsPagedAsync(participantIds, effectiveSkip, effectiveTake, ct);
        await Task.WhenAll(totalCountTask, moviesTask);

        var movies = moviesTask.Result;
        var eventIds = movies.Select(m => m.EventId).Distinct().ToList();
        var events = await _events.ListByIdsAsync(eventIds, ct);
        var eventById = events.ToDictionary(e => e.Id);
        var now = _clock.GetUtcNow();

        var items = movies
            .Select(m =>
            {
                var evt = eventById.GetValueOrDefault(m.EventId);
                var isWinner = evt is not null && evt.WinnerMovieId == m.Id && evt.IsFinished(now);
                return new UserMovieItem
                {
                    TmdbId = m.TmdbId,
                    Title = m.Title,
                    Year = m.Year,
                    PosterPath = m.PosterPath,
                    GenreIds = m.GenreIds,
                    MediaType = m.MediaType,
                    ProposedAt = m.CreatedAt,
                    IsWinner = isWinner,
                };
            })
            .ToList();

        return new UserMoviesResponse { Items = items, TotalCount = totalCountTask.Result };
    }
}
