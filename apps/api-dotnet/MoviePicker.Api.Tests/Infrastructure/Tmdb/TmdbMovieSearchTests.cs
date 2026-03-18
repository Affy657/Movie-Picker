using System.Net;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Tmdb;
using MoviePicker.Api.Application.Ports;
using Moq;
using Moq.Protected;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbMovieSearchTests
{
    private static HttpClient CreateHttpClient(HttpMessageHandler handler) => new(handler) { BaseAddress = new Uri("https://api.themoviedb.org") };

    [Fact]
    public async Task SearchAsync_NoApiKey_ThrowsInvalidOperationException()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = null });
        var client = CreateHttpClient(new Mock<HttpMessageHandler>().Object);
        var sut = new TmdbMovieSearch(client, options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.SearchAsync("inception"));
        Assert.Contains("TMDB_API_KEY", ex.Message);
    }

    [Fact]
    public async Task SearchAsync_EmptyApiKey_ThrowsInvalidOperationException()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "   " });
        var client = CreateHttpClient(new Mock<HttpMessageHandler>().Object);
        var sut = new TmdbMovieSearch(client, options);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() => sut.SearchAsync("x"));
        Assert.Contains("TMDB_API_KEY", ex.Message);
    }

    [Fact]
    public async Task SearchAsync_EmptyQuery_ReturnsEmptyList()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = new TmdbMovieSearch(client, options);

        var result = await sut.SearchAsync("   ");

        Assert.Empty(result);
        mockHandler.Protected().Verify("SendAsync", Times.Never(), ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>());
    }

    [Fact]
    public async Task SearchAsync_OkResponse_ReturnsMappedMovies()
    {
        var json = """
            {
              "results": [
                {
                  "id": 27205,
                  "title": "Inception",
                  "release_date": "2010-07-16",
                  "poster_path": "/9gk7adHYeDvHkCSEqAvQNLV5ur4.jpg"
                },
                {
                  "id": 78,
                  "title": "Blade Runner",
                  "release_date": "1982-06-25",
                  "poster_path": null
                }
              ]
            }
            """;
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent(json) });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = new TmdbMovieSearch(client, options);

        var result = await sut.SearchAsync("inception");

        Assert.Equal(2, result.Count);
        var first = result[0];
        Assert.Equal(27205, first.Id);
        Assert.Equal("Inception", first.Title);
        Assert.Equal("2010", first.Year);
        Assert.Equal("https://image.tmdb.org/t/p/w154/9gk7adHYeDvHkCSEqAvQNLV5ur4.jpg", first.PosterPath);
        var second = result[1];
        Assert.Equal(78, second.Id);
        Assert.Equal("Blade Runner", second.Title);
        Assert.Equal("1982", second.Year);
        Assert.Null(second.PosterPath);
    }

    [Fact]
    public async Task SearchAsync_NoResultsProperty_ReturnsEmptyList()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{}") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = new TmdbMovieSearch(client, options);

        var result = await sut.SearchAsync("xyz");

        Assert.Empty(result);
    }

    [Fact]
    public async Task SearchAsync_HttpError_Throws()
    {
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.ServiceUnavailable) { Content = new StringContent("Unavailable") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = new TmdbMovieSearch(client, options);

        await Assert.ThrowsAsync<HttpRequestException>(() => sut.SearchAsync("inception"));
    }

    [Fact]
    public async Task SearchAsync_RequestUsesCorrectUrlAndKey()
    {
        HttpRequestMessage? capturedRequest = null;
        var options = Options.Create(new MoviePickerOptions { TmdbApiKey = "my-secret-key" });
        var mockHandler = new Mock<HttpMessageHandler>();
        mockHandler.Protected()
            .Setup<Task<HttpResponseMessage>>("SendAsync", ItExpr.IsAny<HttpRequestMessage>(), ItExpr.IsAny<CancellationToken>())
            .Callback<HttpRequestMessage, CancellationToken>((req, _) => capturedRequest = req)
            .ReturnsAsync(new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("{\"results\":[]}") });
        var client = CreateHttpClient(mockHandler.Object);
        var sut = new TmdbMovieSearch(client, options);

        await sut.SearchAsync("matrix");

        Assert.NotNull(capturedRequest);
        Assert.Equal(HttpMethod.Get, capturedRequest.Method);
        var uri = capturedRequest.RequestUri?.ToString() ?? "";
        Assert.Contains("api.themoviedb.org", uri);
        Assert.Contains("api_key=my-secret-key", uri);
        Assert.Contains("query=matrix", uri);
        Assert.Contains("language=fr-FR", uri);
    }
}
