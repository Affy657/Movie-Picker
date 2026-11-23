using System.Net;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ApiCrawlerAndCacheHeadersTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public ApiCrawlerAndCacheHeadersTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static List<string> VaryOf(HttpResponseMessage response) =>
        response.Headers.Vary.SelectMany(value => value.Split(',')).Select(value => value.Trim()).ToList();

    [Fact]
    public async Task CachedPublicAnswer_WithoutAnOrigin_StillVariesOnTheOrigin()
    {
        var res = await _factory.CreateClient().GetAsync("/sitemap.xml");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Contains("public", res.Headers.CacheControl!.ToString(), StringComparison.Ordinal);
        Assert.Single(VaryOf(res), value => value.Equals("Origin", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task CrossOriginAnswer_NamesTheOriginOnlyOnce()
    {
        var request = new HttpRequestMessage(HttpMethod.Get, "/sitemap.xml");
        request.Headers.Add("Origin", "http://localhost:5173");

        var res = await _factory.CreateClient().SendAsync(request);

        Assert.Single(VaryOf(res), value => value.Equals("Origin", StringComparison.OrdinalIgnoreCase));
    }

    [Fact]
    public async Task RobotsTxt_KeepsCrawlersOffTheApiButLetsThemFetchItsImages()
    {
        var res = await _factory.CreateClient().GetAsync("/robots.txt");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("text/plain", res.Content.Headers.ContentType?.MediaType);
        var lines = (await res.Content.ReadAsStringAsync()).Split('\n', StringSplitOptions.RemoveEmptyEntries);
        Assert.Equal("User-agent: *", lines[0]);
        Assert.Contains("Disallow: /", lines);
        Assert.Contains("Allow: /api/v1/posters/", lines);
        Assert.Contains("Allow: /api/v1/banners/", lines);
        Assert.Contains("Allow: /api/v1/avatars/", lines);
    }

    [Fact]
    public async Task MethodTheRouteDoesNotServe_AnswersTheJsonErrorEnvelope()
    {
        var res = await _factory.CreateClient().PutAsync("/health", new StringContent(string.Empty));

        Assert.Equal(HttpStatusCode.MethodNotAllowed, res.StatusCode);
        Assert.Equal("application/json", res.Content.Headers.ContentType?.MediaType);
    }
}
