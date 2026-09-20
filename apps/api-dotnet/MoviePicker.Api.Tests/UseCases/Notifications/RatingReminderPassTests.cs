using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class RatingReminderPassTests
{
    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FakeTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private static readonly DateTimeOffset TenInParis = new(2026, 3, 10, 9, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IMovieRatingRepository> _ratings = new();
    private readonly Mock<IPushSubscriptionRepository> _subscriptions = new();
    private readonly Mock<IPushNotificationSender> _sender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<INotificationDedupRepository> _dedup = new();

    public RatingReminderPassTests()
    {
        _events.Setup(r => r.ListWithWinnerStartingBetweenAsync(
                It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _participants.Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _ratings.Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _subscriptions.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _notifications.Setup(r => r.ExistsAsync(It.IsAny<string>(), It.IsAny<UserNotificationType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _dedup.Setup(r => r.TryClaimAsync(It.IsAny<string>(), It.IsAny<UserNotificationType>(), It.IsAny<string>(), It.IsAny<NotificationDedupChannel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    private RatingReminderPass CreatePass(DateTimeOffset? now = null) => new(
        _events.Object,
        _participants.Object,
        _users.Object,
        _movies.Object,
        _ratings.Object,
        _subscriptions.Object,
        _sender.Object,
        _notifications.Object,
        _dedup.Object,
        new FakeTimeProvider(now ?? TenInParis),
        NullLogger<RatingReminderPass>.Instance);

    private static Event FinishedNight(string id, string date, params string[] winnerMovieIds) => new()
    {
        Id = id,
        Title = "Soirée " + id,
        Slug = "soiree-" + id,
        HostToken = "ht-" + id,
        CreatorUserId = "host",
        Date = date,
        Time = "20:00",
        Winners = winnerMovieIds
            .Select(movieId => new EventWinner { MovieId = movieId, Method = WinnerPickMethod.Wheel, PickedAt = TenInParis.AddDays(-1) })
            .ToList(),
        CreatedAt = TenInParis.AddDays(-2),
        UpdatedAt = TenInParis.AddDays(-1)
    };

    private void GivenNights(params Event[] events) =>
        _events.Setup(r => r.ListWithWinnerStartingBetweenAsync(
                It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(events);

    private void GivenWinners(string eventId, params (string Id, string Title)[] movies) =>
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) => movies
                .Where(m => ids.Contains(m.Id))
                .Select(m => new Movie { Id = m.Id, EventId = eventId, Title = m.Title })
                .ToList());

    private void GivenParticipants(string eventId, params (string ParticipantId, string? UserId)[] participants) =>
        _participants.Setup(r => r.ListByEventIdAsync(eventId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(participants
                .Select(p => new Participant { Id = p.ParticipantId, EventId = eventId, Pseudo = p.UserId ?? "invite", UserId = p.UserId })
                .ToList());

    private void GivenRatings(string eventId, params (string ParticipantId, string MovieId)[] ratings) =>
        _ratings.Setup(r => r.ListByEventIdAsync(eventId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(ratings
                .Select(r => new MovieRating { Id = r.ParticipantId + r.MovieId, EventId = eventId, ParticipantId = r.ParticipantId, MovieId = r.MovieId, Value = 8 })
                .ToList());

    private void GivenUsers(params User[] users) =>
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                users.Where(u => ids.Contains(u.Id)).ToList());

    private void GivenPushSubscription(string userId) =>
        _subscriptions.Setup(r => r.ListByUserIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Contains(userId)), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new PushSubscription { Id = "s-" + userId, UserId = userId, Endpoint = "https://push/" + userId, P256dh = "k", Auth = "a" }]);

    private static User Member(string id, params (UserNotificationType Type, bool Enabled)[] prefs) => new()
    {
        Id = id,
        DisplayName = id,
        NotificationPreferences = prefs.Length == 0
            ? NotificationPreferenceDefaults.All()
            : prefs.ToDictionary(p => p.Type, p => p.Enabled)
    };

    private void GivenOneUnratedNight()
    {
        GivenNights(FinishedNight("e1", "2026-03-09", "m1"));
        GivenWinners("e1", ("m1", "Inception"));
        GivenParticipants("e1", ("p1", "u1"));
        GivenUsers(Member("u1"));
        GivenPushSubscription("u1");
    }

    private void VerifyNothingSent()
    {
        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_QueriesTheWinnersOfTheThreeParisDaysBeforeToday()
    {
        DateTimeOffset? from = null;
        DateTimeOffset? to = null;
        _events.Setup(r => r.ListWithWinnerStartingBetweenAsync(
                It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((DateTimeOffset f, DateTimeOffset t, CancellationToken _) => { from = f; to = t; })
            .ReturnsAsync([]);

        await CreatePass().RunAsync();

        Assert.Equal(new DateTimeOffset(2026, 3, 6, 23, 0, 0, TimeSpan.Zero), from);
        Assert.Equal(new DateTimeOffset(2026, 3, 9, 23, 0, 0, TimeSpan.Zero), to);
    }

    [Fact]
    public async Task RunAsync_SummerTime_StillCutsTheWindowAtParisMidnight()
    {
        DateTimeOffset? from = null;
        DateTimeOffset? to = null;
        _events.Setup(r => r.ListWithWinnerStartingBetweenAsync(
                It.IsAny<DateTimeOffset>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((DateTimeOffset f, DateTimeOffset t, CancellationToken _) => { from = f; to = t; })
            .ReturnsAsync([]);

        await CreatePass(new DateTimeOffset(2026, 7, 15, 8, 0, 0, TimeSpan.Zero)).RunAsync();

        Assert.Equal(new DateTimeOffset(2026, 7, 11, 22, 0, 0, TimeSpan.Zero), from);
        Assert.Equal(new DateTimeOffset(2026, 7, 14, 22, 0, 0, TimeSpan.Zero), to);
    }

    [Fact]
    public async Task RunAsync_NoFinishedNight_DoesNothing()
    {
        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(0, 0), result);
        VerifyNothingSent();
    }

    [Fact]
    public async Task RunAsync_ParticipantWithoutARating_GetsAPushOpeningTheRatingOfTheMovie()
    {
        GivenOneUnratedNight();

        await CreatePass().RunAsync();

        _sender.Verify(
            s => s.SendAsync(
                It.Is<PushSubscription>(p => p.UserId == "u1"),
                It.Is<PushMessage>(m =>
                    m.Url == "/e/soiree-e1?rate"
                    && m.Body.Contains("Inception", StringComparison.Ordinal)
                    && m.Body.Contains("Soirée e1", StringComparison.Ordinal)
                    && m.Tag == "rating-reminder-e1"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_ParticipantWithoutARating_GetsAnInboxEntryNamingTheMovie()
    {
        GivenOneUnratedNight();

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 1), result);
        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(u =>
                    u.UserId == "u1"
                    && u.Type == UserNotificationType.RatingReminder
                    && u.EventId == "e1"
                    && u.EventSlug == "soiree-e1"
                    && u.EventTitle == "Soirée e1"
                    && u.MovieTitle == "Inception"
                    && !u.IsRead
                    && u.CreatedAt == TenInParis),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_ParticipantWhoRatedEveryWinner_IsLeftAlone()
    {
        GivenOneUnratedNight();
        GivenRatings("e1", ("p1", "m1"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 0), result);
        VerifyNothingSent();
    }

    [Fact]
    public async Task RunAsync_TwoWinnersOneRated_SendsASingleReminderNamingTheUnratedOne()
    {
        GivenNights(FinishedNight("e1", "2026-03-09", "m1", "m2"));
        GivenWinners("e1", ("m1", "Inception"), ("m2", "Heat"));
        GivenParticipants("e1", ("p1", "u1"));
        GivenRatings("e1", ("p1", "m1"));
        GivenUsers(Member("u1"));
        GivenPushSubscription("u1");

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 1), result);
        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.MovieTitle == "Heat"), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_NightWithoutAWinner_SendsNothing()
    {
        GivenNights(FinishedNight("e1", "2026-03-09"));
        GivenParticipants("e1", ("p1", "u1"));
        GivenUsers(Member("u1"));
        GivenPushSubscription("u1");

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(0, 0), result);
        VerifyNothingSent();
    }

    [Fact]
    public async Task RunAsync_NightStillLive_WaitsForItToFinish()
    {
        GivenNights(FinishedNight("e1", "2026-03-09") with { Time = "23:30", Winners = [new EventWinner { MovieId = "m1", Method = WinnerPickMethod.Wheel, PickedAt = TenInParis }] });
        GivenWinners("e1", ("m1", "Inception"));
        GivenParticipants("e1", ("p1", "u1"));
        GivenUsers(Member("u1"));

        var result = await CreatePass(new DateTimeOffset(2026, 3, 9, 23, 30, 0, TimeSpan.Zero)).RunAsync();

        Assert.Equal(new RatingReminderPassResult(0, 0), result);
        VerifyNothingSent();
    }

    [Fact]
    public async Task RunAsync_NightClosedByTheHost_IsReminded()
    {
        GivenNights(FinishedNight("e1", "2026-03-08", "m1") with { ClosedAt = TenInParis.AddHours(-1) });
        GivenWinners("e1", ("m1", "Inception"));
        GivenParticipants("e1", ("p1", "u1"));
        GivenUsers(Member("u1"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 1), result);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunAsync_PreferenceOff_SendsNeitherPushNorInbox()
    {
        GivenOneUnratedNight();
        GivenUsers(Member("u1", (UserNotificationType.RatingReminder, false)));

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 0), result);
        VerifyNothingSent();
    }

    [Fact]
    public async Task RunAsync_AlreadyClaimed_DoesNotSendTwice()
    {
        GivenOneUnratedNight();
        _dedup.Setup(r => r.TryClaimAsync("u1", UserNotificationType.RatingReminder, "e1", It.IsAny<NotificationDedupChannel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 0), result);
        VerifyNothingSent();
    }

    [Fact]
    public async Task RunAsync_InboxEntryAlreadyThere_DoesNotAddAnother()
    {
        GivenOneUnratedNight();
        _notifications.Setup(r => r.ExistsAsync("u1", UserNotificationType.RatingReminder, "e1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await CreatePass().RunAsync();

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_NoPushSubscription_FillsTheInboxOnly()
    {
        GivenOneUnratedNight();
        _subscriptions.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 1), result);
        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1"), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunAsync_ParticipantWithoutAnAccount_IsSkipped()
    {
        GivenNights(FinishedNight("e1", "2026-03-09", "m1"));
        GivenWinners("e1", ("m1", "Inception"));
        GivenParticipants("e1", ("p1", null), ("p2", "u2"));
        GivenUsers(Member("u2"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(1, 1), result);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u2"), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RunAsync_SeveralNights_CountsEveryRemindedParticipant()
    {
        GivenNights(FinishedNight("e1", "2026-03-09", "m1"), FinishedNight("e2", "2026-03-07", "m2"));
        _movies.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) => ids
                .Select(id => new Movie { Id = id, EventId = id == "m1" ? "e1" : "e2", Title = "Film " + id })
                .ToList());
        GivenParticipants("e1", ("p1", "u1"), ("p2", "u2"));
        GivenParticipants("e2", ("p3", "u1"));
        GivenRatings("e1", ("p2", "m1"));
        GivenUsers(Member("u1"), Member("u2"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(new RatingReminderPassResult(2, 2), result);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1" && u.EventId == "e1"), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u1" && u.EventId == "e2"), It.IsAny<CancellationToken>()), Times.Once);
        _notifications.Verify(n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == "u2"), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RatingReminder_IsOnByDefault()
    {
        Assert.True(NotificationPreferenceDefaults.For(UserNotificationType.RatingReminder));
        Assert.True(NotificationPreferenceDefaults.All()[UserNotificationType.RatingReminder]);
    }
}
