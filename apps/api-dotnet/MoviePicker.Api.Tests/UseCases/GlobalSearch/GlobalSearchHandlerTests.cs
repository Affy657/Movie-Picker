using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Application.UseCases.GlobalSearch;
using MoviePicker.Api.Application.UseCases.SearchUsers;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GlobalSearch;

public sealed class GlobalSearchHandlerTests
{
    private const string Me = "me";

    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<ISearchUsersHandler> _members = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IFriendGroupRepository> _groups = new();
    private readonly Mock<IMovieListRepository> _lists = new();
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IGetMovieCollectionsHandler> _sagas = new();
    private readonly GlobalSearchHandler _sut;

    public GlobalSearchHandlerTests()
    {
        _tmdb
            .Setup(t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _members
            .Setup(m => m.HandleAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FollowListResponse());
        _events.Setup(e => e.ListAllByCreatorUserIdAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _events
            .Setup(e => e.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _events
            .Setup(e => e.ListByGroupIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _participants.Setup(p => p.ListDistinctEventIdsByUserIdAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _groups.Setup(g => g.ListAdmittingAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _lists.Setup(l => l.ListSummariesAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([]);
        _lists
            .Setup(l => l.SearchPublicSummariesAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _users
            .Setup(u => u.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        _sagas.Setup(s => s.HandleAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MovieCollectionListResponse());

        _sut = Build(new MoviePickerOptions { TmdbApiKey = "key" });
    }

    private GlobalSearchHandler Build(MoviePickerOptions options) =>
        new(
            _tmdb.Object,
            _sagas.Object,
            _members.Object,
            new MySpaceSearch(_events.Object, _participants.Object, _groups.Object, _lists.Object, TimeProvider.System),
            new PublicListSearch(_lists.Object, _users.Object),
            Options.Create(options));

    private static MovieListSummary ListSummary(string id, string name, string ownerId = Me, int itemCount = 0, params string[] posters) =>
        new(id, ownerId, name, null, true, itemCount, posters, DateTimeOffset.UtcNow, DateTimeOffset.UtcNow, [], 1, []);

    private void PublicListsAre(params MovieListSummary[] lists) =>
        _lists
            .Setup(l => l.SearchPublicSummariesAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(lists);

    private void OwnersAre(params UserCard[] cards) =>
        _users
            .Setup(u => u.ListCardsByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(cards);

    private static Event Night(string id, string title, string? creator = Me, bool finished = false, string? groupId = null, string? date = null) => new()
    {
        Id = id,
        Slug = $"slug-{id}",
        Title = title,
        Date = date ?? TestDates.Upcoming,
        Time = "20:30",
        CreatorUserId = creator,
        ClosedAt = finished ? DateTimeOffset.UtcNow.AddDays(-2) : null,
        GroupId = groupId
    };

    private void TitlesAre(params TmdbSearchItem[] rows) =>
        _tmdb
            .Setup(t => t.SearchTitlesAsync(It.IsAny<string>(), true, null, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(rows);

    private void ICreated(params Event[] nights) =>
        _events.Setup(e => e.ListAllByCreatorUserIdAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync(nights);

    private void IJoined(params Event[] nights)
    {
        _participants
            .Setup(p => p.ListDistinctEventIdsByUserIdAsync(Me, It.IsAny<CancellationToken>()))
            .ReturnsAsync(nights.Select(n => n.Id).ToList());
        _events
            .Setup(e => e.ListByIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyCollection<string> ids, CancellationToken _) =>
                nights.Where(n => ids.Contains(n.Id)).ToList());
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  a  ")]
    public async Task HandleAsync_QueryTooShort_ReturnsNothingWithoutSearching(string? query)
    {
        var result = await _sut.HandleAsync(query, Me);

        Assert.Empty(result.Titles);
        Assert.Empty(result.Members);
        Assert.Empty(result.Nights);
        _tmdb.Verify(
            t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), null, null, It.IsAny<CancellationToken>()),
            Times.Never);
        _events.Verify(e => e.ListAllByCreatorUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SearchesFilmsAndSeriesByTitleWithTheTrimmedQuery()
    {
        TitlesAre(
            new TmdbSearchItem(603, MovieMediaType.Movie, "Matrix", "1999", "/matrix.jpg"),
            new TmdbSearchItem(1399, MovieMediaType.Tv, "Game of Thrones", "2011", null));

        var result = await _sut.HandleAsync("  matrix  ", null);

        _tmdb.Verify(t => t.SearchTitlesAsync("matrix", true, null, null, It.IsAny<CancellationToken>()), Times.Once);
        Assert.Collection(
            result.Titles,
            movie =>
            {
                Assert.Equal(603, movie.TmdbId);
                Assert.Equal(MovieMediaType.Movie, movie.MediaType);
                Assert.Equal("Matrix", movie.Title);
                Assert.Equal("1999", movie.Year);
                Assert.Equal("/matrix.jpg", movie.PosterPath);
            },
            show =>
            {
                Assert.Equal(MovieMediaType.Tv, show.MediaType);
                Assert.Null(show.PosterPath);
            });
    }

    [Fact]
    public async Task HandleAsync_KeepsTheFirstFiveTitles()
    {
        TitlesAre(Enumerable.Range(1, 8)
            .Select(id => new TmdbSearchItem(id, MovieMediaType.Movie, $"Dune {id}", "2021", null))
            .ToArray());

        var result = await _sut.HandleAsync("dune", null);

        Assert.Equal([1, 2, 3, 4, 5], result.Titles.Select(t => t.TmdbId));
    }

    [Fact]
    public async Task HandleAsync_TmdbUnavailable_StillReturnsTheOtherSections()
    {
        _tmdb
            .Setup(t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), null, null, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("down"));
        ICreated(Night("n1", "Soirée Dune"));

        var result = await _sut.HandleAsync("dune", Me);

        Assert.Empty(result.Titles);
        Assert.Single(result.Nights);
    }

    [Fact]
    public async Task HandleAsync_WithoutTmdbCredentials_SkipsTheTitles()
    {
        var sut = Build(new MoviePickerOptions { TmdbApiKey = null });

        var result = await sut.HandleAsync("dune", null);

        Assert.Empty(result.Titles);
        _tmdb.Verify(
            t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), null, null, It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_SearchesNeitherMembersNorNights()
    {
        var result = await _sut.HandleAsync("dune", null);

        Assert.Empty(result.Members);
        Assert.Empty(result.Nights);
        _members.Verify(
            m => m.HandleAsync(It.IsAny<string?>(), It.IsAny<string?>(), It.IsAny<CancellationToken>()),
            Times.Never);
        _events.Verify(e => e.ListAllByCreatorUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SignedIn_ReturnsTheFirstFourMembers()
    {
        _members
            .Setup(m => m.HandleAsync("lea", Me, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new FollowListResponse
            {
                Items = Enumerable.Range(1, 6)
                    .Select(i => new FollowUserItem { Handle = $"lea{i}", DisplayName = $"Léa {i}", AvatarId = "🎬" })
                    .ToList()
            });

        var result = await _sut.HandleAsync("lea", Me);

        Assert.Equal(["lea1", "lea2", "lea3", "lea4"], result.Members.Select(m => m.Handle));
    }

    [Fact]
    public async Task HandleAsync_FindsMyNightsByTitleIgnoringCaseAndAccents()
    {
        ICreated(Night("n1", "Soirée Ghibli"), Night("n2", "Marathon Marvel"));
        IJoined(Night("n3", "GHIBLI encore", creator: "host"));

        var result = await _sut.HandleAsync("ghîbli", Me);

        Assert.Equal(["slug-n1", "slug-n3"], result.Nights.Select(n => n.Slug).Order());
        var night = result.Nights.Single(n => n.Slug == "slug-n1");
        Assert.Equal("Soirée Ghibli", night.Title);
        Assert.Equal(TestDates.Upcoming, night.Date);
        Assert.Equal("20:30", night.Time);
        Assert.False(night.IsFinished);
    }

    [Fact]
    public async Task HandleAsync_ListsUpcomingNightsFirstThenTheMostRecentFinishedOnes()
    {
        ICreated(
            Night("old", "Ciné vieux", finished: true, date: "2025-01-10"),
            Night("later", "Ciné plus tard", date: TestDates.UpcomingPlusDays(10)),
            Night("recent", "Ciné récent", finished: true, date: "2025-06-10"),
            Night("soon", "Ciné bientôt", date: TestDates.Upcoming));

        var result = await _sut.HandleAsync("cine", Me);

        Assert.Equal(["slug-soon", "slug-later", "slug-recent", "slug-old"], result.Nights.Select(n => n.Slug));
        Assert.True(result.Nights[2].IsFinished);
    }

    [Fact]
    public async Task HandleAsync_KeepsFourNightsAndCountsANightICreatedAndJoinedOnce()
    {
        var mine = Night("n0", "Ciné 0");
        ICreated([mine, .. Enumerable.Range(1, 5).Select(i => Night($"n{i}", $"Ciné {i}", date: TestDates.UpcomingPlusDays(i)))]);
        IJoined(mine);

        var result = await _sut.HandleAsync("cine", Me);

        Assert.Equal(["slug-n0", "slug-n1", "slug-n2", "slug-n3"], result.Nights.Select(n => n.Slug));
    }

    [Fact]
    public async Task HandleAsync_IncludesTheOpenNightsOfMyGroupsButNotTheirFinishedOnes()
    {
        var group = new FriendGroup
        {
            Id = "g1",
            OwnerId = "friend",
            Name = "Les cinéphiles",
            Members = [new FriendGroupMember(Me, DateTimeOffset.UtcNow.AddDays(-30))]
        };
        _groups.Setup(g => g.ListAdmittingAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([group]);
        _events
            .Setup(e => e.ListByGroupIdsAsync(It.IsAny<IReadOnlyCollection<string>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([
                Night("open", "Ciné du groupe", creator: "friend", groupId: "g1"),
                Night("done", "Ciné du groupe passé", creator: "friend", groupId: "g1", finished: true)
            ]);

        var result = await _sut.HandleAsync("cine", Me);

        Assert.Equal(["slug-open"], result.Nights.Select(n => n.Slug));
    }
    [Fact]
    public async Task HandleAsync_FindsMyGroupsByNameWithTheirMemberCount()
    {
        _groups.Setup(g => g.ListAdmittingAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([
            new FriendGroup { Id = "g1", OwnerId = Me, Name = "Les Cinéphiles", Members = [new FriendGroupMember("u2", DateTimeOffset.UtcNow)] },
            new FriendGroup { Id = "g2", OwnerId = "u3", Name = "Foot du mardi" }
        ]);

        var result = await _sut.HandleAsync("cinephile", Me);

        var group = Assert.Single(result.Groups);
        Assert.Equal(("g1", "Les Cinéphiles", 2), (group.Id, group.Name, group.MemberCount));
    }

    [Fact]
    public async Task HandleAsync_FindsMyListsByNameWithTheirSizeAndFirstPoster()
    {
        _lists.Setup(l => l.ListSummariesAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([
            ListSummary("l1", "Polars coréens", itemCount: 7, posters: ["/a.jpg", "/b.jpg"]),
            ListSummary("l2", "À revoir"),
            ListSummary("l3", "Coréens partagés", ownerId: "friend")
        ]);

        var result = await _sut.HandleAsync("coreens", Me);

        Assert.Equal(["l1", "l3"], result.Lists.Select(list => list.Id));
        Assert.Equal(("Polars coréens", 7, "/a.jpg"), (result.Lists[0].Name, result.Lists[0].ItemCount, result.Lists[0].PosterPath));
        Assert.Null(result.Lists[1].PosterPath);
    }

    [Fact]
    public async Task HandleAsync_Anonymous_FindsPublicListsWithTheirOwner()
    {
        PublicListsAre(ListSummary("p1", "Polars", ownerId: "alice", itemCount: 3, posters: ["/p.jpg"]));
        OwnersAre(new UserCard("alice", "🎬", "alice_m", IsProfilePublic: true, DisplayName: "Alice Martin"));

        var result = await _sut.HandleAsync("polar", null);

        var list = Assert.Single(result.PublicLists);
        Assert.Equal(("p1", "Polars", 3, "/p.jpg"), (list.Id, list.Name, list.ItemCount, list.PosterPath));
        Assert.Equal(("alice_m", "Alice Martin"), (list.OwnerHandle, list.OwnerDisplayName));
        Assert.Empty(result.Lists);
        Assert.Empty(result.Groups);
    }

    [Fact]
    public async Task HandleAsync_LeavesOutOfPublicListsMyOwnAndThoseOfPrivateProfiles()
    {
        _lists.Setup(l => l.ListSummariesAsync(Me, It.IsAny<CancellationToken>())).ReturnsAsync([ListSummary("mine", "Polars à moi")]);
        PublicListsAre(
            ListSummary("mine", "Polars à moi"),
            ListSummary("hidden", "Polars cachés", ownerId: "bob"),
            ListSummary("nohandle", "Polars sans pseudo", ownerId: "carl"),
            ListSummary("shown", "Polars de Dana", ownerId: "dana"));
        OwnersAre(
            new UserCard("bob", "🎬", "bob", IsProfilePublic: false, DisplayName: "Bob"),
            new UserCard("carl", "🎬", null, IsProfilePublic: true, DisplayName: "Carl"),
            new UserCard("dana", "🎬", "dana", IsProfilePublic: true, DisplayName: "Dana"));

        var result = await _sut.HandleAsync("polars", Me);

        Assert.Equal(["shown"], result.PublicLists.Select(list => list.Id));
        Assert.Equal(["mine"], result.Lists.Select(list => list.Id));
    }

    [Fact]
    public async Task HandleAsync_FindsSagasByNameIgnoringAccents()
    {
        _sagas.Setup(s => s.HandleAsync(It.IsAny<CancellationToken>())).ReturnsAsync(new MovieCollectionListResponse
        {
            Items =
            [
                new MovieCollectionResponse { Id = 10, Name = "Star Wars", PosterPath = "/sw.jpg", MovieCount = 9 },
                new MovieCollectionResponse { Id = 1241, Name = "Harry Potter", MovieCount = 8 },
                new MovieCollectionResponse { Id = 645, Name = "James Bond", MovieCount = 27 }
            ]
        });

        var result = await _sut.HandleAsync("stâr", null);

        var saga = Assert.Single(result.Sagas);
        Assert.Equal((10, "Star Wars", "/sw.jpg", 9), (saga.Id, saga.Name, saga.PosterPath, saga.MovieCount));
    }

    [Fact]
    public async Task HandleAsync_SagasUnavailable_StillReturnsTheOtherSections()
    {
        _sagas.Setup(s => s.HandleAsync(It.IsAny<CancellationToken>())).ThrowsAsync(Errors.ShowcaseUnavailable());
        TitlesAre(new TmdbSearchItem(11, MovieMediaType.Movie, "Star Wars", "1977", null));

        var result = await _sut.HandleAsync("star", null);

        Assert.Empty(result.Sagas);
        Assert.Single(result.Titles);
    }
}
