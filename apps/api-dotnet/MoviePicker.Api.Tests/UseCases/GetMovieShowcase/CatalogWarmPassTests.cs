using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class CatalogWarmPassTests
{
    private readonly Mock<IGetMovieShowcaseHandler> _showcase = new();
    private readonly Mock<IGetMovieCollectionsHandler> _collections = new();

    private CatalogWarmPass Build() =>
        new(_showcase.Object, _collections.Object, NullLogger<CatalogWarmPass>.Instance);

    [Fact]
    public void CatalogQueries_CoverTheHomeSectionsEveryThemeAndEveryPlatform()
    {
        var queries = CatalogWarmPass.CatalogQueries();

        Assert.Contains(queries, q => q.Section == MovieShowcaseSections.Trending);
        Assert.Contains(queries, q => q.Section == MovieShowcaseSections.NowPlaying);
        Assert.Contains(queries, q => q.Section == MovieShowcaseSections.MostProposed);
        Assert.Equal(MovieShowcaseCatalog.ThemeKeys.Count, queries.Count(q => q.Section == MovieShowcaseSections.Theme));
        Assert.Equal(MovieShowcaseCatalog.ProviderKeys.Count, queries.Count(q => q.Section == MovieShowcaseSections.Provider));
    }

    [Fact]
    public async Task RunAsync_RefreshesEverySectionAndTheCollections()
    {
        _showcase.Setup(s => s.RefreshAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _collections.Setup(c => c.RefreshAsync(It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var result = await Build().RunAsync();

        Assert.Equal(new CatalogWarmPassResult(CatalogWarmPass.CatalogQueries().Count + 1, 0), result);
    }

    [Fact]
    public async Task RunAsync_ASectionKeptItsOlderSnapshot_IsReportedAsFailed()
    {
        _showcase.Setup(s => s.RefreshAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _showcase.Setup(s => s.RefreshAsync(It.Is<MovieShowcaseQuery>(q => q.Section == MovieShowcaseSections.NowPlaying), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _collections.Setup(c => c.RefreshAsync(It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var result = await Build().RunAsync();

        Assert.Equal(2, result.Failed);
    }
}
