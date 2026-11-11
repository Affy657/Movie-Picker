using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Caching;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.GetMovieShowcase;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.GetMovieShowcase;

public sealed class GetMovieShowcaseThemesHandlerTests
{
    private readonly Mock<IGetMovieShowcaseHandler> _showcase = new();

    private GetMovieShowcaseThemesHandler Build() => Build(_showcase.Object);

    private static GetMovieShowcaseThemesHandler Build(IGetMovieShowcaseHandler showcase) =>
        new(showcase, NullLogger<GetMovieShowcaseThemesHandler>.Instance);

    private static MovieShowcaseItemResponse Item(string title, string? posterPath) =>
        new() { Title = title, PosterPath = posterPath };

    private static bool IsThemeQuery(MovieShowcaseQuery query, string theme) =>
        query.Section == MovieShowcaseSections.Theme && query.Theme == theme;

    private void GivenTheme(string theme, params MovieShowcaseItemResponse[] items) =>
        _showcase
            .Setup(s => s.HandleAsync(It.Is<MovieShowcaseQuery>(q => IsThemeQuery(q, theme)), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new MovieShowcaseListResponse { Section = MovieShowcaseSections.Theme, Theme = theme, Items = items });

    private void GivenThemeFails(string theme, Exception failure) =>
        _showcase
            .Setup(s => s.HandleAsync(It.Is<MovieShowcaseQuery>(q => IsThemeQuery(q, theme)), It.IsAny<CancellationToken>()))
            .ThrowsAsync(failure);

    private void GivenEveryThemeHasPosters()
    {
        foreach (var theme in MovieShowcaseCatalog.ThemeKeys)
        {
            GivenTheme(
                theme,
                Item($"{theme} 1", $"/{theme}-1.jpg"),
                Item($"{theme} 2", $"/{theme}-2.jpg"),
                Item($"{theme} 3", $"/{theme}-3.jpg"),
                Item($"{theme} 4", $"/{theme}-4.jpg"));
        }
    }

    [Fact]
    public async Task HandleAsync_ListsEveryThemeInCatalogOrder()
    {
        GivenEveryThemeHasPosters();

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.ThemeKeys, result.Items.Select(item => item.Theme).ToList());
    }

    [Fact]
    public async Task HandleAsync_PreviewsTheFirstThreePostersOfATheme_SkippingItemsWithoutOne()
    {
        GivenEveryThemeHasPosters();
        var theme = MovieShowcaseCatalog.ThemeKeys[0];
        GivenTheme(
            theme,
            Item("Alien", "/alien.jpg"),
            Item("Sans affiche", null),
            Item("Affiche vide", string.Empty),
            Item("The Thing", "/thing.jpg"),
            Item("Halloween", "/halloween.jpg"),
            Item("Scream", "/scream.jpg"));

        var result = await Build().HandleAsync();

        var preview = result.Items.Single(item => item.Theme == theme);
        Assert.Equal(
            [("Alien", "/alien.jpg"), ("The Thing", "/thing.jpg"), ("Halloween", "/halloween.jpg")],
            preview.Posters.Select(poster => (poster.Title, poster.PosterPath)).ToList());
    }

    [Fact]
    public async Task HandleAsync_ThemeWithoutAnyPoster_IsLeftOut()
    {
        GivenEveryThemeHasPosters();
        var theme = MovieShowcaseCatalog.ThemeKeys[1];
        GivenTheme(theme, Item("Sans affiche", null), Item("Toujours rien", null));

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.ThemeKeys.Count - 1, result.Items.Count);
        Assert.DoesNotContain(result.Items, item => item.Theme == theme);
    }

    [Fact]
    public async Task HandleAsync_NoThemeHasAPoster_AnswersAnEmptyList()
    {
        foreach (var theme in MovieShowcaseCatalog.ThemeKeys)
            GivenTheme(theme);

        var result = await Build().HandleAsync();

        Assert.Empty(result.Items);
    }

    private static Exception LoadFailure(string kind) => kind switch
    {
        "unavailable" => Errors.ShowcaseUnavailable(),
        "http" => new HttpRequestException("TMDB answered 429"),
        _ => new TaskCanceledException("TMDB took too long"),
    };

    [Theory]
    [InlineData("unavailable")]
    [InlineData("http")]
    [InlineData("timeout")]
    public async Task HandleAsync_ThemeThatFailsToLoad_IsLeftOutWithoutFailingTheOthers(string kind)
    {
        GivenEveryThemeHasPosters();
        var theme = MovieShowcaseCatalog.ThemeKeys[2];
        GivenThemeFails(theme, LoadFailure(kind));

        var result = await Build().HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.ThemeKeys.Count - 1, result.Items.Count);
        Assert.DoesNotContain(result.Items, item => item.Theme == theme);
    }

    [Fact]
    public async Task HandleAsync_EveryThemeFailsToLoad_ThrowsServiceUnavailable()
    {
        foreach (var theme in MovieShowcaseCatalog.ThemeKeys)
            GivenThemeFails(theme, Errors.ShowcaseUnavailable());

        await Assert.ThrowsAsync<ServiceUnavailableException>(() => Build().HandleAsync());
    }

    [Fact]
    public async Task HandleAsync_CallerGaveUp_StopsInsteadOfLeavingThemesOut()
    {
        using var abandoned = new CancellationTokenSource();
        await abandoned.CancelAsync();
        _showcase
            .Setup(s => s.HandleAsync(It.IsAny<MovieShowcaseQuery>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new TaskCanceledException());

        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Build().HandleAsync(abandoned.Token));
    }

    [Fact]
    public async Task HandleAsync_ThemeListsAlreadyCached_CostsNoTmdbCall()
    {
        var tmdb = new Mock<ITmdbMovieSearch>();
        tmdb.Setup(t => t.DiscoverMoviesAsync(It.IsAny<TmdbDiscoveryCriteria>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new TmdbSearchItem(1, MovieMediaType.Movie, "Alien", "1979", "/alien.jpg")]);
        tmdb.Setup(t => t.GetEnrichmentAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieEnrichment(7.5, [], null, 117));
        var showcase = new GetMovieShowcaseHandler(
            tmdb.Object,
            new Mock<IMovieRepository>().Object,
            new SharedCacheReadThrough(new MemoryCache(new MemoryCacheOptions()), new Mock<ISharedCache>().Object, new SingleFlight()),
            Options.Create(new MoviePickerOptions { TmdbApiKey = "key" }));
        foreach (var theme in MovieShowcaseCatalog.ThemeKeys)
            await showcase.HandleAsync(new MovieShowcaseQuery(MovieShowcaseSections.Theme, Theme: theme));

        var tmdbCallsBeforePreviews = tmdb.Invocations.Count;

        var result = await Build(showcase).HandleAsync();

        Assert.Equal(MovieShowcaseCatalog.ThemeKeys.Count, result.Items.Count);
        Assert.Equal(tmdbCallsBeforePreviews, tmdb.Invocations.Count);
    }
}
