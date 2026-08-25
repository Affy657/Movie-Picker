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
    private readonly Mock<IUserNotificationRepository> _notifications = new();
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
        _sut = new SyncLetterboxdWatchlistHandler(
            _users.Object, _notifications.Object, synchronizer, new FixedClock(Now));
    }

    private void GivenAmbiguousLetterboxdFilm()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdWatchlistSnapshot(
                [new LetterboxdFilm("dune-part-two", "Dune : Deuxième partie", "2024")], true));
        _tmdb
            .Setup(t => t.SearchAsync(
                "Dune : Deuxième partie",
                true,
                null,
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                null,
                null,
                null,
                null,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)
            [
                new TmdbSearchItem(1, MovieMediaType.Movie, "Autre film", "2024", null),
                new TmdbSearchItem(2, MovieMediaType.Movie, "Un autre film encore", "2024", null)
            ]);
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
    public async Task HandleAsync_Success_StoresThePendingReconciliationCount()
    {
        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 0, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AutoSyncFindsAmbiguousFilm_CreatesReconciliationNotification()
    {
        GivenAmbiguousLetterboxdFilm();

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.False(result.Skipped);
        Assert.Single(result.PendingChoices);
        _users.Verify(
            u => u.SetLetterboxdPendingReconciliationCountAsync(UserId, 1, It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(x =>
                    x.UserId == UserId && x.Type == UserNotificationType.LetterboxdReconciliationPending),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ManualSyncFindsAmbiguousFilm_DoesNotCreateNotification()
    {
        GivenUser(Username, Now.AddMinutes(-1));
        GivenAmbiguousLetterboxdFilm();

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        Assert.Single(result.PendingChoices);
        _notifications.Verify(
            n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()),
            Times.Never);
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
