using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventLetBackInEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventLetBackInEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Host, string Slug)> NightAsync(string title)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Hôte");
        var create = await host.PostAsJsonAsync("/api/v1/events", new { title, date = TestDates.Upcoming, time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        return (host, created!.Slug);
    }

    private static async Task<HttpResponseMessage> JoinAsync(HttpClient client, string slug, string pseudo) =>
        await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo });

    private static async Task<string> ParticipantIdAsync(HttpResponseMessage join)
    {
        var body = await join.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("participant").GetProperty("_id").GetString()!;
    }

    private static async Task<JsonElement> DetailAsync(HttpClient client, string slug)
    {
        var res = await client.GetAsync($"/api/v1/events/slug/{slug}");
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task TheHostSeesWhoTheyRemoved_LetsThemBackIn_AndTheyJoinAgainByTheLink()
    {
        var (host, slug) = await NightAsync("Laisser revenir");
        var lea = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Léa");
        var participantId = await ParticipantIdAsync(await JoinAsync(lea, slug, "Léa"));
        (await host.DeleteAsync($"/api/v1/events/{slug}/participants/{participantId}")).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Forbidden, (await JoinAsync(lea, slug, "Léa")).StatusCode);

        var removed = Assert.Single((await DetailAsync(host, slug)).GetProperty("removedPeople").EnumerateArray());
        Assert.Equal("Léa", removed.GetProperty("displayName").GetString());
        Assert.Empty((await DetailAsync(lea, slug)).GetProperty("removedPeople").EnumerateArray());
        var removedId = removed.GetProperty("id").GetString();

        var forbidden = await lea.DeleteAsync($"/api/v1/events/{slug}/removed-people/{removedId}");
        var letBackIn = await host.DeleteAsync($"/api/v1/events/{slug}/removed-people/{removedId}");

        Assert.Equal(HttpStatusCode.Forbidden, forbidden.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, letBackIn.StatusCode);
        Assert.Empty((await DetailAsync(host, slug)).GetProperty("removedPeople").EnumerateArray());
        Assert.False((await DetailAsync(lea, slug)).GetProperty("viewerRemoved").GetBoolean());
        Assert.Equal(HttpStatusCode.Created, (await JoinAsync(lea, slug, "Léa")).StatusCode);
    }
}
