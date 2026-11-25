using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventCoHostsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventCoHostsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Host, string Slug)> NightAsync(string title)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Hôte");
        var create = await host.PostAsJsonAsync("/api/v1/events", new { title, date = TestDates.Upcoming, time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        return (host, created!.Slug);
    }

    private async Task<(HttpClient Client, string ParticipantId)> JoinAsync(string slug, string pseudo)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, pseudo);
        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo });
        join.EnsureSuccessStatusCode();
        var body = await join.Content.ReadFromJsonAsync<JsonElement>();
        return (client, body.GetProperty("participant").GetProperty("_id").GetString()!);
    }

    private static async Task<JsonElement> DetailAsync(HttpClient client, string slug)
    {
        var res = await client.GetAsync($"/api/v1/events/slug/{slug}");
        res.EnsureSuccessStatusCode();
        return await res.Content.ReadFromJsonAsync<JsonElement>();
    }

    [Fact]
    public async Task TheCreatorNamesACoHost_WhoGainsTheHostRightsExceptDeletion()
    {
        var (host, slug) = await NightAsync("Co-hôte");
        var (coHost, coHostId) = await JoinAsync(slug, "Léa");
        var (_, guestId) = await JoinAsync(slug, "Tom");
        Assert.False((await DetailAsync(coHost, slug)).GetProperty("isHost").GetBoolean());

        var named = await host.PutAsync($"/api/v1/events/{slug}/co-hosts/{coHostId}", null);

        Assert.Equal(HttpStatusCode.NoContent, named.StatusCode);
        var detail = await DetailAsync(coHost, slug);
        Assert.True(detail.GetProperty("isHost").GetBoolean());
        var lea = detail.GetProperty("participants").EnumerateArray().Single(p => p.GetProperty("_id").GetString() == coHostId);
        Assert.True(lea.GetProperty("isCoHost").GetBoolean());

        var patch = await coHost.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { maxVotesPerParticipant = 2 });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var naming = await coHost.PutAsync($"/api/v1/events/{slug}/co-hosts/{guestId}", null);
        Assert.Equal(HttpStatusCode.Forbidden, naming.StatusCode);

        var deletion = await coHost.DeleteAsync($"/api/v1/events/{slug}");
        Assert.Equal(HttpStatusCode.Forbidden, deletion.StatusCode);

        var kick = await coHost.DeleteAsync($"/api/v1/events/{slug}/participants/{guestId}");
        Assert.Equal(HttpStatusCode.OK, kick.StatusCode);
    }

    [Fact]
    public async Task TheCreatorWithdrawsTheRole_AndTheCoHostLosesTheHostRights()
    {
        var (host, slug) = await NightAsync("Retrait");
        var (coHost, coHostId) = await JoinAsync(slug, "Léa");
        (await host.PutAsync($"/api/v1/events/{slug}/co-hosts/{coHostId}", null)).EnsureSuccessStatusCode();

        var withdrawn = await host.DeleteAsync($"/api/v1/events/{slug}/co-hosts/{coHostId}");

        Assert.Equal(HttpStatusCode.NoContent, withdrawn.StatusCode);
        Assert.False((await DetailAsync(coHost, slug)).GetProperty("isHost").GetBoolean());
        var patch = await coHost.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { maxVotesPerParticipant = 2 });
        Assert.Equal(HttpStatusCode.Forbidden, patch.StatusCode);
    }

    [Fact]
    public async Task AnAnonymousNight_HidesWhoProposedEachMovieFromEveryoneButTheProposer()
    {
        var (host, slug) = await NightAsync("Anonyme");
        (await host.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { anonymousProposals = true })).EnsureSuccessStatusCode();
        var (proposer, proposerId) = await JoinAsync(slug, "Léa");
        var add = await proposer.PostAsJsonAsync($"/api/v1/events/{slug}/movies", new
        {
            tmdbId = 27205,
            title = "Inception",
            year = "2010",
            posterPath = (string?)null,
            participantId = proposerId
        });
        add.EnsureSuccessStatusCode();

        var seenByHost = await host.GetFromJsonAsync<JsonElement>($"/api/v1/events/{slug}/movies");
        var seenByProposer = await proposer.GetFromJsonAsync<JsonElement>($"/api/v1/events/{slug}/movies");

        var hidden = seenByHost.EnumerateArray().Single();
        Assert.Equal(string.Empty, hidden.GetProperty("proposerPseudo").GetString());
        Assert.Equal(string.Empty, hidden.GetProperty("participantId").GetString());
        Assert.Equal(JsonValueKind.Null, hidden.GetProperty("proposerHandle").ValueKind);
        var own = seenByProposer.EnumerateArray().Single();
        Assert.Equal("Léa", own.GetProperty("proposerPseudo").GetString());
        Assert.Equal(proposerId, own.GetProperty("participantId").GetString());

        var turnOff = await host.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { anonymousProposals = false });
        Assert.Equal(HttpStatusCode.Conflict, turnOff.StatusCode);
    }
}
