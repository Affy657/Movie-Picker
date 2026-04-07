using System.Net;
using System.Text.Json;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

/// <summary>
/// Contrat minimal : le document OpenAPI expose les chemins attendus (évite les régressions de surface API).
/// Inventaire des routes V1 à couvrir : docs/02-architecture-api-dotnet.md § « Surface API prévue en V1 ».
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
        Assert.True(paths.TryGetProperty("/api/v1/events", out var events) && events.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/slug/{idOrSlug}", out _));
    }
}
