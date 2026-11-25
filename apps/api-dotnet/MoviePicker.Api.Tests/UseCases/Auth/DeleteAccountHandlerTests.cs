using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Application.UseCases.RecurringEvents;
using MoviePicker.Api.Application.UseCases.Shared;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Security;
using MoviePicker.Api.Tests.Builders;
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
        public InMemoryMovieListRepository MovieLists { get; } = new();
        public InMemoryFriendGroupRepository Groups { get; } = new();
        public InMemoryWatchedTitleRepository WatchedTitles { get; } = new();
        public InMemorySavedListRepository SavedLists { get; } = new();
        public InMemoryPasswordResetTokenRepository ResetTokens { get; } = new();
        public InMemoryEmailVerificationTokenRepository VerificationTokens { get; } = new();
        public InMemoryVoteRepository Votes { get; } = new();
        public InMemorySeenMarkRepository SeenMarks { get; } = new();
        public InMemoryAvatarPhotoRepository AvatarPhotos { get; } = new();
        public InMemoryBannerPhotoRepository BannerPhotos { get; } = new();
        public Mock<IAuthSessionInvalidator> Sessions { get; } = new();
        public Mock<IPushNotificationSender> PushSender { get; } = new();
        public IdentityPasswordHasher Hasher { get; } = new IdentityPasswordHasher();

        public HostedNightsHandover Handover(IEventRepository events) =>
            new(
                events,
                Participants,
                TestAudienceNotifier.Over(Participants, Users, Push, PushSender.Object, Notifications),
                TimeProvider.System);

        public RecurringEventPass RecurringPass() =>
            new(
                Events,
                Participants,
                Users,
                Groups,
                Mock.Of<IGroupNightAnnouncer>(),
                new InMemoryUnitOfWork(),
                TimeProvider.System,
                NullLogger<RecurringEventPass>.Instance);

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
                MovieLists,
                Groups,
                WatchedTitles,
                SavedLists,
                ResetTokens,
                VerificationTokens,
                AvatarPhotos,
                BannerPhotos,
                Sessions.Object,
                Handover(Events),
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
            f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "wrong" }, recentlyAuthenticated: true));

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
    public async Task HandleAsync_DeletesTheBannerPhoto()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var key = AvatarPhotoKeys.Sample;
        await f.BannerPhotos.SaveAsync(new StoredPhoto { Key = key, UserId = user.Id, ContentType = "image/jpeg", Data = [1] });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Null(await f.BannerPhotos.GetByKeyAsync(key));
    }

    [Fact]
    public async Task HandleAsync_ForgetsTheUser_InTheRemovalListsOfOtherHosts()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var other = await f.Events.AddAsync(new Event
        {
            Title = "Soirée amie",
            Slug = "soiree-amie",
            CreatorUserId = "other-1",
            RemovedUserIds = ["someone-else", user.Id],
        });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var reloaded = await f.Events.GetByIdOrSlugAsync(other.Slug);
        Assert.Equal(["someone-else"], reloaded!.RemovedUserIds);
    }

    [Fact]
    public async Task HandleAsync_DeletesTheProfilePhoto()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var key = AvatarPhotoKeys.Sample;
        await f.AvatarPhotos.SaveAsync(new StoredPhoto { Key = key, UserId = user.Id, ContentType = "image/webp", Data = [1] });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Null(await f.AvatarPhotos.GetByKeyAsync(key));
    }

    [Fact]
    public async Task HandleAsync_NoPassword_WrongConfirmation_ThrowsUnauthorized_AndKeepsData()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        var ex = await Assert.ThrowsAsync<UnauthorizedException>(() =>
            f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "wrong" }, recentlyAuthenticated: true));

        Assert.Equal(ErrorCodes.ConfirmationIncorrect, ex.Reason);
        Assert.NotNull(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_NoPassword_StaleSession_AsksForAFreshSignInAndKeepsData()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        var ex = await Assert.ThrowsAsync<ForbiddenException>(() =>
            f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "neo" }, recentlyAuthenticated: false));

        Assert.Equal(ErrorCodes.ReauthenticationRequired, ex.Reason);
        Assert.NotNull(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_Password_StaleSession_IsProvedByThePassword()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: false);

        Assert.Null(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_NoPassword_ConfirmationMatchesHandle_DeletesAccount()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "NEO" }, recentlyAuthenticated: true);

        Assert.Null(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_NoPassword_ConfirmationMatchesEmail_DeletesAccount()
    {
        var f = new Fixture();
        var user = await SeedUserWithoutPasswordAsync(f);

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Confirmation = "neo@example.com" }, recentlyAuthenticated: true);

        Assert.Null(await f.Users.GetByIdAsync(user.Id));
    }

    [Fact]
    public async Task HandleAsync_UserNotFound_ThrowsNotFound()
    {
        var f = new Fixture();
        await Assert.ThrowsAsync<NotFoundException>(() =>
            f.CreateHandler().HandleAsync("missing", new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true));
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
        await f.VerificationTokens.AddAsync(new EmailVerificationToken
        {
            UserId = user.Id,
            TokenHash = "verification-hash",
            ExpiresAtUtc = DateTimeOffset.UtcNow.AddHours(1),
            CreatedAt = DateTimeOffset.UtcNow
        });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Null(await f.Users.GetByIdAsync(user.Id));

        var keptCreatedEvent = await f.Events.GetByIdOrSlugAsync(createdEvent.Slug);
        Assert.NotNull(keptCreatedEvent);
        Assert.Null(keptCreatedEvent!.CreatorUserId);

        var keptParticipants = await f.Participants.ListByEventIdAsync(joinedEvent.Id);
        var anonymized = Assert.Single(keptParticipants);
        Assert.Null(anonymized.UserId);
        Assert.Equal(ServerCopy.DeletedAccount.Pseudo, anonymized.Pseudo);

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
        Assert.Null(await f.VerificationTokens.GetLatestForUserAsync(user.Id));
        f.Sessions.Verify(
            x => x.InvalidateAllForUserAsync(user.Id, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_DeletesEveryListOfTheUser_AndOnlyThem()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        await f.MovieLists.AddAsync(new MovieList { OwnerId = user.Id, Name = "Films cultes", CreatedAt = now, UpdatedAt = now });
        await f.MovieLists.AddAsync(new MovieList { OwnerId = user.Id, Name = "Halloween", CreatedAt = now, UpdatedAt = now });
        await f.MovieLists.AddAsync(new MovieList { OwnerId = "other-1", Name = "Films cultes", CreatedAt = now, UpdatedAt = now });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Empty(await f.MovieLists.ListByOwnerAsync(user.Id));
        Assert.Single(await f.MovieLists.ListByOwnerAsync("other-1"));
    }

    [Fact]
    public async Task HandleAsync_PurgesTheInvitationsSentFromTheListsOfTheUser_AndOnlyThem()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        var own = await f.MovieLists.AddAsync(new MovieList { OwnerId = user.Id, Name = "Halloween", CreatedAt = now, UpdatedAt = now });
        var foreign = await f.MovieLists.AddAsync(new MovieList { OwnerId = "other-1", Name = "Nanars", CreatedAt = now, UpdatedAt = now });
        UserNotification Invitation(string invitee, string listId) => new()
        {
            UserId = invitee,
            Type = UserNotificationType.ListInvitation,
            ListId = listId,
            ListName = "Liste",
            CreatedAt = now
        };
        await f.Notifications.AddAsync(Invitation("invitee-1", own.Id));
        await f.Notifications.AddAsync(Invitation("invitee-2", own.Id));
        await f.Notifications.AddAsync(Invitation("invitee-1", foreign.Id));

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Equal([foreign.Id], (await f.Notifications.ListByUserIdAsync("invitee-1")).Select(n => n.ListId));
        Assert.Empty(await f.Notifications.ListByUserIdAsync("invitee-2"));
    }

    [Fact]
    public async Task HandleAsync_LeavesTheListsOfOthers_AndTheirTitlesStayWithoutAnAuthor()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        var joined = await f.MovieLists.AddAsync(new MovieList { OwnerId = "other-1", Name = "Ciné du dimanche", CreatedAt = now, UpdatedAt = now });
        await f.MovieLists.AddInvitationAsync(joined.Id, new MovieListInvitation(user.Id, now), MovieList.MaxMembers);
        await f.MovieLists.AcceptInvitationAsync(joined.Id, new MovieListMember(user.Id, now));
        await f.MovieLists.AddItemAsync(user.Id, joined.Id, new MovieListItem { TmdbId = 603, Title = "Matrix", AddedAt = now, AddedByUserId = user.Id }, MovieList.MaxItems);
        var inviting = await f.MovieLists.AddAsync(new MovieList { OwnerId = "other-1", Name = "Nanars", CreatedAt = now, UpdatedAt = now });
        await f.MovieLists.AddInvitationAsync(inviting.Id, new MovieListInvitation(user.Id, now), MovieList.MaxMembers);

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var kept = (await f.MovieLists.FindAsync(joined.Id))!;
        Assert.Empty(kept.Members);
        var title = Assert.Single(kept.Items);
        Assert.Equal(603, title.TmdbId);
        Assert.Null(title.AddedByUserId);
        Assert.Empty((await f.MovieLists.FindAsync(inviting.Id))!.Invitations);
    }

    [Fact]
    public async Task HandleAsync_DeletesEveryGroupOfTheUser_AndWithdrawsTheirInvitationNotices_AndOnlyThem()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        var own = await f.Groups.AddAsync(new FriendGroup { OwnerId = user.Id, Name = "Les cinéphiles", CreatedAt = now, UpdatedAt = now });
        var foreign = await f.Groups.AddAsync(new FriendGroup { OwnerId = "other-1", Name = "Les cinéphiles", CreatedAt = now, UpdatedAt = now });
        UserNotification Invitation(string invitee, string groupId) => new()
        {
            UserId = invitee,
            Type = UserNotificationType.GroupInvitation,
            GroupId = groupId,
            GroupName = "Les cinéphiles",
            CreatedAt = now
        };
        await f.Notifications.AddAsync(Invitation("invitee-1", own.Id));
        await f.Notifications.AddAsync(Invitation("invitee-2", own.Id));
        await f.Notifications.AddAsync(Invitation("invitee-1", foreign.Id));

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Empty(await f.Groups.ListByOwnerAsync(user.Id));
        Assert.NotNull(await f.Groups.FindAsync(foreign.Id));
        Assert.Equal([foreign.Id], (await f.Notifications.ListByUserIdAsync("invitee-1")).Select(n => n.GroupId));
        Assert.Empty(await f.Notifications.ListByUserIdAsync("invitee-2"));
    }

    [Fact]
    public async Task HandleAsync_LeavesTheGroupsOfOthers_AndWithdrawsTheInvitationsItHeld()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        var joined = await f.Groups.AddAsync(new FriendGroup { OwnerId = "other-1", Name = "Le club du jeudi", CreatedAt = now, UpdatedAt = now });
        await f.Groups.AddInvitationAsync(joined.Id, new FriendGroupInvitation(user.Id, now), FriendGroup.MaxMembers);
        await f.Groups.AcceptInvitationAsync(joined.Id, new FriendGroupMember(user.Id, now));
        await f.Groups.AddInvitationAsync(joined.Id, new FriendGroupInvitation("other-2", now), FriendGroup.MaxMembers);
        await f.Groups.AcceptInvitationAsync(joined.Id, new FriendGroupMember("other-2", now));
        var inviting = await f.Groups.AddAsync(new FriendGroup { OwnerId = "other-1", Name = "Le club du dimanche", CreatedAt = now, UpdatedAt = now });
        await f.Groups.AddInvitationAsync(inviting.Id, new FriendGroupInvitation(user.Id, now), FriendGroup.MaxMembers);

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Equal(["other-2"], (await f.Groups.FindAsync(joined.Id))!.Members.Select(member => member.UserId));
        Assert.Empty((await f.Groups.FindAsync(inviting.Id))!.Invitations);
    }

    [Fact]
    public async Task HandleAsync_DeletesEverySavedListOfTheUser_AndOnlyThem()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        await f.SavedLists.AddIfAbsentAsync(new SavedList { OwnerId = user.Id, SourceType = ListSourceType.TmdbCollection, SourceId = "1241", CreatedAt = now });
        await f.SavedLists.AddIfAbsentAsync(new SavedList { OwnerId = user.Id, SourceType = ListSourceType.ExplorerTheme, SourceId = "frissons", CreatedAt = now });
        await f.SavedLists.AddIfAbsentAsync(new SavedList { OwnerId = "other-1", SourceType = ListSourceType.TmdbCollection, SourceId = "1241", CreatedAt = now });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Empty(await f.SavedLists.ListByOwnerAsync(user.Id));
        Assert.Single(await f.SavedLists.ListByOwnerAsync("other-1"));
    }

    [Fact]
    public async Task HandleAsync_ForgetsWhatOthersKeptOfTheListsOfTheUser_AndNothingElse()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        var now = DateTimeOffset.UtcNow;
        var own = await f.MovieLists.AddAsync(new MovieList { OwnerId = user.Id, Name = "Hitchcock", IsPublic = true, CreatedAt = now, UpdatedAt = now });
        var foreign = await f.MovieLists.AddAsync(new MovieList { OwnerId = "other-2", Name = "Coréen", IsPublic = true, CreatedAt = now, UpdatedAt = now });
        SavedListTitle psycho = new() { TmdbId = 539, Title = "Psychose", Year = "1960" };
        var keptOfTheUser = await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = "other-1",
            SourceType = ListSourceType.MemberList,
            SourceId = own.Id,
            SourceOwnerId = user.Id,
            Name = "Hitchcock",
            CreatedAt = now,
            Snapshot = [psycho]
        });
        var keptOfADeletedListOfTheUser = await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = "other-3",
            SourceType = ListSourceType.MemberList,
            SourceId = "deleted-before",
            SourceOwnerId = user.Id,
            Name = "Kubrick",
            CreatedAt = now,
            Snapshot = [psycho]
        });
        var keptOfSomeoneElse = await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = "other-1",
            SourceType = ListSourceType.MemberList,
            SourceId = foreign.Id,
            SourceOwnerId = "other-2",
            Name = "Coréen",
            CreatedAt = now,
            Snapshot = [psycho]
        });
        var saga = await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = "other-1",
            SourceType = ListSourceType.TmdbCollection,
            SourceId = own.Id,
            Name = "Harry Potter - Saga",
            CreatedAt = now
        });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var forgotten = (await f.SavedLists.GetAsync("other-1", keptOfTheUser.Id))!;
        Assert.Equal(string.Empty, forgotten.Name);
        Assert.Empty(forgotten.Snapshot);
        var forgottenAlthoughDeletedBefore = (await f.SavedLists.GetAsync("other-3", keptOfADeletedListOfTheUser.Id))!;
        Assert.Equal((string.Empty, 0), (forgottenAlthoughDeletedBefore.Name, forgottenAlthoughDeletedBefore.Snapshot.Count));
        var untouched = (await f.SavedLists.GetAsync("other-1", keptOfSomeoneElse.Id))!;
        Assert.Equal(("Coréen", 1), (untouched.Name, untouched.Snapshot.Count));
        Assert.Equal("Harry Potter - Saga", (await f.SavedLists.GetAsync("other-1", saga.Id))!.Name);
        Assert.NotNull(await f.MovieLists.FindAsync(foreign.Id));
    }

    [Fact]
    public async Task HandleAsync_DeletesEveryTitleTheUserWatchedElsewhere_AndOnlyThem()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle { OwnerId = user.Id, TmdbId = 603, Title = "Matrix" });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle { OwnerId = user.Id, TmdbId = 680, Title = "Pulp Fiction", Rating = 9 });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle { OwnerId = "other-1", TmdbId = 603, Title = "Matrix" });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.Empty(await f.WatchedTitles.ListByOwnerAsync(user.Id));
        Assert.Single(await f.WatchedTitles.ListByOwnerAsync("other-1"));
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

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var kept = Assert.Single(await f.Notifications.ListByUserIdAsync("someone-else"));
        Assert.Null(kept.ActorHandle);
        Assert.Null(kept.ActorAvatarId);
        Assert.Equal(ServerCopy.DeletedAccount.Pseudo, kept.ActorDisplayName);
    }

    [Fact]
    public async Task HandleAsync_AfterAHandleChange_StillAnonymizesTheNotificationsTheUserActedIn()
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
        var renaming = new PatchUserProfileHandler(f.Users, f.Notifications, new InMemoryUnitOfWork(), Mock.Of<IUsageRecorder>(), TimeProvider.System);
        await renaming.HandleAsync(user.Id, new PatchUserProfileRequest { Handle = "neo_apres" });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var kept = Assert.Single(await f.Notifications.ListByUserIdAsync("someone-else"));
        Assert.Null(kept.ActorHandle);
        Assert.Null(kept.ActorAvatarId);
        Assert.Equal(ServerCopy.DeletedAccount.Pseudo, kept.ActorDisplayName);
    }

    private static async Task<User> SeedGuestAsync(Fixture f, string handle) =>
        await f.Users.AddAsync(new User { Email = $"{handle}@example.com", DisplayName = handle, Handle = handle });

    private static async Task JoinAsync(Fixture f, string eventId, string? userId, string pseudo, DateTimeOffset at) =>
        await f.Participants.AddAsync(new Participant { EventId = eventId, Pseudo = pseudo, UserId = userId, CreatedAt = at, UpdatedAt = at });

    [Fact]
    public async Task HandleAsync_HostOfAnUpcomingNight_HandsTheNightToTheOldestRemainingParticipant()
    {
        var f = new Fixture();
        var host = await SeedUserAsync(f, "abcd1234");
        var first = await SeedGuestAsync(f, "first");
        var second = await SeedGuestAsync(f, "second");
        var night = await f.Events.AddAsync(new Event { Title = "Nuit Nolan", Slug = "nuit-nolan", Date = TestDates.Upcoming, Time = "20:00", HostToken = "old-token", CreatorUserId = host.Id });
        var start = DateTimeOffset.UtcNow.AddDays(-3);
        await JoinAsync(f, night.Id, host.Id, "Neo", start);
        await JoinAsync(f, night.Id, null, ServerCopy.DeletedAccount.Pseudo, start.AddMinutes(1));
        await JoinAsync(f, night.Id, second.Id, "Second", start.AddHours(2));
        await JoinAsync(f, night.Id, first.Id, "First", start.AddHours(1));

        await f.CreateHandler().HandleAsync(host.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var handedOver = await f.Events.GetByIdOrSlugAsync("nuit-nolan");
        Assert.Equal(first.Id, handedOver!.CreatorUserId);
        Assert.NotEqual("old-token", handedOver.HostToken);
        Assert.Null(handedOver.ClosedAt);
        var notice = Assert.Single(await f.Notifications.ListByUserIdAsync(first.Id));
        Assert.Equal((UserNotificationType.HostRoleReceived, night.Id, "Nuit Nolan"), (notice.Type, notice.EventId, notice.EventTitle));
        Assert.Empty(await f.Notifications.ListByUserIdAsync(second.Id));
    }

    [Fact]
    public async Task HandleAsync_HeirWhoWasCoHost_BecomesTheCreatorAndLeavesTheCoHostList()
    {
        var f = new Fixture();
        var host = await SeedUserAsync(f, "abcd1234");
        var heir = await SeedGuestAsync(f, "heir");
        var other = await SeedGuestAsync(f, "other");
        await f.Events.AddAsync(new Event
        {
            Title = "Nuit Nolan",
            Slug = "nuit-nolan",
            Date = TestDates.Upcoming,
            Time = "20:00",
            CreatorUserId = host.Id,
            CoHostUserIds = [heir.Id, other.Id]
        });
        var night = (await f.Events.GetByIdOrSlugAsync("nuit-nolan"))!;
        var start = DateTimeOffset.UtcNow.AddDays(-3);
        await JoinAsync(f, night.Id, host.Id, "Neo", start);
        await JoinAsync(f, night.Id, heir.Id, "Heir", start.AddHours(1));
        await JoinAsync(f, night.Id, other.Id, "Other", start.AddHours(2));

        await f.CreateHandler().HandleAsync(host.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var handedOver = await f.Events.GetByIdOrSlugAsync("nuit-nolan");
        Assert.Equal(heir.Id, handedOver!.CreatorUserId);
        Assert.Equal([other.Id], handedOver.CoHostUserIds);
    }

    [Fact]
    public async Task HandleAsync_HostAloneOnAnUpcomingNight_ClosesTheNight()
    {
        var f = new Fixture();
        var host = await SeedUserAsync(f, "abcd1234");
        var night = await f.Events.AddAsync(new Event { Title = "Seul", Slug = "seul", Date = TestDates.Upcoming, Time = "20:00", CreatorUserId = host.Id });
        await JoinAsync(f, night.Id, host.Id, "Neo", DateTimeOffset.UtcNow);

        await f.CreateHandler().HandleAsync(host.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var closed = await f.Events.GetByIdOrSlugAsync("seul");
        Assert.NotNull(closed!.ClosedAt);
        Assert.Null(closed.CreatorUserId);
    }

    [Fact]
    public async Task HandleAsync_HostAloneOnARecurringNight_ClosesTheNightAndEndsTheSeries()
    {
        var f = new Fixture();
        var host = await SeedUserAsync(f, "abcd1234");
        var night = await f.Events.AddAsync(new Event { Title = "Chaque jeudi", Slug = "chaque-jeudi", Date = TestDates.Upcoming, Time = "20:00", CreatorUserId = host.Id, Recurrence = RecurrenceFrequency.Weekly });
        await JoinAsync(f, night.Id, host.Id, "Neo", DateTimeOffset.UtcNow);

        await f.CreateHandler().HandleAsync(host.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var closed = await f.Events.GetByIdOrSlugAsync("chaque-jeudi");
        Assert.NotNull(closed!.ClosedAt);
        Assert.Null(closed.Recurrence);

        var pass = await f.RecurringPass().RunAsync();

        Assert.Equal(new RecurringEventPassResult(0, 0, 0), pass);
        Assert.Null((await f.Events.GetByIdOrSlugAsync("chaque-jeudi"))!.NextOccurrenceEventId);
    }

    [Fact]
    public async Task HandleAsync_HostOfARecurringNight_HandsTheSeriesOverWithTheNight()
    {
        var f = new Fixture();
        var host = await SeedUserAsync(f, "abcd1234");
        var heir = await SeedGuestAsync(f, "heir");
        var night = await f.Events.AddAsync(new Event { Title = "Chaque mardi", Slug = "chaque-mardi", Date = TestDates.Upcoming, Time = "20:00", CreatorUserId = host.Id, Recurrence = RecurrenceFrequency.Weekly });
        await JoinAsync(f, night.Id, host.Id, "Neo", DateTimeOffset.UtcNow.AddHours(-2));
        await JoinAsync(f, night.Id, heir.Id, "Heir", DateTimeOffset.UtcNow.AddHours(-1));

        await f.CreateHandler().HandleAsync(host.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var handedOver = await f.Events.GetByIdOrSlugAsync("chaque-mardi");
        Assert.Equal(heir.Id, handedOver!.CreatorUserId);
        Assert.Equal(RecurrenceFrequency.Weekly, handedOver.Recurrence);
        Assert.Null(handedOver.ClosedAt);
    }

    [Fact]
    public async Task HandleAsync_HostOfAFinishedNight_KeepsItAnonymized()
    {
        var f = new Fixture();
        var host = await SeedUserAsync(f, "abcd1234");
        var guest = await SeedGuestAsync(f, "guest");
        var night = await f.Events.AddAsync(new Event { Title = "Passée", Slug = "passee", Date = "2020-01-01", Time = "20:00", CreatorUserId = host.Id });
        await JoinAsync(f, night.Id, guest.Id, "Guest", DateTimeOffset.UtcNow);

        await f.CreateHandler().HandleAsync(host.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var kept = await f.Events.GetByIdOrSlugAsync("passee");
        Assert.Null(kept!.CreatorUserId);
        Assert.Null(kept.ClosedAt);
        Assert.Empty(await f.Notifications.ListByUserIdAsync(guest.Id));
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
            .Setup(r => r.ListAllByCreatorUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
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
            f.MovieLists,
            f.Groups,
            f.WatchedTitles,
            f.SavedLists,
            f.ResetTokens,
            f.VerificationTokens,
            f.AvatarPhotos,
            f.BannerPhotos,
            f.Sessions.Object,
            f.Handover(events.Object),
            new InMemoryUnitOfWork(),
            NullLogger<DeleteAccountHandler>.Instance);

        await handler.HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

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

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        Assert.True((await f.Events.GetByIdOrSlugAsync(joined.Slug))!.WriteSeq > before);
    }

    [Fact]
    public async Task HandleAsync_ParticipationInADeletedNight_DoesNotBlockTheDeletion()
    {
        var f = new Fixture();
        var user = await SeedUserAsync(f, "abcd1234");
        await f.Participants.AddAsync(new Participant { EventId = "deleted-night", Pseudo = "Neo", UserId = user.Id });

        await f.CreateHandler().HandleAsync(user.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

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

        await f.CreateHandler().HandleAsync(first.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);
        await f.CreateHandler().HandleAsync(second.Id, new DeleteAccountRequest { Password = "abcd1234" }, recentlyAuthenticated: true);

        var pseudos = (await f.Participants.ListByEventIdAsync(evt.Id)).Select(p => p.Pseudo).ToList();
        Assert.Equal(2, pseudos.Distinct().Count());
        Assert.All(pseudos, p => Assert.StartsWith(ServerCopy.DeletedAccount.Pseudo, p));
    }
}
