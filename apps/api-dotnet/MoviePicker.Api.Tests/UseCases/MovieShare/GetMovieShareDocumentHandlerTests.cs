using System.Net;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using Moq;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Application.UseCases.MovieShare;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.Tests.UseCases.MovieShare;

public sealed class GetMovieShareDocumentHandlerTests
{
    private const string Shell =
        "<!doctype html>\n<html lang=\"fr\">\n<head>\n<meta charset=\"UTF-8\" />\n"
        + "<meta property=\"og:title\" content=\"Titre du site\" />\n"
        + "<link rel=\"canonical\" href=\"https://web.example/\" />\n"
        + "<title>Titre du site</title>\n"
        + "</head>\n<body>\n<div id=\"root\"></div>\n<script type=\"module\" src=\"/assets/index.js\"></script>\n</body>\n</html>\n";

    private readonly Mock<ITmdbMovieSearch> _tmdb = new();
    private readonly Mock<IPosterImageStore> _posters = new();
    private readonly Mock<IWebShellSource> _shell = new();

    public GetMovieShareDocumentHandlerTests()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync(Shell);
        _posters.Setup(p => p.ToPublicPosterPath(It.IsAny<string?>()))
            .Returns((string? url) => url is null ? null : "/api/v1/posters/tmdb/w500/inception.jpg");
    }

    private GetMovieShareDocumentHandler CreateSut() =>
        new(
            _tmdb.Object,
            _posters.Object,
            _shell.Object,
            Options.Create(new MoviePickerOptions { PublicWebBaseUrl = "https://web.example/" }));

    private void GivenTitle(
        int tmdbId,
        MovieMediaType mediaType,
        string title,
        string? releaseDate = "2010-07-15",
        string? overview = "Un voleur qui explore les rêves.",
        string? posterUrl = "https://image.tmdb.org/t/p/w154/inception.jpg",
        string? backdropUrl = "https://image.tmdb.org/t/p/w780/inception-wide.jpg") =>
        _tmdb.Setup(t => t.GetDetailsAsync(tmdbId, mediaType, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TmdbMovieDetails(
                tmdbId, title, overview, null, null, [], null, [], [], releaseDate,
                PosterUrl: posterUrl,
                BackdropUrl: backdropUrl));

    private static string Meta(string html, string key)
    {
        var match = Regex.Match(html, $"<meta (?:property|name)=\"{Regex.Escape(key)}\" content=\"([^\"]*)\"");
        Assert.True(match.Success, $"missing meta {key}");
        return WebUtility.HtmlDecode(match.Groups[1].Value);
    }

    private void VerifyTmdbNeverAsked() =>
        _tmdb.Verify(
            t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()),
            Times.Never);

    [Fact]
    public async Task HandleAsync_KnownFilm_InjectsItsTitleYearOverviewAndBackdropIntoTheShell()
    {
        GivenTitle(27_205, MovieMediaType.Movie, "Inception");

        var document = await CreateSut().HandleAsync("27205-inception", MovieMediaType.Movie, "https://api.example/", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Inception (2010)", Meta(document.Html, "og:title"));
        Assert.Equal("Un voleur qui explore les rêves.", Meta(document.Html, "og:description"));
        Assert.Equal("https://image.tmdb.org/t/p/w780/inception-wide.jpg", Meta(document.Html, "og:image"));
        Assert.Equal("Image de Inception", Meta(document.Html, "og:image:alt"));
        Assert.Equal("https://web.example/film/27205-inception", Meta(document.Html, "og:url"));
        Assert.Contains("<link rel=\"canonical\" href=\"https://web.example/film/27205-inception\" />", document.Html);
        Assert.Contains("<title>Inception (2010) | Movie Picker</title>", document.Html);
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.DoesNotContain("Titre du site", document.Html);
    }

    [Fact]
    public async Task HandleAsync_KnownSeries_LivesUnderTheSeriesPath()
    {
        GivenTitle(1_399, MovieMediaType.Tv, "Game of Thrones", releaseDate: "2011-04-17");

        var document = await CreateSut().HandleAsync("1399-game-of-thrones", MovieMediaType.Tv, "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Game of Thrones (2011)", Meta(document.Html, "og:title"));
        Assert.Equal("https://web.example/serie/1399-game-of-thrones", Meta(document.Html, "og:url"));
    }

    [Fact]
    public async Task HandleAsync_BareTmdbId_IsEnough()
    {
        GivenTitle(27_205, MovieMediaType.Movie, "Inception");

        var document = await CreateSut().HandleAsync("27205", MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("https://web.example/film/27205", Meta(document.Html, "og:url"));
    }

    [Fact]
    public async Task HandleAsync_TitleWithoutReleaseDate_HasNoYear()
    {
        GivenTitle(27_205, MovieMediaType.Movie, "Inception", releaseDate: null);

        var document = await CreateSut().HandleAsync("27205", MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal("Inception", Meta(document.Html, "og:title"));
    }

    [Fact]
    public async Task HandleAsync_LongOverview_IsCutToTwoHundredCharacters()
    {
        var overview = string.Concat(Enumerable.Repeat("Un rêve dans un rêve. ", 20));
        GivenTitle(27_205, MovieMediaType.Movie, "Inception", overview: overview);

        var document = await CreateSut().HandleAsync("27205", MovieMediaType.Movie, "https://api.example", default);

        var description = Meta(document.Html, "og:description");
        Assert.True(description.Length <= GetMovieShareDocumentHandler.DescriptionMaxLength, $"{description.Length} characters");
        Assert.EndsWith("…", description, StringComparison.Ordinal);
        Assert.StartsWith("Un rêve dans un rêve.", description, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData(MovieMediaType.Movie, "ce film")]
    [InlineData(MovieMediaType.Tv, "cette série")]
    public async Task HandleAsync_TitleWithoutOverview_GetsAGenericSentence(MovieMediaType mediaType, string named)
    {
        GivenTitle(27_205, mediaType, "Inception", overview: "  ");

        var document = await CreateSut().HandleAsync("27205", mediaType, "https://api.example", default);

        Assert.Contains(named, Meta(document.Html, "og:description"), StringComparison.Ordinal);
    }

    [Fact]
    public async Task HandleAsync_TitleWithoutBackdrop_SharesItsPosterThroughTheApi()
    {
        GivenTitle(27_205, MovieMediaType.Movie, "Inception", backdropUrl: null);

        var document = await CreateSut().HandleAsync("27205", MovieMediaType.Movie, "https://api.example/", default);

        Assert.Equal("https://api.example/api/v1/posters/tmdb/w500/inception.jpg", Meta(document.Html, "og:image"));
        Assert.Equal("Affiche de Inception", Meta(document.Html, "og:image:alt"));
    }

    [Fact]
    public async Task HandleAsync_TitleWithoutAnyImage_SharesTheSiteImage()
    {
        GivenTitle(27_205, MovieMediaType.Movie, "Inception", posterUrl: null, backdropUrl: null);

        var document = await CreateSut().HandleAsync("27205", MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal("https://web.example/og-image.png", Meta(document.Html, "og:image"));
        Assert.Equal("Movie Picker", Meta(document.Html, "og:image:alt"));
    }

    [Fact]
    public async Task HandleAsync_TitleUnknownToTmdb_Returns404WithTheGenericPreview()
    {
        _tmdb.Setup(t => t.GetDetailsAsync(42, MovieMediaType.Movie, It.IsAny<CancellationToken>()))
            .ReturnsAsync((TmdbMovieDetails?)null);

        var document = await CreateSut().HandleAsync("42-nope", MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Equal("Movie Picker", Meta(document.Html, "og:title"));
        Assert.Equal("https://web.example/", Meta(document.Html, "og:url"));
        Assert.Contains("<div id=\"root\"></div>", document.Html);
        Assert.DoesNotContain("42-nope", document.Html);
    }

    [Fact]
    public async Task HandleAsync_TmdbUnavailable_Returns404WithTheGenericPreview()
    {
        _tmdb.Setup(t => t.GetDetailsAsync(It.IsAny<int>(), It.IsAny<MovieMediaType>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB unavailable"));

        var document = await CreateSut().HandleAsync("27205-inception", MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Equal("Movie Picker", Meta(document.Html, "og:title"));
    }

    [Theory]
    [InlineData("")]
    [InlineData("inception")]
    [InlineData("0")]
    [InlineData("0-inception")]
    [InlineData("-27205")]
    [InlineData("27205abc")]
    [InlineData("+27205")]
    [InlineData("99999999999-overflow")]
    public async Task HandleAsync_ReferenceWithoutATmdbId_Returns404BeforeReachingTmdb(string movieRef)
    {
        var document = await CreateSut().HandleAsync(movieRef, MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal(404, document.StatusCode);
        Assert.Equal("Movie Picker", Meta(document.Html, "og:title"));
        VerifyTmdbNeverAsked();
    }

    [Fact]
    public async Task HandleAsync_ShellUnavailable_SendsTheVisitorHomeRatherThanBackHere()
    {
        _shell.Setup(s => s.GetShellAsync(It.IsAny<CancellationToken>())).ReturnsAsync((string?)null);
        GivenTitle(27_205, MovieMediaType.Movie, "Inception");

        var document = await CreateSut().HandleAsync("27205-inception", MovieMediaType.Movie, "https://api.example", default);

        Assert.Equal(200, document.StatusCode);
        Assert.Equal("Inception (2010)", Meta(document.Html, "og:title"));
        Assert.Contains("<meta http-equiv=\"refresh\" content=\"0; url=https://web.example/\" />", document.Html);
    }

    [Fact]
    public async Task HandleAsync_EscapesTheTitleTheOverviewAndTheReference()
    {
        GivenTitle(27_205, MovieMediaType.Movie, "<script>alert(1)</script>", overview: "\"><img src=x>");

        var document = await CreateSut().HandleAsync("27205-\"><b>", MovieMediaType.Movie, "https://api.example", default);

        Assert.DoesNotContain("<script>alert(1)</script>", document.Html);
        Assert.DoesNotContain("<img src=x>", document.Html);
        Assert.DoesNotContain("<b>", document.Html);
        Assert.Equal("https://web.example/film/27205-%22%3E%3Cb%3E", Meta(document.Html, "og:url"));
    }
}
