using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Profile;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Profile;

public sealed class GetPublicProfileHandlerTests
{
    private static User User(
        bool isPublic,
        DateTimeOffset? supporterSince = null,
        bool isWatchlistPublic = true) => new()
        {
            Id = "u1",
            Email = "secret@private.co",
            PasswordHash = "h",
            DisplayName = "Alice",
            Handle = "alice",
            Bio = "Cinéphile",
            AvatarId = "alpha",
            IsProfilePublic = isPublic,
            IsWatchlistPublic = isWatchlistPublic,
            SupporterSince = supporterSince,
            CreatedAt = new DateTimeOffset(2024, 3, 1, 0, 0, 0, TimeSpan.Zero),
            UpdatedAt = DateTimeOffset.UtcNow
        };

    private static (Mock<IUserRepository>, Mock<IFollowRepository>, GetPublicProfileHandler) Build(
        Mock<IWatchlistRepository>? watchlist = null)
    {
        var users = new Mock<IUserRepository>();
        var follows = new Mock<IFollowRepository>();
        follows.Setup(x => x.GetCountsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((0, 0));
        follows.Setup(x => x.IsFollowingAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        var handler = new GetPublicProfileHandler(
            users.Object,
            follows.Object,
            (watchlist ?? new Mock<IWatchlistRepository>()).Object);
        return (users, follows, handler);
    }

    private static Mock<IWatchlistRepository> WatchlistWith(long count)
    {
        var watchlist = new Mock<IWatchlistRepository>();
        watchlist.Setup(x => x.CountByUserIdAsync("u1", It.IsAny<CancellationToken>())).ReturnsAsync(count);
        return watchlist;
    }

    [Fact]
    public async Task HandleAsync_PublicProfile_ReturnsDataWithoutEmail()
    {
        var (users, _, handler) = Build();
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(User(true));

        var res = await handler.HandleAsync("Alice");

        Assert.Equal("alice", res.Handle);
        Assert.Equal("Alice", res.DisplayName);
        Assert.Equal("Cinéphile", res.Bio);
        Assert.Equal("alpha", res.AvatarId);
        Assert.Equal(new DateTimeOffset(2024, 3, 1, 0, 0, 0, TimeSpan.Zero), res.MemberSince);
        Assert.False(res.IsSupporter);
    }

    [Fact]
    public async Task HandleAsync_SupporterProfile_FlagsSupporterWithoutExposingDonationDate()
    {
        var (users, _, handler) = Build();
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User(true, new DateTimeOffset(2026, 8, 13, 12, 0, 0, TimeSpan.Zero)));

        var res = await handler.HandleAsync("alice");

        Assert.True(res.IsSupporter);
    }

    [Fact]
    public async Task HandleAsync_PublicWatchlist_ExposesItsCountToVisitors()
    {
        var watchlist = WatchlistWith(24);
        var (users, _, handler) = Build(watchlist);
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(User(true));

        var res = await handler.HandleAsync("alice");

        Assert.True(res.IsWatchlistPublic);
        Assert.Equal(24, res.WatchlistCount);
    }

    [Fact]
    public async Task HandleAsync_HiddenWatchlist_KeepsTheCountFromVisitors()
    {
        var watchlist = WatchlistWith(24);
        var (users, _, handler) = Build(watchlist);
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User(true, isWatchlistPublic: false));

        var res = await handler.HandleAsync("alice", currentUserId: "someone-else");

        Assert.False(res.IsWatchlistPublic);
        Assert.Null(res.WatchlistCount);
        watchlist.Verify(x => x.CountByUserIdAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_HiddenWatchlist_StillCountedForItsOwner()
    {
        var watchlist = WatchlistWith(24);
        var (users, _, handler) = Build(watchlist);
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>()))
            .ReturnsAsync(User(true, isWatchlistPublic: false));

        var res = await handler.HandleAsync("alice", currentUserId: "u1");

        Assert.False(res.IsWatchlistPublic);
        Assert.Equal(24, res.WatchlistCount);
    }

    [Fact]
    public async Task HandleAsync_PrivateProfile_ThrowsNotFound()
    {
        var (users, _, handler) = Build();
        users.Setup(x => x.GetByHandleAsync("alice", It.IsAny<CancellationToken>())).ReturnsAsync(User(false));

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("alice"));
    }

    [Fact]
    public async Task HandleAsync_UnknownHandle_ThrowsNotFound()
    {
        var (users, _, handler) = Build();
        users.Setup(x => x.GetByHandleAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => handler.HandleAsync("ghost"));
    }
}
