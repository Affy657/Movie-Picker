using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using MoviePicker.Api.Domain.Exceptions;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ProfilePhotoReportEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public ProfilePhotoReportEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static string Route(string handle) => $"/api/v1/users/{handle}/photo-reports";

    private async Task<(HttpClient Client, UserProfileResponse Profile)> MemberWithPhotoAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var upload = await client.PutAsJsonAsync(
            "/api/v1/users/me/avatar-photo",
            new { contentType = "image/png", base64Content = Convert.ToBase64String(ImageHeaders.Png(256, 256)) },
            Json);
        Assert.Equal(HttpStatusCode.OK, upload.StatusCode);
        return (client, (await upload.Content.ReadFromJsonAsync<UserProfileResponse>(Json))!);
    }

    [Fact]
    public async Task Report_Anonymous_IsUnauthorized()
    {
        var (_, owner) = await MemberWithPhotoAsync("ReportedAnonymously");

        var response = await _factory.CreateClient().PostAsJsonAsync(Route(owner.Handle!), new { photo = "avatar" }, Json);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Report_AnotherMembersPhoto_IsAccepted()
    {
        var (_, owner) = await MemberWithPhotoAsync("ReportedOwner");
        var reporter = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "PhotoReporter");

        var response = await reporter.PostAsJsonAsync(Route(owner.Handle!), new { photo = "avatar" }, Json);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Fact]
    public async Task Report_OwnPhoto_IsRefusedWithItsCode()
    {
        var (owner, profile) = await MemberWithPhotoAsync("ReportsItself");

        var response = await owner.PostAsJsonAsync(Route(profile.Handle!), new { photo = "avatar" }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(ErrorCodes.SelfPhotoReport, body.GetProperty("reason").GetString());
    }

    [Theory]
    [InlineData("cover")]
    [InlineData("")]
    public async Task Report_PhotoThatIsNeitherTheAvatarNorTheBanner_IsRefused(string photo)
    {
        var (_, owner) = await MemberWithPhotoAsync("ReportedWithoutKind");
        var reporter = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "VagueReporter");

        var response = await reporter.PostAsJsonAsync(Route(owner.Handle!), new { photo }, Json);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Report_UnknownHandle_IsNotFound()
    {
        var reporter = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "ReportsAGhost");

        var response = await reporter.PostAsJsonAsync(Route("ghosthandle"), new { photo = "avatar" }, Json);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
