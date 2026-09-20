using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Watchlist;

public sealed class AddToWatchlistHandlerTests
{
    private const string UserId = "u1";
    private static readonly int[] GenreIds = [28, 878];

    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<IPosterImageStore> _posterImageStore = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly AddToWatchlistHandler _sut;

    public AddToWatchlistHandlerTests()
    {
        _posterImageStore.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? p) => p);
        _tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);
        _sut = new AddToWatchlistHandler(
            _watchlist.Object,
            _posterImageStore.Object,
            TimeProvider.System,
            _tmdb.Object,
            NullLogger<AddToWatchlistHandler>.Instance);
    }

    private static AddWatchlistItemRequest Request(double? voteAverage = 8.3, int? runtimeMinutes = 136) => new()
    {
        TmdbId = 42,
        MediaType = MovieMediaType.Movie,
        Title = "Matrix",
        Year = "1999",
        PosterPath = null,
        VoteAverage = voteAverage,
        RuntimeMinutes = runtimeMinutes
    };

    private static TmdbMovieDetails MatrixDetails(int? runtime, double? voteAverage = null) =>
        new(42, "Matrix", null, null, null, [], runtime, [], GenreIds, "1999-03-31", VoteAverage: voteAverage);


    [Fact]
    public async Task HandleAsync_NewItem_Persists_AndReturnsIt()
    {
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.Equal(42, result.TmdbId);
        Assert.Equal("Matrix", result.Title);
        Assert.Equal(8.3, result.VoteAverage);
        Assert.Equal(136, result.RuntimeMinutes);
        _watchlist.Verify(
            w => w.GetOneAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task HandleAsync_DuplicateItem_ReturnsExistingStoredItem_NotAFabricatedOne()
    {
        var existing = new WatchlistItem
        {
            Id = "existing-id",
            UserId = UserId,
            TmdbId = 42,
            MediaType = MovieMediaType.Movie,
            Title = "Matrix (déjà en liste)",
            Year = "1999",
            PosterPath = null,
            VoteAverage = 8.3,
            RuntimeMinutes = 136,
            CreatedAt = new DateTimeOffset(2020, 1, 1, 0, 0, 0, TimeSpan.Zero)
        };
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _watchlist.Setup(w => w.GetOneAsync(UserId, 42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(existing);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.Equal(existing.CreatedAt, result.CreatedAt);
        Assert.Equal(existing.Title, result.Title);
        Assert.NotEqual(DateTimeOffset.UtcNow.Date, result.CreatedAt.Date);
    }

    [Fact]
    public async Task HandleAsync_DuplicateItem_ExistingVanished_FallsBackToConstructedItem()
    {
        _watchlist.Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _watchlist.Setup(w => w.GetOneAsync(UserId, 42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync((WatchlistItem?)null);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.Equal(42, result.TmdbId);
        Assert.Equal("Matrix", result.Title);
    }

    [Fact]
    public async Task HandleAsync_FetchesAndPersistsTmdbGenreIds_OnNewItem()
    {
        WatchlistItem? inserted = null;
        _tmdb
            .Setup(t => t.GetDetailsAsync(42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(42, "Matrix", null, null, null, [], 136, [], GenreIds, "1999-03-31"));
        _watchlist
            .Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .Callback<WatchlistItem, CancellationToken>((i, _) => inserted = i)
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.NotNull(inserted);
        Assert.Equal(GenreIds, inserted!.GenreIds);
        Assert.Equal(GenreIds, result.GenreIds);
    }

    [Fact]
    public async Task HandleAsync_TmdbFails_AddsItemWithoutGenres()
    {
        WatchlistItem? inserted = null;
        _tmdb
            .Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("TMDB indisponible"));
        _watchlist
            .Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .Callback<WatchlistItem, CancellationToken>((i, _) => inserted = i)
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync(UserId, Request());

        Assert.NotNull(inserted);
        Assert.Empty(inserted!.GenreIds);
        Assert.Equal(42, result.TmdbId);
    }

    [Fact]
    public async Task HandleAsync_RequestWithoutFacts_TakesRuntimeAndVoteFromTmdbDetails()
    {
        WatchlistItem? inserted = null;
        _tmdb
            .Setup(t => t.GetDetailsAsync(42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MatrixDetails(136, 8.2));
        _watchlist
            .Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .Callback<WatchlistItem, CancellationToken>((i, _) => inserted = i)
            .ReturnsAsync(true);

        var result = await _sut.HandleAsync(UserId, Request(voteAverage: null, runtimeMinutes: null));

        Assert.Equal(136, inserted!.RuntimeMinutes);
        Assert.Equal(8.2, inserted.VoteAverage);
        Assert.Equal(136, result.RuntimeMinutes);
        Assert.Equal(8.2, result.VoteAverage);
    }

    [Fact]
    public async Task HandleAsync_RequestWithFacts_KeepsThemOverTmdbDetails()
    {
        WatchlistItem? inserted = null;
        _tmdb
            .Setup(t => t.GetDetailsAsync(42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MatrixDetails(150, 7.0));
        _watchlist
            .Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .Callback<WatchlistItem, CancellationToken>((i, _) => inserted = i)
            .ReturnsAsync(true);

        await _sut.HandleAsync(UserId, Request());

        Assert.Equal(136, inserted!.RuntimeMinutes);
        Assert.Equal(8.3, inserted.VoteAverage);
    }

    [Fact]
    public async Task HandleAsync_ZeroRuntimeInRequest_IsReplacedByTmdbRuntime()
    {
        WatchlistItem? inserted = null;
        _tmdb
            .Setup(t => t.GetDetailsAsync(42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync(MatrixDetails(136));
        _watchlist
            .Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .Callback<WatchlistItem, CancellationToken>((i, _) => inserted = i)
            .ReturnsAsync(true);

        await _sut.HandleAsync(UserId, Request(runtimeMinutes: 0));

        Assert.Equal(136, inserted!.RuntimeMinutes);
    }

    [Fact]
    public async Task HandleAsync_TmdbWithoutFacts_LeavesTheRequestValues()
    {
        WatchlistItem? inserted = null;
        _watchlist
            .Setup(w => w.AddAsync(It.IsAny<WatchlistItem>(), It.IsAny<CancellationToken>()))
            .Callback<WatchlistItem, CancellationToken>((i, _) => inserted = i)
            .ReturnsAsync(true);

        await _sut.HandleAsync(UserId, Request(voteAverage: null, runtimeMinutes: null));

        Assert.Null(inserted!.RuntimeMinutes);
        Assert.Null(inserted.VoteAverage);
    }
}
