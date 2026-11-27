using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Auth;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Tests.Builders;
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
        public InMemoryMovieRatingRepository Ratings { get; } = new();
        public InMemoryPushSubscriptionRepository Push { get; } = new();
        public InMemoryWatchlistRepository Watchlist { get; } = new();
        public InMemoryMovieListRepository MovieLists { get; } = new();
        public InMemoryFriendGroupRepository Groups { get; } = new();
        public InMemoryWatchedTitleRepository WatchedTitles { get; } = new();
        public InMemorySavedListRepository SavedLists { get; } = new();
        public InMemoryAvatarPhotoRepository AvatarPhotos { get; } = new();
        public InMemoryBannerPhotoRepository BannerPhotos { get; } = new();
        public InMemoryMovieRepository Movies { get; } = new();
        public InMemoryKnownDeviceRepository KnownDevices { get; } = new();
        public List<StoredAuthSession> Sessions { get; } = [];

        public ExportUserDataHandler CreateHandler() =>
            new(
                Users,
                Notifications,
                Follows,
                Events,
                Participants,
                Votes,
                SeenMarks,
                Ratings,
                Push,
                Watchlist,
                MovieLists,
                Groups,
                WatchedTitles,
                SavedLists,
                AvatarPhotos,
                BannerPhotos,
                Movies,
                KnownDevices,
                SessionDirectory(),
                new FakeTimeProvider(TestEpoch));

        private IAuthSessionDirectory SessionDirectory()
        {
            var directory = new Mock<IAuthSessionDirectory>();
            directory.Setup(d => d.ListActiveForUserAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(() => Sessions);
            return directory.Object;
        }
    }

    [Fact]
    public async Task HandleAsync_WithPhoto_ExportsTheImageItself()
    {
        var f = new Fixture();
        var key = AvatarPhotoKeys.Sample;
        var user = await f.Users.AddAsync(new User
        {
            Email = "photo@example.com",
            Handle = "photo",
            AvatarPhoto = new AvatarPhoto { Key = key, IsActive = true, UpdatedAt = TestEpoch }
        });
        await f.AvatarPhotos.SaveAsync(new StoredPhoto
        {
            Key = key,
            UserId = user.Id,
            ContentType = "image/webp",
            Data = [1, 2, 3],
            CreatedAt = TestEpoch
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.NotNull(export.AvatarPhoto);
        Assert.Equal("image/webp", export.AvatarPhoto!.ContentType);
        Assert.Equal(Convert.ToBase64String([1, 2, 3]), export.AvatarPhoto.Base64Content);
        Assert.True(export.AvatarPhoto.IsActive);
        Assert.Equal(TestEpoch, export.AvatarPhoto.UpdatedAt);
    }

    [Fact]
    public async Task HandleAsync_WithBannerAndPhoto_ExportsTheChoiceAndTheImageItself()
    {
        var f = new Fixture();
        var key = AvatarPhotoKeys.Sample;
        var user = await f.Users.AddAsync(new User
        {
            Email = "banner@example.com",
            Handle = "banner",
            Banner = ProfileBanner.FromFilm(693134, "Dune", "/sunset.jpg", TestEpoch),
            BannerPhoto = new BannerPhoto { Key = key, UpdatedAt = TestEpoch }
        });
        await f.BannerPhotos.SaveAsync(new StoredPhoto { Key = key, UserId = user.Id, ContentType = "image/jpeg", Data = [4, 5], CreatedAt = TestEpoch });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal(ProfileBannerSource.Film, export.Banner!.Source);
        Assert.Equal(693134, export.Banner.TmdbId);
        Assert.Equal("Dune", export.Banner.Title);
        Assert.Equal("/sunset.jpg", export.Banner.ImagePath);
        Assert.Equal("image/jpeg", export.BannerPhoto!.ContentType);
        Assert.Equal(Convert.ToBase64String([4, 5]), export.BannerPhoto.Base64Content);
    }

    [Fact]
    public async Task HandleAsync_WithoutPhoto_ExportsNoImage()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "nophoto@example.com", Handle = "nophoto" });

        Assert.Null((await f.CreateHandler().HandleAsync(user.Id)).AvatarPhoto);
    }

    [Fact]
    public async Task HandleAsync_WithTwoFactor_ExportsWhenItWasTurnedOnButNoSecret()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "totp@example.com",
            Handle = "totp",
            TwoFactor = new TwoFactorSettings
            {
                ProtectedSecret = "sealed-secret",
                EnabledAt = TestEpoch,
                LastUsedStep = 0,
                BackupCodeHashes = ["hash"]
            }
        });

        var profile = (await f.CreateHandler().HandleAsync(user.Id)).Profile;

        Assert.Equal(TestEpoch, profile.TwoFactorEnabledAt);
    }

    [Fact]
    public async Task HandleAsync_WithoutTwoFactor_ExportsNoTwoFactorDate()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "plain@example.com", Handle = "plain" });

        Assert.Null((await f.CreateHandler().HandleAsync(user.Id)).Profile.TwoFactorEnabledAt);
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
        await f.Ratings.UpsertAsync(new MovieRating { EventId = joined.Id, MovieId = "movie-1", ParticipantId = participant.Id, Value = 8 });
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
        Assert.Equal(AccentColor.Purple, export.Profile.AccentColor);
        Assert.Equal(UiThemePreference.Dark, export.Profile.UiTheme);

        Assert.Single(export.CreatedEvents);
        Assert.Equal("Ma soirée", export.CreatedEvents[0].Title);

        var participation = Assert.Single(export.Participations);
        Assert.Equal(joined.Id, participation.EventId);
        Assert.Equal("Soirée amie", participation.EventTitle);
        Assert.Single(participation.Votes);
        Assert.Single(participation.SeenMarks);
        var rating = Assert.Single(participation.Ratings);
        Assert.Equal("movie-1", rating.MovieId);
        Assert.Equal(8, rating.Value);

        var following = Assert.Single(export.Following);
        Assert.Equal("trinity", following.Handle);

        Assert.Single(export.Notifications);
        Assert.Equal("newfollower", export.Notifications[0].Type);

        var push = Assert.Single(export.PushSubscriptions);
        Assert.Equal("https://push.example/abc", push.Endpoint);
    }

    [Fact]
    public async Task HandleAsync_ExportsTheSignedInDevices()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "devices@example.com", Handle = "devices" });
        const string iphoneSafari =
            "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1";
        f.Sessions.Add(new StoredAuthSession("key-phone", iphoneSafari, TestEpoch.AddDays(-3), TestEpoch.AddHours(-2)));
        f.Sessions.Add(new StoredAuthSession("key-legacy", null, TestEpoch.AddDays(-40), null));

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Collection(
            export.SignedInDevices,
            phone =>
            {
                Assert.Equal("Safari", phone.Browser);
                Assert.Equal("iOS", phone.OperatingSystem);
                Assert.Equal(DeviceKind.Phone, phone.DeviceKind);
                Assert.Equal(iphoneSafari, phone.UserAgent);
                Assert.Equal(TestEpoch.AddDays(-3), phone.SignedInAt);
                Assert.Equal(TestEpoch.AddHours(-2), phone.LastActiveAt);
            },
            legacy =>
            {
                Assert.Equal(DeviceKind.Unknown, legacy.DeviceKind);
                Assert.Null(legacy.UserAgent);
                Assert.Null(legacy.LastActiveAt);
            });
    }

    [Fact]
    public async Task HandleAsync_ExportsTheKnownDevicesWithoutTheirSecret()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "devices@example.com", Handle = "devices" });
        await f.KnownDevices.TryAddAsync(new KnownDevice
        {
            UserId = user.Id,
            TokenHash = "secret-hash",
            Browser = "Firefox",
            OperatingSystem = "Linux",
            Kind = DeviceKind.Desktop,
            FirstSeenAt = TestEpoch.AddDays(-10),
            LastSeenAt = TestEpoch.AddDays(-1)
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        var device = Assert.Single(export.KnownDevices);
        Assert.Equal("Firefox", device.Browser);
        Assert.Equal("Linux", device.OperatingSystem);
        Assert.Equal(DeviceKind.Desktop, device.Kind);
        Assert.Equal(TestEpoch.AddDays(-10), device.FirstSeenAt);
        Assert.Equal(TestEpoch.AddDays(-1), device.LastSignInAt);
    }

    [Fact]
    public async Task HandleAsync_ExportsTheFavorites()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        await f.Users.AddFavoriteAsync(user.Id, new FavoriteTitle { TmdbId = 603, Title = "Matrix", Year = "1999" }, 3, TestEpoch);
        await f.Users.AddFavoriteAsync(
            user.Id,
            new FavoriteTitle { TmdbId = 1920, MediaType = MovieMediaType.Tv, Title = "Twin Peaks", Year = "1990" },
            3,
            TestEpoch);

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal(
            [(603, MovieMediaType.Movie, "Matrix", "1999"), (1920, MovieMediaType.Tv, "Twin Peaks", "1990")],
            export.Favorites.Select(x => (x.TmdbId, x.MediaType, x.Title, x.Year)));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task HandleAsync_ExportsWhenTheAddressWasConfirmed(bool confirmed)
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            EmailVerifiedAt = confirmed ? TestEpoch : null
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal(confirmed ? TestEpoch : (DateTimeOffset?)null, export.Profile.EmailVerifiedAt);
    }

    [Theory]
    [InlineData(true, false)]
    [InlineData(false, true)]
    public async Task HandleAsync_ExportsTheVisibilityOfTheWatchlistAndOfTheWatchedFilms(bool watchlist, bool watched)
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            IsWatchlistPublic = watchlist,
            IsWatchedPublic = watched
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal((watchlist, watched), (export.Profile.IsWatchlistPublic, export.Profile.IsWatchedPublic));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheListsWithTheirTitles()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        await f.MovieLists.AddAsync(new MovieList
        {
            OwnerId = user.Id,
            Name = "Films cultes",
            Description = "Les incontournables",
            IsPublic = true,
            Items =
            [
                new MovieListItem { TmdbId = 603, Title = "Matrix", Year = "1999", PosterPath = "/p.jpg", AddedAt = TestEpoch.AddDays(-3) },
                new MovieListItem { TmdbId = 1920, MediaType = MovieMediaType.Tv, Title = "Twin Peaks", Year = "1990", AddedAt = TestEpoch.AddDays(-2) }
            ],
            CreatedAt = TestEpoch.AddDays(-4),
            UpdatedAt = TestEpoch.AddDays(-2)
        });
        await f.MovieLists.AddAsync(new MovieList { OwnerId = "someone-else", Name = "Pas à moi" });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        var list = Assert.Single(export.MovieLists);
        Assert.Equal("Films cultes", list.Name);
        Assert.Equal("Les incontournables", list.Description);
        Assert.True(list.IsPublic);
        Assert.Equal(TestEpoch.AddDays(-4), list.CreatedAt);
        Assert.Equal(TestEpoch.AddDays(-2), list.UpdatedAt);
        Assert.Equal(
            [(603, MovieMediaType.Movie, "Matrix", "1999", TestEpoch.AddDays(-3)), (1920, MovieMediaType.Tv, "Twin Peaks", "1990", TestEpoch.AddDays(-2))],
            list.Items.Select(x => (x.TmdbId, x.MediaType, x.Title, x.Year, x.AddedAt)));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheListsJoined_AndTheInvitationsWaitingForAnAnswer()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        var lea = await f.Users.AddAsync(new User { Email = "lea@example.com", DisplayName = "Léa", Handle = "lea" });
        var joined = await f.MovieLists.AddAsync(new MovieList { OwnerId = lea.Id, Name = "Ciné du dimanche" });
        await f.MovieLists.AddInvitationAsync(joined.Id, new MovieListInvitation(user.Id, TestEpoch.AddDays(-6)), MovieList.MaxMembers);
        await f.MovieLists.AcceptInvitationAsync(joined.Id, new MovieListMember(user.Id, TestEpoch.AddDays(-5)));
        var pending = await f.MovieLists.AddAsync(new MovieList { OwnerId = lea.Id, Name = "Nanars" });
        await f.MovieLists.AddInvitationAsync(pending.Id, new MovieListInvitation(user.Id, TestEpoch.AddDays(-1)), MovieList.MaxMembers);
        await f.MovieLists.AddAsync(new MovieList { OwnerId = lea.Id, Name = "Sans Neo" });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Empty(export.MovieLists);
        var member = Assert.Single(export.JoinedMovieLists);
        Assert.Equal((joined.Id, "Ciné du dimanche", "Léa", TestEpoch.AddDays(-5)), (member.ListId, member.Name, member.OwnerDisplayName, member.JoinedAt));
        var invitation = Assert.Single(export.PendingListInvitations);
        Assert.Equal((pending.Id, "Nanars", "Léa", TestEpoch.AddDays(-1)), (invitation.ListId, invitation.Name, invitation.OwnerDisplayName, invitation.InvitedAt));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheTitlesAddedToTheListsOfOthers_EvenListsLeftSince()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        var lea = await f.Users.AddAsync(new User { Email = "lea@example.com", DisplayName = "Léa", Handle = "lea" });
        var joined = await f.MovieLists.AddAsync(new MovieList { OwnerId = lea.Id, Name = "Ciné du dimanche" });
        await f.MovieLists.AddInvitationAsync(joined.Id, new MovieListInvitation(user.Id, TestEpoch.AddDays(-6)), MovieList.MaxMembers);
        await f.MovieLists.AcceptInvitationAsync(joined.Id, new MovieListMember(user.Id, TestEpoch.AddDays(-5)));
        await f.MovieLists.AddItemAsync(user.Id, joined.Id, new MovieListItem { TmdbId = 603, Title = "Matrix", Year = "1999", AddedAt = TestEpoch.AddDays(-4), AddedByUserId = user.Id }, MovieList.MaxItems);
        await f.MovieLists.AddItemAsync(lea.Id, joined.Id, new MovieListItem { TmdbId = 680, Title = "Pulp Fiction", Year = "1994", AddedAt = TestEpoch.AddDays(-3), AddedByUserId = lea.Id }, MovieList.MaxItems);
        var left = await f.MovieLists.AddAsync(new MovieList { OwnerId = lea.Id, Name = "Nanars" });
        await f.MovieLists.AddInvitationAsync(left.Id, new MovieListInvitation(user.Id, TestEpoch.AddDays(-6)), MovieList.MaxMembers);
        await f.MovieLists.AcceptInvitationAsync(left.Id, new MovieListMember(user.Id, TestEpoch.AddDays(-5)));
        await f.MovieLists.AddItemAsync(user.Id, left.Id, new MovieListItem { TmdbId = 1920, MediaType = MovieMediaType.Tv, Title = "Twin Peaks", Year = "1990", AddedAt = TestEpoch.AddDays(-2), AddedByUserId = user.Id }, MovieList.MaxItems);
        await f.MovieLists.RemoveMemberAsync(left.Id, user.Id, disableInviteLink: false);
        await f.MovieLists.AddAsync(new MovieList { OwnerId = user.Id, Name = "La mienne", Items = [new MovieListItem { TmdbId = 13, Title = "Forrest Gump", AddedAt = TestEpoch, AddedByUserId = user.Id }] });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        var contributions = export.TitlesAddedToOthersLists.OrderBy(list => list.Name, StringComparer.Ordinal).ToList();
        Assert.Equal(
            [(joined.Id, "Ciné du dimanche", "Léa"), (left.Id, "Nanars", "Léa")],
            contributions.Select(list => (list.ListId, list.Name, list.OwnerDisplayName)));
        Assert.Equal(
            [(603, MovieMediaType.Movie, "Matrix", "1999", TestEpoch.AddDays(-4))],
            contributions[0].Items.Select(x => (x.TmdbId, x.MediaType, x.Title, x.Year, x.AddedAt)));
        Assert.Equal(
            [(1920, MovieMediaType.Tv, "Twin Peaks", "1990", TestEpoch.AddDays(-2))],
            contributions[1].Items.Select(x => (x.TmdbId, x.MediaType, x.Title, x.Year, x.AddedAt)));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheGroupsOwnedJoined_AndTheInvitationsWaitingForAnAnswer()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        var lea = await f.Users.AddAsync(new User { Email = "lea@example.com", DisplayName = "Léa", Handle = "lea" });
        await f.Groups.AddAsync(new FriendGroup { OwnerId = user.Id, Name = "Les miens", CreatedAt = TestEpoch.AddDays(-9), UpdatedAt = TestEpoch.AddDays(-8) });
        var joined = await f.Groups.AddAsync(new FriendGroup { OwnerId = lea.Id, Name = "Le club du jeudi" });
        await f.Groups.AddInvitationAsync(joined.Id, new FriendGroupInvitation(user.Id, TestEpoch.AddDays(-6)), FriendGroup.MaxMembers);
        await f.Groups.AcceptInvitationAsync(joined.Id, new FriendGroupMember(user.Id, TestEpoch.AddDays(-5)));
        var pending = await f.Groups.AddAsync(new FriendGroup { OwnerId = lea.Id, Name = "Le club du dimanche" });
        await f.Groups.AddInvitationAsync(pending.Id, new FriendGroupInvitation(user.Id, TestEpoch.AddDays(-1)), FriendGroup.MaxMembers);
        await f.Groups.AddAsync(new FriendGroup { OwnerId = lea.Id, Name = "Sans Neo" });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        var own = Assert.Single(export.FriendGroups);
        Assert.Equal(("Les miens", TestEpoch.AddDays(-9), TestEpoch.AddDays(-8)), (own.Name, own.CreatedAt, own.UpdatedAt));
        var member = Assert.Single(export.JoinedFriendGroups);
        Assert.Equal((joined.Id, "Le club du jeudi", "Léa", TestEpoch.AddDays(-5)), (member.GroupId, member.Name, member.OwnerDisplayName, member.JoinedAt));
        var invitation = Assert.Single(export.PendingFriendGroupInvitations);
        Assert.Equal((pending.Id, "Le club du dimanche", "Léa", TestEpoch.AddDays(-1)), (invitation.GroupId, invitation.Name, invitation.OwnerDisplayName, invitation.InvitedAt));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheGroupOfAGroupInvitationNotice()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        await f.Notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.GroupInvitation,
            ActorDisplayName = "Léa",
            GroupId = "g1",
            GroupName = "Le club du jeudi",
            CreatedAt = TestEpoch
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        var notice = Assert.Single(export.Notifications);
        Assert.Equal(("groupinvitation", "Le club du jeudi", (string?)null), (notice.Type, notice.GroupName, notice.ListName));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheListOfAListInvitationNotice()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        await f.Notifications.AddAsync(new UserNotification
        {
            UserId = user.Id,
            Type = UserNotificationType.ListInvitation,
            ActorDisplayName = "Léa",
            ListId = "l1",
            ListName = "Nanars",
            CreatedAt = TestEpoch
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal("Nanars", Assert.Single(export.Notifications).ListName);
    }

    [Fact]
    public async Task HandleAsync_ExportsTheSavedListsAsTheReferenceOfTheirSource()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo" });
        await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = user.Id,
            SourceType = ListSourceType.TmdbCollection,
            SourceId = "1241",
            Name = "Harry Potter - Saga",
            CreatedAt = TestEpoch.AddDays(-2)
        });
        await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = user.Id,
            SourceType = ListSourceType.ExplorerTheme,
            SourceId = "frissons",
            Name = "frissons",
            CreatedAt = TestEpoch.AddDays(-1)
        });
        await f.SavedLists.AddIfAbsentAsync(new SavedList
        {
            OwnerId = user.Id,
            SourceType = ListSourceType.MemberList,
            SourceId = "abc123",
            Name = "Hitchcock",
            CreatedAt = TestEpoch
        });
        await f.SavedLists.AddIfAbsentAsync(new SavedList { OwnerId = "someone-else", SourceType = ListSourceType.TmdbCollection, SourceId = "10" });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal(
            [
                (ListSourceType.MemberList, "abc123", "Hitchcock", TestEpoch),
                (ListSourceType.ExplorerTheme, "frissons", "frissons", TestEpoch.AddDays(-1)),
                (ListSourceType.TmdbCollection, "1241", "Harry Potter - Saga", TestEpoch.AddDays(-2))
            ],
            export.SavedLists.Select(x => (x.SourceType, x.SourceId, x.Name, x.CreatedAt)));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheTitlesWatchedElsewhere_AndTheDimWatchedPreference()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User { Email = "neo@example.com", DisplayName = "Neo", Handle = "neo", DimWatched = true });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = user.Id,
            TmdbId = 603,
            Title = "Matrix",
            Year = "1999",
            WatchedAt = TestEpoch.AddDays(-3),
            Rating = 8
        });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = user.Id,
            TmdbId = 1920,
            MediaType = MovieMediaType.Tv,
            Title = "Twin Peaks",
            Year = "1990",
            WatchedAt = TestEpoch.AddDays(-1)
        });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle { OwnerId = "someone-else", TmdbId = 680, Title = "Pulp Fiction" });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.True(export.Profile.DimWatched);
        Assert.Equal(
            [(1920, MovieMediaType.Tv, "Twin Peaks", "1990", TestEpoch.AddDays(-1), (int?)null), (603, MovieMediaType.Movie, "Matrix", "1999", TestEpoch.AddDays(-3), (int?)8)],
            export.WatchedTitles.Select(x => (x.TmdbId, x.MediaType, x.Title, x.Year, x.WatchedAt, x.Rating)));
    }

    [Fact]
    public async Task HandleAsync_ExportsTheLetterboxdSyncTogglesAndWhereEachWatchedTitleAndRatingComesFrom()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            LetterboxdUsername = "neo_lb",
            LetterboxdSyncWatchlist = false,
            LetterboxdSyncWatched = true
        });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = user.Id,
            TmdbId = 603,
            Title = "Matrix",
            Year = "1999",
            WatchedAt = TestEpoch.AddDays(-3),
            Rating = 9,
            RatingOrigin = WatchedOrigin.Letterboxd,
            Origin = WatchedOrigin.Letterboxd,
            LetterboxdSlug = "the-matrix"
        });
        await f.WatchedTitles.AddIfAbsentAsync(new WatchedTitle
        {
            OwnerId = user.Id,
            TmdbId = 680,
            Title = "Pulp Fiction",
            Year = "1994",
            WatchedAt = TestEpoch.AddDays(-1),
            Rating = 7,
            RatingOrigin = WatchedOrigin.Manual
        });
        await f.Watchlist.AddAsync(new WatchlistItem
        {
            UserId = user.Id,
            TmdbId = 78,
            Title = "Blade Runner",
            Year = "1982",
            LetterboxdSlug = "blade-runner",
            CreatedAt = TestEpoch
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal((false, true), (export.Profile.LetterboxdSyncWatchlist, export.Profile.LetterboxdSyncWatched));
        Assert.Equal(
            [(680, WatchedOrigin.Manual, (string?)null, (WatchedOrigin?)WatchedOrigin.Manual), (603, WatchedOrigin.Letterboxd, "the-matrix", WatchedOrigin.Letterboxd)],
            export.WatchedTitles.Select(x => (x.TmdbId, x.Origin, x.LetterboxdSlug, x.RatingOrigin)));
        Assert.Equal("blade-runner", Assert.Single(export.Watchlist).LetterboxdSlug);
    }

    [Fact]
    public async Task HandleAsync_ExportsTheProposedFilmsTheLetterboxdAccountAndTheTemplates()
    {
        var f = new Fixture();
        var user = await f.Users.AddAsync(new User
        {
            Email = "neo@example.com",
            DisplayName = "Neo",
            Handle = "neo",
            RatingScale = RatingScale.Ten,
            LetterboxdUsername = "neo-lb",
            EventTemplates =
            [
                new EventTemplate
                {
                    Id = "tpl1",
                    Name = "Vendredi frissons",
                    Config = new EventConfig { Theme = "🎃 Horreur" },
                    CreatedAt = TestEpoch.AddDays(-5)
                }
            ]
        });
        var joined = await f.Events.AddAsync(new Event { Title = "Soirée amie", Slug = "soiree-amie", CreatorUserId = "someone" });
        var participant = await f.Participants.AddAsync(new Participant { EventId = joined.Id, Pseudo = "Neo", UserId = user.Id });
        await f.Movies.InsertAsync(new Movie
        {
            EventId = joined.Id,
            ParticipantId = participant.Id,
            TmdbId = 603,
            Title = "Matrix",
            Year = "1999",
            PitchNote = "Pilule rouge ou bleue ?",
            CreatedAt = TestEpoch.AddDays(-2)
        });

        var export = await f.CreateHandler().HandleAsync(user.Id);

        Assert.Equal(RatingScale.Ten, export.Profile.RatingScale);
        Assert.Equal("neo-lb", export.Profile.LetterboxdUsername);
        var template = Assert.Single(export.Profile.EventTemplates);
        Assert.Equal("Vendredi frissons", template.Name);
        Assert.Equal("🎃 Horreur", template.Theme);
        var proposed = Assert.Single(Assert.Single(export.Participations).ProposedMovies);
        Assert.Equal("Matrix", proposed.Title);
        Assert.Equal(603, proposed.TmdbId);
        Assert.Equal(MovieMediaType.Movie, proposed.MediaType);
        Assert.Equal("Pilule rouge ou bleue ?", proposed.PitchNote);

    }
}
