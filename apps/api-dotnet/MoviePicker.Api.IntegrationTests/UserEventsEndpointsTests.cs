using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Infrastructure.Web;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class UserEventsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public UserEventsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static void ApplySessionCookie(HttpClient client, HttpResponseMessage response)
    {
        if (!response.Headers.TryGetValues("Set-Cookie", out var headers))
            return;
        foreach (var header in headers)
        {
            var prefix = AuthConstants.CookieName + "=";
            if (header.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var pair = header.Split(';')[0].Trim();
                client.DefaultRequestHeaders.Remove("Cookie");
                client.DefaultRequestHeaders.Add("Cookie", pair);
                return;
            }
        }
    }

    [Fact]
    public async Task GetMine_WithoutSession_Returns401()
    {
        var client = _factory.CreateClient();
        var res = await client.GetAsync("/api/v1/events/mine");
        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Creator_GetsIsHostOnDetailWithoutHostQuery()
    {
        var client = _factory.CreateClient();
        var email = $"host{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "Hôte" });
        Assert.Equal(HttpStatusCode.Created, reg.StatusCode);
        ApplySessionCookie(client, reg);

        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée compte", date = "2035-06-01", time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);

        var detail = await client.GetAsync($"/api/v1/events/slug/{created!.Slug}");
        Assert.Equal(HttpStatusCode.OK, detail.StatusCode);
        var body = await detail.Content.ReadFromJsonAsync<EventDetailResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.True(body!.IsHost);
    }

    [Fact]
    public async Task Mine_ListsCreatedAndJoinedDistinctEvents()
    {
        var hostClient = _factory.CreateClient();
        var anonClient = _factory.CreateClient();

        var hostEmail = $"h{Guid.NewGuid():N}@test.local";
        var hostReg = await hostClient.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = hostEmail, Password = "abcd1234", DisplayName = "Hoster" });
        ApplySessionCookie(hostClient, hostReg);

        var anonCreate = await anonClient.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "S anonyme", date = "2035-07-01", time = "21:00" });
        Assert.Equal(HttpStatusCode.Created, anonCreate.StatusCode);
        var anonEvt = await anonCreate.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(anonEvt);

        var join = await hostClient.PostAsJsonAsync(
            $"/api/v1/events/{anonEvt!.Slug}/join",
            new { pseudo = "InvitéHost" });
        Assert.Equal(HttpStatusCode.Created, join.StatusCode);

        var owned = await hostClient.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Ma soirée", date = "2035-08-01", time = "22:00" });
        Assert.Equal(HttpStatusCode.Created, owned.StatusCode);

        var mine = await hostClient.GetAsync("/api/v1/events/mine");
        Assert.Equal(HttpStatusCode.OK, mine.StatusCode);
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);
        Assert.NotNull(list);
        Assert.Equal(2, list!.Events.Count);
        Assert.Contains(list.Events, e => e.Title == "Ma soirée" && e.IsCreator);
        Assert.Contains(list.Events, e => e.Title == "S anonyme" && e.IsParticipant && !e.IsCreator);
    }

    [Fact]
    public async Task Join_SecondCallWithDifferentPseudo_ReturnsSameParticipantWhenSameAccount()
    {
        var client = _factory.CreateClient();
        var email = $"join2{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "J" });
        ApplySessionCookie(client, reg);

        var other = _factory.CreateClient();
        var otherCreate = await other.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Autre", date = "2035-10-01", time = "20:00" });
        var otherEvt = await otherCreate.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(otherEvt);

        var first = await client.PostAsJsonAsync(
            $"/api/v1/events/{otherEvt!.Slug}/join",
            new { pseudo = "Premier" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var p1 = await first.Content.ReadFromJsonAsync<ParticipantResponse>(JsonOptions);
        Assert.NotNull(p1);

        var second = await client.PostAsJsonAsync(
            $"/api/v1/events/{otherEvt.Slug}/join",
            new { pseudo = "AutrePseudo" });
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        using var doc = JsonDocument.Parse(await second.Content.ReadAsStringAsync());
        var participant = doc.RootElement.GetProperty("participant");
        var pid = participant.TryGetProperty("_id", out var idEl)
            ? idEl.GetString()
            : participant.GetProperty("id").GetString();
        Assert.Equal(p1!.Id, pid);
    }
}
