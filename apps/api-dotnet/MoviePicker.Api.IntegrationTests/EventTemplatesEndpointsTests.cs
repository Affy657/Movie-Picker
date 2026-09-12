using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventTemplatesEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/event-templates";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventTemplatesEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private Task<HttpClient> NewUserAsync(string displayName) =>
        IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);

    private static SaveEventTemplateRequest Payload(
        string name,
        string? theme = "🎃 Halloween",
        int? maxProposals = 3,
        WheelMode? wheelMode = WheelMode.StrictRandom,
        bool allowSeries = false) =>
        new()
        {
            Name = name,
            Theme = theme,
            MaxProposalsPerParticipant = maxProposals,
            MaxParticipants = 8,
            WheelMode = wheelMode,
            AllowSeries = allowSeries
        };

    private static async Task<EventTemplateResponse> CreateAsync(HttpClient client, SaveEventTemplateRequest body)
    {
        var response = await client.PostAsJsonAsync(Route, body, Json);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var created = await response.Content.ReadFromJsonAsync<EventTemplateResponse>(Json);
        Assert.NotNull(created);
        return created!;
    }

    private static async Task<EventTemplateListResponse> ListAsync(HttpClient client)
    {
        var list = await client.GetFromJsonAsync<EventTemplateListResponse>(Route, Json);
        Assert.NotNull(list);
        return list!;
    }

    [Fact]
    public async Task List_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync(Route);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Create_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(Route, Payload("Soirée horreur"), Json);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task List_NewAccount_IsEmpty()
    {
        var client = await NewUserAsync("TemplatesEmpty");

        Assert.Empty((await ListAsync(client)).Items);
    }

    [Fact]
    public async Task Create_ThenList_ReturnsTheWholeConfig()
    {
        var client = await NewUserAsync("TemplatesCreate");

        var created = await CreateAsync(client, Payload("Soirée horreur"));

        Assert.False(string.IsNullOrEmpty(created.Id));
        var item = Assert.Single((await ListAsync(client)).Items);
        Assert.Equal("Soirée horreur", item.Name);
        Assert.Equal("🎃 Halloween", item.Theme);
        Assert.Equal(3, item.MaxProposalsPerParticipant);
        Assert.Equal(8, item.MaxParticipants);
        Assert.Equal(WheelMode.StrictRandom, item.WheelMode);
        Assert.False(item.AllowSeries);
    }

    [Fact]
    public async Task Create_BlankName_IsBadRequest()
    {
        var client = await NewUserAsync("TemplatesBlank");

        var response = await client.PostAsJsonAsync(Route, Payload("   "), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Create_DuplicateName_IsConflict()
    {
        var client = await NewUserAsync("TemplatesDuplicate");
        await CreateAsync(client, Payload("Soirée horreur"));

        var response = await client.PostAsJsonAsync(Route, Payload("SOIRÉE HORREUR"), Json);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Create_BeyondTheCap_IsConflict()
    {
        var client = await NewUserAsync("TemplatesCap");
        for (var index = 1; index <= EventTemplate.MaxPerUser; index++)
            await CreateAsync(client, Payload($"Template {index}"));

        var response = await client.PostAsJsonAsync(Route, Payload("Un de trop"), Json);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Update_RenamesAndReplacesTheConfig()
    {
        var client = await NewUserAsync("TemplatesUpdate");
        var created = await CreateAsync(client, Payload("Soirée horreur"));

        var response = await client.PutAsJsonAsync(
            $"{Route}/{created.Id}",
            Payload("Soirée frissons", theme: null, maxProposals: 5, wheelMode: WheelMode.WeightedByVotes),
            Json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var updated = await response.Content.ReadFromJsonAsync<EventTemplateResponse>(Json);
        Assert.Equal(created.Id, updated!.Id);
        Assert.Equal("Soirée frissons", updated.Name);
        Assert.Null(updated.Theme);
        Assert.Equal(5, updated.MaxProposalsPerParticipant);
        Assert.Equal(WheelMode.WeightedByVotes, updated.WheelMode);
    }

    [Fact]
    public async Task Update_UnknownTemplate_IsNotFound()
    {
        var client = await NewUserAsync("TemplatesUpdateMissing");

        var response = await client.PutAsJsonAsync($"{Route}/nope", Payload("Soirée horreur"), Json);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_RemovesTheTemplate()
    {
        var client = await NewUserAsync("TemplatesDelete");
        var created = await CreateAsync(client, Payload("Soirée horreur"));
        await CreateAsync(client, Payload("Ciné du dimanche"));

        var response = await client.DeleteAsync($"{Route}/{created.Id}");

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        var remaining = Assert.Single((await ListAsync(client)).Items);
        Assert.Equal("Ciné du dimanche", remaining.Name);
    }

    [Fact]
    public async Task Delete_UnknownTemplate_IsNotFound()
    {
        var client = await NewUserAsync("TemplatesDeleteMissing");

        var response = await client.DeleteAsync($"{Route}/nope");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Templates_AreScopedToTheirOwner()
    {
        var owner = await NewUserAsync("TemplatesOwner");
        var stranger = await NewUserAsync("TemplatesStranger");
        var created = await CreateAsync(owner, Payload("Soirée horreur"));

        Assert.Empty((await ListAsync(stranger)).Items);
        Assert.Equal(
            HttpStatusCode.NotFound,
            (await stranger.DeleteAsync($"{Route}/{created.Id}")).StatusCode);
    }
}
