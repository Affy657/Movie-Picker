using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class StubTmdbMovieSearchShowcaseTests
{
    private readonly StubTmdbMovieSearch _stub = new();

    [Fact]
    public async Task GetTrendingMoviesAsync_ReturnsTwentyItemsPerPage()
    {
        var items = await _stub.GetTrendingMoviesAsync(3, CatalogLanguage.French);

        Assert.Equal(60, items.Count);
        Assert.All(items, item => Assert.StartsWith("Tendance stub", item.Title));
    }

    [Fact]
    public async Task GetNowPlayingMoviesAsync_ReturnsItemsForTheRegion()
    {
        var items = await _stub.GetNowPlayingMoviesAsync("FR", 1, CatalogLanguage.French);

        Assert.Equal(20, items.Count);
        Assert.All(items, item => Assert.StartsWith("En salles stub", item.Title));
    }

    [Fact]
    public async Task DiscoverMoviesAsync_UsesTheRequestedGenre()
    {
        var items = await _stub.DiscoverMoviesAsync(new TmdbDiscoveryCriteria(GenreIds: [27]), 1, CatalogLanguage.French);

        Assert.Equal(20, items.Count);
        Assert.All(items, item => Assert.StartsWith("Sélection stub", item.Title));
    }

    [Fact]
    public async Task DiscoverMoviesAsync_WithoutGenre_StillReturnsItems()
    {
        var items = await _stub.DiscoverMoviesAsync(new TmdbDiscoveryCriteria(VoteMin: 7), 2, CatalogLanguage.French);

        Assert.Equal(40, items.Count);
    }

    [Fact]
    public async Task DiscoverMoviesAsync_CapsThePageCount()
    {
        var items = await _stub.DiscoverMoviesAsync(new TmdbDiscoveryCriteria(VoteMin: 7), 50, CatalogLanguage.French);

        Assert.Equal(200, items.Count);
    }

    [Fact]
    public async Task GetCollectionAsync_DescribesTheRequestedCollection()
    {
        var summary = await _stub.GetCollectionAsync(1_241, CatalogLanguage.French);

        Assert.NotNull(summary);
        Assert.Equal(1_241, summary!.Id);
        Assert.Equal("Saga stub 1241", summary.Name);
        Assert.Equal(4, summary.MovieCount);
        Assert.Empty(summary.PartPosterPaths);
        Assert.Equal([731_241, 731_242, 731_243, 731_244], summary.PartIds);
    }

    [Fact]
    public async Task GetCollectionMoviesAsync_ReturnsFourFilms()
    {
        var items = await _stub.GetCollectionMoviesAsync(1_241, CatalogLanguage.French);

        Assert.Equal(4, items.Count);
    }

    [Fact]
    public async Task GetRecommendationsAsync_ReturnsSixFilmsTiedToTheSeed()
    {
        var items = await _stub.GetRecommendationsAsync(27_205, MovieMediaType.Movie, CatalogLanguage.French);

        Assert.Equal(6, items.Count);
        Assert.All(items, item => Assert.Contains("27205", item.Title));
    }

    [Fact]
    public async Task Sections_DoNotShareTheirIdentifiers()
    {
        var trending = await _stub.GetTrendingMoviesAsync(1, CatalogLanguage.French);
        var nowPlaying = await _stub.GetNowPlayingMoviesAsync("FR", 1, CatalogLanguage.French);

        Assert.Empty(trending.Select(i => i.Id).Intersect(nowPlaying.Select(i => i.Id)));
    }
}
