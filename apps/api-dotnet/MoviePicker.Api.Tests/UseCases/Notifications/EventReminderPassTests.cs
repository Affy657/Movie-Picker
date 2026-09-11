using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Notifications;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using Xunit;
using MoviePicker.Api.Tests.Builders;

namespace MoviePicker.Api.Tests.UseCases.Notifications;

public sealed class EventReminderPassTests
{
    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FakeTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private static readonly DateTimeOffset Now = new(2026, 3, 10, 18, 0, 0, TimeSpan.Zero);

    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IPushSubscriptionRepository> _subscriptions = new();
    private readonly Mock<IPushNotificationSender> _sender = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<INotificationDedupRepository> _dedup = new();

    public EventReminderPassTests()
    {
        _events.Setup(r => r.ListOpenEventsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _participants.Setup(r => r.ListByEventIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _subscriptions.Setup(r => r.ListByUserIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _subscriptions.Setup(r => r.ListByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _movies.Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int>());
        _notifications.Setup(r => r.ExistsAsync(It.IsAny<string>(), It.IsAny<UserNotificationType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _dedup.Setup(r => r.TryClaimAsync(It.IsAny<string>(), It.IsAny<UserNotificationType>(), It.IsAny<string>(), It.IsAny<NotificationDedupChannel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    private EventReminderPass CreatePass(DateTimeOffset? now = null) => new(
        _events.Object,
        _participants.Object,
        _users.Object,
        _movies.Object,
        _subscriptions.Object,
        _sender.Object,
        _notifications.Object,
        _dedup.Object,
        new FakeTimeProvider(now ?? Now),
        NullLogger<EventReminderPass>.Instance);

    private static (string Date, string Time) ParisFields(DateTimeOffset startUtc)
    {
        var paris = TimeZoneInfo.ConvertTime(startUtc, EventSchedule.ParisTimeZone);
        return (paris.ToString("yyyy-MM-dd"), paris.ToString("HH:mm"));
    }

    private static Event EventStartingAt(string id, DateTimeOffset startUtc)
    {
        var (date, time) = ParisFields(startUtc);
        return new Event
        {
            Id = id,
            Title = "Soirée " + id,
            Slug = "soiree-" + id,
            HostToken = "ht-" + id,
            CreatorUserId = "host",
            Date = date,
            Time = time,
            CreatedAt = Now,
            UpdatedAt = Now
        };
    }

    private void GivenOpenEvents(params Event[] events) =>
        _events.Setup(r => r.ListOpenEventsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(events);

    private void GivenParticipants(string eventId, params string?[] userIds) =>
        _participants.Setup(r => r.ListByEventIdAsync(eventId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(userIds
                .Select((uid, i) => new Participant
                {
                    Id = $"p{i}",
                    EventId = eventId,
                    Pseudo = uid ?? "invite",
                    UserId = uid
                })
                .ToList());

    private void GivenUsers(params User[] users) =>
        _users.Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                users.Where(u => ids.Contains(u.Id)).ToList());

    private void GivenPushSubscription(string userId) =>
        _subscriptions.Setup(r => r.ListByUserIdsAsync(It.Is<IReadOnlyCollection<string>>(ids => ids.Contains(userId)), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new PushSubscription { Id = "s-" + userId, UserId = userId, Endpoint = "https://push/" + userId, P256dh = "k", Auth = "a" }]);

    private static User Subscriber(string id, params (UserNotificationType Type, bool Enabled)[] prefs) =>
        new()
        {
            Id = id,
            DisplayName = id,
            NotificationPreferences = prefs.Length == 0
                ? NotificationPreferenceDefaults.All()
                : prefs.ToDictionary(p => p.Type, p => p.Enabled)
        };

    private void VerifyInboxAdded(string userId, UserNotificationType type, Times times) =>
        _notifications.Verify(
            n => n.AddAsync(It.Is<UserNotification>(u => u.UserId == userId && u.Type == type), It.IsAny<CancellationToken>()),
            times);

    [Fact]
    public async Task RunAsync_NoOpenEvent_DoesNothing()
    {
        var result = await CreatePass().RunAsync();

        Assert.Equal(new EventReminderPassResult(0, 0, 0, 0), result);
        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_EventOneHourAway_SendsPushAndFillsInbox()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");

        var result = await CreatePass().RunAsync();

        Assert.Equal(1, result.Reminders1h);
        Assert.Equal(0, result.Reminders24h);
        _sender.Verify(
            s => s.SendAsync(It.Is<PushSubscription>(p => p.UserId == "u1"), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()),
            Times.Once);
        VerifyInboxAdded("u1", UserNotificationType.EventReminder1h, Times.Once());
    }

    [Fact]
    public async Task RunAsync_EventOneDayAway_SendsThe24hReminderWithItsOwnWording()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(24)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");

        var result = await CreatePass().RunAsync();

        Assert.Equal(0, result.Reminders1h);
        Assert.Equal(1, result.Reminders24h);
        _sender.Verify(
            s => s.SendAsync(
                It.IsAny<PushSubscription>(),
                It.Is<PushMessage>(m => m.Title == "J-1 !" && m.Body.Contains("Demain", StringComparison.Ordinal)),
                It.IsAny<CancellationToken>()),
            Times.Once);
        VerifyInboxAdded("u1", UserNotificationType.EventReminder24h, Times.Once());
    }

    [Theory]
    [InlineData(45)]
    [InlineData(85)]
    [InlineData(180)]
    [InlineData(60 * 22)]
    public async Task RunAsync_EventOutsideEveryWindow_SendsNothing(int minutesAway)
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddMinutes(minutesAway)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");

        var result = await CreatePass().RunAsync();

        Assert.Equal(0, result.Reminders1h);
        Assert.Equal(0, result.Reminders24h);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(50)]
    [InlineData(80)]
    public async Task RunAsync_EventOnTheEdgeOfTheOneHourWindow_IsIncluded(int minutesAway)
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddMinutes(minutesAway)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(1, result.Reminders1h);
    }

    [Fact]
    public async Task RunAsync_SummerTimeInParis_PlacesAnEightThirtyPmEventInTheOneHourWindow()
    {
        var julyEvening = new DateTimeOffset(2026, 7, 15, 17, 30, 0, TimeSpan.Zero);
        var evt = EventStartingAt("e1", julyEvening.AddHours(1)) with { Date = "2026-07-15", Time = "20:30" };
        GivenOpenEvents(evt);
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));

        var result = await CreatePass(julyEvening).RunAsync();

        Assert.Equal(1, result.Reminders1h);
        VerifyInboxAdded("u1", UserNotificationType.EventReminder1h, Times.Once());
    }

    [Fact]
    public async Task RunAsync_WinterTimeInParis_PlacesAnEightThirtyPmEventInTheOneHourWindow()
    {
        var januaryEvening = new DateTimeOffset(2026, 1, 15, 18, 30, 0, TimeSpan.Zero);
        var evt = EventStartingAt("e1", januaryEvening.AddHours(1)) with { Date = "2026-01-15", Time = "20:30" };
        GivenOpenEvents(evt);
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));

        var result = await CreatePass(januaryEvening).RunAsync();

        Assert.Equal(1, result.Reminders1h);
    }

    [Fact]
    public async Task RunAsync_UnparseableSchedule_SkipsTheEvent()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)) with { Date = "pas-une-date", Time = "20:30" });
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(0, result.Reminders1h);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_ParticipantOptedOut_IsNotNotified()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1", (UserNotificationType.EventReminder1h, false)));
        GivenPushSubscription("u1");

        await CreatePass().RunAsync();

        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_GuestParticipantWithoutAccount_IsIgnored()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", null, null);

        await CreatePass().RunAsync();

        _users.Verify(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_ReplayedImmediately_SendsNothingMore()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");

        var claims = 0;
        _dedup.Setup(r => r.TryClaimAsync(It.IsAny<string>(), It.IsAny<UserNotificationType>(), It.IsAny<string>(), It.IsAny<NotificationDedupChannel>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => ++claims <= 2);

        var pass = CreatePass();
        await pass.RunAsync();
        _sender.Invocations.Clear();
        _notifications.Invocations.Clear();
        await pass.RunAsync();

        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_InboxAlreadyHasTheReminder_DoesNotAddItTwice()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        _notifications.Setup(r => r.ExistsAsync("u1", UserNotificationType.EventReminder1h, "e1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        await CreatePass().RunAsync();

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_NoPushSubscription_StillFillsTheInbox()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));

        await CreatePass().RunAsync();

        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        VerifyInboxAdded("u1", UserNotificationType.EventReminder1h, Times.Once());
    }

    [Fact]
    public async Task RunAsync_PushAlreadyClaimed_SkipsPushButStillFillsTheInbox()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");
        _dedup.Setup(r => r.TryClaimAsync("u1", It.IsAny<UserNotificationType>(), "e1", NotificationDedupChannel.Push, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        await CreatePass().RunAsync();

        _sender.Verify(s => s.SendAsync(It.IsAny<PushSubscription>(), It.IsAny<PushMessage>(), It.IsAny<CancellationToken>()), Times.Never);
        VerifyInboxAdded("u1", UserNotificationType.EventReminder1h, Times.Once());
    }

    [Fact]
    public async Task RunAsync_NoMovieProposedOneHourBefore_NudgesInsteadOfTheStandardWording()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");
        _movies.Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["e1"] = 0 });

        await CreatePass().RunAsync();

        _sender.Verify(
            s => s.SendAsync(
                It.IsAny<PushSubscription>(),
                It.Is<PushMessage>(m => m.Title == "Toujours rien au programme ?"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_MoviesAlreadyProposed_UsesTheStandardWording()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");
        _movies.Setup(r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<string, int> { ["e1"] = 3 });

        await CreatePass().RunAsync();

        _sender.Verify(
            s => s.SendAsync(
                It.IsAny<PushSubscription>(),
                It.Is<PushMessage>(m => m.Title == "Dans 1 heure !"),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_TwentyFourHourWindow_DoesNotLookAtProposedMovies()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(24)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));

        await CreatePass().RunAsync();

        _movies.Verify(
            r => r.CountByEventIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task RunAsync_ReminderCarriesTheEventIdentity()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1");
        GivenUsers(Subscriber("u1"));
        GivenPushSubscription("u1");

        await CreatePass().RunAsync();

        _sender.Verify(
            s => s.SendAsync(
                It.IsAny<PushSubscription>(),
                It.Is<PushMessage>(m => m.Url == "/e/soiree-e1" && m.Tag == "reminder-EventReminder1h-e1"),
                It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(u => u.EventId == "e1" && u.EventSlug == "soiree-e1" && !u.IsRead && u.CreatedAt == Now),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task RunAsync_SeveralParticipants_NotifiesEachOfThemOnce()
    {
        GivenOpenEvents(EventStartingAt("e1", Now.AddHours(1)));
        GivenParticipants("e1", "u1", "u2", "u1");
        GivenUsers(Subscriber("u1"), Subscriber("u2"));

        await CreatePass().RunAsync();

        VerifyInboxAdded("u1", UserNotificationType.EventReminder1h, Times.Once());
        VerifyInboxAdded("u2", UserNotificationType.EventReminder1h, Times.Once());
    }

    [Fact]
    public async Task RunAsync_PendingEvent_NotifiesTheHost()
    {
        var started = Now - EventSchedule.PendingDelay - TimeSpan.FromHours(1);
        GivenOpenEvents(EventStartingAt("e1", started));
        _users.Setup(r => r.GetByIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Subscriber("host"));
        _subscriptions.Setup(r => r.ListByUserIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync([new PushSubscription { Id = "s1", UserId = "host", Endpoint = "https://push/host", P256dh = "k", Auth = "a" }]);

        var result = await CreatePass().RunAsync();

        Assert.Equal(1, result.PendingEvents);
        _sender.Verify(
            s => s.SendAsync(
                It.IsAny<PushSubscription>(),
                It.Is<PushMessage>(m => m.Tag == "pending-e1"),
                It.IsAny<CancellationToken>()),
            Times.Once);
        VerifyInboxAdded("host", UserNotificationType.EventPending, Times.Once());
    }

    [Fact]
    public async Task RunAsync_PendingEventWithAWinner_IsNotPending()
    {
        var started = Now - EventSchedule.PendingDelay - TimeSpan.FromHours(1);
        GivenOpenEvents(EventStartingAt("e1", started) with { Winners = TestWinners.Won("m1") });
        _users.Setup(r => r.GetByIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Subscriber("host"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(0, result.PendingEvents);
        VerifyInboxAdded("host", UserNotificationType.EventPending, Times.Never());
    }

    [Fact]
    public async Task RunAsync_PendingEventWithoutCreator_IsIgnored()
    {
        var started = Now - EventSchedule.PendingDelay - TimeSpan.FromHours(1);
        GivenOpenEvents(EventStartingAt("e1", started) with { CreatorUserId = null });

        var result = await CreatePass().RunAsync();

        Assert.Equal(0, result.PendingEvents);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_HostOptedOutOfPending_IsNotNotified()
    {
        var started = Now - EventSchedule.PendingDelay - TimeSpan.FromHours(1);
        GivenOpenEvents(EventStartingAt("e1", started));
        _users.Setup(r => r.GetByIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Subscriber("host", (UserNotificationType.EventPending, false)));

        var result = await CreatePass().RunAsync();

        Assert.Equal(1, result.PendingEvents);
        VerifyInboxAdded("host", UserNotificationType.EventPending, Times.Never());
    }

    [Fact]
    public async Task RunAsync_HostAccountGone_IsIgnored()
    {
        var started = Now - EventSchedule.PendingDelay - TimeSpan.FromHours(1);
        GivenOpenEvents(EventStartingAt("e1", started));
        _users.Setup(r => r.GetByIdAsync("host", It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await CreatePass().RunAsync();

        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task RunAsync_ReportsWhatEachWindowMatched()
    {
        GivenOpenEvents(
            EventStartingAt("e1", Now.AddHours(1)),
            EventStartingAt("e2", Now.AddHours(24)),
            EventStartingAt("e3", Now.AddHours(5)));
        GivenParticipants("e1", "u1");
        GivenParticipants("e2", "u1");
        GivenUsers(Subscriber("u1"));

        var result = await CreatePass().RunAsync();

        Assert.Equal(3, result.OpenEvents);
        Assert.Equal(1, result.Reminders1h);
        Assert.Equal(1, result.Reminders24h);
        Assert.Equal(0, result.PendingEvents);
    }
}
