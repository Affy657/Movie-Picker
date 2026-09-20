using Microsoft.Extensions.Logging;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;

namespace MoviePicker.Api.Application.UseCases.Notifications;

public interface IRatingReminderPass
{
    Task<RatingReminderPassResult> RunAsync(CancellationToken ct = default);
}

public sealed record RatingReminderPassResult(int FinishedNights, int Reminded);

public sealed class RatingReminderPass : IRatingReminderPass
{
    private const int CatchUpDays = 3;

    private readonly IEventRepository _events;
    private readonly IParticipantRepository _participants;
    private readonly IUserRepository _users;
    private readonly IMovieRepository _movies;
    private readonly IMovieRatingRepository _ratings;
    private readonly IPushSubscriptionRepository _subscriptions;
    private readonly ReminderDelivery _delivery;
    private readonly TimeProvider _clock;
    private readonly ILogger<RatingReminderPass> _logger;

    public RatingReminderPass(
        IEventRepository events,
        IParticipantRepository participants,
        IUserRepository users,
        IMovieRepository movies,
        IMovieRatingRepository ratings,
        IPushSubscriptionRepository subscriptions,
        IPushNotificationSender sender,
        IUserNotificationRepository notifications,
        INotificationDedupRepository dedup,
        TimeProvider clock,
        ILogger<RatingReminderPass> logger)
    {
        _events = events;
        _participants = participants;
        _users = users;
        _movies = movies;
        _ratings = ratings;
        _subscriptions = subscriptions;
        _delivery = new ReminderDelivery(dedup, notifications, sender);
        _clock = clock;
        _logger = logger;
    }

    public async Task<RatingReminderPassResult> RunAsync(CancellationToken ct = default)
    {
        var now = _clock.GetUtcNow();
        var today = EventRecurrence.TodayInParis(now);
        var candidates = await _events.ListWithWinnerStartingBetweenAsync(
            ParisMidnightUtc(today.AddDays(-CatchUpDays)),
            ParisMidnightUtc(today),
            ct);
        var finishedNights = candidates
            .Where(e => e.HasWinner && e.IsFinished(now))
            .ToList();

        if (finishedNights.Count == 0)
            return new RatingReminderPassResult(0, 0);

        _logger.LogInformation("Rating reminders: {Count} finished movie night(s) to look at", finishedNights.Count);

        var reminded = 0;
        foreach (var evt in finishedNights)
            reminded += await RemindNightAsync(evt, now, ct);

        return new RatingReminderPassResult(finishedNights.Count, reminded);
    }

    private static DateTimeOffset ParisMidnightUtc(DateOnly day)
    {
        var date = day.ToString("yyyy-MM-dd", System.Globalization.CultureInfo.InvariantCulture);
        return EventSchedule.TryGetStartUtc(date, "00:00", out var utc)
            ? utc
            : new DateTimeOffset(day.ToDateTime(TimeOnly.MinValue), TimeSpan.Zero);
    }

    private async Task<int> RemindNightAsync(Event evt, DateTimeOffset now, CancellationToken ct)
    {
        var participants = (await _participants.ListByEventIdAsync(evt.Id, ct))
            .Where(p => !string.IsNullOrEmpty(p.UserId))
            .ToList();
        if (participants.Count == 0)
            return 0;

        var winners = await WinnerMovies.ListAsync(_movies, evt, ct);
        if (winners.Count == 0)
            return 0;

        var ratedMovieIds = (await _ratings.ListByEventIdAsync(evt.Id, ct))
            .GroupBy(r => r.ParticipantId)
            .ToDictionary(g => g.Key, g => g.Select(r => r.MovieId).ToHashSet());

        var pendingByUserId = new Dictionary<string, Movie>();
        foreach (var participant in participants)
        {
            var rated = ratedMovieIds.GetValueOrDefault(participant.Id);
            var firstUnrated = winners.FirstOrDefault(w => rated is null || !rated.Contains(w.Id));
            if (firstUnrated is not null)
                pendingByUserId.TryAdd(participant.UserId!, firstUnrated);
        }

        if (pendingByUserId.Count == 0)
            return 0;

        var users = (await _users.ListByIdsAsync(pendingByUserId.Keys.ToList(), ct))
            .Where(u => u.NotifiesOn(UserNotificationType.RatingReminder))
            .ToList();
        if (users.Count == 0)
            return 0;

        var subsByUser = (await _subscriptions.ListByUserIdsAsync(users.Select(u => u.Id).ToHashSet(), ct))
            .GroupBy(s => s.UserId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var reminded = 0;
        foreach (var user in users)
        {
            if (await RemindUserAsync(user, evt, pendingByUserId[user.Id], now, subsByUser, ct))
                reminded++;
        }

        return reminded;
    }

    private Task<bool> RemindUserAsync(
        User user,
        Event evt,
        Movie movie,
        DateTimeOffset now,
        Dictionary<string, List<PushSubscription>> subsByUser,
        CancellationToken ct)
    {
        var push = new PushMessage(
            Title: "Alors, ce film ? ⭐",
            Body: $"{movie.Title}, vu pendant {evt.Title} : donne-lui ta note !",
            Tag: $"rating-reminder-{evt.Id}",
            Url: $"/e/{evt.Slug}?rate"
        );
        var inApp = new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.RatingReminder,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            MovieTitle = movie.Title,
            IsRead = false,
            CreatedAt = now
        };
        return _delivery.DeliverAsync(inApp, subsByUser.GetValueOrDefault(user.Id) ?? [], push, ct);
    }
}
