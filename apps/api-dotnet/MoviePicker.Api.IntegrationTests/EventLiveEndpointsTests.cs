using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.UseCases.EventLive;
using MoviePicker.Api.IntegrationTests.Helpers;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventLiveEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly MoviePickerApplicationFactory _factory;

    public EventLiveEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<(string Slug, string ParticipantId, string MovieId)> NewEventWithOneMovieAsync(HttpClient host)
    {
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Live", date = TestDates.Upcoming, time = "20:00" });
        create.EnsureSuccessStatusCode();
        var slug = (await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions))!.Slug;

        var participantId = await JoinAsync(host, slug, "Alice");

        var add = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 27205, title = "Inception", year = "2010", posterPath = (string?)null, participantId });
        add.EnsureSuccessStatusCode();
        var movie = await add.Content.ReadFromJsonAsync<JsonElement>();
        return (slug, participantId, movie.GetProperty("_id").GetString()!);
    }

    private static async Task<string> JoinAsync(HttpClient client, string slug, string pseudo)
    {
        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo });
        join.EnsureSuccessStatusCode();
        var json = await join.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("participant").GetProperty("_id").GetString()!;
    }

    private static bool ListsParticipant(string data, string participantId, bool proposing)
    {
        using var document = JsonDocument.Parse(data);
        return document.RootElement.GetProperty("participants").EnumerateArray().Any(p =>
            p.GetProperty("participantId").GetString() == participantId
            && p.GetProperty("proposing").GetBoolean() == proposing);
    }

    [Fact]
    public async Task Stream_UnknownEvent_Answers404()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/v1/events/soiree-inconnue-zz/stream");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Stream_OpensAnUncompressedEventStreamThatStartsWithReady()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _, _) = await NewEventWithOneMovieAsync(host);

        using var stream = await ServerSentEventReader.OpenAsync(
            _factory.CreateClient(),
            $"/api/v1/events/{slug}/stream",
            acceptEncoding: "br, gzip");

        Assert.Equal(HttpStatusCode.OK, stream.Response.StatusCode);
        Assert.Equal("text/event-stream", stream.Response.Content.Headers.ContentType!.MediaType);
        Assert.Empty(stream.Response.Content.Headers.ContentEncoding);
        Assert.True(stream.Response.Headers.CacheControl!.NoCache);
        await stream.WaitForAsync("ready");
    }

    [Fact]
    public async Task Stream_AfterAVote_SendsChanged()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId, movieId) = await NewEventWithOneMovieAsync(host);
        using var stream = await ServerSentEventReader.OpenAsync(_factory.CreateClient(), $"/api/v1/events/{slug}/stream");
        await stream.WaitForAsync("presence");

        var vote = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies/{movieId}/vote",
            new { participantId, value = 1 });
        vote.EnsureSuccessStatusCode();

        var changed = await stream.WaitForAsync("changed");
        Assert.Contains("\"stamp\"", changed.Data);
    }

    [Fact]
    public async Task Stream_JoinedParticipant_ShowsUpInPresenceForOtherViewers()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, hostParticipantId, _) = await NewEventWithOneMovieAsync(host);
        using var watcher = await ServerSentEventReader.OpenAsync(_factory.CreateClient(), $"/api/v1/events/{slug}/stream");

        using var hostStream = await ServerSentEventReader.OpenAsync(host, $"/api/v1/events/{slug}/stream");

        var presence = await watcher.WaitForAsync(
            "presence",
            data => ListsParticipant(data, hostParticipantId, proposing: false));
        Assert.True(ListsParticipant(presence.Data, hostParticipantId, proposing: false));
    }

    [Fact]
    public async Task Stream_BeyondTheCapOfOneAccount_Answers429AndFreesTheSlotOnClose()
    {
        using var capped = _factory.WithWebHostBuilder(builder =>
            builder.ConfigureTestServices(services =>
                services.Configure<EventLiveOptions>(options => options.MaxStreamsPerAccount = 1)));
        var host = capped.CreateClient();
        var register = await host.PostAsJsonAsync(
            "/api/v1/auth/register",
            new RegisterRequest { Email = $"u{Guid.NewGuid():N}@test.local", Password = "abcd1234", DisplayName = "Cap" });
        register.EnsureSuccessStatusCode();
        IntegrationTestAuth.ApplySessionCookie(host, register);
        var (slug, _, _) = await NewEventWithOneMovieAsync(host);

        var first = await ServerSentEventReader.OpenAsync(host, $"/api/v1/events/{slug}/stream");
        await first.WaitForAsync("ready");
        var refused = await host.GetAsync($"/api/v1/events/{slug}/stream");
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);

        first.Dispose();
        using var reopened = await WaitForAStreamAsync(host, $"/api/v1/events/{slug}/stream");
        await reopened.WaitForAsync("ready");
    }

    private static async Task<ServerSentEventReader> WaitForAStreamAsync(HttpClient client, string url)
    {
        var deadline = DateTime.UtcNow.AddSeconds(10);
        while (true)
        {
            var stream = await ServerSentEventReader.OpenAsync(client, url);
            if (stream.Response.StatusCode == HttpStatusCode.OK || DateTime.UtcNow > deadline)
                return stream;
            stream.Dispose();
            await Task.Delay(100);
        }
    }

    [Fact]
    public async Task PutPresence_Proposing_IsBroadcastToOtherViewers()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _, _) = await NewEventWithOneMovieAsync(host);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Bob");
        var guestParticipantId = await JoinAsync(guest, slug, "Bob");
        using var watcher = await ServerSentEventReader.OpenAsync(host, $"/api/v1/events/{slug}/stream");

        var response = await guest.PutAsJsonAsync($"/api/v1/events/{slug}/presence", new { proposing = true });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await watcher.WaitForAsync("presence", data => ListsParticipant(data, guestParticipantId, proposing: true));
    }

    [Fact]
    public async Task PutPresence_UserWhoHasNotJoined_Answers404()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _, _) = await NewEventWithOneMovieAsync(host);
        var stranger = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Stranger");

        var response = await stranger.PutAsJsonAsync($"/api/v1/events/{slug}/presence", new { proposing = true });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task PutPresence_Anonymous_Answers401()
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, _, _) = await NewEventWithOneMovieAsync(host);

        var response = await _factory.CreateClient().PutAsJsonAsync(
            $"/api/v1/events/{slug}/presence",
            new { proposing = true });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
}
