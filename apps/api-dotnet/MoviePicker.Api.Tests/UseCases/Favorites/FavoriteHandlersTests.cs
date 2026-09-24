using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.Posters;
using MoviePicker.Api.Application.UseCases.Favorites;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.UseCases.EventTemplates;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Favorites;

internal static class FavoriteFixtures
{
    public static readonly DateTimeOffset Now = new(2026, 9, 24, 18, 0, 0, TimeSpan.Zero);

    public const string TmdbPoster = "https://image.tmdb.org/t/p/w500/rrBuGu0Pjq7Y2BWSI6teGfZzviY.jpg";

    public static FavoriteTitle Favorite(int tmdbId, string title, MovieMediaType mediaType = MovieMediaType.Movie) =>
        new() { TmdbId = tmdbId, MediaType = mediaType, Title = title, Year = "1995" };

    public static User UserWith(params FavoriteTitle[] favorites) => new() { Id = "u1", Favorites = favorites };

    public static AddFavoriteRequest Request(
        int tmdbId = 949,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string title = "Heat",
        string year = "1995",
        string? posterPath = TmdbPoster) =>
        new() { TmdbId = tmdbId, MediaType = mediaType, Title = title, Year = year, PosterPath = posterPath };
}

public sealed class AddFavoriteHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly AddFavoriteHandler _sut;
    private readonly List<FavoriteTitle> _written = [];

    public AddFavoriteHandlerTests()
    {
        _posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? p) => TmdbPosterUrlNormalizer.ToPublicPosterPath(p));
        _users.Setup(u => u.AddFavoriteAsync(
                It.IsAny<string>(), It.IsAny<FavoriteTitle>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .Callback((string _, FavoriteTitle favorite, int _, DateTimeOffset _, CancellationToken _) => _written.Add(favorite))
            .ReturnsAsync(true);
        _sut = new AddFavoriteHandler(_users.Object, _posters.Object, new FrozenClock(FavoriteFixtures.Now));
    }

    private void StoredUser(params User[] successiveReads)
    {
        var reads = new Queue<User>(successiveReads);
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => reads.Count > 1 ? reads.Dequeue() : reads.Peek());
    }

    [Fact]
    public async Task HandleAsync_UnknownUser_ThrowsNotFound()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("u1", FavoriteFixtures.Request()));
    }

    [Fact]
    public async Task HandleAsync_WritesTheTitleWithItsPublicPosterAndCapsTheList()
    {
        StoredUser(FavoriteFixtures.UserWith(), FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(949, "Heat")));

        await _sut.HandleAsync("u1", FavoriteFixtures.Request(title: "  Heat  "));

        var written = Assert.Single(_written);
        Assert.Equal(949, written.TmdbId);
        Assert.Equal(MovieMediaType.Movie, written.MediaType);
        Assert.Equal("Heat", written.Title);
        Assert.Equal("1995", written.Year);
        Assert.Equal(TmdbPosterUrlNormalizer.ToPublicPosterPath(FavoriteFixtures.TmdbPoster), written.PosterPath);
        _users.Verify(u => u.AddFavoriteAsync("u1", It.IsAny<FavoriteTitle>(), FavoriteTitle.MaxPerUser, FavoriteFixtures.Now, It.IsAny<CancellationToken>()));
        _posters.Verify(p => p.RegisterTmdbSourceAsync(FavoriteFixtures.TmdbPoster, It.IsAny<CancellationToken>()));
    }

    [Fact]
    public async Task HandleAsync_ReturnsTheListAsStoredAfterTheWrite()
    {
        StoredUser(
            FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(1920, "Twin Peaks", MovieMediaType.Tv)),
            FavoriteFixtures.UserWith(
                FavoriteFixtures.Favorite(1920, "Twin Peaks", MovieMediaType.Tv),
                FavoriteFixtures.Favorite(949, "Heat")));

        var result = await _sut.HandleAsync("u1", FavoriteFixtures.Request());

        Assert.Equal(["Twin Peaks", "Heat"], result.Items.Select(i => i.Title));
        Assert.Equal(MovieMediaType.Tv, result.Items[0].MediaType);
    }

    [Fact]
    public async Task HandleAsync_WithoutPoster_WritesNone()
    {
        StoredUser(FavoriteFixtures.UserWith(), FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(949, "Heat")));

        await _sut.HandleAsync("u1", FavoriteFixtures.Request(posterPath: "  "));

        Assert.Null(Assert.Single(_written).PosterPath);
    }

    [Fact]
    public async Task HandleAsync_AlreadyAFavorite_ReturnsTheListWithoutWriting()
    {
        StoredUser(FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(949, "Heat")));

        var result = await _sut.HandleAsync("u1", FavoriteFixtures.Request());

        Assert.Equal(["Heat"], result.Items.Select(i => i.Title));
        Assert.Empty(_written);
    }

    [Fact]
    public async Task HandleAsync_TheSameNumberAsASeries_IsAnotherTitle()
    {
        StoredUser(
            FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(1920, "Twin Peaks")),
            FavoriteFixtures.UserWith(
                FavoriteFixtures.Favorite(1920, "Twin Peaks"),
                FavoriteFixtures.Favorite(1920, "Twin Peaks", MovieMediaType.Tv)));

        await _sut.HandleAsync("u1", FavoriteFixtures.Request(tmdbId: 1920, mediaType: MovieMediaType.Tv, title: "Twin Peaks"));

        Assert.Equal(MovieMediaType.Tv, Assert.Single(_written).MediaType);
    }

    [Fact]
    public async Task HandleAsync_ThreeFavoritesAlready_ThrowsLimitReached()
    {
        StoredUser(FavoriteFixtures.UserWith(
            FavoriteFixtures.Favorite(1, "Un"),
            FavoriteFixtures.Favorite(2, "Deux"),
            FavoriteFixtures.Favorite(3, "Trois")));

        var error = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("u1", FavoriteFixtures.Request()));

        Assert.Equal(ErrorCodes.FavoritesLimitReached, error.Reason);
        Assert.Empty(_written);
    }

    [Fact]
    public async Task HandleAsync_AnotherTabFilledTheListMeanwhile_ThrowsLimitReached()
    {
        StoredUser(
            FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(1, "Un"), FavoriteFixtures.Favorite(2, "Deux")),
            FavoriteFixtures.UserWith(
                FavoriteFixtures.Favorite(1, "Un"),
                FavoriteFixtures.Favorite(2, "Deux"),
                FavoriteFixtures.Favorite(3, "Trois")));
        _users.Setup(u => u.AddFavoriteAsync(
                It.IsAny<string>(), It.IsAny<FavoriteTitle>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var error = await Assert.ThrowsAsync<ConflictException>(() => _sut.HandleAsync("u1", FavoriteFixtures.Request()));

        Assert.Equal(ErrorCodes.FavoritesLimitReached, error.Reason);
    }

    [Fact]
    public async Task HandleAsync_AnotherTabAddedTheSameTitleMeanwhile_ReturnsTheList()
    {
        StoredUser(
            FavoriteFixtures.UserWith(),
            FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(949, "Heat")));
        _users.Setup(u => u.AddFavoriteAsync(
                It.IsAny<string>(), It.IsAny<FavoriteTitle>(), It.IsAny<int>(), It.IsAny<DateTimeOffset>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var result = await _sut.HandleAsync("u1", FavoriteFixtures.Request());

        Assert.Equal(["Heat"], result.Items.Select(i => i.Title));
    }

    [Fact]
    public async Task HandleAsync_PosterFromAnotherHost_ThrowsBadRequest()
    {
        StoredUser(FavoriteFixtures.UserWith());

        var error = await Assert.ThrowsAsync<BadRequestException>(
            () => _sut.HandleAsync("u1", FavoriteFixtures.Request(posterPath: "https://evil.example/poster.jpg")));

        Assert.Equal(ErrorCodes.InvalidPosterPath, error.Reason);
        Assert.Empty(_written);
    }
}

public sealed class RemoveFavoriteHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly RemoveFavoriteHandler _sut;

    public RemoveFavoriteHandlerTests()
    {
        _sut = new RemoveFavoriteHandler(_users.Object, new FrozenClock(FavoriteFixtures.Now));
    }

    [Fact]
    public async Task HandleAsync_RemovesThatTitleAndReturnsWhatRemains()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(FavoriteFixtures.UserWith(FavoriteFixtures.Favorite(1920, "Twin Peaks")));

        var result = await _sut.HandleAsync("u1", 1920, MovieMediaType.Tv);

        _users.Verify(u => u.RemoveFavoriteAsync("u1", 1920, MovieMediaType.Tv, FavoriteFixtures.Now, It.IsAny<CancellationToken>()));
        Assert.Equal(["Twin Peaks"], result.Items.Select(i => i.Title));
    }

    [Fact]
    public async Task HandleAsync_UnknownUser_ThrowsNotFound()
    {
        _users.Setup(u => u.GetByIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync("u1", 949, MovieMediaType.Movie));
    }
}
