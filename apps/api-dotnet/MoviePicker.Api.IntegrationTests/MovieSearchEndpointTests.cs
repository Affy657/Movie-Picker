using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class MovieSearchEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MovieSearchEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task Search_WithQuery_ReturnsStubResults()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Searcher");

        var res = await client.GetAsync("/api/v1/movies/search?q=inception");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<MovieSearchListResponse>(Json);
        Assert.NotNull(body);
        Assert.Equal(2, body!.Items.Count);
        Assert.Equal("FR", body.WatchProvidersRegion);
        Assert.False(string.IsNullOrEmpty(body.Disclaimer));
    }

    [Fact]
    public async Task Search_EmptyQuery_ReturnsEmpty()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "EmptySearcher");

        var res = await client.GetAsync("/api/v1/movies/search?q=");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var body = await res.Content.ReadFromJsonAsync<MovieSearchListResponse>(Json);
        Assert.Empty(body!.Items);
    }
}
