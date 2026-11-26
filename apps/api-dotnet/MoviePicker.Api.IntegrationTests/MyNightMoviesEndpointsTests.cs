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

public sealed class MyNightMoviesEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/night-movies";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public MyNightMoviesEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<UserProfileResponse> MeAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json))!;

    private async Task NightProposedByAFriendAsync(string userId, int tmdbId, string title)
    {
        var past = new DateTimeOffset(2025, 1, 1, 12, 0, 0, TimeSpan.Zero);
        using var scope = _factory.Services.CreateScope();
        var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
        var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
        var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
        var night = await events.AddAsync(new Event
        {
            Title = $"Soirée {title}",
            Date = "2025-03-10",
            Time = "20:30",
            Slug = "night-movies-" + Guid.NewGuid().ToString("N")[..10],
            CreatedAt = past,
            UpdatedAt = past
        });
        await participants.AddAsync(new Participant
        {
            EventId = night.Id,
            UserId = userId,
            Pseudo = "Moi",
            CreatedAt = past,
            UpdatedAt = past
        });
        var friend = await participants.AddAsync(new Participant
        {
            EventId = night.Id,
            Pseudo = "Camille",
            CreatedAt = past,
            UpdatedAt = past
        });
        await movies.InsertAsync(new Movie
        {
            EventId = night.Id,
            ParticipantId = friend.Id,
            TmdbId = tmdbId,
            Title = title,
            Year = "2010",
            CreatedAt = past,
            UpdatedAt = past
        });
    }

    [Fact]
    public async Task Anonymous_IsRefused()
    {
        var response = await _factory.CreateClient().GetAsync(Route);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ListsTheFilmsAFriendProposedInMyNight()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "NightMovies");
        var me = await MeAsync(client);
        await NightProposedByAFriendAsync(me.UserId, 27_205, "Inception");

        var body = await client.GetFromJsonAsync<MyNightMoviesResponse>(Route, Json);

        var item = Assert.Single(body!.Items);
        Assert.Equal(27_205, item.TmdbId);
        Assert.Equal("Inception", item.Title);
        Assert.False(item.ProposedByMe);
        Assert.Equal("Camille", item.LastProposer?.Pseudo);
        Assert.False(item.LastProposer?.IsMe);
    }

    [Fact]
    public async Task NewAccount_HasNoFilms()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "NoNightMovies");

        var body = await client.GetFromJsonAsync<MyNightMoviesResponse>(Route, Json);

        Assert.Empty(body!.Items);
    }
}
