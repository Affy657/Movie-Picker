using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ParticipationOwnershipEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public ParticipationOwnershipEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private sealed record VotedNight(string EventId, string Slug, string HostParticipantId, string MovieId);

    private static async Task<VotedNight> NightWithAVoteAndASeenMarkAsync(HttpClient host)
    {
        var create = await host.PostAsJsonAsync(
            "/api/v1/events",
            new { title = "Soirée surveillée", date = TestDates.Upcoming, time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var created = await create.Content.ReadFromJsonAsync<JsonElement>();
        var eventId = created.GetProperty("_id").GetString()!;
        var slug = created.GetProperty("slug").GetString()!;
        var participantId = created.GetProperty("creatorParticipant").GetProperty("_id").GetString()!;

        var add = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 603, title = "The Matrix", year = "1999", posterPath = (string?)null, participantId });
        add.EnsureSuccessStatusCode();
        var movieId = (await add.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("_id").GetString()!;

        var moviePath = $"/api/v1/events/{slug}/movies/{movieId}";
        (await host.PostAsJsonAsync($"{moviePath}/vote", new { participantId, value = 1 })).EnsureSuccessStatusCode();
        (await host.PostAsJsonAsync($"{moviePath}/seen", new { participantId })).EnsureSuccessStatusCode();
        return new VotedNight(eventId, slug, participantId, movieId);
    }

    private static Task<HttpResponseMessage> ActOnTheParticipationAsync(HttpClient client, VotedNight night, string action)
    {
        var moviePath = $"/api/v1/events/{night.Slug}/movies/{night.MovieId}";
        var participantId = night.HostParticipantId;
        return action switch
        {
            "vote" => client.PostAsJsonAsync($"{moviePath}/vote", new { participantId, value = -1 }),
            "clear-vote" => client.DeleteAsync($"{moviePath}/vote?participantId={participantId}"),
            "mark-seen" => client.PostAsJsonAsync($"{moviePath}/seen", new { participantId }),
            _ => client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, $"{moviePath}/seen")
            {
                Content = JsonContent.Create(new { participantId })
            })
        };
    }

    [Theory]
    [InlineData("vote", ErrorCodes.VoteOwnParticipationOnly)]
    [InlineData("clear-vote", ErrorCodes.VoteOwnOnly)]
    [InlineData("mark-seen", ErrorCodes.SeenMarkOwnParticipationOnly)]
    [InlineData("unmark-seen", ErrorCodes.SeenMarkOwnOnly)]
    public async Task AGuest_CannotUseTheParticipationOfAnotherAccount(string action, string expectedReason)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var guest = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await NightWithAVoteAndASeenMarkAsync(host);
        (await guest.PostAsJsonAsync($"/api/v1/events/{night.Slug}/join", new { pseudo = "Invité" })).EnsureSuccessStatusCode();

        var response = await ActOnTheParticipationAsync(guest, night, action);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(expectedReason, body.GetProperty("reason").GetString());

        using var scope = _factory.Services.CreateScope();
        var votes = scope.ServiceProvider.GetRequiredService<IVoteRepository>();
        var seenMarks = scope.ServiceProvider.GetRequiredService<ISeenMarkRepository>();
        var stored = await votes.GetParticipantVotesByEventAsync(night.EventId, night.HostParticipantId);
        Assert.Equal(1, stored[night.MovieId]);
        Assert.Single(await seenMarks.ListByParticipantIdsAsync([night.HostParticipantId]));
    }

    [Theory]
    [InlineData("vote")]
    [InlineData("clear-vote")]
    [InlineData("mark-seen")]
    [InlineData("unmark-seen")]
    public async Task TheOwner_StillActsOnTheirOwnParticipation(string action)
    {
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var night = await NightWithAVoteAndASeenMarkAsync(host);

        var response = await ActOnTheParticipationAsync(host, night, action);

        Assert.True(response.IsSuccessStatusCode, $"unexpected {(int)response.StatusCode}");
    }
}
