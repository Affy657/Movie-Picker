using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.IntegrationTests.Helpers;
using MoviePicker.Api.Tests.Builders;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventInvitationDocumentTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public EventInvitationDocumentTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<string> CreateEventAsync(HttpClient client, string title, string time = "20:00")
    {
        var create = await client.PostAsJsonAsync("/api/v1/events", new { title, date = TestDates.Upcoming, time });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        return (await create.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("slug").GetString()!;
    }

    [Fact]
    public async Task Invitation_NewNight_ServesTheShellWithTheNightPreview()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var slug = await CreateEventAsync(host, "Soirée publique OG", "19:30");

        var res = await _factory.CreateClient().GetAsync($"/e/{slug}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("public, max-age=60", string.Join(", ", res.Headers.GetValues("Cache-Control")));
        Assert.Equal("frame-ancestors 'none'", string.Join(", ", res.Headers.GetValues("Content-Security-Policy")));
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Soirée publique OG\" />", html);
        Assert.Contains($"<meta property=\"og:url\" content=\"https://web.integration.test/e/{slug}\" />", html);
        Assert.Contains("à 19h30", html);
        Assert.Contains("<div id=\"root\"></div>", html);
        Assert.Contains("src=\"/assets/index.js\"", html);
        Assert.DoesNotContain("Titre du site", html);
    }

    [Fact]
    public async Task Invitation_RichPreviewTurnedOff_DoesNotGiveAwayTheTitle()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var slug = await CreateEventAsync(host, "Soirée confidentielle");
        (await host.PatchAsJsonAsync($"/api/v1/events/{slug}/config", new { richSharePreview = false })).EnsureSuccessStatusCode();

        var res = await _factory.CreateClient().GetAsync($"/e/{slug}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Invitation à une soirée ciné\" />", html);
        Assert.DoesNotContain("Soirée confidentielle", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }

    [Fact]
    public async Task Invitation_TheRecapLink_IsNotAnInvitationLink()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var slug = await CreateEventAsync(host, "Soirée privée");
        var recapSlug = (await host.GetFromJsonAsync<JsonElement>($"/api/v1/events/slug/{slug}")).GetProperty("recapSlug").GetString();

        var res = await _factory.CreateClient().GetAsync($"/e/{recapSlug}");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.DoesNotContain("Soirée privée", await res.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Invitation_UnknownSlug_Answers404WithTheShell()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;

        var res = await _factory.CreateClient().GetAsync("/e/nope-slug-xyz");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Movie Picker\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }
}
