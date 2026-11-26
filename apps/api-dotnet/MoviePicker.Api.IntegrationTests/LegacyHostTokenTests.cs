using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class LegacyHostTokenTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string LegacyHostHeader = "X-Host-Token";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public LegacyHostTokenTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Host, string Slug)> NightAsync()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Hôte");
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée sans jeton", date = TestDates.Upcoming, time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        return (host, created!.Slug);
    }

    private static async Task<bool> IsHostAsync(HttpClient client, string url)
    {
        var res = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var body = await res.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("isHost").GetBoolean();
    }

    [Fact]
    public async Task AnAnonymousCallerSendingTheLegacyHeader_IsServedButGetsNoHostRight()
    {
        var (_, slug) = await NightAsync();
        var anonymous = _factory.CreateClient();
        anonymous.DefaultRequestHeaders.Add(LegacyHostHeader, "legacy-token-from-an-old-link");

        Assert.False(await IsHostAsync(anonymous, $"/api/v1/events/slug/{slug}"));

        var patch = await anonymous.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { maxVotesPerParticipant = 2 });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
        var error = await patch.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(ErrorCodes.HostOnly, error.GetProperty("reason").GetString());

        var close = await anonymous.PostAsJsonAsync($"/api/v1/events/{slug}/close", new { });
        Assert.Equal(HttpStatusCode.Forbidden, close.StatusCode);
    }

    [Fact]
    public async Task TheCreatorWhoseBrowserStillSendsTheLegacyHeader_KeepsTheHostRights()
    {
        var (host, slug) = await NightAsync();
        host.DefaultRequestHeaders.Add(LegacyHostHeader, "stale-token");

        Assert.True(await IsHostAsync(host, $"/api/v1/events/slug/{slug}"));

        var patch = await host.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { maxVotesPerParticipant = 2 });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
    }

    [Fact]
    public async Task TheLegacyHostQueryKey_IsIgnored()
    {
        var (_, slug) = await NightAsync();
        var anonymous = _factory.CreateClient();

        Assert.False(await IsHostAsync(anonymous, $"/api/v1/events/slug/{slug}?host=legacy-token"));
    }
}
