using System.Globalization;
using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Infrastructure.Letterboxd;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Letterboxd;

public sealed class LetterboxdWatchedFilmsClientTests
{
    private const string Username = "cinephile";

    private const string RealRatedPosterMarkup =
        "<li class=\"griditem\">\n\t\t\t\t\t\t\t\t<div class=\"react-component\" data-component-class=\"LazyPoster\" "
        + "data-request-poster-metadata=\"true\" data-likeable=\"true\" data-watchable=\"true\" data-rateable=\"true\" "
        + "data-image-width=\"70\" data-image-height=\"105\" data-item-name=\"Clayface (2026)\" data-item-slug=\"clayface\" "
        + "data-item-link=\"/film/clayface/\" data-item-full-display-name=\"Clayface (2026)\" "
        + "data-postered-identifier='{&quot;lid&quot;:&quot;RTVm&quot;,&quot;uid&quot;:&quot;film:1284636&quot;,&quot;type&quot;:&quot;film&quot;}' "
        + "data-is-linked=\"true\" data-target-link=\"/film/clayface/\" data-details-endpoint=\"/film/clayface/json/\" data-show-menu=\"true\" > "
        + "<div class=\"poster film-poster\"> <img src=\"https://s.ltrbxd.com/static/img/empty-poster-70.png\" class=\"image\" width=\"70\" height=\"105\" alt=\"Clayface\"/> "
        + "<span class=\"frame\"><span class=\"frame-title\"></span></span> </div> </div> "
        + "<p class=\"poster-viewingdata\" data-item-uid=\"film:1284636\"> <span class=\"rating -micro -darker rated-6\">★★★</span> </p>\n</li>";

    private const string RealHalfStarLikedPosterMarkup =
        "<li class=\"griditem\"><div class=\"react-component\" data-component-class=\"LazyPoster\" "
        + "data-item-name=\"Wildwood (2026)\" data-item-slug=\"wildwood-2026\" data-item-link=\"/film/wildwood-2026/\" "
        + "data-item-full-display-name=\"Wildwood (2026)\" data-show-menu=\"true\" > <div class=\"poster film-poster\"></div> </div> "
        + "<p class=\"poster-viewingdata\" data-item-uid=\"film:709460\"> <span class=\"rating -micro -darker rated-9\">★★★★½</span> "
        + "<span class=\"like liked-micro has-icon icon-liked icon-16\"><span class=\"icon\"></span></span> </p></li>";

    private const string RealUnratedPosterMarkup =
        "<li class=\"griditem\"><div class=\"react-component\" data-component-class=\"LazyPoster\" "
        + "data-item-name=\"Coward (2026)\" data-item-slug=\"coward-2026\" data-item-link=\"/film/coward-2026/\" "
        + "data-item-full-display-name=\"Coward (2026)\" data-show-menu=\"true\" > <div class=\"poster film-poster\"></div> </div> "
        + "<p class=\"poster-viewingdata\" data-item-uid=\"film:1315755\"> </p></li>";

    private static string Poster(string slug, string displayName, int? rated = null) =>
        "<li class=\"griditem\"><div class=\"react-component\" data-component-class=\"LazyPoster\" "
        + $"data-item-name=\"{displayName}\" data-item-slug=\"{slug}\" data-item-link=\"/film/{slug}/\" "
        + $"data-item-full-display-name=\"{displayName}\"></div>"
        + (rated is { } value
            ? $"<p class=\"poster-viewingdata\"><span class=\"rating -micro -darker rated-{value}\"></span></p>"
            : "<p class=\"poster-viewingdata\"> </p>")
        + "</li>";

    private static string Heading(string count) =>
        $"<h1 class=\"section-heading\"><span class=\"tooltip\" title=\"{count}&nbsp;films\">Watched</span></h1>";

    private static string Page(string heading, params string[] posters) =>
        "<html><body class=\"screen-member-child-page films-watched\"><div class=\"cols-2 overflow\"><section class=\"section col-main overflow\">"
        + $"<div id=\"content-nav\" class=\"tabbed\">{heading}</div><ul class=\"grid\">{string.Join("\n", posters)}</ul></section></div></body></html>";

    private static string Page(int totalFilms, params string[] posters) =>
        Page(Heading(totalFilms.ToString("N0", CultureInfo.GetCultureInfo("en-US"))), posters);

    private static string RssItem(string slug, string watchedDate, string? rewatchIndex = null) =>
        "<item> <title>A film</title> "
        + $"<link>https://letterboxd.com/{Username}/film/{slug}/{(rewatchIndex is null ? string.Empty : rewatchIndex + "/")}</link> "
        + "<guid isPermaLink=\"false\">letterboxd-watch-1580715744</guid> "
        + $"<letterboxd:watchedDate>{watchedDate}</letterboxd:watchedDate> <letterboxd:rewatch>No</letterboxd:rewatch> "
        + "<letterboxd:memberRating>4.0</letterboxd:memberRating> <tmdb:movieId>1437981</tmdb:movieId> </item>";

    private static string ListItem(string slug) =>
        $"<item> <title>A list</title> <link>https://letterboxd.com/{Username}/list/{slug}/</link> "
        + "<guid isPermaLink=\"false\">letterboxd-list-123</guid> </item>";

    private static string Rss(params string[] items) =>
        "<?xml version='1.0' encoding='utf-8'?>\n<rss version=\"2.0\" xmlns:letterboxd=\"https://letterboxd.com\" xmlns:tmdb=\"https://themoviedb.org\"> "
        + $"<channel> <title>Letterboxd - Cinéphile</title> {string.Join(" ", items)} </channel> </rss>";

    private static HttpResponseMessage Ok(string body) => new(HttpStatusCode.OK) { Content = new StringContent(body) };

    private static bool IsRss(Uri uri) => uri.AbsolutePath.EndsWith("/rss/", StringComparison.Ordinal);

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

    private static (LetterboxdWatchlistClient Sut, Mock<HttpMessageHandler> Handler) CreateSut(string filmsPage, string? rss = null) =>
        CreateSut(uri => IsRss(uri) ? Ok(rss ?? Rss()) : Ok(filmsPage));

    private static void VerifyRequests(Mock<HttpMessageHandler> handler, Times times, Func<Uri, bool> matching) =>
        handler.Protected().Verify(
            "SendAsync",
            times,
            ItExpr.Is<HttpRequestMessage>(req => matching(req.RequestUri!)),
            ItExpr.IsAny<CancellationToken>());

    [Fact]
    public async Task GetWatchedFilmsAsync_ParsesSlugTitleYearAndRatingFromRealMarkup()
    {
        var (sut, _) = CreateSut(Page(3, RealRatedPosterMarkup, RealHalfStarLikedPosterMarkup, RealUnratedPosterMarkup));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.Equal(
            [("clayface", "Clayface", "2026", (int?)6), ("wildwood-2026", "Wildwood", "2026", 9), ("coward-2026", "Coward", "2026", null)],
            snapshot.Films.Select(f => (f.Slug, f.Title, f.Year, f.Rating)));
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_ReadsTheFilmsPagesServedToVisitors_UntilTheAnnouncedTotal()
    {
        var (sut, handler) = CreateSut(uri => IsRss(uri)
            ? Ok(Rss())
            : Ok(uri.AbsolutePath.Contains("/page/2/")
                ? Page(3, Poster("akira", "Akira (1988)", rated: 10))
                : Page(3, Poster("inception", "Inception (2010)"), Poster("dune", "Dune (2021)", rated: 7))));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.False(snapshot.IsTruncated);
        Assert.Equal(["inception", "dune", "akira"], snapshot.Films.Select(f => f.Slug));
        VerifyRequests(handler, Times.Once(), uri => uri.AbsoluteUri == $"https://letterboxd.com/{Username}/films/");
        VerifyRequests(handler, Times.Once(), uri => uri.AbsoluteUri == $"https://letterboxd.com/{Username}/films/page/2/");
        VerifyRequests(handler, Times.Never(), uri => uri.AbsolutePath.Contains("/films/by/"));
    }

    private static HttpResponseMessage Challenge() =>
        new(HttpStatusCode.Forbidden) { Content = new StringContent("<title>Just a moment...</title>") };

    private static string DiaryItem(string slug, string title, string year, string watchedDate, string? memberRating = null) =>
        "<item> <title>A film</title> "
        + $"<link>https://letterboxd.com/{Username}/film/{slug}/</link> "
        + "<guid isPermaLink=\"false\">letterboxd-watch-1</guid> "
        + $"<letterboxd:watchedDate>{watchedDate}</letterboxd:watchedDate> <letterboxd:rewatch>No</letterboxd:rewatch> "
        + $"<letterboxd:filmTitle>{title}</letterboxd:filmTitle> <letterboxd:filmYear>{year}</letterboxd:filmYear> "
        + (memberRating is null ? string.Empty : $"<letterboxd:memberRating>{memberRating}</letterboxd:memberRating> ")
        + "<tmdb:movieId>1</tmdb:movieId> </item>";

    [Fact]
    public async Task GetWatchedFilmsAsync_NextPagesRefused_KeepsTheFirstPageAsAPartialRead()
    {
        var (sut, _) = CreateSut(uri => IsRss(uri)
            ? Ok(Rss())
            : PageNumber(uri) == 1
                ? Ok(Page(765, Poster("dune", "Dune (2021)", rated: 8), Poster("akira", "Akira (1988)")))
                : Challenge());

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.True(snapshot.IsTruncated);
        Assert.False(snapshot.ConfirmsDepartures);
        Assert.Equal(765, snapshot.Total);
        Assert.Equal([("dune", (int?)8), ("akira", null)], snapshot.Films.Select(f => (f.Slug, f.Rating)));
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_FirstPageRefused_IsIncomplete()
    {
        var (sut, _) = CreateSut(uri => IsRss(uri) ? Ok(Rss()) : Challenge());

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.False(snapshot.IsComplete);
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_PartialRead_AddsTheDiaryFilmsThePagesMissed()
    {
        var rss = Rss(
            DiaryItem("dune", "Dune", "2021", "2026-11-12", "4.5"),
            DiaryItem("the-thing", "The Thing", "1982", "2026-11-10", "4.0"),
            ListItem("best-of-2026"),
            DiaryItem("the-thing", "The Thing", "1982", "2026-01-01"),
            DiaryItem("oldboy", "Oldboy &amp; Co", "2003", "2026-11-01"));
        var (sut, _) = CreateSut(uri => IsRss(uri)
            ? Ok(rss)
            : PageNumber(uri) == 1
                ? Ok(Page(765, Poster("dune", "Dune (2021)", rated: 6)))
                : Challenge());

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsTruncated);
        Assert.False(snapshot.ConfirmsDepartures);
        Assert.Equal(
            [
                ("dune", "Dune", "2021", (int?)6, (DateOnly?)new DateOnly(2026, 11, 12)),
                ("the-thing", "The Thing", "1982", 8, new DateOnly(2026, 11, 10)),
                ("oldboy", "Oldboy & Co", "2003", null, new DateOnly(2026, 11, 1))
            ],
            snapshot.Films.Select(f => (f.Slug, f.Title, f.Year, f.Rating, f.WatchedOn)));
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_CompleteRead_OnlyDatesFromTheDiary_WithoutAddingFilms()
    {
        var rss = Rss(DiaryItem("dune", "Dune", "2021", "2026-11-12"), DiaryItem("the-thing", "The Thing", "1982", "2026-11-10"));
        var (sut, _) = CreateSut(Page(1, Poster("dune", "Dune (2021)")), rss);

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.ConfirmsDepartures);
        var film = Assert.Single(snapshot.Films);
        Assert.Equal(("dune", (DateOnly?)new DateOnly(2026, 11, 12)), (film.Slug, film.WatchedOn));
    }

    private static int PageNumber(Uri uri)
    {
        var segments = uri.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        var pageIndex = Array.IndexOf(segments, "page");
        return pageIndex >= 0 ? int.Parse(segments[pageIndex + 1], CultureInfo.InvariantCulture) : 1;
    }

    private static (LetterboxdWatchlistClient Sut, Mock<HttpMessageHandler> Handler) OneFilmPerPage(string heading) =>
        CreateSut(uri => IsRss(uri)
            ? Ok(Rss())
            : Ok(Page(heading, Poster($"film-{PageNumber(uri)}", $"Film {PageNumber(uri)} (2001)"))));

    [Fact]
    public async Task GetWatchedFilmsAsync_ReadsAThousandsSeparatedTotal()
    {
        var (sut, _) = OneFilmPerPage(Heading("2,611"));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsTruncated);
        Assert.Equal(2_611, snapshot.Total);
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_OneFilm_IsReadFromASingularHeading()
    {
        var page = Page(
            "<h1 class=\"section-heading\"><span class=\"tooltip\" title=\"1&nbsp;film\">Watched</span></h1>",
            Poster("inception", "Inception (2010)", rated: 8));
        var (sut, _) = CreateSut(page);

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.Equal(8, Assert.Single(snapshot.Films).Rating);
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_NoFilmWatched_IsCompleteAndEmpty_WithoutReadingTheFeed()
    {
        var (sut, handler) = CreateSut(Page(0));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.Empty(snapshot.Films);
        Assert.True(snapshot.ConfirmsDepartures);
        VerifyRequests(handler, Times.Never(), IsRss);
    }

    private static string MemberPage(string bodyAttributes, string content) =>
        $"<html><body {bodyAttributes}><section class=\"section col-main\"><h1 class=\"section-heading\">Watched</h1>{content}</section></body></html>";

    [Fact]
    public async Task GetWatchedFilmsAsync_ProfileWithoutCounterNorFilm_IsAnEmptyRead_ThatConfirmsNoDeparture()
    {
        var (sut, handler) = CreateSut(MemberPage(
            $"class=\"screen-member-child-page films-watched wide small-poster-grid\" data-owner=\"{Username}\"",
            "<p>No films yet.</p>"));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.False(snapshot.IsTruncated);
        Assert.False(snapshot.ConfirmsDepartures);
        Assert.Empty(snapshot.Films);
        VerifyRequests(handler, Times.Never(), IsRss);
    }

    [Theory]
    [InlineData("class=\"screen-member-child-page films-watched\" data-owner=\"someone-else\"")]
    [InlineData("class=\"screen-member-child-page films-diary\" data-owner=\"cinephile\"")]
    [InlineData("class=\"error\"")]
    public async Task GetWatchedFilmsAsync_EmptyPageThatIsNotTheMembersFilms_IsIncomplete(string bodyAttributes)
    {
        var (sut, _) = CreateSut(MemberPage(bodyAttributes, "<p>Sorry, we can’t find that page.</p>"));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.False(snapshot.IsComplete);
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_MissingFilmCounter_IsIncomplete()
    {
        var (sut, handler) = CreateSut(Page("<h1 class=\"section-heading\">Watched</h1>", Poster("inception", "Inception (2010)")));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.False(snapshot.IsComplete);
        VerifyRequests(handler, Times.Never(), IsRss);
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_FewerFilmsThanAnnounced_IsIncomplete()
    {
        var (sut, _) = CreateSut(uri => Ok(uri.AbsolutePath.Contains("/page/")
            ? Page(5)
            : Page(5, Poster("inception", "Inception (2010)"))));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.False(snapshot.IsComplete);
        Assert.Empty(snapshot.Films);
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_MoreFilmsThanThePageBudget_KeepsWhatWasRead()
    {
        const int announced = 9_000;
        var (sut, handler) = OneFilmPerPage(Heading("9,000"));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        Assert.True(snapshot.IsTruncated);
        Assert.Equal(announced, snapshot.Total);
        Assert.Equal("film-1", snapshot.Films[0].Slug);
        Assert.InRange(snapshot.Films.Count, 2, announced - 1);
        VerifyRequests(handler, Times.Exactly(snapshot.Films.Count), uri => !IsRss(uri));
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_DatesTheFilmsOfTheDiaryFeed_WithTheirLatestViewing()
    {
        var rss = Rss(
            RssItem("dune", "2026-11-10", rewatchIndex: "1"),
            ListItem("best-of-2026"),
            RssItem("akira", "2026-11-02"),
            RssItem("dune", "2025-03-01"));
        var (sut, _) = CreateSut(
            Page(3, Poster("dune", "Dune (2021)"), Poster("akira", "Akira (1988)"), Poster("inception", "Inception (2010)")),
            rss);

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.Equal(
            [("dune", (DateOnly?)new DateOnly(2026, 11, 10)), ("akira", new DateOnly(2026, 11, 2)), ("inception", null)],
            snapshot.Films.Select(f => (f.Slug, f.WatchedOn)));
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_UnreadableFeed_KeepsTheFilmsWithoutDates()
    {
        var (sut, _) = CreateSut(uri => IsRss(uri)
            ? new HttpResponseMessage(HttpStatusCode.Forbidden) { Content = new StringContent("Just a moment...") }
            : Ok(Page(1, Poster("dune", "Dune (2021)", rated: 8))));

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.True(snapshot.IsComplete);
        var film = Assert.Single(snapshot.Films);
        Assert.Equal(("dune", (int?)8, (DateOnly?)null), (film.Slug, film.Rating, film.WatchedOn));
    }

    [Fact]
    public async Task GetWatchedFilmsAsync_HttpError_IsIncomplete()
    {
        var (sut, _) = CreateSut(_ => new HttpResponseMessage(HttpStatusCode.InternalServerError) { Content = new StringContent("nope") });

        var snapshot = await sut.GetWatchedFilmsAsync(Username);

        Assert.False(snapshot.IsComplete);
    }

    [Theory]
    [InlineData("")]
    [InlineData("bad/user")]
    public async Task GetWatchedFilmsAsync_InvalidUsername_IsIncompleteWithoutHttpCall(string username)
    {
        var (sut, handler) = CreateSut(Page(1, Poster("inception", "Inception (2010)")));

        var snapshot = await sut.GetWatchedFilmsAsync(username);

        Assert.False(snapshot.IsComplete);
        VerifyRequests(handler, Times.Never(), _ => true);
    }
}
