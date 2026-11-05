using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class AvatarPhotoEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private const string Route = "/api/v1/users/me/avatar-photo";
    private const string PhotoPrefix = "photo:";

    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public AvatarPhotoEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static object Upload(byte[] bytes, string contentType = "image/png") =>
        new { contentType, base64Content = Convert.ToBase64String(bytes) };

    private static async Task<UserProfileResponse> UploadAsync(HttpClient client, byte[] bytes)
    {
        var response = await client.PutAsJsonAsync(Route, Upload(bytes), Json);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UserProfileResponse>(Json))!;
    }

    private static async Task<UserProfileResponse> PatchAsync(HttpClient client, object body)
    {
        var response = await client.PatchAsJsonAsync("/api/v1/auth/me", body, Json);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<UserProfileResponse>(Json))!;
    }

    private static string ImageUrl(string avatarId) => $"/api/v1/avatars/{avatarId[PhotoPrefix.Length..]}";

    [Fact]
    public async Task Upload_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().PutAsJsonAsync(Route, Upload(ImageHeaders.Png(256, 256)), Json);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Delete_Anonymous_IsUnauthorized()
    {
        var response = await _factory.CreateClient().DeleteAsync(Route);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Upload_ThePhotoIsServedToAnyoneAndCachedForADay()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Servie");
        var bytes = ImageHeaders.Png(256, 256);

        var profile = await UploadAsync(client, bytes);

        Assert.StartsWith(PhotoPrefix, profile.AvatarId);
        Assert.Equal(profile.AvatarId, profile.AvatarPhotoId);
        var image = await _factory.CreateClient().GetAsync(ImageUrl(profile.AvatarId));
        Assert.Equal(HttpStatusCode.OK, image.StatusCode);
        Assert.Equal("image/png", image.Content.Headers.ContentType?.MediaType);
        Assert.Equal(bytes, await image.Content.ReadAsByteArrayAsync());
        Assert.Equal(TimeSpan.FromDays(1), image.Headers.CacheControl?.MaxAge);
        Assert.True(image.Headers.CacheControl?.Public);
        Assert.Contains("nosniff", image.Headers.GetValues("X-Content-Type-Options"));
    }

    [Fact]
    public async Task Upload_UnacceptableImage_IsRefusedWithItsCode()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Refusee");

        var response = await client.PutAsJsonAsync(Route, Upload(ImageHeaders.Png(64, 64)), Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(ErrorCodes.AvatarPhotoInvalid, body.GetProperty("reason").GetString());
    }

    [Theory]
    [InlineData("0123456789abcdef0123456789abcdef")]
    [InlineData("not-a-key")]
    public async Task GetImage_UnknownOrMalformedKey_IsNotFound(string key)
    {
        var response = await _factory.CreateClient().GetAsync($"/api/v1/avatars/{key}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Delete_StopsServingThePhotoAndFallsBackToTheGeneratedAvatar()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Supprimee");
        await PatchAsync(client, new { avatarId = "bolt" });
        var uploaded = await UploadAsync(client, ImageHeaders.Png(256, 256));

        var response = await client.DeleteAsync(Route);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var profile = await response.Content.ReadFromJsonAsync<UserProfileResponse>(Json);
        Assert.Equal("bolt", profile!.AvatarId);
        Assert.Null(profile.AvatarPhotoId);
        Assert.Equal(HttpStatusCode.NotFound, (await _factory.CreateClient().GetAsync(ImageUrl(uploaded.AvatarId))).StatusCode);
    }

    [Fact]
    public async Task Delete_ABrowserRevalidatingItsCopyIsToldThePhotoIsGone()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Revalidee");
        var uploaded = await UploadAsync(client, ImageHeaders.Png(256, 256));
        var served = await _factory.CreateClient().GetAsync(ImageUrl(uploaded.AvatarId));
        await client.DeleteAsync(Route);

        using var revalidation = new HttpRequestMessage(HttpMethod.Get, ImageUrl(uploaded.AvatarId));
        revalidation.Headers.IfNoneMatch.Add(served.Headers.ETag!);
        var response = await _factory.CreateClient().SendAsync(revalidation);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task ChoosingAGeneratedAvatarKeepsThePhotoToComeBackTo()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Gardee");
        var uploaded = await UploadAsync(client, ImageHeaders.Png(256, 256));

        var robot = await PatchAsync(client, new { avatarId = "bolt" });
        var back = await PatchAsync(client, new { useAvatarPhoto = true });

        Assert.Equal("bolt", robot.AvatarId);
        Assert.Equal(uploaded.AvatarPhotoId, robot.AvatarPhotoId);
        Assert.Equal(uploaded.AvatarId, back.AvatarId);
    }

    [Fact]
    public async Task UseAvatarPhoto_WithoutPhoto_IsNotFound()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Sans Photo");

        var response = await client.PatchAsJsonAsync("/api/v1/auth/me", new { useAvatarPhoto = true }, Json);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal(ErrorCodes.AvatarPhotoNotFound, body.GetProperty("reason").GetString());
    }

    [Fact]
    public async Task ThePhotoReplacesTheAvatarWhereverItShows()
    {
        var owner = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Photo Partout");
        var photoAvatarId = (await UploadAsync(owner, ImageHeaders.Png(256, 256))).AvatarId;
        var me = await owner.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        var viewer = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Spectateur");

        var publicProfile = await _factory.CreateClient().GetFromJsonAsync<PublicProfileResponse>($"/api/v1/users/{me!.Handle}", Json);
        Assert.Equal(photoAvatarId, publicProfile!.AvatarId);

        var search = JsonDocument.Parse(await viewer.GetStringAsync($"/api/v1/users/search?q={Uri.EscapeDataString(me.Handle)}")).RootElement;
        Assert.Contains(
            search.GetProperty("items").EnumerateArray(),
            item => item.GetProperty("handle").GetString() == me.Handle
                && item.GetProperty("avatarId").GetString() == photoAvatarId);

        Assert.Equal(HttpStatusCode.NoContent, (await viewer.PostAsync($"/api/v1/users/{me.Handle}/follow", null)).StatusCode);
        var viewerMe = await viewer.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        var following = await viewer.GetFromJsonAsync<FollowListResponse>($"/api/v1/users/{viewerMe!.Handle}/following", Json);
        Assert.Contains(following!.Items, item => item.Handle == me.Handle && item.AvatarId == photoAvatarId);

        var created = await owner.PostAsJsonAsync("/api/v1/events", new { title = "Soirée photo", date = "2035-06-01", time = "20:00" });
        var slug = (await created.Content.ReadFromJsonAsync<CreateEventResponse>(Json))!.Slug;
        var detail = await owner.GetFromJsonAsync<EventDetailResponse>($"/api/v1/events/slug/{slug}", Json);
        Assert.Contains(detail!.Participants, participant => participant.AvatarId == photoAvatarId);
    }
}
