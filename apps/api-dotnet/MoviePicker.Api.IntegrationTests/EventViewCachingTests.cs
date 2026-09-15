using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventViewCachingTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventViewCachingTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<(string Slug, string ParticipantId, string MovieId)> NewEventWithOneMovieAsync(HttpClient client)
    {
        var create = await client.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Cache", date = "2035-06-01", time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions);
        var slug = created!.Slug;

        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo = "Alice" });
        join.EnsureSuccessStatusCode();
        var joinJson = await join.Content.ReadFromJsonAsync<JsonElement>();
        var participantId = joinJson.GetProperty("participant").GetProperty("_id").GetString()!;

        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 27205, title = "Inception", year = "2010", posterPath = (string?)null, participantId });
        add.EnsureSuccessStatusCode();
        var movieJson = await add.Content.ReadFromJsonAsync<JsonElement>();
        return (slug, participantId, movieJson.GetProperty("_id").GetString()!);
    }

    private static async Task<HttpResponseMessage> GetConditionalAsync(HttpClient client, string url, string entityTag)
    {
        using var request = new HttpRequestMessage(HttpMethod.Get, url);
        request.Headers.IfNoneMatch.Add(EntityTagHeaderValue.Parse(entityTag));
        return await client.SendAsync(request);
    }

    private static async Task<HttpResponseMessage> GetUntilNotModifiedAsync(HttpClient client, string url)
    {
        var first = await client.GetAsync(url);
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        var entityTag = first.Headers.ETag!.ToString();

        var second = await GetConditionalAsync(client, url, entityTag);
        if (second.StatusCode == HttpStatusCode.NotModified)
            return second;

        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        return await GetConditionalAsync(client, url, second.Headers.ETag!.ToString());
    }

    [Theory]
    [InlineData("/api/v1/events/slug/{slug}")]
    [InlineData("/api/v1/events/{slug}/movies")]
    public async Task Get_StampsAWeakEntityTag_AndAsksTheBrowserToRevalidate(string route)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _, _) = await NewEventWithOneMovieAsync(client);

        var response = await client.GetAsync(route.Replace("{slug}", slug));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(response.Headers.ETag);
        Assert.True(response.Headers.ETag!.IsWeak);
        Assert.True(response.Headers.CacheControl!.Private);
        Assert.True(response.Headers.CacheControl.NoCache);
    }

    [Theory]
    [InlineData("/api/v1/events/slug/{slug}")]
    [InlineData("/api/v1/events/{slug}/movies")]
    public async Task Get_WithTheCurrentEntityTag_Answers304WithoutABody(string route)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _, _) = await NewEventWithOneMovieAsync(client);

        var notModified = await GetUntilNotModifiedAsync(client, route.Replace("{slug}", slug));

        Assert.Equal(HttpStatusCode.NotModified, notModified.StatusCode);
        Assert.NotNull(notModified.Headers.ETag);
        Assert.Equal(0, notModified.Content.Headers.ContentLength ?? 0);
    }

    [Fact]
    public async Task Get_AfterAVote_AnswersTheNewListWithANewEntityTag()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId, movieId) = await NewEventWithOneMovieAsync(client);
        var url = $"/api/v1/events/{slug}/movies?participantId={participantId}";
        var notModified = await GetUntilNotModifiedAsync(client, url);
        var beforeVote = notModified.Headers.ETag!.ToString();

        var vote = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/vote", new { participantId, value = 1 });
        vote.EnsureSuccessStatusCode();
        var afterVote = await GetConditionalAsync(client, url, beforeVote);

        Assert.Equal(HttpStatusCode.OK, afterVote.StatusCode);
        Assert.NotEqual(beforeVote, afterVote.Headers.ETag!.ToString());
        var movies = await afterVote.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(1, movies[0].GetProperty("score").GetInt32());
    }

    [Fact]
    public async Task Get_AfterARemovedVote_InvalidatesTheEntityTagToo()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId, movieId) = await NewEventWithOneMovieAsync(client);
        var url = $"/api/v1/events/{slug}/movies?participantId={participantId}";
        var vote = await client.PostAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/vote", new { participantId, value = 1 });
        vote.EnsureSuccessStatusCode();
        var notModified = await GetUntilNotModifiedAsync(client, url);
        var beforeClear = notModified.Headers.ETag!.ToString();

        var clear = await client.DeleteAsync($"/api/v1/events/{slug}/movies/{movieId}/vote?participantId={participantId}");
        clear.EnsureSuccessStatusCode();
        var afterClear = await GetConditionalAsync(client, url, beforeClear);

        Assert.Equal(HttpStatusCode.OK, afterClear.StatusCode);
        var movies = await afterClear.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(0, movies[0].GetProperty("score").GetInt32());
    }

    [Fact]
    public async Task Get_TheEntityTagOfOneUser_NeverAnswers304ToAnotherUser()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Host");
        var (slug, _, _) = await NewEventWithOneMovieAsync(host);
        var hostView = await host.GetAsync($"/api/v1/events/slug/{slug}");
        var hostTag = hostView.Headers.ETag!.ToString();
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Guest");

        var guestView = await GetConditionalAsync(guest, $"/api/v1/events/slug/{slug}", hostTag);

        Assert.Equal(HttpStatusCode.OK, guestView.StatusCode);
        Assert.NotEqual(hostTag, guestView.Headers.ETag!.ToString());
        var detail = await guestView.Content.ReadFromJsonAsync<JsonElement>();
        Assert.False(detail.GetProperty("isHost").GetBoolean());
    }

    [Fact]
    public async Task Get_OnAnUnknownEvent_StaysA404()
    {
        var client = _factory.CreateClient();

        var response = await GetConditionalAsync(client, "/api/v1/events/slug/nope-" + Guid.NewGuid().ToString("N"), "W/\"x\"");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
