using System.Net;
using System.Text.Json;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

/// <summary>
/// Contrat minimal : le document OpenAPI expose les chemins attendus (évite les régressions de surface API).
/// </summary>
public sealed class OpenApiContractTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly HttpClient _client;

    public OpenApiContractTests(MoviePickerApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task SwaggerJson_ExposesCriticalPaths()
    {
        var res = await _client.GetAsync("/swagger/v1/swagger.json");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var json = await res.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        var paths = doc.RootElement.GetProperty("paths");
        Assert.True(paths.TryGetProperty("/health", out _));
        Assert.True(paths.TryGetProperty("/events", out var events) && events.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/events/slug/{idOrSlug}", out _));
    }
}
