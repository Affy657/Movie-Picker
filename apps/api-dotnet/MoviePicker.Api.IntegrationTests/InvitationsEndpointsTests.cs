using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class InvitationsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public InvitationsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, UserProfileResponse Profile)> NewUserAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        return (client, profile!);
    }

    private static async Task<string> CreateEventAsync(HttpClient host)
    {
        var res = await host.PostAsJsonAsync("/api/v1/events", new { title = "Soirée invit", date = "2030-12-31", time = "20:00" });
        res.EnsureSuccessStatusCode();
        var created = await res.Content.ReadFromJsonAsync<CreateEventResponse>(Json);
        return created!.Slug;
    }

    [Fact]
    public async Task EligibleFollows_ListsFollowedUser()
    {
        var (host, _) = await NewUserAsync("EligHost");
        var (_, target) = await NewUserAsync("EligTarget");
        await host.PostAsync($"/api/v1/users/{target.Handle}/follow", null);
        var slug = await CreateEventAsync(host);

        var res = await host.GetFromJsonAsync<EligibleFollowsResponse>(
            $"/api/v1/events/{slug}/invitations/eligible-follows", Json);

        var item = Assert.Single(res!.Follows);
        Assert.Equal(target.UserId, item.UserId);
        Assert.False(item.IsAlreadyInvited);
        Assert.False(item.IsAlreadyParticipant);
    }

    [Fact]
    public async Task Invite_FollowedUser_Succeeds_AndNotifiesTarget()
    {
        var (host, _) = await NewUserAsync("InvHost");
        var (target, t) = await NewUserAsync("InvTarget");
        await host.PostAsync($"/api/v1/users/{t.Handle}/follow", null);
        var slug = await CreateEventAsync(host);

        var invite = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/invitations",
            new { targetUserId = t.UserId });
        Assert.Equal(HttpStatusCode.Created, invite.StatusCode);

        var inbox = await target.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);
        Assert.Contains(inbox!.Items, i => i.Type == "eventinvitation" && i.EventSlug == slug);
    }

    [Fact]
    public async Task Invite_NotFollowing_Returns400()
    {
        var (host, _) = await NewUserAsync("NfHost");
        var (_, t) = await NewUserAsync("NfTarget");
        var slug = await CreateEventAsync(host);

        var invite = await host.PostAsJsonAsync(
            $"/api/v1/events/{slug}/invitations",
            new { targetUserId = t.UserId });

        Assert.Equal(HttpStatusCode.BadRequest, invite.StatusCode);
    }

    [Fact]
    public async Task Invite_NonHost_Returns403()
    {
        var (host, _) = await NewUserAsync("HostOwner");
        var (intruder, _) = await NewUserAsync("Intruder");
        var (_, t) = await NewUserAsync("VictimTarget");
        var slug = await CreateEventAsync(host);

        var invite = await intruder.PostAsJsonAsync(
            $"/api/v1/events/{slug}/invitations",
            new { targetUserId = t.UserId });

        Assert.Equal(HttpStatusCode.Forbidden, invite.StatusCode);
    }
}
