using System.Globalization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.UserStats;

public sealed class GetUserStatsHandler : IGetUserStatsHandler
{
    private const int CreatedEventsCap = 1000;
    private const int ParticipantsCap = 500;
    private const int FavoriteGenresTop = 6;
    private const int ActivityWeeks = 26;
    private const string IsoDateFormat = "yyyy-MM-dd";

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
        var user = await PublicProfileGuard.RequirePublicUserAsync(_users, handle, ct);

        var participants = await _participants.ListByUserIdAsync(user.Id, ParticipantsCap, ct);
        var participantIds = participants.Select(p => p.Id).ToList();

        var participantEventIds = participants.Select(p => p.EventId).Distinct().ToList();
        var participantEvents = await _events.ListByIdsAsync(participantEventIds, ct);
        var eventById = participantEvents.ToDictionary(e => e.Id);
        var activityDates = participants
            .Select(p => eventById.GetValueOrDefault(p.EventId)?.Date)
            .Where(d => d is not null)
            .ToList()!;
        var dailyActivity = BuildDailyActivity(activityDates!);

        var now = _clock.GetUtcNow();
        var qualifyingEvents = participants
            .Select(p => eventById.GetValueOrDefault(p.EventId))
            .Where(e => e is not null && e.WinnerMovieId is not null && e.IsFinished(now))
            .Select(e => e!)
            .DistinctBy(e => e.Id);
        var (currentStreakWeeks, bestStreakWeeks) = ComputeStreaks(qualifyingEvents, now);

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
                CurrentStreakWeeks = currentStreakWeeks,
                BestStreakWeeks = bestStreakWeeks,
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
            CurrentStreakWeeks = currentStreakWeeks,
            BestStreakWeeks = bestStreakWeeks,
            FavoriteGenres = favoriteGenres,
            DailyActivity = dailyActivity
        };
    }

    // Heatmap-style window: one bucket per day over the last ActivityWeeks weeks (~6 months),
    // aligned so the grid starts on a Monday and ends today. Each entry in eventDates is an event's
    // date string ("yyyy-MM-dd") — the date of the soirée, not the join timestamp.
    // Days outside the window are ignored.
    private List<DailyActivityPoint> BuildDailyActivity(IReadOnlyList<string> eventDates)
    {
        var today = _clock.GetUtcNow().UtcDateTime.Date;
        var mondayThisWeek = MondayOfWeek(today);
        var start = mondayThisWeek.AddDays(-7 * (ActivityWeeks - 1));

        var counts = new Dictionary<string, int>();
        foreach (var dateStr in eventDates)
        {
            if (!DateTime.TryParseExact(dateStr, IsoDateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var day))
                continue;
            if (day < start || day > today)
                continue;
            var key = day.ToString(IsoDateFormat, CultureInfo.InvariantCulture);
            counts[key] = counts.TryGetValue(key, out var c) ? c + 1 : 1;
        }

        var totalDays = (today - start).Days + 1;
        var result = new List<DailyActivityPoint>(totalDays);
        for (var i = 0; i < totalDays; i++)
        {
            var key = start.AddDays(i).ToString(IsoDateFormat, CultureInfo.InvariantCulture);
            result.Add(new DailyActivityPoint
            {
                Date = key,
                Count = counts.TryGetValue(key, out var c) ? c : 0
            });
        }

        return result;
    }

    // ISO week convention shared with BuildDailyActivity: weeks run Monday-to-Sunday, in UTC.
    internal static DateTime MondayOfWeek(DateTime date)
    {
        var daysFromMonday = ((int)date.DayOfWeek + 6) % 7;
        return date.Date.AddDays(-daysFromMonday);
    }

    // Current streak = consecutive weeks with a qualifying soirée, walking back from this week
    // (or last week if this week has none yet, so an in-progress week never breaks the streak).
    // Best streak = the longest such run anywhere in the user's history.
    internal static (int Current, int Best) ComputeStreaks(IEnumerable<Event> qualifyingEvents, DateTimeOffset now)
    {
        var weeks = qualifyingEvents
            .Select(e => DateTime.TryParseExact(e.Date, IsoDateFormat, CultureInfo.InvariantCulture, DateTimeStyles.None, out var day)
                ? MondayOfWeek(day)
                : (DateTime?)null)
            .Where(w => w is not null)
            .Select(w => w!.Value)
            .Distinct()
            .OrderBy(w => w)
            .ToList();

        if (weeks.Count == 0)
            return (0, 0);

        var best = 0;
        var run = 0;
        DateTime? previous = null;
        foreach (var week in weeks)
        {
            run = previous is not null && week == previous.Value.AddDays(7) ? run + 1 : 1;
            best = Math.Max(best, run);
            previous = week;
        }

        var weekSet = weeks.ToHashSet();
        var todayWeekMonday = MondayOfWeek(now.UtcDateTime.Date);
        var cursor = weekSet.Contains(todayWeekMonday) ? todayWeekMonday : todayWeekMonday.AddDays(-7);
        var current = 0;
        while (weekSet.Contains(cursor))
        {
            current++;
            cursor = cursor.AddDays(-7);
        }

        return (current, best);
    }
}
