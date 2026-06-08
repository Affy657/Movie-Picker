using System.Globalization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Exceptions;

namespace MoviePicker.Api.Application.UseCases.UserStats;

public sealed class GetUserStatsHandler : IGetUserStatsHandler
{
    private const int CreatedEventsCap = 1000;
    private const int ParticipantsCap = 500;
    private const int FavoriteGenresTop = 6;
    private const int ActivityWeeks = 26;

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

        var participants = await _participants.ListByUserIdAsync(user.Id, ParticipantsCap, ct);
        var participantIds = participants.Select(p => p.Id).ToList();

        var participantEventIds = participants.Select(p => p.EventId).Distinct().ToList();
        var participantEvents = await _events.ListByIdsAsync(participantEventIds, ct);
        var eventDateById = participantEvents.ToDictionary(e => e.Id, e => e.Date);
        var activityDates = participants
            .Select(p => eventDateById.GetValueOrDefault(p.EventId))
            .Where(d => d is not null)
            .ToList()!;
        var dailyActivity = BuildDailyActivity(activityDates!);

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
                DailyActivity = dailyActivity
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
            DailyActivity = dailyActivity
        };
    }

    // Heatmap-style window: one bucket per day over the last ActivityWeeks weeks (~6 months),
    // aligned so the grid starts on a Monday and ends today. Each entry in eventDates is an event's
    // date string ("yyyy-MM-dd") — the date of the soirée, not the join timestamp.
    // Days outside the window are ignored.
    private IReadOnlyList<DailyActivityPoint> BuildDailyActivity(IReadOnlyList<string> eventDates)
    {
        var today = _clock.GetUtcNow().UtcDateTime.Date;
        var daysFromMonday = ((int)today.DayOfWeek + 6) % 7;
        var mondayThisWeek = today.AddDays(-daysFromMonday);
        var start = mondayThisWeek.AddDays(-7 * (ActivityWeeks - 1));

        var counts = new Dictionary<string, int>();
        foreach (var dateStr in eventDates)
        {
            if (!DateTime.TryParseExact(dateStr, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                continue;
            if (day < start || day > today)
                continue;
            var key = day.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            counts[key] = counts.TryGetValue(key, out var c) ? c + 1 : 1;
        }

        var totalDays = (today - start).Days + 1;
        var result = new List<DailyActivityPoint>(totalDays);
        for (var i = 0; i < totalDays; i++)
        {
            var key = start.AddDays(i).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
            result.Add(new DailyActivityPoint
            {
                Date = key,
                Count = counts.TryGetValue(key, out var c) ? c : 0
            });
        }

        return result;
    }
}
