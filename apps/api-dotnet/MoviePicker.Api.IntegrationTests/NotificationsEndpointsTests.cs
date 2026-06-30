using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using MoviePicker.Api.Application.DTOs;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class NotificationsEndpointsTests : IClassFixture<MoviePickerApplicationFactory>
{
    private static readonly JsonSerializerOptions Json = new()
    {
        PropertyNameCaseInsensitive = true,
        Converters = { new JsonStringEnumConverter(JsonNamingPolicy.CamelCase) }
    };

    private readonly MoviePickerApplicationFactory _factory;

    public NotificationsEndpointsTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private async Task<(HttpClient Client, UserProfileResponse Profile)> NewUserAsync(string displayName)
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, displayName);
        var profile = await client.GetFromJsonAsync<UserProfileResponse>("/api/v1/auth/me", Json);
        return (client, profile!);
    }

    [Fact]
    public async Task Inbox_NewUser_IsEmpty()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "InboxEmpty");

        var inbox = await client.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);

        Assert.NotNull(inbox);
        Assert.Empty(inbox!.Items);
        Assert.Equal(0, inbox.UnreadCount);
    }

    [Fact]
    public async Task Inbox_Unauthenticated_Returns401()
    {
        var anon = _factory.CreateClient();

        var res = await anon.GetAsync("/api/v1/notifications/inbox");

        Assert.Equal(HttpStatusCode.Unauthorized, res.StatusCode);
    }

    [Fact]
    public async Task Preferences_DefaultAllEnabled()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "PrefsDefault");

        var prefs = await client.GetFromJsonAsync<NotificationPreferencesResponse>("/api/v1/notifications/preferences", Json);

        Assert.NotNull(prefs);
        Assert.True(prefs!.NotifyOnMovieAdded);
        Assert.True(prefs.NotifyOnNewFollower);
    }

    [Fact]
    public async Task PatchPreferences_DisablesSelectedFlag()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "PrefsPatch");

        var res = await client.PatchAsJsonAsync(
            "/api/v1/notifications/preferences",
            new { notifyOnMovieAdded = false });
        Assert.Equal(HttpStatusCode.OK, res.StatusCode);

        var prefs = await res.Content.ReadFromJsonAsync<NotificationPreferencesResponse>(Json);
        Assert.False(prefs!.NotifyOnMovieAdded);
        Assert.True(prefs.NotifyOnNewFollower);
    }

    [Fact]
    public async Task PushSubscription_SubscribeThenUnsubscribe()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "PushSub");

        var sub = await client.PostAsJsonAsync(
            "/api/v1/notifications/subscriptions",
            new { endpoint = "https://push.example.com/abc", p256dh = "key", auth = "auth" });
        Assert.Equal(HttpStatusCode.NoContent, sub.StatusCode);

        var unsub = await client.SendAsync(new HttpRequestMessage(HttpMethod.Delete, "/api/v1/notifications/subscriptions")
        {
            Content = JsonContent.Create(new { endpoint = "https://push.example.com/abc" })
        });
        Assert.Equal(HttpStatusCode.NoContent, unsub.StatusCode);
    }

    [Fact]
    public async Task MarkAllRead_Returns204()
    {
        var client = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "ReadAll");

        var res = await client.PostAsync("/api/v1/notifications/inbox/read-all", null);

        Assert.Equal(HttpStatusCode.NoContent, res.StatusCode);
    }

    [Fact]
    public async Task NewFollower_CreatesInboxNotification_AndMarkAllReadClearsUnread()
    {
        var (alice, _) = await NewUserAsync("NotifAlice");
        var (bob, b) = await NewUserAsync("NotifBob");

        var follow = await alice.PostAsync($"/api/v1/users/{b.Handle}/follow", null);
        Assert.Equal(HttpStatusCode.NoContent, follow.StatusCode);

        var inbox = await bob.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);
        Assert.Equal(1, inbox!.UnreadCount);
        var item = Assert.Single(inbox.Items);
        Assert.Equal("newfollower", item.Type);

        var markRead = await bob.PostAsync("/api/v1/notifications/inbox/read-all", null);
        Assert.Equal(HttpStatusCode.NoContent, markRead.StatusCode);

        var after = await bob.GetFromJsonAsync<NotificationInboxResponse>("/api/v1/notifications/inbox", Json);
        Assert.Equal(0, after!.UnreadCount);
    }
}
