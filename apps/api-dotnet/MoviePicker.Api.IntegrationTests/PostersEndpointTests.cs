using System.Net;
using System.Net.Http.Headers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Infrastructure.Posters;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class PostersEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;
    private readonly HttpClient _client;

    public PostersEndpointTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetPoster_UnknownKey_ReturnsNotFound()
    {
        var key = new string('0', 64);
        var res = await _client.GetAsync($"/api/v1/posters/{key}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetPoster_InvalidKeyLength_ReturnsNotFound()
    {
        var res = await _client.GetAsync("/api/v1/posters/not-a-hex-key");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetTmdbPoster_InvalidFileName_ReturnsNotFound()
    {
        var res = await _client.GetAsync("/api/v1/posters/tmdb/w500/poster.svg");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task GetTmdbPoster_NeverSeenBefore_IsFetchedFromTmdbAndServed()
    {
        var tmdb = new RecordingImageHandler();
        var client = _factory.WithWebHostBuilder(b => b.ConfigureTestServices(services =>
            services.AddHttpClient(PosterFetchHttp.ClientName).ConfigurePrimaryHttpMessageHandler(() => tmdb)))
            .CreateClient();

        var first = await client.GetAsync("/api/v1/posters/tmdb/w500/never-seen.jpg");
        var second = await client.GetAsync("/api/v1/posters/tmdb/w500/never-seen.jpg");

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal("image/jpeg", first.Content.Headers.ContentType?.MediaType);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.Equal(["https://image.tmdb.org/t/p/w500/never-seen.jpg"], tmdb.Requested);
    }

    private sealed class RecordingImageHandler : HttpMessageHandler
    {
        public List<string> Requested { get; } = [];

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            lock (Requested)
                Requested.Add(request.RequestUri!.ToString());
            var content = new ByteArrayContent([0xFF, 0xD8, 0xFF]);
            content.Headers.ContentType = new MediaTypeHeaderValue("image/jpeg");
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content });
        }
    }
}
