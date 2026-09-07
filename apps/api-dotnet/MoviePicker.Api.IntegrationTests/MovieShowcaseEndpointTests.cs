using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieShowcaseEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MovieShowcaseEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<MovieShowcaseListResponse> GetShowcaseAsync(string queryString)
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/movies/showcase{queryString}");
        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<MovieShowcaseListResponse>(JsonOptions);
        Assert.NotNull(body);
        return body!;
    }

    [Fact]
    public async Task Showcase_IsAnonymous_ReturnsTrendingItems()
    {
        var body = await GetShowcaseAsync("?section=trending");

        Assert.Equal("trending", body.Section);
        Assert.NotEmpty(body.Items);
        Assert.All(body.Items, item => Assert.False(string.IsNullOrWhiteSpace(item.Title)));
        Assert.False(string.IsNullOrWhiteSpace(body.Disclaimer));
    }

    [Fact]
    public async Task Showcase_WithoutSection_DefaultsToTrending()
    {
        var body = await GetShowcaseAsync(string.Empty);

        Assert.Equal("trending", body.Section);
    }

    [Fact]
    public async Task Showcase_NowPlaying_ReturnsItems()
    {
        var body = await GetShowcaseAsync("?section=now-playing");

        Assert.Equal("now-playing", body.Section);
        Assert.NotEmpty(body.Items);
    }

    [Fact]
    public async Task Showcase_KnownTheme_EchoesTheme()
    {
        var body = await GetShowcaseAsync("?section=theme&theme=annees-80");

        Assert.Equal("annees-80", body.Theme);
        Assert.NotEmpty(body.Items);
    }

    [Fact]
    public async Task Showcase_UnknownSection_ReturnsBadRequest()
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync("/api/v1/movies/showcase?section=nawak");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Showcase_UnknownTheme_ReturnsBadRequest()
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync("/api/v1/movies/showcase?section=theme&theme=nawak");

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Showcase_MostProposed_IsEmptyWhileTheServiceHasNoRanking()
    {
        var body = await GetShowcaseAsync("?section=most-proposed");

        Assert.Empty(body.Items);
    }

    [Fact]
    public async Task Collections_IsAnonymous_ReturnsCuratedList()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/movies/collections");

        res.EnsureSuccessStatusCode();
        var body = await res.Content.ReadFromJsonAsync<MovieCollectionListResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.NotEmpty(body!.Items);
        Assert.All(body.Items, item => Assert.False(string.IsNullOrWhiteSpace(item.Name)));
    }
}
