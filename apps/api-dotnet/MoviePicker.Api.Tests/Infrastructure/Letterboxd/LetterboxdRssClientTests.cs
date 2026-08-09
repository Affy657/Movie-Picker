using System.Net;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Moq.Protected;
using MoviePicker.Api.Infrastructure.Letterboxd;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Letterboxd;

public sealed class LetterboxdRssClientTests
{
    private const string SampleRss = """
        <?xml version='1.0' encoding='utf-8'?>
        <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:letterboxd="https://letterboxd.com" xmlns:tmdb="https://themoviedb.org">
          <channel>
            <title>Letterboxd - Test</title>
            <item>
              <title>Obsession, 2025 - &#9733;&#9733;&#9733;&#189;</title>
              <link>https://letterboxd.com/dave/film/obsession-2025/</link>
              <guid isPermaLink="false">letterboxd-watch-1</guid>
              <letterboxd:watchedDate>2026-07-09</letterboxd:watchedDate>
              <letterboxd:filmTitle>Obsession</letterboxd:filmTitle>
              <letterboxd:filmYear>2025</letterboxd:filmYear>
              <tmdb:movieId>1339713</tmdb:movieId>
            </item>
            <item>
              <title>Unmatched Film, 2020</title>
              <letterboxd:filmTitle>Unmatched Film</letterboxd:filmTitle>
              <letterboxd:filmYear>2020</letterboxd:filmYear>
            </item>
          </channel>
        </rss>
        """;

    private static (LetterboxdRssClient Sut, Mock<HttpMessageHandler> Handler) CreateSut(
        HttpStatusCode status = HttpStatusCode.OK,
        string? body = null)
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(status) { Content = new StringContent(body ?? SampleRss) });
        var client = new HttpClient(handler.Object);
        var sut = new LetterboxdRssClient(client, NullLogger<LetterboxdRssClient>.Instance);
        return (sut, handler);
    }

    [Fact]
    public async Task GetRecentDiaryAsync_ParsesTmdbIdAndFilmFields()
    {
        var (sut, _) = CreateSut();

        var entries = await sut.GetRecentDiaryAsync("dave");

        Assert.Equal(2, entries.Count);
        Assert.Equal(1339713, entries[0].TmdbId);
        Assert.Equal("Obsession", entries[0].FilmTitle);
        Assert.Equal("2025", entries[0].FilmYear);
    }

    [Fact]
    public async Task GetRecentDiaryAsync_ItemWithoutTmdbId_HasNullTmdbId()
    {
        var (sut, _) = CreateSut();

        var entries = await sut.GetRecentDiaryAsync("dave");

        Assert.Null(entries[1].TmdbId);
        Assert.Equal("Unmatched Film", entries[1].FilmTitle);
    }

    [Fact]
    public async Task GetRecentDiaryAsync_InvalidUsername_ReturnsEmptyWithoutHttpCall()
    {
        var (sut, handler) = CreateSut();

        var entries = await sut.GetRecentDiaryAsync("bad username!");

        Assert.Empty(entries);
        handler.Protected().Verify(
            "SendAsync", Times.Never(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task GetRecentDiaryAsync_HttpFailure_ReturnsEmpty()
    {
        var handler = new Mock<HttpMessageHandler>();
        handler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("network down"));
        var client = new HttpClient(handler.Object);
        var sut = new LetterboxdRssClient(client, NullLogger<LetterboxdRssClient>.Instance);

        var entries = await sut.GetRecentDiaryAsync("dave");

        Assert.Empty(entries);
    }

    [Fact]
    public async Task GetRecentDiaryAsync_InvalidXml_ReturnsEmpty()
    {
        var (sut, _) = CreateSut(body: "not xml at all");

        var entries = await sut.GetRecentDiaryAsync("dave");

        Assert.Empty(entries);
    }
}
