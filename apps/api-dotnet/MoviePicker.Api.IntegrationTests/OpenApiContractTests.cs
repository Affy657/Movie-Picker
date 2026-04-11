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
        Assert.True(paths.TryGetProperty("/api/v1/events/mine", out var mine) && mine.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/slug/{idOrSlug}", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/slug/{idOrSlug}/share-preview", out var sharePv)
                    && sharePv.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/register", out var reg) && reg.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/login", out var login) && login.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/logout", out var logout) && logout.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/auth/me", out var me) && me.TryGetProperty("get", out _) && me.TryGetProperty("patch", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}/config", out var evCfg)
                    && evCfg.TryGetProperty("get", out _)
                    && evCfg.TryGetProperty("patch", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}/movies/{movieId}/reactions", out var rx)
                    && rx.TryGetProperty("get", out _)
                    && rx.TryGetProperty("post", out _));
        Assert.True(paths.TryGetProperty("/api/v1/events/{idOrSlug}/movies/{movieId}/reactions/{reactionId}", out var rxDel)
                    && rxDel.TryGetProperty("delete", out _));
        Assert.True(paths.TryGetProperty("/api/v1/movies/search", out var mSearch) && mSearch.TryGetProperty("get", out _));
        Assert.True(paths.TryGetProperty("/api/v1/posters/{posterKey}", out var posters) && posters.TryGetProperty("get", out _));
        var schemas = doc.RootElement.GetProperty("components").GetProperty("schemas");
        Assert.True(schemas.TryGetProperty("MovieSearchListResponse", out _));
        Assert.True(schemas.TryGetProperty("MovieSearchItemResponse", out _));
        Assert.True(schemas.TryGetProperty("WatchProviderOfferResponse", out _));
        Assert.True(schemas.TryGetProperty("EventConfigResponse", out _));
    }
}
