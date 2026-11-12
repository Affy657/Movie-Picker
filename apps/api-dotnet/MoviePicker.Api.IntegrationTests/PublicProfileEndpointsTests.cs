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

public sealed class PublicProfileEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public PublicProfileEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<UserProfileResponse> GetMeAsync(HttpClient client)
    {
        var me = await client.GetAsync("/api/v1/auth/me");
        me.EnsureSuccessStatusCode();
        var profile = await me.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        return profile!;
    }

    [Fact]
    public async Task Register_AssignsHandle_AndPublicProfileIsReachableAnonymously()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Profil Public");
        var me = await GetMeAsync(client);
        Assert.False(string.IsNullOrWhiteSpace(me.Handle));

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var profile = await res.Content.ReadFromJsonAsync<PublicProfileResponse>(JsonOptions);
        Assert.NotNull(profile);
        Assert.Equal(me.Handle, profile!.Handle);
        Assert.Equal("Profil Public", profile.DisplayName);
    }

    [Fact]
    public async Task PrivateProfile_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Discret");
        var me = await GetMeAsync(client);

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task UnknownHandle_Returns404()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/users/nobody_here_xyz");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task WatchedMovies_PublicProfile_ReturnsEmptyList()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Sans Film Vu");
        var me = await GetMeAsync(client);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/watched-movies");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var movies = await res.Content.ReadFromJsonAsync<UserWatchedMoviesResponse>(JsonOptions);
        Assert.NotNull(movies);
        Assert.Empty(movies!.Items);
    }

    [Fact]
    public async Task WatchedMovies_TakeBelowTheTotal_StillCountsEveryWatchedFilm()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Cinéphile Assidu");
        var me = await GetMeAsync(client);
        var past = new DateTimeOffset(2025, 3, 1, 12, 0, 0, TimeSpan.Zero);
        using (var scope = _factory.Services.CreateScope())
        {
            var events = scope.ServiceProvider.GetRequiredService<IEventRepository>();
            var participants = scope.ServiceProvider.GetRequiredService<IParticipantRepository>();
            var movies = scope.ServiceProvider.GetRequiredService<IMovieRepository>();
            for (var month = 1; month <= 3; month++)
            {
                var night = await events.AddAsync(new Event
                {
                    Title = $"Soirée vue {month}",
                    Date = $"2025-0{month}-10",
                    Time = "20:30",
                    HostToken = Guid.NewGuid().ToString("N"),
                    Slug = "watched-" + Guid.NewGuid().ToString("N")[..10],
                    CreatedAt = past,
                    UpdatedAt = past,
                });
                var viewer = await participants.AddAsync(new Participant
                {
                    EventId = night.Id,
                    UserId = me.UserId,
                    Pseudo = "Moi",
                    CreatedAt = past,
                    UpdatedAt = past,
                });
                var film = await movies.InsertAsync(new Movie
                {
                    EventId = night.Id,
                    ParticipantId = viewer.Id,
                    TmdbId = 27_200 + month,
                    Title = $"Film vu {month}",
                    Year = "2010",
                    CreatedAt = past,
                    UpdatedAt = past,
                });
                await events.UpdateAsync(night with
                {
                    Winners = [new EventWinner { MovieId = film.Id, Method = WinnerPickMethod.Wheel, PickedAt = past }],
                    ClosedAt = past,
                });
            }
        }

        var watched = await _factory.CreateClient().GetFromJsonAsync<UserWatchedMoviesResponse>(
            $"/api/v1/users/{me.Handle}/watched-movies?take=1",
            JsonOptions);

        Assert.NotNull(watched);
        Assert.Equal("Film vu 3", Assert.Single(watched!.Items).Title);
        Assert.Equal(3, watched.Total);
    }

    [Fact]
    public async Task WatchedMovies_PrivateProfile_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Films Vus Discrets");
        var me = await GetMeAsync(client);

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/watched-movies");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task WatchedMovies_UnknownHandle_Returns404()
    {
        var anon = _factory.CreateClient();
        var res = await anon.GetAsync("/api/v1/users/nobody_here_xyz/watched-movies");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    private static async Task AddInceptionToWatchlistAsync(HttpClient client)
    {
        var add = await client.PostAsJsonAsync(
            "/api/v1/watchlist",
            new { tmdbId = 27205, title = "Inception", year = "2010" });
        Assert.Equal(HttpStatusCode.Created, add.StatusCode);
    }

    [Fact]
    public async Task Watchlist_PublicByDefault_IsListedAndCountedForVisitors()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Liste Ouverte");
        var me = await GetMeAsync(client);
        Assert.True(me.IsWatchlistPublic);
        await AddInceptionToWatchlistAsync(client);

        var anon = _factory.CreateClient();
        var profile = await anon.GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{me.Handle}", JsonOptions);
        Assert.NotNull(profile);
        Assert.True(profile!.IsWatchlistPublic);
        Assert.Equal(1, profile.WatchlistCount);

        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/watchlist");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var page = await res.Content.ReadFromJsonAsync<WatchlistResponse>(JsonOptions);
        Assert.NotNull(page);
        Assert.Equal(1, page!.Total);
        Assert.Equal("Inception", Assert.Single(page.Items).Title);
    }

    [Fact]
    public async Task Watchlist_Hidden_Returns404ForVisitors_ButStaysReadableByItsOwner()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Liste Cachée");
        var me = await GetMeAsync(client);
        await AddInceptionToWatchlistAsync(client);

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isWatchlistPublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var patched = await patch.Content.ReadFromJsonAsync<UserProfileResponse>(JsonOptions);
        Assert.False(patched!.IsWatchlistPublic);
        Assert.True(patched.IsProfilePublic);

        var anon = _factory.CreateClient();
        var profile = await anon.GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{me.Handle}", JsonOptions);
        Assert.False(profile!.IsWatchlistPublic);
        Assert.Null(profile.WatchlistCount);
        Assert.Equal(HttpStatusCode.NotFound, (await anon.GetAsync($"/api/v1/users/{me.Handle}/watchlist")).StatusCode);

        var own = await client.GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{me.Handle}", JsonOptions);
        Assert.Equal(1, own!.WatchlistCount);
        Assert.Equal(HttpStatusCode.OK, (await client.GetAsync($"/api/v1/users/{me.Handle}/watchlist")).StatusCode);
    }

    [Fact]
    public async Task Watchlist_PrivateProfile_Returns404()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Profil Fermé");
        var me = await GetMeAsync(client);
        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{me.Handle}/watchlist");
        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task PatchHandle_ChangesPublicProfileUrl()
    {
        var unique = Guid.NewGuid().ToString("N")[..8];
        var handle = $"renamed_{unique}";
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Renamer");

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { handle });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var anon = _factory.CreateClient();
        var res = await anon.GetAsync($"/api/v1/users/{handle}");
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
    }

    [Fact]
    public async Task PatchHandle_AlreadyTaken_Returns409()
    {
        var unique = Guid.NewGuid().ToString("N")[..8];
        var contested = $"contested_{unique}";

        var first = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "First Owner");
        var firstPatch = await first.PatchAsJsonAsync("/api/v1/auth/me", new { handle = contested });
        Assert.Equal(HttpStatusCode.OK, firstPatch.StatusCode);

        var second = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Second Owner");
        var secondPatch = await second.PatchAsJsonAsync("/api/v1/auth/me", new { handle = contested });
        Assert.Equal(HttpStatusCode.Conflict, secondPatch.StatusCode);
    }
}
