using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.BackgroundServices;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.BackgroundServices;

public sealed class LetterboxdWatchlistSyncRunnerTests
{
    private const string UserId = "u1";
    private const string LetterboxdUsername = "affy657";

    private readonly Mock<IUserRepository> _users = new();
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ILetterboxdWatchlistClient> _letterboxd = new();

    public LetterboxdWatchlistSyncRunnerTests()
    {
        _users
            .Setup(u => u.ListWithLetterboxdSyncEnabledAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<User>)
            [
                new User { Id = UserId, Email = "a@b.c", LetterboxdUsername = LetterboxdUsername }
            ]);
        _watchlist
            .Setup(w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
    }

    private static WatchlistItem Item(int tmdbId, string title, string? slug) => new()
    {
        Id = $"i{tmdbId}",
        UserId = UserId,
        TmdbId = tmdbId,
        MediaType = MovieMediaType.Movie,
        Title = title,
        Year = "2010",
        LetterboxdSlug = slug,
        CreatedAt = DateTimeOffset.UnixEpoch
    };

    private void GivenWatchlist(params WatchlistItem[] items) =>
        _watchlist
            .Setup(w => w.ListByUserIdAsync(UserId, It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)items);

    private void GivenLetterboxd(bool isComplete, params string[] slugs) =>
        _letterboxd
            .Setup(l => l.GetWatchlistAsync(LetterboxdUsername, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LetterboxdWatchlistSnapshot(
                slugs.Select(s => new LetterboxdFilm(s, s, "2010")).ToList(),
                isComplete));

    private Task<int> RunSyncAsync() =>
        new LetterboxdWatchlistSyncRunner(
            _users.Object,
            _watchlist.Object,
            _letterboxd.Object,
            NullLogger<LetterboxdWatchlistSyncRunner>.Instance).RunAsync();

    private void VerifyRemoved(int tmdbId, Times times) =>
        _watchlist.Verify(
            w => w.RemoveAsync(UserId, tmdbId, MovieMediaType.Movie, It.IsAny<CancellationToken>()),
            times);

    [Fact]
    public async Task Sync_RemovesTrackedFilmThatLeftTheLetterboxdWatchlist()
    {
        GivenWatchlist(Item(27205, "Inception", "inception"));
        GivenLetterboxd(isComplete: true, "dune");

        await RunSyncAsync();

        VerifyRemoved(27205, Times.Once());
    }

    [Fact]
    public async Task Sync_KeepsTrackedFilmStillOnTheLetterboxdWatchlist()
    {
        GivenWatchlist(Item(27205, "Inception", "inception"));
        GivenLetterboxd(isComplete: true, "inception", "dune");

        await RunSyncAsync();

        VerifyRemoved(27205, Times.Never());
    }

    [Fact]
    public async Task Sync_NeverRemovesFilmAddedDirectlyInMoviePicker()
    {
        GivenWatchlist(Item(27205, "Inception", null));
        GivenLetterboxd(isComplete: true, "dune");

        await RunSyncAsync();

        VerifyRemoved(27205, Times.Never());
        _letterboxd.Verify(
            l => l.GetWatchlistAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never());
    }

    [Fact]
    public async Task Sync_IncompleteSnapshot_RemovesNothing()
    {
        GivenWatchlist(Item(27205, "Inception", "inception"), Item(438631, "Dune", "dune"));
        GivenLetterboxd(isComplete: false);

        await RunSyncAsync();

        _watchlist.Verify(
            w => w.RemoveAsync(
                It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never());
    }

    [Fact]
    public async Task Sync_EmptyLetterboxdWatchlist_RemovesEveryTrackedFilm()
    {
        GivenWatchlist(Item(27205, "Inception", "inception"), Item(438631, "Dune", null));
        GivenLetterboxd(isComplete: true);

        await RunSyncAsync();

        VerifyRemoved(27205, Times.Once());
        VerifyRemoved(438631, Times.Never());
    }
}
