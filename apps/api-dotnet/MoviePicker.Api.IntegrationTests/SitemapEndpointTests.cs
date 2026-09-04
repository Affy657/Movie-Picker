using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class SitemapEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public SitemapEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<string> GetHandleAsync(HttpClient client)
    {
        var me = await client.GetAsync("/api/v1/auth/me");
        me.EnsureSuccessStatusCode();
        var profile = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        return profile!.Handle;
    }

    [Fact]
    public async Task Sitemap_IsAnonymous_ReturnsXmlWithHomepageAndCacheHeader()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/sitemap.xml");

        res.EnsureSuccessStatusCode();
        Assert.Contains(
            "application/xml",
            res.Content.Headers.ContentType?.MediaType ?? string.Empty);
        Assert.Contains(
            "max-age=3600",
            string.Join(", ", res.Headers.GetValues("Cache-Control")));

        var xml = await res.Content.ReadAsStringAsync();
        Assert.Contains("<urlset", xml);
        Assert.Contains("https://web.integration.test/decouvrir", xml);
    }

    [Fact]
    public async Task Sitemap_IncludesPublicProfiles_ButNotPrivate()
    {
        var publicClient = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Sitemap Public");
        var publicHandle = await GetHandleAsync(publicClient);

        var privateClient = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Sitemap Private");
        var privateHandle = await GetHandleAsync(privateClient);
        var patch = await privateClient.PatchAsJsonAsync(
            "/api/v1/auth/me", new { isProfilePublic = false });
        patch.EnsureSuccessStatusCode();

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/sitemap.xml");
        res.EnsureSuccessStatusCode();
        var xml = await res.Content.ReadAsStringAsync();

        Assert.Contains($"https://web.integration.test/u/{publicHandle}", xml);
        Assert.DoesNotContain($"/u/{privateHandle}", xml);
    }
}
