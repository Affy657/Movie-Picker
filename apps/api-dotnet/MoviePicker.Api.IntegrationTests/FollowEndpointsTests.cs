using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class FollowEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public FollowEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, UserProfileResponse Profile)> NewUserAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        Assert.NotNull(profile);
        return (client, profile!);
    }

    [Fact]
    public async Task Follow_AppearsInFollowingAndFollowers()
    {
        var (alice, a) = await NewUserAsync("FollowAlice");
        var (_, b) = await NewUserAsync("FollowBob");

        var follow = await alice.PostAsync($"/api/v1/users/{b.Handle}/follow", null);
        Assert.Equal(HttpStatusCode.NoContent, follow.StatusCode);

        var following = await alice.GetFromJsonAsync<FollowListResponse>($"/api/v1/users/{a.Handle}/following", Json);
        Assert.Contains(following!.Items, i => i.Handle == b.Handle);

        var followers = await alice.GetFromJsonAsync<FollowListResponse>($"/api/v1/users/{b.Handle}/followers", Json);
        Assert.Contains(followers!.Items, i => i.Handle == a.Handle);
    }

    [Fact]
    public async Task Unfollow_RemovesRelation()
    {
        var (alice, a) = await NewUserAsync("UnfollowAlice");
        var (_, b) = await NewUserAsync("UnfollowBob");
        await alice.PostAsync($"/api/v1/users/{b.Handle}/follow", null);

        var unfollow = await alice.DeleteAsync($"/api/v1/users/{b.Handle}/follow");
        Assert.Equal(HttpStatusCode.NoContent, unfollow.StatusCode);

        var following = await alice.GetFromJsonAsync<FollowListResponse>($"/api/v1/users/{a.Handle}/following", Json);
        Assert.DoesNotContain(following!.Items, i => i.Handle == b.Handle);
    }

    [Fact]
    public async Task Follow_Self_Returns400()
    {
        var (alice, a) = await NewUserAsync("SelfFollow");

        var res = await alice.PostAsync($"/api/v1/users/{a.Handle}/follow", null);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
    }

    [Fact]
    public async Task Follow_UnknownHandle_Returns404()
    {
        var (alice, _) = await NewUserAsync("FollowsGhost");

        var res = await alice.PostAsync("/api/v1/users/ghosthandle/follow", null);

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
    }

    [Fact]
    public async Task Follow_Unauthenticated_Returns401()
    {
        var anon = _factory.CreateClient();

        var res = await anon.PostAsync("/api/v1/users/whoever/follow", null);

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }
}
