using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.DependencyInjection;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Application.Ports;
using MoviePicker.Api.Domain.Entities;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ProfileProposalsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/proposed-movies";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public ProfileProposalsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<UserProfileResponse> MeAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!;

    private async Task ProposeAsync(string userId, int tmdbId, string title, bool wins, bool anonymous = false)
    {
        var past = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        var night = await events.AddAsync(new Event
        {
            Title = $"Soirée {title}",
            Date = "2025-01-01",
            Time = "20:30",
            Slug = "proposed-" + Guid.NewGuid().ToString("N")[..10],
            Config = new EventConfig { AnonymousProposals = anonymous },
            CreatedAt = past,
            UpdatedAt = past
        });
        var proposer = await participants.AddAsync(new Participant
        {
            EventId = night.Id,
            UserId = userId,
            Pseudo = "Moi",
            CreatedAt = past,
            UpdatedAt = past
        });
        var film = await movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = proposer.Id,
            TmdbId = tmdbId,
            Title = title,
            Year = "2010",
            CreatedAt = past,
            UpdatedAt = past
        });
        if (wins)
        {
            await events.UpdateAsync(night with
            {
                Winners = [new EventWinner { MovieId = film.Id, Method = WinnerPickMethod.Wheel, PickedAt = past }],
                ClosedAt = past
            });
        }
    }

    [Fact]
    public async Task MyProposedMovies_WithoutASession_IsUnauthorized()
    {
        var response = await _factory.CreateClient().GetAsync(Route);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MyProposedMovies_OfAPrivateProfileHidingItsWatchedFilms_StayListedForItsOwner()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "MyProposals");
        var hide = await client.PatchAsJsonAsync(
            "/api/v1/auth/me",
            new PatchUserProfileRequest { IsProfilePublic = false, IsWatchedPublic = false });
        Assert.Equal(HttpStatusCode.OK, hide.StatusCode);
        var me = await MeAsync(client);
        await ProposeAsync(me.UserId, 603, "Matrix", wins: true);
        await ProposeAsync(me.UserId, 680, "Pulp Fiction", wins: false);

        var all = await client.GetFromJsonAsync<UserProposedMoviesResponse>($"{Route}?winningOnly=false", Json);
        var winners = await client.GetFromJsonAsync<UserProposedMoviesResponse>($"{Route}?winningOnly=true", Json);
        var publicRoute = await client.GetAsync($"/api/v1/users/{me.Handle}/proposed-movies");

        Assert.Equal([603, 680], all!.Items.Select(item => item.TmdbId).Order());
        Assert.Equal([603], winners!.Items.Select(item => item.TmdbId));
        Assert.Equal(HttpStatusCode.NotFound, publicRoute.StatusCode);
    }

    [Fact]
    public async Task ProposalOfAnAnonymousNight_IsListedForItsProposer_AndHiddenFromEveryoneElse()
    {
        var lea = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "LeaHides");
        var leaMe = await MeAsync(lea);
        await ProposeAsync(leaMe.UserId, 603, "Matrix", wins: true);
        await ProposeAsync(leaMe.UserId, 680, "Pulp Fiction", wins: true, anonymous: true);
        var zoe = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "ZoeLooks");
        var source = new { sourceType = "memberProposals", sourceId = leaMe.Handle };

        var mine = await lea.GetFromJsonAsync<UserProposedMoviesResponse>($"{Route}?winningOnly=false", Json);
        var myWinners = await lea.GetFromJsonAsync<UserProposedMoviesResponse>($"{Route}?winningOnly=true", Json);
        var seenByAVisitor = await _factory.CreateClient().GetFromJsonAsync<UserProposedMoviesResponse>(
            $"/api/v1/users/{leaMe.Handle}/proposed-movies",
            Json);
        var seenByAMember = await zoe.GetFromJsonAsync<UserProposedMoviesResponse>(
            $"/api/v1/users/{leaMe.Handle}/proposed-movies",
            Json);
        var save = await zoe.PostAsJsonAsync("/api/v1/saved-lists", source);
        var saved = await zoe.GetFromJsonAsync<SavedListsResponse>(
            $"/api/v1/saved-lists?sourceType=memberProposals&sourceId={leaMe.Handle}",
            Json);

        Assert.Equal([603, 680], mine!.Items.Select(item => item.TmdbId).Order());
        Assert.Equal([603, 680], myWinners!.Items.Select(item => item.TmdbId).Order());
        Assert.Equal([603], seenByAVisitor!.Items.Select(item => item.TmdbId));
        Assert.Equal([603], seenByAMember!.Items.Select(item => item.TmdbId));
        Assert.Equal(HttpStatusCode.Created, save.StatusCode);
        Assert.Equal(1, Assert.Single(saved!.Items).ItemCount);
    }

    [Fact]
    public async Task SavedProposals_OfAnotherMember_FollowTheirNextProposals_AndAreFoundByTheirHandle()
    {
        var lea = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "LeaProposes");
        var leaMe = await MeAsync(lea);
        await ProposeAsync(leaMe.UserId, 603, "Matrix", wins: true);
        var zoe = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "ZoeSaves");
        var source = new { sourceType = "memberProposals", sourceId = leaMe.Handle };

        var save = await zoe.PostAsJsonAsync("/api/v1/saved-lists", source);
        await ProposeAsync(leaMe.UserId, 680, "Pulp Fiction", wins: false);
        var bySource = await zoe.GetFromJsonAsync<SavedListsResponse>(
            $"/api/v1/saved-lists?sourceType=memberProposals&sourceId={leaMe.Handle}",
            Json);
        var ownSave = await lea.PostAsJsonAsync("/api/v1/saved-lists", source);

        Assert.Equal(HttpStatusCode.Created, save.StatusCode);
        var found = Assert.Single(bySource!.Items);
        Assert.Equal(
            (ListSourceType.MemberProposals, leaMe.UserId, 2, leaMe.Handle),
            (found.SourceType, found.SourceId, found.ItemCount, found.Creator!.Handle));
        Assert.Equal(HttpStatusCode.Conflict, ownSave.StatusCode);
    }
}
