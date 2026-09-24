using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Entities;
using MoviePicker.Api.Domain.Exceptions;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class FavoritesEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/favorites";

    private const string TmdbPoster = "https://image.tmdb.org/t/p/w500/rrBuGu0Pjq7Y2BWSI6teGfZzviY.jpg";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public FavoritesEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static AddFavoriteRequest Payload(
        int tmdbId,
        string title,
        MovieMediaType mediaType = MovieMediaType.Movie,
        string? posterPath = null) =>
        new() { TmdbId = tmdbId, MediaType = mediaType, Title = title, Year = "1995", PosterPath = posterPath };

    private static async Task<FavoriteListResponse> AddAsync(HttpClient client, AddFavoriteRequest body)
    {
        var response = await client.PostAsJsonAsync(Route, body, Json);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<FavoriteListResponse>(Json);
        Assert.NotNull(list);
        return list!;
    }

    private static async Task<UserProfileResponse> MeAsync(HttpClient client)
    {
        var me = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        Assert.NotNull(me);
        return me!;
    }

    private async Task<PublicProfileResponse> PublicProfileAsync(string handle)
    {
        var profile = await _factory.CreateClient().GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{handle}", Json);
        Assert.NotNull(profile);
        return profile!;
    }

    [Fact]
    public async Task Add_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync(Route, Payload(949, "Heat"), Json);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Remove_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().DeleteAsync($"{Route}/949");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task NewAccount_HasNoFavorites()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Vides");
        var me = await MeAsync(client);

        Assert.Empty(me.Favorites);
        Assert.Empty((await PublicProfileAsync(me.Handle)).Favorites);
    }

    [Fact]
    public async Task Add_ShowsTheTitlesInOrderOnTheAccountAndThePublicProfile()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Ordre");

        await AddAsync(client, Payload(949, "Heat", posterPath: TmdbPoster));
        var list = await AddAsync(client, Payload(1920, "Twin Peaks", MovieMediaType.Tv));

        Assert.Equal(["Heat", "Twin Peaks"], list.Items.Select(i => i.Title));
        var me = await MeAsync(client);
        Assert.Equal(["Heat", "Twin Peaks"], me.Favorites.Select(f => f.Title));
        var profile = await PublicProfileAsync(me.Handle);
        Assert.Equal([MovieMediaType.Movie, MovieMediaType.Tv], profile.Favorites.Select(f => f.MediaType));
        Assert.StartsWith("/api/v1/posters/", profile.Favorites[0].PosterPath, StringComparison.Ordinal);
        Assert.Null(profile.Favorites[1].PosterPath);
    }

    [Fact]
    public async Task Add_BeyondThree_IsConflictAndKeepsTheList()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Plein");
        await AddAsync(client, Payload(1, "Un"));
        await AddAsync(client, Payload(2, "Deux"));
        await AddAsync(client, Payload(3, "Trois"));

        var response = await client.PostAsJsonAsync(Route, Payload(4, "Quatre"), Json);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(ErrorCodes.FavoritesLimitReached, body.GetProperty("reason").GetString());
        Assert.Equal(["Un", "Deux", "Trois"], (await MeAsync(client)).Favorites.Select(f => f.Title));
    }

    [Fact]
    public async Task Add_TheSameTitleTwice_KeepsASingleOne()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Doublon");
        await AddAsync(client, Payload(949, "Heat"));

        var list = await AddAsync(client, Payload(949, "Heat"));

        Assert.Single(list.Items);
    }

    [Fact]
    public async Task Add_AFilmAndASeriesSharingANumber_KeepsBoth()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Film Serie");
        await AddAsync(client, Payload(1920, "Twin Peaks"));

        var list = await AddAsync(client, Payload(1920, "Twin Peaks", MovieMediaType.Tv));

        Assert.Equal(2, list.Items.Count);
    }

    [Theory]
    [InlineData("""{"tmdbId":0,"mediaType":"movie","title":"Heat","year":"1995"}""")]
    [InlineData("""{"tmdbId":949,"mediaType":"movie","title":"   ","year":"1995"}""")]
    [InlineData("""{"tmdbId":949,"mediaType":"anime","title":"Heat","year":"1995"}""")]
    [InlineData("""{"tmdbId":949,"mediaType":7,"title":"Heat","year":"1995"}""")]
    [InlineData("""{"tmdbId":949,"mediaType":"movie","title":"Heat","year":"1995","posterPath":"https://evil.example/poster.jpg"}""")]
    public async Task Add_InvalidTitle_IsBadRequest(string body)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Invalide");

        var response = await client.PostAsync(Route, new StringContent(body, Encoding.UTF8, "application/json"));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Empty((await MeAsync(client)).Favorites);
    }

    [Fact]
    public async Task Remove_TakesOnlyThatTitleOffTheProfile()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Retrait");
        await AddAsync(client, Payload(1920, "Twin Peaks"));
        await AddAsync(client, Payload(1920, "Twin Peaks", MovieMediaType.Tv));

        var response = await client.DeleteAsync($"{Route}/1920?mediaType=tv");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<FavoriteListResponse>(Json);
        Assert.Equal([MovieMediaType.Movie], list!.Items.Select(i => i.MediaType));
        var me = await MeAsync(client);
        Assert.Equal([MovieMediaType.Movie], (await PublicProfileAsync(me.Handle)).Favorites.Select(f => f.MediaType));
    }

    [Fact]
    public async Task Remove_ATitleAlreadyGone_ReturnsTheList()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Deja Retire");
        await AddAsync(client, Payload(949, "Heat"));

        var response = await client.DeleteAsync($"{Route}/27205");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var list = await response.Content.ReadFromJsonAsync<FavoriteListResponse>(Json);
        Assert.Equal(["Heat"], list!.Items.Select(i => i.Title));
    }

    [Fact]
    public async Task PrivateProfile_HidesTheFavorites()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Prives");
        await AddAsync(client, Payload(949, "Heat"));
        var me = await MeAsync(client);
        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { isProfilePublic = false });
        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);

        var response = await _factory.CreateClient().GetAsync($"/api/v1/users/{me.Handle}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal(["Heat"], (await MeAsync(client)).Favorites.Select(f => f.Title));
    }

    [Fact]
    public async Task EditingTheProfile_KeepsTheFavorites()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Favoris Bio");
        await AddAsync(client, Payload(949, "Heat"));

        var patch = await client.PatchAsJsonAsync("/api/v1/auth/me", new { bio = "Cinéphile" });

        Assert.Equal(HttpStatusCode.OK, patch.StatusCode);
        var updated = await patch.Content.ReadFromJsonAsync<UserProfileResponse>(Json);
        Assert.Equal(["Heat"], updated!.Favorites.Select(f => f.Title));
        Assert.Equal(["Heat"], (await MeAsync(client)).Favorites.Select(f => f.Title));
    }
}
