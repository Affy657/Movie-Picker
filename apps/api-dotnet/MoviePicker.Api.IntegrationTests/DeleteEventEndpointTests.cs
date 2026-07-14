using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class DeleteEventEndpointTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public DeleteEventEndpointTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient client, CreateEventResponse evt)> CreateEventAsync(string displayName = "Hôte")
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = $"Soirée {Guid.NewGuid():N}", date = "2035-12-15", time = "21:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var evt = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(evt);
        return (client, evt!);
    }

    [Fact]
    public async Task Delete_Anonymous_Returns401()
    {
        var (_, evt) = await CreateEventAsync();
        var anon = _factory.CreateClient();

        var res = await anon.DeleteAsync($"/api/v1/events/{evt.Slug}");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Delete_NotCreator_Returns403()
    {
        var (_, evt) = await CreateEventAsync("Créateur");
        var stranger = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Étranger");

        var res = await stranger.DeleteAsync($"/api/v1/events/{evt.Slug}");

        Assert.Equal(HttpStatusCode.Forbidden, res.StatusCode);
    }

    [Fact]
    public async Task Delete_NonExistingSlug_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);

        var res = await client.DeleteAsync("/api/v1/events/this-slug-does-not-exist");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Delete_AsCreator_DeletesEventAndCascades()
    {
        var (creator, evt) = await CreateEventAsync("Créateur");

        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Invité");
        var join = await guest.PostAsJsonAsync(
            $"/api/v1/events/{evt.Slug}/join",
            new { pseudo = "Bob" });
        Assert.Equal(HttpStatusCode.Created, join.StatusCode);

        var before = await creator.GetAsync($"/api/v1/events/slug/{evt.Slug}");
        Assert.Equal(HttpStatusCode.OK, before.StatusCode);

        var del = await creator.DeleteAsync($"/api/v1/events/{evt.Slug}");
        Assert.Equal(HttpStatusCode.OK, del.StatusCode);
        var body = await del.Content.ReadFromJsonAsync<DeleteEventResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(evt.Slug, body!.Slug);
        Assert.True(body.RemovedParticipants >= 2);

        var after = await creator.GetAsync($"/api/v1/events/slug/{evt.Slug}");
        Assert.Equal(HttpStatusCode.NotFound, after.StatusCode);

        var mine = await creator.GetAsync("/api/v1/events/mine");
        Assert.Equal(HttpStatusCode.OK, mine.StatusCode);
        var list = await mine.Content.ReadFromJsonAsync<MyEventsListResponse>(JsonOptions);
        Assert.NotNull(list);
        Assert.DoesNotContain(list!.Events, e => e.Slug == evt.Slug);
    }

    [Fact]
    public async Task Delete_AsCreator_AfterWheel_StillReturns200()
    {
        var (creator, evt) = await CreateEventAsync("Créateur");
        var slug = evt.Slug;

        var join = await creator.PostAsJsonAsync(
            $"/api/v1/events/{slug}/join",
            new { pseudo = "Hôte" });
        join.EnsureSuccessStatusCode();
        var joinBody = await join.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var participantId = joinBody.TryGetProperty("_id", out var idEl)
            ? idEl.GetString()
            : joinBody.GetProperty("participant").GetProperty("_id").GetString();
        Assert.False(string.IsNullOrEmpty(participantId));

        var add = await creator.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new
            {
                tmdbId = 27205,
                title = "Inception",
                year = "2010",
                posterPath = (string?)null,
                participantId,
            });
        add.EnsureSuccessStatusCode();

        var wheel = await creator.PostAsJsonAsync($"/api/v1/events/{slug}/wheel", new { });
        wheel.EnsureSuccessStatusCode();

        var del = await creator.DeleteAsync($"/api/v1/events/{slug}");
        Assert.Equal(HttpStatusCode.OK, del.StatusCode);
        var body = await del.Content.ReadFromJsonAsync<DeleteEventResponse>(JsonOptions);
        Assert.NotNull(body);
        Assert.Equal(slug, body!.Slug);
        Assert.True(body.RemovedMovies >= 1);

        var after = await creator.GetAsync($"/api/v1/events/slug/{slug}");
        Assert.Equal(HttpStatusCode.NotFound, after.StatusCode);
    }
}
