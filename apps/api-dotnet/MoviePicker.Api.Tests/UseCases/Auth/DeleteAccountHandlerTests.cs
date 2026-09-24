using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Security;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Auth;

public sealed class DeleteAccountHandlerTests
{
    private sealed class Fixture
    {
        public InMemoryUserRepository Users { get; } = new();
        public InMemoryEventRepository Events { get; } = new();
        public InMemoryParticipantRepository Participants { get; } = new();
        public InMemoryUserNotificationRepository Notifications { get; } = new();
        public InMemoryPushSubscriptionRepository Push { get; } = new();
        public InMemoryFollowRepository Follows { get; } = new();
        public InMemoryWatchlistRepository Watchlist { get; } = new();
        public InMemoryPasswordResetTokenRepository ResetTokens { get; } = new();
        public InMemoryVoteRepository Votes { get; } = new();
        public InMemorySeenMarkRepository SeenMarks { get; } = new();
        public Mock<IAuthSessionInvalidator> Sessions { get; } = new();
        public IdentityPasswordHasher Hasher { get; } = new IdentityPasswordHasher();

        public DeleteAccountHandler CreateHandler() =>
            new(
                Users,
                Hasher,
                Events,
                Participants,
                Notifications,
                Push,
                Follows,
                Watchlist,
                ResetTokens,
                Sessions.Object,
                new InMemoryUnitOfWork(),
            NullLogger<DeleteAccountHandler>.Instance);
    }

    private static async Task<User> SeedUserAsync(Fixture f, string password)
    {
        var user = new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        user = user with { PasswordHash = f.Hasher.Hash(password) };
        return await f.Users.AddAsync(user);
    }

    [Fact]
    public async Task HandleAsync_WrongPassword_ThrowsUnauthorized_AndKeepsData()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        await f.Events.AddAsync(new Event { Title = "Soirée", Slug = "soiree", CreatorUserId = user.Id });

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "wrong" }));

        Assert.Equal(ErrorCodes.WrongPassword, ex.Reason);
        Assert.NotNull(await f.Users.GetByIdAsync(user.Id));
        f.Sessions.Verify(
            x => x.InvalidateAllForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    private static async Task<User> SeedUserWithoutPasswordAsync(Fixture f, string handle = "neo")
    {
        var user = new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = handle,
            Identities = [new LinkedIdentity { Provider = "google", Subject = "g-1", Email = "neo@example.com", LinkedAt = DateTimeOffset.UtcNow }],
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        };
        return await f.Users.AddAsync(user);
    }

    [Fact]
    public async Task HandleAsync_NoPassword_WrongConfirmation_ThrowsUnauthorized_AndKeepsData()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "wrong" }));

        Assert.Equal(ErrorCodes.ConfirmationIncorrect, ex.Reason);
        Assert.NotNull(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_NoPassword_ConfirmationMatchesHandle_DeletesAccount()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "NEO" });

        Assert.Null(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_NoPassword_ConfirmationMatchesEmail_DeletesAccount()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "neo@example.com" });

        Assert.Null(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        await Assert.ThrowsAsync<NotFoundException>(() =>
            f.CreateHandler().HandleAsync("missing", new DeleteAccountRequest { Password = "abcd1234" }));
    }

    [Fact]
    public async Task HandleAsync_Success_DeletesPersonalData_AndAnonymizesSharedData()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");

        var createdEvent = await f.Events.AddAsync(
            new Event { Title = "Ma soirée", Slug = "ma-soiree", CreatorUserId = user.Id });
        var joinedEvent = await f.Events.AddAsync(
            new Event { Title = "Soirée amie", Slug = "soiree-amie", CreatorUserId = "other-1" });
        var participant = await f.Participants.AddAsync(new Participant
        {
            EventId = joinedEvent.Id,
            Pseudo = "Neo le vrai nom",
            UserId = user.Id,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        await f.Votes.UpsertAsync(new Vote
        {
            EventId = joinedEvent.Id,
            MovieId = "movie-1",
            ParticipantId = participant.Id,
            Value = 1
        });
        await f.SeenMarks.AddAsync(new SeenMark
        {
            EventId = joinedEvent.Id,
            MovieId = "movie-1",
            ParticipantId = participant.Id
        });
        await f.Notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.NewFollower,
            CreatedAt = DateTimeOffset.UtcNow
        });
        await f.Follows.FollowAsync(user.Id, "other-1");
        await f.Follows.FollowAsync("other-2", user.Id);
        await f.Push.UpsertAsync(new PushSubscription
        {
            UserId = user.Id,
            Endpoint = "https://push.example/abc",
            P256dh = "key",
            Auth = "auth",
            CreatedAt = DateTimeOffset.UtcNow
        });
        await f.ResetTokens.AddAsync(new PasswordResetToken
        {
            UserId = user.Id,
            TokenHash = "hash",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" });

        Assert.Null(await f.Users.GetByIdAsync(user.Id));

        var keptCreatedEvent = await f.Events.GetByIdOrSlugAsync(createdEvent.Slug);
        Assert.NotNull(keptCreatedEvent);
        Assert.Null(keptCreatedEvent!.CreatorUserId);

        var keptParticipants = await f.Participants.ListByEventIdAsync(joinedEvent.Id);
        var anonymized = Assert.Single(keptParticipants);
        Assert.Null(anonymized.UserId);
        Assert.Equal(DeleteAccountHandler.AnonymizedParticipantPseudo, anonymized.Pseudo);

        var keptVotes = await f.Votes.ListByParticipantIdsAsync(new[] { participant.Id });
        Assert.Single(keptVotes);
        var keptSeen = await f.SeenMarks.ListByParticipantIdsAsync(new[] { participant.Id });
        Assert.Single(keptSeen);

        Assert.Empty(await f.Notifications.ListByUserIdAsync(user.Id));
        Assert.Empty(await f.Push.ListByUserIdAsync(user.Id));
        var (following, followers) = await f.Follows.GetCountsAsync(user.Id);
        Assert.Equal(0, following);
        Assert.Equal(0, followers);
        Assert.Null(await f.ResetTokens.GetMostRecentForUserAsync(user.Id));
        f.Sessions.Verify(
            x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AnonymizesTheDeletedActorInOtherUsersNotifications()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        await f.Notifications.AddAsync(new UserNotification
        {
            UserId = "someone-else",
            Type = UserNotificationType.NewFollower,
            ActorHandle = user.Handle,
            ActorDisplayName = user.DisplayName,
            ActorAvatarId = "fox",
            CreatedAt = DateTimeOffset.UtcNow
        });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" });

        var kept = Assert.Single(await f.Notifications.ListByUserIdAsync("someone-else"));
        Assert.Null(kept.ActorHandle);
        Assert.Null(kept.ActorAvatarId);
        Assert.Equal(DeleteAccountHandler.AnonymizedParticipantPseudo, kept.ActorDisplayName);
    }

    [Fact]
    public async Task HandleAsync_MarksEveryJoinedNightAsChanged()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        await f.Participants.AddAsync(new Participant { EventId = "joined-1", Pseudo = "Neo", UserId = user.Id });
        await f.Participants.AddAsync(new Participant { EventId = "joined-2", Pseudo = "Neo", UserId = user.Id });
        var events = new Mock<IEventRepository>();
        events
            .Setup(r => r.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                ids.Select(id => new Event { Id = id, Title = id, Slug = id }).ToList());
        var handler = new DeleteAccountHandler(
            f.Users,
            f.Hasher,
            events.Object,
            f.Participants,
            f.Notifications,
            f.Push,
            f.Follows,
            f.Watchlist,
            f.ResetTokens,
            f.Sessions.Object,
            new InMemoryUnitOfWork(),
            NullLogger<DeleteAccountHandler>.Instance);

        await handler.HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" });

        events.Verify(r => r.MarkChangedAsync("joined-1", It.IsAny<CancellationToken>()), Times.Once);
        events.Verify(r => r.MarkChangedAsync("joined-2", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_JoinedNight_ServesTheAnonymousPseudoUnderANewWriteSequence()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var joined = await f.Events.AddAsync(new Event { Title = "Soirée amie", Slug = "soiree-amie", CreatorUserId = "other-1" });
        await f.Participants.AddAsync(new Participant { EventId = joined.Id, Pseudo = "Neo", UserId = user.Id });
        var before = (await f.Events.GetByIdOrSlugAsync(joined.Slug))!.WriteSeq;

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" });

        Assert.True((await f.Events.GetByIdOrSlugAsync(joined.Slug))!.WriteSeq > before);
    }

    [Fact]
    public async Task HandleAsync_ParticipationInADeletedNight_DoesNotBlockTheDeletion()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        await f.Participants.AddAsync(new Participant { EventId = "deleted-night", Pseudo = "Neo", UserId = user.Id });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" });

        Assert.Null(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_SecondDeletedAccountOfTheSameEvent_GetsADistinctAnonymousPseudo()
    {
        var f = new Fixture();
        var first = await SeedUserAsync(f, "abcd1234");
        var second = await f.Users.AddAsync(new User
        {
            Email = "trinity@example.com",
            DisplayName = "Trinity",
            Handle = "trinity",
            PasswordHash = f.Hasher.Hash("abcd1234"),
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow
        });
        var evt = await f.Events.AddAsync(new Event { Title = "Soirée", Slug = "soiree-partagee" });
        await f.Participants.AddAsync(new Participant { EventId = evt.Id, Pseudo = "Neo", UserId = first.Id });
        await f.Participants.AddAsync(new Participant { EventId = evt.Id, Pseudo = "Trinity", UserId = second.Id });

        await f.CreateHandler().HandleAsync(first.Id, new DeleteAccountRequest { Password = "abcd1234" });
        await f.CreateHandler().HandleAsync(second.Id, new DeleteAccountRequest { Password = "abcd1234" });

        var pseudos = (await f.Participants.ListByEventIdAsync(evt.Id)).Select(p => p.Pseudo).ToList();
        Assert.Equal(2, pseudos.Distinct().Count());
        Assert.All(pseudos, p => Assert.StartsWith(DeleteAccountHandler.AnonymizedParticipantPseudo, p));
    }
}
