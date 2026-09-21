using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using MoviePicker.Api.IntegrationTests.Helpers;
using Xunit;

namespace MoviePicker.Api.IntegrationTests;

public sealed class EventRecapDocumentTests : IClassFixture<MoviePickerApplicationFactory>
{
    private readonly MoviePickerApplicationFactory _factory;

    public EventRecapDocumentTests(MoviePickerApplicationFactory factory) => _factory = factory;

    private static async Task<(string Slug, string ParticipantId)> CreateEventAsync(HttpClient client, string title)
    {
        var create = await client.PostAsJsonAsync("/api/v1/events", new { title, date = "2035-06-01", time = "20:00" });
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        var json = await create.Content.ReadFromJsonAsync<JsonElement>();
        return (json.GetProperty("slug").GetString()!, json.GetProperty("creatorParticipant").GetProperty("_id").GetString()!);
    }

    private static async Task<string> AddMovieAsync(HttpClient client, string slug, string participantId)
    {
        var res = await client.PostAsJsonAsync(
            $"/api/v1/events/{slug}/movies",
            new { tmdbId = 949, title = "Heat", year = "1995", posterPath = (string?)null, participantId });
        res.EnsureSuccessStatusCode();
        var json = await res.Content.ReadFromJsonAsync<JsonElement>();
        return json.GetProperty("_id").GetString()!;
    }

    [Fact]
    public async Task Recap_NightWithARatedWinner_ServesTheShellWithTheNightPreview()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
        var (slug, participantId) = await CreateEventAsync(host, "Soirée du vendredi");
        var movieId = await AddMovieAsync(host, slug, participantId);
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/winner", new { movieId })).EnsureSuccessStatusCode();
        (await host.PostAsJsonAsync($"/api/v1/events/{slug}/close", new { })).EnsureSuccessStatusCode();
        (await host.PutAsJsonAsync($"/api/v1/events/{slug}/movies/{movieId}/rating", new { participantId, value = 9 })).EnsureSuccessStatusCode();

        var res = await _factory.CreateClient().GetAsync($"/r/{slug}");

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        Assert.Equal("public, max-age=60", string.Join(", ", res.Headers.GetValues("Cache-Control")));
        Assert.Equal("frame-ancestors 'none'", string.Join(", ", res.Headers.GetValues("Content-Security-Policy")));
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Soirée du vendredi, le recap\" />", html);
        Assert.Contains($"<meta property=\"og:url\" content=\"https://web.integration.test/r/{slug}\" />", html);
        Assert.Contains("noté 4,5/5 par 1 participant", html);
        Assert.Contains("<div id=\"root\"></div>", html);
        Assert.Contains("src=\"/assets/index.js\"", html);
        Assert.DoesNotContain("Titre du site", html);
    }

    [Fact]
    public async Task Recap_UnknownSlug_Answers404WithTheShell()
    {
        _factory.FakeWebShell.Next = FakeWebShellSource.Shell;

        var res = await _factory.CreateClient().GetAsync("/r/nope-slug-xyz");

        Assert.Equal(HttpStatusCode.NotFound, res.StatusCode);
        Assert.Equal("text/html", res.Content.Headers.ContentType?.MediaType);
        var html = await res.Content.ReadAsStringAsync();
        Assert.Contains("<meta property=\"og:title\" content=\"Movie Picker\" />", html);
        Assert.Contains("<div id=\"root\"></div>", html);
    }

    [Fact]
    public async Task Recap_ShellUnavailable_SendsTheReaderToTheNightPage()
    {
        _factory.FakeWebShell.Next = null;
        try
        {
            var host = await IntegrationTestAuth.NewRegisteredClientAsync(_factory);
            var (slug, _) = await CreateEventAsync(host, "Nuit Nolan");

            var res = await _factory.CreateClient().GetAsync($"/r/{slug}");

            Assert.Equal(HttpStatusCode.OK, res.StatusCode);
            var html = await res.Content.ReadAsStringAsync();
            Assert.Contains("<meta property=\"og:title\" content=\"Nuit Nolan, le recap\" />", html);
            Assert.Contains($"url=https://web.integration.test/e/{slug}", html);
            Assert.DoesNotContain("id=\"root\"", html);
        }
        finally
        {
            _factory.FakeWebShell.Next = FakeWebShellSource.Shell;
        }
    }
}
