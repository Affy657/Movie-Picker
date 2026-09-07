using Microsoft.AspNetCore.Mvc;
using Moq;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Controllers;
using Xunit;

namespace MoviePicker.Api.Tests.Controllers;

public sealed class MoviesShowcaseControllerTests
{
    private readonly Mock<IGetMovieShowcaseHandler> _showcase = new();
    private readonly Mock<IGetMovieCollectionsHandler> _collections = new();
    private readonly MoviesShowcaseController _controller = new();

    private MovieShowcaseQuery? _captured;

    private void CaptureQuery()
    {
        _showcase
            .Setup(h => h.HandleAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>()))
            .Callback((MovieShowcaseQuery q, CancellationToken _) => _captured = q)
            .ReturnsAsync(new MovieShowcaseListResponse { Items = [] });
    }

    private Task<IActionResult> GetShowcaseAsync(
        string? section = null,
        string? theme = null,
        string? genreIds = null,
        int? collectionId = null,
        string? provider = null,
        int? seedTmdbId = null) =>
        _controller.GetShowcase(
            section, theme, genreIds, collectionId, provider, seedTmdbId, _showcase.Object, CancellationToken.None);

    [Fact]
    public async Task GetShowcase_WithoutSection_FallsBackToTrending()
    {
        CaptureQuery();

        var result = await GetShowcaseAsync();

        Assert.IsType<OkObjectResult>(result);
        Assert.Equal(MovieShowcaseSections.Trending, _captured!.Section);
    }

    [Fact]
    public async Task GetShowcase_ForwardsEveryQueryParameter()
    {
        CaptureQuery();

        await GetShowcaseAsync(
            section: MovieShowcaseSections.Theme,
            theme: "frissons",
            collectionId: 10,
            provider: "netflix",
            seedTmdbId: 27_205);

        Assert.Equal(MovieShowcaseSections.Theme, _captured!.Section);
        Assert.Equal("frissons", _captured.Theme);
        Assert.Equal(10, _captured.CollectionId);
        Assert.Equal("netflix", _captured.Provider);
        Assert.Equal(27_205, _captured.SeedTmdbId);
    }

    [Theory]
    [InlineData("28,18", new[] { 28, 18 })]
    [InlineData(" 28 , 18 ", new[] { 28, 18 })]
    [InlineData("28,abc,18", new[] { 28, 18 })]
    [InlineData("0,-3,28", new[] { 28 })]
    public async Task GetShowcase_ParsesGenreIds(string raw, int[] expected)
    {
        CaptureQuery();

        await GetShowcaseAsync(genreIds: raw);

        Assert.Equal(expected, _captured!.GenreIds);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task GetShowcase_WithoutGenreIds_SendsAnEmptyList(string? raw)
    {
        CaptureQuery();

        await GetShowcaseAsync(genreIds: raw);

        Assert.Empty(_captured!.GenreIds!);
    }

    [Fact]
    public async Task GetShowcase_ReturnsTheHandlerPayload()
    {
        var payload = new MovieShowcaseListResponse
        {
            Section = MovieShowcaseSections.Trending,
            Items = [new MovieShowcaseItemResponse { Id = 27_205, Title = "Inception" }],
        };
        _showcase
            .Setup(h => h.HandleAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(payload);

        var result = await GetShowcaseAsync();

        Assert.Same(payload, Assert.IsType<OkObjectResult>(result).Value);
    }

    [Fact]
    public async Task GetCollections_ReturnsTheHandlerPayload()
    {
        var payload = new MovieCollectionListResponse { Items = [] };
        _collections
            .Setup(h => h.HandleAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(payload);

        var result = await _controller.GetCollections(_collections.Object, CancellationToken.None);

        Assert.Same(payload, Assert.IsType<OkObjectResult>(result).Value);
    }
}
