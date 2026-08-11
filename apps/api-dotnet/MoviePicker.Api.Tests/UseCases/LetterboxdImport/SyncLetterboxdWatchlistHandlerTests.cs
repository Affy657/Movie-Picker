using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.LetterboxdImport;

public sealed class SyncLetterboxdWatchlistHandlerTests
{
    private sealed class FixedClock : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FixedClock(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }

    private const string UserId = "u1";
    private const string Username = "affy657";

    private static readonly DateTimeOffset Now = new(2026, 8, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ILetterboxdWatchlistClient> _letterboxd = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IAddToWatchlistHandler> _addToWatchlist = new();
    private readonly SyncLetterboxdWatchlistHandler _sut;

    public SyncLetterboxdWatchlistHandlerTests()
    {
        GivenUser(Username, null);
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)[]);
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdWatchlistSnapshot([], true));

        var synchronizer = new LetterboxdWatchlistSynchronizer(
            _watchlist.Object,
            _letterboxd.Object,
            _tmdb.Object,
            _addToWatchlist.Object,
            NullLogger<LetterboxdWatchlistSynchronizer>.Instance);
        _sut = new SyncLetterboxdWatchlistHandler(_users.Object, synchronizer, new FixedClock(Now));
    }

    private void GivenUser(string? username, DateTimeOffset? lastSyncAt) =>
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = UserId,
                Email = "a@b.c",
                LetterboxdUsername = username,
                LetterboxdLastSyncAt = lastSyncAt
            });

    private void VerifyLetterboxdRead(Times times) =>
        _letterboxd.Verify(
            l => l.GetWatchlistAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            times);

    [Fact]
    public async Task HandleAsync_NoUsername_IsSkippedWhenNotForced()
    {
        GivenUser(null, null);

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.True(result.Skipped);
        VerifyLetterboxdRead(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_NoUsername_ThrowsWhenForced()
    {
        GivenUser(null, null);

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, force: true));
    }

    [Fact]
    public async Task HandleAsync_SyncedLessThanADayAgo_IsSkippedWhenNotForced()
    {
        GivenUser(Username, Now.AddHours(-5));

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.True(result.Skipped);
        VerifyLetterboxdRead(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_SyncedMoreThanADayAgo_RunsWhenNotForced()
    {
        GivenUser(Username, Now.AddDays(-1).AddMinutes(-1));

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.False(result.Skipped);
        VerifyLetterboxdRead(Times.Once());
    }

    [Fact]
    public async Task HandleAsync_NeverSynced_RunsWhenNotForced()
    {
        GivenUser(Username, null);

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.False(result.Skipped);
        VerifyLetterboxdRead(Times.Once());
    }

    [Fact]
    public async Task HandleAsync_SyncedRecently_RunsAnywayWhenForced()
    {
        GivenUser(Username, Now.AddMinutes(-1));

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        VerifyLetterboxdRead(Times.Once());
    }

    [Fact]
    public async Task HandleAsync_Success_StampsTheSyncDateWithoutError()
    {
        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(UserId, Now, null, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchlist_RecordsTheErrorAndThrowsWhenForced()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdWatchlistSnapshot.Failed());

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, force: true));

        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(
                UserId, Now, It.Is<string>(e => e != null && e.Contains("inaccessible", StringComparison.Ordinal)),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchlist_IsSkippedSilentlyWhenNotForced()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdWatchlistSnapshot.Failed());

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.True(result.Skipped);
    }

    [Fact]
    public async Task HandleAsync_UnknownUser_ThrowsNotFound()
    {
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((User?)null);

        await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(UserId, force: false));
    }
}
