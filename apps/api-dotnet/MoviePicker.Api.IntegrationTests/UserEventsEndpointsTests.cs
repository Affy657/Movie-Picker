using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
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
        IntegrationTestAuth.ApplySessionCookie(client, reg);

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
        Assert.NotNull(body.MyParticipant);
        Assert.Equal("Hôte", body.MyParticipant!.Pseudo);
        Assert.True(body.ParticipantCount >= 1);
        Assert.True(body.MovieCount >= 0);
    }

    [Fact]
    public async Task Mine_ListsCreatedAndJoinedDistinctEvents()
    {
        var creatorAClient = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "CreatorA");
        var hostClient = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Hoster");

        var shared = await creatorAClient.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "S partagée", date = "2035-07-01", time = "21:00" });
        Assert.Equal(HttpStatusCode.Created, shared.StatusCode);
        var sharedEvt = await shared.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(sharedEvt);

        var join = await hostClient.PostAsJsonAsync(
            $"/api/v1/events/{sharedEvt!.Slug}/join",
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
        Assert.Contains(list.Events, e => e.Title == "S partagée" && e.IsParticipant && !e.IsCreator);
        Assert.All(list.Events, e => Assert.False(string.IsNullOrWhiteSpace(e.Lifecycle)));

        var ownedRow = list.Events.Single(e => e.Title == "Ma soirée");
        Assert.True(ownedRow.ParticipantCount >= 1);
        Assert.True(ownedRow.MovieCount >= 0);

        var sharedRow = list.Events.Single(e => e.Title == "S partagée");
        Assert.True(sharedRow.ParticipantCount >= 2);
        Assert.True(sharedRow.MovieCount >= 0);
    }

    [Fact]
    public async Task Join_SecondCallWithDifferentPseudo_ReturnsSameParticipantWhenSameAccount()
    {
        var client = _factory.CreateClient();
        var email = $"join2{Guid.NewGuid():N}@test.local";
        var reg = await client.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = email, Password = "abcd1234", DisplayName = "J" });
        IntegrationTestAuth.ApplySessionCookie(client, reg);

        var other = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Autre");
        var otherCreate = await other.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Autre", date = "2035-10-01", time = "20:00" });
        otherCreate.EnsureSuccessStatusCode();
        var otherEvt = await otherCreate.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(otherEvt);

        var first = await client.PostAsJsonAsync(
            $"/api/v1/events/{otherEvt!.Slug}/join",
            new { pseudo = "Premier" });
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        var p1 = await first.Content.ReadFromJsonAsync<JoinEventResult>(JsonOptions);
        Assert.NotNull(p1);
        Assert.True(p1!.IsNew);

        var second = await client.PostAsJsonAsync(
            $"/api/v1/events/{otherEvt.Slug}/join",
            new { pseudo = "AutrePseudo" });
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var p2 = await second.Content.ReadFromJsonAsync<JoinEventResult>(JsonOptions);
        Assert.NotNull(p2);
        Assert.False(p2!.IsNew);
        Assert.Equal(p1.Participant.Id, p2.Participant.Id);
    }
}
