using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class GetUserWatchlistHandlerTests
{
    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IGetWatchlistHandler> _watchlist = new();
    private readonly GetUserWatchlistHandler _sut;

    public GetUserWatchlistHandlerTests()
    {
        _sut = new GetUserWatchlistHandler(_users.Object, _watchlist.Object);
    }

    private static User Alice(bool isProfilePublic = true, bool isWatchlistPublic = true) => new()
    {
        Id = "u1",
        Email = "a@b.co",
        PasswordHash = "h",
        DisplayName = "Alice",
        Handle = "alice",
        IsProfilePublic = isProfilePublic,
        IsWatchlistPublic = isWatchlistPublic,
        CreatedAt = DateTimeOffset.UtcNow,
        UpdatedAt = DateTimeOffset.UtcNow
    };

    private void HasUser(User user) =>
        _users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(user);

    private WatchlistResponse WatchlistPage()
    {
        var page = new WatchlistResponse
        {
            Items = [new WatchlistItemResponse { TmdbId = 27205, Title = "Inception", Year = "2010" }],
            Total = 1,
            HasMore = false
        };
        _watchlist.Setup(x => x.HandleAsync("u1", 10, 20, It.IsAny<CancellationToken>())).ReturnsAsync(page);
        return page;
    }

    [Fact]
    public async Task HandleAsync_PublicWatchlist_ReturnsTheOwnersPage()
    {
        HasUser(Alice());
        var page = WatchlistPage();

        var res = await _sut.HandleAsync("Alice", currentUserId: null, skip: 10, take: 20);

        Assert.Same(page, res);
    }

    [Fact]
    public async Task HandleAsync_HiddenWatchlist_IsNotFoundForVisitors()
    {
        HasUser(Alice(isWatchlistPublic: false));

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("alice", currentUserId: "u2", skip: 0, take: null));
        _watchlist.Verify(
            x => x.HandleAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_HiddenWatchlist_StaysReadableByItsOwner()
    {
        HasUser(Alice(isWatchlistPublic: false));
        var page = WatchlistPage();

        var res = await _sut.HandleAsync("alice", currentUserId: "u1", skip: 10, take: 20);

        Assert.Same(page, res);
    }

    [Fact]
    public async Task HandleAsync_PrivateProfile_IsNotFoundEvenWithAPublicWatchlist()
    {
        HasUser(Alice(isProfilePublic: false));

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("alice", currentUserId: "u2", skip: 0, take: null));
    }

    [Fact]
    public async Task HandleAsync_UnknownHandle_IsNotFound()
    {
        _users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(
            () => _sut.HandleAsync("ghost", currentUserId: null, skip: 0, take: null));
    }
}
