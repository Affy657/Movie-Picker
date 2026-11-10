using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventCapacityRaceTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);

    private readonly MoviePickerApplicationFactory _factory;

    public EventCapacityRaceTests(MoviePickerApplicationFactory factory)
    {
        _factory = factory;
    }

    private async Task<(HttpClient Host, CreateEventResponse Event)> CreateEventAsync(object config)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Hôte");
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Course", date = TestDates.Upcoming, time = "20:00" });
        create.EnsureSuccessStatusCode();
        var created = (await create.Content.ReadFromJsonAsync<CreateEventResponse>(JsonOptions))!;
        var patch = await host.PatchAsJsonAsync($"/api/v1/events/{created.Slug}/config", config);
        patch.EnsureSuccessStatusCode();
        return (host, created);
    }

    [Fact]
    public async Task ConcurrentJoins_NeverExceedMaxParticipants()
    {
        var (_, evt) = await CreateEventAsync(new { maxParticipants = 4 });
        var guests = new List<HttpClient>();
        for (var i = 0; i < 10; i++)
            guests.Add(await IntegrationTestAuth.NewRegisteredClientAsync(_factory, $"Invité {i}"));

        var responses = await Task.WhenAll(guests.Select((guest, i) =>
            guest.PostAsJsonAsync($"/api/v1/events/{evt.Slug}/join", new { pseudo = $"Invité {i}" })));

        Assert.Equal(3, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(7, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        using var scope = _factory.Services.CreateScope();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        Assert.Equal(4, await participants.CountByEventIdAsync(evt.Id));
    }

    [Fact]
    public async Task ConcurrentProposals_NeverExceedMaxProposalsPerParticipant()
    {
        var (host, evt) = await CreateEventAsync(new { maxProposalsPerParticipant = 3 });
        var participantId = evt.CreatorParticipant!.Id;

        var responses = await Task.WhenAll(Enumerable.Range(1, 10).Select(i =>
            host.PostAsJsonAsync(
                $"/api/v1/events/{evt.Slug}/movies",
                new { tmdbId = 1000 + i, title = $"Film {i}", year = "2020", posterPath = (string?)null, participantId })));

        Assert.Equal(3, responses.Count(r => r.StatusCode == HttpStatusCode.Created));
        Assert.Equal(7, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        using var scope = _factory.Services.CreateScope();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        Assert.Equal(3, await movies.CountByEventIdAsync(evt.Id));
    }

    [Fact]
    public async Task ConcurrentVotes_NeverExceedMaxVotesPerParticipant()
    {
        var (host, evt) = await CreateEventAsync(new { maxVotesPerParticipant = 2 });
        var participantId = evt.CreatorParticipant!.Id;
        var movieIds = new List<string>();
        for (var i = 1; i <= 8; i++)
        {
            var add = await host.PostAsJsonAsync(
                $"/api/v1/events/{evt.Slug}/movies",
                new { tmdbId = 2000 + i, title = $"Vote {i}", year = "2020", posterPath = (string?)null, participantId });
            add.EnsureSuccessStatusCode();
            var movie = await add.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
            movieIds.Add(movie.GetProperty("_id").GetString()!);
        }

        var responses = await Task.WhenAll(movieIds.Select(movieId =>
            host.PostAsJsonAsync(
                $"/api/v1/events/{evt.Slug}/movies/{movieId}/vote",
                new { participantId, value = 1 })));

        Assert.Equal(2, responses.Count(r => r.IsSuccessStatusCode));
        Assert.Equal(6, responses.Count(r => r.StatusCode == HttpStatusCode.Conflict));
        using var scope = _factory.Services.CreateScope();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var stored = await votes.GetParticipantVotesByEventAsync(evt.Id, participantId);
        Assert.Equal(2, stored.Count);
    }

    private static async Task<string> ProposeAsync(HttpClient client, string slug, string participantId, int tmdbId)
    {
        var add = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId, title = $"Film {tmdbId}", year = "2020", posterPath = (string?)null, participantId });
        add.EnsureSuccessStatusCode();
        var movie = await add.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        return movie.GetProperty("_id").GetString()!;
    }

    private static async Task<string> JoinAsync(HttpClient client, string slug, string pseudo)
    {
        var join = await client.PostAsJsonAsync($"/api/v1/events/{slug}/join", new { pseudo });
        join.EnsureSuccessStatusCode();
        var joined = await join.Content.ReadFromJsonAsync<JsonElement>(JsonOptions);
        return joined.GetProperty("participant").GetProperty("_id").GetString()!;
    }

    private static Task<HttpResponseMessage> DeleteMovieAsync(HttpClient client, string slug, string movieId, string participantId) =>
        client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"/api/v1/events/{slug}/movies/{movieId}")
        {
            Content = JsonContent.Create(new { participantId })
        });

    [Fact]
    public async Task VotesAndSeenMarksRacingAMovieRemoval_NeverOutliveTheMovie()
    {
        var (host, evt) = await CreateEventAsync(new { maxProposalsPerParticipant = 100 });
        var hostParticipantId = evt.CreatorParticipant!.Id;
        var voter = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Votant");
        var voterParticipantId = await JoinAsync(voter, evt.Slug, "Votant");

        for (var round = 0; round < 15; round++)
        {
            var movieId = await ProposeAsync(host, evt.Slug, hostParticipantId, 3000 + round);
            var moviePath = $"/api/v1/events/{evt.Slug}/movies/{movieId}";
            var removal = DeleteMovieAsync(host, evt.Slug, movieId, hostParticipantId);
            await Task.Delay(round % 6);
            var vote = voter.PostAsJsonAsync($"{moviePath}/vote", new { participantId = voterParticipantId, value = 1 });
            var seen = voter.PostAsJsonAsync($"{moviePath}/seen", new { participantId = voterParticipantId });
            await Task.WhenAll(vote, seen, removal);
            (await removal).EnsureSuccessStatusCode();
            Assert.All(new[] { await vote, await seen }, response =>
                Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.NotFound, $"unexpected {(int)response.StatusCode}"));
        }

        using var scope = _factory.Services.CreateScope();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var seenMarks = scope.ServiceProvider.GetRequiredService<ISeenMarkRepository>();
        Assert.Empty(await votes.GetParticipantVotesByEventAsync(evt.Id, voterParticipantId));
        Assert.Empty(await seenMarks.ListByParticipantIdsAsync([voterParticipantId]));
    }

    [Fact]
    public async Task VotesAndSeenMarksRacingAParticipantRemoval_NeverOutliveTheParticipant()
    {
        var (host, evt) = await CreateEventAsync(new { maxProposalsPerParticipant = 100 });
        var movieId = await ProposeAsync(host, evt.Slug, evt.CreatorParticipant!.Id, 4000);
        var moviePath = $"/api/v1/events/{evt.Slug}/movies/{movieId}";
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Invité");
        var removedParticipantIds = new List<string>();

        for (var round = 0; round < 15; round++)
        {
            var participantId = await JoinAsync(guest, evt.Slug, "Invité");
            removedParticipantIds.Add(participantId);
            var removal = host.DeleteAsync($"/api/v1/events/{evt.Slug}/participants/{participantId}");
            await Task.Delay(round % 6);
            var vote = guest.PostAsJsonAsync($"{moviePath}/vote", new { participantId, value = 1 });
            var seen = guest.PostAsJsonAsync($"{moviePath}/seen", new { participantId });
            await Task.WhenAll(vote, seen, removal);
            (await removal).EnsureSuccessStatusCode();
            Assert.All(new[] { await vote, await seen }, response =>
                Assert.True(response.IsSuccessStatusCode || response.StatusCode == HttpStatusCode.BadRequest, $"unexpected {(int)response.StatusCode}"));
        }

        using var scope = _factory.Services.CreateScope();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var seenMarks = scope.ServiceProvider.GetRequiredService<ISeenMarkRepository>();
        foreach (var participantId in removedParticipantIds)
            Assert.Empty(await votes.GetParticipantVotesByEventAsync(evt.Id, participantId));
        Assert.Empty(await seenMarks.ListByParticipantIdsAsync(removedParticipantIds));
    }

    [Fact]
    public async Task ConcurrentSeenMarks_OfOneParticipant_KeepASingleMark()
    {
        var (host, evt) = await CreateEventAsync(new { maxProposalsPerParticipant = 100 });
        var participantId = evt.CreatorParticipant!.Id;
        var movieId = await ProposeAsync(host, evt.Slug, participantId, 5000);

        var responses = await Task.WhenAll(Enumerable.Range(0, 8).Select(_ =>
            host.PostAsJsonAsync($"/api/v1/events/{evt.Slug}/movies/{movieId}/seen", new { participantId })));

        Assert.All(responses, response => Assert.True(response.IsSuccessStatusCode, $"unexpected {(int)response.StatusCode}"));
        using var scope = _factory.Services.CreateScope();
        var seenMarks = scope.ServiceProvider.GetRequiredService<ISeenMarkRepository>();
        Assert.Single(await seenMarks.ListByParticipantIdsAsync([participantId]));
    }
}
