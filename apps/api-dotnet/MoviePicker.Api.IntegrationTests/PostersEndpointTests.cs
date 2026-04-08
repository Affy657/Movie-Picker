using System.Net;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class PostersEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly HttpClient _client;

    public PostersEndpointTests(MoviePickerApplicationFactory factory)
    {
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
}
