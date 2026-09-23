using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventSlugAccessTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventSlugAccessTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Theory]
    [InlineData("/api/v1/events/slug/{0}")]
    [InlineData("/api/v1/events/slug/{0}/share-preview")]
    [InlineData("/api/v1/events/{0}/config")]
    [InlineData("/api/v1/events/{0}/movies")]
    public async Task PublicEventRoutes_ResolveTheSlug_ButNeverTheEventId(string routeFormat)
    {
        var created = await CreateEventAsync();
        var anonymous = _factory.CreateClient();

        var bySlug = await anonymous.GetAsync(string.Format(routeFormat, created.Slug));
        var byId = await anonymous.GetAsync(string.Format(routeFormat, created.Id));

        Assert.True(bySlug.IsSuccessStatusCode, $"slug lookup answered {(int)bySlug.StatusCode}");
        Assert.Equal(HttpStatusCode.NotFound, byId.StatusCode);
    }

    [Fact]
    public async Task Join_WithTheEventId_ReturnsNotFound()
    {
        var created = await CreateEventAsync();
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);

        var res = await guest.PostAsJsonAsync($"/api/v1/events/{created.Id}/join", new { pseudo = "Guest" });

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    private async Task<CreateEventResponse> CreateEventAsync()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Slug only night", date = "2035-09-01", time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        Assert.False(string.IsNullOrEmpty(created!.Id));
        Assert.NotEqual(created.Id, created.Slug);
        return created;
    }
}
