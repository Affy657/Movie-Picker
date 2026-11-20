using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class DeleteAccountRollbackTests : IClassFixture<MoviePickerApplicationFactory>
{
    private sealed class ThrowingResetTokenRepository : IPasswordResetTokenRepository
    {
        public Task<PasswordResetToken> AddAsync(PasswordResetToken token, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<PasswordResetToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task MarkConsumedAsync(string tokenId, DateTimeOffset consumedAt, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task InvalidateActiveForUserAsync(string userId, DateTimeOffset consumedAt, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<PasswordResetToken?> GetMostRecentForUserAsync(string userId, CancellationToken ct = default) =>
            throw new NotSupportedException();

        public Task<long> DeleteByUserIdAsync(string userId, CancellationToken ct = default) =>
            throw new InvalidOperationException("reset token purge failed");
    }

    private readonly MoviePickerApplicationFactory _factory;

    public DeleteAccountRollbackTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _ = _factory.CreateClient();
    }

    private sealed record Fixture(
        string UserId,
        string FollowedUserId,
        string EventId,
        string EventSlug,
        string ParticipantId,
        string PhotoKey,
        string JoinedListId,
        string InvitingListId,
        string SavedByAFollowerId,
        string JoinedGroupId,
        string InvitingGroupId);

    private static async Task<Fixture> SeedAsync(IServiceProvider services)
    {
        var users = services.GetRequiredService<IUserRepository>();
        var events = services.GetRequiredService<IEventRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var notifications = services.GetRequiredService<IUserNotificationRepository>();
        var pushSubscriptions = services.GetRequiredService<IPushSubscriptionRepository>();
        var follows = services.GetRequiredService<IFollowRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();
        var photos = services.GetRequiredService<IAvatarPhotoRepository>();
        var hasher = services.GetRequiredService<IPasswordHasher>();

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var now = DateTimeOffset.UtcNow;

        var user = await users.AddAsync(new User
        {
            Id = string.Empty,
            Email = $"rollback-{suffix}@example.test",
            PasswordHash = hasher.Hash("MotDePasse1!"),
            DisplayName = "Rollback",
            Handle = "rollback" + suffix,
            CreatedAt = now,
            UpdatedAt = now
        });

        var followed = await users.AddAsync(new User
        {
            Id = string.Empty,
            Email = $"suivi-{suffix}@example.test",
            DisplayName = "Suivi",
            Handle = "suivi" + suffix,
            CreatedAt = now,
            UpdatedAt = now
        });

        var evt = await events.AddAsync(new Event
        {
            Id = string.Empty,
            Title = "Soirée à conserver",
            Date = TestDates.Upcoming,
            Time = "20:30",
            HostToken = Guid.NewGuid().ToString("N"),
            Slug = "rollback-" + suffix,
            CreatorUserId = user.Id,
            CreatedAt = now,
            UpdatedAt = now
        });

        var participant = await participants.AddAsync(new Participant
        {
            Id = string.Empty,
            EventId = evt.Id,
            Pseudo = "Rollback",
            UserId = user.Id,
            CreatedAt = now,
            UpdatedAt = now
        });

        await notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.NewFollower,
            EventId = evt.Id,
            EventSlug = evt.Slug,
            EventTitle = evt.Title,
            IsRead = false,
            CreatedAt = now
        });

        await pushSubscriptions.UpsertAsync(new PushSubscription
        {
            Id = string.Empty,
            UserId = user.Id,
            Endpoint = "https://push.example.test/" + suffix,
            P256dh = "clef",
            Auth = "auth"
        });

        await follows.FollowAsync(user.Id, followed.Id);

        await watchlist.AddAsync(new WatchlistItem
        {
            Id = string.Empty,
            UserId = user.Id,
            TmdbId = 550,
            MediaType = MovieMediaType.Movie,
            Title = "Fight Club",
            Year = "1999",
            CreatedAt = now
        });

        var movieLists = services.GetRequiredService<IMovieListRepository>();
        var ownList = await movieLists.AddAsync(new MovieList
        {
            OwnerId = user.Id,
            Name = "Films cultes",
            IsPublic = true,
            Items = [new MovieListItem { TmdbId = 550, Title = "Fight Club", Year = "1999", AddedAt = now }],
            CreatedAt = now,
            UpdatedAt = now
        });
        var keptByAFollower = await services.GetRequiredService<ISavedListRepository>().AddIfAbsentAsync(new SavedList
        {
            OwnerId = followed.Id,
            SourceType = ListSourceType.MemberList,
            SourceId = ownList.Id,
            SourceOwnerId = user.Id,
            Name = "Films cultes",
            CreatedAt = now,
            Snapshot = [new SavedListTitle { TmdbId = 550, Title = "Fight Club", Year = "1999" }]
        });
        var joinedList = await movieLists.AddAsync(new MovieList
        {
            OwnerId = followed.Id,
            Name = "Ciné du dimanche",
            Items = [new MovieListItem { TmdbId = 680, Title = "Pulp Fiction", Year = "1994", AddedAt = now, AddedByUserId = user.Id }],
            Members = [new MovieListMember(user.Id, now)],
            CreatedAt = now,
            UpdatedAt = now
        });
        var invitingList = await movieLists.AddAsync(new MovieList
        {
            OwnerId = followed.Id,
            Name = "Nanars",
            Invitations = [new MovieListInvitation(user.Id, now)],
            CreatedAt = now,
            UpdatedAt = now
        });

        var groups = services.GetRequiredService<IFriendGroupRepository>();
        await groups.AddAsync(new FriendGroup { OwnerId = user.Id, Name = "Les cinéphiles", CreatedAt = now, UpdatedAt = now });
        var joinedGroup = await groups.AddAsync(new FriendGroup
        {
            OwnerId = followed.Id,
            Name = "Le club du jeudi",
            Members = [new FriendGroupMember(user.Id, now)],
            CreatedAt = now,
            UpdatedAt = now
        });
        var invitingGroup = await groups.AddAsync(new FriendGroup
        {
            OwnerId = followed.Id,
            Name = "Le club du dimanche",
            Invitations = [new FriendGroupInvitation(user.Id, now)],
            CreatedAt = now,
            UpdatedAt = now
        });

        await services.GetRequiredService<IWatchedTitleRepository>().AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = user.Id,
            TmdbId = 603,
            Title = "Matrix",
            Year = "1999",
            WatchedAt = now,
            Rating = 8,
            CreatedAt = now,
            UpdatedAt = now
        });

        await services.GetRequiredService<ISavedListRepository>().AddIfAbsentAsync(new SavedList
        {
            OwnerId = user.Id,
            SourceType = ListSourceType.TmdbCollection,
            SourceId = "1241",
            Name = "Harry Potter - Saga",
            CreatedAt = now
        });

        var photoKey = AvatarPhoto.NewKey();
        await photos.SaveAsync(new StoredPhoto
        {
            Key = photoKey,
            UserId = user.Id,
            ContentType = "image/webp",
            Data = [0x52, 0x49, 0x46, 0x46],
            CreatedAt = now
        });

        return new Fixture(user.Id, followed.Id, evt.Id, evt.Slug, participant.Id, photoKey, joinedList.Id, invitingList.Id, keptByAFollower.Id, joinedGroup.Id, invitingGroup.Id);
    }

    private static DeleteAccountHandler BuildHandlerFailingOnResetTokens(IServiceProvider services) =>
        new(
            services.GetRequiredService<IUserRepository>(),
            services.GetRequiredService<IPasswordHasher>(),
            services.GetRequiredService<IEventRepository>(),
            services.GetRequiredService<IParticipantRepository>(),
            services.GetRequiredService<IUserNotificationRepository>(),
            services.GetRequiredService<IPushSubscriptionRepository>(),
            services.GetRequiredService<IFollowRepository>(),
            services.GetRequiredService<IWatchlistRepository>(),
            services.GetRequiredService<IMovieListRepository>(),
            services.GetRequiredService<IFriendGroupRepository>(),
            services.GetRequiredService<IWatchedTitleRepository>(),
            services.GetRequiredService<ISavedListRepository>(),
            new ThrowingResetTokenRepository(),
            services.GetRequiredService<IAvatarPhotoRepository>(),
            services.GetRequiredService<IBannerPhotoRepository>(),
            services.GetRequiredService<IAuthSessionInvalidator>(),
            services.GetRequiredService<IUnitOfWork>(),
            NullLogger<DeleteAccountHandler>.Instance);

    [MongoFact]
    public async Task FailedDeletion_LeavesTheAccountAndEveryLinkedDocumentIntact()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);

        var handler = BuildHandlerFailingOnResetTokens(services);

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MotDePasse1!" }, recentlyAuthenticated: true));

        var users = services.GetRequiredService<IUserRepository>();
        var events = services.GetRequiredService<IEventRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var notifications = services.GetRequiredService<IUserNotificationRepository>();
        var pushSubscriptions = services.GetRequiredService<IPushSubscriptionRepository>();
        var follows = services.GetRequiredService<IFollowRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();

        Assert.NotNull(await users.GetByIdAsync(fixture.UserId));

        var evt = await events.GetByIdOrSlugAsync(fixture.EventSlug);
        Assert.NotNull(evt);
        Assert.Equal(fixture.UserId, evt!.CreatorUserId);

        var eventParticipants = await participants.ListByEventIdAsync(fixture.EventId);
        var participant = Assert.Single(eventParticipants);
        Assert.Equal(fixture.UserId, participant.UserId);
        Assert.NotEqual(DeleteAccountHandler.AnonymizedParticipantPseudo, participant.Pseudo);

        Assert.NotEmpty(await notifications.ListByUserIdAsync(fixture.UserId));
        Assert.NotEmpty(await pushSubscriptions.ListByUserIdAsync(fixture.UserId));
        Assert.True(await follows.IsFollowingAsync(fixture.UserId, fixture.FollowedUserId));
        Assert.NotEmpty(await watchlist.ListByUserIdAsync(fixture.UserId));
        Assert.NotEmpty(await services.GetRequiredService<IMovieListRepository>().ListByOwnerAsync(fixture.UserId));
        Assert.Equal([fixture.JoinedListId], (await services.GetRequiredService<IMovieListRepository>().ListJoinedAsync(fixture.UserId)).Select(list => list.Id));
        Assert.Equal([fixture.InvitingListId], (await services.GetRequiredService<IMovieListRepository>().ListInvitingAsync(fixture.UserId)).Select(list => list.Id));
        var groupsKept = services.GetRequiredService<IFriendGroupRepository>();
        Assert.NotEmpty(await groupsKept.ListByOwnerAsync(fixture.UserId));
        Assert.Equal([fixture.JoinedGroupId], (await groupsKept.ListJoinedAsync(fixture.UserId)).Select(group => group.Id));
        Assert.Equal([fixture.InvitingGroupId], (await groupsKept.ListInvitingAsync(fixture.UserId)).Select(group => group.Id));
        Assert.NotEmpty(await services.GetRequiredService<IWatchedTitleRepository>().ListByOwnerAsync(fixture.UserId));
        Assert.NotEmpty(await services.GetRequiredService<ISavedListRepository>().ListByOwnerAsync(fixture.UserId));
        var keptByAFollower = (await services.GetRequiredService<ISavedListRepository>().GetAsync(fixture.FollowedUserId, fixture.SavedByAFollowerId))!;
        Assert.Equal(("Films cultes", 1), (keptByAFollower.Name, keptByAFollower.Snapshot.Count));
        Assert.NotNull(await services.GetRequiredService<IAvatarPhotoRepository>().GetByKeyAsync(fixture.PhotoKey));
    }

    [MongoFact]
    public async Task SuccessfulDeletion_RemovesThePersonalDataAndAnonymizesWhatIsShared()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);

        var handler = services.GetRequiredService<IDeleteAccountHandler>();

        await handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MotDePasse1!" }, recentlyAuthenticated: true);

        var users = services.GetRequiredService<IUserRepository>();
        var events = services.GetRequiredService<IEventRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var notifications = services.GetRequiredService<IUserNotificationRepository>();
        var pushSubscriptions = services.GetRequiredService<IPushSubscriptionRepository>();
        var follows = services.GetRequiredService<IFollowRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();

        Assert.Null(await users.GetByIdAsync(fixture.UserId));
        Assert.Empty(await notifications.ListByUserIdAsync(fixture.UserId));
        Assert.Empty(await pushSubscriptions.ListByUserIdAsync(fixture.UserId));
        Assert.False(await follows.IsFollowingAsync(fixture.UserId, fixture.FollowedUserId));
        Assert.Empty(await watchlist.ListByUserIdAsync(fixture.UserId));
        var movieLists = services.GetRequiredService<IMovieListRepository>();
        Assert.Empty(await movieLists.ListByOwnerAsync(fixture.UserId));
        Assert.Empty(await movieLists.ListJoinedAsync(fixture.UserId));
        Assert.Empty(await movieLists.ListInvitingAsync(fixture.UserId));
        var kept = (await movieLists.FindAsync(fixture.JoinedListId))!;
        Assert.Equal(fixture.UserId, Assert.Single(kept.Items).AddedByUserId);
        Assert.Empty((await movieLists.FindAsync(fixture.InvitingListId))!.Invitations);
        var groups = services.GetRequiredService<IFriendGroupRepository>();
        Assert.Empty(await groups.ListByOwnerAsync(fixture.UserId));
        Assert.Empty((await groups.FindAsync(fixture.JoinedGroupId))!.Members);
        Assert.Empty((await groups.FindAsync(fixture.InvitingGroupId))!.Invitations);
        Assert.Empty(await services.GetRequiredService<IWatchedTitleRepository>().ListByOwnerAsync(fixture.UserId));
        Assert.Empty(await services.GetRequiredService<ISavedListRepository>().ListByOwnerAsync(fixture.UserId));
        var forgotten = (await services.GetRequiredService<ISavedListRepository>().GetAsync(fixture.FollowedUserId, fixture.SavedByAFollowerId))!;
        Assert.Equal(string.Empty, forgotten.Name);
        Assert.Empty(forgotten.Snapshot);
        Assert.Null(await services.GetRequiredService<IAvatarPhotoRepository>().GetByKeyAsync(fixture.PhotoKey));

        var evt = await events.GetByIdOrSlugAsync(fixture.EventSlug);
        Assert.NotNull(evt);
        Assert.True(string.IsNullOrEmpty(evt!.CreatorUserId));

        var participant = Assert.Single(await participants.ListByEventIdAsync(fixture.EventId));
        Assert.Equal(DeleteAccountHandler.AnonymizedParticipantPseudo, participant.Pseudo);
        Assert.True(string.IsNullOrEmpty(participant.UserId));
    }

    [MongoFact]
    public async Task WrongPassword_RefusesBeforeOpeningAnyTransaction()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);

        var handler = services.GetRequiredService<IDeleteAccountHandler>();

        await Assert.ThrowsAsync<Domain.Exceptions.UnauthorizedException>(() =>
            handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MauvaisMotDePasse!" }, recentlyAuthenticated: true));

        var users = services.GetRequiredService<IUserRepository>();
        var watchlist = services.GetRequiredService<IWatchlistRepository>();

        Assert.NotNull(await users.GetByIdAsync(fixture.UserId));
        Assert.NotEmpty(await watchlist.ListByUserIdAsync(fixture.UserId));
        Assert.NotNull(await services.GetRequiredService<IAvatarPhotoRepository>().GetByKeyAsync(fixture.PhotoKey));
    }

    [MongoFact]
    public async Task SecondDeletedAccountSharingTheEvent_IsAnonymizedWithoutReplayingTheTransaction()
    {
        using var scope = _factory.Services.CreateScope();
        var services = scope.ServiceProvider;
        var fixture = await SeedAsync(services);
        var users = services.GetRequiredService<IUserRepository>();
        var participants = services.GetRequiredService<IParticipantRepository>();
        var hasher = services.GetRequiredService<IPasswordHasher>();
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var now = DateTimeOffset.UtcNow;
        var coParticipant = await users.AddAsync(new User
        {
            Id = string.Empty,
            Email = $"voisin-{suffix}@example.test",
            PasswordHash = hasher.Hash("MotDePasse1!"),
            DisplayName = "Voisin",
            Handle = "voisin" + suffix,
            CreatedAt = now,
            UpdatedAt = now
        });
        await participants.AddAsync(new Participant
        {
            Id = string.Empty,
            EventId = fixture.EventId,
            Pseudo = "Voisin",
            UserId = coParticipant.Id,
            CreatedAt = now,
            UpdatedAt = now
        });
        var handler = services.GetRequiredService<IDeleteAccountHandler>();
        await handler.HandleAsync(fixture.UserId, new DeleteAccountRequest { Password = "MotDePasse1!" }, recentlyAuthenticated: true);

        var watch = System.Diagnostics.Stopwatch.StartNew();
        await handler.HandleAsync(coParticipant.Id, new DeleteAccountRequest { Password = "MotDePasse1!" }, recentlyAuthenticated: true);
        watch.Stop();

        Assert.True(watch.Elapsed < TimeSpan.FromSeconds(10), $"second deletion took {watch.Elapsed}");
        var pseudos = (await participants.ListByEventIdAsync(fixture.EventId)).Select(p => p.Pseudo).ToList();
        Assert.Equal(2, pseudos.Distinct().Count());
        Assert.All(pseudos, p => Assert.StartsWith(DeleteAccountHandler.AnonymizedParticipantPseudo, p));
    }
}
