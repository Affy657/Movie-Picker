using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.Watchlist;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.Watchlist;

public sealed class GetWatchlistAvailabilityHandlerTests
{
    private readonly Mock<IWatchlistRepository> _watchlist = new();
    private readonly Mock<ITmdbMovieSearch> _tmdb = new();

    private GetWatchlistAvailabilityHandler Build(string? apiKey = "key", string region = "FR") =>
        new(_watchlist.Object, _tmdb.Object, Options.Create(new MoviePickerOptions { TmdbApiKey = apiKey, TmdbWatchProvidersRegion = region }));

    private static WatchlistItem Item(int tmdbId, MovieMediaType mediaType = MovieMediaType.Movie) => new()
    {
        Id = tmdbId.ToString(),
        UserId = "u1",
        TmdbId = tmdbId,
        MediaType = mediaType,
        Title = $"Film {tmdbId}",
        Year = "2000",
        CreatedAt = DateTimeOffset.UtcNow
    };

    private void ListReturns(params WatchlistItem[] items) =>
        _watchlist.Setup(w => w.ListPageByUserIdAsync("u1", 0, 500, It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<WatchlistItem>)items);

    [Fact]
    public async Task HandleAsync_WithoutTmdbCredentials_ReturnsEmptyWithoutReadingTheList()
    {
        var result = await Build(apiKey: null).HandleAsync("u1");

        Assert.Empty(result.Items);
        _watchlist.Verify(w => w.ListPageByUserIdAsync(It.IsAny<string>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Never);
        _tmdb.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_EmptyList_SkipsTmdb()
    {
        ListReturns();

        var result = await Build().HandleAsync("u1");

        Assert.Empty(result.Items);
        _tmdb.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task HandleAsync_EnrichesEveryItemInOneBatch_UsingTheConfiguredRegion()
    {
        ListReturns(Item(1), Item(2, MovieMediaType.Tv), Item(3));
        IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)>? requested = null;
        _tmdb.Setup(t => t.GetEnrichmentsAsync(It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(), "BE", It.IsAny<CancellationToken>()))
            .Callback<IReadOnlyCollection<(int TmdbId, MovieMediaType MediaType)>, string, CancellationToken>((keys, _, _) => requested = keys)
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(1, MovieMediaType.Movie)] = new TmdbMovieEnrichment(
                    7.5,
                    [new TmdbWatchProviderOffer(8, "Netflix", "/n.png", "flatrate")],
                    "https://www.themoviedb.org/movie/1/watch?locale=BE",
                    112),
                [(2, MovieMediaType.Tv)] = null
            });

        var result = await Build(region: " be ").HandleAsync("u1");

        Assert.Equal([(1, MovieMediaType.Movie), (2, MovieMediaType.Tv), (3, MovieMediaType.Movie)], requested!.ToArray());
        Assert.Equal(2, result.Items.Count);
        Assert.True(result.Partial);

        var first = result.Items[0];
        Assert.Equal(1, first.TmdbId);
        var offer = Assert.Single(first.WatchProviders);
        Assert.Equal("Netflix", offer.Name);
        Assert.Equal("flatrate", offer.Type);
        Assert.Equal(112, first.RuntimeMinutes);
        Assert.Equal(7.5, first.VoteAverage);
        Assert.Contains("locale=BE", first.TmdbWatchPageUrl);

        var failed = result.Items[1];
        Assert.Equal(MovieMediaType.Tv, failed.MediaType);
        Assert.Empty(failed.WatchProviders);
        Assert.Null(failed.RuntimeMinutes);
    }

    [Fact]
    public async Task HandleAsync_EveryTitleResolved_IsNotPartial()
    {
        ListReturns(Item(1), Item(2));
        _tmdb.Setup(t => t.GetEnrichmentsAsync(It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(), "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(1, MovieMediaType.Movie)] = new TmdbMovieEnrichment(7.5, [], null, 112),
                [(2, MovieMediaType.Movie)] = null
            });

        var result = await Build().HandleAsync("u1");

        Assert.Equal(2, result.Items.Count);
        Assert.False(result.Partial);
    }

    [Fact]
    public async Task HandleAsync_DuplicateTitles_AreRequestedOnce()
    {
        ListReturns(Item(1), Item(1));
        _tmdb.Setup(t => t.GetEnrichmentsAsync(It.Is<IReadOnlyCollection<(int, MovieMediaType)>>(k => k.Count == 1), "FR", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new Dictionary<(int TmdbId, MovieMediaType MediaType), TmdbMovieEnrichment?>
            {
                [(1, MovieMediaType.Movie)] = null
            });

        var result = await Build().HandleAsync("u1");

        Assert.Equal(2, result.Items.Count);
        Assert.False(result.Partial);
        _tmdb.Verify(t => t.GetEnrichmentsAsync(It.IsAny<IReadOnlyCollection<(int, MovieMediaType)>>(), "FR", It.IsAny<CancellationToken>()), Times.Once);
    }
}
