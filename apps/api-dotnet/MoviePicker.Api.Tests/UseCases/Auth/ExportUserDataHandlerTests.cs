using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class ExportUserDataHandlerTests
{
    private static readonly DateTimeOffset TestEpoch = new(2026, 6, 11, 9, 0, 0, TimeSpan.Zero);

    private sealed class FakeTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;
        public FakeTimeProvider(DateTimeOffset now) => _now = now;
        public override DateTimeOffset GetUtcNow() => _now;
    }

    private sealed class Fixture
    {
        public InMemoryUserRepository Users { get; } = new();
        public InMemoryUserNotificationRepository Notifications { get; } = new();
        public InMemoryFollowRepository Follows { get; } = new();
        public InMemoryEventRepository Events { get; } = new();
        public InMemoryParticipantRepository Participants { get; } = new();
        public InMemoryVoteRepository Votes { get; } = new();
        public InMemorySeenMarkRepository SeenMarks { get; } = new();
        public InMemoryPushSubscriptionRepository Push { get; } = new();
        public InMemoryWatchlistRepository Watchlist { get; } = new();

        public ExportUserDataHandler CreateHandler() =>
            new(
                Users,
                Notifications,
                Follows,
                Events,
                Participants,
                Votes,
                SeenMarks,
                Push,
                Watchlist,
                new FakeTimeProvider(TestEpoch));
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        await Assert.ThrowsAsync<NotFoundException>(() => f.CreateHandler().HandleAsync("missing"));
    }

    [Fact]
    public async Task HandleAsync_AggregatesAllUserData()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            Bio = "Hello",
            AccentColor = AccentColor.Purple,
            UiTheme = UiThemePreference.Dark,
            CreatedAt = TestEpoch.AddDays(-10),
            UpdatedAt = TestEpoch.AddDays(-1)
        });
        var followee = await f.Users.AddAsync(new User
        {
            Email = "trinity@example.com",
            DisplayName = "Trinity",
            Handle = "trinity"
        });

        await f.Events.AddAsync(new Event { Title = "Ma soirée", Slug = "ma-soiree", CreatorUserId = user.Id });
        var joined = await f.Events.AddAsync(new Event { Title = "Soirée amie", Slug = "soiree-amie", CreatorUserId = followee.Id });
        var participant = await f.Participants.AddAsync(new Participant
        {
            EventId = joined.Id,
            Pseudo = "Neo",
            UserId = user.Id,
            CreatedAt = TestEpoch.AddDays(-2),
            UpdatedAt = TestEpoch.AddDays(-2)
        });
        await f.Votes.UpsertAsync(new Vote { EventId = joined.Id, MovieId = "movie-1", ParticipantId = participant.Id, Value = 1 });
        await f.SeenMarks.AddAsync(new SeenMark { EventId = joined.Id, MovieId = "movie-2", ParticipantId = participant.Id });
        await f.Notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.NewFollower,
            ActorHandle = "trinity",
            CreatedAt = TestEpoch.AddDays(-3)
        });
        await f.Follows.FollowAsync(user.Id, followee.Id);
        await f.Push.UpsertAsync(new PushSubscription
        {
            UserId = user.Id,
            Endpoint = "https://push.example/abc",
            P256dh = "key",
            Auth = "auth",
            CreatedAt = TestEpoch.AddDays(-4)
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal(TestEpoch, export.ExportedAt);
        Assert.Equal("neo@example.com", export.Profile.Email);
        Assert.Equal("neo", export.Profile.Handle);
        Assert.Equal("Purple", export.Profile.AccentColor);
        Assert.Equal("Dark", export.Profile.UiTheme);

        Assert.Single(export.CreatedEvents);
        Assert.Equal("Ma soirée", export.CreatedEvents[0].Title);

        var participation = Assert.Single(export.Participations);
        Assert.Equal(joined.Id, participation.EventId);
        Assert.Equal("Soirée amie", participation.EventTitle);
        Assert.Single(participation.Votes);
        Assert.Single(participation.SeenMarks);

        var following = Assert.Single(export.Following);
        Assert.Equal("trinity", following.Handle);

        Assert.Single(export.Notifications);
        Assert.Equal("NewFollower", export.Notifications[0].Type);

        var push = Assert.Single(export.PushSubscriptions);
        Assert.Equal("https://push.example/abc", push.Endpoint);
    }
}
