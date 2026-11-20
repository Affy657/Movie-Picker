using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ProfileBannerEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string BannerRoute = "/api/v1/users/me/banner";
    private const string PhotoRoute = "/api/v1/users/me/banner-photo";
    private const int FilmId = 693134;
    private const string FilmImage = "/stub-backdrop-693134-1.jpg";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public ProfileBannerEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static object Film(string imagePath = FilmImage) => new { source = "film", tmdbId = FilmId, imagePath };

    private static object Upload(byte[] bytes, string contentType = "image/jpeg") =>
        new { contentType, base64Content = Convert.ToBase64String(bytes) };

    private static async Task<UserProfileResponse> OkProfileAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UserProfileResponse>(Json))!;
    }

    private static async Task<string?> ReasonAsync(HttpResponseMessage response) =>
        JsonElement.Parse(await response.Content.ReadAsStringAsync()).GetProperty("reason").GetString();

    [Fact]
    public async Task Banner_Anonymous_IsUnauthorized()
    {
        var anonymous = _factory.CreateClient();

        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync(BannerRoute, Film(), Json)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync(BannerRoute)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.PutAsJsonAsync(PhotoRoute, Upload(ImageHeaders.Jpeg(1600, 900)), Json)).StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, (await anonymous.DeleteAsync(PhotoRoute)).StatusCode);
    }

    [Fact]
    public async Task FilmBanner_ShowsOnThePublicProfileWithTheFilmTitle()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Banniere Film");

        var profile = await OkProfileAsync(await client.PutAsJsonAsync(BannerRoute, Film(), Json));

        Assert.Equal("film", profile.Banner!.Source);
        Assert.Equal("https://image.tmdb.org/t/p/w1280" + FilmImage, profile.Banner.ImageUrl);
        var visitor = await _factory.CreateClient().GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{profile.Handle}", Json);
        Assert.Equal("film", visitor!.Banner!.Source);
        Assert.Equal(FilmId, visitor.Banner.TmdbId);
        Assert.Equal("Film E2E Stub", visitor.Banner.Title);
        Assert.Equal(profile.Banner.ImageUrl, visitor.Banner.ImageUrl);
    }

    [Fact]
    public async Task FilmBanner_WithAnImageThatIsNotTheFilms_IsRefusedWithItsCode()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Banniere Refusee");

        var response = await client.PutAsJsonAsync(BannerRoute, Film("/another.jpg"), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.ProfileBannerInvalid, await ReasonAsync(response));
    }

    [Fact]
    public async Task FilmBanner_WithAPathThatIsNotATmdbFile_IsRefused()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Banniere Chemin");

        var response = await client.PutAsJsonAsync(BannerRoute, Film("/../../evil.svg"), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task UploadedPhoto_IsServedToAnyoneCachedAndBecomesTheBanner()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Banniere Photo");
        var bytes = ImageHeaders.Jpeg(1600, 900);

        var profile = await OkProfileAsync(await client.PutAsJsonAsync(PhotoRoute, Upload(bytes), Json));

        Assert.Equal("photo", profile.Banner!.Source);
        Assert.Equal(profile.Banner.ImageUrl, profile.BannerPhotoUrl);
        var image = await _factory.CreateClient().GetAsync(profile.Banner.ImageUrl);
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/jpeg", image.Content.Headers.ContentType?.MediaType);
        Assert.Equal(bytes, await image.Content.ReadAsByteArrayAsync());
        Assert.True(image.Headers.CacheControl?.Public);
        Assert.Contains("nosniff", image.Headers.GetValues("X-Content-Type-Options"));
    }

    [Fact]
    public async Task UploadedPhoto_NotLandscape_IsRefusedWithItsCode()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Carree");

        var response = await client.PutAsJsonAsync(PhotoRoute, Upload(ImageHeaders.Jpeg(1600, 1600)), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(ErrorCodes.BannerPhotoInvalid, await ReasonAsync(response));
    }

    [Fact]
    public async Task ChoosingAFilm_KeepsThePhoto_AndUsingItAgainBringsItBack()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Gardee");
        var uploaded = await OkProfileAsync(await client.PutAsJsonAsync(PhotoRoute, Upload(ImageHeaders.Jpeg(1600, 900)), Json));
        await OkProfileAsync(await client.PutAsJsonAsync(BannerRoute, Film(), Json));

        var profile = await OkProfileAsync(await client.PutAsJsonAsync(BannerRoute, new { source = "photo" }, Json));

        Assert.Equal("photo", profile.Banner!.Source);
        Assert.Equal(uploaded.BannerPhotoUrl, profile.Banner.ImageUrl);
    }

    [Fact]
    public async Task DeletingThePhoto_StopsServingItAndTakesTheBannerOff()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Supprimee");
        var uploaded = await OkProfileAsync(await client.PutAsJsonAsync(PhotoRoute, Upload(ImageHeaders.Jpeg(1600, 900)), Json));

        var profile = await OkProfileAsync(await client.DeleteAsync(PhotoRoute));

        Assert.Null(profile.Banner);
        Assert.Null(profile.BannerPhotoUrl);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync(uploaded.BannerPhotoUrl)).StatusCode);
    }

    [Fact]
    public async Task RemovingTheBanner_HidesItFromThePublicProfile()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Banniere Retiree");
        await OkProfileAsync(await client.PutAsJsonAsync(BannerRoute, Film(), Json));

        var profile = await OkProfileAsync(await client.DeleteAsync(BannerRoute));

        Assert.Null(profile.Banner);
        var visitor = await _factory.CreateClient().GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{profile.Handle}", Json);
        Assert.Null(visitor!.Banner);
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef")]
    [InlineData("not-a-key")]
    public async Task GetPhoto_UnknownOrMalformedKey_IsNotFound(string key)
    {
        var response = await _factory.CreateClient().GetAsync($"/api/v1/banners/{key}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Backdrops_OfAFilm_AreListedForAnyone()
    {
        var response = await _factory.CreateClient().GetFromJsonAsync<MovieBackdropsResponse>($"/api/v1/movies/tmdb/{FilmId}/backdrops", Json);

        Assert.Equal(FilmId, response!.TmdbId);
        Assert.Equal(FilmImage, response.Backdrops[0].Path);
        Assert.Equal("https://image.tmdb.org/t/p/w780" + FilmImage, response.Backdrops[0].ThumbnailUrl);
    }
}
