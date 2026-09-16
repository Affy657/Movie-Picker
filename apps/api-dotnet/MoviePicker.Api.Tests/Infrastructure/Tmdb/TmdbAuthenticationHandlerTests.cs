using System.Net;
using Microsoft.Extensions.Options;
using MoviePicker.Api.Configuration;
using MoviePicker.Api.Infrastructure.Tmdb;
using Xunit;

namespace MoviePicker.Api.Tests.Infrastructure.Tmdb;

public sealed class TmdbAuthenticationHandlerTests
{
    private sealed class CapturingHandler : HttpMessageHandler
    {
        public HttpRequestMessage? Request { get; private set; }

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Request = request;
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK));
        }
    }

    private static async Task<HttpRequestMessage> SendThrough(MoviePickerOptions options, string url)
    {
        var inner = new CapturingHandler();
        using var client = new HttpClient(new TmdbAuthenticationHandler(Options.Create(options)) { InnerHandler = inner });

        using var _ = await client.GetAsync(url);

        return inner.Request!;
    }

    [Fact]
    public async Task ReadAccessToken_TravelsAsABearerHeader_NeverInTheUrl()
    {
        var request = await SendThrough(
            new MoviePickerOptions { TmdbReadAccessToken = "v4-token", TmdbApiKey = "v3-key" },
            "https://api.themoviedb.org/3/movie/550?language=fr-FR");

        Assert.Equal("Bearer", request.Headers.Authorization!.Scheme);
        Assert.Equal("v4-token", request.Headers.Authorization.Parameter);
        Assert.Equal("?language=fr-FR", request.RequestUri!.Query);
    }

    [Fact]
    public async Task ApiKeyAlone_IsAppendedToTheQueryString()
    {
        var request = await SendThrough(
            new MoviePickerOptions { TmdbApiKey = "v3 key/+" },
            "https://api.themoviedb.org/3/movie/550?language=fr-FR");

        Assert.Null(request.Headers.Authorization);
        Assert.Equal("?language=fr-FR&api_key=v3%20key%2F%2B", request.RequestUri!.Query);
    }

    [Fact]
    public async Task ApiKeyAlone_OnAnUrlWithoutQuery_StartsTheQueryString()
    {
        var request = await SendThrough(
            new MoviePickerOptions { TmdbApiKey = "v3-key" },
            "https://api.themoviedb.org/3/movie/550");

        Assert.Equal("?api_key=v3-key", request.RequestUri!.Query);
    }

    [Fact]
    public async Task NoCredential_LeavesTheRequestUntouched()
    {
        var request = await SendThrough(
            new MoviePickerOptions(),
            "https://api.themoviedb.org/3/movie/550?language=fr-FR");

        Assert.Null(request.Headers.Authorization);
        Assert.Equal("?language=fr-FR", request.RequestUri!.Query);
    }
}
