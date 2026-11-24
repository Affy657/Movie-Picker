using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.IntegrationTests.Helpers;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class ProfileShareDocumentTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public ProfileShareDocumentTests(MoviePickerApplicationFactory factory) => _factory = factory;

    [Fact]
    public async Task ProfilePage_PublicMember_ServesTheShellWithTheProfilePreview()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var member = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Profil Partagé");
        var me = await member.GetFromJsonAsync<JsonElement>("/api/v1/auth/me");
        var handle = me.GetProperty("handle").GetString()!;
        (await member.PatchAsJsonAsync("/api/v1/auth/me", new { bio = "Fan de Nolan" })).EnsureSuccessStatusCode();

        var res = await _factory.CreateClient().GetAsync($"/u/{handle}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("public, max-age=60", string.Join(", ", res.Headers.GetValues("Cache-Control")));
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains($"<meta property=\"og:title\" content=\"Profil Partagé (@{handle})\" />", html);
        Assert.Contains($"<meta property=\"og:url\" content=\"https://web.integration.test/u/{handle}\" />", html);
        Assert.Contains($"<link rel=\"canonical\" href=\"https://web.integration.test/u/{handle}\" />", html);
        Assert.DoesNotContain("name=\"robots\"", html);
        Assert.Contains("<div id=\"root\"></div>", html);
        Assert.DoesNotContain("Titre du site", html);
    }

    [Fact]
    public async Task ProfilePage_PublicMemberWithNothingToShow_IsServedButKeptOutOfTheIndex()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var member = await IntegrationTestAuth.NewRegisteredClientAsync(_factory, "Profil Vide");
        var me = await member.GetFromJsonAsync<JsonElement>("/api/v1/auth/me");
        var handle = me.GetProperty("handle").GetString()!;

        var res = await _factory.CreateClient().GetAsync($"/u/{handle}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains($"<meta property=\"og:title\" content=\"Profil Vide (@{handle})\" />", html);
        Assert.Contains("<meta name=\"robots\" content=\"noindex, nofollow\" />", html);
    }

    [Fact]
    public async Task ProfilePage_UnknownHandle_Answers404WithTheShell()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;

        var res = await _factory.CreateClient().GetAsync("/u/personne-introuvable");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Movie Picker\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }
}
