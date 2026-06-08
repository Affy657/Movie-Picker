using System.Globalization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.UserStats;

public sealed class GetUserStatsHandler : IGetUserStatsHandler
{
    private const int CreatedEventsCap = 1000;
    private const int FavoriteGenresTop = 6;
    private const int ActivityMonths = 12;

    private readonly IUserRepository _users;
    private readonly IParticipantRepository _participants;
    private readonly IEventRepository _events;
    private readonly IMovieRepository _movies;
    private readonly IVoteRepository _votes;
    private readonly ISeenMarkRepository _seenMarks;
    private readonly TimeProvider _clock;

    public GetUserStatsHandler(
        IUserRepository users,
        IParticipantRepository participants,
        IEventRepository events,
        IMovieRepository movies,
        IVoteRepository votes,
        ISeenMarkRepository seenMarks,
        TimeProvider clock)
    {
        _users = users;
        _participants = participants;
        _events = events;
        _movies = movies;
        _votes = votes;
        _seenMarks = seenMarks;
        _clock = clock;
    }

    public async Task<UserStatsResponse> HandleAsync(string handle, CancellationToken ct = default)
    {
        var normalized = HandlePolicy.Normalize(handle);
        var user = await _users.GetByHandleAsync(normalized, ct);

        // 404 (not 403) for both "unknown" and "private" so we never reveal a private account exists.
        if (user is null || !user.IsProfilePublic)
            throw new NotFoundException("Profil introuvable");

        var participants = await _participants.ListByUserIdAsync(user.Id, ct);
        var participantIds = participants.Select(p => p.Id).Distinct().ToList();
        var monthlyActivity = BuildMonthlyActivity(participants.Select(p => p.CreatedAt));

        // The user's own created events double as the "created" count and the set we subtract
        // from participations to avoid counting a hosted soirée as "joined".
        var createdEvents = await _events.ListByCreatorUserIdAsync(user.Id, CreatedEventsCap, ct);
        var createdEventIds = createdEvents.Select(e => e.Id).ToHashSet();
        var eventsJoined = participants
            .Select(p => p.EventId)
            .Distinct()
            .Count(id => !createdEventIds.Contains(id));

        if (participantIds.Count == 0)
        {
            return new UserStatsResponse
            {
                EventsCreated = createdEvents.Count,
                EventsJoined = eventsJoined,
                MonthlyActivity = monthlyActivity
            };
        }

        var proposedMoviesTask = _movies.ListByParticipantIdsAsync(participantIds, ct);
        var votesTask = _votes.CountByParticipantIdsAsync(participantIds, ct);
        var seenTask = _seenMarks.CountByParticipantIdsAsync(participantIds, ct);
        await Task.WhenAll(proposedMoviesTask, votesTask, seenTask);

        var proposedMovies = proposedMoviesTask.Result;
        var userMovieIds = proposedMovies.Select(m => m.Id).ToList();
        var winningProposals = await _events.CountByWinnerMovieIdsAsync(userMovieIds, ct);

        var favoriteGenres = proposedMovies
            .SelectMany(m => m.GenreIds)
            .GroupBy(id => id)
            .Select(g => new GenreCount { GenreId = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .ThenBy(g => g.GenreId)
            .Take(FavoriteGenresTop)
            .ToList();

        return new UserStatsResponse
        {
            EventsCreated = createdEvents.Count,
            EventsJoined = eventsJoined,
            MoviesProposed = proposedMovies.Count,
            VotesCast = votesTask.Result,
            WinningProposals = winningProposals,
            MoviesSeen = seenTask.Result,
            FavoriteGenres = favoriteGenres,
            MonthlyActivity = monthlyActivity
        };
    }

    private IReadOnlyList<MonthlyActivityPoint> BuildMonthlyActivity(IEnumerable<DateTimeOffset> timestamps)
    {
        var now = _clock.GetUtcNow();
        var anchor = new DateTimeOffset(now.Year, now.Month, 1, 0, 0, 0, TimeSpan.Zero);

        var orderedKeys = new string[ActivityMonths];
        var counts = new Dictionary<string, int>(ActivityMonths);
        for (var i = 0; i < ActivityMonths; i++)
        {
            var month = anchor.AddMonths(-(ActivityMonths - 1 - i));
            var key = month.ToString("yyyy-MM", CultureInfo.InvariantCulture);
            orderedKeys[i] = key;
            counts[key] = 0;
        }

        foreach (var ts in timestamps)
        {
            var key = ts.ToUniversalTime().ToString("yyyy-MM", CultureInfo.InvariantCulture);
            if (counts.ContainsKey(key))
                counts[key]++;
        }

        return orderedKeys
            .Select(k => new MonthlyActivityPoint { Month = k, Count = counts[k] })
            .ToList();
    }
}
