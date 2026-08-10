using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Infrastructure.Letterboxd;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Letterboxd;

public sealed class LetterboxdWatchlistClientTests
{
    private const string RealPosterMarkup =
        "<li class=\"griditem\">\n\t<div class=\"react-component\" data-component-class=\"LazyPoster\" "
        + "data-request-poster-metadata=\"true\" data-likeable=\"true\" data-watchable=\"true\" "
        + "data-rateable=\"true\" data-image-width=\"125\" data-image-height=\"187\" "
        + "data-item-name=\"The Polar Express (2004)\" data-item-slug=\"the-polar-express\" "
        + "data-item-link=\"/film/the-polar-express/\" "
        + "data-item-full-display-name=\"The Polar Express (2004)\" "
        + "data-postered-identifier=\"{&quot;lid&quot;:&quot;23am&quot;,&quot;uid&quot;:&quot;film:48883&quot;}\" "
        + "data-poster-url=\"/film/the-polar-express/image-150/\" data-is-linked=\"true\" "
        + "data-target-link=\"/film/the-polar-express/\"></div>\n</li>";

    private static string Poster(string slug, string displayName) =>
        $"<div class=\"react-component\" data-component-class=\"LazyPoster\" "
        + $"data-item-name=\"{displayName}\" data-item-slug=\"{slug}\" "
        + $"data-item-link=\"/film/{slug}/\" data-item-full-display-name=\"{displayName}\"></div>";

    private static string Page(int totalEntries, params string[] posters) =>
        "<html><body><div class=\"cols-2 js-watchlist-content\" "
        + $"data-num-entries=\"{totalEntries}\"><ul class=\"grid\">{string.Join("\n", posters)}</ul></div></body></html>";

    private static (LetterboxdWatchlistClient Sut, Mock<HttpMessageHandler> Handler) CreateSut(
        Func<Uri, HttpResponseMessage> respond)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .Returns((HttpRequestMessage req, CancellationToken _) => Task.FromResult(respond(req.RequestUri!)));

        var sut = new LetterboxdWatchlistClient(
            new HttpClient(handler.Object),
            NullLogger<LetterboxdWatchlistClient>.Instance);
        return (sut, handler);
    }

    private static (LetterboxdWatchlistClient Sut, Mock<HttpMessageHandler> Handler) CreateSut(
        string body,
        HttpStatusCode status = HttpStatusCode.OK) =>
        CreateSut(_ => new HttpResponseMessage(status) { Content = new StringContent(body) });

    [Fact]
    public async Task GetWatchlistAsync_ParsesSlugTitleAndYearFromRealMarkup()
    {
        var (sut, _) = CreateSut(Page(1, RealPosterMarkup));

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.True(snapshot.IsComplete);
        var film = Assert.Single(snapshot.Films);
        Assert.Equal("the-polar-express", film.Slug);
        Assert.Equal("The Polar Express", film.Title);
        Assert.Equal("2004", film.Year);
    }

    [Fact]
    public async Task GetWatchlistAsync_DecodesHtmlEntitiesInTitle()
    {
        var (sut, _) = CreateSut(Page(1, Poster("milk-serial", "Milk &amp; Serial (2024)")));

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.Equal("Milk & Serial", Assert.Single(snapshot.Films).Title);
    }

    [Fact]
    public async Task GetWatchlistAsync_FollowsPaginationUntilAnnouncedTotal()
    {
        var (sut, handler) = CreateSut(uri => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(uri.AbsolutePath.Contains("/page/2/")
                ? Page(3, Poster("akira", "Akira (1988)"))
                : Page(3, Poster("inception", "Inception (2010)"), Poster("dune", "Dune (2021)")))
        });

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.True(snapshot.IsComplete);
        Assert.Equal(3, snapshot.Films.Count);
        Assert.Equal(["inception", "dune", "akira"], snapshot.Films.Select(f => f.Slug));
        handler.Protected().Verify(
            "SendAsync",
            Times.Exactly(2),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetWatchlistAsync_EmptyWatchlist_IsCompleteWithNoFilm()
    {
        var (sut, _) = CreateSut(Page(0));

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.True(snapshot.IsComplete);
        Assert.Empty(snapshot.Films);
    }

    [Fact]
    public async Task GetWatchlistAsync_FewerFilmsThanAnnounced_IsIncomplete()
    {
        var (sut, _) = CreateSut(uri => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent(uri.AbsolutePath.Contains("/page/")
                ? Page(5)
                : Page(5, Poster("inception", "Inception (2010)")))
        });

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.False(snapshot.IsComplete);
        Assert.Empty(snapshot.Films);
    }

    [Fact]
    public async Task GetWatchlistAsync_MissingEntryCounter_IsIncomplete()
    {
        var (sut, _) = CreateSut("<html><body><p>Sorry, we can’t find that page.</p></body></html>");

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.False(snapshot.IsComplete);
    }

    [Fact]
    public async Task GetWatchlistAsync_HttpError_IsIncomplete()
    {
        var (sut, _) = CreateSut("nope", HttpStatusCode.InternalServerError);

        var snapshot = await sut.GetWatchlistAsync("affy657");

        Assert.False(snapshot.IsComplete);
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("bad/user")]
    [InlineData("pseudo avec espace")]
    public async Task GetWatchlistAsync_InvalidUsername_IsIncompleteWithoutHttpCall(string username)
    {
        var (sut, handler) = CreateSut(Page(1, Poster("inception", "Inception (2010)")));

        var snapshot = await sut.GetWatchlistAsync(username);

        Assert.False(snapshot.IsComplete);
        handler.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>());
    }
}
