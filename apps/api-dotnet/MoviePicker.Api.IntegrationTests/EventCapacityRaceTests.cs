using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
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
            new { title = "Course", date = "2035-06-01", time = "20:00" });
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
}
