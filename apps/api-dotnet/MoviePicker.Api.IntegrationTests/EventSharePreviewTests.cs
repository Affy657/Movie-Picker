using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventSharePreviewTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventSharePreviewTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task SharePreview_UnknownSlug_Returns404()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/events/slug/nope-slug-xyz/share-preview");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task SharePreview_NewEvent_IsRichByDefault_IncludesEventTitle()
    {
        // Depuis la branche fix/wheel-likes-guest-events les nouvelles soirées
        // sont créées avec RichSharePreview activé (cohérence UI ↔ aperçu OG).
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée publique OG", date = "2035-08-01", time = "19:30" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/events/slug/{slug}/share-preview");
        res.EnsureSuccessStatusCode();
        Assert.Contains(
            "max-age=120",
            string.Join(", ", res.Headers.GetValues("Cache-Control")));
        Assert.Contains("text/html", res.Content.Headers.ContentType?.MediaType ?? string.Empty);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("og:title", html);
        Assert.Contains("publique OG", html);
        Assert.Contains("août", html); // date formatée en français dans la description OG
        Assert.Contains("https://web.integration.test/e/", html);
    }

    [Fact]
    public async Task SharePreview_AfterPatchFalse_BecomesGeneric_DoesNotLeakEventTitle()
    {
        // L'hôte peut explicitement désactiver l'aperçu riche depuis les paramètres :
        // l'aperçu Open Graph retombe alors sur le contenu générique « Movie Picker ».
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée confidentielle", date = "2035-07-01", time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var patch = await client.PatchAsJsonAsync(
            $"/api/v1/events/{slug}/config",
            new { richSharePreview = false });
        patch.EnsureSuccessStatusCode();

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/events/slug/{slug}/share-preview");
        res.EnsureSuccessStatusCode();
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("og:title", html);
        Assert.Contains("Movie Picker", html);
        Assert.DoesNotContain("Soirée confidentielle", html);
        Assert.Contains("https://web.integration.test/e/", html);
    }
}
