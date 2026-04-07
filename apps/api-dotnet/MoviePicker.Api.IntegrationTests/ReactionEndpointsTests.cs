using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ReactionEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public ReactionEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task PostReaction_ListMoviesAndGetAggregates_ShowCounts_AndDelete()
    {
        var client = _factory.CreateClient();
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Réactions", date = "2036-01-01", time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var join1 = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Alice" });
        join1.EnsureSuccessStatusCode();
        var j1El = await join1.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var pid1 = j1El.TryGetProperty("_id", out var id1)
            ? id1.GetString()!
            : j1El.GetProperty("participant").GetProperty("_id").GetString()!;

        var join2 = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Bob" });
        join2.EnsureSuccessStatusCode();
        var j2El = await join2.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var pid2 = j2El.TryGetProperty("_id", out var id2)
            ? id2.GetString()!
            : j2El.GetProperty("participant").GetProperty("_id").GetString()!;

        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new
            {
                tmdbId = 100,
                title = "Test Film",
                year = "2020",
                posterPath = (string?)null,
                participantId = pid1
            });
        add.EnsureSuccessStatusCode();
        var movie = await add.Content.ReadFromJsonAsync<MovieWithScoreResponse>(JsonOptions);
        Assert.NotNull(movie);

        var post1 = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie!.Id}/reactions",
            new { participantId = pid1, reactionId = "already_seen" });
        Assert.Equal(HttpStatusCode.OK, post1.StatusCode);

        var post2 = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie.Id}/reactions",
            new { participantId = pid2, reactionId = "already_seen" });
        Assert.Equal(HttpStatusCode.OK, post2.StatusCode);

        var list = await client.GetAsync($"/api/v1/events/{slug}/movies");
        list.EnsureSuccessStatusCode();
        var movies = await list.Content.ReadFromJsonAsync<List<MovieWithScoreResponse>>(JsonOptions);
        Assert.NotNull(movies);
        var row = Assert.Single(movies!);
        var agg = Assert.Single(row.Reactions);
        Assert.Equal("already_seen", agg.ReactionId);
        Assert.Equal(2, agg.Count);

        var getAgg = await client.GetAsync($"/api/v1/events/{slug}/movies/{movie.Id}/reactions");
        getAgg.EnsureSuccessStatusCode();
        var aggBody = await getAgg.Content.ReadFromJsonAsync<MovieReactionsResponse>(JsonOptions);
        Assert.NotNull(aggBody);
        Assert.Equal(movie.Id, aggBody!.MovieId);
        Assert.Equal(2, Assert.Single(aggBody.Reactions).Count);

        var del = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/events/{slug}/movies/{movie.Id}/reactions/already_seen")
        {
            Content = JsonContent.Create(new { participantId = pid1 }, options: JsonOptions)
        });
        Assert.Equal(HttpStatusCode.NoContent, del.StatusCode);

        var list2 = await client.GetAsync($"/api/v1/events/{slug}/movies");
        var movies2 = await list2.Content.ReadFromJsonAsync<List<MovieWithScoreResponse>>(JsonOptions);
        var row2 = Assert.Single(movies2!);
        Assert.Single(row2.Reactions);
        Assert.Equal(1, row2.Reactions[0].Count);
    }

    [Fact]
    public async Task PostReaction_Duplicate_IsIdempotent()
    {
        var client = _factory.CreateClient();
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Idem", date = "2036-03-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Solo" });
        join.EnsureSuccessStatusCode();
        var jEl = await join.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var pid = jEl.TryGetProperty("_id", out var idp)
            ? idp.GetString()!
            : jEl.GetProperty("participant").GetProperty("_id").GetString()!;

        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 200, title = "Dup", year = "2019", participantId = pid });
        var movie = await add.Content.ReadFromJsonAsync<MovieWithScoreResponse>(JsonOptions);
        Assert.NotNull(movie);

        var first = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie!.Id}/reactions",
            new { participantId = pid, reactionId = "meh" });
        var second = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie.Id}/reactions",
            new { participantId = pid, reactionId = "meh" });
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        var a = await first.Content.ReadFromJsonAsync<ReactionResponse>(JsonOptions);
        var b = await second.Content.ReadFromJsonAsync<ReactionResponse>(JsonOptions);
        Assert.NotNull(a);
        Assert.NotNull(b);
        Assert.Equal(a!.Id, b!.Id);
    }

    [Fact]
    public async Task PostReaction_UnknownId_Returns400()
    {
        var client = _factory.CreateClient();
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "BadRx", date = "2036-04-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;

        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "P" });
        join.EnsureSuccessStatusCode();
        var jEl = await join.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var pid = jEl.TryGetProperty("_id", out var idp)
            ? idp.GetString()!
            : jEl.GetProperty("participant").GetProperty("_id").GetString()!;

        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 201, title = "Z", year = "2022", participantId = pid });
        var movie = await add.Content.ReadFromJsonAsync<MovieWithScoreResponse>(JsonOptions);

        var bad = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie!.Id}/reactions",
            new { participantId = pid, reactionId = "not_in_catalog" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }

    [Fact]
    public async Task PostReaction_WhenNotInAllowedList_Returns400()
    {
        var client = _factory.CreateClient();
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "R2", date = "2036-02-01", time = "20:00" });
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        Assert.NotNull(created);
        var slug = created!.Slug;
        var hostQ = Uri.EscapeDataString(created.HostToken);

        await client.PatchAsJsonAsync(
            $"/api/v1/events/{slug}/config?host={hostQ}",
            new { allowedReactionIds = new[] { "meh" } });

        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "P" });
        join.EnsureSuccessStatusCode();
        var jEl = await join.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        var pid = jEl.TryGetProperty("_id", out var idp)
            ? idp.GetString()!
            : jEl.GetProperty("participant").GetProperty("_id").GetString()!;
        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 101, title = "Y", year = "2021", participantId = pid });
        var movie = await add.Content.ReadFromJsonAsync<MovieWithScoreResponse>(JsonOptions);

        var bad = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movie!.Id}/reactions",
            new { participantId = pid, reactionId = "already_seen" });
        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
    }
}
