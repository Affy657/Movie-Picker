using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.LetterboxdImport;
using MoviePicker.Api.Application.UseCases.MovieLists;
using MoviePicker.Api.Application.UseCases.UsageCounts;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Infrastructure.Persistence.InMemory;
using MoviePicker.Api.Infrastructure.Web;
using MoviePicker.Api.Tests.Builders;
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
    private const string Username = "cinephile";

    private static readonly DateTimeOffset Now = new(2026, 8, 10, 12, 0, 0, TimeSpan.Zero);

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IUserNotificationRepository> _notifications = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ILetterboxdWatchlistClient> _letterboxd = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IAddToWatchlistHandler> _addToWatchlist = new();
    private readonly Mock<IParticipantRepository> _participants = new();
    private readonly Mock<IEventRepository> _events = new();
    private readonly Mock<IMovieRepository> _movies = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly InMemoryWatchedTitleRepository _watched = new();
    private readonly RecordingSharedQuota _quota = new();
    private readonly Mock<IUsageRecorder> _usage = new();
    private readonly SyncLetterboxdWatchlistHandler _sut;

    public SyncLetterboxdWatchlistHandlerTests()
    {
        GivenUser(Username, null);
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)[]);
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot([], true));
        GivenWatchedOnLetterboxd(new LetterboxdFilmsSnapshot([], true));
        _participants
            .Setup(p => p.ListDistinctEventIdsByUserIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<string>)[]);

        var synchronizer = new LetterboxdWatchlistSynchronizer(
            _watchlist.Object,
            _watched,
            _letterboxd.Object,
            _tmdb.Object,
            _addToWatchlist.Object,
            _participants.Object,
            _events.Object,
            _movies.Object,
            new LetterboxdWatchedSynchronizer(
                _watched,
                _tmdb.Object,
                new LetterboxdWatchedWriter(
                    _watched,
                    _watchlist.Object,
                    _users.Object,
                    new MovieListItemFactory(_posters.Object, _tmdb.Object, NullLogger<MovieListItemFactory>.Instance),
                    new FixedClock(Now)),
                NullLogger<LetterboxdWatchedSynchronizer>.Instance),
            LetterboxdSyncBudget.Within(RequestTimeoutPolicies.LongRunningBudget),
            NullLogger<LetterboxdWatchlistSynchronizer>.Instance);
        _sut = new SyncLetterboxdWatchlistHandler(
            _users.Object,
            _notifications.Object,
            synchronizer,
            new LetterboxdLinkedCounter(_users.Object, _watchlist.Object, _watched),
            _quota,
            _usage.Object,
            new FixedClock(Now));
    }

    private void GivenWatchedOnLetterboxd(LetterboxdFilmsSnapshot snapshot) =>
        _letterboxd
            .Setup(l => l.GetWatchedFilmsAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(snapshot);

    private void GivenAmbiguousWatchedFilm()
    {
        GivenAmbiguousLetterboxdFilm();
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot([], true));
        GivenWatchedOnLetterboxd(new LetterboxdFilmsSnapshot(
            [new LetterboxdFilm("dune-part-two", "Dune : Deuxième partie", "2024", Rating: 9)], true));
    }

    private void VerifyPendingKeysRecorded(params string[] keys) =>
        _users.Verify(
            u => u.RecordLetterboxdPendingChoicesAsync(
                UserId, keys.Length, It.Is<IReadOnlyList<string>>(stored => stored.SequenceEqual(keys)), It.IsAny<CancellationToken>()),
            Times.Once);

    private void GivenAmbiguousLetterboxdFilm()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot(
                [new LetterboxdFilm("dune-part-two", "Dune : Deuxième partie", "2024")], true));
        _tmdb
            .Setup(t => t.SearchTitlesAsync(
                "Dune : Deuxième partie",
                true,
                It.IsAny<int?>(),
                It.IsAny<int?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)
            [
                new TmdbSearchItem(1, MovieMediaType.Movie, "Autre film", "2024", null),
                new TmdbSearchItem(2, MovieMediaType.Movie, "Un autre film encore", "2024", null)
            ]);
    }

    private void GivenUser(
        string? username,
        DateTimeOffset? lastSyncAt,
        string? lastSyncError = null,
        int pendingReconciliationCount = 0,
        IReadOnlyList<string>? pendingChoiceKeys = null,
        bool syncWatchlist = true,
        bool syncWatched = true,
        Dictionary<LetterboxdImportTarget, LetterboxdListSync>? listSyncs = null) =>
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new User
            {
                Id = UserId,
                Email = "a@b.c",
                LetterboxdUsername = username,
                LetterboxdLastSyncAt = lastSyncAt,
                LetterboxdLastSyncError = lastSyncError,
                LetterboxdPendingReconciliationCount = pendingReconciliationCount,
                LetterboxdPendingChoiceKeys = pendingChoiceKeys,
                LetterboxdSyncWatchlist = syncWatchlist,
                LetterboxdSyncWatched = syncWatched,
                LetterboxdListSyncs = listSyncs ?? []
            });

    private void GivenTmdbTimesOut()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot(
                [new LetterboxdFilm("the-polar-express", "The Polar Express", "2004")], true));
        _tmdb
            .Setup(t => t.SearchTitlesAsync(
                It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskCanceledException("TMDB did not answer in time"));
    }

    private void VerifyStatusRecorded(string? error) =>
        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(UserId, Now, error, It.IsAny<IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync>>(), It.IsAny<CancellationToken>()),
            Times.Once);

    private void VerifyListsRecorded(string? error, params (LetterboxdImportTarget List, string? Error)[] lists) =>
        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(
                UserId,
                Now,
                error,
                It.Is<IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync>>(stored => SameLists(stored, lists)),
                It.IsAny<CancellationToken>()),
            Times.Once);

    private static bool SameLists(
        IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync> stored,
        (LetterboxdImportTarget List, string? Error)[] expected) =>
        stored.OrderBy(entry => entry.Key)
            .Select(entry => (entry.Key, entry.Value.At, entry.Value.Error))
            .SequenceEqual(expected.Select(list => (list.List, Now, list.Error)));

    private void VerifyWatchedFilmsRead(Times times) =>
        _letterboxd.Verify(
            l => l.GetWatchedFilmsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            times);

    private static LetterboxdListSyncResponse ListOf(LetterboxdSyncResponse result, LetterboxdImportTarget target) =>
        Assert.Single(result.Lists, list => list.Target == target);

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
    public async Task HandleAsync_SyncedAFewMinutesAgo_IsSkippedEvenWhenForced()
    {
        GivenUser(Username, Now - SyncLetterboxdWatchlistHandler.ForcedMinimumInterval + TimeSpan.FromSeconds(1));

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.True(result.Skipped);
        VerifyLetterboxdRead(Times.Never());
        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_FailedAFewMinutesAgo_IsSkippedEvenWhenForced()
    {
        GivenUser(Username, Now.AddMinutes(-1), lastSyncError: ErrorCodes.LetterboxdSyncUnavailable);

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.True(result.Skipped);
        VerifyLetterboxdRead(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_IntervalElapsed_RunsAgainWhenForced()
    {
        GivenUser(Username, Now - SyncLetterboxdWatchlistHandler.ForcedMinimumInterval);

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        VerifyLetterboxdRead(Times.Once());
    }

    [Fact]
    public void ForcedMinimumInterval_OutlastsTheLongestSyncTheRouteAllows()
    {
        Assert.True(SyncLetterboxdWatchlistHandler.ForcedMinimumInterval > RequestTimeoutPolicies.LongRunningBudget);
    }

    [Fact]
    public async Task HandleAsync_ForcedSync_CountsAgainstTheHourlyQuotaOfTheAccount()
    {
        await _sut.HandleAsync(UserId, force: true);

        var call = Assert.Single(_quota.Calls);
        Assert.Equal(SyncLetterboxdWatchlistHandler.ForcedSyncQuotaScope, call.Scope);
        Assert.Equal(UserId, call.Subject);
        Assert.Equal(SyncLetterboxdWatchlistHandler.MaxForcedSyncsPerHour, call.Limit);
        Assert.Equal(TimeSpan.FromHours(1), call.Window);
    }

    [Fact]
    public async Task HandleAsync_HourlyQuotaSpent_IsSkippedEvenAfterAUsernameChange()
    {
        GivenUser(Username, null);
        _quota.Allows = false;

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.True(result.Skipped);
        VerifyLetterboxdRead(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_AutomaticSync_LeavesTheHourlyQuotaAlone()
    {
        await _sut.HandleAsync(UserId, force: false);

        Assert.Empty(_quota.Calls);
    }

    [Fact]
    public async Task HandleAsync_Success_StampsTheSyncDateWithoutError()
    {
        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(UserId, Now, null, It.IsAny<IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync>>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchlist_RecordsTheErrorAndThrowsWhenForced()
    {
        GivenUser(Username, null, syncWatched: false);
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Failed());

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, force: true));

        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(
                UserId, Now, ErrorCodes.LetterboxdWatchlistIncomplete,
                It.IsAny<IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync>>(),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchlist_IsSkippedSilentlyWhenNotForced()
    {
        GivenUser(Username, null, syncWatched: false);
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Failed());

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.True(result.Skipped);
    }

    [Fact]
    public async Task HandleAsync_Success_StoresThePendingReconciliationCount()
    {
        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        _users.Verify(
            u => u.RecordLetterboxdPendingChoicesAsync(
                UserId, 0, It.Is<IReadOnlyList<string>>(keys => keys.Count == 0), It.IsAny<CancellationToken>()),
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
            u => u.RecordLetterboxdPendingChoicesAsync(
                UserId, 1, It.Is<IReadOnlyList<string>>(keys => keys.Count == 1 && keys[0] == "dune-part-two"), It.IsAny<CancellationToken>()),
            Times.Once);
        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(x =>
                    x.UserId == UserId && x.Type == UserNotificationType.LetterboxdReconciliationPending),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AutoSyncFindsTheChoicesAlreadyReported_DoesNotNotifyAgain()
    {
        GivenUser(Username, Now.AddDays(-2), pendingReconciliationCount: 1);
        GivenAmbiguousLetterboxdFilm();

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.Single(result.PendingChoices);
        _notifications.Verify(
            n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AutoSyncFindsTheSameChoiceByItsKey_DoesNotNotifyAgain()
    {
        GivenUser(Username, Now.AddDays(-2), pendingReconciliationCount: 1, pendingChoiceKeys: ["dune-part-two"]);
        GivenAmbiguousLetterboxdFilm();

        await _sut.HandleAsync(UserId, force: false);

        _notifications.Verify(
            n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AutoSyncFindsANewChoiceReplacingAnOldOne_NotifiesAtTheSameCount()
    {
        GivenUser(Username, Now.AddDays(-2), pendingReconciliationCount: 1, pendingChoiceKeys: ["left-the-watchlist"]);
        GivenAmbiguousLetterboxdFilm();

        await _sut.HandleAsync(UserId, force: false);

        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(x => x.Type == UserNotificationType.LetterboxdReconciliationPending),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_ManualSyncFindsAmbiguousFilm_DoesNotCreateNotification()
    {
        GivenUser(Username, Now.AddHours(-1));
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

    [Fact]
    public async Task HandleAsync_TmdbTimesOutDuringAManualSync_AnswersUnavailableAndRecordsIt()
    {
        GivenTmdbTimesOut();

        var ex = await Assert.ThrowsAsync<ServiceUnavailableException>(() => _sut.HandleAsync(UserId, force: true));

        Assert.Equal(ErrorCodes.LetterboxdSyncUnavailable, ex.Reason);
        VerifyStatusRecorded(ErrorCodes.LetterboxdSyncUnavailable);
    }

    [Fact]
    public async Task HandleAsync_TmdbTimesOutDuringAnAutoSync_IsSkippedAndRecorded()
    {
        GivenTmdbTimesOut();

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.True(result.Skipped);
        VerifyStatusRecorded(ErrorCodes.LetterboxdSyncUnavailable);
    }

    [Fact]
    public async Task HandleAsync_UnexpectedFailure_IsRecordedBeforePropagating()
    {
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("database unreachable"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.HandleAsync(UserId, force: true));

        VerifyStatusRecorded(ErrorCodes.LetterboxdSyncFailed);
    }

    [Fact]
    public async Task HandleAsync_LastSyncFailedMoreThanAnHourAgo_RetriesWithoutWaitingADay()
    {
        GivenUser(Username, Now.AddMinutes(-61), ErrorCodes.LetterboxdSyncUnavailable);

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.False(result.Skipped);
        VerifyLetterboxdRead(Times.Once());
    }

    [Fact]
    public async Task HandleAsync_LastSyncFailedMinutesAgo_WaitsBeforeRetrying()
    {
        GivenUser(Username, Now.AddMinutes(-10), ErrorCodes.LetterboxdSyncUnavailable);

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.True(result.Skipped);
        VerifyLetterboxdRead(Times.Never());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task HandleAsync_BothListsSwitchedOff_IsSkippedWithoutReadingLetterboxd(bool force)
    {
        GivenUser(Username, null, syncWatchlist: false, syncWatched: false);

        var result = await _sut.HandleAsync(UserId, force);

        Assert.True(result.Skipped);
        _letterboxd.Verify(l => l.GetWatchlistAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _letterboxd.Verify(l => l.GetWatchedFilmsAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
        _users.Verify(
            u => u.SetLetterboxdSyncStatusAsync(It.IsAny<string>(), It.IsAny<DateTimeOffset>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<LetterboxdImportTarget, LetterboxdListSync>>(), It.IsAny<CancellationToken>()),
            Times.Never);
        Assert.Empty(_quota.Calls);
    }

    [Fact]
    public async Task HandleAsync_AmbiguousWatchedFilm_IsRememberedUnderAWatchedKeyAndNotified()
    {
        GivenAmbiguousWatchedFilm();

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.Empty(ListOf(result, LetterboxdImportTarget.Watchlist).PendingChoices);
        var choice = Assert.Single(ListOf(result, LetterboxdImportTarget.Watched).PendingChoices);
        Assert.Equal((LetterboxdImportTarget.Watched, (int?)9, 1), (choice.Target, choice.Rating, choice.RowIndex));
        VerifyPendingKeysRecorded("watched:dune-part-two");
        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(x => x.Type == UserNotificationType.LetterboxdReconciliationPending),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_KeyStoredWithoutTarget_StillMeansTheWatchlist()
    {
        GivenUser(Username, Now.AddDays(-2), pendingReconciliationCount: 1, pendingChoiceKeys: ["dune-part-two"]);
        GivenAmbiguousWatchedFilm();

        await _sut.HandleAsync(UserId, force: false);

        _notifications.Verify(
            n => n.AddAsync(
                It.Is<UserNotification>(x => x.Type == UserNotificationType.LetterboxdReconciliationPending),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_AmbiguousFilmOnBothLists_KeepsOneKeyPerList()
    {
        GivenAmbiguousLetterboxdFilm();
        GivenWatchedOnLetterboxd(new LetterboxdFilmsSnapshot(
            [new LetterboxdFilm("dune-part-two", "Dune : Deuxième partie", "2024")], true));

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.Equal(
            (1, 1),
            (ListOf(result, LetterboxdImportTarget.Watchlist).PendingChoices.Count, ListOf(result, LetterboxdImportTarget.Watched).PendingChoices.Count));
        VerifyPendingKeysRecorded("dune-part-two", "watched:dune-part-two");
    }

    [Fact]
    public async Task HandleAsync_Success_RecordsTheTitlesLinkedToLetterboxd_AndReportsTheWatchedFilms()
    {
        await _watched.AddIfAbsentAsync(new WatchedTitle { OwnerId = UserId, TmdbId = 1, Origin = WatchedOrigin.Letterboxd, LetterboxdSlug = "one" });
        _watchlist
            .Setup(w => w.CountLinkedToLetterboxdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(3);
        GivenWatchedOnLetterboxd(new LetterboxdFilmsSnapshot(
            [new LetterboxdFilm("one", "One", "2001"), new LetterboxdFilm("akira", "Akira", "1988", Rating: 10)], true));
        _tmdb
            .Setup(t => t.SearchTitlesAsync("Akira", true, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira")]);

        var result = await _sut.HandleAsync(UserId, force: true);

        var watched = ListOf(result, LetterboxdImportTarget.Watched);
        Assert.Equal((1, 0, 2), (watched.Added, watched.Removed, watched.TotalOnLetterboxd));
        _users.Verify(u => u.SetLetterboxdLinkedCountsAsync(UserId, 3, 2, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_Success_ReportsEachListItSynced_WithItsOwnCountsAndDate()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdFilmsSnapshot([new LetterboxdFilm("unknown", "Unknown", "1999")], true));
        GivenWatchedOnLetterboxd(new LetterboxdFilmsSnapshot(
            [new LetterboxdFilm("akira", "Akira", "1988", Rating: 10), new LetterboxdFilm("solaris", "Solaris", "1972")], true));
        _tmdb
            .Setup(t => t.SearchTitlesAsync(It.IsAny<string>(), It.IsAny<bool>(), It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[]);
        _tmdb
            .Setup(t => t.SearchTitlesAsync("Akira", true, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira")]);

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.Equal(
            [
                (LetterboxdImportTarget.Watchlist, 0, 1, 1, false, (DateTimeOffset?)Now, (string?)null),
                (LetterboxdImportTarget.Watched, 1, 1, 2, false, (DateTimeOffset?)Now, (string?)null)
            ],
            result.Lists.Select(list => (list.Target, list.Added, list.UnmatchedTitles.Count, list.TotalOnLetterboxd, list.Incomplete, list.LastSyncAt, list.Error)));
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchedFilms_RecordsTheDateAndErrorOfEachList()
    {
        GivenWatchedOnLetterboxd(LetterboxdFilmsSnapshot.Failed());

        await _sut.HandleAsync(UserId, force: true);

        VerifyListsRecorded(
            ErrorCodes.LetterboxdWatchedIncomplete,
            (LetterboxdImportTarget.Watchlist, null),
            (LetterboxdImportTarget.Watched, ErrorCodes.LetterboxdWatchedIncomplete));
    }

    [Fact]
    public async Task HandleAsync_WatchedFilmsFailedAloneTwoHoursAgo_RetriesThemWithoutRereadingTheWatchlist()
    {
        GivenUser(
            Username,
            Now.AddHours(-2),
            ErrorCodes.LetterboxdWatchedIncomplete,
            listSyncs: new()
            {
                [LetterboxdImportTarget.Watchlist] = new LetterboxdListSync(Now.AddHours(-2), null),
                [LetterboxdImportTarget.Watched] = new LetterboxdListSync(Now.AddHours(-2), ErrorCodes.LetterboxdWatchedIncomplete)
            });

        var result = await _sut.HandleAsync(UserId, force: false);

        Assert.Equal(LetterboxdImportTarget.Watched, Assert.Single(result.Lists).Target);
        VerifyLetterboxdRead(Times.Never());
        VerifyWatchedFilmsRead(Times.Once());
        VerifyListsRecorded(null, (LetterboxdImportTarget.Watched, null));
    }

    [Fact]
    public async Task HandleAsync_SharedStatusOfAnOlderRevision_StillRetriesOnlyTheListThatFailed()
    {
        GivenUser(Username, Now.AddHours(-2), ErrorCodes.LetterboxdWatchedIncomplete);

        await _sut.HandleAsync(UserId, force: false);

        VerifyLetterboxdRead(Times.Never());
        VerifyWatchedFilmsRead(Times.Once());
    }

    [Fact]
    public async Task HandleAsync_ListSyncedMinutesAgo_IsLeftOutOfAForcedSync()
    {
        GivenUser(
            Username,
            Now.AddMinutes(-2),
            listSyncs: new()
            {
                [LetterboxdImportTarget.Watchlist] = new LetterboxdListSync(Now.AddHours(-3), null),
                [LetterboxdImportTarget.Watched] = new LetterboxdListSync(Now.AddMinutes(-2), null)
            });

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.Equal(LetterboxdImportTarget.Watchlist, Assert.Single(result.Lists).Target);
        VerifyWatchedFilmsRead(Times.Never());
    }

    [Fact]
    public async Task HandleAsync_Success_KeepsTheFlatFieldsTheOlderFrontStillReads()
    {
        GivenAmbiguousLetterboxdFilm();
        GivenWatchedOnLetterboxd(new LetterboxdFilmsSnapshot(
            [new LetterboxdFilm("dune-part-two", "Dune : Deuxième partie", "2024")], true));

        var result = await _sut.HandleAsync(UserId, force: true);

        var watchlist = ListOf(result, LetterboxdImportTarget.Watchlist);
        var watched = ListOf(result, LetterboxdImportTarget.Watched);
        Assert.Equal(
            (watchlist.Added, watchlist.Removed, watchlist.PendingChoices, watchlist.TotalOnLetterboxd),
            (result.Added, result.Removed, result.PendingChoices, result.TotalOnLetterboxd));
        Assert.Equal(
            (watched.Added, watched.Removed, watched.PendingChoices, watched.TotalOnLetterboxd),
            (result.WatchedAdded, result.WatchedRemoved, result.WatchedPendingChoices, result.WatchedTotalOnLetterboxd));
    }

    [Fact]
    public async Task HandleAsync_WatchlistSwitchedOff_ReportsTheWatchedFilmsAlone()
    {
        GivenUser(Username, null, syncWatchlist: false);

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.Equal(LetterboxdImportTarget.Watched, Assert.Single(result.Lists).Target);
    }

    [Fact]
    public async Task HandleAsync_AccountDeletedWhileTheSyncRuns_WritesNoFurtherFilm()
    {
        var deleted = GivenAccountDeletedOnWatchedFilmsRead(
            new LetterboxdFilmsSnapshot([new LetterboxdFilm("akira", "Akira", "1988", Rating: 10)], true));
        _tmdb
            .Setup(t => t.SearchTitlesAsync("Akira", true, It.IsAny<int?>(), It.IsAny<int?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<TmdbSearchItem>)[new TmdbSearchItem(149, MovieMediaType.Movie, "Akira", "1988", null, 8.0, "Akira")]);

        var refusal = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(UserId, force: true));

        Assert.True(deleted());
        Assert.Equal(ErrorCodes.UserNotFound, refusal.Reason);
        Assert.Empty(await _watched.ListByOwnerAsync(UserId));
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_AccountDeletedWhileTheSyncRuns_LeavesNoReconciliationNotification()
    {
        GivenAmbiguousLetterboxdFilm();
        var deleted = GivenAccountDeletedOnWatchedFilmsRead(new LetterboxdFilmsSnapshot([], true));

        var refusal = await Assert.ThrowsAsync<NotFoundException>(() => _sut.HandleAsync(UserId, force: false));

        Assert.True(deleted());
        Assert.Equal(ErrorCodes.UserNotFound, refusal.Reason);
        _notifications.Verify(n => n.AddAsync(It.IsAny<UserNotification>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    private Func<bool> GivenAccountDeletedOnWatchedFilmsRead(LetterboxdFilmsSnapshot watched)
    {
        var deleted = false;
        var account = new User
        {
            Id = UserId,
            Email = "a@b.c",
            LetterboxdUsername = Username,
            LetterboxdSyncWatchlist = true,
            LetterboxdSyncWatched = true
        };
        _users
            .Setup(u => u.GetByIdAsync(UserId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() => deleted ? null : account);
        _letterboxd
            .Setup(l => l.GetWatchedFilmsAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(() =>
            {
                deleted = true;
                return watched;
            });
        return () => deleted;
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchedFilms_SyncsTheWatchlist_AndRecordsTheWatchedError()
    {
        GivenWatchedOnLetterboxd(LetterboxdFilmsSnapshot.Failed());

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        Assert.Equal(ErrorCodes.LetterboxdWatchedIncomplete, result.Error);
        Assert.Equal(
            [(LetterboxdImportTarget.Watchlist, false, (string?)null), (LetterboxdImportTarget.Watched, true, ErrorCodes.LetterboxdWatchedIncomplete)],
            result.Lists.Select(list => (list.Target, list.Incomplete, list.Error)));
        VerifyStatusRecorded(ErrorCodes.LetterboxdWatchedIncomplete);
        _users.Verify(u => u.SetLetterboxdLinkedCountsAsync(UserId, 0, 0, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchlist_SyncsTheWatchedFilms_AndRecordsTheWatchlistError()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Failed());

        var result = await _sut.HandleAsync(UserId, force: true);

        Assert.False(result.Skipped);
        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, result.Error);
        VerifyStatusRecorded(ErrorCodes.LetterboxdWatchlistIncomplete);
    }

    [Fact]
    public async Task HandleAsync_BothListsUnreadable_RecordsTheWatchlistErrorAndThrowsWhenForced()
    {
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Failed());
        GivenWatchedOnLetterboxd(LetterboxdFilmsSnapshot.Failed());

        var ex = await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, force: true));

        Assert.Equal(ErrorCodes.LetterboxdWatchlistIncomplete, ex.Reason);
        VerifyStatusRecorded(ErrorCodes.LetterboxdWatchlistIncomplete);
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchedFilms_KeepsTheirPendingChoicesAlreadyReported()
    {
        GivenUser(Username, Now.AddDays(-2), pendingReconciliationCount: 3, pendingChoiceKeys: ["old-watchlist-choice", "watched:solaris", "watched:stalker"]);
        GivenAmbiguousLetterboxdFilm();
        GivenWatchedOnLetterboxd(LetterboxdFilmsSnapshot.Failed());

        await _sut.HandleAsync(UserId, force: true);

        VerifyPendingKeysRecorded("dune-part-two", "watched:solaris", "watched:stalker");
    }

    [Fact]
    public async Task HandleAsync_UnreadableWatchlist_KeepsItsPendingChoicesAlreadyReported()
    {
        GivenUser(Username, Now.AddDays(-2), pendingReconciliationCount: 2, pendingChoiceKeys: ["dune-part-two", "watched:solaris"]);
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Failed());

        await _sut.HandleAsync(UserId, force: true);

        VerifyPendingKeysRecorded("dune-part-two");
    }

    [Theory]
    [InlineData(true, "manual")]
    [InlineData(false, "auto")]
    public async Task HandleAsync_SyncThatRan_IsCountedAsManualOrAutomatic(bool force, string variant)
    {
        await _sut.HandleAsync(UserId, force);

        _usage.Verify(
            x => x.RecordAsync(
                It.Is<UsageCount>(c => c.Metric == UsageCount.LetterboxdSyncedMetric && c.Variant == variant),
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleAsync_SkippedSync_IsNotCounted()
    {
        GivenUser(Username, Now.AddHours(-5));

        await _sut.HandleAsync(UserId, force: false);

        _usage.Verify(x => x.RecordAsync(It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_SyncWhoseLastWritesFail_IsNotCounted()
    {
        _users
            .Setup(u => u.RecordLetterboxdPendingChoicesAsync(
                UserId, It.IsAny<int>(), It.IsAny<IReadOnlyList<string>>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("write failed"));

        await Assert.ThrowsAsync<InvalidOperationException>(() => _sut.HandleAsync(UserId, force: true));

        _usage.Verify(x => x.RecordAsync(It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task HandleAsync_FailedSync_IsNotCounted()
    {
        GivenUser(Username, null, syncWatched: false);
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(Username, It.IsAny<CancellationToken>()))
            .ReturnsAsync(LetterboxdFilmsSnapshot.Failed());

        await Assert.ThrowsAsync<BadRequestException>(() => _sut.HandleAsync(UserId, force: true));

        _usage.Verify(x => x.RecordAsync(It.IsAny<UsageCount>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
